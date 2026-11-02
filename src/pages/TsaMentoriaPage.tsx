import { useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { useToast } from "@/hooks/use-toast";
import { ArrowRight } from "lucide-react";
import logoAsset from "@/assets/aumakua-logo.jpeg.asset.json";
import CheckoutReview from "@/components/CheckoutReview";
import { z } from "zod";
import { DOCUMENT_VERSIONS, INITIAL_CONSENT, canProceedToPayment } from "../../supabase/functions/_shared/checkout-consent";

const onlyDigits = (s: string) => s.replace(/\D/g, "");
const fmtCpf = (d: string) =>
  d.replace(/(\d{3})(\d)/, "$1.$2").replace(/(\d{3})(\d)/, "$1.$2").replace(/(\d{3})(\d{1,2})$/, "$1-$2");
const fmtPhone = (d: string) =>
  d.replace(/(\d{2})(\d)/, "($1) $2").replace(/(\d{5})(\d{1,4})$/, "$1-$2");
const fmtCep = (d: string) => d.replace(/(\d{5})(\d{1,3})$/, "$1-$2");

export default function TsaMentoriaPage() {
  return <ActiveTsaMentoriaPage />;
}

function ActiveTsaMentoriaPage() {
  const { toast } = useToast();
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [cpf, setCpf] = useState("");
  const [phone, setPhone] = useState("");
  const [addr, setAddr] = useState({ cep: "", street: "", number: "", district: "", city: "", uf: "" });
  const [loading, setLoading] = useState(false);
  const [reviewing, setReviewing] = useState(false);
  const [terms, setTerms] = useState(INITIAL_CONSENT.terms);
  const [privacy, setPrivacy] = useState(INITIAL_CONSENT.privacy);
  const lookupCep = async (cep: string) => {
    if (cep.length !== 8) return;
    try {
      const res = await fetch(`https://viacep.com.br/ws/${cep}/json/`);
      const d = await res.json();
      if (!d.erro) {
        setAddr((a) => ({
          ...a,
          street: d.logradouro || a.street,
          district: d.bairro || a.district,
          city: d.localidade || a.city,
          uf: d.uf || a.uf,
        }));
      }
    } catch { /* segue com preenchimento manual */ }
  };

  const formOk =
    name.trim().length >= 3 && z.string().email().safeParse(email.trim()).success && cpf.length === 11 &&
    (phone.length === 10 || phone.length === 11) && addr.cep.length === 8 &&
    addr.street.trim() && addr.number.trim() && addr.district.trim() && addr.city.trim() && addr.uf.trim().length === 2;

  const review = () => {
    if (!formOk) {
      toast({ title: "Preencha todos os dados", variant: "destructive" });
      return;
    }
    setTerms(false);
    setPrivacy(false);
    setReviewing(true);
  };

  const pay = async () => {
    if (!formOk || !canProceedToPayment(terms, privacy)) return;
    setLoading(true);
    const { data, error } = await supabase.functions.invoke("infinitepay-checkout-public", {
      body: { name: name.trim(), email: email.trim(), cpf, phone, address: { postalCode: addr.cep, street: addr.street.trim(), number: addr.number.trim(), district: addr.district.trim(), city: addr.city.trim(), uf: addr.uf.trim() },
        consent: { terms, privacy, termsVersion: DOCUMENT_VERSIONS.termos, privacyVersion: DOCUMENT_VERSIONS.privacidade } },
    });
    const msg = (data as any)?.error || (error as any)?.context && (await (error as any).context.json().catch(() => null))?.error;
    if (data?.payment_url) {
      window.location.href = data.payment_url;
      return;
    }
    setLoading(false);
    toast({ title: "Não foi possível abrir o pagamento", description: msg || error?.message, variant: "destructive" });
  };

  return (
    <div className="min-h-screen bg-background flex items-center justify-center p-4">
      <Card className="w-full max-w-lg">
        <CardHeader className="text-center space-y-3">
          <img src={logoAsset.url} alt="AUMAKUA" className="h-16 w-16 rounded-full mx-auto object-cover" />
          <CardTitle className="font-display text-2xl break-words">Mentorias AUMAKUA 2027</CardTitle>
          <p className="text-sm text-muted-foreground">Acesso por 12 meses às provas, simulados e videoaulas.</p>
        </CardHeader>
        <CardContent>
          {reviewing ? (
            <CheckoutReview name={name.trim()} email={email.trim()} externalSelection
              terms={terms} privacy={privacy} loading={!!loading} onTerms={setTerms} onPrivacy={setPrivacy}
              onEdit={() => { setReviewing(false); setTerms(false); setPrivacy(false); }} onPay={pay} />
          ) : (
            <div className="space-y-4">
              <div className="space-y-1"><Label>Nome completo</Label><Input value={name} onChange={(e) => setName(e.target.value)} maxLength={120} /></div>
              <div className="space-y-1"><Label>E-mail</Label><Input type="email" value={email} onChange={(e) => setEmail(e.target.value)} maxLength={255} />
                <p className="text-xs text-muted-foreground">Use este mesmo e-mail depois para criar sua conta.</p></div>
              <div className="space-y-1"><Label>CPF</Label><Input inputMode="numeric" value={fmtCpf(cpf)} onChange={(e) => setCpf(onlyDigits(e.target.value).slice(0, 11))} /></div>
              <div className="space-y-1"><Label>Celular (WhatsApp)</Label><Input inputMode="tel" placeholder="(11) 99999-9999" value={fmtPhone(phone)} onChange={(e) => setPhone(onlyDigits(e.target.value).slice(0, 11))} /></div>
              <div className="grid grid-cols-3 gap-3">
                <div className="space-y-1 col-span-1"><Label>CEP</Label>
                  <Input inputMode="numeric" placeholder="00000-000" value={fmtCep(addr.cep)} onChange={(e) => setAddr((a) => ({ ...a, cep: onlyDigits(e.target.value).slice(0, 8) }))} onBlur={() => lookupCep(addr.cep)} />
                </div>
                <div className="space-y-1 col-span-2"><Label>Endereço</Label>
                  <Input value={addr.street} onChange={(e) => setAddr((a) => ({ ...a, street: e.target.value }))} maxLength={120} />
                </div>
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-1"><Label>Número</Label>
                  <Input value={addr.number} onChange={(e) => setAddr((a) => ({ ...a, number: e.target.value }))} maxLength={20} />
                </div>
                <div className="space-y-1"><Label>Bairro</Label>
                  <Input value={addr.district} onChange={(e) => setAddr((a) => ({ ...a, district: e.target.value }))} maxLength={80} />
                </div>
              </div>
              <div className="grid grid-cols-3 gap-3">
                <div className="space-y-1 col-span-2"><Label>Cidade</Label>
                  <Input value={addr.city} onChange={(e) => setAddr((a) => ({ ...a, city: e.target.value }))} maxLength={80} />
                </div>
                <div className="space-y-1"><Label>UF</Label>
                  <Input value={addr.uf} maxLength={2} onChange={(e) => setAddr((a) => ({ ...a, uf: e.target.value.toUpperCase() }))} />
                </div>
              </div>
              <Button onClick={review} disabled={loading} className="w-full"><ArrowRight className="mr-2 h-4 w-4" />Continuar</Button>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
