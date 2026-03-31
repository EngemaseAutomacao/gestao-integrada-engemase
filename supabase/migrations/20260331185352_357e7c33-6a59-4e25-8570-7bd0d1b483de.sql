
-- Enable realtime for tool_checkouts and vehicle_checkouts
ALTER PUBLICATION supabase_realtime ADD TABLE public.tool_checkouts;
ALTER PUBLICATION supabase_realtime ADD TABLE public.vehicle_checkouts;

-- Audit trigger for tool deletions
CREATE OR REPLACE FUNCTION public.log_tool_deletion()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
BEGIN
  INSERT INTO public.system_logs (action, entity_type, entity_id, user_id, user_name, details)
  VALUES (
    'delete',
    'tool',
    OLD.id,
    auth.uid(),
    (SELECT full_name FROM public.profiles WHERE id = auth.uid()),
    jsonb_build_object('tool_name', OLD.name, 'brand', OLD.brand, 'tag', OLD.tag)
  );
  RETURN OLD;
END;
$$;

CREATE TRIGGER trigger_log_tool_deletion
  BEFORE DELETE ON public.tools
  FOR EACH ROW
  EXECUTE FUNCTION public.log_tool_deletion();

-- Audit trigger for vehicle deletions
CREATE OR REPLACE FUNCTION public.log_vehicle_deletion()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
BEGIN
  INSERT INTO public.system_logs (action, entity_type, entity_id, user_id, user_name, details)
  VALUES (
    'delete',
    'vehicle',
    OLD.id,
    auth.uid(),
    (SELECT full_name FROM public.profiles WHERE id = auth.uid()),
    jsonb_build_object('vehicle_name', OLD.name, 'plate', OLD.plate, 'brand', OLD.brand)
  );
  RETURN OLD;
END;
$$;

CREATE TRIGGER trigger_log_vehicle_deletion
  BEFORE DELETE ON public.vehicles
  FOR EACH ROW
  EXECUTE FUNCTION public.log_vehicle_deletion();
