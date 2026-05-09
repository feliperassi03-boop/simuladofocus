ALTER TABLE public.quiz_attempts DROP CONSTRAINT IF EXISTS quiz_attempts_exam_id_fkey;

ALTER TABLE public.quiz_attempts ADD CONSTRAINT quiz_attempts_exam_id_fkey
  FOREIGN KEY (exam_id) REFERENCES public.exams(id) ON DELETE CASCADE;
