import { useState, useEffect, useRef } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";
import { useToast } from "@/hooks/use-toast";
import { normalizeQuestionText } from "@/lib/utils";
import { Clock, Trophy, Lock, ArrowLeft, ArrowRight, Send, Volume2, VolumeX } from "lucide-react";
import QuestionVideo from "@/components/QuestionVideo";
import logoAsset from "@/assets/aumakua-logo.jpeg.asset.json";
import coverBg from "@/assets/simulado-atf-cover.jpeg.asset.json";
import ambientMusic from "@/assets/simulado-atf-music.mp3.asset.json";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog";

const EXAM_ID = "3599ded6-c8da-4a34-837f-6a95a38b7e1a"; // ATF I
const DURATION = 4 * 60 * 60; // 4 horas
// 13/09 08:00 (horário de Brasília, UTC-3) = 11:00 UTC
const RELEASE_AT = new Date("2026-09-13T11:00:00Z");

interface Question {
  id: string;
  question_text: string;
  option_a: string;
  option_b: string;
  option_c: string;
  option_d: string;
  correct_option: string;
  image_url: string | null;
  video_url: string | null;
}

type State = "cover" | "playing" | "finished" | "error";

export default function SimuladoAtfPage() {
  const { toast } = useToast();
  const [state, setState] = useState<State>("cover");
  const [now, setNow] = useState(new Date());
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [questions, setQuestions] = useState<Question[]>([]);
  const [answers, setAnswers] = useState<Record<string, string>>({});
  const [currentIndex, setCurrentIndex] = useState(0);
  const [attemptId, setAttemptId] = useState<string | null>(null);
  const [timeLeft, setTimeLeft] = useState(DURATION);
  const [starting, setStarting] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [score, setScore] = useState(0);
  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const autoSubmitRef = useRef(false);
  const audioRef = useRef<HTMLAudioElement | null>(null);
  const [musicOn, setMusicOn] = useState(false);

  const toggleMusic = () => {
    if (!audioRef.current) {
      audioRef.current = new Audio(ambientMusic.url);
      audioRef.current.loop = true;
      audioRef.current.volume = 0.5;
    }
    if (musicOn) {
      audioRef.current.pause();
      setMusicOn(false);
    } else {
      audioRef.current.play().then(() => setMusicOn(true)).catch(() => {
        toast({ title: "Toque novamente para ativar o som", variant: "destructive" });
      });
    }
  };


  // Relógio para liberar automaticamente no horário
  useEffect(() => {
    const i = setInterval(() => setNow(new Date()), 1000);
    return () => clearInterval(i);
  }, []);

  const released = now >= RELEASE_AT;

  useEffect(() => {
    if (state !== "playing") {
      if (timerRef.current) clearInterval(timerRef.current);
      return;
    }
    timerRef.current = setInterval(() => {
      setTimeLeft((prev) => {
        if (prev <= 1) {
          clearInterval(timerRef.current!);
          autoSubmitRef.current = true;
          return 0;
        }
        return prev - 1;
      });
    }, 1000);
    return () => {
      if (timerRef.current) clearInterval(timerRef.current);
    };
  }, [state]);

  useEffect(() => {
    if (autoSubmitRef.current && timeLeft === 0 && state === "playing") {
      autoSubmitRef.current = false;
      finish(true);
    }
  }, [timeLeft, state]);

  const formatTime = (s: number) => {
    const h = Math.floor(s / 3600);
    const m = Math.floor((s % 3600) / 60);
    const sec = s % 60;
    return `${h.toString().padStart(2, "0")}:${m.toString().padStart(2, "0")}:${sec
      .toString()
      .padStart(2, "0")}`;
  };

  const countdownToRelease = () => {
    const diff = Math.max(0, Math.floor((RELEASE_AT.getTime() - now.getTime()) / 1000));
    const d = Math.floor(diff / 86400);
    const h = Math.floor((diff % 86400) / 3600);
    const m = Math.floor((diff % 3600) / 60);
    const s = diff % 60;
    return `${d}d ${h.toString().padStart(2, "0")}h ${m.toString().padStart(2, "0")}m ${s
      .toString()
      .padStart(2, "0")}s`;
  };

  const start = async () => {
    if (!released) return;
    if (!name.trim()) {
      toast({ title: "Digite seu nome completo.", variant: "destructive" });
      return;
    }
    if (!email.trim()) {
      toast({ title: "Digite seu e-mail.", variant: "destructive" });
      return;
    }
    setStarting(true);

    const { data: eqData } = await supabase
      .from("exam_questions")
      .select("question_id, sort_order")
      .eq("exam_id", EXAM_ID)
      .order("sort_order");

    if (!eqData || eqData.length === 0) {
      setStarting(false);
      setState("error");
      return;
    }

    const ids = eqData.map((e) => e.question_id);
    const { data: qData } = await supabase.from("questions").select("*").in("id", ids);
    if (!qData) {
      setStarting(false);
      setState("error");
      return;
    }

    const orderMap = new Map(eqData.map((e) => [e.question_id, e.sort_order]));
    const sorted = qData
      .sort((a, b) => (orderMap.get(a.id) || 0) - (orderMap.get(b.id) || 0))
      .map((q) => ({
        ...q,
        question_text: normalizeQuestionText(q.question_text),
        option_a: normalizeQuestionText(q.option_a),
        option_b: normalizeQuestionText(q.option_b),
        option_c: normalizeQuestionText(q.option_c),
        option_d: normalizeQuestionText(q.option_d),
      })) as Question[];

    const { data: attempt, error } = await supabase
      .from("quiz_attempts")
      .insert({
        total_questions: sorted.length,
        exam_id: EXAM_ID,
        guest_name: name.trim(),
        guest_email: email.trim(),
      })
      .select()
      .single();

    if (error || !attempt) {
      setStarting(false);
      toast({ title: "Erro ao iniciar a prova", description: error?.message, variant: "destructive" });
      return;
    }

    setQuestions(sorted);
    setAttemptId(attempt.id);
    setTimeLeft(DURATION);
    setCurrentIndex(0);
    setState("playing");
    setStarting(false);
  };

  const finish = async (auto = false) => {
    if (submitting) return;
    setSubmitting(true);
    let total = 0;
    const rows = questions.map((q) => {
      const selected = answers[q.id] || null;
      const isCorrect = !!selected && selected === q.correct_option;
      if (isCorrect) total++;
      return {
        attempt_id: attemptId!,
        question_id: q.id,
        selected_option: selected,
        is_correct: isCorrect,
      };
    });

    await supabase.from("quiz_answers").insert(rows);
    await supabase
      .from("quiz_attempts")
      .update({ score: total, completed_at: new Date().toISOString() })
      .eq("id", attemptId);

    setScore(total);
    setState("finished");
    setSubmitting(false);
    if (auto) toast({ title: "Tempo esgotado! Prova enviada automaticamente." });
  };

  if (state === "error") {
    return (
      <div className="min-h-screen flex items-center justify-center p-4">
        <Card className="w-full max-w-md text-center">
          <CardHeader>
            <CardTitle className="font-display text-xl">Simulado indisponível</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-muted-foreground">Não foi possível carregar as questões. Tente novamente mais tarde.</p>
          </CardContent>
        </Card>
      </div>
    );
  }

  if (state === "cover") {
    return (
      <div
        className="min-h-screen flex items-center justify-center p-4 bg-cover bg-center bg-fixed"
        style={{ backgroundImage: `url(${coverBg.url})` }}
      >
        <div className="absolute inset-0 bg-background/85" />
        <Button
          variant="secondary"
          size="icon"
          onClick={toggleMusic}
          title={musicOn ? "Desligar música" : "Ligar música"}
          className="absolute top-4 right-4 z-10 rounded-full shadow-elevated"
        >
          {musicOn ? <Volume2 className="w-5 h-5" /> : <VolumeX className="w-5 h-5" />}
        </Button>
        <Card className="relative w-full max-w-lg shadow-elevated animate-fade-in">
          <CardHeader className="text-center">
            <img
              src={logoAsset.url}
              alt="Aumakua"
              className="mx-auto w-24 h-24 rounded-2xl object-cover mb-4 shadow-glow"
            />
            <CardTitle className="font-display text-2xl">Simulado Aumakua — ATF I</CardTitle>
            <p className="text-muted-foreground mt-2">
              100 questões · 4 horas de duração · 13/09 às 08:00 (horário de Brasília)
            </p>
          </CardHeader>
          <CardContent className="space-y-4">
            {!released ? (
              <div className="text-center rounded-xl border border-border bg-muted/40 p-6">
                <Lock className="w-8 h-8 mx-auto mb-3 text-muted-foreground" />
                <p className="font-medium">A prova ainda não está liberada</p>
                <p className="text-sm text-muted-foreground mt-1">Abertura em</p>
                <p className="font-display text-xl mt-1">{countdownToRelease()}</p>
              </div>
            ) : (
              <>
                <div>
                  <Label htmlFor="nome">Nome completo *</Label>
                  <Input id="nome" value={name} onChange={(e) => setName(e.target.value)} placeholder="Seu nome completo" />
                </div>
                <div>
                  <Label htmlFor="mail">E-mail *</Label>
                  <Input id="mail" type="email" value={email} onChange={(e) => setEmail(e.target.value)} placeholder="seu@email.com" />
                </div>
                <Button onClick={start} disabled={starting} className="w-full gradient-primary text-primary-foreground">
                  {starting ? "Iniciando..." : "Iniciar Prova"}
                </Button>
                <p className="text-xs text-muted-foreground text-center">
                  Ao iniciar, o cronômetro de 4 horas começa a contar e não pode ser pausado.
                </p>
              </>
            )}
          </CardContent>
        </Card>
      </div>
    );
  }

  if (state === "finished") {
    const percentage = Math.round((score / (questions.length || 1)) * 100);
    return (
      <div className="min-h-screen flex items-center justify-center p-4">
        <Card className="w-full max-w-md text-center shadow-elevated animate-fade-in">
          <CardContent className="pt-8 pb-6">
            <Trophy className="w-12 h-12 mx-auto text-primary mb-3" />
            <p className="text-muted-foreground">Prova finalizada, {name}!</p>
            <p className="text-5xl font-bold font-display text-primary my-3">
              {score}/{questions.length}
            </p>
            <Progress value={percentage} className="h-3 mb-3" />
            <p className="text-muted-foreground">Sua nota: {percentage}%</p>
            <p className="text-xs text-muted-foreground mt-4">
              O resultado foi registrado e enviado à coordenação.
            </p>
          </CardContent>
        </Card>
      </div>
    );
  }

  // playing
  const q = questions[currentIndex];
  const selected = answers[q.id];
  const answeredCount = questions.filter((qq) => answers[qq.id]).length;
  const allAnswered = answeredCount === questions.length;
  const options = [
    { key: "A", text: q.option_a },
    { key: "B", text: q.option_b },
    { key: "C", text: q.option_c },
    { key: "D", text: q.option_d },
  ];

  return (
    <div className="min-h-screen p-4 md:p-8">
      <div className="max-w-2xl mx-auto animate-fade-in">
        <div className="flex items-center justify-between gap-3 mb-4 flex-wrap">
          <div className="text-sm text-muted-foreground">
            Questão {currentIndex + 1} de {questions.length} · {answeredCount} respondidas
          </div>
          <div
            className={`flex items-center gap-2 font-display text-lg ${
              timeLeft < 300 ? "text-destructive animate-pulse" : "text-primary"
            }`}
          >
            <Clock className="w-5 h-5" />
            {formatTime(timeLeft)}
          </div>
        </div>

        <Progress value={(answeredCount / questions.length) * 100} className="h-2 mb-4" />

        <div className="flex flex-wrap gap-1.5 mb-4">
          {questions.map((qq, i) => (
            <button
              key={qq.id}
              onClick={() => setCurrentIndex(i)}
              className={`w-8 h-8 rounded-md text-xs font-bold transition-all ${
                i === currentIndex ? "ring-2 ring-primary " : ""
              }${answers[qq.id] ? "bg-primary/20 text-primary" : "bg-muted text-muted-foreground"}`}
            >
              {i + 1}
            </button>
          ))}
        </div>

        <Card className="shadow-elevated mb-6">
          <CardHeader>
            <CardTitle className="font-display text-lg leading-relaxed break-words whitespace-pre-wrap">
              {q.question_text}
            </CardTitle>
            {q.image_url && (
              <img
                src={q.image_url}
                alt="Imagem da questão"
                className="mt-3 rounded-lg w-full max-h-72 object-contain bg-muted"
              />
            )}
            {q.video_url && <QuestionVideo key={q.id} src={q.video_url} />}
          </CardHeader>
          <CardContent className="space-y-3">
            {options.map((opt) => (
              <Button
                key={opt.key}
                variant="outline"
                onClick={() => setAnswers((prev) => ({ ...prev, [q.id]: opt.key }))}
                className={`w-full justify-start text-left h-auto py-3 px-4 text-base break-words whitespace-normal max-w-full ${
                  selected === opt.key ? "border-primary bg-primary/10 text-primary" : ""
                }`}
              >
                <span className="font-bold mr-2">{opt.key}.</span>
                {opt.text}
              </Button>
            ))}
          </CardContent>
        </Card>

        <div className="flex items-center justify-between gap-3">
          <Button
            variant="outline"
            onClick={() => setCurrentIndex((i) => Math.max(0, i - 1))}
            disabled={currentIndex === 0}
          >
            <ArrowLeft className="w-4 h-4 mr-1" /> Anterior
          </Button>

          {currentIndex < questions.length - 1 ? (
            <Button onClick={() => setCurrentIndex((i) => Math.min(questions.length - 1, i + 1))}>
              Próxima <ArrowRight className="w-4 h-4 ml-1" />
            </Button>
          ) : (
            <span />
          )}
        </div>

        {allAnswered && (
          <AlertDialog>
            <AlertDialogTrigger asChild>
              <Button className="w-full mt-6 gradient-primary text-primary-foreground" disabled={submitting}>
                <Send className="w-4 h-4 mr-2" /> Finalizar Prova
              </Button>
            </AlertDialogTrigger>
            <AlertDialogContent>
              <AlertDialogHeader>
                <AlertDialogTitle>Finalizar a prova?</AlertDialogTitle>
                <AlertDialogDescription>
                  Depois de finalizar não é possível alterar suas respostas.
                </AlertDialogDescription>
              </AlertDialogHeader>
              <AlertDialogFooter>
                <AlertDialogCancel>Voltar</AlertDialogCancel>
                <AlertDialogAction onClick={() => finish(false)}>Finalizar</AlertDialogAction>
              </AlertDialogFooter>
            </AlertDialogContent>
          </AlertDialog>
        )}
      </div>
    </div>
  );
}
