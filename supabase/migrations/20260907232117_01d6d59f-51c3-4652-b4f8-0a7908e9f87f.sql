CREATE POLICY "Public can view ATF simulado exam questions"
ON public.exam_questions
FOR SELECT
TO public
USING (exam_id = '3599ded6-c8da-4a34-837f-6a95a38b7e1a');