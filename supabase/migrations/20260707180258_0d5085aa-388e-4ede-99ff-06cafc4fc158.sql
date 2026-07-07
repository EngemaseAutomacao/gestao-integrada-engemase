
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS last_access_at TIMESTAMPTZ;

CREATE OR REPLACE FUNCTION public.touch_last_access()
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF auth.uid() IS NULL THEN
    RETURN;
  END IF;
  UPDATE public.profiles SET last_access_at = now() WHERE id = auth.uid();
END;
$$;

GRANT EXECUTE ON FUNCTION public.touch_last_access() TO authenticated;

CREATE OR REPLACE FUNCTION public.get_users_last_access()
 RETURNS TABLE(id uuid, full_name text, username text, email text, category text, role text, approved boolean, last_sign_in_at timestamp with time zone, days_since_last_access integer)
 LANGUAGE plpgsql
 STABLE SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
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
    GREATEST(u.last_sign_in_at, p.last_access_at) AS last_sign_in_at,
    CASE
      WHEN GREATEST(u.last_sign_in_at, p.last_access_at) IS NULL THEN NULL
      ELSE GREATEST(0, FLOOR(EXTRACT(EPOCH FROM (now() - GREATEST(u.last_sign_in_at, p.last_access_at))) / 86400.0))::INTEGER
    END AS days_since_last_access
  FROM public.profiles p
  LEFT JOIN auth.users u ON u.id = p.id
  WHERE p.approved = true
  ORDER BY GREATEST(u.last_sign_in_at, p.last_access_at) NULLS FIRST;
END;
$function$;
