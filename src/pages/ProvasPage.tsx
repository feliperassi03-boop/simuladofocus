import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Play, FileText, Loader2, ShieldAlert, Lock } from "lucide-react";

interface ExamItem {
  id: string;
  title: string;
  question_count: number;
}

export default function ProvasPage() {
  const navigate = useNavigate();
  const { user, isAdmin } = useAuth();
  const [exams, setExams] = useState<ExamItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [allowed, setAllowed] = useState<boolean | null>(null);

  useEffect(() => {
    const checkAccess = async () => {
      if (!user?.email) {
        setAllowed(false);
        setLoading(false);
        return;
      }

      // Admins always have access
      if (isAdmin) {
        setAllowed(true);
        fetchExams();
        return;
      }

      const { data } = await supabase
        .from("allowed_emails")
        .select("id")
        .eq("email", user.email.toLowerCase())
        .maybeSingle();

      if (data) {
        setAllowed(true);
        fetchExams();
      } else {
        setAllowed(false);
        setLoading(false);
      }
    };

    const fetchExams = async () => {
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

    checkAccess();
  }, [user, isAdmin]);

  if (loading) {
    return (
      <div className="flex items-center justify-center py-20">
        <Loader2 className="w-6 h-6 animate-spin text-primary" />
      </div>
    );
  }

  if (!allowed) {
    return (
      <div className="flex flex-col items-center justify-center py-20 text-center space-y-4">
        <ShieldAlert className="w-16 h-16 text-destructive opacity-60" />
        <h2 className="text-xl font-display font-bold text-foreground">Acesso Restrito</h2>
        <p className="text-muted-foreground max-w-md">
          Seu email não está autorizado a acessar as provas. Entre em contato com o administrador para solicitar acesso.
        </p>
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
