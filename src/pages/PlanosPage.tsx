import { useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { useToast } from "@/hooks/use-toast";
import { CheckCircle2, Loader2 } from "lucide-react";
import CheckoutReview from "@/components/CheckoutReview";
import { DOCUMENT_VERSIONS, INITIAL_CONSENT, canProceedToPayment } from "../../supabase/functions/_shared/checkout-consent";

const PLANS_UI = {
  tsa: { name: "Mentoria AUMAKUA TSA 2027", card: "R$ 6.499,99", card3x: "R$ 2.166,66", pix: "R$ 6.000,00" },
  tea: { name: "Mentoria AUMAKUA TEA 2027", card: "R$ 5.299,00", card3x: "R$ 1.766,33", pix: "R$ 4.769,10" },
};

const formatCpf = (v: string) => {
  const d = v.replace(/\D/g, "").slice(0, 11);
  return d.replace(/(\d{3})(\d)/, "$1.$2").replace(/(\d{3})(\d)/, "$1.$2").replace(/(\d{3})(\d{1,2})$/, "$1-$2");
};

const formatPhone = (v: string) => {
  const d = v.replace(/\D/g, "").slice(0, 11);
  if (d.length <= 2) return d;
  if (d.length <= 7) return `(${d.slice(0, 2)}) ${d.slice(2)}`;
  return `(${d.slice(0, 2)}) ${d.slice(2, d.length - 4)}-${d.slice(-4)}`;
};

const formatCep = (v: string) => {
  const d = v.replace(/\D/g, "").slice(0, 8);
  return d.replace(/(\d{5})(\d{1,3})$/, "$1-$2");
};

export default function PlanosPage() {
  const { user } = useAuth();
  const { toast } = useToast();
  const [loading, setLoading] = useState<null | "card" | "pix">(null);
  const [method, setMethod] = useState<"card" | "pix">("card");
  const [plan, setPlan] = useState<"tsa" | "tea">("tsa");
  const cur = PLANS_UI[plan];
  const [askCpf, setAskCpf] = useState(false);
  const [cpf, setCpf] = useState("");
  const [phone, setPhone] = useState("");
  const [addr, setAddr] = useState({ cep: "", street: "", number: "", district: "", city: "", uf: "" });
  const [name, setName] = useState<string>(user?.user_metadata?.full_name || "");

  const lookupCep = async (cep: string) => {
    if (cep.length !== 8) return;
    try {
      const res = await fetch(`https://viacep.com.br/ws/${cep}/json/`);
      const d = await res.json();
      if (!d.erro) {
        setAddr((a) => ({ ...a, street: d.logradouro || a.street, district: d.bairro || a.district, city: d.localidade || a.city, uf: d.uf || a.uf }));
      }
    } catch { /* segue com preenchimento manual */ }
  };
  const [reviewing, setReviewing] = useState(false);
  const [terms, setTerms] = useState(INITIAL_CONSENT.terms);
  const [privacy, setPrivacy] = useState(INITIAL_CONSENT.privacy);

  const startReview = (m: "card" | "pix") => {
    setMethod(m);
    setTerms(false);
    setPrivacy(false);
    setAskCpf(true);
  };

  const subscribe = async (m: "card" | "pix", extra?: { cpf: string; name: string; phone: string; address: { postalCode: string; street: string; number: string; district: string; city: string; uf: string } }) => {
    if (!canProceedToPayment(terms, privacy)) return;
    setMethod(m);
    setLoading(m);
    const { data, error } = await supabase.functions.invoke("asaas-subscribe", { body: { plan, ...(extra ?? {}), method: m,
      consent: { terms, privacy, termsVersion: DOCUMENT_VERSIONS.termos, privacyVersion: DOCUMENT_VERSIONS.privacidade } } });
    setLoading(null);
    if (error || data?.error) {
      let msg = data?.error || error?.message;
      try { msg = (await (error as any)?.context?.json())?.error || msg; } catch { /* ignore */ }
      return toast({ title: "Não foi possível assinar", description: msg, variant: "destructive" });
    }
    if (data?.need_cpf || data?.need_phone || data?.need_address) return setAskCpf(true);
    if (data?.payment_url) {
      window.location.href = data.payment_url;
    } else {
      toast({ title: "Assinatura criada", description: "Link de pagamento indisponível no momento." });
    }
  };

  const confirmCpf = () => {
    const digits = cpf.replace(/\D/g, "");
    if (digits.length !== 11) return toast({ title: "Informe um CPF válido.", variant: "destructive" });
    const phoneDigits = phone.replace(/\D/g, "");
    if (phoneDigits.length < 10 || phoneDigits.length > 11) return toast({ title: "Informe um celular válido com DDD.", variant: "destructive" });
    if (name.trim().length < 3) return toast({ title: "Informe seu nome completo.", variant: "destructive" });
    if (addr.cep.length !== 8 || !addr.street.trim() || !addr.number.trim() || !addr.district.trim() || !addr.city.trim() || addr.uf.trim().length !== 2)
      return toast({ title: "Preencha o endereço completo.", variant: "destructive" });
    setAskCpf(false);
    setReviewing(true);
  };

  return (
    <div className="space-y-6 max-w-xl mx-auto">
      <div>
        <h1 className="text-2xl font-display font-bold text-foreground">Planos</h1>
        <p className="text-muted-foreground mt-1">Ambiente de testes (sandbox) — nenhuma cobrança real.</p>
      </div>
      <Card className="shadow-card">
        {reviewing ? <CardContent className="pt-6"><CheckoutReview name={name.trim()} email={user?.email || ""} product={cur.name} value={cur[method]} method={method}
          terms={terms} privacy={privacy} loading={!!loading} onTerms={setTerms} onPrivacy={setPrivacy}
          onEdit={() => { setReviewing(false); setTerms(false); setPrivacy(false); setAskCpf(true); }}
          onPay={() => subscribe(method, { cpf: cpf.replace(/\D/g, ""), name: name.trim(), phone: phone.replace(/\D/g, ""),
            address: { postalCode: addr.cep, street: addr.street.trim(), number: addr.number.trim(), district: addr.district.trim(), city: addr.city.trim(), uf: addr.uf.trim() } })} /></CardContent> : <>
        <CardHeader>
          <div className="grid grid-cols-2 gap-2 mb-2">
            {(["tsa", "tea"] as const).map((p) => (
              <button key={p} type="button" onClick={() => setPlan(p)}
                className={`rounded-lg border p-2 text-xs font-display font-semibold transition ${plan === p ? "border-primary bg-primary/5" : "border-border"}`}>
                {PLANS_UI[p].name.replace("Mentoria AUMAKUA ", "")}
              </button>
            ))}
          </div>
          <CardTitle className="font-display">{cur.name}</CardTitle>
          <p className="text-3xl font-bold text-foreground">{cur.card}<span className="text-base font-normal text-muted-foreground"> em até 3x no cartão</span></p>
          <p className="text-lg font-semibold text-primary">ou {cur.pix} à vista no Pix</p>
        </CardHeader>
        <CardContent className="space-y-4">
          <ul className="space-y-2 text-sm text-foreground">
            <li className="flex gap-2"><CheckCircle2 className="w-4 h-4 text-primary" /> Acesso a todas as provas e simulados</li>
            <li className="flex gap-2"><CheckCircle2 className="w-4 h-4 text-primary" /> VIDEOAULAS</li>
            <li className="flex gap-2"><CheckCircle2 className="w-4 h-4 text-primary" /> Acesso por 12 meses após a confirmação do pagamento</li>
          </ul>
          <Button className="w-full gradient-primary text-primary-foreground" size="lg" disabled={!!loading} onClick={() => startReview("card")}>
            {loading === "card" ? <Loader2 className="w-4 h-4 mr-2 animate-spin" /> : null} Cartão de crédito — até 3x de {cur.card3x}
          </Button>
          <Button className="w-full" variant="outline" size="lg" disabled={!!loading} onClick={() => startReview("pix")}>
            {loading === "pix" ? <Loader2 className="w-4 h-4 mr-2 animate-spin" /> : null} Pix — {cur.pix}
          </Button>
        </CardContent>
        </>}
      </Card>

      <Dialog open={askCpf} onOpenChange={setAskCpf}>
        <DialogContent className="max-w-sm">
          <DialogHeader>
            <DialogTitle>Seus dados</DialogTitle>
            <DialogDescription>Precisamos dos seus dados para emitir a cobrança.</DialogDescription>
          </DialogHeader>
          <div className="space-y-3 max-h-[60vh] overflow-y-auto pr-1">
            <div><Label>Nome completo</Label><Input value={name} maxLength={120} onChange={(e) => setName(e.target.value)} /></div>
            <div><Label>CPF</Label><Input inputMode="numeric" value={cpf} onChange={(e) => setCpf(formatCpf(e.target.value))} placeholder="000.000.000-00" /></div>
            <div><Label>Celular</Label><Input inputMode="numeric" value={phone} onChange={(e) => setPhone(formatPhone(e.target.value))} placeholder="(00) 00000-0000" /></div>
            <div className="grid grid-cols-3 gap-2">
              <div><Label>CEP</Label><Input inputMode="numeric" value={formatCep(addr.cep)} placeholder="00000-000"
                onChange={(e) => setAddr((a) => ({ ...a, cep: e.target.value.replace(/\D/g, "").slice(0, 8) }))} onBlur={() => lookupCep(addr.cep)} /></div>
              <div className="col-span-2"><Label>Endereço</Label><Input value={addr.street} maxLength={120} onChange={(e) => setAddr((a) => ({ ...a, street: e.target.value }))} /></div>
            </div>
            <div className="grid grid-cols-2 gap-2">
              <div><Label>Número</Label><Input value={addr.number} maxLength={20} onChange={(e) => setAddr((a) => ({ ...a, number: e.target.value }))} /></div>
              <div><Label>Bairro</Label><Input value={addr.district} maxLength={80} onChange={(e) => setAddr((a) => ({ ...a, district: e.target.value }))} /></div>
            </div>
            <div className="grid grid-cols-3 gap-2">
              <div className="col-span-2"><Label>Cidade</Label><Input value={addr.city} maxLength={80} onChange={(e) => setAddr((a) => ({ ...a, city: e.target.value }))} /></div>
              <div><Label>UF</Label><Input value={addr.uf} maxLength={2} onChange={(e) => setAddr((a) => ({ ...a, uf: e.target.value.toUpperCase() }))} /></div>
            </div>
          </div>
          <DialogFooter><Button onClick={confirmCpf}>Continuar</Button></DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
