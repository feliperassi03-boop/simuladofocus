import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Checkbox } from "@/components/ui/checkbox";
import { Textarea } from "@/components/ui/textarea";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { useToast } from "@/hooks/use-toast";
import { normalizeQuestionText } from "@/lib/utils";
import { Plus, Copy, Trash2, Link2, Eye, EyeOff, Play, Pencil, ListChecks, Wrench, X, Save, Search } from "lucide-react";

interface Question {
  id: string;
  question_text: string;
  option_a: string;
  option_b: string;
  option_c: string;
  option_d: string;
}

interface FullQuestion {
  id: string;
  question_text: string;
  option_a: string;
  option_b: string;
  option_c: string;
  option_d: string;
  correct_option: string;
  comment: string | null;
  sort_order?: number;
}

interface Exam {
  id: string;
  title: string;
  password: string;
  is_active: boolean;
  created_at: string;
  question_count?: number;
}

const getErrorMessage = (error: unknown) =>
  error instanceof Error ? error.message : "Ocorreu um erro inesperado.";

const optionFields = ["option_a", "option_b", "option_c", "option_d"] as const;

export default function ExamsTab() {
  const { user } = useAuth();
  const { toast } = useToast();
  const navigate = useNavigate();
  const [exams, setExams] = useState<Exam[]>([]);
  const [questions, setQuestions] = useState<Question[]>([]);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [title, setTitle] = useState("");
  const [password, setPassword] = useState("");
  const [selectedQuestions, setSelectedQuestions] = useState<string[]>([]);
  const [createSearch, setCreateSearch] = useState("");
  const [loading, setLoading] = useState(false);
  const [showPasswords, setShowPasswords] = useState<Record<string, boolean>>({});
  const [editingExam, setEditingExam] = useState<Exam | null>(null);
  const [editTitle, setEditTitle] = useState("");
  const [editingQuestionsExam, setEditingQuestionsExam] = useState<Exam | null>(null);
  const [editSelectedQuestions, setEditSelectedQuestions] = useState<string[]>([]);
  const [editQuestionsLoading, setEditQuestionsLoading] = useState(false);
  const [editQuestionsSearch, setEditQuestionsSearch] = useState("");
  const [managingExam, setManagingExam] = useState<Exam | null>(null);
  const [examQuestions, setExamQuestions] = useState<FullQuestion[]>([]);
  const [manageLoading, setManageLoading] = useState(false);
  const [savingQuestionId, setSavingQuestionId] = useState<string | null>(null);
  const [manageSearch, setManageSearch] = useState("");

  const openManageExam = async (exam: Exam) => {
    setManagingExam(exam);
    setManageSearch("");
    setManageLoading(true);
    try {
      const { data: eqData, error: eqError } = await supabase
        .from("exam_questions")
        .select("question_id, sort_order")
        .eq("exam_id", exam.id)
        .order("sort_order");
      if (eqError) throw eqError;
      const ids = (eqData ?? []).map((e) => e.question_id);
      if (ids.length === 0) {
        setExamQuestions([]);
        return;
      }
      const { data: qData, error: qError } = await supabase
        .from("questions")
        .select("id, question_text, option_a, option_b, option_c, option_d, correct_option, comment")
        .in("id", ids);
      if (qError) throw qError;
      const map = new Map((qData ?? []).map((q) => [q.id, q]));
      const ordered: FullQuestion[] = (eqData ?? [])
        .map((e) => {
          const q = map.get(e.question_id);
          return q ? { ...q, sort_order: e.sort_order } : null;
        })
        .filter(Boolean) as FullQuestion[];
      setExamQuestions(ordered.map((q) => ({
        ...q,
        question_text: normalizeQuestionText(q.question_text),
        option_a: normalizeQuestionText(q.option_a),
        option_b: normalizeQuestionText(q.option_b),
        option_c: normalizeQuestionText(q.option_c),
        option_d: normalizeQuestionText(q.option_d),
        comment: normalizeQuestionText(q.comment) || null,
      })));
    } catch (error: unknown) {
      toast({ title: "Erro ao carregar", description: getErrorMessage(error), variant: "destructive" });
    } finally {
      setManageLoading(false);
    }
  };

  const updateExamQuestionField = (id: string, field: keyof FullQuestion, value: string) => {
    setExamQuestions((prev) => prev.map((q) => (q.id === id ? { ...q, [field]: value } : q)));
  };

  const saveQuestion = async (q: FullQuestion) => {
    setSavingQuestionId(q.id);
    const { error } = await supabase
      .from("questions")
      .update({
        question_text: normalizeQuestionText(q.question_text),
        option_a: normalizeQuestionText(q.option_a),
        option_b: normalizeQuestionText(q.option_b),
        option_c: normalizeQuestionText(q.option_c),
        option_d: normalizeQuestionText(q.option_d),
        correct_option: q.correct_option,
        comment: normalizeQuestionText(q.comment) || null,
      })
      .eq("id", q.id);
    setSavingQuestionId(null);
    if (error) {
      toast({ title: "Erro ao salvar", description: error.message, variant: "destructive" });
    } else {
      toast({ title: "Questão atualizada!" });
    }
  };

  const removeQuestionFromExam = async (questionId: string) => {
    if (!managingExam) return;
    if (!confirm("Remover esta questão da prova? (a questão continuará no banco)")) return;
    const { error } = await supabase
      .from("exam_questions")
      .delete()
      .eq("exam_id", managingExam.id)
      .eq("question_id", questionId);
    if (error) {
      toast({ title: "Erro", description: error.message, variant: "destructive" });
    } else {
      setExamQuestions((prev) => prev.filter((q) => q.id !== questionId));
      toast({ title: "Questão removida da prova" });
      fetchExams();
    }
  };

  const addNewQuestionToExam = async () => {
    if (!managingExam) return;
    setManageLoading(true);
    try {
      const { data: newQ, error: qError } = await supabase
        .from("questions")
        .insert({
          question_text: "Nova questão",
          option_a: "",
          option_b: "",
          option_c: "",
          option_d: "",
          correct_option: "A",
          created_by: user!.id,
        })
        .select()
        .single();
      if (qError) throw qError;

      const nextOrder = examQuestions.length;
      const { error: eqError } = await supabase
        .from("exam_questions")
        .insert({ exam_id: managingExam.id, question_id: newQ.id, sort_order: nextOrder });
      if (eqError) throw eqError;

      setExamQuestions((prev) => [...prev, { ...newQ, sort_order: nextOrder }]);
      fetchQuestions();
      fetchExams();
      toast({ title: "Nova questão adicionada — edite abaixo" });
    } catch (error: unknown) {
      toast({ title: "Erro", description: getErrorMessage(error), variant: "destructive" });
    } finally {
      setManageLoading(false);
    }
  };

  const handleRename = async () => {
    if (!editingExam || !editTitle.trim()) return;
    const { error } = await supabase.from("exams").update({ title: editTitle.trim() }).eq("id", editingExam.id);
    if (error) {
      toast({ title: "Erro ao renomear", description: error.message, variant: "destructive" });
    } else {
      toast({ title: "Prova renomeada!" });
      setEditingExam(null);
      fetchExams();
    }
  };

  const openEditQuestions = async (exam: Exam) => {
    setEditingQuestionsExam(exam);
    setEditQuestionsSearch("");
    const { data } = await supabase
      .from("exam_questions")
      .select("question_id")
      .eq("exam_id", exam.id)
      .order("sort_order");
    setEditSelectedQuestions(data?.map((eq) => eq.question_id) ?? []);
  };

  const toggleEditQuestion = (id: string) => {
    setEditSelectedQuestions((prev) =>
      prev.includes(id) ? prev.filter((q) => q !== id) : [...prev, id]
    );
  };

  const handleSaveExamQuestions = async () => {
    if (!editingQuestionsExam) return;
    if (editSelectedQuestions.length === 0) {
      toast({ title: "Selecione ao menos uma pergunta.", variant: "destructive" });
      return;
    }
    setEditQuestionsLoading(true);
    try {
      const { error: delError } = await supabase
        .from("exam_questions")
        .delete()
        .eq("exam_id", editingQuestionsExam.id);
      if (delError) throw delError;

      const rows = editSelectedQuestions.map((qId, i) => ({
        exam_id: editingQuestionsExam.id,
        question_id: qId,
        sort_order: i,
      }));
      const { error: insError } = await supabase.from("exam_questions").insert(rows);
      if (insError) throw insError;

      toast({ title: "Questões da prova atualizadas!" });
      setEditingQuestionsExam(null);
      setEditSelectedQuestions([]);
      fetchExams();
    } catch (error: unknown) {
      toast({ title: "Erro ao salvar", description: getErrorMessage(error), variant: "destructive" });
    } finally {
      setEditQuestionsLoading(false);
    }
  };

  const fetchExams = async () => {
    const { data } = await supabase
      .from("exams")
      .select("*")
      .order("created_at", { ascending: false });
    if (!data) return;

    // Ordena alfabeticamente por título (pt-BR)
    const sorted = data.slice().sort((a, b) =>
      new Intl.Collator("pt-BR", { sensitivity: "base", numeric: true }).compare(a.title, b.title)
    );

    // Get question counts
    const examIds = sorted.map((e) => e.id);
    const { data: eqData } = await supabase
      .from("exam_questions")
      .select("exam_id")
      .in("exam_id", examIds);

    const counts: Record<string, number> = {};
    eqData?.forEach((eq) => {
      counts[eq.exam_id] = (counts[eq.exam_id] || 0) + 1;
    });

    setExams(sorted.map((e) => ({ ...e, question_count: counts[e.id] || 0 })));
  };

  const fetchQuestions = async () => {
    const pageSize = 1000;
    const allQuestions: Question[] = [];

    for (let from = 0; ; from += pageSize) {
      const { data, error } = await supabase
        .from("questions")
        .select("id, question_text, option_a, option_b, option_c, option_d")
        .order("created_at", { ascending: false })
        .range(from, from + pageSize - 1);

      if (error) {
        toast({ title: "Erro ao carregar perguntas", description: error.message, variant: "destructive" });
        return;
      }

      allQuestions.push(...(data ?? []));
      if (!data || data.length < pageSize) break;
    }

    setQuestions(allQuestions);
  };

  useEffect(() => {
    fetchExams();
    fetchQuestions();
  }, []);

  const handleCreate = async () => {
    if (!title.trim() || !password.trim() || selectedQuestions.length === 0) {
      toast({ title: "Preencha todos os campos e selecione ao menos uma pergunta.", variant: "destructive" });
      return;
    }
    setLoading(true);
    try {
      const { data: exam, error } = await supabase
        .from("exams")
        .insert({ title, password, created_by: user!.id })
        .select()
        .single();
      if (error) throw error;

      const examQuestions = selectedQuestions.map((qId, i) => ({
        exam_id: exam.id,
        question_id: qId,
        sort_order: i,
      }));
      const { error: eqError } = await supabase.from("exam_questions").insert(examQuestions);
      if (eqError) throw eqError;

      toast({ title: "Prova criada com sucesso!" });
      setDialogOpen(false);
      setTitle("");
      setPassword("");
      setSelectedQuestions([]);
      setCreateSearch("");
      fetchExams();
    } catch (error: unknown) {
      toast({ title: "Erro", description: getErrorMessage(error), variant: "destructive" });
    } finally {
      setLoading(false);
    }
  };

  const handleDelete = async (id: string) => {
    const { error } = await supabase.from("exams").delete().eq("id", id);
    if (error) {
      toast({ title: "Erro ao excluir", description: error.message, variant: "destructive" });
    } else {
      toast({ title: "Prova excluída!" });
      fetchExams();
    }
  };

  const copyLink = (examId: string) => {
    const url = `https://simuladofocus.lovable.app/#/prova/${examId}`;
    navigator.clipboard.writeText(url);
    toast({ title: "Link copiado!" });
  };

  const toggleQuestion = (id: string) => {
    setSelectedQuestions((prev) =>
      prev.includes(id) ? prev.filter((q) => q !== id) : [...prev, id]
    );
  };

  return (
    <div className="space-y-4">
      <div className="flex justify-end gap-2">
        <Button onClick={() => setDialogOpen(true)} className="gradient-primary text-primary-foreground">
          <Plus className="w-4 h-4 mr-2" /> Nova Prova
        </Button>
      </div>

      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent className="max-w-2xl max-h-[80vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="font-display">Criar Prova</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <div>
              <Label>Título da Prova</Label>
              <Input value={title} onChange={(e) => setTitle(e.target.value)} placeholder="Ex: Prova de Matemática - Módulo 1" />
            </div>
            <div>
              <Label>Senha de Acesso</Label>
              <Input value={password} onChange={(e) => setPassword(e.target.value)} placeholder="Senha que os alunos usarão" />
            </div>
            <div>
              <Label>Selecione as Perguntas ({selectedQuestions.length} selecionadas)</Label>
              <div className="relative mt-2 mb-2">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                <Input
                  value={createSearch}
                  onChange={(e) => setCreateSearch(e.target.value)}
                  placeholder="Buscar no enunciado..."
                  className="pl-9"
                />
              </div>
              <div className="border rounded-lg max-h-64 overflow-y-auto">
                {(() => {
                  const term = normalizeQuestionText(createSearch).toLowerCase();
                  const matches = (q: Question) => {
                    if (!term) return true;
                    return [q.question_text, q.option_a, q.option_b, q.option_c, q.option_d]
                      .some((t) => normalizeQuestionText(t).toLowerCase().includes(term));
                  };
                  const filtered = questions.filter(matches);
                  return (
                    <>
                      {filtered.map((q) => (
                        <label
                          key={q.id}
                          className="flex items-start gap-3 p-3 hover:bg-muted/50 cursor-pointer border-b last:border-b-0"
                        >
                          <Checkbox
                            checked={selectedQuestions.includes(q.id)}
                            onCheckedChange={() => toggleQuestion(q.id)}
                            className="mt-0.5"
                          />
                          <span className="text-sm">{normalizeQuestionText(q.question_text)}</span>
                        </label>
                      ))}
                      {filtered.length === 0 && (
                        <p className="text-sm text-muted-foreground p-4 text-center">
                          {createSearch.trim() ? "Nenhuma pergunta encontrada para esta busca." : "Nenhuma pergunta cadastrada."}
                        </p>
                      )}
                    </>
                  );
                })()}
              </div>
            </div>
            <Button onClick={handleCreate} disabled={loading} className="w-full gradient-primary text-primary-foreground">
              {loading ? "Criando..." : "Criar Prova"}
            </Button>
          </div>
        </DialogContent>
      </Dialog>

      <Card className="shadow-card">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Prova</TableHead>
              <TableHead className="w-28">Questões</TableHead>
              <TableHead className="w-32">Senha</TableHead>
              <TableHead className="w-20">Status</TableHead>
              <TableHead className="w-32">Ações</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {exams.map((exam) => (
              <TableRow key={exam.id}>
                <TableCell className="font-medium">{exam.title}</TableCell>
                <TableCell>{exam.question_count}</TableCell>
                <TableCell>
                  <div className="flex items-center gap-1">
                    <span className="text-sm font-mono">
                      {showPasswords[exam.id] ? exam.password : "••••••"}
                    </span>
                    <Button
                      variant="ghost"
                      size="icon"
                      className="h-6 w-6"
                      onClick={() => setShowPasswords((p) => ({ ...p, [exam.id]: !p[exam.id] }))}
                    >
                      {showPasswords[exam.id] ? <EyeOff className="w-3 h-3" /> : <Eye className="w-3 h-3" />}
                    </Button>
                  </div>
                </TableCell>
                <TableCell>
                  <span className={`text-xs px-2 py-1 rounded-full font-medium ${exam.is_active ? "bg-success/10 text-success" : "bg-muted text-muted-foreground"}`}>
                    {exam.is_active ? "Ativa" : "Inativa"}
                  </span>
                </TableCell>
                <TableCell>
                  <div className="flex gap-1">
                    <Button variant="ghost" size="icon" onClick={() => navigate(`/prova/${exam.id}`)} title="Iniciar prova">
                      <Play className="w-4 h-4 text-primary" />
                    </Button>
                    <Button variant="ghost" size="icon" onClick={() => { setEditingExam(exam); setEditTitle(exam.title); }} title="Editar nome">
                      <Pencil className="w-4 h-4" />
                    </Button>
                    <Button variant="ghost" size="icon" onClick={() => openEditQuestions(exam)} title="Editar questões (do banco)">
                      <ListChecks className="w-4 h-4" />
                    </Button>
                    <Button variant="ghost" size="icon" onClick={() => openManageExam(exam)} title="Gerenciar conteúdo da prova">
                      <Wrench className="w-4 h-4 text-primary" />
                    </Button>
                    <Button variant="ghost" size="icon" onClick={() => copyLink(exam.id)} title="Copiar link">
                      <Copy className="w-4 h-4" />
                    </Button>
                    <Button variant="ghost" size="icon" onClick={() => handleDelete(exam.id)}>
                      <Trash2 className="w-4 h-4 text-destructive" />
                    </Button>
                  </div>
                </TableCell>
              </TableRow>
            ))}
            {exams.length === 0 && (
              <TableRow>
                <TableCell colSpan={5} className="text-center text-muted-foreground py-8">
                  Nenhuma prova criada. Clique em "Nova Prova" para começar.
                </TableCell>
              </TableRow>
            )}
          </TableBody>
        </Table>
      </Card>

      <Dialog open={!!editingExam} onOpenChange={(o) => !o && setEditingExam(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle className="font-display">Editar nome da prova</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <div>
              <Label>Título</Label>
              <Input value={editTitle} onChange={(e) => setEditTitle(e.target.value)} />
            </div>
            <div className="flex gap-2 justify-end">
              <Button variant="outline" onClick={() => setEditingExam(null)}>Cancelar</Button>
              <Button onClick={handleRename} className="gradient-primary text-primary-foreground">Salvar</Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>

      <Dialog open={!!editingQuestionsExam} onOpenChange={(o) => { if (!o) { setEditingQuestionsExam(null); setEditSelectedQuestions([]); } }}>
        <DialogContent className="max-w-2xl max-h-[80vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="font-display">
              Editar questões — {editingQuestionsExam?.title}
            </DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <div>
              <Label>Buscar</Label>
              <Input
                value={editQuestionsSearch}
                onChange={(e) => setEditQuestionsSearch(e.target.value)}
                placeholder="Filtrar perguntas..."
              />
            </div>
            <div>
              <Label>Perguntas ({editSelectedQuestions.length} selecionadas)</Label>
              <div className="mt-2 border rounded-lg max-h-[50vh] overflow-y-auto">
                {(() => {
                  const term = normalizeQuestionText(editQuestionsSearch).toLowerCase();
                  const matches = (q: Question) => {
                    if (!term) return true;
                    return [q.question_text, q.option_a, q.option_b, q.option_c, q.option_d]
                      .some((t) => normalizeQuestionText(t).toLowerCase().includes(term));
                  };
                  const filtered = questions.filter(matches);
                  return (
                    <>
                      {filtered.map((q) => (
                        <label
                          key={q.id}
                          className="flex items-start gap-3 p-3 hover:bg-muted/50 cursor-pointer border-b last:border-b-0"
                        >
                          <Checkbox
                            checked={editSelectedQuestions.includes(q.id)}
                            onCheckedChange={() => toggleEditQuestion(q.id)}
                            className="mt-0.5"
                          />
                          <span className="text-sm break-words">{normalizeQuestionText(q.question_text)}</span>
                        </label>
                      ))}
                      {filtered.length === 0 && (
                        <p className="text-sm text-muted-foreground p-4 text-center">
                          {editQuestionsSearch.trim() ? "Nenhuma pergunta encontrada para esta busca." : "Nenhuma pergunta cadastrada."}
                        </p>
                      )}
                    </>
                  );
                })()}
              </div>
            </div>
            <div className="flex gap-2 justify-end">
              <Button variant="outline" onClick={() => setEditingQuestionsExam(null)}>Cancelar</Button>
              <Button
                onClick={handleSaveExamQuestions}
                disabled={editQuestionsLoading}
                className="gradient-primary text-primary-foreground"
              >
                {editQuestionsLoading ? "Salvando..." : "Salvar alterações"}
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
      <Dialog open={!!managingExam} onOpenChange={(o) => { if (!o) { setManagingExam(null); setExamQuestions([]); } }}>
        <DialogContent className="max-w-3xl max-h-[85vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="font-display">
              Gerenciar conteúdo — {managingExam?.title}
            </DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <div className="flex justify-between items-center">
              <p className="text-sm text-muted-foreground">
                {examQuestions.length} questão(ões) nesta prova
              </p>
              <Button onClick={addNewQuestionToExam} disabled={manageLoading} size="sm" className="gradient-primary text-primary-foreground">
                <Plus className="w-4 h-4 mr-1" /> Nova questão
              </Button>
            </div>

            {manageLoading && examQuestions.length === 0 && (
              <p className="text-sm text-muted-foreground text-center py-6">Carregando...</p>
            )}

            <div className="space-y-4">
              {examQuestions.map((q, idx) => (
                <Card key={q.id} className="p-4 space-y-3">
                  <div className="flex items-center justify-between">
                    <span className="text-sm font-semibold text-primary">Questão {idx + 1}</span>
                    <div className="flex gap-1">
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={() => saveQuestion(q)}
                        disabled={savingQuestionId === q.id}
                      >
                        <Save className="w-3 h-3 mr-1" />
                        {savingQuestionId === q.id ? "Salvando..." : "Salvar"}
                      </Button>
                      <Button
                        size="sm"
                        variant="ghost"
                        onClick={() => removeQuestionFromExam(q.id)}
                        title="Remover da prova"
                      >
                        <X className="w-4 h-4 text-destructive" />
                      </Button>
                    </div>
                  </div>

                  <div>
                    <Label className="text-xs">Enunciado</Label>
                    <Textarea
                      value={normalizeQuestionText(q.question_text)}
                      onChange={(e) => updateExamQuestionField(q.id, "question_text", e.target.value)}
                      rows={3}
                    />
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-2 gap-2">
                    {optionFields.map((field, index) => {
                      const letter = (["A", "B", "C", "D"] as const)[index];
                      return (
                        <div key={letter}>
                          <Label className="text-xs">Alternativa {letter}</Label>
                          <Textarea
                            value={normalizeQuestionText(q[field])}
                            onChange={(e) => updateExamQuestionField(q.id, field, e.target.value)}
                            rows={2}
                          />
                        </div>
                      );
                    })}
                  </div>

                  <div>
                    <Label className="text-xs">Gabarito (resposta correta)</Label>
                    <RadioGroup
                      value={q.correct_option}
                      onValueChange={(v) => updateExamQuestionField(q.id, "correct_option", v)}
                      className="flex gap-4 mt-1"
                    >
                      {(["A", "B", "C", "D"] as const).map((letter) => (
                        <div key={letter} className="flex items-center gap-1">
                          <RadioGroupItem value={letter} id={`r-${q.id}-${letter}`} />
                          <Label htmlFor={`r-${q.id}-${letter}`} className="cursor-pointer">{letter}</Label>
                        </div>
                      ))}
                    </RadioGroup>
                  </div>

                  <div>
                    <Label className="text-xs">Comentário / Gabarito comentado</Label>
                    <Textarea
                      value={normalizeQuestionText(q.comment)}
                      onChange={(e) => updateExamQuestionField(q.id, "comment", e.target.value)}
                      rows={3}
                    />
                  </div>
                </Card>
              ))}

              {!manageLoading && examQuestions.length === 0 && (
                <p className="text-sm text-muted-foreground text-center py-6">
                  Nenhuma questão nesta prova. Clique em "Nova questão" para adicionar.
                </p>
              )}
            </div>

            <div className="flex justify-end pt-2">
              <Button variant="outline" onClick={() => setManagingExam(null)}>Fechar</Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
