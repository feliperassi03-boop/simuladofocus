
CREATE POLICY "Users can view doubts by their email"
ON public.question_doubts FOR SELECT
TO authenticated
USING (student_email IS NOT NULL AND lower(student_email) = lower((auth.jwt() ->> 'email')));

CREATE POLICY "Users can update read state of doubts by their email"
ON public.question_doubts FOR UPDATE
TO authenticated
USING (student_email IS NOT NULL AND lower(student_email) = lower((auth.jwt() ->> 'email')))
WITH CHECK (student_email IS NOT NULL AND lower(student_email) = lower((auth.jwt() ->> 'email')));
