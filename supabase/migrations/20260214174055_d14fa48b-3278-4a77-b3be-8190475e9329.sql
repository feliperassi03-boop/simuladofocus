
-- Fix: Change restrictive policies to permissive for public access

-- EXAMS: allow anyone to view active exams
DROP POLICY IF EXISTS "Anyone can view active exams" ON public.exams;
CREATE POLICY "Anyone can view active exams"
  ON public.exams
  FOR SELECT
  TO public
  USING (is_active = true);

-- EXAM_QUESTIONS: allow anyone to view exam questions for active exams
DROP POLICY IF EXISTS "Anyone can view exam questions for active exams" ON public.exam_questions;
CREATE POLICY "Anyone can view exam questions for active exams"
  ON public.exam_questions
  FOR SELECT
  TO public
  USING (
    EXISTS (
      SELECT 1 FROM public.exams
      WHERE exams.id = exam_questions.exam_id
        AND exams.is_active = true
    )
  );

-- QUESTIONS: allow anyone to view questions
DROP POLICY IF EXISTS "Anyone can view questions" ON public.questions;
CREATE POLICY "Anyone can view questions"
  ON public.questions
  FOR SELECT
  TO public
  USING (true);

-- QUIZ_ATTEMPTS: anonymous insert
DROP POLICY IF EXISTS "Anonymous can create exam attempts" ON public.quiz_attempts;
CREATE POLICY "Anonymous can create exam attempts"
  ON public.quiz_attempts
  FOR INSERT
  TO public
  WITH CHECK ((user_id IS NULL) AND (exam_id IS NOT NULL));

-- QUIZ_ATTEMPTS: anonymous update
DROP POLICY IF EXISTS "Anonymous can update own attempts" ON public.quiz_attempts;
CREATE POLICY "Anonymous can update own attempts"
  ON public.quiz_attempts
  FOR UPDATE
  TO public
  USING (user_id IS NULL);

-- QUIZ_ATTEMPTS: anonymous select
DROP POLICY IF EXISTS "Anonymous can view own attempt by id" ON public.quiz_attempts;
CREATE POLICY "Anonymous can view own attempt by id"
  ON public.quiz_attempts
  FOR SELECT
  TO public
  USING (user_id IS NULL);

-- QUIZ_ANSWERS: anonymous insert
DROP POLICY IF EXISTS "Anonymous can insert answers" ON public.quiz_answers;
CREATE POLICY "Anonymous can insert answers"
  ON public.quiz_answers
  FOR INSERT
  TO public
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM quiz_attempts
      WHERE quiz_attempts.id = quiz_answers.attempt_id
        AND quiz_attempts.user_id IS NULL
    )
  );
