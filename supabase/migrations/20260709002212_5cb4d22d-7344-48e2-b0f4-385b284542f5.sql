
-- 1) tool_checkouts: drop overly permissive select policy
DROP POLICY IF EXISTS "Authenticated users can view all tool checkouts" ON public.tool_checkouts;

-- 2) profiles: replace subquery-based WITH CHECK with a trigger-enforced immutability
CREATE OR REPLACE FUNCTION public.enforce_profile_immutable_fields()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  -- Admins can change anything
  IF public.has_role(auth.uid(), 'admin'::user_role) THEN
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

DROP TRIGGER IF EXISTS enforce_profile_immutable_fields_trg ON public.profiles;
CREATE TRIGGER enforce_profile_immutable_fields_trg
  BEFORE UPDATE ON public.profiles
  FOR EACH ROW
  EXECUTE FUNCTION public.enforce_profile_immutable_fields();

-- Simplify the self-update policy now that the trigger guards sensitive fields
DROP POLICY IF EXISTS "Users can update own profile" ON public.profiles;
CREATE POLICY "Users can update own profile"
  ON public.profiles
  FOR UPDATE
  USING (auth.uid() = id)
  WITH CHECK (auth.uid() = id);
