
-- 1) Add exam_type to exams
ALTER TABLE public.exams ADD COLUMN IF NOT EXISTS exam_type TEXT NOT NULL DEFAULT 'standard';

-- 2) tea_questions
CREATE TABLE public.tea_questions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  question_text TEXT NOT NULL,
  image_url TEXT,
  video_url TEXT,
  comment TEXT,
  comment_image_url TEXT,
  sub1_text TEXT NOT NULL,
  sub1_answer_key TEXT NOT NULL,
  sub1_image_url TEXT,
  sub2_text TEXT NOT NULL,
  sub2_answer_key TEXT NOT NULL,
  sub2_image_url TEXT,
  sub3_text TEXT NOT NULL,
  sub3_answer_key TEXT NOT NULL,
  sub3_image_url TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
GRANT SELECT ON public.tea_questions TO authenticated;
GRANT ALL ON public.tea_questions TO service_role;
ALTER TABLE public.tea_questions ENABLE ROW LEVEL SECURITY;
CREATE POLICY "authenticated read tea_questions" ON public.tea_questions FOR SELECT TO authenticated USING (true);
CREATE POLICY "admin manage tea_questions" ON public.tea_questions FOR ALL TO authenticated
  USING (public.is_admin()) WITH CHECK (public.is_admin());

-- 3) tea_exam_questions
CREATE TABLE public.tea_exam_questions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  exam_id UUID NOT NULL REFERENCES public.exams(id) ON DELETE CASCADE,
  tea_question_id UUID NOT NULL REFERENCES public.tea_questions(id) ON DELETE CASCADE,
  question_order INT NOT NULL DEFAULT 0,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE (exam_id, tea_question_id)
);
GRANT SELECT ON public.tea_exam_questions TO authenticated;
GRANT ALL ON public.tea_exam_questions TO service_role;
ALTER TABLE public.tea_exam_questions ENABLE ROW LEVEL SECURITY;
CREATE POLICY "authenticated read tea_exam_questions" ON public.tea_exam_questions FOR SELECT TO authenticated USING (true);
CREATE POLICY "admin manage tea_exam_questions" ON public.tea_exam_questions FOR ALL TO authenticated
  USING (public.is_admin()) WITH CHECK (public.is_admin());

-- 4) tea_attempts
CREATE TABLE public.tea_attempts (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL,
  exam_id UUID NOT NULL REFERENCES public.exams(id) ON DELETE CASCADE,
  total_items INT NOT NULL DEFAULT 0,
  correct_items INT NOT NULL DEFAULT 0,
  score NUMERIC(6,2) NOT NULL DEFAULT 0,
  completed_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.tea_attempts TO authenticated;
GRANT ALL ON public.tea_attempts TO service_role;
ALTER TABLE public.tea_attempts ENABLE ROW LEVEL SECURITY;
CREATE POLICY "user manage own tea_attempts" ON public.tea_attempts FOR ALL TO authenticated
  USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);
CREATE POLICY "admin read all tea_attempts" ON public.tea_attempts FOR SELECT TO authenticated USING (public.is_admin());

-- 5) tea_answers
CREATE TABLE public.tea_answers (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  attempt_id UUID NOT NULL REFERENCES public.tea_attempts(id) ON DELETE CASCADE,
  tea_question_id UUID NOT NULL REFERENCES public.tea_questions(id) ON DELETE CASCADE,
  sub_index INT NOT NULL CHECK (sub_index IN (1,2,3)),
  student_answer TEXT,
  is_correct BOOLEAN NOT NULL DEFAULT false,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.tea_answers TO authenticated;
GRANT ALL ON public.tea_answers TO service_role;
ALTER TABLE public.tea_answers ENABLE ROW LEVEL SECURITY;
CREATE POLICY "user manage own tea_answers" ON public.tea_answers FOR ALL TO authenticated
  USING (EXISTS (SELECT 1 FROM public.tea_attempts a WHERE a.id = attempt_id AND a.user_id = auth.uid()))
  WITH CHECK (EXISTS (SELECT 1 FROM public.tea_attempts a WHERE a.id = attempt_id AND a.user_id = auth.uid()));
CREATE POLICY "admin read all tea_answers" ON public.tea_answers FOR SELECT TO authenticated USING (public.is_admin());

-- updated_at trigger for tea_questions
CREATE OR REPLACE FUNCTION public.set_tea_questions_updated_at()
RETURNS TRIGGER LANGUAGE plpgsql SET search_path = public AS $$
BEGIN NEW.updated_at = now(); RETURN NEW; END;
$$;
CREATE TRIGGER trg_tea_questions_updated_at BEFORE UPDATE ON public.tea_questions
  FOR EACH ROW EXECUTE FUNCTION public.set_tea_questions_updated_at();
