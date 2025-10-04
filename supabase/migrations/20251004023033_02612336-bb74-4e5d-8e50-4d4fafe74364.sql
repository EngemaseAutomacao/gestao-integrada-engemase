-- Fix public access to maintenance_records
DROP POLICY IF EXISTS "Anyone can view maintenance records" ON public.maintenance_records;
CREATE POLICY "Authenticated users can view maintenance records" 
ON public.maintenance_records
FOR SELECT 
TO authenticated
USING (auth.uid() IS NOT NULL);

-- Fix public access to tool_issues
DROP POLICY IF EXISTS "Anyone can view tool issues" ON public.tool_issues;
CREATE POLICY "Authenticated users can view tool issues" 
ON public.tool_issues
FOR SELECT 
TO authenticated
USING (auth.uid() IS NOT NULL);

-- Fix public access to tools
DROP POLICY IF EXISTS "Anyone can view tools" ON public.tools;
CREATE POLICY "Authenticated users can view tools" 
ON public.tools
FOR SELECT 
TO authenticated
USING (auth.uid() IS NOT NULL);

-- Fix function search_path for update_updated_at_column
CREATE OR REPLACE FUNCTION public.update_updated_at_column()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $function$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$function$;