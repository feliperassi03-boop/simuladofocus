import { useEffect, useMemo, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
import { useToast } from "@/hooks/use-toast";
import { MessageCircleQuestion, Trash2, Send, Archive, CheckCircle2, Clock, ImagePlus, X } from "lucide-react";

type DoubtStatus = "pending" | "answered" | "resolved" | "archived";

interface Doubt {
  id: string;
  question_id: string;
  exam_id: string | null;
  exam_title: string;
  question_number: number | null;
  question_text_snapshot: string | null;
  student_name: string;
  student_email: string | null;
  user_id: string | null;
  doubt_text: string;
  status: DoubtStatus;
  admin_response: string | null;
  admin_response_image_url: string | null;
  answered_at: string | null;
  created_at: string;
}

const statusLabel: Record<DoubtStatus, string> = {
  pending: "Pendente",
  answered: "Respondida",
  resolved: "Resolvida",
  archived: "Arquivada",
};

const statusBadge: Record<DoubtStatus, string> = {
  pending: "bg-warning/15 text-warning border-warning/30",
  answered: "bg-info/15 text-info border-info/30",
  resolved: "bg-success/15 text-success border-success/30",
  archived: "bg-muted text-muted-foreground border-border",
};

export default function DoubtsTab() {
  const { user } = useAuth();
  const { toast } = useToast();
  const [doubts, setDoubts] = useState<Doubt[]>([]);
  const [loading, setLoading] = useState(true);
  const [statusFilter, setStatusFilter] = useState<string>("all");
  const [examFilter, setExamFilter] = useState<string>("all");
  const [studentFilter, setStudentFilter] = useState("");
  const [dateFilter, setDateFilter] = useState("");
  const [responding, setResponding] = useState<Doubt | null>(null);
  const [responseText, setResponseText] = useState("");
  const [responseImageUrl, setResponseImageUrl] = useState<string | null>(null);
  const [uploadingImage, setUploadingImage] = useState(false);
  const [saving, setSaving] = useState(false);

  const fetchDoubts = async () => {
    setLoading(true);
    const { data, error } = await supabase
      .from("question_doubts")
      .select("*")
      .order("created_at", { ascending: false });
    if (error) {
      toast({ title: "Erro ao carregar dúvidas", description: error.message, variant: "destructive" });
    } else {
      setDoubts((data || []) as Doubt[]);
    }
    setLoading(false);
  };

  useEffect(() => {
    fetchDoubts();
  }, []);

  const exams = useMemo(() => {
    const map = new Map<string, string>();
    doubts.forEach((d) => {
      if (d.exam_title) map.set(d.exam_title, d.exam_title);
    });
    return Array.from(map.keys()).sort();
  }, [doubts]);

  const filtered = useMemo(() => {
    return doubts.filter((d) => {
      if (statusFilter !== "all" && d.status !== statusFilter) return false;
      if (examFilter !== "all" && d.exam_title !== examFilter) return false;
      if (studentFilter) {
        const q = studentFilter.toLowerCase();
        if (
          !d.student_name.toLowerCase().includes(q) &&
          !(d.student_email || "").toLowerCase().includes(q)
        )
          return false;
      }
      if (dateFilter) {
        const date = new Date(d.created_at).toISOString().slice(0, 10);
        if (date !== dateFilter) return false;
      }
      return true;
    });
  }, [doubts, statusFilter, examFilter, studentFilter, dateFilter]);

  const openRespond = (d: Doubt) => {
    setResponding(d);
    setResponseText(d.admin_response || "");
  };

  const saveResponse = async () => {
    if (!responding) return;
    if (!responseText.trim()) {
      toast({ title: "Escreva uma resposta.", variant: "destructive" });
      return;
    }
    setSaving(true);
    const { error } = await supabase
      .from("question_doubts")
      .update({
        admin_response: responseText.trim(),
        status: "answered",
        answered_at: new Date().toISOString(),
        answered_by: user?.id || null,
        read_by_student: false,
      })
      .eq("id", responding.id);
    setSaving(false);
    if (error) {
      toast({ title: "Erro ao responder", description: error.message, variant: "destructive" });
      return;
    }
    toast({ title: "Resposta enviada!" });
    setResponding(null);
    setResponseText("");
    fetchDoubts();
  };

  const changeStatus = async (d: Doubt, status: DoubtStatus) => {
    const { error } = await supabase.from("question_doubts").update({ status }).eq("id", d.id);
    if (error) {
      toast({ title: "Erro", description: error.message, variant: "destructive" });
    } else {
      toast({ title: `Marcada como ${statusLabel[status].toLowerCase()}.` });
      fetchDoubts();
    }
  };

  const deleteDoubt = async (d: Doubt) => {
    if (!confirm("Excluir esta dúvida permanentemente?")) return;
    const { error } = await supabase.from("question_doubts").delete().eq("id", d.id);
    if (error) {
      toast({ title: "Erro ao excluir", description: error.message, variant: "destructive" });
    } else {
      toast({ title: "Dúvida excluída." });
      fetchDoubts();
    }
  };

  return (
    <div className="space-y-4">
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
        <div>
          <Label className="text-xs text-muted-foreground">Status</Label>
          <Select value={statusFilter} onValueChange={setStatusFilter}>
            <SelectTrigger><SelectValue /></SelectTrigger>
            <SelectContent>
              <SelectItem value="all">Todos</SelectItem>
              <SelectItem value="pending">Pendente</SelectItem>
              <SelectItem value="answered">Respondida</SelectItem>
              <SelectItem value="resolved">Resolvida</SelectItem>
              <SelectItem value="archived">Arquivada</SelectItem>
            </SelectContent>
          </Select>
        </div>
        <div>
          <Label className="text-xs text-muted-foreground">Prova / Disciplina</Label>
          <Select value={examFilter} onValueChange={setExamFilter}>
            <SelectTrigger><SelectValue /></SelectTrigger>
            <SelectContent>
              <SelectItem value="all">Todas</SelectItem>
              {exams.map((e) => (
                <SelectItem key={e} value={e}>{e}</SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
        <div>
          <Label className="text-xs text-muted-foreground">Aluno (nome ou e-mail)</Label>
          <Input value={studentFilter} onChange={(e) => setStudentFilter(e.target.value)} placeholder="Buscar..." />
        </div>
        <div>
          <Label className="text-xs text-muted-foreground">Data</Label>
          <Input type="date" value={dateFilter} onChange={(e) => setDateFilter(e.target.value)} />
        </div>
      </div>

      {loading ? (
        <p className="text-muted-foreground text-center py-8">Carregando...</p>
      ) : filtered.length === 0 ? (
        <Card>
          <CardContent className="py-12 text-center text-muted-foreground">
            <MessageCircleQuestion className="w-10 h-10 mx-auto mb-2 opacity-50" />
            Nenhuma dúvida encontrada com os filtros atuais.
          </CardContent>
        </Card>
      ) : (
        <div className="space-y-3">
          {filtered.map((d) => (
            <Card key={d.id} className="shadow-card">
              <CardContent className="pt-4 space-y-3">
                <div className="flex flex-wrap items-start justify-between gap-2">
                  <div className="space-y-0.5 min-w-0">
                    <div className="flex items-center gap-2 flex-wrap">
                      <Badge variant="outline" className={statusBadge[d.status]}>{statusLabel[d.status]}</Badge>
                      <span className="text-xs text-muted-foreground">
                        {new Date(d.created_at).toLocaleString("pt-BR")}
                      </span>
                    </div>
                    <p className="font-semibold text-foreground break-words">
                      {d.student_name}
                      {d.student_email && <span className="text-muted-foreground font-normal text-sm"> · {d.student_email}</span>}
                    </p>
                    <p className="text-sm text-muted-foreground break-words">
                      {d.exam_title}{d.question_number ? ` — Questão ${d.question_number}` : ""}
                    </p>
                  </div>
                </div>

                {d.question_text_snapshot && (
                  <div className="text-xs bg-muted/40 rounded p-2 text-muted-foreground break-words whitespace-normal">
                    {d.question_text_snapshot}
                  </div>
                )}

                <div className="text-sm text-foreground break-words whitespace-normal">
                  <strong className="font-display">Dúvida:</strong> {d.doubt_text}
                </div>

                {d.admin_response && (
                  <div className="text-sm bg-primary/5 border border-primary/20 rounded p-3 break-words whitespace-normal">
                    <strong className="font-display text-primary">Resposta:</strong> {d.admin_response}
                  </div>
                )}

                <div className="flex flex-wrap gap-2 pt-1">
                  <Button size="sm" onClick={() => openRespond(d)} className="gradient-primary text-primary-foreground">
                    <Send className="w-3.5 h-3.5 mr-1" /> {d.admin_response ? "Editar resposta" : "Responder"}
                  </Button>
                  {d.status !== "pending" && (
                    <Button size="sm" variant="outline" onClick={() => changeStatus(d, "pending")}>
                      <Clock className="w-3.5 h-3.5 mr-1" /> Pendente
                    </Button>
                  )}
                  {d.status !== "resolved" && (
                    <Button size="sm" variant="outline" onClick={() => changeStatus(d, "resolved")}>
                      <CheckCircle2 className="w-3.5 h-3.5 mr-1" /> Resolver
                    </Button>
                  )}
                  {d.status !== "archived" && (
                    <Button size="sm" variant="outline" onClick={() => changeStatus(d, "archived")}>
                      <Archive className="w-3.5 h-3.5 mr-1" /> Arquivar
                    </Button>
                  )}
                  <Button size="sm" variant="ghost" onClick={() => deleteDoubt(d)} className="text-destructive hover:text-destructive">
                    <Trash2 className="w-3.5 h-3.5" />
                  </Button>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}

      <Dialog open={!!responding} onOpenChange={(o) => !o && setResponding(null)}>
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle className="font-display">Responder dúvida</DialogTitle>
          </DialogHeader>
          {responding && (
            <div className="space-y-3">
              <div className="text-sm text-muted-foreground break-words">
                <strong>{responding.student_name}</strong> — {responding.exam_title}
                {responding.question_number ? ` · Questão ${responding.question_number}` : ""}
              </div>
              <div className="text-sm bg-muted/40 rounded p-2 break-words whitespace-normal">
                {responding.doubt_text}
              </div>
              <div>
                <Label htmlFor="resp">Sua resposta</Label>
                <Textarea
                  id="resp"
                  rows={6}
                  value={responseText}
                  onChange={(e) => setResponseText(e.target.value)}
                  placeholder="Digite a resposta para o aluno..."
                />
              </div>
            </div>
          )}
          <DialogFooter>
            <Button variant="ghost" onClick={() => setResponding(null)}>Cancelar</Button>
            <Button onClick={saveResponse} disabled={saving} className="gradient-primary text-primary-foreground">
              {saving ? "Enviando..." : "Enviar resposta"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
