import { useState, useEffect, useMemo } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Accordion, AccordionItem, AccordionTrigger, AccordionContent } from "@/components/ui/accordion";
import { Play, FileText, Loader2, FolderOpen, Bell, Trophy } from "lucide-react";
import { Link } from "react-router-dom";
import { Badge } from "@/components/ui/badge";
import { useToast } from "@/hooks/use-toast";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import provasBg from "@/assets/provas-bg.jpeg";
import laryngoscopeIcon from "@/assets/laryngoscope-icon.jpeg.asset.json";

interface ExamItem {
  id: string;
  title: string;
  question_count: number;
  exam_type: string;
}

// Deriva a categoria a partir do título da prova.
// Regra: pega o primeiro "token" do título (até espaço ou número).
// Ex.: "Cardio 1" -> "Cardio", "Cardio Hemodinâmica" -> "Cardio",
// "Pneumo 2" -> "Pneumo", "Neuro AVC" -> "Neuro".
function getCategory(title: string): string {
  const trimmed = title.trim();
  if (!trimmed) return "Outros";
  // Remove números/romanos finais (ex.: "SISTEMA NERVOSO AUTÔNOMO 1" -> "SISTEMA NERVOSO AUTÔNOMO")
  const withoutTrailingNum = trimmed
    .replace(/\s+([0-9]+|[IVXLCDM]+)\s*$/i, "")
    .trim();
  return withoutTrailingNum || trimmed;
}

export default function ProvasPage() {
  const navigate = useNavigate();
  const { toast } = useToast();
  const { user, loading: authLoading } = useAuth();
  const [exams, setExams] = useState<ExamItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [unreadDoubts, setUnreadDoubts] = useState(0);
  const [viewMode, setViewMode] = useState<"standard" | "tea">("standard");
  const [rankingOpen, setRankingOpen] = useState(false);
  const [rankingLoading, setRankingLoading] = useState(false);
  const [rankingScores, setRankingScores] = useState<{ score: number; total: number }[]>([]);

  const openRanking = async () => {
    setRankingOpen(true);
    if (rankingScores.length > 0) return;
    setRankingLoading(true);
    try {
      const { data, error } = await supabase.rpc("get_bud5_ranking");
      if (error) throw error;
      const scores = (data || [])
        .map((a: any) => ({ score: Number(a.score) || 0, total: Number(a.total_questions) || 0 }))
        .filter((a) => a.total > 0)
        .sort((a, b) => b.score - a.score || b.total - a.total);
      setRankingScores(scores);
    } catch (e) {
      console.error("Erro ao buscar ranking BUD5:", e);
      setRankingScores([]);
    } finally {
      setRankingLoading(false);
    }
  };

  useEffect(() => {
    if (!user) return;
    const loadUnread = async () => {
      const email = user.email?.toLowerCase();
      const orFilter = email
        ? `user_id.eq.${user.id},student_email.ilike.${email}`
        : `user_id.eq.${user.id}`;
      const { count } = await supabase
        .from("question_doubts")
        .select("id", { count: "exact", head: true })
        .or(orFilter)
        .eq("read_by_student", false)
        .not("admin_response", "is", null);
      setUnreadDoubts(count || 0);
    };
    loadUnread();
    const channel = supabase
      .channel("provas-doubts-bell")
      .on("postgres_changes", { event: "*", schema: "public", table: "question_doubts" }, loadUnread)
      .subscribe();
    return () => {
      supabase.removeChannel(channel);
    };
  }, [user?.id]);

  useEffect(() => {
    if (!authLoading && !user) navigate("/auth");
  }, [user, authLoading, navigate]);

  useEffect(() => {
    if (!user) return;
    const fetchExams = async () => {
      setLoading(true);
      const { data: examsData } = await supabase
        .from("exams")
        .select("id, title, exam_type")
        .eq("is_active", true);

      if (!examsData) {
        setLoading(false);
        return;
      }

      const standardIds = examsData.filter((e) => e.exam_type !== "tea").map((e) => e.id);
      const teaIds = examsData.filter((e) => e.exam_type === "tea").map((e) => e.id);
      const counts: Record<string, number> = {};

      const pageSize = 1000;
      if (standardIds.length) {
        let from = 0;
        while (true) {
          const { data: eqData, error } = await supabase
            .from("exam_questions")
            .select("exam_id")
            .in("exam_id", standardIds)
            .range(from, from + pageSize - 1);
          if (error || !eqData || eqData.length === 0) break;
          eqData.forEach((eq) => { counts[eq.exam_id] = (counts[eq.exam_id] || 0) + 1; });
          if (eqData.length < pageSize) break;
          from += pageSize;
        }
      }
      if (teaIds.length) {
        const { data: teq } = await supabase.from("tea_exam_questions").select("exam_id").in("exam_id", teaIds);
        teq?.forEach((r) => { counts[r.exam_id] = (counts[r.exam_id] || 0) + 1; });
      }

      setExams(
        examsData.map((e) => ({
          id: e.id,
          title: e.title,
          exam_type: e.exam_type ?? "standard",
          question_count: counts[e.id] || 0,
        }))
      );
      setLoading(false);
    };
    fetchExams();
  }, [user]);

  const grouped = useMemo(() => {
    const filtered = exams.filter((e) =>
      viewMode === "tea" ? e.exam_type === "tea" : e.exam_type !== "tea"
    );
    const map = new Map<string, ExamItem[]>();
    for (const exam of filtered) {
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
  }, [exams, viewMode]);

  if (authLoading || loading) {
    return (
      <div className="flex items-center justify-center py-20">
        <Loader2 className="w-6 h-6 animate-spin text-primary" />
      </div>
    );
  }

  if (!user) return null;

  return (
    <div
      className="space-y-6 -mx-4 -my-8 px-4 py-8 min-h-[calc(100vh-4rem)] bg-cover bg-center bg-no-repeat bg-fixed"
      style={{ backgroundImage: `linear-gradient(to bottom, hsl(var(--background)/0.85), hsl(var(--background)/0.92)), url(${provasBg})` }}
    >
      <div className="flex items-start justify-between gap-3">
        <div>
          <h1 className="text-2xl font-display font-bold text-foreground">Provas Disponíveis</h1>
          <p className="text-muted-foreground mt-1">Escolha uma categoria e selecione a prova</p>
          <div className="mt-3 inline-flex rounded-lg border border-border bg-card p-1 shadow-card">
            <button
              type="button"
              onClick={() => setViewMode("standard")}
              className={`px-3 py-1.5 text-sm rounded-md transition-colors ${
                viewMode === "standard"
                  ? "gradient-primary text-primary-foreground shadow"
                  : "text-foreground hover:bg-accent/40"
              }`}
            >
              TSA 1 FASE
            </button>
            <button
              type="button"
              onClick={() => setViewMode("tea")}
              className={`px-3 py-1.5 text-sm rounded-md transition-colors ${
                viewMode === "tea"
                  ? "gradient-primary text-primary-foreground shadow"
                  : "text-foreground hover:bg-accent/40"
              }`}
            >
              TEA 2 Fase
            </button>
          </div>
        </div>
        <div className="flex items-center gap-2 shrink-0">
          <Link
            to="/duvidas"
            aria-label="Respostas às suas dúvidas"
            title={unreadDoubts > 0 ? `${unreadDoubts} resposta(s) nova(s)` : "Sem novas respostas"}
            className="relative inline-flex items-center justify-center w-11 h-11 rounded-full border border-border bg-card shadow-card hover:bg-accent/40 transition-colors"
          >
            <Bell className={`w-5 h-5 ${unreadDoubts > 0 ? "text-destructive animate-pulse" : "text-foreground"}`} />
            {unreadDoubts > 0 && (
              <Badge className="absolute -top-1 -right-1 h-5 min-w-5 px-1 bg-destructive text-destructive-foreground text-[10px] font-bold flex items-center justify-center rounded-full">
                {unreadDoubts}
              </Badge>
            )}
          </Link>
          <button
            type="button"
            aria-label="Ranking BUD5"
            title="Ranking BUD5"
            className="relative inline-flex items-center justify-center w-11 h-11 rounded-full border border-border bg-card shadow-card hover:bg-accent/40 transition-colors"
            onClick={openRanking}
          >
            <img src={laryngoscopeIcon.url} alt="Laringoscópio" className="w-6 h-6 object-contain" />
          </button>
        </div>
      </div>

      <Dialog open={rankingOpen} onOpenChange={setRankingOpen}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Trophy className="w-5 h-5 text-primary" />
              Ranking Simulado BUD5
            </DialogTitle>
            <DialogDescription>
              Notas de todos os participantes (anônimo), da maior para a menor.
            </DialogDescription>
          </DialogHeader>
          {rankingLoading ? (
            <div className="py-8 flex items-center justify-center text-muted-foreground">
              <Loader2 className="w-5 h-5 animate-spin mr-2" /> Carregando...
            </div>
          ) : rankingScores.length === 0 ? (
            <p className="py-6 text-center text-muted-foreground text-sm">
              Nenhuma nota disponível ainda.
            </p>
          ) : (
            <div className="max-h-[60vh] overflow-y-auto divide-y divide-border rounded-md border border-border">
              {rankingScores.map((s, i) => (
                <div key={i} className="flex items-center justify-between px-4 py-2 text-sm">
                  <span className="font-medium text-muted-foreground w-8">{i + 1}º</span>
                  <span className="font-display font-semibold text-foreground">
                    {s.score}/{s.total}
                  </span>
                  <span className="text-xs text-muted-foreground w-14 text-right">
                    {Math.round((s.score / s.total) * 100)}%
                  </span>
                </div>
              ))}
            </div>
          )}
        </DialogContent>
      </Dialog>


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
                            <div className="flex items-center gap-2 flex-wrap">
                              <p className="font-medium break-words">{exam.title}</p>
                              {exam.exam_type === "tea" && (
                                <Badge variant="secondary" className="text-[10px] uppercase">TEA 2 Fase</Badge>
                              )}
                            </div>
                            <p className="text-xs text-muted-foreground">
                              {exam.question_count}{" "}
                              {exam.question_count === 1 ? "questão" : "questões"}
                            </p>
                          </div>
                          <Button
                            size="sm"
                            className="gradient-primary text-primary-foreground shrink-0"
                            onClick={() => navigate(exam.exam_type === "tea" ? `/prova-tea/${exam.id}` : `/prova/${exam.id}`)}
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
