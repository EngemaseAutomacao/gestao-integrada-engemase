-- Drop overly permissive profiles view policies if they exist
DROP POLICY IF EXISTS "Authenticated users can view profiles" ON public.profiles;
DROP POLICY IF EXISTS "Users can view all profiles" ON public.profiles;

-- The policies "Users can view own profile" and "Admins can view all profiles" already exist
-- and are correctly configured. No additional policies needed.

-- Verify the remaining SELECT policies are correct:
-- "Users can view own profile" - auth.uid() = id
-- "Admins can view all profiles" - has_role(auth.uid(), 'admin'::user_role)