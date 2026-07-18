import { useState, useEffect, useMemo } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";
import { useToast } from "@/hooks/use-toast";
import { normalizeQuestionText } from "@/lib/utils";
import {
  AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent,
  AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger,
} from "@/components/ui/alert-dialog";
import { ArrowRight, ArrowLeft, Trophy, Eye, EyeOff, CheckCircle, XCircle, Home, RotateCcw } from "lucide-react";
import QuestionVideo from "@/components/QuestionVideo";

const POINTS_PER_ITEM = 0.52;

interface TeaQ {
  id: string;
  question_text: string;
  image_url: string | null;
  video_url: string | null;
  comment: string | null;
  comment_image_url: string | null;
  sub1_text: string; sub1_answer_key: string; sub1_image_url: string | null;
  sub2_text: string; sub2_answer_key: string; sub2_image_url: string | null;
  sub3_text: string; sub3_answer_key: string; sub3_image_url: string | null;
}
interface Exam { id: string; title: string; password: string; is_active: boolean; }
type State = "playing" | "finished" | "error" | "loading";

type SubKey = "s1" | "s2" | "s3";
type CheckState = { s1: boolean | null; s2: boolean | null; s3: boolean | null };
type AnsState = { s1: string; s2: string; s3: string };

const emptyAns: AnsState = { s1: "", s2: "", s3: "" };
const emptyCheck: CheckState = { s1: null, s2: null, s3: null };

export default function TeaExamPage() {
  const { id: examId } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { user } = useAuth();
  const { toast } = useToast();
  const [exam, setExam] = useState<Exam | null>(null);
  const [questions, setQuestions] = useState<TeaQ[]>([]);
  const [state, setState] = useState<State>("loading");
  const [current, setCurrent] = useState(0);
  const [answers, setAnswers] = useState<Record<string, AnsState>>({});
  const [revealed, setRevealed] = useState<Record<string, boolean>>({});
  const [selfCheck, setSelfCheck] = useState<Record<string, CheckState>>({});
  const [finalScore, setFinalScore] = useState(0);

  const storageKey = useMemo(() => {
    const email = (user?.email ?? user?.id ?? "anon").toLowerCase();
    return `tea-progress::${email}::${examId}`;
  }, [user, examId]);

  useEffect(() => {
    if (!user) { navigate("/auth"); return; }
    if (!examId) return;
    (async () => {
      const { data } = await supabase.from("exams").select("*").eq("id", examId).eq("exam_type", "tea").maybeSingle();
      if (!data || !data.is_active) { setState("error"); return; }
      setExam(data as Exam);
      const { data: eq } = await supabase.from("tea_exam_questions").select("tea_question_id, question_order").eq("exam_id", data.id).order("question_order");
      const ids = (eq ?? []).map((r) => r.tea_question_id);
      if (ids.length === 0) { toast({ title: "Prova sem questões", variant: "destructive" }); setState("error"); return; }
      const { data: qs } = await supabase.from("tea_questions").select("*").in("id", ids);
      const map = new Map((qs ?? []).map((q: any) => [q.id, q]));
      const ordered = ids.map((i) => map.get(i)).filter(Boolean) as TeaQ[];
      setQuestions(ordered);

      // load saved progress
      try {
        const raw = localStorage.getItem(storageKey);
        if (raw) {
          const s = JSON.parse(raw);
          setAnswers(s.answers ?? {});
          setSelfCheck(s.selfCheck ?? {});
          setRevealed(s.revealed ?? {});
          setCurrent(Math.min(s.current ?? 0, ordered.length - 1));
        }
      } catch {}
      setState("playing");
    })();
  }, [examId, user, storageKey]);

  // Auto-save progress
  useEffect(() => {
    if (state !== "playing") return;
    try {
      localStorage.setItem(storageKey, JSON.stringify({ answers, selfCheck, revealed, current }));
    } catch {}
  }, [answers, selfCheck, revealed, current, state, storageKey]);

  const q = questions[current];
  const ans = q ? (answers[q.id] ?? emptyAns) : emptyAns;
  const check = q ? (selfCheck[q.id] ?? emptyCheck) : emptyCheck;

  const setAns = (k: SubKey, v: string) => setAnswers((a) => ({ ...a, [q.id]: { ...(a[q.id] ?? emptyAns), [k]: v } }));
  const toggleReveal = () => setRevealed((r) => ({ ...r, [q.id]: !r[q.id] }));
  const setCheck = (k: SubKey, v: boolean) => setSelfCheck((c) => ({ ...c, [q.id]: { ...(c[q.id] ?? emptyCheck), [k]: v } }));

  const { correctCount, answeredCount, currentEarned } = useMemo(() => {
    let correct = 0, answered = 0;
    Object.values(selfCheck).forEach((c) => {
      (["s1", "s2", "s3"] as SubKey[]).forEach((k) => {
        if (c[k] === true) { correct++; answered++; }
        else if (c[k] === false) { answered++; }
      });
    });
    let cur = 0;
    (["s1", "s2", "s3"] as SubKey[]).forEach((k) => { if (check[k] === true) cur++; });
    return { correctCount: correct, answeredCount: answered, currentEarned: cur };
  }, [selfCheck, check]);

  const totalItems = questions.length * 3;
  const currentScore = +(correctCount * POINTS_PER_ITEM).toFixed(2);
  const maxScore = +(totalItems * POINTS_PER_ITEM).toFixed(2);
  const currentPct = totalItems ? (correctCount / totalItems) * 100 : 0;

  const resetProgress = () => {
    localStorage.removeItem(storageKey);
    setAnswers({}); setSelfCheck({}); setRevealed({}); setCurrent(0);
    toast({ title: "Progresso removido", description: "Você começou a prova do zero." });
  };

  const finish = async () => {
    let correct = 0;
    questions.forEach((qq) => {
      const c = selfCheck[qq.id] ?? emptyCheck;
      if (c.s1 === true) correct++; if (c.s2 === true) correct++; if (c.s3 === true) correct++;
    });
    const score = +(correct * POINTS_PER_ITEM).toFixed(2);
    setFinalScore(score);
    try {
      const { data: attempt } = await supabase.from("tea_attempts").insert({
        user_id: user!.id, exam_id: exam!.id, total_items: totalItems,
        correct_items: correct, score, completed_at: new Date().toISOString(),
      }).select().single();
      if (attempt?.id) {
        const rows = questions.flatMap((qq) => {
          const a = answers[qq.id] ?? emptyAns;
          const c = selfCheck[qq.id] ?? emptyCheck;
          return [1, 2, 3].map((n) => ({
            attempt_id: attempt.id,
            tea_question_id: qq.id,
            sub_index: n,
            student_answer: (a as any)["s" + n] || null,
            is_correct: (c as any)["s" + n] === true,
          }));
        });
        if (rows.length) await supabase.from("tea_answers").insert(rows);
      }
    } catch {}
    localStorage.removeItem(storageKey);
    setState("finished");
  };

  if (state === "loading") return <div className="min-h-screen flex items-center justify-center text-muted-foreground">Carregando...</div>;
  if (state === "error") return (
    <div className="min-h-screen flex items-center justify-center p-4">
      <Card><CardContent className="py-8 text-center"><p>Prova não encontrada ou indisponível.</p><Button onClick={() => navigate("/")} className="mt-4">Voltar</Button></CardContent></Card>
    </div>
  );

  if (state === "finished") {
    const pct = totalItems ? (finalScore / maxScore) * 100 : 0;
    return (
      <div className="min-h-screen flex items-center justify-center p-4">
        <Card className="w-full max-w-lg text-center">
          <CardHeader>
            <div className="mx-auto w-16 h-16 rounded-full gradient-primary flex items-center justify-center mb-2"><Trophy className="w-8 h-8 text-primary-foreground" /></div>
            <CardTitle className="font-display text-2xl">Prova finalizada!</CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            <p className="text-5xl font-display font-bold text-primary">{pct.toFixed(1)}%</p>
            <p className="text-sm text-muted-foreground">
              {finalScore.toFixed(2)} de {maxScore.toFixed(2)} pontos
            </p>
            <Progress value={pct} className="h-3" />
            <Button onClick={() => navigate("/")} className="gradient-primary text-primary-foreground mt-2"><Home className="w-4 h-4 mr-2" /> Voltar</Button>
          </CardContent>
        </Card>
      </div>
    );
  }

  const progress = ((current + 1) / questions.length) * 100;
  const isRevealed = !!revealed[q.id];

  return (
    <div className="min-h-screen p-4 pb-24">
      <div className="max-w-3xl mx-auto space-y-4">
        <div className="flex flex-wrap items-center justify-between gap-2">
          <span className="text-sm text-muted-foreground">Questão {current + 1} de {questions.length}</span>
          <div className="flex items-center gap-2">
            <span className="text-xs px-2 py-1 rounded bg-secondary text-secondary-foreground">
              {currentScore.toFixed(2)} / {maxScore.toFixed(2)} pts · {currentPct.toFixed(1)}%
            </span>
            <AlertDialog>
              <AlertDialogTrigger asChild>
                <Button size="sm" variant="outline"><RotateCcw className="w-4 h-4 mr-1" /> Reiniciar</Button>
              </AlertDialogTrigger>
              <AlertDialogContent>
                <AlertDialogHeader>
                  <AlertDialogTitle>Remover progresso desta prova?</AlertDialogTitle>
                  <AlertDialogDescription>
                    Suas respostas e marcações (Acertei/Errei) serão apagadas e a prova voltará à primeira questão.
                  </AlertDialogDescription>
                </AlertDialogHeader>
                <AlertDialogFooter>
                  <AlertDialogCancel>Cancelar</AlertDialogCancel>
                  <AlertDialogAction onClick={resetProgress}>Reiniciar do zero</AlertDialogAction>
                </AlertDialogFooter>
              </AlertDialogContent>
            </AlertDialog>
          </div>
        </div>
        <Progress value={progress} className="h-2" />

        <Card>
          <CardHeader>
            <CardTitle className="text-lg leading-relaxed whitespace-pre-wrap break-words">
              {normalizeQuestionText(q.question_text)}
            </CardTitle>
            {q.image_url && <img src={q.image_url} alt="" className="mt-3 rounded max-h-80 object-contain bg-muted" />}
            {q.video_url && <QuestionVideo src={q.video_url} />}
          </CardHeader>
        </Card>

        {[1, 2, 3].map((n) => {
          const k = ("s" + n) as SubKey;
          const subText = (q as any)[`sub${n}_text`] as string;
          const subKey = (q as any)[`sub${n}_answer_key`] as string;
          const subImg = (q as any)[`sub${n}_image_url`] as string | null;
          const marked = check[k];
          return (
            <Card key={n} className="border-primary/30">
              <CardHeader className="pb-2">
                <CardTitle className="text-base flex items-center justify-between">
                  <span>Pergunta {n}</span>
                  {marked === true && <span className="text-xs font-normal text-success">+{POINTS_PER_ITEM.toFixed(2)} pt</span>}
                  {marked === false && <span className="text-xs font-normal text-destructive">0 pt</span>}
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-3">
                <p className="text-sm whitespace-pre-wrap">{normalizeQuestionText(subText)}</p>
                {subImg && <img src={subImg} alt="" className="rounded max-h-64 object-contain bg-muted" />}
                <Textarea rows={4} placeholder="Sua resposta..." value={ans[k]} onChange={(e) => setAns(k, e.target.value)} />
                {isRevealed && (
                  <div className="rounded-lg border bg-secondary/40 p-3 space-y-2">
                    <p className="text-xs font-semibold text-primary">Gabarito</p>
                    <p className="text-sm whitespace-pre-wrap">{normalizeQuestionText(subKey)}</p>
                    <div className="flex gap-2 pt-1">
                      <Button
                        size="sm"
                        variant={marked === true ? "default" : "outline"}
                        onClick={() => setCheck(k, true)}
                        className={marked === true ? "bg-success hover:bg-success text-white" : ""}
                      >
                        <CheckCircle className="w-4 h-4 mr-1" /> Acertei
                      </Button>
                      <Button
                        size="sm"
                        variant={marked === false ? "destructive" : "outline"}
                        onClick={() => setCheck(k, false)}
                      >
                        <XCircle className="w-4 h-4 mr-1" /> Errei
                      </Button>
                    </div>
                  </div>
                )}
              </CardContent>
            </Card>
          );
        })}

        <div className="flex items-center justify-between gap-2">
          <Button variant="outline" onClick={toggleReveal}>
            {isRevealed ? <><EyeOff className="w-4 h-4 mr-1" /> Ocultar gabarito</> : <><Eye className="w-4 h-4 mr-1" /> Ver gabarito</>}
          </Button>
          <span className="text-xs text-muted-foreground">
            Nesta questão: {currentEarned} de 3 · {(currentEarned * POINTS_PER_ITEM).toFixed(2)} pt
          </span>
        </div>
        {isRevealed && q.comment && (
          <p className="text-xs text-muted-foreground italic">💡 {normalizeQuestionText(q.comment)}</p>
        )}
        {isRevealed && q.comment_image_url && <img src={q.comment_image_url} alt="" className="rounded max-h-80 object-contain bg-muted" />}

        <div className="flex items-center justify-between pt-2">
          <Button variant="ghost" disabled={current === 0} onClick={() => setCurrent((c) => c - 1)}>
            <ArrowLeft className="w-4 h-4 mr-1" /> Anterior
          </Button>
          {current < questions.length - 1 ? (
            <Button className="gradient-primary text-primary-foreground" onClick={() => setCurrent((c) => c + 1)}>
              Próxima <ArrowRight className="w-4 h-4 ml-1" />
            </Button>
          ) : (
            <Button className="gradient-primary text-primary-foreground" onClick={finish}>
              Finalizar prova
            </Button>
          )}
        </div>
      </div>
    </div>
  );
}
