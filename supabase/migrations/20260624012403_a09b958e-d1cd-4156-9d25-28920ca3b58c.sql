CREATE POLICY "Authenticated users can view all vehicle checkouts"
ON public.vehicle_checkouts FOR SELECT
TO authenticated
USING (true);