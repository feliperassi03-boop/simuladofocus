
CREATE OR REPLACE FUNCTION public.get_bud5_ranking()
RETURNS TABLE(score integer, total_questions integer)
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT qa.score, qa.total_questions
  FROM public.quiz_attempts qa
  JOIN public.exams e ON e.id = qa.exam_id
  WHERE qa.completed_at IS NOT NULL
    AND qa.score IS NOT NULL
    AND qa.total_questions > 0
    AND (e.title ILIKE '%BUD 5%' OR e.title ILIKE '%BUD5%')
  ORDER BY qa.score DESC, qa.total_questions DESC;
$$;

GRANT EXECUTE ON FUNCTION public.get_bud5_ranking() TO authenticated, anon;
