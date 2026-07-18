import { useState, useEffect } from "react";
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
import { Plus, Pencil, Trash2, ImagePlus, X, Search, Copy } from "lucide-react";

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
  const [questions, setQuestions] = useState<TeaQuestion[]>([]);
  const [exams, setExams] = useState<TeaExam[]>([]);
  const [form, setForm] = useState<Omit<TeaQuestion, "id">>(emptyForm);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [qDialogOpen, setQDialogOpen] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [qSearch, setQSearch] = useState("");

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

  const upload = async (kind: "image" | "video", field: keyof typeof form) => async (e: React.ChangeEvent<HTMLInputElement>) => {
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
                  <Button variant="ghost" size="sm" onClick={() => copyLink(e.id)}><Copy className="w-4 h-4" /></Button>
                  <Button variant="ghost" size="sm" onClick={() => deleteExam(e.id)}><Trash2 className="w-4 h-4" /></Button>
                </div>
              </CardContent>
            </Card>
          ))}
          {exams.length === 0 && <p className="text-center text-sm text-muted-foreground py-8">Nenhuma prova TEA criada.</p>}
        </div>
      </TabsContent>
    </Tabs>
  );
}
