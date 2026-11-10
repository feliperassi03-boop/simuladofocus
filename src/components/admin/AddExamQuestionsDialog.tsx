import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { Input } from "@/components/ui/input";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Loader2, Plus, Search } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { matchesQuestionSearch, planQuestionAdditions } from "@/lib/exam-question-additions";
import type { SecondPhaseType } from "@/lib/second-phase";

type Exam = { id: string; title: string };
type Question = { id: string; text: string; searchText: string };
type Link = { questionId: string; order: number };

export function AddExamQuestionsDialog({ exam, examType = "standard", onClose, onAdded }: {
  exam: Exam | null;
  examType?: "standard" | SecondPhaseType;
  onClose: () => void;
  onAdded: () => void;
}) {
  const { toast } = useToast();
  const [questions, setQuestions] = useState<Question[]>([]);
  const [existing, setExisting] = useState<Link[]>([]);
  const [selected, setSelected] = useState<string[]>([]);
  const [search, setSearch] = useState("");
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");
  const secondPhase = examType !== "standard";

  const readLinks = async (examId: string): Promise<Link[]> => {
    const links: Link[] = [];
    for (let from = 0; ; from += 1000) {
      if (secondPhase) {
        const { data, error } = await supabase.from("tea_exam_questions")
          .select("tea_question_id, question_order").eq("exam_id", examId).order("question_order").range(from, from + 999);
        if (error) throw error;
        links.push(...(data ?? []).map((row) => ({ questionId: row.tea_question_id, order: row.question_order })));
        if (!data || data.length < 1000) break;
      } else {
        const { data, error } = await supabase.from("exam_questions")
          .select("question_id, sort_order").eq("exam_id", examId).order("sort_order").range(from, from + 999);
        if (error) throw error;
        links.push(...(data ?? []).map((row) => ({ questionId: row.question_id, order: row.sort_order })));
        if (!data || data.length < 1000) break;
      }
    }
    return links;
  };

  useEffect(() => {
    if (!exam) return;
    let cancelled = false;
    setSelected([]);
    setSearch("");
    setQuestions([]);
    setExisting([]);
    setError("");
    setLoading(true);
    const load = async () => {
      try {
        const bank: Question[] = [];
        for (let from = 0; ; from += 1000) {
          if (secondPhase) {
            const { data, error } = await supabase.from("tea_questions")
              .select("id, question_text, sub1_text, sub2_text, sub3_text").eq("exam_type", examType)
              .order("created_at", { ascending: false }).order("id").range(from, from + 999);
            if (error) throw error;
            bank.push(...(data ?? []).map((q) => ({ id: q.id, text: q.question_text, searchText: [q.question_text, q.sub1_text, q.sub2_text, q.sub3_text].join(" ") })));
            if (!data || data.length < 1000) break;
          } else {
            const { data, error } = await supabase.from("questions")
              .select("id, question_text, option_a, option_b, option_c, option_d")
              .order("created_at", { ascending: false }).order("id").range(from, from + 999);
            if (error) throw error;
            bank.push(...(data ?? []).map((q) => ({ id: q.id, text: q.question_text, searchText: [q.question_text, q.option_a, q.option_b, q.option_c, q.option_d].join(" ") })));
            if (!data || data.length < 1000) break;
          }
        }
        const links = await readLinks(exam.id);
        if (!cancelled) { setQuestions(bank); setExisting(links); }
      } catch {
        if (!cancelled) setError("Não foi possível carregar as questões. Feche e tente novamente.");
      } finally {
        if (!cancelled) setLoading(false);
      }
    };
    void load();
    return () => { cancelled = true; };
  }, [exam?.id, examType]);

  const existingIds = new Set(existing.map((row) => row.questionId));
  const available = questions.filter((q) => !existingIds.has(q.id));
  const filtered = available.filter((q) => matchesQuestionSearch(q.searchText, search));
  const allSelected = filtered.length > 0 && filtered.every((q) => selected.includes(q.id));
  const save = async () => {
    if (!exam || saving || !selected.length) return;
    setSaving(true);
    try {
      const current = await readLinks(exam.id);
      const allowedIds = new Set(available.map((q) => q.id));
      const additions = planQuestionAdditions(current, selected.filter((id) => allowedIds.has(id)));
      if (additions.length) {
        const result = secondPhase
          ? await supabase.from("tea_exam_questions").insert(additions.map((row) => ({ exam_id: exam.id, tea_question_id: row.questionId, question_order: row.order })))
          : await supabase.from("exam_questions").insert(additions.map((row) => ({ exam_id: exam.id, question_id: row.questionId, sort_order: row.order })));
        if (result.error) throw result.error;
      }
      toast({ title: additions.length ? `${additions.length} questão(ões) adicionada(s)!` : "As questões selecionadas já estão na prova." });
      onAdded();
      onClose();
    } catch {
      toast({ title: "Não foi possível adicionar as questões", description: "Tente novamente. As questões anteriores foram preservadas.", variant: "destructive" });
    } finally { setSaving(false); }
  };

  return (
    <Dialog open={!!exam} onOpenChange={(open) => { if (!open && !saving) onClose(); }}>
      <DialogContent className="max-w-3xl max-h-[90vh] flex flex-col overflow-hidden">
        <DialogHeader><DialogTitle className="break-words pr-6">Adicionar questões — {exam?.title}</DialogTitle></DialogHeader>
        {loading ? <div className="flex justify-center py-10"><Loader2 className="w-6 h-6 animate-spin text-primary" /></div> : error ? <p className="text-sm text-destructive">{error}</p> : <>
          <div className="relative shrink-0"><Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" /><Input aria-label="Buscar questões para adicionar" placeholder="Buscar por palavras do enunciado ou perguntas..." value={search} onChange={(e) => setSearch(e.target.value)} className="pl-9" disabled={saving} /></div>
          <div className="flex flex-wrap items-center justify-between gap-2 shrink-0">
            <span className="text-sm text-muted-foreground">{filtered.length} disponíveis · {selected.length} selecionadas</span>
            <div className="flex flex-wrap gap-2">
              <Button size="sm" variant="outline" disabled={!filtered.length || saving} onClick={() => setSelected((prev) => allSelected ? prev.filter((id) => !filtered.some((q) => q.id === id)) : [...new Set([...prev, ...filtered.map((q) => q.id)])])}>{allSelected ? "Desmarcar resultados" : "Selecionar resultados"}</Button>
              <Button size="sm" variant="ghost" disabled={!selected.length || saving} onClick={() => setSelected([])}>Limpar seleção</Button>
            </div>
          </div>
          <div className="min-h-0 overflow-y-auto border border-border rounded-md">
            {filtered.map((q) => <label key={q.id} className="flex items-start gap-3 p-3 border-b border-border last:border-b-0 hover:bg-muted/50 cursor-pointer">
              <Checkbox className="mt-1 shrink-0" disabled={saving} checked={selected.includes(q.id)} onCheckedChange={(checked) => setSelected((prev) => checked ? [...new Set([...prev, q.id])] : prev.filter((id) => id !== q.id))} />
              <span className="text-sm min-w-0 break-words whitespace-normal">{q.text}</span>
            </label>)}
            {!filtered.length && <p className="p-6 text-center text-sm text-muted-foreground">{available.length ? "Nenhuma questão encontrada." : "Todas as questões disponíveis já estão nesta prova."}</p>}
          </div>
          <div className="flex flex-wrap justify-end gap-2 shrink-0">
            <Button variant="outline" onClick={onClose} disabled={saving}>Cancelar</Button>
            <Button onClick={save} disabled={!selected.length || saving} className="gradient-primary text-primary-foreground">{saving ? <Loader2 className="mr-2 w-4 h-4 animate-spin" /> : <Plus className="mr-2 w-4 h-4" />}Adicionar {selected.length} questão(ões)</Button>
          </div>
        </>}
      </DialogContent>
    </Dialog>
  );
}