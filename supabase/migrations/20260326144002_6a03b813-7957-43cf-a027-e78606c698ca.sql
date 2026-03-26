
-- Enable pg_net extension for HTTP calls from triggers
CREATE EXTENSION IF NOT EXISTS pg_net WITH SCHEMA extensions;

-- Function: send push notification when a notification is created
CREATE OR REPLACE FUNCTION public.send_push_on_notification()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
DECLARE
  sub_rec RECORD;
  supabase_url TEXT;
  anon_key TEXT;
BEGIN
  -- Get config from vault or env
  supabase_url := current_setting('app.settings.supabase_url', true);
  anon_key := current_setting('app.settings.supabase_anon_key', true);

  -- Fallback: skip push if settings not available
  IF supabase_url IS NULL OR anon_key IS NULL THEN
    RETURN NEW;
  END IF;

  -- Find all push subscriptions for this user
  FOR sub_rec IN
    SELECT endpoint, p256dh, auth FROM public.push_subscriptions WHERE user_id = NEW.user_id
  LOOP
    PERFORM extensions.http_post(
      url := supabase_url || '/functions/v1/send-push-notification',
      headers := jsonb_build_object(
        'Content-Type', 'application/json',
        'Authorization', 'Bearer ' || anon_key
      ),
      body := jsonb_build_object(
        'subscription', jsonb_build_object(
          'endpoint', sub_rec.endpoint,
          'keys', jsonb_build_object(
            'p256dh', sub_rec.p256dh,
            'auth', sub_rec.auth
          )
        ),
        'title', NEW.title,
        'body', NEW.message,
        'tag', NEW.type
      )
    );
  END LOOP;

  RETURN NEW;
END;
$$;

-- Create trigger on notifications table
CREATE TRIGGER trigger_send_push_notification
  AFTER INSERT ON public.notifications
  FOR EACH ROW
  EXECUTE FUNCTION public.send_push_on_notification();
