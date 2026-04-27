-- Update the cron job frequency for notifications
SELECT cron.unschedule('check-notifications-hourly');

SELECT cron.schedule(
  'check-notifications-every-10min',
  '*/10 * * * *',
  $cron$
  SELECT net.http_post(
    url:='https://ivkqzjwzdaneylitrsgt.supabase.co/functions/v1/check-notifications',
    headers:='{"Content-Type": "application/json", "Authorization": "Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Iml2a3F6and6ZGFuZXlsaXRyc2d0Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTkzMjc2MTIsImV4cCI6MjA3NDkwMzYxMn0.EGE-LXGZRElwmWKzNzPhEdQZ7JYHD2ECDac89g7otZ0"}'::jsonb,
    body:='{}'::jsonb
  ) as request_id;
  $cron$
);