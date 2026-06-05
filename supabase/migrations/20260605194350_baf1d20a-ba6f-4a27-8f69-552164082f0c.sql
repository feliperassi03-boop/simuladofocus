-- Fix: allowed_emails publicly readable
DROP POLICY IF EXISTS "Anyone can check allowed emails" ON public.allowed_emails;

CREATE POLICY "Authenticated can check allowed emails"
ON public.allowed_emails
FOR SELECT
TO authenticated
USING (true);

CREATE OR REPLACE FUNCTION public.is_email_allowed(_email text)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.allowed_emails WHERE lower(email) = lower(_email)
  )
$$;

REVOKE ALL ON FUNCTION public.is_email_allowed(text) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.is_email_allowed(text) TO anon, authenticated;

-- Fix: quiz_attempts leaking guest_name/guest_email to anonymous users
-- RLS still allows reading the row (needed for insert RETURNING), but hide PII columns from anon
REVOKE SELECT ON public.quiz_attempts FROM anon;
GRANT SELECT (id, exam_id, user_id, total_questions, score, completed_at, created_at) ON public.quiz_attempts TO anon;
GRANT INSERT, UPDATE ON public.quiz_attempts TO anon;

-- Fix: exam-pdfs bucket has no explicit storage policies (admin-only)
CREATE POLICY "Admins can read exam pdfs"
ON storage.objects FOR SELECT
TO authenticated
USING (bucket_id = 'exam-pdfs' AND public.is_admin());

CREATE POLICY "Admins can upload exam pdfs"
ON storage.objects FOR INSERT
TO authenticated
WITH CHECK (bucket_id = 'exam-pdfs' AND public.is_admin());

CREATE POLICY "Admins can update exam pdfs"
ON storage.objects FOR UPDATE
TO authenticated
USING (bucket_id = 'exam-pdfs' AND public.is_admin())
WITH CHECK (bucket_id = 'exam-pdfs' AND public.is_admin());

CREATE POLICY "Admins can delete exam pdfs"
ON storage.objects FOR DELETE
TO authenticated
USING (bucket_id = 'exam-pdfs' AND public.is_admin());