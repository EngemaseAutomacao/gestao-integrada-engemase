
-- Create the unified "imagens" bucket (private)
INSERT INTO storage.buckets (id, name, public)
VALUES ('imagens', 'imagens', false)
ON CONFLICT (id) DO NOTHING;

-- RLS policies for the imagens bucket
-- Authenticated users can upload
CREATE POLICY "Authenticated users can upload images"
ON storage.objects FOR INSERT
TO authenticated
WITH CHECK (bucket_id = 'imagens');

-- Authenticated users can view (for signed URLs)
CREATE POLICY "Authenticated users can view images"
ON storage.objects FOR SELECT
TO authenticated
USING (bucket_id = 'imagens');

-- Admins can delete images
CREATE POLICY "Admins can delete images"
ON storage.objects FOR DELETE
TO authenticated
USING (bucket_id = 'imagens' AND public.has_role(auth.uid(), 'admin'::public.user_role));

-- Admins can update images
CREATE POLICY "Admins can update images"
ON storage.objects FOR UPDATE
TO authenticated
USING (bucket_id = 'imagens' AND public.has_role(auth.uid(), 'admin'::public.user_role));
