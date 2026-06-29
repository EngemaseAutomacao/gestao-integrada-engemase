
-- Remove a configuração de retenção "Fotos de Ferramentas" (descontinuada)
DELETE FROM public.data_retention_settings WHERE setting_key = 'tool_checkout_photos';

-- Agenda a limpeza automática diária às 03:00 UTC
DO $$
BEGIN
  PERFORM cron.unschedule('cleanup-data-daily');
EXCEPTION WHEN OTHERS THEN
  NULL;
END $$;

SELECT cron.schedule(
  'cleanup-data-daily',
  '0 3 * * *',
  $cron$
  SELECT net.http_post(
    url := 'https://ivkqzjwzdaneylitrsgt.supabase.co/functions/v1/cleanup-data',
    headers := jsonb_build_object(
      'Content-Type', 'application/json',
      'x-cron-secret', COALESCE((SELECT decrypted_secret FROM vault.decrypted_secrets WHERE name = 'cron_auth_secret' LIMIT 1), '')
    ),
    body := '{}'::jsonb
  );
  $cron$
);
