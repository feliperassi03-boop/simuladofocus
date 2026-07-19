import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Checkbox } from "@/components/ui/checkbox";
import { useToast } from "@/hooks/use-toast";
import { Plus, Pencil, Trash2, X, Search, Copy, Play, Wrench, Save } from "lucide-react";

interface TeaQuestion {
  id: string;
  question_text: string;
  image_url: string | null;
  video_url: string | null;
  comment: string | null;
  comment_image_url: string | null;
  sub1_text: string;
  sub1_answer_key: string;
  sub1_image_url: string | null;
  sub2_text: string;
  sub2_answer_key: string;
  sub2_image_url: string | null;
  sub3_text: string;
  sub3_answer_key: string;
  sub3_image_url: string | null;
}

interface TeaExam {
  id: string;
  title: string;
  password: string;
  is_active: boolean;
  question_count?: number;
}

interface FullTeaQuestion extends TeaQuestion {
  sort_order?: number;
}

const emptyForm: Omit<TeaQuestion, "id"> = {
  question_text: "",
  image_url: "",
  video_url: "",
  comment: "",
  comment_image_url: "",
  sub1_text: "",
  sub1_answer_key: "",
  sub1_image_url: "",
  sub2_text: "",
  sub2_answer_key: "",
  sub2_image_url: "",
  sub3_text: "",
  sub3_answer_key: "",
  sub3_image_url: "",
};

async function uploadFile(file: File, bucket: "question-images" | "question-videos") {
  const ext = file.name.split(".").pop();
  const path = `${crypto.randomUUID()}.${ext}`;
  const { error } = await supabase.storage.from(bucket).upload(path, file);
  if (error) throw error;
  return supabase.storage.from(bucket).getPublicUrl(path).data.publicUrl;
}

export default function TeaTab() {
  const { user } = useAuth();
  const { toast } = useToast();
  const navigate = useNavigate();
  const [questions, setQuestions] = useState<TeaQuestion[]>([]);
  const [exams, setExams] = useState<TeaExam[]>([]);
  const [form, setForm] = useState<Omit<TeaQuestion, "id">>(emptyForm);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [qDialogOpen, setQDialogOpen] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [qSearch, setQSearch] = useState("");
  const [quickImport, setQuickImport] = useState("");
  const [parsedPreview, setParsedPreview] = useState<null | { enunciado: string; p1: string; g1: string; p2: string; g2: string; p3: string; g3: string; comentario: string }>(null);

  // Manage exam content state
  const [managingExam, setManagingExam] = useState<TeaExam | null>(null);
  const [examQuestions, setExamQuestions] = useState<FullTeaQuestion[]>([]);
  const [manageLoading, setManageLoading] = useState(false);
  const [savingQuestionId, setSavingQuestionId] = useState<string | null>(null);
  const [manageSearch, setManageSearch] = useState("");

  const handleQuickImport = () => {
    const raw = quickImport.replace(/\r\n/g, "\n").trim();
    if (!raw) return;

    const subRegex = /^\s*(?:pergunta\s*|p\s*)?([123])[\)\.\-:]\s*/i;
    const gabRegex = /^\s*(?:gabarito|resposta|r)\s*[123]?\s*[:\-\)]\s*/i;
    const comRegex = /^\s*(?:coment[áa]rio|comment)\s*[:\-]?\s*/i;

    const lines = raw.split("\n");
    const enunciadoLines: string[] = [];
    const subs: Record<1 | 2 | 3, string[]> = { 1: [], 2: [], 3: [] };
    const gabs: Record<1 | 2 | 3, string[]> = { 1: [], 2: [], 3: [] };
    let comentario = "";

    let mode: "enunciado" | "sub" | "gab" | "com" = "enunciado";
    let currentIdx: 1 | 2 | 3 = 1;

    for (const line of lines) {
      const subM = line.match(subRegex);
      const isGab = gabRegex.test(line);
      const isCom = comRegex.test(line);

      if (isCom) {
        mode = "com";
        comentario += (comentario ? "\n" : "") + line.replace(comRegex, "");
        continue;
      }
      if (subM) {
        currentIdx = parseInt(subM[1], 10) as 1 | 2 | 3;
        mode = "sub";
        subs[currentIdx].push(line.replace(subRegex, ""));
        continue;
      }
      if (isGab) {
        mode = "gab";
        gabs[currentIdx].push(line.replace(gabRegex, ""));
        continue;
      }
      if (mode === "enunciado") enunciadoLines.push(line);
      else if (mode === "sub") subs[currentIdx].push(line);
      else if (mode === "gab") gabs[currentIdx].push(line);
      else if (mode === "com") comentario += "\n" + line;
    }

    setParsedPreview({
      enunciado: enunciadoLines.join("\n").trim(),
      p1: subs[1].join("\n").trim(),
      g1: gabs[1].join("\n").trim(),
      p2: subs[2].join("\n").trim(),
      g2: gabs[2].join("\n").trim(),
      p3: subs[3].join("\n").trim(),
      g3: gabs[3].join("\n").trim(),
      comentario: comentario.trim(),
    });
  };

  const applyPreviewToForm = () => {
    if (!parsedPreview) return;
    setForm({
      ...form,
      question_text: parsedPreview.enunciado,
      sub1_text: parsedPreview.p1,
      sub1_answer_key: parsedPreview.g1,
      sub2_text: parsedPreview.p2,
      sub2_answer_key: parsedPreview.g2,
      sub3_text: parsedPreview.p3,
      sub3_answer_key: parsedPreview.g3,
      comment: parsedPreview.comentario || form.comment,
    });
    setParsedPreview(null);
    setQuickImport("");
    toast({ title: "Aplicado!", description: "Revise os campos e clique em Criar/Salvar." });
  };

  const [examDialogOpen, setExamDialogOpen] = useState(false);
  const [examTitle, setExamTitle] = useState("");
  const [examPassword, setExamPassword] = useState("");
  const [selectedQs, setSelectedQs] = useState<string[]>([]);
  const [examSearch, setExamSearch] = useState("");

  const fetchQuestions = async () => {
    const { data } = await supabase.from("tea_questions").select("*").order("created_at", { ascending: false });
    setQuestions((data ?? []) as TeaQuestion[]);
  };
  const fetchExams = async () => {
    const { data } = await supabase
      .from("exams")
      .select("*")
      .eq("exam_type", "tea")
      .order("created_at", { ascending: false });
    if (!data) return;
    const ids = data.map((e) => e.id);
    const counts: Record<string, number> = {};
    if (ids.length) {
      const { data: eq } = await supabase.from("tea_exam_questions").select("exam_id").in("exam_id", ids);
      eq?.forEach((r) => (counts[r.exam_id] = (counts[r.exam_id] || 0) + 1));
    }
    setExams(data.map((e) => ({ ...e, question_count: counts[e.id] || 0 })));
  };

  useEffect(() => {
    fetchQuestions();
    fetchExams();
  }, []);

  const openNewQ = () => {
    setForm(emptyForm);
    setEditingId(null);
    setQDialogOpen(true);
  };
  const openEditQ = (q: TeaQuestion) => {
    setForm({ ...q, image_url: q.image_url ?? "", video_url: q.video_url ?? "", comment: q.comment ?? "", comment_image_url: q.comment_image_url ?? "", sub1_image_url: q.sub1_image_url ?? "", sub2_image_url: q.sub2_image_url ?? "", sub3_image_url: q.sub3_image_url ?? "" });
    setEditingId(q.id);
    setQDialogOpen(true);
  };

  const saveQuestion = async () => {
    if (!form.question_text.trim() || !form.sub1_text.trim() || !form.sub2_text.trim() || !form.sub3_text.trim()) {
      toast({ title: "Preencha o enunciado e as 3 perguntas.", variant: "destructive" });
      return;
    }
    const payload: any = { ...form };
    ["image_url","video_url","comment","comment_image_url","sub1_image_url","sub2_image_url","sub3_image_url"].forEach((k) => {
      if (!payload[k]) payload[k] = null;
    });
    const { error } = editingId
      ? await supabase.from("tea_questions").update(payload).eq("id", editingId)
      : await supabase.from("tea_questions").insert(payload);
    if (error) {
      toast({ title: "Erro ao salvar", description: error.message, variant: "destructive" });
      return;
    }
    toast({ title: editingId ? "Questão atualizada!" : "Questão criada!" });
    setQDialogOpen(false);
    fetchQuestions();
  };

  const deleteQuestion = async (id: string) => {
    if (!confirm("Excluir esta questão TEA?")) return;
    const { error } = await supabase.from("tea_questions").delete().eq("id", id);
    if (error) return toast({ title: "Erro", description: error.message, variant: "destructive" });
    toast({ title: "Questão excluída" });
    fetchQuestions();
  };

  const upload = (kind: "image" | "video", field: keyof typeof form) => async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setUploading(true);
    try {
      const url = await uploadFile(file, kind === "image" ? "question-images" : "question-videos");
      setForm((f) => ({ ...f, [field]: url }));
      toast({ title: "Arquivo enviado!" });
    } catch (err: any) {
      toast({ title: "Erro no upload", description: err.message, variant: "destructive" });
    } finally {
      setUploading(false);
    }
  };

  const createExam = async () => {
    if (!examTitle.trim() || !examPassword.trim() || selectedQs.length === 0) {
      toast({ title: "Preencha todos os campos e selecione ao menos uma questão.", variant: "destructive" });
      return;
    }
    const { data: exam, error } = await supabase
      .from("exams")
      .insert({ title: examTitle, password: examPassword, exam_type: "tea", created_by: user!.id })
      .select()
      .single();
    if (error) return toast({ title: "Erro", description: error.message, variant: "destructive" });
    const rows = selectedQs.map((qid, i) => ({ exam_id: exam.id, tea_question_id: qid, question_order: i }));
    const { error: e2 } = await supabase.from("tea_exam_questions").insert(rows);
    if (e2) return toast({ title: "Erro", description: e2.message, variant: "destructive" });
    toast({ title: "Prova TEA criada!" });
    setExamDialogOpen(false);
    setExamTitle("");
    setExamPassword("");
    setSelectedQs([]);
    fetchExams();
  };

  const deleteExam = async (id: string) => {
    if (!confirm("Excluir esta prova TEA?")) return;
    const { error } = await supabase.from("exams").delete().eq("id", id);
    if (error) return toast({ title: "Erro", description: error.message, variant: "destructive" });
    toast({ title: "Prova excluída" });
    fetchExams();
  };

  const copyLink = (examId: string) => {
    navigator.clipboard.writeText(`${window.location.origin}/#/prova-tea/${examId}`);
    toast({ title: "Link copiado!" });
  };

  // ========= Manage exam content (inline edit) =========
  const openManageExam = async (exam: TeaExam) => {
    setManagingExam(exam);
    setManageSearch("");
    setManageLoading(true);
    try {
      const { data: eqData, error: eqError } = await supabase
        .from("tea_exam_questions")
        .select("tea_question_id, question_order")
        .eq("exam_id", exam.id)
        .order("question_order");
      if (eqError) throw eqError;
      const ids = (eqData ?? []).map((e) => e.tea_question_id);
      if (ids.length === 0) {
        setExamQuestions([]);
        return;
      }
      const { data: qData, error: qError } = await supabase
        .from("tea_questions")
        .select("*")
        .in("id", ids);
      if (qError) throw qError;
      const map = new Map((qData ?? []).map((q: any) => [q.id, q]));
      const ordered: FullTeaQuestion[] = (eqData ?? [])
        .map((e) => {
          const q = map.get(e.tea_question_id);
          return q ? { ...(q as TeaQuestion), sort_order: e.question_order } : null;
        })
        .filter(Boolean) as FullTeaQuestion[];
      setExamQuestions(ordered);
    } catch (err: any) {
      toast({ title: "Erro ao carregar", description: err.message, variant: "destructive" });
    } finally {
      setManageLoading(false);
    }
  };

  const updateExamQField = (id: string, field: keyof FullTeaQuestion, value: string) => {
    setExamQuestions((prev) => prev.map((q) => (q.id === id ? { ...q, [field]: value } : q)));
  };

  const saveExamQuestion = async (q: FullTeaQuestion) => {
    setSavingQuestionId(q.id);
    const payload: any = {
      question_text: q.question_text,
      comment: q.comment || null,
      sub1_text: q.sub1_text,
      sub1_answer_key: q.sub1_answer_key,
      sub2_text: q.sub2_text,
      sub2_answer_key: q.sub2_answer_key,
      sub3_text: q.sub3_text,
      sub3_answer_key: q.sub3_answer_key,
    };
    const { error } = await supabase.from("tea_questions").update(payload).eq("id", q.id);
    setSavingQuestionId(null);
    if (error) toast({ title: "Erro ao salvar", description: error.message, variant: "destructive" });
    else toast({ title: "Questão atualizada!" });
    fetchQuestions();
  };

  const removeQuestionFromExam = async (questionId: string) => {
    if (!managingExam) return;
    if (!confirm("Remover esta questão da prova? (a questão continuará no banco)")) return;
    const { error } = await supabase
      .from("tea_exam_questions")
      .delete()
      .eq("exam_id", managingExam.id)
      .eq("tea_question_id", questionId);
    if (error) return toast({ title: "Erro", description: error.message, variant: "destructive" });
    setExamQuestions((prev) => prev.filter((q) => q.id !== questionId));
    toast({ title: "Questão removida da prova" });
    fetchExams();
  };

  const addNewQuestionToExam = async () => {
    if (!managingExam) return;
    setManageLoading(true);
    try {
      const { data: newQ, error: qError } = await supabase
        .from("tea_questions")
        .insert({
          question_text: "Nova questão TEA",
          sub1_text: "Pergunta 1",
          sub1_answer_key: "",
          sub2_text: "Pergunta 2",
          sub2_answer_key: "",
          sub3_text: "Pergunta 3",
          sub3_answer_key: "",
        })
        .select()
        .single();
      if (qError) throw qError;

      const nextOrder = examQuestions.length;
      const { error: eqError } = await supabase
        .from("tea_exam_questions")
        .insert({ exam_id: managingExam.id, tea_question_id: newQ.id, question_order: nextOrder });
      if (eqError) throw eqError;

      setExamQuestions((prev) => [...prev, { ...(newQ as TeaQuestion), sort_order: nextOrder }]);
      fetchQuestions();
      fetchExams();
      toast({ title: "Nova questão adicionada — edite abaixo" });
    } catch (err: any) {
      toast({ title: "Erro", description: err.message, variant: "destructive" });
    } finally {
      setManageLoading(false);
    }
  };
  // ======================================================

  const filteredQuestions = questions.filter((q) =>
    !qSearch.trim() ? true : (q.question_text + " " + q.sub1_text + " " + q.sub2_text + " " + q.sub3_text).toLowerCase().includes(qSearch.toLowerCase())
  );

  const filteredForExam = questions.filter((q) =>
    !examSearch.trim() ? true : q.question_text.toLowerCase().includes(examSearch.toLowerCase())
  );

  const renderSubBlock = (n: 1 | 2 | 3) => {
    const tKey = `sub${n}_text` as const;
    const aKey = `sub${n}_answer_key` as const;
    const iKey = `sub${n}_image_url` as const;
    return (
      <Card key={n} className="border-primary/40">
        <CardHeader className="pb-2"><CardTitle className="text-base">Pergunta {n} (vale 0,52)</CardTitle></CardHeader>
        <CardContent className="space-y-2">
          <Textarea placeholder="Enunciado da pergunta" value={form[tKey] as string} onChange={(e) => setForm({ ...form, [tKey]: e.target.value })} rows={2} />
          <Textarea placeholder="Gabarito / resposta esperada" value={form[aKey] as string} onChange={(e) => setForm({ ...form, [aKey]: e.target.value })} rows={2} />
          <div className="flex items-center gap-2">
            <Input type="file" accept="image/*" onChange={upload("image", iKey)} disabled={uploading} className="text-xs" />
            {form[iKey] && (
              <Button type="button" variant="ghost" size="sm" onClick={() => setForm({ ...form, [iKey]: "" })}><X className="w-4 h-4" /></Button>
            )}
          </div>
          {form[iKey] && <img src={form[iKey] as string} alt="" className="max-h-32 rounded" />}
        </CardContent>
      </Card>
    );
  };

  return (
    <Tabs defaultValue="tea-questions">
      <TabsList>
        <TabsTrigger value="tea-questions">Questões TEA</TabsTrigger>
        <TabsTrigger value="tea-exams">Provas TEA</TabsTrigger>
      </TabsList>

      <TabsContent value="tea-questions" className="space-y-4">
        <div className="flex flex-col sm:flex-row gap-3 justify-between items-start sm:items-center">
          <div className="relative w-full sm:max-w-md">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
            <Input placeholder="Buscar questão TEA..." value={qSearch} onChange={(e) => setQSearch(e.target.value)} className="pl-9" />
          </div>
          <Dialog open={qDialogOpen} onOpenChange={setQDialogOpen}>
            <DialogTrigger asChild>
              <Button onClick={openNewQ} className="gradient-primary text-primary-foreground">
                <Plus className="w-4 h-4 mr-1" /> Nova Questão TEA
              </Button>
            </DialogTrigger>
            <DialogContent className="max-w-3xl max-h-[90vh] overflow-y-auto">
              <DialogHeader><DialogTitle>{editingId ? "Editar" : "Nova"} Questão TEA 2 Fase</DialogTitle></DialogHeader>
              <div className="space-y-4">
                <div className="rounded-lg border border-dashed p-3 bg-muted/30">
                  <Label className="text-xs uppercase tracking-wide text-muted-foreground">Importação rápida (colar texto)</Label>
                  <Textarea
                    value={quickImport}
                    onChange={(e) => setQuickImport(e.target.value)}
                    placeholder={"Cole aqui:\nEnunciado / caso clínico...\n1) Pergunta 1\nGabarito: resposta 1\n2) Pergunta 2\nGabarito: resposta 2\n3) Pergunta 3\nGabarito: resposta 3\nComentário: ..."}
                    rows={6}
                    className="mt-2 font-mono text-xs"
                  />
                  <Button type="button" size="sm" variant="secondary" className="mt-2" onClick={handleQuickImport} disabled={!quickImport.trim()}>
                    Processar
                  </Button>
                  {parsedPreview && (
                    <div className="mt-3 space-y-2 rounded-md border bg-background p-3 text-xs">
                      <div className="font-semibold text-foreground">Prévia do parsing</div>
                      <div><span className="font-medium text-muted-foreground">Enunciado:</span> <span className="whitespace-pre-wrap break-words">{parsedPreview.enunciado || <em className="text-destructive">vazio</em>}</span></div>
                      {[1, 2, 3].map((n) => (
                        <div key={n} className="border-t pt-1">
                          <div><span className="font-medium text-muted-foreground">Pergunta {n}:</span> <span className="whitespace-pre-wrap break-words">{parsedPreview[`p${n}` as "p1"] || <em className="text-destructive">vazio</em>}</span></div>
                          <div><span className="font-medium text-muted-foreground">Gabarito {n}:</span> <span className="whitespace-pre-wrap break-words">{parsedPreview[`g${n}` as "g1"] || <em className="text-destructive">vazio</em>}</span></div>
                        </div>
                      ))}
                      <div><span className="font-medium text-muted-foreground">Comentário:</span> <span className="whitespace-pre-wrap break-words">{parsedPreview.comentario || <em className="text-muted-foreground">(nenhum)</em>}</span></div>
                      <div className="flex gap-2 pt-2">
                        <Button type="button" size="sm" onClick={applyPreviewToForm}>Aplicar ao formulário</Button>
                        <Button type="button" size="sm" variant="ghost" onClick={() => setParsedPreview(null)}>Cancelar</Button>
                      </div>
                    </div>
                  )}
                </div>
                <div>
                  <Label>Enunciado (contexto/caso clínico) *</Label>
                  <Textarea rows={5} value={form.question_text} onChange={(e) => setForm({ ...form, question_text: e.target.value })} />
                </div>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <div>
                    <Label>Imagem do enunciado</Label>
                    <Input type="file" accept="image/*" onChange={upload("image", "image_url")} disabled={uploading} />
                    {form.image_url && <img src={form.image_url} alt="" className="max-h-32 rounded mt-2" />}
                  </div>
                  <div>
                    <Label>Vídeo do enunciado</Label>
                    <Input type="file" accept="video/*" onChange={upload("video", "video_url")} disabled={uploading} />
                    {form.video_url && <p className="text-xs text-muted-foreground mt-1 truncate">✓ {form.video_url.split("/").pop()}</p>}
                  </div>
                </div>
                {[1, 2, 3].map((n) => renderSubBlock(n as 1 | 2 | 3))}
                <div>
                  <Label>Comentário geral (opcional)</Label>
                  <Textarea rows={3} value={form.comment ?? ""} onChange={(e) => setForm({ ...form, comment: e.target.value })} />
                  <Input type="file" accept="image/*" onChange={upload("image", "comment_image_url")} disabled={uploading} className="mt-2" />
                  {form.comment_image_url && <img src={form.comment_image_url} alt="" className="max-h-32 rounded mt-2" />}
                </div>
                <Button onClick={saveQuestion} disabled={uploading} className="w-full gradient-primary text-primary-foreground">
                  {editingId ? "Salvar alterações" : "Criar questão"}
                </Button>
              </div>
            </DialogContent>
          </Dialog>
        </div>

        <div className="grid gap-2">
          {filteredQuestions.map((q) => (
            <Card key={q.id}>
              <CardContent className="py-3 flex items-start justify-between gap-3">
                <p className="text-sm line-clamp-2 flex-1">{q.question_text}</p>
                <div className="flex gap-1 shrink-0">
                  <Button variant="ghost" size="sm" onClick={() => openEditQ(q)}><Pencil className="w-4 h-4" /></Button>
                  <Button variant="ghost" size="sm" onClick={() => deleteQuestion(q.id)}><Trash2 className="w-4 h-4" /></Button>
                </div>
              </CardContent>
            </Card>
          ))}
          {filteredQuestions.length === 0 && <p className="text-center text-sm text-muted-foreground py-8">Nenhuma questão TEA cadastrada.</p>}
        </div>
      </TabsContent>

      <TabsContent value="tea-exams" className="space-y-4">
        <div className="flex justify-end">
          <Dialog open={examDialogOpen} onOpenChange={setExamDialogOpen}>
            <DialogTrigger asChild>
              <Button className="gradient-primary text-primary-foreground"><Plus className="w-4 h-4 mr-1" /> Nova Prova TEA</Button>
            </DialogTrigger>
            <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
              <DialogHeader><DialogTitle>Nova Prova TEA 2 Fase</DialogTitle></DialogHeader>
              <div className="space-y-3">
                <div><Label>Título *</Label><Input value={examTitle} onChange={(e) => setExamTitle(e.target.value)} /></div>
                <div><Label>Senha *</Label><Input value={examPassword} onChange={(e) => setExamPassword(e.target.value)} /></div>
                <div>
                  <Label>Selecione as questões</Label>
                  <div className="relative mt-1 mb-2">
                    <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                    <Input placeholder="Buscar..." value={examSearch} onChange={(e) => setExamSearch(e.target.value)} className="pl-9" />
                  </div>
                  <div className="max-h-72 overflow-y-auto border rounded p-2 space-y-1">
                    {filteredForExam.map((q) => (
                      <label key={q.id} className="flex items-start gap-2 py-1.5 px-1 hover:bg-accent rounded cursor-pointer">
                        <Checkbox checked={selectedQs.includes(q.id)} onCheckedChange={(c) => setSelectedQs((s) => c ? [...s, q.id] : s.filter((x) => x !== q.id))} />
                        <span className="text-sm line-clamp-2">{q.question_text}</span>
                      </label>
                    ))}
                  </div>
                  <p className="text-xs text-muted-foreground mt-1">{selectedQs.length} selecionada(s)</p>
                </div>
                <Button onClick={createExam} className="w-full gradient-primary text-primary-foreground">Criar Prova TEA</Button>
              </div>
            </DialogContent>
          </Dialog>
        </div>

        <div className="grid gap-2">
          {exams.map((e) => (
            <Card key={e.id}>
              <CardContent className="py-3 flex items-center justify-between gap-3 flex-wrap">
                <div>
                  <p className="font-medium">{e.title}</p>
                  <p className="text-xs text-muted-foreground">{e.question_count} questões · senha: {e.password}</p>
                </div>
                <div className="flex gap-1">
                  <Button variant="ghost" size="icon" onClick={() => navigate(`/prova-tea/${e.id}`)} title="Iniciar prova">
                    <Play className="w-4 h-4 text-primary" />
                  </Button>
                  <Button variant="ghost" size="icon" onClick={() => openManageExam(e)} title="Gerenciar conteúdo da prova">
                    <Wrench className="w-4 h-4 text-primary" />
                  </Button>
                  <Button variant="ghost" size="icon" onClick={() => copyLink(e.id)} title="Copiar link">
                    <Copy className="w-4 h-4" />
                  </Button>
                  <Button variant="ghost" size="icon" onClick={() => deleteExam(e.id)}>
                    <Trash2 className="w-4 h-4 text-destructive" />
                  </Button>
                </div>
              </CardContent>
            </Card>
          ))}
          {exams.length === 0 && <p className="text-center text-sm text-muted-foreground py-8">Nenhuma prova TEA criada.</p>}
        </div>
      </TabsContent>

      {/* Manage exam content dialog */}
      <Dialog open={!!managingExam} onOpenChange={(o) => { if (!o) { setManagingExam(null); setExamQuestions([]); } }}>
        <DialogContent className="max-w-3xl max-h-[85vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Gerenciar conteúdo — {managingExam?.title}</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <div className="flex justify-between items-center">
              <p className="text-sm text-muted-foreground">{examQuestions.length} questão(ões) nesta prova</p>
              <Button onClick={addNewQuestionToExam} disabled={manageLoading} size="sm" className="gradient-primary text-primary-foreground">
                <Plus className="w-4 h-4 mr-1" /> Nova questão
              </Button>
            </div>

            {examQuestions.length > 0 && (
              <div className="relative">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                <Input
                  value={manageSearch}
                  onChange={(e) => setManageSearch(e.target.value)}
                  placeholder="Buscar questão..."
                  className="pl-9"
                />
              </div>
            )}

            {manageLoading && examQuestions.length === 0 && (
              <p className="text-sm text-muted-foreground text-center py-6">Carregando...</p>
            )}

            <div className="space-y-4">
              {(() => {
                const term = manageSearch.toLowerCase().trim();
                const filtered = examQuestions.filter((q) => {
                  if (!term) return true;
                  return [q.question_text, q.sub1_text, q.sub2_text, q.sub3_text, q.comment]
                    .some((t) => (t || "").toLowerCase().includes(term));
                });
                return (
                  <>
                    {filtered.map((q) => (
                      <Card key={q.id} className="p-4 space-y-3">
                        <div className="flex items-center justify-between">
                          <span className="text-sm font-semibold text-primary">Questão {examQuestions.indexOf(q) + 1}</span>
                          <div className="flex gap-1">
                            <Button size="sm" variant="outline" onClick={() => saveExamQuestion(q)} disabled={savingQuestionId === q.id}>
                              <Save className="w-3 h-3 mr-1" />
                              {savingQuestionId === q.id ? "Salvando..." : "Salvar"}
                            </Button>
                            <Button size="sm" variant="ghost" onClick={() => removeQuestionFromExam(q.id)} title="Remover da prova">
                              <X className="w-4 h-4 text-destructive" />
                            </Button>
                          </div>
                        </div>

                        <div>
                          <Label className="text-xs">Enunciado / caso clínico</Label>
                          <Textarea rows={4} value={q.question_text} onChange={(e) => updateExamQField(q.id, "question_text", e.target.value)} />
                        </div>

                        {[1, 2, 3].map((n) => {
                          const tKey = `sub${n}_text` as keyof FullTeaQuestion;
                          const aKey = `sub${n}_answer_key` as keyof FullTeaQuestion;
                          return (
                            <div key={n} className="grid grid-cols-1 md:grid-cols-2 gap-2 border-t pt-2">
                              <div>
                                <Label className="text-xs">Pergunta {n}</Label>
                                <Textarea rows={2} value={(q[tKey] as string) || ""} onChange={(e) => updateExamQField(q.id, tKey, e.target.value)} />
                              </div>
                              <div>
                                <Label className="text-xs">Gabarito {n}</Label>
                                <Textarea rows={2} value={(q[aKey] as string) || ""} onChange={(e) => updateExamQField(q.id, aKey, e.target.value)} />
                              </div>
                            </div>
                          );
                        })}

                        <div>
                          <Label className="text-xs">Comentário geral</Label>
                          <Textarea rows={3} value={q.comment || ""} onChange={(e) => updateExamQField(q.id, "comment", e.target.value)} />
                        </div>
                      </Card>
                    ))}
                    {filtered.length === 0 && manageSearch.trim() && (
                      <p className="text-sm text-muted-foreground text-center py-6">Nenhuma questão encontrada.</p>
                    )}
                  </>
                );
              })()}

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
    </Tabs>
  );
}
