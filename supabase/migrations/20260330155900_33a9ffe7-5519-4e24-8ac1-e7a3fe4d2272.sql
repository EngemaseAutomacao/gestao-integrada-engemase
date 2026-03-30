
-- Create system_logs table for tracking all system actions
CREATE TABLE public.system_logs (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  action text NOT NULL,
  entity_type text NOT NULL,
  entity_id uuid,
  user_id uuid,
  user_name text,
  details jsonb DEFAULT '{}'::jsonb,
  created_at timestamp with time zone NOT NULL DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.system_logs ENABLE ROW LEVEL SECURITY;

-- Only admins can view logs
CREATE POLICY "Admins can view all logs" ON public.system_logs
  FOR SELECT TO authenticated
  USING (has_role(auth.uid(), 'admin'::user_role));

-- Allow inserts from triggers (service role)
CREATE POLICY "System can insert logs" ON public.system_logs
  FOR INSERT TO authenticated
  WITH CHECK (true);

-- Create trigger function for tool checkouts
CREATE OR REPLACE FUNCTION public.log_tool_checkout()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
DECLARE
  tool_name TEXT;
  user_name TEXT;
BEGIN
  SELECT name INTO tool_name FROM public.tools WHERE id = NEW.tool_id;
  SELECT full_name INTO user_name FROM public.profiles WHERE id = NEW.user_id;

  IF TG_OP = 'INSERT' THEN
    INSERT INTO public.system_logs (action, entity_type, entity_id, user_id, user_name, details)
    VALUES (
      'checkout',
      'tool',
      NEW.tool_id,
      NEW.user_id,
      user_name,
      jsonb_build_object(
        'tool_name', tool_name,
        'construction_site', NEW.construction_site,
        'selected_tag', NEW.selected_tag,
        'checkout_id', NEW.id
      )
    );
  ELSIF TG_OP = 'UPDATE' AND OLD.status = 'checked_out' AND NEW.status = 'checked_in' THEN
    INSERT INTO public.system_logs (action, entity_type, entity_id, user_id, user_name, details)
    VALUES (
      'checkin',
      'tool',
      NEW.tool_id,
      COALESCE(NEW.checked_in_by, NEW.user_id),
      (SELECT full_name FROM public.profiles WHERE id = COALESCE(NEW.checked_in_by, NEW.user_id)),
      jsonb_build_object(
        'tool_name', tool_name,
        'checkout_id', NEW.id
      )
    );
  END IF;
  RETURN NEW;
END;
$$;

CREATE TRIGGER on_tool_checkout_log
  AFTER INSERT OR UPDATE ON public.tool_checkouts
  FOR EACH ROW EXECUTE FUNCTION public.log_tool_checkout();

-- Create trigger function for vehicle checkouts
CREATE OR REPLACE FUNCTION public.log_vehicle_checkout()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
DECLARE
  v_name TEXT;
  v_plate TEXT;
  u_name TEXT;
BEGIN
  SELECT name, plate INTO v_name, v_plate FROM public.vehicles WHERE id = NEW.vehicle_id;
  SELECT full_name INTO u_name FROM public.profiles WHERE id = NEW.user_id;

  IF TG_OP = 'INSERT' AND NEW.status = 'checked_out' THEN
    INSERT INTO public.system_logs (action, entity_type, entity_id, user_id, user_name, details)
    VALUES (
      'checkout',
      'vehicle',
      NEW.vehicle_id,
      NEW.user_id,
      u_name,
      jsonb_build_object('vehicle_name', v_name, 'plate', v_plate, 'destination', NEW.destination, 'checkout_id', NEW.id)
    );
  ELSIF TG_OP = 'UPDATE' AND OLD.status = 'checked_out' AND NEW.status = 'checked_in' THEN
    INSERT INTO public.system_logs (action, entity_type, entity_id, user_id, user_name, details)
    VALUES (
      'checkin',
      'vehicle',
      NEW.vehicle_id,
      COALESCE(NEW.checked_in_by, NEW.user_id),
      (SELECT full_name FROM public.profiles WHERE id = COALESCE(NEW.checked_in_by, NEW.user_id)),
      jsonb_build_object('vehicle_name', v_name, 'plate', v_plate, 'checkout_id', NEW.id)
    );
  END IF;
  RETURN NEW;
END;
$$;

CREATE TRIGGER on_vehicle_checkout_log
  AFTER INSERT OR UPDATE ON public.vehicle_checkouts
  FOR EACH ROW EXECUTE FUNCTION public.log_vehicle_checkout();

-- Log user creation/approval
CREATE OR REPLACE FUNCTION public.log_user_events()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
BEGIN
  IF TG_OP = 'INSERT' THEN
    INSERT INTO public.system_logs (action, entity_type, entity_id, user_id, user_name, details)
    VALUES ('user_registered', 'user', NEW.id, NEW.id, NEW.full_name,
      jsonb_build_object('email', NEW.email, 'category', NEW.category));
  ELSIF TG_OP = 'UPDATE' AND OLD.approved = false AND NEW.approved = true THEN
    INSERT INTO public.system_logs (action, entity_type, entity_id, user_id, user_name, details)
    VALUES ('user_approved', 'user', NEW.id, auth.uid(), 
      (SELECT full_name FROM public.profiles WHERE id = auth.uid()),
      jsonb_build_object('approved_user', NEW.full_name, 'email', NEW.email));
  END IF;
  RETURN NEW;
END;
$$;

CREATE TRIGGER on_user_event_log
  AFTER INSERT OR UPDATE ON public.profiles
  FOR EACH ROW EXECUTE FUNCTION public.log_user_events();

-- Log issue reports
CREATE OR REPLACE FUNCTION public.log_issue_events()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
DECLARE
  tool_name TEXT;
  u_name TEXT;
BEGIN
  SELECT name INTO tool_name FROM public.tools WHERE id = NEW.tool_id;
  SELECT full_name INTO u_name FROM public.profiles WHERE id = NEW.reported_by;

  IF TG_OP = 'INSERT' THEN
    INSERT INTO public.system_logs (action, entity_type, entity_id, user_id, user_name, details)
    VALUES ('issue_reported', 'tool_issue', NEW.id, NEW.reported_by, u_name,
      jsonb_build_object('title', NEW.title, 'severity', NEW.severity, 'tool_name', tool_name));
  ELSIF TG_OP = 'UPDATE' AND OLD.status != 'resolved' AND NEW.status = 'resolved' THEN
    INSERT INTO public.system_logs (action, entity_type, entity_id, user_id, user_name, details)
    VALUES ('issue_resolved', 'tool_issue', NEW.id, COALESCE(NEW.resolved_by, auth.uid()),
      (SELECT full_name FROM public.profiles WHERE id = COALESCE(NEW.resolved_by, auth.uid())),
      jsonb_build_object('title', NEW.title, 'tool_name', tool_name));
  END IF;
  RETURN NEW;
END;
$$;

CREATE TRIGGER on_issue_event_log
  AFTER INSERT OR UPDATE ON public.tool_issues
  FOR EACH ROW EXECUTE FUNCTION public.log_issue_events();
