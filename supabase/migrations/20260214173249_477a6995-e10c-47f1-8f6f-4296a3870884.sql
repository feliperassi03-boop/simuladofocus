-- Allow anonymous users to read questions (needed for exam access without login)
DROP POLICY IF EXISTS "Anyone authenticated can view questions" ON public.questions;
CREATE POLICY "Anyone can view questions"
  ON public.questions
  FOR SELECT
  USING (true);

-- Allow anonymous users to read exam_questions for active exams
DROP POLICY IF EXISTS "Anyone can view exam questions for active exams" ON public.exam_questions;
CREATE POLICY "Anyone can view exam questions for active exams"
  ON public.exam_questions
  FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM public.exams
      WHERE exams.id = exam_questions.exam_id
        AND exams.is_active = true
    )
  );
