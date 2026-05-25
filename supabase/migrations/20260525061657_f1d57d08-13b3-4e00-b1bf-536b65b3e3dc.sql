
-- Drop broad LIST policies on public buckets (public URLs still work)
DROP POLICY IF EXISTS "Avatar images public read" ON storage.objects;
DROP POLICY IF EXISTS "Listing images public read" ON storage.objects;

-- Drop the older permissive chat-images policies (replaced by scoped ones)
DROP POLICY IF EXISTS "Chat images participants read" ON storage.objects;
DROP POLICY IF EXISTS "Auth users upload chat images" ON storage.objects;
