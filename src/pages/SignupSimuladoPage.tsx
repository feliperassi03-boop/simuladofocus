import { useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { useToast } from "@/hooks/use-toast";
import { CalendarClock, CheckCircle2 } from "lucide-react";

export default function SignupSimuladoPage() {
  const { toast } = useToast();
  const [fullName, setFullName] = useState("");
  const [email, setEmail] = useState("");
  const [type, setType] = useState("residente");
  const [loading, setLoading] = useState(false);
  const [done, setDone] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!fullName.trim() || !email.trim()) {
      toast({ title: "Preencha nome e email", variant: "destructive" });
      return;
    }
    setLoading(true);
    const { error } = await supabase.from("simulado_signups").insert({
      full_name: fullName.trim(),
      email: email.trim().toLowerCase(),
      participant_type: type,
    });
    setLoading(false);
    if (error) {
      if (error.code === "23505") {
        toast({ title: "Este email já está inscrito!" });
        setDone(true);
        return;
      }
      toast({ title: "Erro ao inscrever", description: error.message, variant: "destructive" });
      return;
    }
    setDone(true);
  };

  return (
    <div className="min-h-screen bg-background flex items-center justify-center p-4">
      <Card className="w-full max-w-md shadow-lg">
        <CardHeader className="text-center space-y-2">
          <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-full bg-primary/10 text-primary">
            <CalendarClock className="h-6 w-6" />
          </div>
          <CardTitle className="text-2xl font-display">Simulado Aumakua</CardTitle>
          <p className="text-sm text-muted-foreground">
            13/09 às 08:00 da manhã — 4 horas de duração
          </p>
        </CardHeader>
        <CardContent>
          {done ? (
            <div className="text-center space-y-3 py-6">
              <CheckCircle2 className="h-10 w-10 mx-auto text-primary" />
              <p className="font-medium">Inscrição confirmada!</p>
              <p className="text-sm text-muted-foreground">
                Seu interesse foi registrado. Em breve entraremos em contato.
              </p>
            </div>
          ) : (
            <form onSubmit={handleSubmit} className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="name">Nome completo</Label>
                <Input id="name" value={fullName} onChange={(e) => setFullName(e.target.value)} placeholder="Seu nome completo" />
              </div>
              <div className="space-y-2">
                <Label htmlFor="email">Email</Label>
                <Input id="email" type="email" value={email} onChange={(e) => setEmail(e.target.value)} placeholder="seu@email.com" />
              </div>
              <div className="space-y-2">
                <Label>Você é</Label>
                <RadioGroup value={type} onValueChange={setType} className="flex gap-6">
                  <div className="flex items-center space-x-2">
                    <RadioGroupItem value="residente" id="residente" />
                    <Label htmlFor="residente" className="font-normal cursor-pointer">Residente</Label>
                  </div>
                  <div className="flex items-center space-x-2">
                    <RadioGroupItem value="anestesista" id="anestesista" />
                    <Label htmlFor="anestesista" className="font-normal cursor-pointer">Anestesista</Label>
                  </div>
                </RadioGroup>
              </div>
              <Button type="submit" className="w-full" disabled={loading}>
                {loading ? "Enviando..." : "Confirmar interesse"}
              </Button>
            </form>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
