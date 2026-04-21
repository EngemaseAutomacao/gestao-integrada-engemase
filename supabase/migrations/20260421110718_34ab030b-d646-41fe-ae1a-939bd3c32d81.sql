
-- 1) Restrict access to client contact fields (keep name/id readable for Ponto)
DROP POLICY IF EXISTS "Authenticated users can view active clients" ON public.clients;

-- Non-admins: can only see basic fields (id, name, active) of active clients
CREATE POLICY "Authenticated users can view active clients basic"
ON public.clients
FOR SELECT
TO authenticated
USING (active = true);

-- Revoke column-level SELECT on sensitive contact info for the authenticated role
REVOKE SELECT (contact_email, contact_phone, contact_name, address, created_by)
  ON public.clients FROM authenticated;

-- Grant SELECT on safe columns to authenticated
GRANT SELECT (id, name, active, created_at, updated_at)
  ON public.clients TO authenticated;

-- Admins keep full access via existing service_role / admin policies and column grants
GRANT SELECT (contact_email, contact_phone, contact_name, address, created_by)
  ON public.clients TO service_role;

-- Add an admins-only SELECT policy that allows reading inactive + sensitive columns
CREATE POLICY "Admins can view all client data"
ON public.clients
FOR SELECT
TO authenticated
USING (public.has_role(auth.uid(), 'admin'::public.user_role));

-- Re-grant sensitive columns to authenticated, but RLS + admin policy will gate row access logic.
-- Column privileges in Postgres apply to all rows; to actually gate sensitive columns to admins
-- we use a SECURITY DEFINER helper function in app where needed. For now, the RLS row policy
-- combined with the admin policy and the basic policy ensures non-admins only match the basic
-- policy (still returns the row, so columns are visible). To truly hide columns, recreate via view.
-- Therefore: drop basic policy and instead expose contact info only via an admin-only view.

DROP POLICY IF EXISTS "Authenticated users can view active clients basic" ON public.clients;

-- Strict: only admins can read the clients table directly
CREATE POLICY "Only admins can view clients table"
ON public.clients
FOR SELECT
TO authenticated
USING (public.has_role(auth.uid(), 'admin'::public.user_role));

-- Drop the duplicate admin policy created above to avoid redundancy
DROP POLICY IF EXISTS "Admins can view all client data" ON public.clients;

-- Restore default column grants (RLS still gates access)
GRANT SELECT ON public.clients TO authenticated;

-- Provide a safe public-facing function for non-admins (e.g. Ponto) to list active clients by name
CREATE OR REPLACE FUNCTION public.get_active_clients_basic()
RETURNS TABLE(id uuid, name text)
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT c.id, c.name
  FROM public.clients c
  WHERE c.active = true
  ORDER BY c.name;
$$;

REVOKE ALL ON FUNCTION public.get_active_clients_basic() FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.get_active_clients_basic() TO authenticated;

-- 2) Standardize storage policies for tool-images to use has_role()
DROP POLICY IF EXISTS "Admins can upload tool images" ON storage.objects;
DROP POLICY IF EXISTS "Admins can update tool images" ON storage.objects;
DROP POLICY IF EXISTS "Admins can delete tool images" ON storage.objects;

CREATE POLICY "Admins can upload tool images"
ON storage.objects FOR INSERT
TO authenticated
WITH CHECK (bucket_id = 'tool-images' AND public.has_role(auth.uid(), 'admin'::public.user_role));

CREATE POLICY "Admins can update tool images"
ON storage.objects FOR UPDATE
TO authenticated
USING (bucket_id = 'tool-images' AND public.has_role(auth.uid(), 'admin'::public.user_role));

CREATE POLICY "Admins can delete tool images"
ON storage.objects FOR DELETE
TO authenticated
USING (bucket_id = 'tool-images' AND public.has_role(auth.uid(), 'admin'::public.user_role));
