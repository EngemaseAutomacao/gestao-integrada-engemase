CREATE OR REPLACE FUNCTION public.check_vehicle_overdue_return()
 RETURNS void
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
DECLARE
  overdue_record RECORD;
  admin_record RECORD;
  return_timestamp TIMESTAMPTZ;
  hours_late NUMERIC;
BEGIN
  FOR overdue_record IN
    SELECT 
      vc.id,
      vc.user_id,
      vc.vehicle_id,
      vc.estimated_return_time,
      vc.checkout_date,
      v.name as vehicle_name,
      v.plate as vehicle_plate
    FROM public.vehicle_checkouts vc
    JOIN public.vehicles v ON v.id = vc.vehicle_id
    WHERE vc.status = 'checked_out'
      AND vc.estimated_return_time IS NOT NULL
      AND NOT EXISTS (
        SELECT 1 FROM public.notifications n
        WHERE n.type = 'vehicle_overdue_return'
          AND n.user_id = vc.user_id
          AND n.message LIKE '%' || v.plate || '%'
          AND n.created_at > NOW() - INTERVAL '1 hour'
      )
  LOOP
    -- Build timestamp from checkout_date date + estimated_return_time
    return_timestamp := (overdue_record.checkout_date::date + overdue_record.estimated_return_time)::timestamptz;

    -- If estimated return is before checkout time, assume next day
    IF return_timestamp <= overdue_record.checkout_date THEN
      return_timestamp := return_timestamp + INTERVAL '1 day';
    END IF;

    -- Only alert if past estimated return
    IF NOW() > return_timestamp THEN
      hours_late := ROUND(EXTRACT(EPOCH FROM NOW() - return_timestamp) / 3600, 1);

      INSERT INTO public.notifications (user_id, type, title, message)
      VALUES (
        overdue_record.user_id,
        'vehicle_overdue_return',
        'Veículo Atrasado!',
        'O veículo "' || COALESCE(overdue_record.vehicle_name, '') || ' (' || COALESCE(overdue_record.vehicle_plate, '') || ')" passou da hora estimada de retorno há ' || hours_late || ' hora(s). Por favor, devolva o veículo.'
      );

      FOR admin_record IN SELECT id FROM public.profiles WHERE role = 'admin' LOOP
        INSERT INTO public.notifications (user_id, type, title, message)
        VALUES (
          admin_record.id,
          'vehicle_overdue_return',
          'Veículo com Retorno Atrasado',
          'O veículo "' || COALESCE(overdue_record.vehicle_name, '') || ' (' || COALESCE(overdue_record.vehicle_plate, '') || ')" está atrasado há ' || hours_late || ' hora(s). Responsável: ' || COALESCE((SELECT full_name FROM public.profiles WHERE id = overdue_record.user_id), 'desconhecido') || '.'
        );
      END LOOP;
    END IF;
  END LOOP;
END;
$function$;