CREATE TABLE public.video_module_files (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  module_id uuid NOT NULL REFERENCES public.video_modules(id) ON DELETE CASCADE,
  file_name text NOT NULL,
  file_path text NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.video_module_files TO authenticated;
GRANT ALL ON public.video_module_files TO service_role;
ALTER TABLE public.video_module_files ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Authenticated view module files" ON public.video_module_files FOR SELECT TO authenticated USING (true);
CREATE POLICY "Admins manage module files" ON public.video_module_files FOR ALL TO authenticated USING (public.is_admin()) WITH CHECK (public.is_admin());