
-- 1. Fix listings UPDATE: add WITH CHECK so seller_id can't be reassigned
DROP POLICY IF EXISTS "Sellers update own listings" ON public.listings;
CREATE POLICY "Sellers update own listings"
ON public.listings
FOR UPDATE
USING (
  (auth.uid() = seller_id)
  OR public.has_role(auth.uid(), 'admin'::app_role)
  OR public.has_role(auth.uid(), 'employee'::app_role)
)
WITH CHECK (
  (auth.uid() = seller_id)
  OR public.has_role(auth.uid(), 'admin'::app_role)
  OR public.has_role(auth.uid(), 'employee'::app_role)
);

-- 2. Orders: add explicit UPDATE/DELETE policies (staff/admin only)
CREATE POLICY "Staff update orders"
ON public.orders
FOR UPDATE
USING (
  public.has_role(auth.uid(), 'admin'::app_role)
  OR public.has_role(auth.uid(), 'employee'::app_role)
)
WITH CHECK (
  public.has_role(auth.uid(), 'admin'::app_role)
  OR public.has_role(auth.uid(), 'employee'::app_role)
);

CREATE POLICY "Admins delete orders"
ON public.orders
FOR DELETE
USING (public.has_role(auth.uid(), 'admin'::app_role));

-- 3. Restrict realtime channel access for conversation channels to participants only
CREATE POLICY "Participants can listen to conversation channel (conversations)"
ON realtime.messages
FOR SELECT
TO authenticated
USING (
  EXISTS (
    SELECT 1 FROM public.conversations c
    WHERE ('chat-' || c.id::text) = realtime.topic()
      AND (c.buyer_id = auth.uid() OR c.seller_id = auth.uid())
  )
);
