-- Fix 1: Remove anonymous access to profiles table
-- The username lookup for login should be done via a security definer function instead
DROP POLICY IF EXISTS "Allow anon to lookup username for login" ON public.profiles;

-- Fix 2: Restrict vehicle access to authenticated users only
DROP POLICY IF EXISTS "Anyone can view vehicles" ON public.vehicles;

CREATE POLICY "Authenticated users can view vehicles"
ON public.vehicles
FOR SELECT
USING (auth.uid() IS NOT NULL);

-- Fix 3: Restrict notification creation to admins only
DROP POLICY IF EXISTS "System and admins can create notifications" ON public.notifications;

CREATE POLICY "Admins can create notifications"
ON public.notifications
FOR INSERT
WITH CHECK (
  has_role(auth.uid(), 'admin'::user_role)
);

-- Also allow the system to create notifications via database functions
-- The existing database functions (check_overdue_tools, etc.) use SECURITY DEFINER
-- so they bypass RLS and can still insert notifications