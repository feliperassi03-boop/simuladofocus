ALTER TABLE public.tea_questions ADD COLUMN exam_type text NOT NULL DEFAULT 'tea';
ALTER TABLE public.tea_questions ADD CONSTRAINT tea_questions_exam_type_valid CHECK (exam_type IN ('tea', 'tsa2'));
CREATE INDEX tea_questions_exam_type_created_at_idx ON public.tea_questions (exam_type, created_at DESC);
COMMENT ON COLUMN public.tea_questions.exam_type IS 'Separates TEA and TSA second-phase question banks while preserving the shared three-part question model.';