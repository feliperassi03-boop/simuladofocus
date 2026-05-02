
-- Drop the old SELECT policy that required authentication
DROP POLICY IF EXISTS "Authenticated users can check allowed emails" ON public.allowed_emails;

-- Create a new SELECT policy that allows anyone (including anonymous) to check
CREATE POLICY "Anyone can check allowed emails"
  ON public.allowed_emails
  FOR SELECT
  TO public
  USING (true);
