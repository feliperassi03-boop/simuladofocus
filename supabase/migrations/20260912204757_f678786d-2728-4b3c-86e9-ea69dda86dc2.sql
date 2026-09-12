DROP POLICY IF EXISTS "Anonymous can insert answers" ON public.quiz_answers;
CREATE POLICY "Anonymous can insert answers"
ON public.quiz_answers
FOR INSERT
TO anon
WITH CHECK (
  EXISTS (
    SELECT 1 FROM public.quiz_attempts qa
    WHERE qa.id = quiz_answers.attempt_id AND qa.user_id IS NULL
  )
);