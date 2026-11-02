import { describe, expect, it } from "vitest";
import { INFINITEPAY_PAYMENT_URL, recordInfinitepayOrder } from "../../supabase/functions/_shared/infinitepay-checkout";

describe("Registro antes da InfinitePay", () => {
  it("direciona exclusivamente à loja fornecida pelo responsável", () => {
    expect(INFINITEPAY_PAYMENT_URL).toBe("https://loja.infinitepay.io/felipe-bufaical");
  });
  it("registra pedido pendente sem liberar acesso e usa preço do servidor", async () => {
    const rows: unknown[] = [];
    const tables: string[] = [];
    const admin = { from: (table: "assinaturas") => {
      tables.push(table);
      return { insert: async (row: unknown) => { rows.push(row); return { error: null }; } };
    } };
    const result = await recordInfinitepayOrder(admin, {
      name: "Comprador", email: "teste@example.invalid", cpf: "52998224725", plan: "tsa", method: "card",
    });
    expect(rows).toEqual([{
      aluno_nome: "Comprador", aluno_email: "teste@example.invalid", cpf: "52998224725",
      plano: "Mentoria AUMAKUA TSA 2027", valor: 6499.99, status: "pendente", user_id: null,
      payment_url: "https://loja.infinitepay.io/felipe-bufaical",
    }]);
    expect(tables).toEqual(["assinaturas"]);
    expect(result.payment_url).toBe(INFINITEPAY_PAYMENT_URL);
  });
  it("não retorna link quando o registro do pedido falha", async () => {
    const admin = { from: () => ({ insert: async () => ({ error: "falha" }) }) };
    await expect(recordInfinitepayOrder(admin, {
      name: "Comprador", email: "teste@example.invalid", cpf: "52998224725", plan: "tea", method: "pix",
    })).rejects.toThrow("Não foi possível salvar seu pedido");
  });
});