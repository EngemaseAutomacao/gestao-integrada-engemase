
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
    SELECT 
      tc.id,
      tc.user_id,
      tc.tool_id,
      tc.estimated_return_date,
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

    FOR admin_record IN SELECT id FROM public.profiles WHERE role = 'admin' LOOP
      INSERT INTO public.notifications (user_id, type, title, message, tool_id, checkout_id)
      VALUES (
        admin_record.id,
        'overdue',
        'Ferramenta Atrasada',
        'A ferramenta "' || overdue_record.tool_name || '" está atrasada há ' || days_overdue || ' dia(s). Por favor, solicite a devolução.',
        overdue_record.tool_id,
        overdue_record.id
      );
    END LOOP;

    INSERT INTO public.notifications (user_id, type, title, message, tool_id, checkout_id)
    VALUES (
      overdue_record.user_id,
      'overdue_user_reminder',
      'Ferramenta em Atraso!',
      'A ferramenta "' || overdue_record.tool_name || '" está atrasada há ' || days_overdue || ' dia(s). Por favor, devolva o quanto antes.',
      overdue_record.tool_id,
      overdue_record.id
    );
  END LOOP;
END;
$function$;
