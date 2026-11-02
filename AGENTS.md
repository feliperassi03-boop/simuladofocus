# Project rules

- Legal pages preserve the supplied wording in structured reading blocks and link the original immutable PDF assets; new uploads bump shared consent versions without rewriting past acceptance rows. Why: buyers can conserve the exact document and earlier legal evidence stays intact.

- Both legacy Asaas checkout functions enforce the shared disabled-sales guard before any database or Asaas operation. The public purchase form instead uses the separate InfinitePay registration function. Why: restoring new-provider purchases must not reopen legacy Asaas charges.

- Asaas API calls happen only in the backend functions (`asaas-subscribe`, `asaas-checkout-public`, `asaas-webhook`); plan names/prices live in server-side `PLANS` maps and public plan keys are restricted by the shared server allowlist. Removed test purchases retain the webhook no-entitlement guard for historical events. Why: browser input must not control prices or create discounted entitlements.
- Asaas payment confirmations are handled only by the `asaas-webhook` function, authenticated by the `asaas-access-token` header against a stored secret. Why: access must only be granted from verified server-side events.
- New public sales registration (no login) runs in `infinitepay-checkout-public`, which records consent and a pending order before returning a fixed server-configured store URL; it never activates access or allows signup. Historical Asaas webhooks retain their verified paid-email behavior. Why: opening an external store is not proof of payment.
- All checkout registration flows use the shared document-version and consent guard plus server-side acceptance recording before returning payment links; acceptance records are insert-only via the service role and admin-readable. Why: legal acknowledgements must persist independently of client state and payment success.
