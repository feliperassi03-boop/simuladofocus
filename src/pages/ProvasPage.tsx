import { useState, useEffect, useMemo } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Accordion, AccordionItem, AccordionTrigger, AccordionContent } from "@/components/ui/accordion";
import { Play, FileText, Loader2, FolderOpen } from "lucide-react";

interface ExamItem {
  id: string;
  title: string;
  question_count: number;
}

// Deriva a categoria a partir do título da prova.
// Regra: pega o primeiro "token" do título (até espaço ou número).
// Ex.: "Cardio 1" -> "Cardio", "Cardio Hemodinâmica" -> "Cardio",
// "Pneumo 2" -> "Pneumo", "Neuro AVC" -> "Neuro".
function getCategory(title: string): string {
  const trimmed = title.trim();
  if (!trimmed) return "Outros";
  // Pega o primeiro grupo alfabético
  const match = trimmed.match(/^[A-Za-zÀ-ÿ]+/);
  return match ? match[0] : trimmed.split(/\s+/)[0];
}

export default function ProvasPage() {
  const navigate = useNavigate();
  const { user, loading: authLoading } = useAuth();
  const [exams, setExams] = useState<ExamItem[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!authLoading && !user) navigate("/auth");
  }, [user, authLoading, navigate]);

  useEffect(() => {
    if (!user) return;
    const fetchExams = async () => {
      setLoading(true);
      const { data: examsData } = await supabase
        .from("exams")
        .select("id, title")
        .eq("is_active", true);

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
  }, [user]);

  const grouped = useMemo(() => {
    const map = new Map<string, ExamItem[]>();
    for (const exam of exams) {
      const cat = getCategory(exam.title);
      if (!map.has(cat)) map.set(cat, []);
      map.get(cat)!.push(exam);
    }
    const collator = new Intl.Collator("pt-BR", { sensitivity: "base", numeric: true });
    const categories = Array.from(map.entries())
      .map(([cat, items]) => ({
        category: cat,
        items: items.slice().sort((a, b) => collator.compare(a.title, b.title)),
      }))
      .sort((a, b) => collator.compare(a.category, b.category));
    return categories;
  }, [exams]);

  if (authLoading || loading) {
    return (
      <div className="flex items-center justify-center py-20">
        <Loader2 className="w-6 h-6 animate-spin text-primary" />
      </div>
    );
  }

  if (!user) return null;

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-display font-bold text-foreground">Provas Disponíveis</h1>
        <p className="text-muted-foreground mt-1">Escolha uma categoria e selecione a prova</p>
      </div>

      {grouped.length === 0 ? (
        <Card className="shadow-card">
          <CardContent className="py-12 text-center text-muted-foreground">
            <FileText className="w-12 h-12 mx-auto mb-4 opacity-40" />
            <p>Nenhuma prova disponível no momento.</p>
          </CardContent>
        </Card>
      ) : (
        <Card className="shadow-card">
          <CardContent className="p-2 sm:p-4">
            <Accordion type="multiple" className="w-full">
              {grouped.map(({ category, items }) => (
                <AccordionItem key={category} value={category}>
                  <AccordionTrigger className="px-2 hover:no-underline">
                    <div className="flex items-center gap-3 text-left">
                      <FolderOpen className="w-5 h-5 text-primary shrink-0" />
                      <span className="font-display font-semibold text-base sm:text-lg break-words">
                        {category}
                      </span>
                      <span className="text-xs text-muted-foreground font-normal">
                        ({items.length} {items.length === 1 ? "prova" : "provas"})
                      </span>
                    </div>
                  </AccordionTrigger>
                  <AccordionContent>
                    <div className="grid gap-2 sm:gap-3 px-2">
                      {items.map((exam) => (
                        <div
                          key={exam.id}
                          className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2 p-3 rounded-lg border bg-card hover:bg-accent/30 transition-colors"
                        >
                          <div className="min-w-0">
                            <p className="font-medium break-words">{exam.title}</p>
                            <p className="text-xs text-muted-foreground">
                              {exam.question_count}{" "}
                              {exam.question_count === 1 ? "questão" : "questões"}
                            </p>
                          </div>
                          <Button
                            size="sm"
                            className="gradient-primary text-primary-foreground shrink-0"
                            onClick={() => navigate(`/prova/${exam.id}`)}
                          >
                            <Play className="w-4 h-4 mr-2" /> Iniciar
                          </Button>
                        </div>
                      ))}
                    </div>
                  </AccordionContent>
                </AccordionItem>
              ))}
            </Accordion>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
