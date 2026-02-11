-- Create exams table
CREATE TABLE public.exams (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  title TEXT NOT NULL,
  password TEXT NOT NULL,
  created_by UUID NOT NULL,
  is_active BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Create exam_questions junction table
CREATE TABLE public.exam_questions (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  exam_id UUID NOT NULL REFERENCES public.exams(id) ON DELETE CASCADE,
  question_id UUID NOT NULL REFERENCES public.questions(id) ON DELETE CASCADE,
  sort_order INTEGER NOT NULL DEFAULT 0,
  UNIQUE(exam_id, question_id)
);

-- Add exam_id to quiz_attempts to track which exam an attempt belongs to
ALTER TABLE public.quiz_attempts ADD COLUMN exam_id UUID REFERENCES public.exams(id);

-- Enable RLS
ALTER TABLE public.exams ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.exam_questions ENABLE ROW LEVEL SECURITY;

-- Exams policies
CREATE POLICY "Admins can manage exams"
ON public.exams FOR ALL
USING (is_admin());

CREATE POLICY "Anyone can view active exams"
ON public.exams FOR SELECT
USING (is_active = true);

-- Exam questions policies
CREATE POLICY "Admins can manage exam questions"
ON public.exam_questions FOR ALL
USING (is_admin());

CREATE POLICY "Anyone can view exam questions for active exams"
ON public.exam_questions FOR SELECT
USING (EXISTS (
  SELECT 1 FROM public.exams WHERE exams.id = exam_questions.exam_id AND exams.is_active = true
));
