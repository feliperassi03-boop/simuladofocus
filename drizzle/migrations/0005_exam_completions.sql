CREATE TABLE public.exam_completions (
  user_id uuid NOT NULL,
  exam_id uuid NOT NULL REFERENCES public.exams(id) ON DELETE CASCADE,
  completed_at timestamptz NOT NULL DEFAULT now(),
  PRIMARY KEY (user_id, exam_id)
);
GRANT SELECT, INSERT, DELETE ON public.exam_completions TO authenticated;
GRANT ALL ON public.exam_completions TO service_role;
ALTER TABLE public.exam_completions ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Users view own completions" ON public.exam_completions FOR SELECT TO authenticated USING (auth.uid() = user_id);
CREATE POLICY "Users add own completions" ON public.exam_completions FOR INSERT TO authenticated WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Users remove own completions" ON public.exam_completions FOR DELETE TO authenticated USING (auth.uid() = user_id);