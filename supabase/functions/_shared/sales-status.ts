export const SALES_ENABLED: boolean = false;
export const SALES_DISABLED_MESSAGE = "As vendas estão temporariamente indisponíveis. Não estamos recebendo novos pagamentos por Pix ou cartão.";

export function salesUnavailableResponse(headers: HeadersInit): Response | null {
  if (SALES_ENABLED) return null;
  return new Response(JSON.stringify({ error: SALES_DISABLED_MESSAGE, code: "SALES_DISABLED" }), {
    status: 403,
    headers: { ...headers, "Content-Type": "application/json" },
  });
}