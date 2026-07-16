CREATE OR REPLACE FUNCTION public.enforce_profile_immutable_fields()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  -- Edge functions administrativas usam a chave interna do backend; em PostgREST
  -- essa informação pode vir dentro de request.jwt.claims, então auth.role()
  -- é a forma correta de ler o papel efetivo da requisição.
  IF auth.role() = 'service_role' THEN
    RETURN NEW;
  END IF;

  -- Administradores autenticados podem alterar campos administrativos.
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