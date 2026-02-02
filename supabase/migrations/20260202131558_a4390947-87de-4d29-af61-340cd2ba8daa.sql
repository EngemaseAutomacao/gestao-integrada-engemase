-- Allow anon to access profiles for username lookup during login
DROP POLICY IF EXISTS "Allow anon to lookup username for login" ON public.profiles;
CREATE POLICY "Allow anon to lookup username for login"
ON public.profiles
FOR SELECT
TO anon
USING (true);