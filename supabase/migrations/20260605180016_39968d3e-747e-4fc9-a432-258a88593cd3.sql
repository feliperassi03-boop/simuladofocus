
-- Status enum
CREATE TYPE public.doubt_status AS ENUM ('pending', 'answered', 'resolved', 'archived');

CREATE TABLE public.question_doubts (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  question_id uuid NOT NULL,
  exam_id uuid,
  attempt_id uuid,
  user_id uuid,
  student_name text NOT NULL,
  student_email text,
  exam_title text NOT NULL DEFAULT '',
  question_number integer,
  question_text_snapshot text,
  doubt_text text NOT NULL,
  status public.doubt_status NOT NULL DEFAULT 'pending',
  admin_response text,
  answered_at timestamptz,
  answered_by uuid,
  read_by_student boolean NOT NULL DEFAULT true,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

GRANT SELECT, INSERT, UPDATE, DELETE ON public.question_doubts TO authenticated;
GRANT SELECT, INSERT ON public.question_doubts TO anon;
GRANT ALL ON public.question_doubts TO service_role;

ALTER TABLE public.question_doubts ENABLE ROW LEVEL SECURITY;

-- Anyone (authenticated or guest) can submit a doubt
CREATE POLICY "Anyone can create doubts"
  ON public.question_doubts FOR INSERT
  TO public
  WITH CHECK (
    -- If user_id is provided, must match auth.uid()
    (user_id IS NULL) OR (auth.uid() = user_id)
  );

-- Users can view their own doubts
CREATE POLICY "Users can view own doubts"
  ON public.question_doubts FOR SELECT
  TO authenticated
  USING (auth.uid() = user_id);

-- Users can update their own doubts (mark read)
CREATE POLICY "Users can update own doubts read state"
  ON public.question_doubts FOR UPDATE
  TO authenticated
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

-- Admins can do everything
CREATE POLICY "Admins can view all doubts"
  ON public.question_doubts FOR SELECT
  TO authenticated
  USING (public.is_admin());

CREATE POLICY "Admins can update all doubts"
  ON public.question_doubts FOR UPDATE
  TO authenticated
  USING (public.is_admin())
  WITH CHECK (public.is_admin());

CREATE POLICY "Admins can delete doubts"
  ON public.question_doubts FOR DELETE
  TO authenticated
  USING (public.is_admin());

-- updated_at trigger
CREATE OR REPLACE FUNCTION public.set_question_doubts_updated_at()
RETURNS trigger
LANGUAGE plpgsql
SET search_path = public
AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$;

CREATE TRIGGER trg_question_doubts_updated_at
BEFORE UPDATE ON public.question_doubts
FOR EACH ROW EXECUTE FUNCTION public.set_question_doubts_updated_at();

CREATE INDEX idx_question_doubts_user_id ON public.question_doubts(user_id);
CREATE INDEX idx_question_doubts_status ON public.question_doubts(status);
CREATE INDEX idx_question_doubts_created_at ON public.question_doubts(created_at DESC);
