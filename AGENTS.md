# Project rules

- Asaas API calls happen only in the `asaas-subscribe` backend function; plan name/price live there as server constants. Why: the API key and price must never be controlled by the browser.
- Asaas payment confirmations are handled only by the `asaas-webhook` function, authenticated by the `asaas-access-token` header against a stored secret. Why: access must only be granted from verified server-side events.
- Public sales checkout (no login) runs only in the `asaas-checkout-public` function; the webhook adds the paid e-mail to `allowed_emails` so the buyer can sign up. Why: buyers have no account before paying.
