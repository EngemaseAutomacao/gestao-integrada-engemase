-- Add columns for photos and signatures on checkouts
ALTER TABLE public.tool_checkouts 
ADD COLUMN IF NOT EXISTS checkout_photo_url TEXT,
ADD COLUMN IF NOT EXISTS checkin_photo_url TEXT,
ADD COLUMN IF NOT EXISTS checkout_signature_url TEXT,
ADD COLUMN IF NOT EXISTS checkin_signature_url TEXT;

-- Create storage bucket for checkout images (photos and signatures)
INSERT INTO storage.buckets (id, name, public) 
VALUES ('checkout-images', 'checkout-images', true)
ON CONFLICT (id) DO NOTHING;

-- Storage policies for checkout-images bucket
CREATE POLICY "Anyone can view checkout images" 
ON storage.objects FOR SELECT 
USING (bucket_id = 'checkout-images');

CREATE POLICY "Authenticated users can upload checkout images" 
ON storage.objects FOR INSERT 
WITH CHECK (bucket_id = 'checkout-images' AND auth.uid() IS NOT NULL);

CREATE POLICY "Users can update their own checkout images" 
ON storage.objects FOR UPDATE 
USING (bucket_id = 'checkout-images' AND auth.uid() IS NOT NULL);

CREATE POLICY "Users can delete their own checkout images" 
ON storage.objects FOR DELETE 
USING (bucket_id = 'checkout-images' AND auth.uid() IS NOT NULL);