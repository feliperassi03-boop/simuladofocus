import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Progress } from "@/components/ui/progress";
import { useToast } from "@/hooks/use-toast";
import { Plus, Trash2, Upload, Send } from "lucide-react";

type Module = { id: string; title: string; sort_order: number };
type Lesson = { id: string; module_id: string; title: string; video_path: string; pdf_path: string | null; sort_order: number };
type Doubt = { id: string; student_name: string; student_email: string | null; lesson_title: string; doubt_text: string; admin_response: string | null; created_at: string };

const safeName = (n: string) => n.normalize("NFD").replace(/[^\w.-]+/g, "_");

export default function VideoaulasTab() {
  const { toast } = useToast();
  const [modules, setModules] = useState<Module[]>([]);
  const [lessons, setLessons] = useState<Lesson[]>([]);
  const [doubts, setDoubts] = useState<Doubt[]>([]);
  const [replies, setReplies] = useState<Record<string, string>>({});
  const [newModule, setNewModule] = useState("");
  const [moduleId, setModuleId] = useState("");
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [video, setVideo] = useState<File | null>(null);
  const [pdf, setPdf] = useState<File | null>(null);
  const [uploading, setUploading] = useState(false);
  const [progress, setProgress] = useState(0);

  const load = async () => {
    const [m, l, d] = await Promise.all([
      supabase.from("video_modules").select("*").order("sort_order").order("title"),
      supabase.from("video_lessons").select("*").order("sort_order").order("created_at"),
      supabase.from("video_doubts").select("*").order("created_at", { ascending: false }),
    ]);
    setModules((m.data as Module[]) || []);
    setLessons((l.data as Lesson[]) || []);
    setDoubts((d.data as Doubt[]) || []);
  };
  useEffect(() => { load(); }, []);

  const addModule = async () => {
    if (!newModule.trim()) return;
    const { error } = await supabase.from("video_modules").insert({ title: newModule.trim(), sort_order: modules.length });
    if (error) return toast({ title: "Erro", description: error.message, variant: "destructive" });
    setNewModule("");
    load();
  };

  const deleteModule = async (id: string) => {
    if (!confirm("Excluir este módulo e todas as suas aulas?")) return;
    const paths = lessons.filter((l) => l.module_id === id).flatMap((l) => [l.video_path, l.pdf_path].filter(Boolean) as string[]);
    if (paths.length) await supabase.storage.from("lesson-media").remove(paths);
    await supabase.from("video_modules").delete().eq("id", id);
    load();
  };

  const deleteLesson = async (l: Lesson) => {
    if (!confirm(`Excluir a aula "${l.title}"?`)) return;
    await supabase.storage.from("lesson-media").remove([l.video_path, l.pdf_path].filter(Boolean) as string[]);
    await supabase.from("video_lessons").delete().eq("id", l.id);
    load();
  };

  const addLesson = async () => {
    if (!moduleId || !title.trim() || !video) return toast({ title: "Escolha o módulo, o título e o vídeo.", variant: "destructive" });
    setUploading(true);
    setProgress(10);
    const stamp = Date.now();
    const videoPath = `videos/${stamp}_${safeName(video.name)}`;
    const timer = setInterval(() => setProgress((p) => Math.min(p + 2, 90)), 1500);
    const v = await supabase.storage.from("lesson-media").upload(videoPath, video, { contentType: video.type || "video/mp4" });
    clearInterval(timer);
    if (v.error) { setUploading(false); return toast({ title: "Erro no envio do vídeo", description: v.error.message, variant: "destructive" }); }
    let pdfPath: string | null = null;
    if (pdf) {
      pdfPath = `pdfs/${stamp}_${safeName(pdf.name)}`;
      const p = await supabase.storage.from("lesson-media").upload(pdfPath, pdf, { contentType: "application/pdf" });
      if (p.error) pdfPath = null;
    }
    const { error } = await supabase.from("video_lessons").insert({
      module_id: moduleId, title: title.trim(), description: description.trim() || null,
      video_path: videoPath, pdf_path: pdfPath, pdf_name: pdf?.name ?? null,
      sort_order: lessons.filter((l) => l.module_id === moduleId).length,
    });
    setProgress(100);
    setUploading(false);
    if (error) return toast({ title: "Erro", description: error.message, variant: "destructive" });
    toast({ title: "Aula publicada!" });
    setTitle(""); setDescription(""); setVideo(null); setPdf(null); setProgress(0);
    (document.getElementById("va-video") as HTMLInputElement).value = "";
    (document.getElementById("va-pdf") as HTMLInputElement).value = "";
    load();
  };

  const reply = async (id: string) => {
    const text = replies[id]?.trim();
    if (!text) return;
    await supabase.from("video_doubts").update({ admin_response: text, answered_at: new Date().toISOString() }).eq("id", id);
    load();
  };

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader><CardTitle className="font-display">Módulos (temas)</CardTitle></CardHeader>
        <CardContent className="space-y-3">
          <div className="flex gap-2">
            <Input placeholder="Ex.: Hemato" value={newModule} onChange={(e) => setNewModule(e.target.value)} />
            <Button onClick={addModule}><Plus className="w-4 h-4 mr-1" /> Criar</Button>
          </div>
          {modules.map((m) => (
            <div key={m.id} className="rounded-lg border border-border p-3 space-y-2">
              <div className="flex items-center justify-between gap-2">
                <p className="font-semibold break-words">{m.title}</p>
                <Button size="icon" variant="ghost" onClick={() => deleteModule(m.id)}><Trash2 className="w-4 h-4" /></Button>
              </div>
              {lessons.filter((l) => l.module_id === m.id).map((l) => (
                <div key={l.id} className="flex items-center justify-between gap-2 text-sm pl-3">
                  <span className="break-words">{l.title}{l.pdf_path ? " · PDF" : ""}</span>
                  <Button size="icon" variant="ghost" onClick={() => deleteLesson(l)}><Trash2 className="w-4 h-4" /></Button>
                </div>
              ))}
            </div>
          ))}
        </CardContent>
      </Card>

      <Card>
        <CardHeader><CardTitle className="font-display">Nova videoaula</CardTitle></CardHeader>
        <CardContent className="space-y-3">
          <div>
            <Label>Módulo</Label>
            <Select value={moduleId} onValueChange={setModuleId}>
              <SelectTrigger><SelectValue placeholder="Escolha o módulo" /></SelectTrigger>
              <SelectContent>{modules.map((m) => <SelectItem key={m.id} value={m.id}>{m.title}</SelectItem>)}</SelectContent>
            </Select>
          </div>
          <div><Label>Título</Label><Input value={title} onChange={(e) => setTitle(e.target.value)} /></div>
          <div><Label>Descrição (opcional)</Label><Textarea value={description} onChange={(e) => setDescription(e.target.value)} rows={3} /></div>
          <div><Label>Vídeo (MP4)</Label><Input id="va-video" type="file" accept="video/*" onChange={(e) => setVideo(e.target.files?.[0] ?? null)} /></div>
          <div><Label>Material PDF (opcional)</Label><Input id="va-pdf" type="file" accept="application/pdf" onChange={(e) => setPdf(e.target.files?.[0] ?? null)} /></div>
          {uploading && <Progress value={progress} />}
          <Button onClick={addLesson} disabled={uploading}><Upload className="w-4 h-4 mr-1" /> {uploading ? "Enviando... não feche a página" : "Publicar aula"}</Button>
        </CardContent>
      </Card>

      <Card>
        <CardHeader><CardTitle className="font-display">Dúvidas das videoaulas</CardTitle></CardHeader>
        <CardContent className="space-y-3">
          {doubts.length === 0 && <p className="text-sm text-muted-foreground">Nenhuma dúvida ainda.</p>}
          {doubts.map((d) => (
            <div key={d.id} className="rounded-lg border border-border p-3 space-y-2 text-sm">
              <p className="text-xs text-muted-foreground">{d.student_name} {d.student_email && `· ${d.student_email}`} · {d.lesson_title} · {new Date(d.created_at).toLocaleString("pt-BR")}</p>
              <p className="whitespace-pre-wrap break-words">{d.doubt_text}</p>
              {d.admin_response ? (
                <p className="whitespace-pre-wrap break-words rounded bg-accent/30 p-2"><strong>Resposta:</strong> {d.admin_response}</p>
              ) : (
                <div className="flex gap-2">
                  <Textarea rows={2} value={replies[d.id] || ""} onChange={(e) => setReplies({ ...replies, [d.id]: e.target.value })} placeholder="Responder..." />
                  <Button size="icon" onClick={() => reply(d.id)}><Send className="w-4 h-4" /></Button>
                </div>
              )}
            </div>
          ))}
        </CardContent>
      </Card>
    </div>
  );
}
