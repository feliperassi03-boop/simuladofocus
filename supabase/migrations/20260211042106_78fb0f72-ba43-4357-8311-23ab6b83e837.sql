-- Add image_url column to questions
ALTER TABLE public.questions ADD COLUMN image_url TEXT;

-- Create storage bucket for question images
INSERT INTO storage.buckets (id, name, public) VALUES ('question-images', 'question-images', true);

-- Allow anyone to view question images
CREATE POLICY "Question images are publicly accessible"
ON storage.objects FOR SELECT
USING (bucket_id = 'question-images');

-- Allow admins to upload question images
CREATE POLICY "Admins can upload question images"
ON storage.objects FOR INSERT
WITH CHECK (bucket_id = 'question-images' AND EXISTS (
  SELECT 1 FROM public.user_roles WHERE user_id = auth.uid() AND role = 'admin'
));

-- Allow admins to update question images
CREATE POLICY "Admins can update question images"
ON storage.objects FOR UPDATE
USING (bucket_id = 'question-images' AND EXISTS (
  SELECT 1 FROM public.user_roles WHERE user_id = auth.uid() AND role = 'admin'
));

-- Allow admins to delete question images
CREATE POLICY "Admins can delete question images"
ON storage.objects FOR DELETE
USING (bucket_id = 'question-images' AND EXISTS (
  SELECT 1 FROM public.user_roles WHERE user_id = auth.uid() AND role = 'admin'
));
