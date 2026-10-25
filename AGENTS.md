# Project rules

- Asaas API calls happen only in the backend functions (`asaas-subscribe`, `asaas-checkout-public`, `asaas-webhook`); plan names/prices live in `asaas-subscribe` and `asaas-checkout-public` as server constants in a `PLANS` map keyed `tsa`/`tea`. Why: the API key and prices must never be controlled by the browser.
- Asaas payment confirmations are handled only by the `asaas-webhook` function, authenticated by the `asaas-access-token` header against a stored secret. Why: access must only be granted from verified server-side events.
- Public sales checkout (no login) runs only in the `asaas-checkout-public` function; the webhook adds the paid e-mail to `allowed_emails` so the buyer can sign up. Why: buyers have no account before paying.
