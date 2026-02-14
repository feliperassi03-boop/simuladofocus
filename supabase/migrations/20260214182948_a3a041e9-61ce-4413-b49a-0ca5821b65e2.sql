
-- Add guest identification columns to quiz_attempts
ALTER TABLE public.quiz_attempts 
ADD COLUMN guest_name text,
ADD COLUMN guest_email text;
