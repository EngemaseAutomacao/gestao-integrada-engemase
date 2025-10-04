-- Create a public function to get email from username (for login purposes)
-- This is safe because it only returns email (which is needed for login)
-- and doesn't expose any other sensitive information
create or replace function public.get_email_from_username(_username text)
returns text
language sql
stable
security definer
set search_path = public
as $$
  select email
  from public.profiles
  where username = _username
  limit 1;
$$;