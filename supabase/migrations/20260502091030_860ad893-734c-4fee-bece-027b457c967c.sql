
CREATE TABLE public.allowed_emails (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  email text NOT NULL UNIQUE,
  created_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.allowed_emails ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Authenticated users can check allowed emails"
  ON public.allowed_emails FOR SELECT
  TO authenticated
  USING (true);

CREATE POLICY "Admins can manage allowed emails"
  ON public.allowed_emails FOR ALL
  TO authenticated
  USING (public.is_admin())
  WITH CHECK (public.is_admin());
