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
        -- Agrupa por TIPO de notificação para que múltiplas atualizações
        -- do mesmo tipo colapsem em uma única bolha no dispositivo.
        'tag', COALESCE(NEW.type, 'engemase'),
        'data', jsonb_build_object(
          'notificationId', NEW.id,
          'type', NEW.type,
          'group', NEW.type,
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