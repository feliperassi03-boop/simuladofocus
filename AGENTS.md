# Project rules

- Video-content deletion uses in-app confirmation, verifies the deleted database row before removing media, and reports failures. Why: embedded previews may block native confirmation and failed deletes must not leave playable lessons with missing files.

- Existing exams use a shared bulk-add dialog that appends only missing question links after the highest saved order and filters second-phase banks by exam type. Why: fast selection must not replace content, duplicate questions, or mix banks.

- Pasted question processors normalize Unicode and legacy line separators before identifying blocks; multiple-choice parsing is isolated in a tested helper and never defaults an unidentified answer to A. Why: pasted mobile/document text must keep alternatives, answers and explanations separate without inventing a correct answer.

- Home-screen installation uses a manifest and logo-derived public icons only, without app-shell service workers or offline caching. Why: standalone launch should not introduce stale preview caches or promise offline access.

- Legal pages preserve the supplied wording in structured reading blocks and link the original immutable PDF assets; new uploads bump shared consent versions without rewriting past acceptance rows. Why: buyers can conserve the exact document and earlier legal evidence stays intact.

- Both legacy Asaas checkout functions enforce the shared disabled-sales guard before any database or Asaas operation. The public purchase form instead uses the separate InfinitePay registration function. Why: restoring new-provider purchases must not reopen legacy Asaas charges.

- Asaas API calls happen only in the backend functions (`asaas-subscribe`, `asaas-checkout-public`, `asaas-webhook`); plan names/prices live in server-side `PLANS` maps and public plan keys are restricted by the shared server allowlist. Removed test purchases retain the webhook no-entitlement guard for historical events. Why: browser input must not control prices or create discounted entitlements.
- Asaas payment confirmations are handled only by the `asaas-webhook` function, authenticated by the `asaas-access-token` header against a stored secret. Why: access must only be granted from verified server-side events.
- New public registration runs in `infinitepay-checkout-public`, recording identity and consent in `checkout_pre_registrations` before returning the fixed store URL; it does not create a subscription or infer plan, price or method. Historical Asaas webhooks retain their verified paid-email behavior. Why: selections happen only in the external store and redirection is not payment proof.
- All checkout registration flows use the shared document-version and consent guard plus server-side acceptance recording before returning payment links; acceptance records are insert-only via the service role and admin-readable. Why: legal acknowledgements must persist independently of client state and payment success.

- TEA and TSA second-phase exams reuse the same three-part editor and runtime; the exam_type discriminator isolates question banks, lists, and links while preserving existing TEA records and ownership policies. Why: keep identical authoring behavior without duplicating logic or mixing content.
