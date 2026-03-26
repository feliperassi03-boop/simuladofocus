
CREATE POLICY "Admins can delete attempts"
ON public.quiz_attempts
FOR DELETE
TO authenticated
USING (is_admin());

CREATE POLICY "Admins can delete answers"
ON public.quiz_answers
FOR DELETE
TO authenticated
USING (is_admin());
