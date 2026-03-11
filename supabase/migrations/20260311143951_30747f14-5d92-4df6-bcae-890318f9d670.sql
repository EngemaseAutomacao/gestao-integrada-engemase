CREATE OR REPLACE FUNCTION public.check_maintenance_reminders()
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
DECLARE
  maintenance_record RECORD;
  admin_record RECORD;
BEGIN
  FOR maintenance_record IN
    SELECT 
      mr.id,
      mr.tool_id,
      mr.next_maintenance_date,
      t.name as tool_name
    FROM public.maintenance_records mr
    JOIN public.tools t ON t.id = mr.tool_id
    WHERE mr.next_maintenance_date IS NOT NULL
      AND mr.next_maintenance_date BETWEEN CURRENT_DATE AND CURRENT_DATE + INTERVAL '7 days'
      AND NOT EXISTS (
        SELECT 1 FROM public.notifications n
        WHERE n.tool_id = mr.tool_id
          AND n.type = 'maintenance_reminder'
          AND n.created_at > NOW() - INTERVAL '7 days'
      )
  LOOP
    FOR admin_record IN
      SELECT id FROM public.profiles WHERE role = 'admin'
    LOOP
      INSERT INTO public.notifications (user_id, type, title, message, tool_id)
      VALUES (
        admin_record.id,
        'maintenance_reminder',
        'Manutenção Preventiva',
        'A ferramenta "' || maintenance_record.tool_name || '" tem manutenção agendada para ' || 
        TO_CHAR(maintenance_record.next_maintenance_date, 'DD/MM/YYYY') || '.',
        maintenance_record.tool_id
      );
    END LOOP;
  END LOOP;
END;
$$;