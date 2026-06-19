
-- 1) Trigger de notificação enriquecido para incluir nome do admin quando ação manual
CREATE OR REPLACE FUNCTION public.notify_tool_checkout()
 RETURNS trigger
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
DECLARE
  tool_name TEXT;
  user_name TEXT;
  admin_name TEXT;
  admin_rec RECORD;
  is_admin_checkout BOOLEAN;
  is_admin_checkin BOOLEAN;
BEGIN
  SELECT name INTO tool_name FROM public.tools WHERE id = NEW.tool_id;
  SELECT full_name INTO user_name FROM public.profiles WHERE id = NEW.user_id;

  IF TG_OP = 'INSERT' AND NEW.status = 'checked_out' THEN
    is_admin_checkout := NEW.checked_out_by IS NOT NULL AND NEW.checked_out_by <> NEW.user_id;
    IF is_admin_checkout THEN
      SELECT full_name INTO admin_name FROM public.profiles WHERE id = NEW.checked_out_by;
    END IF;

    -- Notify admins (except the actor)
    FOR admin_rec IN SELECT id FROM public.profiles WHERE role = 'admin' AND id <> NEW.checked_out_by LOOP
      INSERT INTO public.notifications (user_id, type, title, message, tool_id, checkout_id)
      VALUES (
        admin_rec.id,
        'checkout',
        CASE WHEN is_admin_checkout THEN 'Retirada Manual por Admin' ELSE 'Ferramenta Retirada' END,
        'A ferramenta "' || COALESCE(tool_name, 'Desconhecida') || '" foi retirada por ' ||
        COALESCE(user_name, 'usuário') ||
        CASE WHEN is_admin_checkout THEN ' (registrada pelo admin ' || COALESCE(admin_name, '') || ').' ELSE '.' END,
        NEW.tool_id,
        NEW.id
      );
    END LOOP;

    -- Notify the responsible user
    INSERT INTO public.notifications (user_id, type, title, message, tool_id, checkout_id)
    VALUES (
      NEW.user_id,
      'checkout',
      CASE WHEN is_admin_checkout THEN 'Ferramenta atribuída a você' ELSE 'Retirada Registrada' END,
      CASE 
        WHEN is_admin_checkout THEN 
          'O admin ' || COALESCE(admin_name, '') || ' retirou a ferramenta "' || COALESCE(tool_name, 'Desconhecida') || '" em seu nome. Ela agora está sob sua responsabilidade.'
        ELSE
          'Sua retirada da ferramenta "' || COALESCE(tool_name, 'Desconhecida') || '" foi registrada com sucesso.'
      END,
      NEW.tool_id,
      NEW.id
    );

  ELSIF TG_OP = 'UPDATE' AND OLD.status = 'checked_out' AND NEW.status = 'checked_in' THEN
    is_admin_checkin := NEW.checked_in_by IS NOT NULL AND NEW.checked_in_by <> NEW.user_id;
    IF is_admin_checkin THEN
      SELECT full_name INTO admin_name FROM public.profiles WHERE id = NEW.checked_in_by;
    END IF;

    FOR admin_rec IN SELECT id FROM public.profiles WHERE role = 'admin' AND id <> COALESCE(NEW.checked_in_by, NEW.user_id) LOOP
      INSERT INTO public.notifications (user_id, type, title, message, tool_id, checkout_id)
      VALUES (
        admin_rec.id,
        'checkin',
        CASE WHEN is_admin_checkin THEN 'Devolução Manual por Admin' ELSE 'Ferramenta Devolvida' END,
        'A ferramenta "' || COALESCE(tool_name, 'Desconhecida') || '" (responsável: ' || COALESCE(user_name, 'usuário') || ') foi devolvida' ||
        CASE WHEN is_admin_checkin THEN ' pelo admin ' || COALESCE(admin_name, '') ELSE '' END || '.',
        NEW.tool_id,
        NEW.id
      );
    END LOOP;

    INSERT INTO public.notifications (user_id, type, title, message, tool_id, checkout_id)
    VALUES (
      NEW.user_id,
      'checkin',
      CASE WHEN is_admin_checkin THEN 'Devolução registrada por Admin' ELSE 'Devolução Registrada' END,
      CASE 
        WHEN is_admin_checkin THEN
          'O admin ' || COALESCE(admin_name, '') || ' registrou a devolução da ferramenta "' || COALESCE(tool_name, 'Desconhecida') || '" em seu nome.'
        ELSE
          'Sua devolução da ferramenta "' || COALESCE(tool_name, 'Desconhecida') || '" foi registrada com sucesso.'
      END,
      NEW.tool_id,
      NEW.id
    );
  END IF;

  RETURN NEW;
END;
$function$;

-- 2) Trigger de validação: exige notes quando admin retira/devolve para outro usuário
CREATE OR REPLACE FUNCTION public.validate_admin_manual_action()
 RETURNS trigger
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
BEGIN
  IF TG_OP = 'INSERT' AND NEW.status = 'checked_out' 
     AND NEW.checked_out_by IS NOT NULL AND NEW.checked_out_by <> NEW.user_id THEN
    IF NEW.notes IS NULL OR length(trim(NEW.notes)) < 5 THEN
      RAISE EXCEPTION 'Justificativa obrigatória (mín. 5 caracteres) ao retirar em nome de outro usuário.';
    END IF;
  END IF;

  IF TG_OP = 'UPDATE' AND OLD.status = 'checked_out' AND NEW.status = 'checked_in'
     AND NEW.checked_in_by IS NOT NULL AND NEW.checked_in_by <> NEW.user_id THEN
    IF NEW.notes IS NULL OR length(trim(NEW.notes)) < 5 THEN
      RAISE EXCEPTION 'Justificativa obrigatória (mín. 5 caracteres) ao devolver em nome de outro usuário.';
    END IF;
  END IF;

  RETURN NEW;
END;
$function$;

DROP TRIGGER IF EXISTS validate_admin_manual_action_trigger ON public.tool_checkouts;
CREATE TRIGGER validate_admin_manual_action_trigger
BEFORE INSERT OR UPDATE ON public.tool_checkouts
FOR EACH ROW EXECUTE FUNCTION public.validate_admin_manual_action();
