export const INFINITEPAY_PAYMENT_URL = "https://loja.infinitepay.io/felipe-bufaical";
export const INFINITEPAY_PLANS = {
  tsa: { name: "Mentoria AUMAKUA TSA 2027", card: 6499.99, pix: 6000 },
  tea: { name: "Mentoria AUMAKUA TEA 2027", card: 5299, pix: 4769.1 },
} as const;

type PendingOrder = {
  aluno_nome: string; aluno_email: string; cpf: string; plano: string;
  valor: number; status: "pendente"; payment_url: string; user_id: null;
};
type OrderWriter = { from(table: "assinaturas"): { insert(row: PendingOrder): PromiseLike<{ error: unknown }> } };

export async function recordInfinitepayOrder(admin: OrderWriter, buyer: {
  name: string; email: string; cpf: string; plan: keyof typeof INFINITEPAY_PLANS; method: "card" | "pix";
}) {
  const plan = INFINITEPAY_PLANS[buyer.plan];
  const { error } = await admin.from("assinaturas").insert({
    aluno_nome: buyer.name, aluno_email: buyer.email, cpf: buyer.cpf,
    plano: plan.name, valor: plan[buyer.method], status: "pendente",
    payment_url: INFINITEPAY_PAYMENT_URL, user_id: null,
  });
  if (error) throw new Error("Não foi possível salvar seu pedido. Tente novamente.");
  return { payment_url: INFINITEPAY_PAYMENT_URL };
}