
-- =========================================================
-- Security hardening: consolidate role authority in user_roles
-- and drop legacy checkout-images policies.
-- =========================================================

-- 1) Replace profiles.role checks in trigger functions with user_roles joins

CREATE OR REPLACE FUNCTION public.check_overdue_tools()
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
DECLARE
  overdue_record RECORD;
  admin_record RECORD;
  days_overdue INTEGER;
BEGIN
  FOR overdue_record IN
    SELECT tc.id, tc.user_id, tc.tool_id, tc.estimated_return_date,
           t.name as tool_name,
           GREATEST(1, CEIL(EXTRACT(EPOCH FROM NOW() - tc.estimated_return_date) / 86400.0))::INTEGER as d_overdue
    FROM public.tool_checkouts tc
    JOIN public.tools t ON t.id = tc.tool_id
    WHERE tc.status = 'checked_out'
      AND tc.estimated_return_date IS NOT NULL
      AND tc.estimated_return_date < NOW()
      AND NOT EXISTS (
        SELECT 1 FROM public.notifications n
        WHERE n.checkout_id = tc.id
          AND n.type IN ('overdue', 'overdue_user_reminder')
          AND n.created_at > NOW() - INTERVAL '24 hours'
      )
  LOOP
    days_overdue := overdue_record.d_overdue;
    FOR admin_record IN
      SELECT ur.user_id AS id FROM public.user_roles ur WHERE ur.role = 'admin'
    LOOP
      INSERT INTO public.notifications (user_id, type, title, message, tool_id, checkout_id)
      VALUES (admin_record.id, 'overdue', 'Ferramenta Atrasada',
        'A ferramenta "' || overdue_record.tool_name || '" está atrasada há ' || days_overdue || ' dia(s). Por favor, solicite a devolução.',
        overdue_record.tool_id, overdue_record.id);
    END LOOP;
    INSERT INTO public.notifications (user_id, type, title, message, tool_id, checkout_id)
    VALUES (overdue_record.user_id, 'overdue_user_reminder', 'Ferramenta em Atraso!',
      'A ferramenta "' || overdue_record.tool_name || '" está atrasada há ' || days_overdue || ' dia(s). Por favor, devolva o quanto antes.',
      overdue_record.tool_id, overdue_record.id);
  END LOOP;
END;
$function$;

CREATE OR REPLACE FUNCTION public.check_vehicle_overdue_return()
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
DECLARE
  overdue_record RECORD;
  admin_record RECORD;
  days_late INTEGER;
BEGIN
  FOR overdue_record IN
    SELECT vc.id, vc.user_id, vc.vehicle_id, vc.estimated_return_date,
           v.name as vehicle_name, v.plate as vehicle_plate,
           GREATEST(1, CEIL(EXTRACT(EPOCH FROM NOW() - vc.estimated_return_date) / 86400.0))::INTEGER as d_overdue
    FROM public.vehicle_checkouts vc
    JOIN public.vehicles v ON v.id = vc.vehicle_id
    WHERE vc.status = 'checked_out'
      AND vc.estimated_return_date IS NOT NULL
      AND vc.estimated_return_date < NOW()
      AND NOT EXISTS (
        SELECT 1 FROM public.notifications n
        WHERE n.type = 'vehicle_overdue_return'
          AND n.user_id = vc.user_id
          AND n.message LIKE '%' || v.plate || '%'
          AND n.created_at > NOW() - INTERVAL '24 hours'
      )
  LOOP
    days_late := overdue_record.d_overdue;
    INSERT INTO public.notifications (user_id, type, title, message)
    VALUES (overdue_record.user_id, 'vehicle_overdue_return', 'Veículo Atrasado!',
      'O veículo "' || COALESCE(overdue_record.vehicle_name, '') || ' (' || COALESCE(overdue_record.vehicle_plate, '') || ')" está atrasado há ' || days_late || ' dia(s). Por favor, devolva o veículo.');
    FOR admin_record IN
      SELECT ur.user_id AS id FROM public.user_roles ur WHERE ur.role = 'admin'
    LOOP
      INSERT INTO public.notifications (user_id, type, title, message)
      VALUES (admin_record.id, 'vehicle_overdue_return', 'Veículo com Retorno Atrasado',
        'O veículo "' || COALESCE(overdue_record.vehicle_name, '') || ' (' || COALESCE(overdue_record.vehicle_plate, '') || ')" está atrasado há ' || days_late || ' dia(s). Responsável: ' || COALESCE((SELECT full_name FROM public.profiles WHERE id = overdue_record.user_id), 'desconhecido') || '.');
    END LOOP;
  END LOOP;
END;
$function$;

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
    FOR admin_rec IN
      SELECT ur.user_id AS id FROM public.user_roles ur
      WHERE ur.role = 'admin' AND ur.user_id <> COALESCE(NEW.checked_out_by, '00000000-0000-0000-0000-000000000000'::uuid)
    LOOP
      INSERT INTO public.notifications (user_id, type, title, message, tool_id, checkout_id)
      VALUES (admin_rec.id, 'checkout',
        CASE WHEN is_admin_checkout THEN 'Retirada Manual por Admin' ELSE 'Ferramenta Retirada' END,
        'A ferramenta "' || COALESCE(tool_name, 'Desconhecida') || '" foi retirada por ' || COALESCE(user_name, 'usuário') ||
        CASE WHEN is_admin_checkout THEN ' (registrada pelo admin ' || COALESCE(admin_name, '') || ').' ELSE '.' END,
        NEW.tool_id, NEW.id);
    END LOOP;
    INSERT INTO public.notifications (user_id, type, title, message, tool_id, checkout_id)
    VALUES (NEW.user_id, 'checkout',
      CASE WHEN is_admin_checkout THEN 'Ferramenta atribuída a você' ELSE 'Retirada Registrada' END,
      CASE WHEN is_admin_checkout THEN
        'O admin ' || COALESCE(admin_name, '') || ' retirou a ferramenta "' || COALESCE(tool_name, 'Desconhecida') || '" em seu nome. Ela agora está sob sua responsabilidade.'
      ELSE
        'Sua retirada da ferramenta "' || COALESCE(tool_name, 'Desconhecida') || '" foi registrada com sucesso.'
      END,
      NEW.tool_id, NEW.id);

  ELSIF TG_OP = 'UPDATE' AND OLD.status = 'checked_out' AND NEW.status = 'checked_in' THEN
    is_admin_checkin := NEW.checked_in_by IS NOT NULL AND NEW.checked_in_by <> NEW.user_id;
    IF is_admin_checkin THEN
      SELECT full_name INTO admin_name FROM public.profiles WHERE id = NEW.checked_in_by;
    END IF;
    FOR admin_rec IN
      SELECT ur.user_id AS id FROM public.user_roles ur
      WHERE ur.role = 'admin' AND ur.user_id <> COALESCE(NEW.checked_in_by, NEW.user_id)
    LOOP
      INSERT INTO public.notifications (user_id, type, title, message, tool_id, checkout_id)
      VALUES (admin_rec.id, 'checkin',
        CASE WHEN is_admin_checkin THEN 'Devolução Manual por Admin' ELSE 'Ferramenta Devolvida' END,
        'A ferramenta "' || COALESCE(tool_name, 'Desconhecida') || '" (responsável: ' || COALESCE(user_name, 'usuário') || ') foi devolvida' ||
        CASE WHEN is_admin_checkin THEN ' pelo admin ' || COALESCE(admin_name, '') ELSE '' END || '.',
        NEW.tool_id, NEW.id);
    END LOOP;
    INSERT INTO public.notifications (user_id, type, title, message, tool_id, checkout_id)
    VALUES (NEW.user_id, 'checkin',
      CASE WHEN is_admin_checkin THEN 'Devolução registrada por Admin' ELSE 'Devolução Registrada' END,
      CASE WHEN is_admin_checkin THEN
        'O admin ' || COALESCE(admin_name, '') || ' registrou a devolução da ferramenta "' || COALESCE(tool_name, 'Desconhecida') || '" em seu nome.'
      ELSE
        'Sua devolução da ferramenta "' || COALESCE(tool_name, 'Desconhecida') || '" foi registrada com sucesso.'
      END,
      NEW.tool_id, NEW.id);
  END IF;
  RETURN NEW;
END;
$function$;

CREATE OR REPLACE FUNCTION public.notify_vehicle_checkout()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
DECLARE
  vehicle_name TEXT;
  vehicle_plate TEXT;
  user_name TEXT;
  admin_name TEXT;
  admin_rec RECORD;
  is_admin_action BOOLEAN;
BEGIN
  SELECT name, plate INTO vehicle_name, vehicle_plate FROM public.vehicles WHERE id = NEW.vehicle_id;
  SELECT full_name INTO user_name FROM public.profiles WHERE id = NEW.user_id;

  IF TG_OP = 'INSERT' AND NEW.status = 'checked_out' THEN
    is_admin_action := NEW.checked_out_by IS NOT NULL AND NEW.checked_out_by <> NEW.user_id;
    IF is_admin_action THEN
      SELECT full_name INTO admin_name FROM public.profiles WHERE id = NEW.checked_out_by;
    END IF;
    FOR admin_rec IN
      SELECT ur.user_id AS id FROM public.user_roles ur
      WHERE ur.role = 'admin' AND ur.user_id <> COALESCE(NEW.checked_out_by, '00000000-0000-0000-0000-000000000000'::uuid)
    LOOP
      INSERT INTO public.notifications (user_id, type, title, message)
      VALUES (admin_rec.id, 'vehicle_checkout',
        CASE WHEN is_admin_action THEN 'Retirada Manual de Veículo' ELSE 'Veículo Retirado' END,
        'O veículo "' || COALESCE(vehicle_name, '') || ' (' || COALESCE(vehicle_plate, '') || ')" foi retirado por ' || COALESCE(user_name, 'usuário') ||
        CASE WHEN is_admin_action THEN ' (registrado pelo admin ' || COALESCE(admin_name, '') || ').' ELSE '.' END);
    END LOOP;
    INSERT INTO public.notifications (user_id, type, title, message)
    VALUES (NEW.user_id, 'vehicle_checkout',
      CASE WHEN is_admin_action THEN 'Veículo atribuído a você' ELSE 'Retirada de Veículo Registrada' END,
      CASE WHEN is_admin_action THEN
        'O admin ' || COALESCE(admin_name, '') || ' retirou o veículo "' || COALESCE(vehicle_name, '') || ' (' || COALESCE(vehicle_plate, '') || ')" em seu nome.'
      ELSE
        'Sua retirada do veículo "' || COALESCE(vehicle_name, '') || ' (' || COALESCE(vehicle_plate, '') || ')" foi registrada.'
      END);

  ELSIF TG_OP = 'UPDATE' AND OLD.status = 'checked_out' AND NEW.status = 'checked_in' THEN
    is_admin_action := NEW.checked_in_by IS NOT NULL AND NEW.checked_in_by <> NEW.user_id;
    IF is_admin_action THEN
      SELECT full_name INTO admin_name FROM public.profiles WHERE id = NEW.checked_in_by;
    END IF;
    FOR admin_rec IN
      SELECT ur.user_id AS id FROM public.user_roles ur
      WHERE ur.role = 'admin' AND ur.user_id <> COALESCE(NEW.checked_in_by, NEW.user_id)
    LOOP
      INSERT INTO public.notifications (user_id, type, title, message)
      VALUES (admin_rec.id, 'vehicle_checkin',
        CASE WHEN is_admin_action THEN 'Devolução Manual de Veículo' ELSE 'Veículo Devolvido' END,
        'O veículo "' || COALESCE(vehicle_name, '') || ' (' || COALESCE(vehicle_plate, '') || ')" (resp.: ' || COALESCE(user_name, 'usuário') || ') foi devolvido' ||
        CASE WHEN is_admin_action THEN ' pelo admin ' || COALESCE(admin_name, '') ELSE '' END || '.');
    END LOOP;
    INSERT INTO public.notifications (user_id, type, title, message)
    VALUES (NEW.user_id, 'vehicle_checkin',
      CASE WHEN is_admin_action THEN 'Devolução registrada por Admin' ELSE 'Devolução de Veículo Registrada' END,
      CASE WHEN is_admin_action THEN
        'O admin ' || COALESCE(admin_name, '') || ' registrou a devolução do veículo "' || COALESCE(vehicle_name, '') || ' (' || COALESCE(vehicle_plate, '') || ')" em seu nome.'
      ELSE
        'Sua devolução do veículo "' || COALESCE(vehicle_name, '') || ' (' || COALESCE(vehicle_plate, '') || ')" foi registrada.'
      END);
  END IF;
  RETURN NEW;
END;
$function$;

-- 2) Bloquear qualquer UPDATE em profiles.role (dupla defesa; trigger já existe)
REVOKE UPDATE (role) ON public.profiles FROM authenticated, anon;

COMMENT ON COLUMN public.profiles.role IS
  'LEGADO — não use para autorização. Fonte de verdade é public.user_roles + public.has_role(). Mantido apenas para retrocompatibilidade de leitura.';

-- 3) Storage: dropar policies legadas do bucket checkout-images (não usado)
DROP POLICY IF EXISTS "Authenticated users can view checkout images" ON storage.objects;
DROP POLICY IF EXISTS "Authenticated users can upload checkout images" ON storage.objects;
DROP POLICY IF EXISTS "Authenticated users can update their checkout images" ON storage.objects;
DROP POLICY IF EXISTS "Authenticated users can delete their checkout images" ON storage.objects;
DROP POLICY IF EXISTS "checkout_images_select_owner_or_admin" ON storage.objects;
DROP POLICY IF EXISTS "checkout_images_insert_owner" ON storage.objects;
DROP POLICY IF EXISTS "checkout_images_update_owner_or_admin" ON storage.objects;
DROP POLICY IF EXISTS "checkout_images_delete_owner_or_admin" ON storage.objects;
