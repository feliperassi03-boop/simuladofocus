CREATE TABLE public.checkout_pre_registrations (
 id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
 buyer_name text NOT NULL,
 buyer_email text NOT NULL,
 cpf text NOT NULL,
 phone text NOT NULL,
 address jsonb NOT NULL,
 terms_version text NOT NULL,
 privacy_version text NOT NULL,
 accepted_at timestamptz NOT NULL DEFAULT now(),
 ip_address text NOT NULL,
 ip_source text NOT NULL
);
GRANT ALL ON public.checkout_pre_registrations TO service_role;
GRANT SELECT ON public.checkout_pre_registrations TO authenticated;
ALTER TABLE public.checkout_pre_registrations ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Admins can read checkout pre registrations" ON public.checkout_pre_registrations FOR SELECT TO authenticated USING (public.has_role(auth.uid(), 'admin'));
COMMENT ON TABLE public.checkout_pre_registrations IS 'Pre-store identity and document acceptance only. Plan, price and payment method are selected externally; this record never grants access.';