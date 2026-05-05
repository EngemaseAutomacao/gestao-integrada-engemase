
CREATE TABLE IF NOT EXISTS public.sync_state (
  key text PRIMARY KEY,
  last_run_at timestamptz NOT NULL DEFAULT now(),
  summary jsonb
);

ALTER TABLE public.sync_state ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Admins can view sync_state"
ON public.sync_state FOR SELECT
TO authenticated
USING (has_role(auth.uid(), 'admin'::user_role));
