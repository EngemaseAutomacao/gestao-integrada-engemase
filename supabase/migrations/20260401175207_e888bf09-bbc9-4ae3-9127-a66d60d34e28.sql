
-- Update the send_push_on_notification trigger to use notification ID as tag
-- This ensures duplicate pushes (from multiple subscriptions) collapse into one visible notification
CREATE OR REPLACE FUNCTION public.send_push_on_notification()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  sub_rec RECORD;
BEGIN
  -- Find all push subscriptions for this user
  FOR sub_rec IN
    SELECT endpoint, p256dh, auth FROM public.push_subscriptions WHERE user_id = NEW.user_id
  LOOP
    PERFORM net.http_post(
      url := 'https://ivkqzjwzdaneylitrsgt.supabase.co/functions/v1/send-push-notification',
      headers := '{"Content-Type": "application/json", "Authorization": "Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Iml2a3F6and6ZGFuZXlsaXRyc2d0Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTkzMjc2MTIsImV4cCI6MjA3NDkwMzYxMn0.EGE-LXGZRElwmWKzNzPhEdQZ7JYHD2ECDac89g7otZ0"}'::jsonb,
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
        'tag', NEW.id::text
      )
    );
  END LOOP;

  RETURN NEW;
END;
$$;
