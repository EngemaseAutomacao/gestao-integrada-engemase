-- Update RLS for vehicle_checkouts to allow any authenticated user to update
-- (This allows anyone to record a return, which is common in teams)
DROP POLICY IF EXISTS "Users can update their own checkouts or admins can update any" ON public.vehicle_checkouts;
CREATE POLICY "Authenticated users can update checkouts" 
ON public.vehicle_checkouts 
FOR UPDATE 
TO authenticated
USING (true)
WITH CHECK (true);

-- Update RLS for tool_checkouts to allow any authenticated user to update
DROP POLICY IF EXISTS "Users can update own checkouts" ON public.tool_checkouts;
DROP POLICY IF EXISTS "Admins can update all checkouts" ON public.tool_checkouts;
CREATE POLICY "Authenticated users can update tool checkouts" 
ON public.tool_checkouts 
FOR UPDATE 
TO authenticated
USING (true)
WITH CHECK (true);

-- Update SELECT policy for tool_checkouts to allow viewing all active checkouts
-- (Necessary so users can see tools in use by others to register returns)
DROP POLICY IF EXISTS "Users can view own checkouts" ON public.tool_checkouts;
CREATE POLICY "Authenticated users can view all tool checkouts" 
ON public.tool_checkouts 
FOR SELECT 
TO authenticated
USING (true);

-- Ensure vehicles that are NOT checked out are marked as available
-- (Clean up any inconsistent states)
UPDATE public.vehicles v
SET status = 'available'
WHERE status = 'in_use'
AND NOT EXISTS (
  SELECT 1 FROM public.vehicle_checkouts vc
  WHERE vc.vehicle_id = v.id
  AND vc.status = 'checked_out'
);
