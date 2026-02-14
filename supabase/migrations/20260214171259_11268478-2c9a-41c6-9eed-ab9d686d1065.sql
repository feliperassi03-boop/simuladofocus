
-- Make user_id nullable for anonymous exam attempts
ALTER TABLE public.quiz_attempts ALTER COLUMN user_id DROP NOT NULL;

-- Allow anonymous users to insert quiz attempts
CREATE POLICY "Anonymous can create exam attempts"
ON public.quiz_attempts
FOR INSERT
TO anon
WITH CHECK (user_id IS NULL AND exam_id IS NOT NULL);

-- Allow anonymous users to view their own attempts by id
CREATE POLICY "Anonymous can view own attempt by id"
ON public.quiz_attempts
FOR SELECT
TO anon
USING (user_id IS NULL);

-- Allow anonymous users to update own attempts (to save score)
CREATE POLICY "Anonymous can update own attempts"
ON public.quiz_attempts
FOR UPDATE
TO anon
USING (user_id IS NULL);

-- Allow anonymous users to insert quiz answers
CREATE POLICY "Anonymous can insert answers"
ON public.quiz_answers
FOR INSERT
TO anon
WITH CHECK (EXISTS (
  SELECT 1 FROM quiz_attempts
  WHERE quiz_attempts.id = quiz_answers.attempt_id
  AND quiz_attempts.user_id IS NULL
));
