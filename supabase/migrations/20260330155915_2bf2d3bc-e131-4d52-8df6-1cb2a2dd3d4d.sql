
-- Fix overly permissive INSERT policy - restrict to service role context (triggers)
DROP POLICY "System can insert logs" ON public.system_logs;

-- Only allow inserts when called from trigger context (no direct user inserts)
CREATE POLICY "Triggers can insert logs" ON public.system_logs
  FOR INSERT TO authenticated
  WITH CHECK (has_role(auth.uid(), 'admin'::user_role));
