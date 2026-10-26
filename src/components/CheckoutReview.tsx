import { Link } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { Loader2, Pencil, ArrowRight } from "lucide-react";
import { canProceedToPayment } from "../../supabase/functions/_shared/checkout-consent";

type Props = {
  name: string; email: string; product: string; value: string; method: "card" | "pix";
  terms: boolean; privacy: boolean; loading: boolean;
  onTerms: (checked: boolean) => void; onPrivacy: (checked: boolean) => void;
  onEdit: () => void; onPay: () => void;
};

export default function CheckoutReview(p: Props) {
  return <div className="space-y-5">
    <h2 className="font-display text-xl font-semibold">Revise seu pedido</h2>
    <dl className="space-y-3 text-sm break-words">
      {[["Nome", p.name], ["E-mail", p.email], ["Produto", `${p.product} — acesso de 12 meses`],
        ["Pagamento", p.method === "pix" ? "Pix à vista" : "Cartão de crédito, à vista ou em até 3x"],
        ["Valor", p.value], ["Cupom aplicado", "Nenhum"]].map(([label, value]) =>
        <div key={label}><dt className="text-muted-foreground">{label}</dt><dd className="font-medium">{value}</dd></div>)}
    </dl>
    <Button variant="outline" onClick={p.onEdit} disabled={p.loading}><Pencil className="mr-2 h-4 w-4" />Editar dados</Button>
    <div className="space-y-4 border-t border-border pt-4 text-sm">
      <div className="flex items-start gap-3"><Checkbox id="accept-terms" checked={p.terms} disabled={p.loading} onCheckedChange={(v) => p.onTerms(v === true)} aria-label="Li e aceito os Termos de Uso" />
        <label htmlFor="accept-terms">Li e aceito os <Link className="text-primary underline" to="/termos" target="_blank" rel="noopener noreferrer">Termos de Uso</Link></label></div>
      <div className="flex items-start gap-3"><Checkbox id="accept-privacy" checked={p.privacy} disabled={p.loading} onCheckedChange={(v) => p.onPrivacy(v === true)} aria-label="Li e estou ciente da Política de Privacidade" />
        <label htmlFor="accept-privacy">Li e estou ciente da <Link className="text-primary underline" to="/privacidade" target="_blank" rel="noopener noreferrer">Política de Privacidade</Link></label></div>
    </div>
    <Button className="w-full" onClick={p.onPay} disabled={p.loading || !canProceedToPayment(p.terms, p.privacy)}>
      {p.loading ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <ArrowRight className="mr-2 h-4 w-4" />}Ir para pagamento
    </Button>
  </div>;
}