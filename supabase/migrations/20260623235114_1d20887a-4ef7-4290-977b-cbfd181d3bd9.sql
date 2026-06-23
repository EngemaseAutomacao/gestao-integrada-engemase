CREATE POLICY "Authenticated users can view all tool checkouts"
ON public.tool_checkouts
FOR SELECT
TO authenticated
USING (true);