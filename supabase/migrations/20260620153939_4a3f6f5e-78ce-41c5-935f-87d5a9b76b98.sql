
-- ============================================================
-- 1.1 Remove hard-coded JWT from notify_push_on_insert trigger
-- ============================================================
-- send-push-notification has verify_jwt=false; no Authorization header needed
CREATE OR REPLACE FUNCTION public.notify_push_on_insert()
 RETURNS trigger
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
DECLARE
  sub RECORD;
  supabase_url TEXT := 'https://ivkqzjwzdaneylitrsgt.supabase.co';
BEGIN
  IF NEW.message IS NULL OR trim(NEW.message) = '' THEN
    RETURN NEW;
  END IF;
  IF NEW.title IS NULL OR trim(NEW.title) = '' THEN
    RETURN NEW;
  END IF;

  FOR sub IN
    SELECT endpoint, p256dh, auth FROM push_subscriptions WHERE user_id = NEW.user_id
  LOOP
    PERFORM net.http_post(
      url := supabase_url || '/functions/v1/send-push-notification',
      headers := jsonb_build_object('Content-Type', 'application/json'),
      body := jsonb_build_object(
        'subscription', jsonb_build_object(
          'endpoint', sub.endpoint,
          'keys', jsonb_build_object('p256dh', sub.p256dh, 'auth', sub.auth)
        ),
        'title', NEW.title,
        'body', NEW.message,
        'tag', NEW.id::text,
        'data', jsonb_build_object(
          'notificationId', NEW.id,
          'type', NEW.type,
          'toolId', NEW.tool_id,
          'checkoutId', NEW.checkout_id
        )
      )
    );
  END LOOP;

  NEW.push_sent := true;
  RETURN NEW;
END;
$function$;

-- ============================================================
-- 1.2 Revoke EXECUTE on internal SECURITY DEFINER functions
-- These run only via triggers, cron jobs, or service_role calls
-- ============================================================
DO $$
DECLARE
  fn_name TEXT;
  internal_functions TEXT[] := ARRAY[
    'check_overdue_tools()',
    'check_return_reminders()',
    'check_maintenance_reminders()',
    'check_prolonged_vehicle_use()',
    'check_vehicle_overdue_return()',
    'check_low_stock()',
    'cleanup_old_notifications()',
    'notify_push_on_insert()',
    'notify_issue_resolved()',
    'notify_new_issue()',
    'notify_user_approved()',
    'notify_new_user()',
    'notify_tool_checkout()',
    'notify_vehicle_checkout()',
    'notify_asset_transfer()',
    'log_vehicle_deletion()',
    'log_tool_deletion()',
    'log_vehicle_checkout()',
    'log_tool_checkout()',
    'log_issue_events()',
    'log_user_events()',
    'update_updated_at_column()',
    'update_tool_availability()',
    'update_vehicle_availability()',
    'validate_admin_manual_action()',
    'validate_admin_manual_vehicle_action()',
    'prevent_profile_privilege_escalation()',
    'sync_user_roles_from_profiles()',
    'handle_new_user()'
  ];
BEGIN
  FOREACH fn_name IN ARRAY internal_functions LOOP
    BEGIN
      EXECUTE format('REVOKE EXECUTE ON FUNCTION public.%s FROM PUBLIC, anon, authenticated', fn_name);
      EXECUTE format('GRANT EXECUTE ON FUNCTION public.%s TO service_role', fn_name);
    EXCEPTION WHEN undefined_function THEN
      RAISE NOTICE 'Function public.% does not exist, skipping', fn_name;
    END;
  END LOOP;
END $$;
