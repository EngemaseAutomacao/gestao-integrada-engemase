
-- Add estimated_return_date for vehicles (day-based prazo)
ALTER TABLE public.vehicle_checkouts
  ADD COLUMN IF NOT EXISTS estimated_return_date TIMESTAMPTZ;

-- Replace overdue check to use estimated_return_date in days (like tools)
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
    SELECT 
      vc.id,
      vc.user_id,
      vc.vehicle_id,
      vc.estimated_return_date,
      v.name as vehicle_name,
      v.plate as vehicle_plate,
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
    VALUES (
      overdue_record.user_id,
      'vehicle_overdue_return',
      'Veículo Atrasado!',
      'O veículo "' || COALESCE(overdue_record.vehicle_name, '') || ' (' || COALESCE(overdue_record.vehicle_plate, '') || ')" está atrasado há ' || days_late || ' dia(s). Por favor, devolva o veículo.'
    );

    FOR admin_record IN SELECT id FROM public.profiles WHERE role = 'admin' LOOP
      INSERT INTO public.notifications (user_id, type, title, message)
      VALUES (
        admin_record.id,
        'vehicle_overdue_return',
        'Veículo com Retorno Atrasado',
        'O veículo "' || COALESCE(overdue_record.vehicle_name, '') || ' (' || COALESCE(overdue_record.vehicle_plate, '') || ')" está atrasado há ' || days_late || ' dia(s). Responsável: ' || COALESCE((SELECT full_name FROM public.profiles WHERE id = overdue_record.user_id), 'desconhecido') || '.'
      );
    END LOOP;
  END LOOP;
END;
$function$;
