-- Allow admins to delete tool checkout records
CREATE POLICY "Admins can delete tool checkouts"
ON public.tool_checkouts
FOR DELETE
TO authenticated
USING (has_role(auth.uid(), 'admin'::user_role));

-- Allow admins to delete vehicle checkout records
CREATE POLICY "Admins can delete vehicle checkouts"
ON public.vehicle_checkouts
FOR DELETE
TO authenticated
USING (has_role(auth.uid(), 'admin'::user_role));

-- Allow admins to delete asset transfer records
CREATE POLICY "Admins can delete asset transfers"
ON public.asset_transfers
FOR DELETE
TO authenticated
USING (has_role(auth.uid(), 'admin'::user_role));