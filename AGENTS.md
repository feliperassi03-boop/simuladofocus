# Project rules

- Home-screen installation uses a manifest and logo-derived public icons only, without app-shell service workers or offline caching. Why: standalone launch should not introduce stale preview caches or promise offline access.

- Legal pages preserve the supplied wording in structured reading blocks and link the original immutable PDF assets; new uploads bump shared consent versions without rewriting past acceptance rows. Why: buyers can conserve the exact document and earlier legal evidence stays intact.

- Both legacy Asaas checkout functions enforce the shared disabled-sales guard before any database or Asaas operation. The public purchase form instead uses the separate InfinitePay registration function. Why: restoring new-provider purchases must not reopen legacy Asaas charges.

- Asaas API calls happen only in the backend functions (`asaas-subscribe`, `asaas-checkout-public`, `asaas-webhook`); plan names/prices live in server-side `PLANS` maps and public plan keys are restricted by the shared server allowlist. Removed test purchases retain the webhook no-entitlement guard for historical events. Why: browser input must not control prices or create discounted entitlements.
- Asaas payment confirmations are handled only by the `asaas-webhook` function, authenticated by the `asaas-access-token` header against a stored secret. Why: access must only be granted from verified server-side events.
- New public registration runs in `infinitepay-checkout-public`, recording identity and consent in `checkout_pre_registrations` before returning the fixed store URL; it does not create a subscription or infer plan, price or method. Historical Asaas webhooks retain their verified paid-email behavior. Why: selections happen only in the external store and redirection is not payment proof.
- All checkout registration flows use the shared document-version and consent guard plus server-side acceptance recording before returning payment links; acceptance records are insert-only via the service role and admin-readable. Why: legal acknowledgements must persist independently of client state and payment success.
