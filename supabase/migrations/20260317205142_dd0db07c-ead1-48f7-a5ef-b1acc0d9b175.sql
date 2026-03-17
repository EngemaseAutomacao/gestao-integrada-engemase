
-- Make checkout-images bucket private
UPDATE storage.buckets SET public = false WHERE id = 'checkout-images';

-- Update the SELECT policy to require authentication
DROP POLICY IF EXISTS "Checkout images are publicly accessible" ON storage.objects;
CREATE POLICY "Authenticated users can view checkout images"
ON storage.objects FOR SELECT
TO authenticated
USING (bucket_id = 'checkout-images');
