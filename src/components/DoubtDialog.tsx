import { useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useToast } from "@/hooks/use-toast";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { MessageCircleQuestion, Send } from "lucide-react";

interface DoubtDialogProps {
  questionId: string;
  examId?: string | null;
  attemptId?: string | null;
  examTitle: string;
  questionNumber: number;
  questionTextSnapshot: string;
  defaultName?: string;
  defaultEmail?: string;
  size?: "sm" | "default";
  variant?: "ghost" | "outline" | "secondary";
  className?: string;
  label?: string;
}

export default function DoubtDialog({
  questionId,
  examId,
  attemptId,
  examTitle,
  questionNumber,
  questionTextSnapshot,
  defaultName = "",
  defaultEmail = "",
  size = "sm",
  variant = "outline",
  className,
  label = "Enviar Dúvida",
}: DoubtDialogProps) {
  const { user } = useAuth();
  const { toast } = useToast();
  const [open, setOpen] = useState(false);
  const [text, setText] = useState("");
  const [name, setName] = useState(defaultName);
  const [email, setEmail] = useState(defaultEmail);
  const [sending, setSending] = useState(false);

  const submit = async () => {
    if (!text.trim()) {
      toast({ title: "Escreva sua dúvida antes de enviar.", variant: "destructive" });
      return;
    }
    if (!user && !name.trim()) {
      toast({ title: "Informe seu nome.", variant: "destructive" });
      return;
    }
    setSending(true);
    const { error } = await supabase.from("question_doubts").insert({
      question_id: questionId,
      exam_id: examId || null,
      attempt_id: attemptId || null,
      user_id: user?.id ?? null,
      student_name: user?.user_metadata?.full_name || user?.email?.split("@")[0] || name.trim(),
      student_email: user?.email ?? (email.trim() || null),
      exam_title: examTitle,
      question_number: questionNumber,
      question_text_snapshot: questionTextSnapshot.slice(0, 2000),
      doubt_text: text.trim(),
    });
    setSending(false);
    if (error) {
      toast({ title: "Erro ao enviar dúvida", description: error.message, variant: "destructive" });
      return;
    }
    toast({ title: "Dúvida enviada!", description: "A equipe responderá em breve." });
    setText("");
    setOpen(false);
  };

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button variant={variant} size={size} className={className}>
          <MessageCircleQuestion className="w-4 h-4 mr-1.5" />
          {label}
        </Button>
      </DialogTrigger>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle className="font-display">Enviar dúvida</DialogTitle>
          <DialogDescription>
            Questão {questionNumber} — {examTitle}
          </DialogDescription>
        </DialogHeader>
        <div className="space-y-3">
          {!user && (
            <>
              <div>
                <Label htmlFor="d-name">Seu nome *</Label>
                <Input id="d-name" value={name} onChange={(e) => setName(e.target.value)} />
              </div>
              <div>
                <Label htmlFor="d-email">E-mail (opcional)</Label>
                <Input id="d-email" type="email" value={email} onChange={(e) => setEmail(e.target.value)} />
              </div>
            </>
          )}
          <div>
            <Label htmlFor="d-text">Sua dúvida *</Label>
            <Textarea
              id="d-text"
              value={text}
              onChange={(e) => setText(e.target.value)}
              rows={5}
              placeholder="Descreva sua dúvida sobre esta questão..."
              maxLength={2000}
            />
            <p className="text-xs text-muted-foreground mt-1">{text.length}/2000</p>
          </div>
        </div>
        <DialogFooter>
          <Button variant="ghost" onClick={() => setOpen(false)}>Cancelar</Button>
          <Button onClick={submit} disabled={sending} className="gradient-primary text-primary-foreground">
            <Send className="w-4 h-4 mr-1.5" />
            {sending ? "Enviando..." : "Enviar"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
