-- 1) Harden profiles policies (explicit roles) and prevent privilege escalation via profile updates

-- Policies: drop + recreate with explicit TO authenticated
DROP POLICY IF EXISTS "Users can view own profile" ON public.profiles;
CREATE POLICY "Users can view own profile"
ON public.profiles
FOR SELECT
TO authenticated
USING (auth.uid() = id);

DROP POLICY IF EXISTS "Admins can view all profiles" ON public.profiles;
CREATE POLICY "Admins can view all profiles"
ON public.profiles
FOR SELECT
TO authenticated
USING (has_role(auth.uid(), 'admin'::user_role));

DROP POLICY IF EXISTS "Users can update own profile" ON public.profiles;
CREATE POLICY "Users can update own profile"
ON public.profiles
FOR UPDATE
TO authenticated
USING (auth.uid() = id)
WITH CHECK (auth.uid() = id);

DROP POLICY IF EXISTS "Admins can update all profiles" ON public.profiles;
CREATE POLICY "Admins can update all profiles"
ON public.profiles
FOR UPDATE
TO authenticated
USING (has_role(auth.uid(), 'admin'::user_role))
WITH CHECK (has_role(auth.uid(), 'admin'::user_role));

DROP POLICY IF EXISTS "Admins can insert profiles" ON public.profiles;
CREATE POLICY "Admins can insert profiles"
ON public.profiles
FOR INSERT
TO authenticated
WITH CHECK (has_role(auth.uid(), 'admin'::user_role));

DROP POLICY IF EXISTS "Admins can delete profiles" ON public.profiles;
CREATE POLICY "Admins can delete profiles"
ON public.profiles
FOR DELETE
TO authenticated
USING (has_role(auth.uid(), 'admin'::user_role));

-- Trigger to block non-admin updates to protected profile fields
CREATE OR REPLACE FUNCTION public.prevent_profile_privilege_escalation()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF TG_OP = 'UPDATE' THEN
    IF NOT has_role(auth.uid(), 'admin'::user_role) THEN
      IF NEW.role IS DISTINCT FROM OLD.role THEN
        RAISE EXCEPTION 'Not allowed to change role';
      END IF;
      IF NEW.category IS DISTINCT FROM OLD.category THEN
        RAISE EXCEPTION 'Not allowed to change category';
      END IF;
      IF NEW.approved IS DISTINCT FROM OLD.approved THEN
        RAISE EXCEPTION 'Not allowed to change approval status';
      END IF;
      IF NEW.email IS DISTINCT FROM OLD.email THEN
        RAISE EXCEPTION 'Not allowed to change email';
      END IF;
    END IF;
  END IF;

  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS prevent_profile_privilege_escalation ON public.profiles;
CREATE TRIGGER prevent_profile_privilege_escalation
BEFORE UPDATE ON public.profiles
FOR EACH ROW
EXECUTE FUNCTION public.prevent_profile_privilege_escalation();


-- 2) Replace all admin checks that relied on profiles.role with has_role()

-- tools
DROP POLICY IF EXISTS "Admins can insert tools" ON public.tools;
CREATE POLICY "Admins can insert tools"
ON public.tools
FOR INSERT
TO authenticated
WITH CHECK (has_role(auth.uid(), 'admin'::user_role));

DROP POLICY IF EXISTS "Admins can update tools" ON public.tools;
CREATE POLICY "Admins can update tools"
ON public.tools
FOR UPDATE
TO authenticated
USING (has_role(auth.uid(), 'admin'::user_role));

DROP POLICY IF EXISTS "Admins can delete tools" ON public.tools;
CREATE POLICY "Admins can delete tools"
ON public.tools
FOR DELETE
TO authenticated
USING (has_role(auth.uid(), 'admin'::user_role));

DROP POLICY IF EXISTS "Authenticated users can view tools" ON public.tools;
CREATE POLICY "Authenticated users can view tools"
ON public.tools
FOR SELECT
TO authenticated
USING (auth.uid() IS NOT NULL);

-- vehicles
DROP POLICY IF EXISTS "Admins can insert vehicles" ON public.vehicles;
CREATE POLICY "Admins can insert vehicles"
ON public.vehicles
FOR INSERT
TO authenticated
WITH CHECK (has_role(auth.uid(), 'admin'::user_role));

DROP POLICY IF EXISTS "Admins can update vehicles" ON public.vehicles;
CREATE POLICY "Admins can update vehicles"
ON public.vehicles
FOR UPDATE
TO authenticated
USING (has_role(auth.uid(), 'admin'::user_role));

DROP POLICY IF EXISTS "Admins can delete vehicles" ON public.vehicles;
CREATE POLICY "Admins can delete vehicles"
ON public.vehicles
FOR DELETE
TO authenticated
USING (has_role(auth.uid(), 'admin'::user_role));

DROP POLICY IF EXISTS "Authenticated users can view vehicles" ON public.vehicles;
CREATE POLICY "Authenticated users can view vehicles"
ON public.vehicles
FOR SELECT
TO authenticated
USING (auth.uid() IS NOT NULL);

-- tool_checkouts
DROP POLICY IF EXISTS "Users can view own checkouts" ON public.tool_checkouts;
CREATE POLICY "Users can view own checkouts"
ON public.tool_checkouts
FOR SELECT
TO authenticated
USING (user_id = auth.uid());

DROP POLICY IF EXISTS "Admins can view all checkouts" ON public.tool_checkouts;
CREATE POLICY "Admins can view all checkouts"
ON public.tool_checkouts
FOR SELECT
TO authenticated
USING (has_role(auth.uid(), 'admin'::user_role));

DROP POLICY IF EXISTS "Users can create checkouts" ON public.tool_checkouts;
CREATE POLICY "Users can create checkouts"
ON public.tool_checkouts
FOR INSERT
TO authenticated
WITH CHECK (user_id = auth.uid());

DROP POLICY IF EXISTS "Admins can create any checkout" ON public.tool_checkouts;
CREATE POLICY "Admins can create any checkout"
ON public.tool_checkouts
FOR INSERT
TO authenticated
WITH CHECK (has_role(auth.uid(), 'admin'::user_role));

DROP POLICY IF EXISTS "Users can update own checkouts" ON public.tool_checkouts;
CREATE POLICY "Users can update own checkouts"
ON public.tool_checkouts
FOR UPDATE
TO authenticated
USING (user_id = auth.uid());

DROP POLICY IF EXISTS "Admins can update all checkouts" ON public.tool_checkouts;
CREATE POLICY "Admins can update all checkouts"
ON public.tool_checkouts
FOR UPDATE
TO authenticated
USING (has_role(auth.uid(), 'admin'::user_role));

-- tool_issues
DROP POLICY IF EXISTS "Admins can update all issues" ON public.tool_issues;
CREATE POLICY "Admins can update all issues"
ON public.tool_issues
FOR UPDATE
TO authenticated
USING (has_role(auth.uid(), 'admin'::user_role));

DROP POLICY IF EXISTS "Admins can delete issues" ON public.tool_issues;
CREATE POLICY "Admins can delete issues"
ON public.tool_issues
FOR DELETE
TO authenticated
USING (has_role(auth.uid(), 'admin'::user_role));

DROP POLICY IF EXISTS "Authenticated users can view tool issues" ON public.tool_issues;
CREATE POLICY "Authenticated users can view tool issues"
ON public.tool_issues
FOR SELECT
TO authenticated
USING (auth.uid() IS NOT NULL);

-- maintenance_records
DROP POLICY IF EXISTS "Admins can insert maintenance records" ON public.maintenance_records;
CREATE POLICY "Admins can insert maintenance records"
ON public.maintenance_records
FOR INSERT
TO authenticated
WITH CHECK (has_role(auth.uid(), 'admin'::user_role));

DROP POLICY IF EXISTS "Admins can update maintenance records" ON public.maintenance_records;
CREATE POLICY "Admins can update maintenance records"
ON public.maintenance_records
FOR UPDATE
TO authenticated
USING (has_role(auth.uid(), 'admin'::user_role));

DROP POLICY IF EXISTS "Admins can delete maintenance records" ON public.maintenance_records;
CREATE POLICY "Admins can delete maintenance records"
ON public.maintenance_records
FOR DELETE
TO authenticated
USING (has_role(auth.uid(), 'admin'::user_role));

DROP POLICY IF EXISTS "Authenticated users can view maintenance records" ON public.maintenance_records;
CREATE POLICY "Authenticated users can view maintenance records"
ON public.maintenance_records
FOR SELECT
TO authenticated
USING (auth.uid() IS NOT NULL);

-- vehicle_checkouts
DROP POLICY IF EXISTS "Users can update their own checkouts or admins can update any" ON public.vehicle_checkouts;
CREATE POLICY "Users can update their own checkouts or admins can update any"
ON public.vehicle_checkouts
FOR UPDATE
TO authenticated
USING (user_id = auth.uid() OR has_role(auth.uid(), 'admin'::user_role));


-- 3) Notifications: allow users to delete their own notifications
CREATE POLICY "Users can delete own notifications"
ON public.notifications
FOR DELETE
TO authenticated
USING (auth.uid() = user_id);
