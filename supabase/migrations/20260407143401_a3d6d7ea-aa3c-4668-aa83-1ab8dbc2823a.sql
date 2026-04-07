
CREATE OR REPLACE FUNCTION public.get_approved_users()
RETURNS TABLE(id uuid, full_name text, email text)
LANGUAGE sql
STABLE SECURITY DEFINER
SET search_path TO 'public'
AS $$
  SELECT p.id, p.full_name, p.email
  FROM public.profiles p
  WHERE p.approved = true
  ORDER BY p.full_name;
$$;
