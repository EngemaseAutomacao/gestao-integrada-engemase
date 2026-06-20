
-- 2.2 Smarter cleanup: keep persistent types longer
CREATE OR REPLACE FUNCTION public.cleanup_old_notifications()
 RETURNS void
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
BEGIN
  -- Persistent types: 90 days
  DELETE FROM public.notifications
  WHERE created_at < NOW() - INTERVAL '90 days'
    AND type IN ('account_approved','transfer_approved','transfer_rejected','issue_resolved');

  -- All other types: 7 days
  DELETE FROM public.notifications
  WHERE created_at < NOW() - INTERVAL '7 days'
    AND type NOT IN ('account_approved','transfer_approved','transfer_rejected','issue_resolved');
END;
$function$;

REVOKE EXECUTE ON FUNCTION public.cleanup_old_notifications() FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.cleanup_old_notifications() TO service_role;

-- 2.3 Hot-path indexes
CREATE INDEX IF NOT EXISTS idx_notifications_user_read_created
  ON public.notifications (user_id, read, created_at DESC);

CREATE INDEX IF NOT EXISTS idx_notifications_checkout_type_created
  ON public.notifications (checkout_id, type, created_at DESC)
  WHERE checkout_id IS NOT NULL;

CREATE INDEX IF NOT EXISTS idx_notifications_type_user_created
  ON public.notifications (type, user_id, created_at DESC);

CREATE INDEX IF NOT EXISTS idx_tool_checkouts_status_return
  ON public.tool_checkouts (status, estimated_return_date)
  WHERE status = 'checked_out';

CREATE INDEX IF NOT EXISTS idx_vehicle_checkouts_status_date
  ON public.vehicle_checkouts (status, checkout_date DESC);

CREATE INDEX IF NOT EXISTS idx_system_logs_created_entity
  ON public.system_logs (created_at DESC, entity_type);

CREATE INDEX IF NOT EXISTS idx_push_subscriptions_user
  ON public.push_subscriptions (user_id);

-- 2.4a Add last_used_at for orphan cleanup
ALTER TABLE public.push_subscriptions
  ADD COLUMN IF NOT EXISTS last_used_at TIMESTAMPTZ DEFAULT now();

CREATE INDEX IF NOT EXISTS idx_push_subscriptions_last_used
  ON public.push_subscriptions (last_used_at);
