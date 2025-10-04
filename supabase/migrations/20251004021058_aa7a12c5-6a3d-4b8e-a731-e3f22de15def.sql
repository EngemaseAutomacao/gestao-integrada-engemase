-- Add image_url column to tools table
ALTER TABLE public.tools ADD COLUMN image_url TEXT;

-- Create storage bucket for tool images
INSERT INTO storage.buckets (id, name, public) 
VALUES ('tool-images', 'tool-images', true);

-- Allow anyone to view tool images
CREATE POLICY "Tool images are publicly accessible"
ON storage.objects FOR SELECT
USING (bucket_id = 'tool-images');

-- Allow admins to upload tool images
CREATE POLICY "Admins can upload tool images"
ON storage.objects FOR INSERT
WITH CHECK (
  bucket_id = 'tool-images' 
  AND (EXISTS (
    SELECT 1 FROM public.profiles
    WHERE profiles.id = auth.uid() AND profiles.role = 'admin'
  ))
);

-- Allow admins to update tool images
CREATE POLICY "Admins can update tool images"
ON storage.objects FOR UPDATE
USING (
  bucket_id = 'tool-images'
  AND (EXISTS (
    SELECT 1 FROM public.profiles
    WHERE profiles.id = auth.uid() AND profiles.role = 'admin'
  ))
);

-- Allow admins to delete tool images
CREATE POLICY "Admins can delete tool images"
ON storage.objects FOR DELETE
USING (
  bucket_id = 'tool-images'
  AND (EXISTS (
    SELECT 1 FROM public.profiles
    WHERE profiles.id = auth.uid() AND profiles.role = 'admin'
  ))
);