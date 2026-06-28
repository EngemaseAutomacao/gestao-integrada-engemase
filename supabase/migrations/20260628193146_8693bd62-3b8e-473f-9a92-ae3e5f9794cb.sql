CREATE OR REPLACE FUNCTION public.check_prolonged_vehicle_use()
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
DECLARE
  prolonged_record RECORD;
  days_in_use INTEGER;
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
      AND vc.checkout_date < NOW() - INTERVAL '1 day'
      AND NOT EXISTS (
        SELECT 1 FROM public.notifications n
        WHERE n.type = 'vehicle_prolonged_use'
          AND n.user_id = vc.user_id
          AND n.message LIKE '%' || v.plate || '%'
          AND n.created_at > NOW() - INTERVAL '24 hours'
      )
  LOOP
    days_in_use := GREATEST(1, CEIL(EXTRACT(EPOCH FROM NOW() - prolonged_record.checkout_date) / 86400.0))::INTEGER;

    INSERT INTO public.notifications (user_id, type, title, message)
    VALUES (
      prolonged_record.user_id,
      'vehicle_prolonged_use',
      'Veículo em Uso Prolongado',
      'O veículo "' || COALESCE(prolonged_record.vehicle_name, '') || ' (' || COALESCE(prolonged_record.vehicle_plate, '') || ')" está em uso há ' || days_in_use || ' dia(s). Lembre-se de devolvê-lo quando possível.'
    );
  END LOOP;
END;
$$;