-- Admin-only function to get users' last sign in dates
CREATE OR REPLACE FUNCTION public.get_users_last_access()
RETURNS TABLE(
  id uuid,
  full_name text,
  username text,
  email text,
  category text,
  role text,
  approved boolean,
  last_sign_in_at timestamptz,
  days_since_last_access integer
)
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF NOT public.has_role(auth.uid(), 'admin'::public.user_role) THEN
    RAISE EXCEPTION 'Acesso negado';
  END IF;

  RETURN QUERY
  SELECT
    p.id,
    p.full_name,
    p.username,
    p.email,
    p.category::text,
    p.role::text,
    p.approved,
    u.last_sign_in_at,
    CASE
      WHEN u.last_sign_in_at IS NULL THEN NULL
      ELSE GREATEST(0, FLOOR(EXTRACT(EPOCH FROM (now() - u.last_sign_in_at)) / 86400.0))::INTEGER
    END AS days_since_last_access
  FROM public.profiles p
  LEFT JOIN auth.users u ON u.id = p.id
  WHERE p.approved = true
  ORDER BY u.last_sign_in_at NULLS FIRST;
END;
$$;

GRANT EXECUTE ON FUNCTION public.get_users_last_access() TO authenticated;