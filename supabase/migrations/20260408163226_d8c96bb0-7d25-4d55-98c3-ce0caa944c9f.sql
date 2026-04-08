-- Add push_sent column to track which notifications have been pushed
ALTER TABLE public.notifications ADD COLUMN IF NOT EXISTS push_sent boolean DEFAULT false;

-- Create function to send push notification immediately via pg_net
CREATE OR REPLACE FUNCTION public.notify_push_on_insert()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  sub RECORD;
  supabase_url TEXT;
  service_key TEXT;
BEGIN
  -- Skip if message is empty
  IF NEW.message IS NULL OR trim(NEW.message) = '' THEN
    RETURN NEW;
  END IF;

  -- Skip if title is empty
  IF NEW.title IS NULL OR trim(NEW.title) = '' THEN
    RETURN NEW;
  END IF;

  -- Get config
  supabase_url := current_setting('app.settings.supabase_url', true);
  service_key := current_setting('app.settings.service_role_key', true);

  -- If settings not available, try env-based approach via net.http_post
  IF supabase_url IS NULL OR supabase_url = '' THEN
    supabase_url := 'https://ivkqzjwzdaneylitrsgt.supabase.co';
  END IF;

  -- Find all push subscriptions for this user
  FOR sub IN 
    SELECT endpoint, p256dh, auth FROM push_subscriptions WHERE user_id = NEW.user_id
  LOOP
    -- Call send-push-notification edge function via pg_net
    PERFORM net.http_post(
      url := supabase_url || '/functions/v1/send-push-notification',
      headers := jsonb_build_object(
        'Content-Type', 'application/json',
        'Authorization', 'Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Iml2a3F6and6ZGFuZXlsaXRyc2d0Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTkzMjc2MTIsImV4cCI6MjA3NDkwMzYxMn0.EGE-LXGZRElwmWKzNzPhEdQZ7JYHD2ECDac89g7otZ0'
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

  -- Mark as push sent
  NEW.push_sent := true;
  RETURN NEW;
END;
$$;

-- Create trigger on notifications insert
DROP TRIGGER IF EXISTS trigger_push_on_notification_insert ON public.notifications;
CREATE TRIGGER trigger_push_on_notification_insert
  BEFORE INSERT ON public.notifications
  FOR EACH ROW
  EXECUTE FUNCTION public.notify_push_on_insert();