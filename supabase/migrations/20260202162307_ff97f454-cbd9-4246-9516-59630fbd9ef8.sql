-- Ensure the get_email_from_username function has SECURITY DEFINER
-- so it can bypass RLS and still lookup usernames for login
CREATE OR REPLACE FUNCTION public.get_email_from_username(_username text)
RETURNS text
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT email
  FROM public.profiles
  WHERE lower(username) = lower(_username)
  LIMIT 1;
$$;