import { useEffect, useMemo, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Textarea } from "@/components/ui/textarea";
import { Accordion, AccordionItem, AccordionTrigger, AccordionContent } from "@/components/ui/accordion";
import { useToast } from "@/hooks/use-toast";
import { CheckCircle2, Circle, FileDown, Loader2, PlayCircle, Send, MessageCircleQuestion } from "lucide-react";

type Module = { id: string; title: string; description: string | null; sort_order: number };
type Lesson = { id: string; module_id: string; title: string; description: string | null; video_path: string; pdf_path: string | null; pdf_name: string | null; sort_order: number };
type Doubt = { id: string; lesson_id: string | null; doubt_text: string; admin_response: string | null; created_at: string };

export default function VideoaulasPage() {
  const { user } = useAuth();
  const { toast } = useToast();
  const [modules, setModules] = useState<Module[]>([]);
  const [lessons, setLessons] = useState<Lesson[]>([]);
  const [watched, setWatched] = useState<Set<string>>(new Set());
  const [current, setCurrent] = useState<Lesson | null>(null);
  const [videoUrl, setVideoUrl] = useState<string | null>(null);
  const [doubts, setDoubts] = useState<Doubt[]>([]);
  const [doubtText, setDoubtText] = useState("");
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    (async () => {
      const [m, l, p] = await Promise.all([
        supabase.from("video_modules").select("*").order("sort_order").order("title"),
        supabase.from("video_lessons").select("*").order("sort_order").order("created_at"),
        user ? supabase.from("video_progress").select("lesson_id").eq("user_id", user.id) : Promise.resolve({ data: [] as any[] }),
      ]);
      setModules((m.data as Module[]) || []);
      setLessons((l.data as Lesson[]) || []);
      setWatched(new Set(((p as any).data || []).map((r: any) => r.lesson_id)));
      setLoading(false);
    })();
  }, [user?.id]);

  const loadDoubts = async (lessonId: string) => {
    if (!user) return;
    const { data } = await supabase.from("video_doubts").select("*").eq("lesson_id", lessonId).eq("user_id", user.id).order("created_at", { ascending: false });
    setDoubts((data as Doubt[]) || []);
  };

  const openLesson = async (lesson: Lesson) => {
    setCurrent(lesson);
    setVideoUrl(null);
    const { data } = await supabase.storage.from("lesson-media").createSignedUrl(lesson.video_path, 60 * 60 * 6);
    setVideoUrl(data?.signedUrl ?? null);
    loadDoubts(lesson.id);
    window.scrollTo({ top: 0, behavior: "smooth" });
  };

  const toggleWatched = async (lessonId: string) => {
    if (!user) return;
    const next = new Set(watched);
    if (watched.has(lessonId)) {
      await supabase.from("video_progress").delete().eq("user_id", user.id).eq("lesson_id", lessonId);
      next.delete(lessonId);
    } else {
      await supabase.from("video_progress").insert({ user_id: user.id, lesson_id: lessonId });
      next.add(lessonId);
    }
    setWatched(next);
  };

  const downloadPdf = async (lesson: Lesson) => {
    if (!lesson.pdf_path) return;
    const { data } = await supabase.storage.from("lesson-media").createSignedUrl(lesson.pdf_path, 600);
    if (data?.signedUrl) window.open(data.signedUrl, "_blank");
  };

  const sendDoubt = async () => {
    if (!user || !current || !doubtText.trim()) return;
    const { error } = await supabase.from("video_doubts").insert({
      lesson_id: current.id,
      user_id: user.id,
      student_name: user.user_metadata?.full_name || user.email?.split("@")[0] || "",
      student_email: user.email ?? null,
      lesson_title: current.title,
      doubt_text: doubtText.trim().slice(0, 2000),
    });
    if (error) return toast({ title: "Erro ao enviar dúvida", description: error.message, variant: "destructive" });
    toast({ title: "Dúvida enviada!" });
    setDoubtText("");
    loadDoubts(current.id);
  };

  const byModule = useMemo(() => {
    const map: Record<string, Lesson[]> = {};
    lessons.forEach((l) => (map[l.module_id] ||= []).push(l));
    return map;
  }, [lessons]);

  if (loading) return <div className="flex justify-center py-20"><Loader2 className="w-6 h-6 animate-spin text-primary" /></div>;

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-display font-bold text-foreground">VIDEOAULAS</h1>
        <p className="text-muted-foreground mt-1">Assista às aulas por tema e acompanhe seu progresso</p>
      </div>

      {current && (
        <Card className="shadow-card">
          <CardContent className="p-4 space-y-4">
            <div className="aspect-video w-full bg-muted rounded-lg overflow-hidden flex items-center justify-center">
              {videoUrl ? (
                <video key={videoUrl} src={videoUrl} controls controlsList="nodownload" className="w-full h-full" onContextMenu={(e) => e.preventDefault()} />
              ) : (
                <Loader2 className="w-6 h-6 animate-spin text-primary" />
              )}
            </div>
            <div className="flex flex-wrap items-start justify-between gap-3">
              <div className="min-w-0">
                <h2 className="text-xl font-display font-semibold text-foreground break-words">{current.title}</h2>
                {current.description && <p className="text-muted-foreground mt-1 whitespace-pre-wrap break-words">{current.description}</p>}
              </div>
              <div className="flex gap-2 flex-wrap">
                {current.pdf_path && (
                  <Button variant="outline" size="sm" onClick={() => downloadPdf(current)}>
                    <FileDown className="w-4 h-4 mr-1" /> {current.pdf_name || "Material PDF"}
                  </Button>
                )}
                <Button size="sm" variant={watched.has(current.id) ? "secondary" : "default"} onClick={() => toggleWatched(current.id)}>
                  <CheckCircle2 className="w-4 h-4 mr-1" /> {watched.has(current.id) ? "Assistida" : "Marcar como assistida"}
                </Button>
              </div>
            </div>
            <div className="border-t border-border pt-4 space-y-3">
              <h3 className="font-semibold flex items-center gap-2 text-foreground"><MessageCircleQuestion className="w-4 h-4" /> Dúvidas sobre esta aula</h3>
              <Textarea value={doubtText} onChange={(e) => setDoubtText(e.target.value)} rows={3} maxLength={2000} placeholder="Escreva sua dúvida..." />
              <Button size="sm" onClick={sendDoubt} disabled={!doubtText.trim()}><Send className="w-4 h-4 mr-1" /> Enviar dúvida</Button>
              {doubts.map((d) => (
                <div key={d.id} className="rounded-lg border border-border p-3 text-sm space-y-2">
                  <p className="whitespace-pre-wrap break-words text-foreground">{d.doubt_text}</p>
                  {d.admin_response ? (
                    <p className="whitespace-pre-wrap break-words rounded bg-accent/30 p-2 text-foreground"><strong>Resposta:</strong> {d.admin_response}</p>
                  ) : (
                    <p className="text-muted-foreground text-xs">Aguardando resposta</p>
                  )}
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}

      {modules.length === 0 ? (
        <p className="text-muted-foreground">Nenhuma videoaula disponível ainda.</p>
      ) : (
        <Accordion type="multiple" defaultValue={modules.map((m) => m.id)} className="space-y-3">
          {modules.map((m) => {
            const list = byModule[m.id] || [];
            const done = list.filter((l) => watched.has(l.id)).length;
            return (
              <AccordionItem key={m.id} value={m.id} className="rounded-lg border border-border bg-card px-4">
                <AccordionTrigger className="text-left">
                  <div className="min-w-0">
                    <p className="font-display font-semibold break-words">{m.title}</p>
                    <p className="text-xs text-muted-foreground">{done}/{list.length} assistidas</p>
                  </div>
                </AccordionTrigger>
                <AccordionContent className="space-y-1">
                  {list.length === 0 && <p className="text-sm text-muted-foreground">Sem aulas neste módulo.</p>}
                  {list.map((l) => (
                    <div key={l.id} className={`flex items-center gap-2 rounded-md p-2 ${current?.id === l.id ? "bg-accent/40" : "hover:bg-accent/20"}`}>
                      <button onClick={() => toggleWatched(l.id)} aria-label="Marcar como assistida">
                        {watched.has(l.id) ? <CheckCircle2 className="w-5 h-5 text-primary" /> : <Circle className="w-5 h-5 text-muted-foreground" />}
                      </button>
                      <button onClick={() => openLesson(l)} className="flex-1 min-w-0 flex items-center gap-2 text-left">
                        <PlayCircle className="w-4 h-4 shrink-0 text-primary" />
                        <span className="break-words text-foreground">{l.title}</span>
                      </button>
                      {l.pdf_path && <FileDown className="w-4 h-4 text-muted-foreground shrink-0" />}
                    </div>
                  ))}
                </AccordionContent>
              </AccordionItem>
            );
          })}
        </Accordion>
      )}
    </div>
  );
}
