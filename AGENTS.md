# Project rules

- Asaas API calls happen only in the `asaas-subscribe` backend function; plan name/price live there as server constants. Why: the API key and price must never be controlled by the browser.
