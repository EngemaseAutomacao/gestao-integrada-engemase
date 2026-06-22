DROP POLICY IF EXISTS "Authenticated users can insert logs" ON public.system_logs;
CREATE POLICY "Users can insert their own logs" ON public.system_logs
FOR INSERT TO authenticated
WITH CHECK (user_id = auth.uid());