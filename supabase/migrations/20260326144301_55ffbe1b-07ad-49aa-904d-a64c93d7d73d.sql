
-- 1. Notify user when account is approved
CREATE OR REPLACE FUNCTION public.notify_user_approved()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
BEGIN
  IF TG_OP = 'UPDATE' AND OLD.approved = false AND NEW.approved = true THEN
    INSERT INTO public.notifications (user_id, type, title, message)
    VALUES (
      NEW.id,
      'account_approved',
      'Conta Aprovada!',
      'Sua conta foi aprovada! Agora você pode utilizar todas as funcionalidades do sistema.'
    );
  END IF;
  RETURN NEW;
END;
$$;

CREATE TRIGGER trigger_notify_user_approved
  AFTER UPDATE ON public.profiles
  FOR EACH ROW
  EXECUTE FUNCTION public.notify_user_approved();

-- 2. Notify user when their reported issue is resolved
CREATE OR REPLACE FUNCTION public.notify_issue_resolved()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
DECLARE
  tool_name TEXT;
BEGIN
  IF TG_OP = 'UPDATE' AND OLD.status != 'resolved' AND NEW.status = 'resolved' THEN
    SELECT name INTO tool_name FROM public.tools WHERE id = NEW.tool_id;

    INSERT INTO public.notifications (user_id, type, title, message, tool_id)
    VALUES (
      NEW.reported_by,
      'issue_resolved',
      'Problema Resolvido',
      'O problema "' || NEW.title || '" na ferramenta "' || COALESCE(tool_name, 'Desconhecida') || '" foi resolvido.' ||
      CASE WHEN NEW.resolution_notes IS NOT NULL THEN ' Observação: ' || NEW.resolution_notes ELSE '' END,
      NEW.tool_id
    );
  END IF;
  RETURN NEW;
END;
$$;

CREATE TRIGGER trigger_notify_issue_resolved
  AFTER UPDATE ON public.tool_issues
  FOR EACH ROW
  EXECUTE FUNCTION public.notify_issue_resolved();

-- 3. Update check_overdue_tools to also send daily reminders to users
CREATE OR REPLACE FUNCTION public.check_overdue_tools()
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
DECLARE
  overdue_record RECORD;
  admin_record RECORD;
BEGIN
  FOR overdue_record IN
    SELECT 
      tc.id,
      tc.user_id,
      tc.tool_id,
      tc.estimated_return_date,
      t.name as tool_name,
      EXTRACT(DAY FROM NOW() - tc.estimated_return_date)::INTEGER as days_overdue
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
    -- Notify admins (existing behavior)
    FOR admin_record IN SELECT id FROM public.profiles WHERE role = 'admin' LOOP
      INSERT INTO public.notifications (user_id, type, title, message, tool_id, checkout_id)
      VALUES (
        admin_record.id,
        'overdue',
        'Ferramenta Atrasada',
        'A ferramenta "' || overdue_record.tool_name || '" está atrasada há ' || overdue_record.days_overdue || ' dia(s). Por favor, solicite a devolução.',
        overdue_record.tool_id,
        overdue_record.id
      );
    END LOOP;

    -- Notify the user daily
    INSERT INTO public.notifications (user_id, type, title, message, tool_id, checkout_id)
    VALUES (
      overdue_record.user_id,
      'overdue_user_reminder',
      'Ferramenta em Atraso!',
      'A ferramenta "' || overdue_record.tool_name || '" está atrasada há ' || overdue_record.days_overdue || ' dia(s). Por favor, devolva o quanto antes.',
      overdue_record.tool_id,
      overdue_record.id
    );
  END LOOP;
END;
$$;

-- 4. Check for vehicles in prolonged use (>24h)
CREATE OR REPLACE FUNCTION public.check_prolonged_vehicle_use()
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
DECLARE
  prolonged_record RECORD;
  hours_in_use INTEGER;
BEGIN
  FOR prolonged_record IN
    SELECT 
      vc.id,
      vc.user_id,
      vc.vehicle_id,
      vc.checkout_date,
      v.name as vehicle_name,
      v.plate as vehicle_plate
    FROM public.vehicle_checkouts vc
    JOIN public.vehicles v ON v.id = vc.vehicle_id
    WHERE vc.status = 'checked_out'
      AND vc.checkout_date < NOW() - INTERVAL '24 hours'
      AND NOT EXISTS (
        SELECT 1 FROM public.notifications n
        WHERE n.type = 'vehicle_prolonged_use'
          AND n.user_id = vc.user_id
          AND n.message LIKE '%' || v.plate || '%'
          AND n.created_at > NOW() - INTERVAL '24 hours'
      )
  LOOP
    hours_in_use := EXTRACT(EPOCH FROM NOW() - prolonged_record.checkout_date)::INTEGER / 3600;

    INSERT INTO public.notifications (user_id, type, title, message)
    VALUES (
      prolonged_record.user_id,
      'vehicle_prolonged_use',
      'Veículo em Uso Prolongado',
      'O veículo "' || COALESCE(prolonged_record.vehicle_name, '') || ' (' || COALESCE(prolonged_record.vehicle_plate, '') || ')" está em uso há ' || hours_in_use || ' horas. Lembre-se de devolvê-lo quando possível.'
    );
  END LOOP;
END;
$$;
