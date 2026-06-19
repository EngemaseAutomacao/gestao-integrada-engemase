
CREATE OR REPLACE FUNCTION public.log_tool_checkout()
 RETURNS trigger
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
DECLARE
  tool_name TEXT;
  user_name TEXT;
  admin_name TEXT;
  is_admin_action BOOLEAN;
  actor_id UUID;
BEGIN
  SELECT name INTO tool_name FROM public.tools WHERE id = NEW.tool_id;
  SELECT full_name INTO user_name FROM public.profiles WHERE id = NEW.user_id;

  IF TG_OP = 'INSERT' THEN
    is_admin_action := NEW.checked_out_by IS NOT NULL AND NEW.checked_out_by <> NEW.user_id;
    actor_id := COALESCE(NEW.checked_out_by, NEW.user_id);
    IF is_admin_action THEN
      SELECT full_name INTO admin_name FROM public.profiles WHERE id = NEW.checked_out_by;
    END IF;

    INSERT INTO public.system_logs (action, entity_type, entity_id, user_id, user_name, details)
    VALUES (
      CASE WHEN is_admin_action THEN 'manual_checkout_by_admin' ELSE 'checkout' END,
      'tool',
      NEW.tool_id,
      actor_id,
      COALESCE(admin_name, user_name),
      jsonb_build_object(
        'tool_name', tool_name,
        'construction_site', NEW.construction_site,
        'selected_tag', NEW.selected_tag,
        'checkout_id', NEW.id,
        'responsible_user_id', NEW.user_id,
        'responsible_user_name', user_name,
        'performed_by_admin', is_admin_action,
        'admin_name', admin_name
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
      'tool',
      NEW.tool_id,
      actor_id,
      COALESCE(admin_name, user_name),
      jsonb_build_object(
        'tool_name', tool_name,
        'checkout_id', NEW.id,
        'responsible_user_id', NEW.user_id,
        'responsible_user_name', user_name,
        'performed_by_admin', is_admin_action,
        'admin_name', admin_name
      )
    );
  END IF;
  RETURN NEW;
END;
$function$;
