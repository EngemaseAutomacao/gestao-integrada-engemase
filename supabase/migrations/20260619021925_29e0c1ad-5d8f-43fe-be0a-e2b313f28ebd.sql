
-- Update vehicle checkout log to record manual admin actions
CREATE OR REPLACE FUNCTION public.log_vehicle_checkout()
 RETURNS trigger
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
DECLARE
  v_name TEXT;
  v_plate TEXT;
  u_name TEXT;
  admin_name TEXT;
  is_admin_action BOOLEAN;
  actor_id UUID;
BEGIN
  SELECT name, plate INTO v_name, v_plate FROM public.vehicles WHERE id = NEW.vehicle_id;
  SELECT full_name INTO u_name FROM public.profiles WHERE id = NEW.user_id;

  IF TG_OP = 'INSERT' AND NEW.status = 'checked_out' THEN
    is_admin_action := NEW.checked_out_by IS NOT NULL AND NEW.checked_out_by <> NEW.user_id;
    actor_id := COALESCE(NEW.checked_out_by, NEW.user_id);
    IF is_admin_action THEN
      SELECT full_name INTO admin_name FROM public.profiles WHERE id = NEW.checked_out_by;
    END IF;

    INSERT INTO public.system_logs (action, entity_type, entity_id, user_id, user_name, details)
    VALUES (
      CASE WHEN is_admin_action THEN 'manual_checkout_by_admin' ELSE 'checkout' END,
      'vehicle',
      NEW.vehicle_id,
      actor_id,
      COALESCE(admin_name, u_name),
      jsonb_build_object(
        'vehicle_name', v_name, 'plate', v_plate, 'destination', NEW.destination,
        'checkout_id', NEW.id, 'responsible_user_id', NEW.user_id, 'responsible_user_name', u_name,
        'performed_by_admin', is_admin_action, 'admin_name', admin_name
      )
    );
  ELSIF TG_OP = 'UPDATE' AND OLD.status = 'checked_out' AND NEW.status = 'checked_in' THEN
    is_admin_action := NEW.checked_in_by IS NOT NULL AND NEW.checked_in_by <> NEW.user_id;
    actor_id := COALESCE(NEW.checked_in_by, NEW.user_id);
    IF is_admin_action THEN
      SELECT full_name INTO admin_name FROM public.profiles WHERE id = NEW.checked_in_by;
    END IF;

    INSERT INTO public.system_logs (action, entity_type, entity_id, user_id, user_name, details)
    VALUES (
      CASE WHEN is_admin_action THEN 'manual_checkin_by_admin' ELSE 'checkin' END,
      'vehicle',
      NEW.vehicle_id,
      actor_id,
      COALESCE(admin_name, u_name),
      jsonb_build_object(
        'vehicle_name', v_name, 'plate', v_plate, 'checkout_id', NEW.id,
        'responsible_user_id', NEW.user_id, 'responsible_user_name', u_name,
        'performed_by_admin', is_admin_action, 'admin_name', admin_name
      )
    );
  END IF;
  RETURN NEW;
END;
$function$;

-- Update vehicle notify trigger
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

    FOR admin_rec IN SELECT id FROM public.profiles WHERE role = 'admin' AND id <> NEW.checked_out_by LOOP
      INSERT INTO public.notifications (user_id, type, title, message)
      VALUES (
        admin_rec.id, 'vehicle_checkout',
        CASE WHEN is_admin_action THEN 'Retirada Manual de Veículo' ELSE 'Veículo Retirado' END,
        'O veículo "' || COALESCE(vehicle_name, '') || ' (' || COALESCE(vehicle_plate, '') || ')" foi retirado por ' ||
        COALESCE(user_name, 'usuário') ||
        CASE WHEN is_admin_action THEN ' (registrado pelo admin ' || COALESCE(admin_name, '') || ').' ELSE '.' END
      );
    END LOOP;

    INSERT INTO public.notifications (user_id, type, title, message)
    VALUES (
      NEW.user_id, 'vehicle_checkout',
      CASE WHEN is_admin_action THEN 'Veículo atribuído a você' ELSE 'Retirada de Veículo Registrada' END,
      CASE WHEN is_admin_action THEN
        'O admin ' || COALESCE(admin_name, '') || ' retirou o veículo "' || COALESCE(vehicle_name, '') || ' (' || COALESCE(vehicle_plate, '') || ')" em seu nome.'
      ELSE
        'Sua retirada do veículo "' || COALESCE(vehicle_name, '') || ' (' || COALESCE(vehicle_plate, '') || ')" foi registrada.'
      END
    );

  ELSIF TG_OP = 'UPDATE' AND OLD.status = 'checked_out' AND NEW.status = 'checked_in' THEN
    is_admin_action := NEW.checked_in_by IS NOT NULL AND NEW.checked_in_by <> NEW.user_id;
    IF is_admin_action THEN
      SELECT full_name INTO admin_name FROM public.profiles WHERE id = NEW.checked_in_by;
    END IF;

    FOR admin_rec IN SELECT id FROM public.profiles WHERE role = 'admin' AND id <> COALESCE(NEW.checked_in_by, NEW.user_id) LOOP
      INSERT INTO public.notifications (user_id, type, title, message)
      VALUES (
        admin_rec.id, 'vehicle_checkin',
        CASE WHEN is_admin_action THEN 'Devolução Manual de Veículo' ELSE 'Veículo Devolvido' END,
        'O veículo "' || COALESCE(vehicle_name, '') || ' (' || COALESCE(vehicle_plate, '') || ')" (resp.: ' || COALESCE(user_name, 'usuário') || ') foi devolvido' ||
        CASE WHEN is_admin_action THEN ' pelo admin ' || COALESCE(admin_name, '') ELSE '' END || '.'
      );
    END LOOP;

    INSERT INTO public.notifications (user_id, type, title, message)
    VALUES (
      NEW.user_id, 'vehicle_checkin',
      CASE WHEN is_admin_action THEN 'Devolução registrada por Admin' ELSE 'Devolução de Veículo Registrada' END,
      CASE WHEN is_admin_action THEN
        'O admin ' || COALESCE(admin_name, '') || ' registrou a devolução do veículo "' || COALESCE(vehicle_name, '') || ' (' || COALESCE(vehicle_plate, '') || ')" em seu nome.'
      ELSE
        'Sua devolução do veículo "' || COALESCE(vehicle_name, '') || ' (' || COALESCE(vehicle_plate, '') || ')" foi registrada.'
      END
    );
  END IF;
  RETURN NEW;
END;
$function$;

-- Validation trigger for vehicles: require notes when admin acts for other user
CREATE OR REPLACE FUNCTION public.validate_admin_manual_vehicle_action()
 RETURNS trigger
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
BEGIN
  IF TG_OP = 'INSERT' AND NEW.status = 'checked_out'
     AND NEW.checked_out_by IS NOT NULL AND NEW.checked_out_by <> NEW.user_id THEN
    IF NEW.notes IS NULL OR length(trim(NEW.notes)) < 5 THEN
      RAISE EXCEPTION 'Justificativa obrigatória (mín. 5 caracteres) ao retirar veículo em nome de outro usuário.';
    END IF;
  END IF;

  IF TG_OP = 'UPDATE' AND OLD.status = 'checked_out' AND NEW.status = 'checked_in'
     AND NEW.checked_in_by IS NOT NULL AND NEW.checked_in_by <> NEW.user_id THEN
    IF NEW.notes IS NULL OR length(trim(NEW.notes)) < 5 THEN
      RAISE EXCEPTION 'Justificativa obrigatória (mín. 5 caracteres) ao devolver veículo em nome de outro usuário.';
    END IF;
  END IF;
  RETURN NEW;
END;
$function$;

DROP TRIGGER IF EXISTS validate_admin_manual_vehicle_action_trigger ON public.vehicle_checkouts;
CREATE TRIGGER validate_admin_manual_vehicle_action_trigger
BEFORE INSERT OR UPDATE ON public.vehicle_checkouts
FOR EACH ROW EXECUTE FUNCTION public.validate_admin_manual_vehicle_action();
