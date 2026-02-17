import { useState, useEffect } from "react";
import { useAuth } from "@/contexts/AuthContext";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";
import { useToast } from "@/hooks/use-toast";
import { CheckCircle, XCircle, ArrowRight, RotateCcw, Trophy, BookOpen, ClipboardList, Clock, Target } from "lucide-react";
import quizBanner from "@/assets/quiz-banner.png";

interface Question {
  id: string;
  question_text: string;
  option_a: string;
  option_b: string;
  option_c: string;
  option_d: string;
  correct_option: string;
  image_url: string | null;
}

type QuizState = "idle" | "playing" | "finished";

export default function QuizPage() {
  const { user } = useAuth();
  const { toast } = useToast();
  const [questions, setQuestions] = useState<Question[]>([]);
  const [currentIndex, setCurrentIndex] = useState(0);
  const [selectedOption, setSelectedOption] = useState<string | null>(null);
  const [answered, setAnswered] = useState(false);
  const [score, setScore] = useState(0);
  const [state, setState] = useState<QuizState>("idle");
  const [attemptId, setAttemptId] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  const startQuiz = async () => {
    setLoading(true);
    // Fetch random 25 questions
    const { data, error } = await supabase
      .from("questions")
      .select("*")
      .limit(50);

    if (error || !data || data.length === 0) {
      toast({ title: "Erro", description: "Nenhuma pergunta disponível.", variant: "destructive" });
      setLoading(false);
      return;
    }

    // Shuffle
    const shuffled = data.sort(() => Math.random() - 0.5).slice(0, 50);
    setQuestions(shuffled);

    // Create attempt
    const { data: attempt, error: attemptError } = await supabase
      .from("quiz_attempts")
      .insert({ user_id: user!.id, total_questions: shuffled.length })
      .select()
      .single();

    if (attemptError) {
      toast({ title: "Erro ao iniciar quiz", description: attemptError.message, variant: "destructive" });
      setLoading(false);
      return;
    }

    setAttemptId(attempt.id);
    setCurrentIndex(0);
    setScore(0);
    setSelectedOption(null);
    setAnswered(false);
    setState("playing");
    setLoading(false);
  };

  const handleAnswer = async (option: string) => {
    if (answered) return;
    setSelectedOption(option);
    setAnswered(true);

    const question = questions[currentIndex];
    const isCorrect = option === question.correct_option;
    if (isCorrect) setScore((s) => s + 1);

    // Save answer
    await supabase.from("quiz_answers").insert({
      attempt_id: attemptId,
      question_id: question.id,
      selected_option: option,
      is_correct: isCorrect,
    });
  };

  const nextQuestion = async () => {
    if (currentIndex + 1 >= questions.length) {
      // Finish quiz
      const finalScore = score;
      await supabase
        .from("quiz_attempts")
        .update({ score: finalScore, completed_at: new Date().toISOString() })
        .eq("id", attemptId);
      setState("finished");
    } else {
      setCurrentIndex((i) => i + 1);
      setSelectedOption(null);
      setAnswered(false);
    }
  };

  const currentQuestion = questions[currentIndex];
  const progress = questions.length > 0 ? ((currentIndex + (answered ? 1 : 0)) / questions.length) * 100 : 0;

  if (state === "idle") {
    return (
      <div className="min-h-[70vh] flex items-center justify-center px-4">
        <Card className="w-full max-w-2xl shadow-elevated animate-fade-in overflow-hidden">
          <div className="w-full">
            <img
              src={quizBanner}
              alt="Banner do Simulado"
              className="w-full h-48 sm:h-56 md:h-64 object-cover"
            />
          </div>
          <CardHeader className="text-center pt-6 pb-2">
            <CardTitle className="font-display text-2xl sm:text-3xl">
              Simulado Focus
            </CardTitle>
            <p className="text-muted-foreground mt-2 text-sm sm:text-base">
              Teste seus conhecimentos com questões selecionadas para reforçar seu aprendizado.
            </p>
          </CardHeader>
          <CardContent className="space-y-6 pb-8">
            <div className="grid grid-cols-3 gap-3 text-center">
              <div className="flex flex-col items-center gap-1.5 p-3 rounded-xl bg-secondary">
                <ClipboardList className="w-5 h-5 text-primary" />
                <span className="text-xs text-muted-foreground">Questões</span>
                <span className="font-display font-bold text-foreground">50</span>
              </div>
              <div className="flex flex-col items-center gap-1.5 p-3 rounded-xl bg-secondary">
                <Target className="w-5 h-5 text-primary" />
                <span className="text-xs text-muted-foreground">Tipo</span>
                <span className="font-display font-bold text-foreground">Múltipla</span>
              </div>
              <div className="flex flex-col items-center gap-1.5 p-3 rounded-xl bg-secondary">
                <Clock className="w-5 h-5 text-primary" />
                <span className="text-xs text-muted-foreground">Feedback</span>
                <span className="font-display font-bold text-foreground">Imediato</span>
              </div>
            </div>
            <Button
              onClick={startQuiz}
              disabled={loading}
              className="w-full gradient-primary text-primary-foreground py-6 text-lg font-display font-semibold shadow-glow"
            >
              {loading ? "Carregando..." : "Iniciar Simulado"}
              {!loading && <ArrowRight className="w-5 h-5 ml-2" />}
            </Button>
          </CardContent>
        </Card>
      </div>
    );
  }

  if (state === "finished") {
    const percentage = Math.round((score / questions.length) * 100);
    return (
      <div className="min-h-[60vh] flex items-center justify-center">
        <Card className="w-full max-w-lg shadow-elevated animate-scale-in text-center">
          <CardHeader>
            <div className="mx-auto w-20 h-20 rounded-full gradient-primary flex items-center justify-center mb-4 shadow-glow">
              <Trophy className="w-10 h-10 text-primary-foreground" />
            </div>
            <CardTitle className="font-display text-3xl">Quiz Finalizado!</CardTitle>
          </CardHeader>
          <CardContent className="space-y-6">
            <div>
              <p className="text-5xl font-bold font-display text-primary">{percentage}%</p>
              <p className="text-muted-foreground mt-2">
                Você acertou {score} de {questions.length} perguntas
              </p>
            </div>
            <Progress value={percentage} className="h-3" />
            <Button onClick={() => { setState("idle"); }} className="gradient-primary text-primary-foreground">
              <RotateCcw className="w-4 h-4 mr-2" /> Tentar Novamente
            </Button>
          </CardContent>
        </Card>
      </div>
    );
  }

  const options = [
    { key: "A", text: currentQuestion?.option_a },
    { key: "B", text: currentQuestion?.option_b },
    { key: "C", text: currentQuestion?.option_c },
    { key: "D", text: currentQuestion?.option_d },
  ];

  return (
    <div className="max-w-2xl mx-auto animate-fade-in">
      <div className="mb-6">
        <div className="flex justify-between items-center mb-2">
          <span className="text-sm font-medium text-muted-foreground">
            Pergunta {currentIndex + 1} de {questions.length}
          </span>
          <span className="text-sm font-medium text-primary">
            Acertos: {score}
          </span>
        </div>
        <Progress value={progress} className="h-2" />
      </div>

      <Card className="shadow-elevated mb-6">
        <CardHeader>
          <CardTitle className="font-display text-xl leading-relaxed">
            {currentQuestion?.question_text}
          </CardTitle>
          {currentQuestion?.image_url && (
            <img
              src={currentQuestion.image_url}
              alt="Imagem da questão"
              className="mt-3 rounded-lg w-full max-h-64 object-contain bg-muted"
            />
          )}
        </CardHeader>
        <CardContent className="space-y-3">
          {options.map((opt) => {
            const isSelected = selectedOption === opt.key;
            const isCorrect = opt.key === currentQuestion?.correct_option;
            let variant = "outline" as "outline" | "default" | "destructive";
            let extraClass = "w-full justify-start text-left h-auto py-3 px-4 text-base transition-all ";

            if (answered) {
              if (isCorrect) {
                extraClass += "border-success bg-success/10 text-success";
              } else if (isSelected && !isCorrect) {
                extraClass += "border-destructive bg-destructive/10 text-destructive";
              }
            } else {
              extraClass += "hover:border-primary hover:bg-primary/5";
            }

            return (
              <Button
                key={opt.key}
                variant={variant}
                className={extraClass}
                onClick={() => handleAnswer(opt.key)}
                disabled={answered}
              >
                <span className="inline-flex items-center justify-center w-8 h-8 rounded-lg bg-secondary text-secondary-foreground font-bold mr-3 shrink-0">
                  {opt.key}
                </span>
                <span className="flex-1">{opt.text}</span>
                {answered && isCorrect && <CheckCircle className="w-5 h-5 text-success ml-2 shrink-0" />}
                {answered && isSelected && !isCorrect && <XCircle className="w-5 h-5 text-destructive ml-2 shrink-0" />}
              </Button>
            );
          })}
        </CardContent>
      </Card>

      {answered && (
        <div className="flex justify-end animate-fade-in">
          <Button onClick={nextQuestion} className="gradient-primary text-primary-foreground">
            {currentIndex + 1 >= questions.length ? "Ver Resultado" : "Próxima"}
            <ArrowRight className="w-4 h-4 ml-2" />
          </Button>
        </div>
      )}
    </div>
  );
}
