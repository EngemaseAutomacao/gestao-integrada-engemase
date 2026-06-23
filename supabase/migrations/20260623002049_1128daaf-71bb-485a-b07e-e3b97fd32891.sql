-- Phase 1.1: Rate limiting table
CREATE TABLE IF NOT EXISTS public.rate_limits (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  bucket_key TEXT NOT NULL,
  window_start TIMESTAMPTZ NOT NULL DEFAULT now(),
  request_count INTEGER NOT NULL DEFAULT 1,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE UNIQUE INDEX IF NOT EXISTS rate_limits_bucket_key_window_idx
  ON public.rate_limits (bucket_key, window_start);

CREATE INDEX IF NOT EXISTS rate_limits_window_start_idx
  ON public.rate_limits (window_start);

-- service_role only — managed exclusively by edge functions
GRANT ALL ON public.rate_limits TO service_role;

ALTER TABLE public.rate_limits ENABLE ROW LEVEL SECURITY;

-- No policies for anon/authenticated => locked by default. service_role bypasses RLS.

-- Cleanup function for old windows (run periodically via cron)
CREATE OR REPLACE FUNCTION public.cleanup_rate_limits()
RETURNS void
LANGUAGE sql
SECURITY DEFINER
SET search_path = public
AS $$
  DELETE FROM public.rate_limits WHERE window_start < now() - INTERVAL '1 hour';
$$;

-- Phase 1.2: Lock down get_email_from_username — moving to edge function
-- We revoke direct access; the new login-with-username edge function uses service_role
REVOKE EXECUTE ON FUNCTION public.get_email_from_username(text) FROM anon, authenticated, public;
GRANT EXECUTE ON FUNCTION public.get_email_from_username(text) TO service_role;