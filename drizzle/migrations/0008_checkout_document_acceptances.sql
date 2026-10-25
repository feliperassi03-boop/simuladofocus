CREATE TABLE public.checkout_document_acceptances (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  acceptance_group_id uuid NOT NULL,
  user_id uuid,
  buyer_name text NOT NULL CHECK (char_length(buyer_name) BETWEEN 3 AND 120),
  buyer_email text NOT NULL CHECK (char_length(buyer_email) BETWEEN 3 AND 255),
  document_type text NOT NULL CHECK (document_type IN ('termos', 'privacidade')),
  document_version text NOT NULL CHECK (char_length(document_version) BETWEEN 1 AND 100),
  accepted_at timestamptz NOT NULL DEFAULT now(),
  ip_address inet NOT NULL,
  ip_source text NOT NULL,
  plan_key text NOT NULL CHECK (plan_key IN ('tsa', 'tea')),
  payment_method text NOT NULL CHECK (payment_method IN ('card', 'pix')),
  order_value numeric NOT NULL,
  applied_coupon text,
  UNIQUE (acceptance_group_id, document_type)
);
GRANT SELECT ON public.checkout_document_acceptances TO authenticated;
GRANT ALL ON public.checkout_document_acceptances TO service_role;
ALTER TABLE public.checkout_document_acceptances ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Admins can read checkout acceptances" ON public.checkout_document_acceptances FOR SELECT TO authenticated USING (public.has_role(auth.uid(), 'admin'));
COMMENT ON TABLE public.checkout_document_acceptances IS 'Immutable document acknowledgements recorded server-side before checkout; public buyers identified by name/email and authenticated buyers additionally by user_id.';