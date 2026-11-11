import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Progress } from "@/components/ui/progress";
import { AlertDialog, AlertDialogContent, AlertDialogHeader, AlertDialogTitle, AlertDialogDescription, AlertDialogFooter } from "@/components/ui/alert-dialog";
import { useToast } from "@/hooks/use-toast";
import { Plus, Trash2, Upload, Send, FileUp, FileText, Folder, Pencil, Check, X } from "lucide-react";

type Module = { id: string; title: string; sort_order: number };
type Lesson = { id: string; module_id: string; title: string; video_path: string; pdf_path: string | null; sort_order: number };
type Doubt = { id: string; student_name: string; student_email: string | null; lesson_title: string; doubt_text: string; admin_response: string | null; created_at: string };
type ModFile = { id: string; module_id: string; file_name: string; file_path: string; folder: string | null };
type DeleteTarget = { kind: "module"; item: Module } | { kind: "lesson"; item: Lesson } | { kind: "file"; item: ModFile };

const safeName = (n: string) => n.normalize("NFD").replace(/[^\w.-]+/g, "_");

export default function VideoaulasTab() {
  const { toast } = useToast();
  const [modules, setModules] = useState<Module[]>([]);
  const [lessons, setLessons] = useState<Lesson[]>([]);
  const [files, setFiles] = useState<ModFile[]>([]);
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
  const [folderByModule, setFolderByModule] = useState<Record<string, string>>({});
  const [editingLesson, setEditingLesson] = useState<string | null>(null);
  const [lessonTitle, setLessonTitle] = useState("");
  const [deleteTarget, setDeleteTarget] = useState<DeleteTarget | null>(null);
  const [deleting, setDeleting] = useState(false);

  const load = async () => {
    const [m, l, d, f] = await Promise.all([
      supabase.from("video_modules").select("*").order("sort_order").order("title"),
      supabase.from("video_lessons").select("*").order("sort_order").order("created_at"),
      supabase.from("video_doubts").select("*").order("created_at", { ascending: false }),
      supabase.from("video_module_files").select("*").order("created_at"),
    ]);
    setModules(((m.data as Module[]) || []).slice().sort((a, b) => a.title.localeCompare(b.title, "pt-BR", { sensitivity: "base" })));
    setLessons((l.data as Lesson[]) || []);
    setDoubts((d.data as Doubt[]) || []);
    setFiles((f.data as ModFile[]) || []);
  };
  useEffect(() => { load(); }, []);

  const addModule = async () => {
    if (!newModule.trim()) return;
    const { error } = await supabase.from("video_modules").insert({ title: newModule.trim(), sort_order: modules.length });
    if (error) return toast({ title: "Erro", description: error.message, variant: "destructive" });
    setNewModule("");
    load();
  };

  const uploadModuleFiles = async (mid: string, list: FileList | null) => {
    if (!list?.length) return;
    const folder = (folderByModule[mid] || "").trim() || null;
    toast({ title: "Enviando arquivos..." });
    for (const f of Array.from(list)) {
      const path = `module-files/${mid}/${Date.now()}_${safeName(f.name)}`;
      const up = await supabase.storage.from("lesson-media").upload(path, f, { contentType: f.type || undefined });
      if (up.error) { toast({ title: `Erro em ${f.name}`, description: up.error.message, variant: "destructive" }); continue; }
      await supabase.from("video_module_files").insert({ module_id: mid, file_name: f.name, file_path: path, folder });
    }
    toast({ title: "Arquivos adicionados!" });
    load();
  };

  const confirmDelete = async () => {
    if (!deleteTarget || deleting) return;
    const target = deleteTarget;
    setDeleting(true);
    try {
      const paths = target.kind === "module" ? [
        ...lessons.filter((l) => l.module_id === target.item.id).flatMap((l) => [l.video_path, l.pdf_path]),
        ...files.filter((f) => f.module_id === target.item.id).map((f) => f.file_path),
      ] : target.kind === "lesson" ? [target.item.video_path, target.item.pdf_path] : [target.item.file_path];
      const table = target.kind === "module" ? "video_modules" : target.kind === "lesson" ? "video_lessons" : "video_module_files";
      const { data, error } = await supabase.from(table).delete().eq("id", target.item.id).select("id").single();
      if (error) throw error;
      if (!data) throw new Error("Não foi possível confirmar a exclusão. Atualize a página e tente novamente.");
      if (target.kind === "module" && moduleId === target.item.id) setModuleId("");
      setDeleteTarget(null);
      await load();
      const mediaPaths = [...new Set(paths.filter((path): path is string => !!path))];
      if (mediaPaths.length) {
        const { error: mediaError } = await supabase.storage.from("lesson-media").remove(mediaPaths);
        if (mediaError) {
          toast({ title: "Conteúdo excluído", description: "Não foi possível remover todos os arquivos de mídia armazenados.", variant: "destructive" });
          return;
        }
      }
      toast({ title: target.kind === "module" ? "Módulo excluído!" : target.kind === "lesson" ? "Aula excluída!" : "Arquivo excluído!" });
    } catch (error) {
      toast({ title: "Não foi possível excluir", description: error instanceof Error ? error.message : (error as { message?: string })?.message || "Tente novamente.", variant: "destructive" });
    } finally {
      setDeleting(false);
    }
  };

  const renameLesson = async (l: Lesson) => {
    const next = lessonTitle.trim();
    if (!next || next === l.title) { setEditingLesson(null); return; }
    const { error } = await supabase.from("video_lessons").update({ title: next }).eq("id", l.id);
    if (error) return toast({ title: "Erro ao renomear", description: error.message, variant: "destructive" });
    toast({ title: "Nome da aula atualizado!" });
    setEditingLesson(null);
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
      <AlertDialog open={!!deleteTarget} onOpenChange={(open) => { if (!open && !deleting) setDeleteTarget(null); }}>
        <AlertDialogContent className="max-w-[calc(100%-2rem)] sm:max-w-lg">
          <AlertDialogHeader>
            <AlertDialogTitle>Confirmar exclusão</AlertDialogTitle>
            <AlertDialogDescription className="break-words">
              {deleteTarget?.kind === "module" ? `Excluir o módulo “${deleteTarget.item.title}” e todas as suas aulas, materiais, dúvidas e registros de aulas assistidas?` : deleteTarget?.kind === "lesson" ? `Excluir a aula “${deleteTarget.item.title}”, suas dúvidas e registros de aula assistida?` : deleteTarget ? `Excluir o arquivo “${deleteTarget.item.file_name}”?` : ""} Esta ação não pode ser desfeita.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <Button variant="outline" disabled={deleting} onClick={() => setDeleteTarget(null)}>Cancelar</Button>
            <Button variant="destructive" disabled={deleting} onClick={confirmDelete}><Trash2 className="w-4 h-4 mr-1" />{deleting ? "Excluindo..." : "Excluir"}</Button>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
      <Card>
        <CardHeader><CardTitle className="font-display">Módulos (temas)</CardTitle></CardHeader>
        <CardContent className="space-y-3">
          <div className="flex gap-2">
            <Input placeholder="Ex.: Hemato" value={newModule} onChange={(e) => setNewModule(e.target.value)} />
            <Button onClick={addModule}><Plus className="w-4 h-4 mr-1" /> Criar</Button>
          </div>
          {modules.map((m) => {
            const mFiles = files.filter((f) => f.module_id === m.id);
            const folders = Array.from(new Set(mFiles.map((f) => f.folder || "")));
            return (
            <div key={m.id} className="rounded-lg border border-border p-3 space-y-2">
              <div className="flex items-center justify-between gap-2">
                <p className="font-semibold break-words">{m.title}</p>
                <Button size="icon" variant="ghost" aria-label={`Excluir módulo ${m.title}`} onClick={() => setDeleteTarget({ kind: "module", item: m })}><Trash2 className="w-4 h-4" /></Button>
              </div>
              <div className="flex flex-wrap items-center gap-2">
                <Input
                  className="h-8 w-40 text-xs"
                  placeholder="Pasta (ex.: Apostilas)"
                  autoComplete="off"
                  value={folderByModule[m.id] || ""}
                  onChange={(e) => setFolderByModule({ ...folderByModule, [m.id]: e.target.value })}
                />
                {folders.filter(Boolean).length > 0 && (
                  <div className="flex flex-wrap items-center gap-1">
                    {folders.filter(Boolean).map((fo) => (
                      <button
                        key={fo}
                        type="button"
                        onClick={() => setFolderByModule({ ...folderByModule, [m.id]: fo })}
                        className="text-xs rounded-full border border-border px-2 py-0.5 hover:bg-accent/30"
                      >
                        <Folder className="w-3 h-3 inline mr-1" />{fo}
                      </button>
                    ))}
                  </div>
                )}
                <label className="inline-flex items-center gap-1 text-xs cursor-pointer rounded-md border border-border px-2 py-1 hover:bg-accent/30">
                  <FileUp className="w-4 h-4" /> Adicionar arquivos
                  <input type="file" multiple className="hidden" onChange={(e) => { uploadModuleFiles(m.id, e.target.files); e.target.value = ""; }} />
                </label>
              </div>
              {(folders.length ? folders : [""]).map((fo) => (
                <div key={fo || "__root"} className="space-y-1">
                  {fo && <p className="text-xs font-semibold text-muted-foreground pl-3 flex items-center gap-1"><Folder className="w-3 h-3" /> {fo}</p>}
                  {mFiles.filter((f) => (f.folder || "") === fo).map((f) => (
                    <div key={f.id} className="flex items-center justify-between gap-2 text-sm pl-3">
                      <span className="break-words flex items-center gap-1"><FileText className="w-4 h-4 shrink-0" />{f.file_name}</span>
                      <Button size="icon" variant="ghost" aria-label={`Excluir arquivo ${f.file_name}`} onClick={() => setDeleteTarget({ kind: "file", item: f })}><Trash2 className="w-4 h-4" /></Button>
                    </div>
                  ))}
                </div>
              ))}
              {lessons.filter((l) => l.module_id === m.id).map((l) => (
                <div key={l.id} className="flex items-center justify-between gap-2 text-sm pl-3">
                  {editingLesson === l.id ? (
                    <div className="flex flex-1 items-center gap-1 min-w-0">
                      <Input
                        className="h-8 text-sm"
                        value={lessonTitle}
                        autoFocus
                        onChange={(e) => setLessonTitle(e.target.value)}
                        onKeyDown={(e) => { if (e.key === "Enter") renameLesson(l); if (e.key === "Escape") setEditingLesson(null); }}
                      />
                      <Button size="icon" variant="ghost" onClick={() => renameLesson(l)} aria-label="Salvar nome"><Check className="w-4 h-4" /></Button>
                      <Button size="icon" variant="ghost" onClick={() => setEditingLesson(null)} aria-label="Cancelar"><X className="w-4 h-4" /></Button>
                    </div>
                  ) : (
                    <>
                      <span className="break-words">{l.title}{l.pdf_path ? " · PDF" : ""}</span>
                      <span className="flex items-center gap-0.5 shrink-0">
                        <Button
                          size="icon"
                          variant="ghost"
                          aria-label="Renomear aula"
                          onClick={() => { setEditingLesson(l.id); setLessonTitle(l.title); }}
                        >
                          <Pencil className="w-4 h-4" />
                        </Button>
                        <Button size="icon" variant="ghost" aria-label={`Excluir aula ${l.title}`} onClick={() => setDeleteTarget({ kind: "lesson", item: l })}><Trash2 className="w-4 h-4" /></Button>
                      </span>
                    </>
                  )}
                </div>
              ))}
            </div>
            );
          })}
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
