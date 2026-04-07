DROP POLICY IF EXISTS "Recipients can update pending transfers" ON public.asset_transfers;
CREATE POLICY "Recipients can update pending transfers"
ON public.asset_transfers
FOR UPDATE
TO authenticated
USING ((to_user_id = auth.uid()) AND (status = 'pending'::transfer_status))
WITH CHECK ((to_user_id = auth.uid()) AND (status = ANY (ARRAY['accepted'::transfer_status, 'rejected'::transfer_status])));

DROP POLICY IF EXISTS "Initiator can cancel pending transfers" ON public.asset_transfers;
CREATE POLICY "Initiator can cancel pending transfers"
ON public.asset_transfers
FOR UPDATE
TO authenticated
USING ((from_user_id = auth.uid()) AND (status = 'pending'::transfer_status))
WITH CHECK ((from_user_id = auth.uid()) AND (status = 'cancelled'::transfer_status));