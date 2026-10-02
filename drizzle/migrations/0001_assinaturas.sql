CREATE TYPE public.subscription_status AS ENUM ('pendente', 'ativo', 'atrasado', 'cancelado', 'estornado');

CREATE TABLE public.assinaturas (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid,
  aluno_nome text NOT NULL DEFAULT '',
  aluno_email text,
  plano text NOT NULL,
  status public.subscription_status NOT NULL DEFAULT 'pendente',
  data_expiracao date,
  asaas_customer_id text,
  asaas_subscription_id text,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.assinaturas TO authenticated;
GRANT ALL ON public.assinaturas TO service_role;
ALTER TABLE public.assinaturas ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Admins manage assinaturas" ON public.assinaturas FOR ALL TO authenticated USING (public.is_admin()) WITH CHECK (public.is_admin());

CREATE OR REPLACE FUNCTION public.set_assinaturas_updated_at()
RETURNS trigger LANGUAGE plpgsql SET search_path = public AS $$
BEGIN NEW.updated_at = now(); RETURN NEW; END; $$;
CREATE TRIGGER trg_assinaturas_updated_at BEFORE UPDATE ON public.assinaturas
FOR EACH ROW EXECUTE FUNCTION public.set_assinaturas_updated_at();