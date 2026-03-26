
-- Function: notify on tool checkout
CREATE OR REPLACE FUNCTION public.notify_tool_checkout()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
DECLARE
  tool_name TEXT;
  user_name TEXT;
  admin_rec RECORD;
BEGIN
  SELECT name INTO tool_name FROM public.tools WHERE id = NEW.tool_id;
  SELECT full_name INTO user_name FROM public.profiles WHERE id = NEW.user_id;

  IF TG_OP = 'INSERT' AND NEW.status = 'checked_out' THEN
    -- Notify all admins
    FOR admin_rec IN SELECT id FROM public.profiles WHERE role = 'admin' AND id != NEW.checked_out_by LOOP
      INSERT INTO public.notifications (user_id, type, title, message, tool_id, checkout_id)
      VALUES (
        admin_rec.id,
        'checkout',
        'Ferramenta Retirada',
        'A ferramenta "' || COALESCE(tool_name, 'Desconhecida') || '" foi retirada por ' || COALESCE(user_name, 'usuário') || '.',
        NEW.tool_id,
        NEW.id
      );
    END LOOP;

    -- Notify the user
    INSERT INTO public.notifications (user_id, type, title, message, tool_id, checkout_id)
    VALUES (
      NEW.user_id,
      'checkout',
      'Retirada Registrada',
      'Sua retirada da ferramenta "' || COALESCE(tool_name, 'Desconhecida') || '" foi registrada com sucesso.',
      NEW.tool_id,
      NEW.id
    );

  ELSIF TG_OP = 'UPDATE' AND OLD.status = 'checked_out' AND NEW.status = 'checked_in' THEN
    -- Notify all admins
    FOR admin_rec IN SELECT id FROM public.profiles WHERE role = 'admin' AND id != COALESCE(NEW.checked_in_by, NEW.user_id) LOOP
      INSERT INTO public.notifications (user_id, type, title, message, tool_id, checkout_id)
      VALUES (
        admin_rec.id,
        'checkin',
        'Ferramenta Devolvida',
        'A ferramenta "' || COALESCE(tool_name, 'Desconhecida') || '" foi devolvida por ' || COALESCE(user_name, 'usuário') || '.',
        NEW.tool_id,
        NEW.id
      );
    END LOOP;

    -- Notify the user
    INSERT INTO public.notifications (user_id, type, title, message, tool_id, checkout_id)
    VALUES (
      NEW.user_id,
      'checkin',
      'Devolução Registrada',
      'Sua devolução da ferramenta "' || COALESCE(tool_name, 'Desconhecida') || '" foi registrada com sucesso.',
      NEW.tool_id,
      NEW.id
    );
  END IF;

  RETURN NEW;
END;
$$;

-- Function: notify on vehicle checkout
CREATE OR REPLACE FUNCTION public.notify_vehicle_checkout()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
DECLARE
  vehicle_name TEXT;
  vehicle_plate TEXT;
  user_name TEXT;
  admin_rec RECORD;
BEGIN
  SELECT name, plate INTO vehicle_name, vehicle_plate FROM public.vehicles WHERE id = NEW.vehicle_id;
  SELECT full_name INTO user_name FROM public.profiles WHERE id = NEW.user_id;

  IF TG_OP = 'INSERT' AND NEW.status = 'checked_out' THEN
    FOR admin_rec IN SELECT id FROM public.profiles WHERE role = 'admin' AND id != NEW.checked_out_by LOOP
      INSERT INTO public.notifications (user_id, type, title, message)
      VALUES (
        admin_rec.id,
        'vehicle_checkout',
        'Veículo Retirado',
        'O veículo "' || COALESCE(vehicle_name, '') || ' (' || COALESCE(vehicle_plate, '') || ')" foi retirado por ' || COALESCE(user_name, 'usuário') || '.'
      );
    END LOOP;

    INSERT INTO public.notifications (user_id, type, title, message)
    VALUES (
      NEW.user_id,
      'vehicle_checkout',
      'Retirada de Veículo Registrada',
      'Sua retirada do veículo "' || COALESCE(vehicle_name, '') || ' (' || COALESCE(vehicle_plate, '') || ')" foi registrada.'
    );

  ELSIF TG_OP = 'UPDATE' AND OLD.status = 'checked_out' AND NEW.status = 'checked_in' THEN
    FOR admin_rec IN SELECT id FROM public.profiles WHERE role = 'admin' AND id != COALESCE(NEW.checked_in_by, NEW.user_id) LOOP
      INSERT INTO public.notifications (user_id, type, title, message)
      VALUES (
        admin_rec.id,
        'vehicle_checkin',
        'Veículo Devolvido',
        'O veículo "' || COALESCE(vehicle_name, '') || ' (' || COALESCE(vehicle_plate, '') || ')" foi devolvido por ' || COALESCE(user_name, 'usuário') || '.'
      );
    END LOOP;

    INSERT INTO public.notifications (user_id, type, title, message)
    VALUES (
      NEW.user_id,
      'vehicle_checkin',
      'Devolução de Veículo Registrada',
      'Sua devolução do veículo "' || COALESCE(vehicle_name, '') || ' (' || COALESCE(vehicle_plate, '') || ')" foi registrada.'
    );
  END IF;

  RETURN NEW;
END;
$$;

-- Function: notify on new tool issue
CREATE OR REPLACE FUNCTION public.notify_new_issue()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
DECLARE
  tool_name TEXT;
  reporter_name TEXT;
  admin_rec RECORD;
BEGIN
  SELECT name INTO tool_name FROM public.tools WHERE id = NEW.tool_id;
  SELECT full_name INTO reporter_name FROM public.profiles WHERE id = NEW.reported_by;

  FOR admin_rec IN SELECT id FROM public.profiles WHERE role = 'admin' LOOP
    INSERT INTO public.notifications (user_id, type, title, message, tool_id)
    VALUES (
      admin_rec.id,
      'issue_reported',
      'Problema Reportado: ' || NEW.severity,
      'Um problema foi reportado na ferramenta "' || COALESCE(tool_name, 'Desconhecida') || '" por ' || COALESCE(reporter_name, 'usuário') || ': ' || NEW.title,
      NEW.tool_id
    );
  END LOOP;

  RETURN NEW;
END;
$$;

-- Function: notify on new user registration (pending approval)
CREATE OR REPLACE FUNCTION public.notify_new_user()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
DECLARE
  admin_rec RECORD;
BEGIN
  IF TG_OP = 'INSERT' AND NEW.approved = false THEN
    FOR admin_rec IN SELECT id FROM public.profiles WHERE role = 'admin' LOOP
      INSERT INTO public.notifications (user_id, type, title, message)
      VALUES (
        admin_rec.id,
        'user_pending',
        'Novo Usuário Aguardando Aprovação',
        'O usuário "' || COALESCE(NEW.full_name, NEW.email) || '" se registrou e aguarda aprovação.'
      );
    END LOOP;
  END IF;

  RETURN NEW;
END;
$$;

-- Create triggers
CREATE TRIGGER trigger_notify_tool_checkout
  AFTER INSERT OR UPDATE ON public.tool_checkouts
  FOR EACH ROW
  EXECUTE FUNCTION public.notify_tool_checkout();

CREATE TRIGGER trigger_notify_vehicle_checkout
  AFTER INSERT OR UPDATE ON public.vehicle_checkouts
  FOR EACH ROW
  EXECUTE FUNCTION public.notify_vehicle_checkout();

CREATE TRIGGER trigger_notify_new_issue
  AFTER INSERT ON public.tool_issues
  FOR EACH ROW
  EXECUTE FUNCTION public.notify_new_issue();

CREATE TRIGGER trigger_notify_new_user
  AFTER INSERT ON public.profiles
  FOR EACH ROW
  EXECUTE FUNCTION public.notify_new_user();
