
-- 1. USER_ROLES: restrict SELECT
DROP POLICY IF EXISTS "Roles readable by everyone" ON public.user_roles;
CREATE POLICY "Users read own roles" ON public.user_roles
  FOR SELECT USING (auth.uid() = user_id OR public.has_role(auth.uid(), 'admin'));

-- 2. REALTIME messages RLS: restrict to conversation participants
ALTER TABLE realtime.messages ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Participants can listen to conversation channel" ON realtime.messages;
CREATE POLICY "Participants can listen to conversation channel"
  ON realtime.messages
  FOR SELECT
  TO authenticated
  USING (
    -- topic format: "chat-<conversation_id>" matches the client subscribe
    EXISTS (
      SELECT 1 FROM public.conversations c
      WHERE ('chat-' || c.id::text) = realtime.topic()
        AND (c.buyer_id = auth.uid() OR c.seller_id = auth.uid())
    )
  );

-- 3. CHAT-IMAGES bucket: private + folder-scoped writes + participants read
UPDATE storage.buckets SET public = false WHERE id = 'chat-images';

DROP POLICY IF EXISTS "Chat images readable" ON storage.objects;
DROP POLICY IF EXISTS "Chat images uploadable" ON storage.objects;
DROP POLICY IF EXISTS "Authenticated upload chat images" ON storage.objects;
DROP POLICY IF EXISTS "Public read chat images" ON storage.objects;

CREATE POLICY "Chat images: participants read"
  ON storage.objects FOR SELECT TO authenticated
  USING (
    bucket_id = 'chat-images' AND (
      (storage.foldername(name))[1] = auth.uid()::text
      OR EXISTS (
        SELECT 1 FROM public.messages m
        JOIN public.conversations c ON c.id = m.conversation_id
        WHERE m.image_url LIKE '%' || name
          AND (c.buyer_id = auth.uid() OR c.seller_id = auth.uid())
      )
    )
  );

CREATE POLICY "Chat images: own folder upload"
  ON storage.objects FOR INSERT TO authenticated
  WITH CHECK (
    bucket_id = 'chat-images'
    AND (storage.foldername(name))[1] = auth.uid()::text
  );

-- 4. ORDERS: sellers can read orders containing their items
CREATE POLICY "Sellers read orders for their items" ON public.orders
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM public.order_items oi
      WHERE oi.order_id = orders.id AND oi.seller_id = auth.uid()
    )
  );

-- 5. PROFILES.address: hide via column privileges + function for owner
REVOKE SELECT ON public.profiles FROM anon, authenticated;
GRANT SELECT (id, username, full_name, avatar_url, bio, banned, created_at, updated_at)
  ON public.profiles TO anon, authenticated;

CREATE OR REPLACE FUNCTION public.get_my_profile()
RETURNS public.profiles
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT * FROM public.profiles WHERE id = auth.uid();
$$;
REVOKE EXECUTE ON FUNCTION public.get_my_profile() FROM anon;
GRANT EXECUTE ON FUNCTION public.get_my_profile() TO authenticated;

-- 6. PUBLIC BUCKETS listing restriction (avatars, listings)
DROP POLICY IF EXISTS "Avatars readable" ON storage.objects;
DROP POLICY IF EXISTS "Listings readable" ON storage.objects;
DROP POLICY IF EXISTS "Public read avatars" ON storage.objects;
DROP POLICY IF EXISTS "Public read listings" ON storage.objects;
-- Public buckets serve files via public URL regardless of RLS; we restrict
-- the listing path (storage.objects SELECT) so the bucket can't be enumerated.
-- We intentionally do NOT create a permissive SELECT policy here.

-- 7. FUNCTION hardening: fixed search_path + revoke EXECUTE from public
ALTER FUNCTION public.touch_conversation() SET search_path = public;
ALTER FUNCTION public.touch_updated_at() SET search_path = public;

REVOKE EXECUTE ON FUNCTION public.touch_conversation() FROM anon, authenticated, PUBLIC;
REVOKE EXECUTE ON FUNCTION public.touch_updated_at() FROM anon, authenticated, PUBLIC;
REVOKE EXECUTE ON FUNCTION public.handle_new_user() FROM anon, authenticated, PUBLIC;
REVOKE EXECUTE ON FUNCTION public.auto_promote_known_emails() FROM anon, authenticated, PUBLIC;
REVOKE EXECUTE ON FUNCTION public.notify_restock() FROM anon, authenticated, PUBLIC;
REVOKE EXECUTE ON FUNCTION public.notify_new_message() FROM anon, authenticated, PUBLIC;
REVOKE EXECUTE ON FUNCTION public.mark_classified_sold() FROM anon, authenticated, PUBLIC;
-- has_role is referenced by RLS policies — keep EXECUTE so the policy can run as the calling user
