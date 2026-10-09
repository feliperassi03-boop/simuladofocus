import { useState } from "react";
import { Link, useSearchParams } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { useToast } from "@/hooks/use-toast";
import { CheckCircle2, CreditCard, QrCode, Loader2 } from "lucide-react";
import logoAsset from "@/assets/aumakua-logo.jpeg.asset.json";

const onlyDigits = (s: string) => s.replace(/\D/g, "").slice(0, 11);
const fmtCpf = (d: string) =>
  d.replace(/(\d{3})(\d)/, "$1.$2").replace(/(\d{3})(\d)/, "$1.$2").replace(/(\d{3})(\d{1,2})$/, "$1-$2");

export default function TsaMentoriaPage() {
  const [params] = useSearchParams();
  const paid = params.get("pago") === "1";
  const { toast } = useToast();
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [cpf, setCpf] = useState("");
  const [loading, setLoading] = useState<"card" | "pix" | null>(null);

  const pay = async (method: "card" | "pix") => {
    if (name.trim().length < 3 || !email.includes("@") || cpf.length !== 11) {
      toast({ title: "Preencha nome, e-mail e CPF", variant: "destructive" });
      return;
    }
    setLoading(method);
    const { data, error } = await supabase.functions.invoke("asaas-checkout-public", {
      body: { name: name.trim(), email: email.trim(), cpf, method },
    });
    const msg = (data as any)?.error || (error as any)?.context && (await (error as any).context.json().catch(() => null))?.error;
    if (data?.payment_url) {
      window.location.href = data.payment_url;
      return;
    }
    setLoading(null);
    toast({ title: "Não foi possível abrir o pagamento", description: msg || error?.message, variant: "destructive" });
  };

  return (
    <div className="min-h-screen bg-background flex items-center justify-center p-4">
      <Card className="w-full max-w-lg">
        <CardHeader className="text-center space-y-3">
          <img src={logoAsset.url} alt="AUMAKUA" className="h-16 w-16 rounded-full mx-auto object-cover" />
          <CardTitle className="font-display text-2xl break-words">Mentoria AUMAKUA TSA 2027</CardTitle>
          <p className="text-sm text-muted-foreground">Acesso por 12 meses às provas, simulados e videoaulas.</p>
        </CardHeader>
        <CardContent>
          {paid ? (
            <div className="text-center space-y-4">
              <CheckCircle2 className="h-12 w-12 mx-auto text-primary" />
              <h2 className="font-display text-xl">Pagamento recebido!</h2>
              <p className="text-sm text-muted-foreground">
                Agora crie sua conta na plataforma usando <strong>o mesmo e-mail que você informou na compra</strong>.
                Se o pagamento foi por cartão ou Pix, a liberação costuma levar poucos minutos.
              </p>
              <Button asChild className="w-full"><Link to="/auth">Criar minha conta</Link></Button>
            </div>
          ) : (
            <div className="space-y-4">
              <div className="space-y-1"><Label>Nome completo</Label><Input value={name} onChange={(e) => setName(e.target.value)} maxLength={120} /></div>
              <div className="space-y-1"><Label>E-mail</Label><Input type="email" value={email} onChange={(e) => setEmail(e.target.value)} maxLength={255} />
                <p className="text-xs text-muted-foreground">Use este mesmo e-mail depois para criar sua conta.</p></div>
              <div className="space-y-1"><Label>CPF</Label><Input inputMode="numeric" value={fmtCpf(cpf)} onChange={(e) => setCpf(onlyDigits(e.target.value))} /></div>
              <div className="grid gap-3 pt-2">
                <Button onClick={() => pay("card")} disabled={!!loading} className="h-auto py-3 flex-col">
                  <span className="flex items-center gap-2">{loading === "card" ? <Loader2 className="h-4 w-4 animate-spin" /> : <CreditCard className="h-4 w-4" />}Cartão de crédito — R$ 6.499,99</span>
                  <span className="text-xs opacity-80">à vista ou em até 3x</span>
                </Button>
                <Button onClick={() => pay("pix")} disabled={!!loading} variant="secondary" className="h-auto py-3 flex-col">
                  <span className="flex items-center gap-2">{loading === "pix" ? <Loader2 className="h-4 w-4 animate-spin" /> : <QrCode className="h-4 w-4" />}Pix — R$ 6.000,00</span>
                  <span className="text-xs opacity-80">à vista</span>
                </Button>
              </div>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
