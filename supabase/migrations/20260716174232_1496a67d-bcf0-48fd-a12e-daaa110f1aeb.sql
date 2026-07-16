CREATE OR REPLACE FUNCTION public.enforce_profile_immutable_fields()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  -- Bypass for service_role (used by admin edge functions like update-user)
  IF current_setting('request.jwt.claim.role', true) = 'service_role'
     OR current_user = 'service_role' THEN
    RETURN NEW;
  END IF;

  -- Admins can change anything
  IF auth.uid() IS NOT NULL AND public.has_role(auth.uid(), 'admin'::user_role) THEN
    RETURN NEW;
  END IF;

  IF NEW.role IS DISTINCT FROM OLD.role
     OR NEW.category IS DISTINCT FROM OLD.category
     OR NEW.approved IS DISTINCT FROM OLD.approved
     OR NEW.email IS DISTINCT FROM OLD.email THEN
    RAISE EXCEPTION 'Não é permitido alterar role, category, approved ou email do próprio perfil';
  END IF;

  RETURN NEW;
END;
$$;