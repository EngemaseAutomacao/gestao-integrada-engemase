-- Drop the existing trigger
DROP TRIGGER IF EXISTS trigger_update_vehicle_availability ON public.vehicle_checkouts;

-- Create or replace the function to be more robust
CREATE OR REPLACE FUNCTION public.update_vehicle_availability()
 RETURNS trigger
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
BEGIN
  -- When a new checkout is created
  IF (TG_OP = 'INSERT') THEN
    IF (NEW.status = 'checked_out') THEN
      UPDATE public.vehicles SET status = 'in_use' WHERE id = NEW.vehicle_id;
    END IF;
  
  -- When a checkout is updated (e.g., returning the vehicle)
  ELSIF (TG_OP = 'UPDATE') THEN
    -- If it was checked out and is now checked in
    IF (OLD.status = 'checked_out' AND NEW.status = 'checked_in') THEN
      UPDATE public.vehicles SET status = 'available' WHERE id = NEW.vehicle_id;
    -- If it's still checked out but maybe some other field changed, keep it in_use just in case
    ELSIF (NEW.status = 'checked_out') THEN
      UPDATE public.vehicles SET status = 'in_use' WHERE id = NEW.vehicle_id;
    END IF;
  END IF;
  
  RETURN NEW;
END;
$function$;

-- Re-create the trigger as BEFORE to ensure it runs before the row is actually updated
CREATE TRIGGER trigger_update_vehicle_availability
BEFORE INSERT OR UPDATE ON public.vehicle_checkouts
FOR EACH ROW EXECUTE FUNCTION update_vehicle_availability();

-- Data fix: Set vehicles to 'available' if their latest checkout is already 'checked_in'
-- but the vehicle is still marked as 'in_use'
UPDATE public.vehicles v
SET status = 'available'
WHERE v.status = 'in_use'
AND EXISTS (
  SELECT 1 FROM public.vehicle_checkouts vc
  WHERE vc.vehicle_id = v.id
  AND vc.status = 'checked_in'
  AND NOT EXISTS (
    SELECT 1 FROM public.vehicle_checkouts vc2
    WHERE vc2.vehicle_id = v.id
    AND vc2.status = 'checked_out'
  )
);
