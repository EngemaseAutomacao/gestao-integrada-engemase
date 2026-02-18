
CREATE OR REPLACE FUNCTION public.prevent_profile_privilege_escalation()
 RETURNS trigger
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
BEGIN
  IF TG_OP = 'UPDATE' THEN
    -- Allow service role (auth.uid() is null when using service role key)
    -- Only restrict when a regular user is making changes
    IF auth.uid() IS NOT NULL AND NOT has_role(auth.uid(), 'admin'::user_role) THEN
      IF NEW.role IS DISTINCT FROM OLD.role THEN
        RAISE EXCEPTION 'Not allowed to change role';
      END IF;
      IF NEW.category IS DISTINCT FROM OLD.category THEN
        RAISE EXCEPTION 'Not allowed to change category';
      END IF;
      IF NEW.approved IS DISTINCT FROM OLD.approved THEN
        RAISE EXCEPTION 'Not allowed to change approval status';
      END IF;
      IF NEW.email IS DISTINCT FROM OLD.email THEN
        RAISE EXCEPTION 'Not allowed to change email';
      END IF;
    END IF;
  END IF;

  RETURN NEW;
END;
$function$;
