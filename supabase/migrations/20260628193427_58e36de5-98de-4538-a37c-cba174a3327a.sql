CREATE OR REPLACE FUNCTION public.get_tool_usage_history(tool_uuid uuid)
 RETURNS TABLE(checkout_id uuid, user_name text, user_email text, user_category text, checkout_date timestamp with time zone, checkin_date timestamp with time zone, status text, construction_site text, days_used integer)
 LANGUAGE plpgsql
 STABLE SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
BEGIN
  RETURN QUERY
  SELECT 
    tc.id as checkout_id,
    p.full_name as user_name,
    CASE 
      WHEN has_role(auth.uid(), 'admin'::user_role) OR tc.user_id = auth.uid()
      THEN p.email
      ELSE '***'
    END as user_email,
    CASE 
      WHEN has_role(auth.uid(), 'admin'::user_role) OR tc.user_id = auth.uid()
      THEN p.category::text
      ELSE '***'
    END as user_category,
    tc.checkout_date,
    tc.checkin_date,
    tc.status::text,
    tc.construction_site,
    CASE 
      WHEN tc.checkin_date IS NOT NULL 
      THEN GREATEST(1, CEIL(EXTRACT(EPOCH FROM tc.checkin_date - tc.checkout_date) / 86400.0))::INTEGER
      ELSE GREATEST(1, CEIL(EXTRACT(EPOCH FROM NOW() - tc.checkout_date) / 86400.0))::INTEGER
    END as days_used
  FROM public.tool_checkouts tc
  JOIN public.profiles p ON p.id = tc.user_id
  WHERE tc.tool_id = tool_uuid
  ORDER BY tc.checkout_date DESC;
END;
$function$;