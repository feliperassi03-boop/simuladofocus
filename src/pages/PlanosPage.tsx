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

const formatCpf = (v: string) => {
  const d = v.replace(/\D/g, "").slice(0, 11);
  return d.replace(/(\d{3})(\d)/, "$1.$2").replace(/(\d{3})(\d)/, "$1.$2").replace(/(\d{3})(\d{1,2})$/, "$1-$2");
};

export default function PlanosPage() {
  const { user } = useAuth();
  const { toast } = useToast();
  const [loading, setLoading] = useState<null | "card" | "pix">(null);
  const [method, setMethod] = useState<"card" | "pix">("card");
  const [askCpf, setAskCpf] = useState(false);
  const [cpf, setCpf] = useState("");
  const [name, setName] = useState<string>(user?.user_metadata?.full_name || "");

  const subscribe = async (m: "card" | "pix", extra?: { cpf: string; name: string }) => {
    setMethod(m);
    setLoading(m);
    const { data, error } = await supabase.functions.invoke("asaas-subscribe", { body: { ...(extra ?? {}), method: m } });
    setLoading(null);
    if (error || data?.error) {
      let msg = data?.error || error?.message;
      try { msg = (await (error as any)?.context?.json())?.error || msg; } catch { /* ignore */ }
      return toast({ title: "Não foi possível assinar", description: msg, variant: "destructive" });
    }
    if (data?.need_cpf) return setAskCpf(true);
    if (data?.payment_url) {
      window.location.href = data.payment_url;
    } else {
      toast({ title: "Assinatura criada", description: "Link de pagamento indisponível no momento." });
    }
  };

  const confirmCpf = () => {
    const digits = cpf.replace(/\D/g, "");
    if (digits.length !== 11) return toast({ title: "Informe um CPF válido.", variant: "destructive" });
    if (name.trim().length < 3) return toast({ title: "Informe seu nome completo.", variant: "destructive" });
    setAskCpf(false);
    subscribe(method, { cpf: digits, name: name.trim() });
  };

  return (
    <div className="space-y-6 max-w-xl mx-auto">
      <div>
        <h1 className="text-2xl font-display font-bold text-foreground">Planos</h1>
        <p className="text-muted-foreground mt-1">Ambiente de testes (sandbox) — nenhuma cobrança real.</p>
      </div>
      <Card className="shadow-card">
        <CardHeader>
          <CardTitle className="font-display">Mentoria AUMAKUA TSA 2027</CardTitle>
          <p className="text-3xl font-bold text-foreground">R$ 6.499,99<span className="text-base font-normal text-muted-foreground"> em até 3x no cartão</span></p>
          <p className="text-lg font-semibold text-primary">ou R$ 6.000,00 à vista no Pix</p>
        </CardHeader>
        <CardContent className="space-y-4">
          <ul className="space-y-2 text-sm text-foreground">
            <li className="flex gap-2"><CheckCircle2 className="w-4 h-4 text-primary" /> Acesso a todas as provas e simulados</li>
            <li className="flex gap-2"><CheckCircle2 className="w-4 h-4 text-primary" /> VIDEOAULAS</li>
            <li className="flex gap-2"><CheckCircle2 className="w-4 h-4 text-primary" /> Acesso por 12 meses após a confirmação do pagamento</li>
          </ul>
          <Button className="w-full gradient-primary text-primary-foreground" size="lg" disabled={!!loading} onClick={() => subscribe("card")}>
            {loading === "card" ? <Loader2 className="w-4 h-4 mr-2 animate-spin" /> : null} Cartão de crédito — até 3x de R$ 2.166,66
          </Button>
          <Button className="w-full" variant="outline" size="lg" disabled={!!loading} onClick={() => subscribe("pix")}>
            {loading === "pix" ? <Loader2 className="w-4 h-4 mr-2 animate-spin" /> : null} Pix — R$ 6.000,00
          </Button>
        </CardContent>
      </Card>

      <Dialog open={askCpf} onOpenChange={setAskCpf}>
        <DialogContent className="max-w-sm">
          <DialogHeader>
            <DialogTitle>Seus dados</DialogTitle>
            <DialogDescription>Precisamos do seu nome e CPF para emitir a cobrança.</DialogDescription>
          </DialogHeader>
          <div className="space-y-3">
            <div><Label>Nome completo</Label><Input value={name} onChange={(e) => setName(e.target.value)} /></div>
            <div><Label>CPF</Label><Input inputMode="numeric" value={cpf} onChange={(e) => setCpf(formatCpf(e.target.value))} placeholder="000.000.000-00" /></div>
          </div>
          <DialogFooter><Button onClick={confirmCpf}>Continuar</Button></DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
