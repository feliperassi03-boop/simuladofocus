import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { useToast } from "@/hooks/use-toast";
import { BookOpen, KeyRound } from "lucide-react";
import { useNavigate } from "react-router-dom";

export default function ResetPasswordPage() {
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [isRecovery, setIsRecovery] = useState(false);
  const { toast } = useToast();
  const navigate = useNavigate();

  useEffect(() => {
    // Com HashRouter o link do Supabase fica: .../#/reset-password#access_token=...&type=recovery
    // Precisamos extrair os tokens manualmente e criar a sessão.
    const rawHash = window.location.hash || "";
    const search = window.location.search || "";

    // Junta tudo o que houver depois de qualquer '#' ou '?'
    const combined = (rawHash + "&" + search).replace(/^#/, "");
    const params = new URLSearchParams(combined.replace(/#/g, "&").replace(/\?/g, "&"));

    const access_token = params.get("access_token");
    const refresh_token = params.get("refresh_token");
    const type = params.get("type");
    const error_description = params.get("error_description");

    if (error_description) {
      toast({ title: "Link inválido", description: error_description, variant: "destructive" });
    }

    if (type === "recovery" && access_token && refresh_token) {
      supabase.auth
        .setSession({ access_token, refresh_token })
        .then(({ error }) => {
          if (error) {
            toast({ title: "Erro", description: error.message, variant: "destructive" });
          } else {
            setIsRecovery(true);
            // limpa a URL para evitar reprocessamento
            window.history.replaceState(null, "", "#/reset-password");
          }
        });
    } else if (rawHash.includes("type=recovery")) {
      setIsRecovery(true);
    }

    const { data: { subscription } } = supabase.auth.onAuthStateChange((event) => {
      if (event === "PASSWORD_RECOVERY") {
        setIsRecovery(true);
      }
    });

    return () => subscription.unsubscribe();
  }, []);

  const handleReset = async (e: React.FormEvent) => {
    e.preventDefault();
    if (password !== confirmPassword) {
      toast({ title: "Erro", description: "As senhas não coincidem.", variant: "destructive" });
      return;
    }
    if (password.length < 6) {
      toast({ title: "Erro", description: "A senha deve ter pelo menos 6 caracteres.", variant: "destructive" });
      return;
    }
    setLoading(true);
    try {
      const { error } = await supabase.auth.updateUser({ password });
      if (error) throw error;
      toast({ title: "Senha redefinida com sucesso!" });
      navigate("/");
    } catch (error: any) {
      toast({ title: "Erro", description: error.message, variant: "destructive" });
    } finally {
      setLoading(false);
    }
  };

  if (!isRecovery) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background p-4">
        <Card className="w-full max-w-md shadow-elevated border-border/50">
          <CardContent className="pt-6 text-center">
            <p className="text-muted-foreground">Link de recuperação inválido ou expirado.</p>
            <Button variant="link" onClick={() => navigate("/auth")} className="mt-4 text-primary">
              Voltar ao login
            </Button>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-background p-4">
      <div className="w-full max-w-md animate-fade-in">
        <div className="text-center mb-8">
          <div className="inline-flex items-center justify-center w-16 h-16 rounded-2xl gradient-primary mb-4 shadow-glow">
            <BookOpen className="w-8 h-8 text-primary-foreground" />
          </div>
          <h1 className="text-3xl font-bold font-display text-foreground">QuizMaster</h1>
        </div>

        <Card className="shadow-elevated border-border/50">
          <CardHeader className="text-center">
            <CardTitle className="font-display text-xl">Nova Senha</CardTitle>
            <CardDescription>Digite sua nova senha abaixo</CardDescription>
          </CardHeader>
          <CardContent>
            <form onSubmit={handleReset} className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="password">Nova senha</Label>
                <Input
                  id="password"
                  type="password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="••••••••"
                  required
                  minLength={6}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="confirmPassword">Confirmar senha</Label>
                <Input
                  id="confirmPassword"
                  type="password"
                  value={confirmPassword}
                  onChange={(e) => setConfirmPassword(e.target.value)}
                  placeholder="••••••••"
                  required
                  minLength={6}
                />
              </div>
              <Button type="submit" className="w-full gradient-primary text-primary-foreground" disabled={loading}>
                <KeyRound className="w-4 h-4 mr-2" />
                {loading ? "Salvando..." : "Redefinir Senha"}
              </Button>
            </form>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
