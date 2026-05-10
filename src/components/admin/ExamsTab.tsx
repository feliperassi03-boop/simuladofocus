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
import { useToast } from "@/hooks/use-toast";
import { Plus, Copy, Trash2, Link2, Eye, EyeOff, Play, Pencil, ListChecks } from "lucide-react";

interface Question {
  id: string;
  question_text: string;
}

interface Exam {
  id: string;
  title: string;
  password: string;
  is_active: boolean;
  created_at: string;
  question_count?: number;
}

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
  const [loading, setLoading] = useState(false);
  const [showPasswords, setShowPasswords] = useState<Record<string, boolean>>({});
  const [editingExam, setEditingExam] = useState<Exam | null>(null);
  const [editTitle, setEditTitle] = useState("");
  const [editingQuestionsExam, setEditingQuestionsExam] = useState<Exam | null>(null);
  const [editSelectedQuestions, setEditSelectedQuestions] = useState<string[]>([]);
  const [editQuestionsLoading, setEditQuestionsLoading] = useState(false);
  const [editQuestionsSearch, setEditQuestionsSearch] = useState("");

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
    } catch (error: any) {
      toast({ title: "Erro ao salvar", description: error.message, variant: "destructive" });
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

    // Get question counts
    const examIds = data.map((e) => e.id);
    const { data: eqData } = await supabase
      .from("exam_questions")
      .select("exam_id")
      .in("exam_id", examIds);

    const counts: Record<string, number> = {};
    eqData?.forEach((eq) => {
      counts[eq.exam_id] = (counts[eq.exam_id] || 0) + 1;
    });

    setExams(data.map((e) => ({ ...e, question_count: counts[e.id] || 0 })));
  };

  const fetchQuestions = async () => {
    const { data } = await supabase
      .from("questions")
      .select("id, question_text")
      .order("created_at", { ascending: false });
    if (data) setQuestions(data);
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
      fetchExams();
    } catch (error: any) {
      toast({ title: "Erro", description: error.message, variant: "destructive" });
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
              <div className="mt-2 border rounded-lg max-h-64 overflow-y-auto">
                {questions.map((q) => (
                  <label
                    key={q.id}
                    className="flex items-start gap-3 p-3 hover:bg-muted/50 cursor-pointer border-b last:border-b-0"
                  >
                    <Checkbox
                      checked={selectedQuestions.includes(q.id)}
                      onCheckedChange={() => toggleQuestion(q.id)}
                      className="mt-0.5"
                    />
                    <span className="text-sm">{q.question_text}</span>
                  </label>
                ))}
                {questions.length === 0 && (
                  <p className="text-sm text-muted-foreground p-4 text-center">
                    Nenhuma pergunta cadastrada.
                  </p>
                )}
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
    </div>
  );
}
