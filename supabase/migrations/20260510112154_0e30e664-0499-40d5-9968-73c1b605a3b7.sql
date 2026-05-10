INSERT INTO storage.buckets (id, name, public) VALUES ('exam-pdfs', 'exam-pdfs', false)
ON CONFLICT (id) DO NOTHING;

CREATE POLICY "Admins can upload exam pdfs"
ON storage.objects FOR INSERT TO authenticated
WITH CHECK (bucket_id = 'exam-pdfs' AND public.is_admin());

CREATE POLICY "Admins can read exam pdfs"
ON storage.objects FOR SELECT TO authenticated
USING (bucket_id = 'exam-pdfs' AND public.is_admin());

CREATE POLICY "Admins can delete exam pdfs"
ON storage.objects FOR DELETE TO authenticated
USING (bucket_id = 'exam-pdfs' AND public.is_admin());