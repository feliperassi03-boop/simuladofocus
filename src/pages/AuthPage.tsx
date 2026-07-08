import { useState } from "react";
import { useAuth } from "@/contexts/AuthContext";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useToast } from "@/hooks/use-toast";
import { LogIn, UserPlus } from "lucide-react";
import logoAsset from "@/assets/aumakua-logo.jpeg.asset.json";

const BRAND = {
  cream: "#F5EFE0",
  navy: "#14294A",
  navyDeep: "#0E1D36",
  orange: "#E8823A",
};

export default function AuthPage() {
  const [isLogin, setIsLogin] = useState(true);
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [fullName, setFullName] = useState("");
  const [loading, setLoading] = useState(false);
  const [forgotPassword, setForgotPassword] = useState(false);
  const { signIn, signUp } = useAuth();
  const { toast } = useToast();

  const handleForgotPassword = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!email) {
      toast({ title: "Erro", description: "Digite seu e-mail.", variant: "destructive" });
      return;
    }
    setLoading(true);
    try {
      const { error } = await supabase.auth.resetPasswordForEmail(email, {
        redirectTo: `${window.location.origin}/#/reset-password`,
      });
      if (error) throw error;
      toast({ title: "E-mail enviado!", description: "Verifique sua caixa de entrada para redefinir a senha." });
      setForgotPassword(false);
    } catch (error: any) {
      toast({ title: "Erro", description: error.message, variant: "destructive" });
    } finally {
      setLoading(false);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    try {
      if (isLogin) {
        await signIn(email, password);
        toast({ title: "Bem-vindo de volta!" });
      } else {
        await signUp(email, password, fullName);
        toast({ title: "Conta criada com sucesso!" });
      }
    } catch (error: any) {
      toast({ title: "Erro", description: error.message, variant: "destructive" });
    } finally {
      setLoading(false);
    }
  };

  return (
    <div
      className="min-h-screen flex items-center justify-center p-4 relative overflow-hidden"
      style={{ backgroundColor: BRAND.cream }}
    >
      {/* Decorative accent shapes */}
      <div
        className="pointer-events-none absolute -top-32 -right-32 w-96 h-96 rounded-full opacity-20 blur-3xl"
        style={{ backgroundColor: BRAND.orange }}
      />
      <div
        className="pointer-events-none absolute -bottom-40 -left-40 w-[28rem] h-[28rem] rounded-full opacity-15 blur-3xl"
        style={{ backgroundColor: BRAND.navy }}
      />

      <div className="w-full max-w-md animate-fade-in relative">
        {/* Logo + brand */}
        <div className="text-center mb-8">
          <div className="inline-flex items-center justify-center mb-4">
            <img
              src={logoAsset.url}
              alt="Aumakua"
              className="h-32 w-auto object-contain mix-blend-multiply"
            />
          </div>
          <p
            className="mt-1 text-sm tracking-[0.35em] uppercase font-medium"
            style={{ color: BRAND.navy, opacity: 0.7 }}
          >
            Plataforma de Simulados
          </p>
        </div>

        {/* Card */}
        <div
          className="rounded-2xl p-8 shadow-2xl border"
          style={{
            backgroundColor: "#FFFFFF",
            borderColor: `${BRAND.navy}20`,
            boxShadow: `0 20px 60px -20px ${BRAND.navy}40`,
          }}
        >
          <div className="text-center mb-6">
            <h2
              className="text-2xl font-bold tracking-tight"
              style={{ color: BRAND.navyDeep }}
            >
              {forgotPassword ? "Redefinir Senha" : isLogin ? "Entrar" : "Criar Conta"}
            </h2>
            <p className="text-sm mt-1" style={{ color: `${BRAND.navy}99` }}>
              {forgotPassword
                ? "Digite seu e-mail para receber o link"
                : isLogin
                ? "Acesse sua conta para começar"
                : "Registre-se para participar dos simulados"}
            </p>
          </div>

          {forgotPassword ? (
            <form onSubmit={handleForgotPassword} className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="email" style={{ color: BRAND.navyDeep }}>E-mail</Label>
                <Input
                  id="email"
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="seu@email.com"
                  required
                  style={{ borderColor: `${BRAND.navy}30` }}
                />
              </div>
              <Button
                type="submit"
                className="w-full font-semibold text-white hover:opacity-90 transition-opacity"
                disabled={loading}
                style={{ backgroundColor: BRAND.orange }}
              >
                {loading ? "Enviando..." : "Enviar link de redefinição"}
              </Button>
              <div className="text-center">
                <button
                  type="button"
                  onClick={() => setForgotPassword(false)}
                  className="text-sm hover:underline"
                  style={{ color: BRAND.orange }}
                >
                  Voltar ao login
                </button>
              </div>
            </form>
          ) : (
            <>
              <form onSubmit={handleSubmit} className="space-y-4">
                {!isLogin && (
                  <div className="space-y-2">
                    <Label htmlFor="name" style={{ color: BRAND.navyDeep }}>Nome completo</Label>
                    <Input
                      id="name"
                      value={fullName}
                      onChange={(e) => setFullName(e.target.value)}
                      placeholder="Seu nome"
                      required={!isLogin}
                      style={{ borderColor: `${BRAND.navy}30` }}
                    />
                  </div>
                )}
                <div className="space-y-2">
                  <Label htmlFor="email" style={{ color: BRAND.navyDeep }}>E-mail</Label>
                  <Input
                    id="email"
                    type="email"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    placeholder="seu@email.com"
                    required
                    style={{ borderColor: `${BRAND.navy}30` }}
                  />
                </div>
                <div className="space-y-2">
                  <div className="flex items-center justify-between">
                    <Label htmlFor="password" style={{ color: BRAND.navyDeep }}>Senha</Label>
                    {isLogin && (
                      <button
                        type="button"
                        onClick={() => setForgotPassword(true)}
                        className="text-xs hover:underline"
                        style={{ color: BRAND.orange }}
                      >
                        Esqueci minha senha
                      </button>
                    )}
                  </div>
                  <Input
                    id="password"
                    type="password"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    placeholder="••••••••"
                    required
                    minLength={6}
                    style={{ borderColor: `${BRAND.navy}30` }}
                  />
                </div>
                <Button
                  type="submit"
                  className="w-full font-semibold text-white hover:opacity-90 transition-opacity h-11"
                  disabled={loading}
                  style={{ backgroundColor: BRAND.orange }}
                >
                  {loading ? (
                    "Carregando..."
                  ) : isLogin ? (
                    <><LogIn className="w-4 h-4 mr-2" /> Entrar</>
                  ) : (
                    <><UserPlus className="w-4 h-4 mr-2" /> Criar Conta</>
                  )}
                </Button>
              </form>
              <div className="mt-5 text-center">
                <button
                  type="button"
                  onClick={() => setIsLogin(!isLogin)}
                  className="text-sm hover:underline"
                  style={{ color: BRAND.navy }}
                >
                  {isLogin ? "Não tem conta? Cadastre-se" : "Já tem conta? Faça login"}
                </button>
              </div>
            </>
          )}
        </div>

        <p
          className="text-center text-xs mt-6"
          style={{ color: `${BRAND.navy}80` }}
        >
          © {new Date().getFullYear()} Aumakua
        </p>
      </div>
    </div>
  );
}
