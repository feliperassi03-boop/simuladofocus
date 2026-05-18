import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { useToast } from "@/hooks/use-toast";
import { Plus, Pencil, Trash2, Users, HelpCircle, BarChart3, ImagePlus, X, FileText, Video, MailCheck, Search } from "lucide-react";
import ExamsTab from "@/components/admin/ExamsTab";
import AllowedEmailsTab from "@/components/admin/AllowedEmailsTab";
import { useVideoConverter } from "@/hooks/useVideoConverter";

interface Question {
  id: string;
  question_text: string;
  option_a: string;
  option_b: string;
  option_c: string;
  option_d: string;
  correct_option: string;
  image_url: string | null;
  created_at: string;
}

interface Attempt {
  id: string;
  user_id: string | null;
  score: number;
  total_questions: number;
  completed_at: string | null;
  created_at: string;
  guest_name: string | null;
  guest_email: string | null;
  exam_id: string | null;
  exam_title?: string;
}

const emptyForm = {
  question_text: "",
  option_a: "",
  option_b: "",
  option_c: "",
  option_d: "",
  correct_option: "A",
  image_url: "" as string,
  video_url: "" as string,
  comment: "" as string,
  comment_image_url: "" as string,
};

export default function AdminPage() {
  const { user } = useAuth();
  const { toast } = useToast();
  const [questions, setQuestions] = useState<Question[]>([]);
  const [attempts, setAttempts] = useState<Attempt[]>([]);
  const [form, setForm] = useState(emptyForm);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [quickImport, setQuickImport] = useState("");
  const [searchQuery, setSearchQuery] = useState("");
  const [parsedPreview, setParsedPreview] = useState<{
    enunciado: string;
    A: string;
    B: string;
    C: string;
    D: string;
    gabarito: string;
    comentario: string;
  } | null>(null);
  const { convertToMp4, needsConversion, converting, progress: convertProgress } = useVideoConverter();

  const handleVideoUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setUploading(true);
    try {
      let finalFile = file;
      if (needsConversion(file.name)) {
        toast({ title: "Convertendo vídeo para MP4...", description: "Isso pode levar alguns segundos." });
        finalFile = await convertToMp4(file);
      }
      const ext = finalFile.name.split(".").pop();
      const filePath = `${crypto.randomUUID()}.${ext}`;
      const { error: uploadError } = await supabase.storage
        .from("question-videos")
        .upload(filePath, finalFile);
      if (uploadError) throw uploadError;
      const { data: { publicUrl } } = supabase.storage
        .from("question-videos")
        .getPublicUrl(filePath);
      setForm((f) => ({ ...f, video_url: publicUrl }));
      toast({ title: "Vídeo enviado!" });
    } catch (error: any) {
      toast({ title: "Erro no upload", description: error.message, variant: "destructive" });
    } finally {
      setUploading(false);
    }
  };

  const handleImageUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setUploading(true);
    try {
      const ext = file.name.split(".").pop();
      const filePath = `${crypto.randomUUID()}.${ext}`;
      const { error: uploadError } = await supabase.storage
        .from("question-images")
        .upload(filePath, file);
      if (uploadError) throw uploadError;
      const { data: { publicUrl } } = supabase.storage
        .from("question-images")
        .getPublicUrl(filePath);
      setForm((f) => ({ ...f, image_url: publicUrl }));
      toast({ title: "Imagem enviada!" });
    } catch (error: any) {
      toast({ title: "Erro no upload", description: error.message, variant: "destructive" });
    } finally {
      setUploading(false);
    }
  };

  const fetchQuestions = async () => {
    // Pagina para evitar o limite padrão de 1000 linhas do Supabase
    const pageSize = 1000;
    let from = 0;
    const all: Question[] = [];
    while (true) {
      const { data, error } = await supabase
        .from("questions")
        .select("*")
        .order("created_at", { ascending: false })
        .range(from, from + pageSize - 1);
      if (error || !data || data.length === 0) break;
      all.push(...(data as Question[]));
      if (data.length < pageSize) break;
      from += pageSize;
    }
    setQuestions(all);
  };

  const fetchAttempts = async () => {
    const { data } = await supabase
      .from("quiz_attempts")
      .select("*, exams(title)")
      .not("completed_at", "is", null)
      .order("created_at", { ascending: false });
    if (data) {
      setAttempts(
        data.map((a: any) => ({
          ...a,
          exam_title: a.exams?.title || "—",
        }))
      );
    }
  };

  useEffect(() => {
    fetchQuestions();
    fetchAttempts();
  }, []);

  const handleSave = async () => {
    setLoading(true);
    try {
      const payload = {
        ...form,
        image_url: form.image_url || null,
        video_url: form.video_url || null,
        comment: form.comment || null,
        comment_image_url: form.comment_image_url || null,
      };
      if (editingId) {
        const { error } = await supabase.from("questions").update(payload).eq("id", editingId);
        if (error) throw error;
        toast({ title: "Pergunta atualizada!" });
      } else {
        const { error } = await supabase.from("questions").insert({ ...payload, created_by: user!.id });
        if (error) throw error;
        toast({ title: "Pergunta criada!" });
      }
      setForm(emptyForm);
      setEditingId(null);
      setDialogOpen(false);
      fetchQuestions();
    } catch (error: any) {
      toast({ title: "Erro", description: error.message, variant: "destructive" });
    } finally {
      setLoading(false);
    }
  };

  const handleEdit = (q: Question) => {
    setForm({
      question_text: q.question_text,
      option_a: q.option_a,
      option_b: q.option_b,
      option_c: q.option_c,
      option_d: q.option_d,
      correct_option: q.correct_option,
      image_url: q.image_url || "",
      video_url: (q as any).video_url || "",
      comment: (q as any).comment || "",
      comment_image_url: (q as any).comment_image_url || "",
    });
    setEditingId(q.id);
    setDialogOpen(true);
  };

  const handleDelete = async (id: string) => {
    const { error } = await supabase.from("questions").delete().eq("id", id);
    if (error) {
      toast({ title: "Erro ao excluir", description: error.message, variant: "destructive" });
    } else {
      toast({ title: "Pergunta excluída!" });
      fetchQuestions();
    }
  };

  const openNew = () => {
    setForm(emptyForm);
    setEditingId(null);
    setQuickImport("");
    setParsedPreview(null);
    setDialogOpen(true);
  };

  const handleQuickImport = () => {
    const text = quickImport.replace(/\r/g, "").trim();
    if (!text) return;

    const lines = text.split("\n");
    // Strict line-start matchers — each block is delimited by the *line* it starts on
    const altLineRe = /^\s*([A-Da-d])\s*[\)\.\-]\s*(.*)$/;
    const answerLineRe = /^\s*(?:resposta|gabarito)\b[^A-Za-z\n]*(?:letra\s+)?([A-Da-d])\b.*$/i;

    let block: "enunciado" | "alt" | "comentario" = "enunciado";
    let currentAlt = "";
    const enunciadoLines: string[] = [];
    const alts: Record<string, string[]> = { A: [], B: [], C: [], D: [] };
    const comentarioLines: string[] = [];
    let gabarito = "";

    for (const raw of lines) {
      const line = raw;

      // 1) Answer line — strict separator. Consumes the whole line; never part of any alt or comment.
      const ans = line.match(answerLineRe);
      if (ans && block !== "comentario") {
        gabarito = ans[1].toUpperCase();
        block = "comentario";
        continue;
      }

      // 2) Alternative start line
      const alt = block !== "comentario" ? line.match(altLineRe) : null;
      if (alt) {
        currentAlt = alt[1].toUpperCase();
        block = "alt";
        if (alt[2]) alts[currentAlt].push(alt[2]);
        continue;
      }

      // 3) Continuation lines
      if (block === "enunciado") enunciadoLines.push(line);
      else if (block === "alt" && currentAlt) alts[currentAlt].push(line);
      else if (block === "comentario") comentarioLines.push(line);
    }

    if (!alts.A.length || !alts.B.length || !alts.C.length || !alts.D.length) {
      toast({ title: "Formato inválido", description: "Não foi possível identificar as 4 alternativas (A, B, C, D).", variant: "destructive" });
      return;
    }

    // Strip optional "Comentário:" / "Comentário da questão" header from comment
    let comentario = comentarioLines.join("\n").trim();
    comentario = comentario.replace(/^\s*(?:coment[áa]rio|comment)\b[^\n]*\n?/i, "").trim();

    setParsedPreview({
      enunciado: enunciadoLines.join("\n").trim(),
      A: alts.A.join("\n").trim(),
      B: alts.B.join("\n").trim(),
      C: alts.C.join("\n").trim(),
      D: alts.D.join("\n").trim(),
      gabarito: gabarito || "A",
      comentario,
    });
  };

  const applyPreviewToForm = () => {
    if (!parsedPreview) return;
    setForm({
      ...form,
      question_text: parsedPreview.enunciado,
      option_a: parsedPreview.A,
      option_b: parsedPreview.B,
      option_c: parsedPreview.C,
      option_d: parsedPreview.D,
      correct_option: parsedPreview.gabarito,
      comment: parsedPreview.comentario || form.comment,
    });
    setParsedPreview(null);
    setQuickImport("");
    toast({ title: "Aplicado!", description: "Revise e clique em Salvar quando estiver pronto." });
  };

  return (
    <div className="space-y-6 animate-fade-in">
      <div className="flex items-center justify-between">
        <h1 className="text-3xl font-bold font-display text-foreground">Painel Admin</h1>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <Card className="shadow-card">
          <CardContent className="pt-6 flex items-center gap-4">
            <div className="w-12 h-12 rounded-xl gradient-primary flex items-center justify-center">
              <HelpCircle className="w-6 h-6 text-primary-foreground" />
            </div>
            <div>
              <p className="text-2xl font-bold font-display">{questions.length}</p>
              <p className="text-sm text-muted-foreground">Perguntas</p>
            </div>
          </CardContent>
        </Card>
        <Card className="shadow-card">
          <CardContent className="pt-6 flex items-center gap-4">
            <div className="w-12 h-12 rounded-xl gradient-warm flex items-center justify-center">
              <BarChart3 className="w-6 h-6 text-accent-foreground" />
            </div>
            <div>
              <p className="text-2xl font-bold font-display">{attempts.length}</p>
              <p className="text-sm text-muted-foreground">Tentativas</p>
            </div>
          </CardContent>
        </Card>
        <Card className="shadow-card">
          <CardContent className="pt-6 flex items-center gap-4">
            <div className="w-12 h-12 rounded-xl bg-info flex items-center justify-center">
              <Users className="w-6 h-6 text-info-foreground" />
            </div>
            <div>
              <p className="text-2xl font-bold font-display">
                {attempts.filter((a) => a.completed_at).length}
              </p>
              <p className="text-sm text-muted-foreground">Finalizadas</p>
            </div>
          </CardContent>
        </Card>
      </div>

      <Tabs defaultValue="questions">
        <TabsList>
          <TabsTrigger value="questions">Perguntas</TabsTrigger>
          <TabsTrigger value="exams">Provas</TabsTrigger>
          <TabsTrigger value="results">Resultados</TabsTrigger>
          <TabsTrigger value="allowed-emails">Emails Autorizados</TabsTrigger>
        </TabsList>

        <TabsContent value="questions" className="space-y-4">
          <div className="flex flex-col sm:flex-row gap-3 justify-between items-start sm:items-center">
            <div className="relative w-full sm:max-w-md">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
              <Input
                placeholder="Buscar no enunciado ou alternativas..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="pl-9"
              />
            </div>
            <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
              <DialogTrigger asChild>
                <Button onClick={openNew} className="gradient-primary text-primary-foreground">
                  <Plus className="w-4 h-4 mr-2" /> Nova Pergunta
                </Button>
              </DialogTrigger>
              <DialogContent className="max-w-lg max-h-[90vh] overflow-y-auto">
                <DialogHeader>
                  <DialogTitle className="font-display">
                    {editingId ? "Editar Pergunta" : "Nova Pergunta"}
                  </DialogTitle>
                </DialogHeader>
                <div className="space-y-4">
                  <div className="rounded-lg border border-dashed p-3 bg-muted/30">
                    <Label className="text-xs uppercase tracking-wide text-muted-foreground">Importação rápida (colar texto)</Label>
                    <Textarea
                      value={quickImport}
                      onChange={(e) => setQuickImport(e.target.value)}
                      placeholder={"Cole aqui:\nEnunciado...\nA) ...\nB) ...\nC) ...\nD) ...\nResposta: A"}
                      rows={5}
                      className="mt-2 font-mono text-xs"
                    />
                    <Button
                      type="button"
                      size="sm"
                      variant="secondary"
                      className="mt-2"
                      onClick={handleQuickImport}
                      disabled={!quickImport.trim()}
                    >
                      Processar
                    </Button>
                    {parsedPreview && (
                      <div className="mt-3 space-y-2 rounded-md border bg-background p-3 text-xs">
                        <div className="font-semibold text-foreground">Prévia do parsing</div>
                        <div><span className="font-medium text-muted-foreground">Enunciado:</span> <span className="whitespace-pre-wrap">{parsedPreview.enunciado || <em className="text-destructive">vazio</em>}</span></div>
                        {(["A","B","C","D"] as const).map((l) => (
                          <div key={l}>
                            <span className="font-medium text-muted-foreground">{l}):</span>{" "}
                            <span className="whitespace-pre-wrap">{parsedPreview[l] || <em className="text-destructive">vazio</em>}</span>
                          </div>
                        ))}
                        <div><span className="font-medium text-muted-foreground">Gabarito:</span> <span className="font-semibold text-primary">{parsedPreview.gabarito}</span></div>
                        <div><span className="font-medium text-muted-foreground">Comentário:</span> <span className="whitespace-pre-wrap">{parsedPreview.comentario || <em className="text-muted-foreground">(nenhum)</em>}</span></div>
                        <div className="flex gap-2 pt-2">
                          <Button type="button" size="sm" onClick={applyPreviewToForm}>Aplicar ao formulário</Button>
                          <Button type="button" size="sm" variant="ghost" onClick={() => setParsedPreview(null)}>Cancelar</Button>
                        </div>
                      </div>
                    )}
                  </div>
                  <div>
                    <Label>Pergunta</Label>
                    <Textarea
                      value={form.question_text}
                      onChange={(e) => setForm({ ...form, question_text: e.target.value })}
                      placeholder="Digite a pergunta..."
                      rows={3}
                    />
                  </div>
                  <div>
                    <Label>Imagem (opcional)</Label>
                    {form.image_url ? (
                      <div className="relative mt-2 rounded-lg overflow-hidden border">
                        <img src={form.image_url} alt="Preview" className="w-full max-h-48 object-contain bg-muted" />
                        <Button
                          type="button"
                          variant="destructive"
                          size="icon"
                          className="absolute top-2 right-2 h-7 w-7"
                          onClick={() => setForm((f) => ({ ...f, image_url: "" }))}
                        >
                          <X className="w-4 h-4" />
                        </Button>
                      </div>
                    ) : (
                      <label className="mt-2 flex items-center gap-2 cursor-pointer border border-dashed rounded-lg p-4 hover:bg-muted/50 transition-colors">
                        <ImagePlus className="w-5 h-5 text-muted-foreground" />
                        <span className="text-sm text-muted-foreground">
                          {uploading ? "Enviando..." : "Clique para adicionar imagem"}
                        </span>
                        <input
                          type="file"
                          accept="image/*"
                          className="hidden"
                          onChange={handleImageUpload}
                          disabled={uploading}
                        />
                      </label>
                    )}
                  </div>
                  <div>
                    <Label>Vídeo (opcional)</Label>
                    {form.video_url ? (
                      <div className="relative mt-2 rounded-lg overflow-hidden border">
                        <video src={form.video_url} controls className="w-full max-h-48 bg-muted" />
                        <Button
                          type="button"
                          variant="destructive"
                          size="icon"
                          className="absolute top-2 right-2 h-7 w-7"
                          onClick={() => setForm((f) => ({ ...f, video_url: "" }))}
                        >
                          <X className="w-4 h-4" />
                        </Button>
                      </div>
                    ) : (
                      <label className="mt-2 flex items-center gap-2 cursor-pointer border border-dashed rounded-lg p-4 hover:bg-muted/50 transition-colors">
                        <Video className="w-5 h-5 text-muted-foreground" />
                        <span className="text-sm text-muted-foreground">
                          {converting ? `Convertendo... ${convertProgress}%` : uploading ? "Enviando..." : "Clique para adicionar vídeo (MP4, MOV, WebM)"}
                        </span>
                        <input
                          type="file"
                          accept="video/*"
                          className="hidden"
                          onChange={handleVideoUpload}
                          disabled={uploading}
                        />
                      </label>
                    )}
                  </div>
                  {(["A", "B", "C", "D"] as const).map((opt) => (
                    <div key={opt}>
                      <Label>Opção {opt}</Label>
                      <Input
                        value={form[`option_${opt.toLowerCase()}` as keyof typeof form]}
                        onChange={(e) =>
                          setForm({ ...form, [`option_${opt.toLowerCase()}`]: e.target.value })
                        }
                        placeholder={`Opção ${opt}`}
                      />
                    </div>
                  ))}
                  <div>
                    <Label>Comentário / Gabarito Comentado (opcional)</Label>
                    <Textarea
                      value={form.comment}
                      onChange={(e) => setForm({ ...form, comment: e.target.value })}
                      placeholder="Digite o comentário explicativo da questão (gabarito comentado)..."
                      rows={6}
                      className="min-h-[120px]"
                    />
                  </div>
                  <div>
                    <Label>Imagem do Comentário (opcional)</Label>
                    {form.comment_image_url ? (
                      <div className="relative mt-2 rounded-lg overflow-hidden border">
                        <img src={form.comment_image_url} alt="Preview comentário" className="w-full max-h-48 object-contain bg-muted" />
                        <Button
                          type="button"
                          variant="destructive"
                          size="icon"
                          className="absolute top-2 right-2 h-7 w-7"
                          onClick={() => setForm((f) => ({ ...f, comment_image_url: "" }))}
                        >
                          <X className="w-4 h-4" />
                        </Button>
                      </div>
                    ) : (
                      <label className="mt-2 flex items-center gap-2 cursor-pointer border border-dashed rounded-lg p-4 hover:bg-muted/50 transition-colors">
                        <ImagePlus className="w-5 h-5 text-muted-foreground" />
                        <span className="text-sm text-muted-foreground">
                          {uploading ? "Enviando..." : "Clique para adicionar imagem ao comentário"}
                        </span>
                        <input
                          type="file"
                          accept="image/*"
                          className="hidden"
                          onChange={async (e) => {
                            const file = e.target.files?.[0];
                            if (!file) return;
                            setUploading(true);
                            try {
                              const ext = file.name.split(".").pop();
                              const filePath = `${crypto.randomUUID()}.${ext}`;
                              const { error: uploadError } = await supabase.storage
                                .from("question-images")
                                .upload(filePath, file);
                              if (uploadError) throw uploadError;
                              const { data: { publicUrl } } = supabase.storage
                                .from("question-images")
                                .getPublicUrl(filePath);
                              setForm((f) => ({ ...f, comment_image_url: publicUrl }));
                              toast({ title: "Imagem do comentário enviada!" });
                            } catch (error: any) {
                              toast({ title: "Erro no upload", description: error.message, variant: "destructive" });
                            } finally {
                              setUploading(false);
                            }
                          }}
                          disabled={uploading}
                        />
                      </label>
                    )}
                  </div>
                  <div>
                    <Label>Resposta Correta</Label>
                    <Select
                      value={form.correct_option}
                      onValueChange={(v) => setForm({ ...form, correct_option: v })}
                    >
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="A">Opção A</SelectItem>
                        <SelectItem value="B">Opção B</SelectItem>
                        <SelectItem value="C">Opção C</SelectItem>
                        <SelectItem value="D">Opção D</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                  <Button onClick={handleSave} disabled={loading} className="w-full gradient-primary text-primary-foreground">
                    {loading ? "Salvando..." : editingId ? "Atualizar" : "Criar"}
                  </Button>
                </div>
              </DialogContent>
            </Dialog>
          </div>

          <Card className="shadow-card">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Pergunta</TableHead>
                  <TableHead className="w-24">Correta</TableHead>
                  <TableHead className="w-24">Ações</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {(() => {
                  const lower = searchQuery.trim().toLowerCase();
                  const filtered = lower
                    ? questions.filter(
                        (q) =>
                          q.question_text.toLowerCase().includes(lower) ||
                          q.option_a.toLowerCase().includes(lower) ||
                          q.option_b.toLowerCase().includes(lower) ||
                          q.option_c.toLowerCase().includes(lower) ||
                          q.option_d.toLowerCase().includes(lower)
                      )
                    : questions;
                  return (
                    <>
                      {filtered.map((q) => (
                        <TableRow key={q.id}>
                          <TableCell className="font-medium max-w-md break-words whitespace-normal">
                            {q.question_text}
                          </TableCell>
                          <TableCell>
                            <span className="inline-flex items-center justify-center w-8 h-8 rounded-lg bg-primary/10 text-primary font-bold text-sm">
                              {q.correct_option}
                            </span>
                          </TableCell>
                          <TableCell>
                            <div className="flex gap-1">
                              <Button variant="ghost" size="icon" onClick={() => handleEdit(q)}>
                                <Pencil className="w-4 h-4" />
                              </Button>
                              <Button variant="ghost" size="icon" onClick={() => handleDelete(q.id)}>
                                <Trash2 className="w-4 h-4 text-destructive" />
                              </Button>
                            </div>
                          </TableCell>
                        </TableRow>
                      ))}
                      {filtered.length === 0 && (
                        <TableRow>
                          <TableCell colSpan={3} className="text-center text-muted-foreground py-8">
                            {lower ? "Nenhuma pergunta encontrada para esta busca." : "Nenhuma pergunta cadastrada. Clique em \"Nova Pergunta\" para começar."}
                          </TableCell>
                        </TableRow>
                      )}
                    </>
                  );
                })()}
              </TableBody>
            </Table>
          </Card>
        </TabsContent>


        <TabsContent value="exams">
          <ExamsTab />
        </TabsContent>

        <TabsContent value="results">
          <div className="flex justify-end mb-4">
            {attempts.length > 0 && (
              <Button
                variant="destructive"
                size="sm"
                onClick={async () => {
                  if (!confirm("Tem certeza que deseja apagar TODOS os resultados?")) return;
                  const { error } = await supabase.from("quiz_answers").delete().in("attempt_id", attempts.map(a => a.id));
                  if (!error) {
                    const { error: err2 } = await supabase.from("quiz_attempts").delete().in("id", attempts.map(a => a.id));
                    if (!err2) {
                      toast({ title: "Todos os resultados foram apagados!" });
                      fetchAttempts();
                    } else {
                      toast({ title: "Erro", description: err2.message, variant: "destructive" });
                    }
                  } else {
                    toast({ title: "Erro", description: error.message, variant: "destructive" });
                  }
                }}
              >
                <Trash2 className="w-4 h-4 mr-2" /> Apagar Todos
              </Button>
            )}
          </div>
          <Card className="shadow-card">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Aluno</TableHead>
                  <TableHead>Prova</TableHead>
                  <TableHead>Pontuação</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead>Data</TableHead>
                  <TableHead className="w-16">Ações</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {attempts.map((a) => (
                  <TableRow key={a.id}>
                    <TableCell className="text-sm">
                      {a.guest_name || (a.user_id ? `${a.user_id.slice(0, 8)}...` : "Anônimo")}
                      {a.guest_email && (
                        <span className="block text-xs text-muted-foreground">{a.guest_email}</span>
                      )}
                    </TableCell>
                    <TableCell className="text-sm">{a.exam_title}</TableCell>
                    <TableCell>
                      <span className="font-bold font-display">
                        {a.score}/{a.total_questions}
                      </span>
                    </TableCell>
                    <TableCell>
                      {a.completed_at ? (
                        <span className="text-xs px-2 py-1 rounded-full bg-success/10 text-success font-medium">
                          Concluído
                        </span>
                      ) : (
                        <span className="text-xs px-2 py-1 rounded-full bg-warning/10 text-warning font-medium">
                          Em andamento
                        </span>
                      )}
                    </TableCell>
                    <TableCell className="text-sm text-muted-foreground">
                      {new Date(a.created_at).toLocaleDateString("pt-BR")}
                    </TableCell>
                    <TableCell>
                      <Button variant="ghost" size="icon" onClick={async () => {
                        await supabase.from("quiz_answers").delete().eq("attempt_id", a.id);
                        const { error } = await supabase.from("quiz_attempts").delete().eq("id", a.id);
                        if (error) {
                          toast({ title: "Erro", description: error.message, variant: "destructive" });
                        } else {
                          toast({ title: "Resultado apagado!" });
                          fetchAttempts();
                        }
                      }}>
                        <Trash2 className="w-4 h-4 text-destructive" />
                      </Button>
                    </TableCell>
                  </TableRow>
                ))}
                {attempts.length === 0 && (
                  <TableRow>
                    <TableCell colSpan={6} className="text-center text-muted-foreground py-8">
                      Nenhuma tentativa registrada ainda.
                    </TableCell>
                  </TableRow>
                )}
              </TableBody>
            </Table>
          </Card>
        </TabsContent>

        <TabsContent value="allowed-emails">
          <AllowedEmailsTab />
        </TabsContent>
      </Tabs>
    </div>
  );
}
