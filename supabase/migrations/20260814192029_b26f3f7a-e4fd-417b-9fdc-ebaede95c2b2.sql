CREATE TABLE public.simulado_signups (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  full_name text NOT NULL,
  email text NOT NULL,
  participant_type text NOT NULL CHECK (participant_type IN ('residente','anestesista')),
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE UNIQUE INDEX simulado_signups_email_key ON public.simulado_signups (lower(email));

GRANT INSERT ON public.simulado_signups TO anon;
GRANT INSERT, SELECT ON public.simulado_signups TO authenticated;
GRANT ALL ON public.simulado_signups TO service_role;

ALTER TABLE public.simulado_signups ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Anyone can sign up" ON public.simulado_signups FOR INSERT TO anon, authenticated WITH CHECK (true);
CREATE POLICY "Admins can view signups" ON public.simulado_signups FOR SELECT TO authenticated USING (public.is_admin());
CREATE POLICY "Admins can delete signups" ON public.simulado_signups FOR DELETE TO authenticated USING (public.is_admin());
GRANT DELETE ON public.simulado_signups TO authenticated;