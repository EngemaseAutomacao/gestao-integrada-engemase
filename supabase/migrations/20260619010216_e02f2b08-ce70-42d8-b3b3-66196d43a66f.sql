-- Tighten checkout-images SELECT to owner-or-admin (was: any authenticated user)
DROP POLICY IF EXISTS "Authenticated users can view checkout images" ON storage.objects;
CREATE POLICY "Owners and admins can view checkout images"
ON storage.objects FOR SELECT TO authenticated
USING (
  bucket_id = 'checkout-images'
  AND (owner = auth.uid() OR public.has_role(auth.uid(), 'admin'::user_role))
);

-- Also revoke any lingering public SELECT (defensive — drop legacy public policy if it exists)
DROP POLICY IF EXISTS "Anyone can view checkout images" ON storage.objects;
DROP POLICY IF EXISTS "Public can view checkout images" ON storage.objects;

-- Tighten checkout-images INSERT to require ownership match
DROP POLICY IF EXISTS "Authenticated users can upload checkout images" ON storage.objects;
CREATE POLICY "Authenticated users can upload checkout images"
ON storage.objects FOR INSERT TO authenticated
WITH CHECK (
  bucket_id = 'checkout-images'
  AND owner = auth.uid()
);