CREATE TABLE public.video_modules (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  title text NOT NULL,
  description text,
  sort_order integer NOT NULL DEFAULT 0,
  created_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.video_modules TO authenticated;
GRANT ALL ON public.video_modules TO service_role;
ALTER TABLE public.video_modules ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Authenticated view modules" ON public.video_modules FOR SELECT TO authenticated USING (true);
CREATE POLICY "Admins manage modules" ON public.video_modules FOR ALL TO authenticated USING (public.is_admin()) WITH CHECK (public.is_admin());

CREATE TABLE public.video_lessons (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  module_id uuid NOT NULL REFERENCES public.video_modules(id) ON DELETE CASCADE,
  title text NOT NULL,
  description text,
  video_path text NOT NULL,
  pdf_path text,
  pdf_name text,
  sort_order integer NOT NULL DEFAULT 0,
  created_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.video_lessons TO authenticated;
GRANT ALL ON public.video_lessons TO service_role;
ALTER TABLE public.video_lessons ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Authenticated view lessons" ON public.video_lessons FOR SELECT TO authenticated USING (true);
CREATE POLICY "Admins manage lessons" ON public.video_lessons FOR ALL TO authenticated USING (public.is_admin()) WITH CHECK (public.is_admin());

CREATE TABLE public.video_progress (
  user_id uuid NOT NULL,
  lesson_id uuid NOT NULL REFERENCES public.video_lessons(id) ON DELETE CASCADE,
  watched_at timestamptz NOT NULL DEFAULT now(),
  PRIMARY KEY (user_id, lesson_id)
);
GRANT SELECT, INSERT, DELETE ON public.video_progress TO authenticated;
GRANT ALL ON public.video_progress TO service_role;
ALTER TABLE public.video_progress ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Users manage own progress" ON public.video_progress FOR ALL TO authenticated USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Admins view progress" ON public.video_progress FOR SELECT TO authenticated USING (public.is_admin());

CREATE TABLE public.video_doubts (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  lesson_id uuid REFERENCES public.video_lessons(id) ON DELETE CASCADE,
  user_id uuid NOT NULL,
  student_name text NOT NULL DEFAULT '',
  student_email text,
  lesson_title text NOT NULL DEFAULT '',
  doubt_text text NOT NULL,
  admin_response text,
  answered_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.video_doubts TO authenticated;
GRANT ALL ON public.video_doubts TO service_role;
ALTER TABLE public.video_doubts ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Users create own video doubts" ON public.video_doubts FOR INSERT TO authenticated WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Users view own video doubts" ON public.video_doubts FOR SELECT TO authenticated USING (auth.uid() = user_id);
CREATE POLICY "Admins manage video doubts" ON public.video_doubts FOR ALL TO authenticated USING (public.is_admin()) WITH CHECK (public.is_admin());

CREATE POLICY "Auth read lesson media" ON storage.objects FOR SELECT TO authenticated USING (bucket_id = 'lesson-media');
CREATE POLICY "Admins upload lesson media" ON storage.objects FOR INSERT TO authenticated WITH CHECK (bucket_id = 'lesson-media' AND public.is_admin());
CREATE POLICY "Admins update lesson media" ON storage.objects FOR UPDATE TO authenticated USING (bucket_id = 'lesson-media' AND public.is_admin());
CREATE POLICY "Admins delete lesson media" ON storage.objects FOR DELETE TO authenticated USING (bucket_id = 'lesson-media' AND public.is_admin());