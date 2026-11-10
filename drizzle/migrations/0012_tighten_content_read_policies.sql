CREATE OR REPLACE FUNCTION public.has_app_role()
RETURNS boolean LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT EXISTS (SELECT 1 FROM public.user_roles WHERE user_id = auth.uid() AND role IN ('admin','student'))
$$;

CREATE OR REPLACE FUNCTION public.can_view_question(_question_id uuid)
RETURNS boolean LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT public.is_admin()
    OR EXISTS (SELECT 1 FROM public.exam_questions eq JOIN public.exams e ON e.id = eq.exam_id
               WHERE eq.question_id = _question_id AND e.is_active)
    OR EXISTS (SELECT 1 FROM public.quiz_answers qa JOIN public.quiz_attempts at ON at.id = qa.attempt_id
               WHERE qa.question_id = _question_id AND at.user_id = auth.uid())
$$;

DROP POLICY IF EXISTS "Anyone can view questions" ON public.questions;
CREATE POLICY "View questions of active exams or own history" ON public.questions
  FOR SELECT TO anon, authenticated USING (public.can_view_question(id));

DROP POLICY IF EXISTS "Authenticated can check allowed emails" ON public.allowed_emails;

DROP POLICY IF EXISTS "authenticated read tea_exam_questions" ON public.tea_exam_questions;
CREATE POLICY "Members read tea_exam_questions" ON public.tea_exam_questions
  FOR SELECT TO authenticated USING (public.has_app_role());

DROP POLICY IF EXISTS "authenticated read tea_questions" ON public.tea_questions;
CREATE POLICY "Members read tea_questions" ON public.tea_questions
  FOR SELECT TO authenticated USING (public.has_app_role());

DROP POLICY IF EXISTS "Authenticated view module files" ON public.video_module_files;
CREATE POLICY "Members view module files" ON public.video_module_files
  FOR SELECT TO authenticated USING (public.has_app_role());

DROP POLICY IF EXISTS "Authenticated view modules" ON public.video_modules;
CREATE POLICY "Members view modules" ON public.video_modules
  FOR SELECT TO authenticated USING (public.has_app_role());

DROP POLICY IF EXISTS "Authenticated view lessons" ON public.video_lessons;
CREATE POLICY "Members view lessons" ON public.video_lessons
  FOR SELECT TO authenticated USING (public.has_app_role());

DROP POLICY IF EXISTS "Auth read lesson media" ON storage.objects;
CREATE POLICY "Members read lesson media" ON storage.objects
  FOR SELECT TO authenticated USING (bucket_id = 'lesson-media' AND public.has_app_role());