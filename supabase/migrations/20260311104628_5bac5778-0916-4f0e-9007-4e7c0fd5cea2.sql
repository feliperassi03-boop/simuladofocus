
ALTER TABLE public.questions ADD COLUMN video_url text DEFAULT NULL;

INSERT INTO storage.buckets (id, name, public) VALUES ('question-videos', 'question-videos', true);

CREATE POLICY "Anyone can view question videos" ON storage.objects FOR SELECT TO public USING (bucket_id = 'question-videos');

CREATE POLICY "Admins can upload question videos" ON storage.objects FOR INSERT TO authenticated WITH CHECK (bucket_id = 'question-videos' AND public.is_admin());

CREATE POLICY "Admins can delete question videos" ON storage.objects FOR DELETE TO authenticated USING (bucket_id = 'question-videos' AND public.is_admin());
