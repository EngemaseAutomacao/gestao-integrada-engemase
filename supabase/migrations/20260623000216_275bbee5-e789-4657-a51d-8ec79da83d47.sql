
DROP FUNCTION IF EXISTS public.get_approved_users();
CREATE FUNCTION public.get_approved_users()
 RETURNS TABLE(id uuid, full_name text)
 LANGUAGE sql
 STABLE SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
  SELECT p.id, p.full_name
  FROM public.profiles p
  WHERE p.approved = true
  ORDER BY p.full_name;
$function$;
REVOKE EXECUTE ON FUNCTION public.get_approved_users() FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.get_approved_users() TO authenticated;

DROP POLICY IF EXISTS "Users can insert their own logs" ON public.system_logs;
CREATE POLICY "Admins can insert logs"
ON public.system_logs
FOR INSERT
TO authenticated
WITH CHECK (public.has_role(auth.uid(), 'admin'::user_role));

CREATE OR REPLACE FUNCTION public.verify_cron_secret(_secret text)
 RETURNS boolean
 LANGUAGE sql
 STABLE SECURITY DEFINER
 SET search_path TO 'public', 'vault'
AS $function$
  SELECT EXISTS (
    SELECT 1 FROM vault.decrypted_secrets
    WHERE name = 'cron_auth_secret'
      AND decrypted_secret = _secret
  );
$function$;
REVOKE EXECUTE ON FUNCTION public.verify_cron_secret(text) FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.verify_cron_secret(text) TO service_role;

CREATE OR REPLACE FUNCTION public.notify_push_on_insert()
 RETURNS trigger
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public', 'vault'
AS $function$
DECLARE
  sub RECORD;
  supabase_url TEXT := 'https://ivkqzjwzdaneylitrsgt.supabase.co';
  cron_secret TEXT;
BEGIN
  IF NEW.message IS NULL OR trim(NEW.message) = '' THEN RETURN NEW; END IF;
  IF NEW.title IS NULL OR trim(NEW.title) = '' THEN RETURN NEW; END IF;

  SELECT decrypted_secret INTO cron_secret
  FROM vault.decrypted_secrets WHERE name = 'cron_auth_secret' LIMIT 1;

  FOR sub IN
    SELECT endpoint, p256dh, auth FROM push_subscriptions WHERE user_id = NEW.user_id
  LOOP
    PERFORM net.http_post(
      url := supabase_url || '/functions/v1/send-push-notification',
      headers := jsonb_build_object(
        'Content-Type', 'application/json',
        'x-cron-secret', COALESCE(cron_secret, '')
      ),
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
