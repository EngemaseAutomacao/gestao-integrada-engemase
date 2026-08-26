DROP POLICY IF EXISTS "Authenticated can view charging sessions" ON public.vehicle_charging_sessions;

CREATE POLICY "Admins and involved users can view charging sessions"
ON public.vehicle_charging_sessions
FOR SELECT
TO authenticated
USING (
  public.has_role(auth.uid(), 'admin'::user_role)
  OR started_by = auth.uid()
  OR ended_by = auth.uid()
);