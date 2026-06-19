
-- 1) Storage: checkout-images bucket — remove public SELECT, restrict update/delete to owner or admin
DROP POLICY IF EXISTS "Anyone can view checkout images" ON storage.objects;

DROP POLICY IF EXISTS "Users can update their own checkout images" ON storage.objects;
CREATE POLICY "Users can update their own checkout images"
ON storage.objects FOR UPDATE TO authenticated
USING (
  bucket_id = 'checkout-images'
  AND (owner = auth.uid() OR public.has_role(auth.uid(), 'admin'::user_role))
)
WITH CHECK (
  bucket_id = 'checkout-images'
  AND (owner = auth.uid() OR public.has_role(auth.uid(), 'admin'::user_role))
);

DROP POLICY IF EXISTS "Users can delete their own checkout images" ON storage.objects;
CREATE POLICY "Users can delete their own checkout images"
ON storage.objects FOR DELETE TO authenticated
USING (
  bucket_id = 'checkout-images'
  AND (owner = auth.uid() OR public.has_role(auth.uid(), 'admin'::user_role))
);

-- 2) tool_checkouts: restrict UPDATE to owner/checked_out_by/checked_in_by or admin
DROP POLICY IF EXISTS "Authenticated users can update tool checkouts" ON public.tool_checkouts;
CREATE POLICY "Users can update their own tool checkouts"
ON public.tool_checkouts FOR UPDATE TO authenticated
USING (
  user_id = auth.uid()
  OR checked_out_by = auth.uid()
  OR checked_in_by = auth.uid()
  OR public.has_role(auth.uid(), 'admin'::user_role)
)
WITH CHECK (
  user_id = auth.uid()
  OR checked_out_by = auth.uid()
  OR checked_in_by = auth.uid()
  OR public.has_role(auth.uid(), 'admin'::user_role)
);

-- 3) vehicle_checkouts: restrict UPDATE similarly
DROP POLICY IF EXISTS "Authenticated users can update checkouts" ON public.vehicle_checkouts;
CREATE POLICY "Users can update their own vehicle checkouts"
ON public.vehicle_checkouts FOR UPDATE TO authenticated
USING (
  user_id = auth.uid()
  OR checked_out_by = auth.uid()
  OR checked_in_by = auth.uid()
  OR public.has_role(auth.uid(), 'admin'::user_role)
)
WITH CHECK (
  user_id = auth.uid()
  OR checked_out_by = auth.uid()
  OR checked_in_by = auth.uid()
  OR public.has_role(auth.uid(), 'admin'::user_role)
);

-- 4) tool_issues: tighten policies to authenticated role only
DROP POLICY IF EXISTS "Authenticated users can report issues" ON public.tool_issues;
CREATE POLICY "Authenticated users can report issues"
ON public.tool_issues FOR INSERT TO authenticated
WITH CHECK (auth.uid() = reported_by);

DROP POLICY IF EXISTS "Users can update own issues" ON public.tool_issues;
CREATE POLICY "Users can update own issues"
ON public.tool_issues FOR UPDATE TO authenticated
USING (auth.uid() = reported_by)
WITH CHECK (auth.uid() = reported_by);
