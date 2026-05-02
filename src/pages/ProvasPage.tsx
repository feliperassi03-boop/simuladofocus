import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Play, FileText, Loader2, ShieldAlert, Lock, BookOpen } from "lucide-react";

interface ExamItem {
  id: string;
  title: string;
  question_count: number;
}

const GLOBAL_PASSWORD = "tsa2026";

export default function ProvasPage() {
  const navigate = useNavigate();
  const { user, isAdmin } = useAuth();

  const [exams, setExams] = useState<ExamItem[]>([]);
  const [loading, setLoading] = useState(false);
  const [accessGranted, setAccessGranted] = useState(false);

  // Gate fields
  const [emailInput, setEmailInput] = useState("");
  const [passwordInput, setPasswordInput] = useState("");
  const [error, setError] = useState("");
  const [checking, setChecking] = useState(false);

  // Admin bypass – auto-grant access
  useEffect(() => {
    if (isAdmin) {
      setAccessGranted(true);
    }
  }, [isAdmin]);

  // Fetch exams once access is granted
  useEffect(() => {
    if (!accessGranted) return;

    const fetchExams = async () => {
      setLoading(true);
      const { data: examsData } = await supabase
        .from("exams")
        .select("id, title")
        .eq("is_active", true)
        .order("created_at", { ascending: false });

      if (!examsData) {
        setLoading(false);
        return;
      }

      const examIds = examsData.map((e) => e.id);
      const { data: eqData } = await supabase
        .from("exam_questions")
        .select("exam_id")
        .in("exam_id", examIds);

      const counts: Record<string, number> = {};
      eqData?.forEach((eq) => {
        counts[eq.exam_id] = (counts[eq.exam_id] || 0) + 1;
      });

      setExams(
        examsData.map((e) => ({
          id: e.id,
          title: e.title,
          question_count: counts[e.id] || 0,
        }))
      );
      setLoading(false);
    };

    fetchExams();
  }, [accessGranted]);

  const handleAccessSubmit = async () => {
    setError("");

    if (!emailInput.trim() || !passwordInput.trim()) {
      setError("Preencha todos os campos.");
      return;
    }

    if (passwordInput !== GLOBAL_PASSWORD) {
      setError("Senha incorreta.");
      return;
    }

    setChecking(true);

    const { data } = await supabase
      .from("allowed_emails")
      .select("id")
      .eq("email", emailInput.trim().toLowerCase())
      .maybeSingle();

    if (data) {
      setAccessGranted(true);
    } else {
      setError("E-mail não autorizado. Contate o administrador.");
    }

    setChecking(false);
  };

  // Access gate UI
  if (!accessGranted) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background p-4">
        <div className="w-full max-w-md animate-fade-in">
          <div className="text-center mb-8">
            <div className="inline-flex items-center justify-center w-16 h-16 rounded-2xl gradient-primary mb-4 shadow-glow">
              <BookOpen className="w-8 h-8 text-primary-foreground" />
            </div>
            <h1 className="text-3xl font-bold font-display text-foreground">Simulado Focus</h1>
            <p className="text-muted-foreground mt-2">Acesse as provas disponíveis</p>
          </div>

          <Card className="shadow-elevated border-border/50">
            <CardHeader className="text-center">
              <CardTitle className="font-display text-xl flex items-center justify-center gap-2">
                <Lock className="w-5 h-5" /> Acesso às Provas
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="gate-email">E-mail</Label>
                <Input
                  id="gate-email"
                  type="email"
                  placeholder="seu@email.com"
                  value={emailInput}
                  onChange={(e) => { setEmailInput(e.target.value); setError(""); }}
                  onKeyDown={(e) => e.key === "Enter" && handleAccessSubmit()}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="gate-password">Senha de acesso</Label>
                <Input
                  id="gate-password"
                  type="password"
                  placeholder="••••••••"
                  value={passwordInput}
                  onChange={(e) => { setPasswordInput(e.target.value); setError(""); }}
                  onKeyDown={(e) => e.key === "Enter" && handleAccessSubmit()}
                />
              </div>
              {error && <p className="text-sm text-destructive">{error}</p>}
              <Button
                className="w-full gradient-primary text-primary-foreground"
                onClick={handleAccessSubmit}
                disabled={checking}
              >
                {checking ? "Verificando..." : "Acessar Provas"}
              </Button>
            </CardContent>
          </Card>
        </div>
      </div>
    );
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center py-20">
        <Loader2 className="w-6 h-6 animate-spin text-primary" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-display font-bold text-foreground">Provas Disponíveis</h1>
        <p className="text-muted-foreground mt-1">Selecione uma prova para iniciar</p>
      </div>

      {exams.length === 0 ? (
        <Card className="shadow-card">
          <CardContent className="py-12 text-center text-muted-foreground">
            <FileText className="w-12 h-12 mx-auto mb-4 opacity-40" />
            <p>Nenhuma prova disponível no momento.</p>
          </CardContent>
        </Card>
      ) : (
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {exams.map((exam) => (
            <Card key={exam.id} className="shadow-card hover:shadow-lg transition-shadow">
              <CardHeader className="pb-3">
                <CardTitle className="text-lg font-display">{exam.title}</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <p className="text-sm text-muted-foreground">
                  {exam.question_count} {exam.question_count === 1 ? "questão" : "questões"}
                </p>
                <Button
                  className="w-full gradient-primary text-primary-foreground"
                  onClick={() => navigate(`/prova/${exam.id}`)}
                >
                  <Play className="w-4 h-4 mr-2" /> Iniciar Prova
                </Button>
              </CardContent>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}
