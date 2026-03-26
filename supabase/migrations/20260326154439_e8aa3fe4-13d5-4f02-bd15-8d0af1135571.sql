
-- =============================================
-- LIMPEZA: Remover triggers duplicados
-- =============================================

-- Profiles: remover duplicatas de privilege escalation (manter apenas trigger_prevent_privilege_escalation)
DROP TRIGGER IF EXISTS prevent_profile_privilege_escalation ON public.profiles;

-- Profiles: remover duplicatas de sync roles (manter apenas trigger_sync_user_roles)
DROP TRIGGER IF EXISTS profiles_role_sync_after_delete ON public.profiles;
DROP TRIGGER IF EXISTS profiles_role_sync_after_insert ON public.profiles;
DROP TRIGGER IF EXISTS profiles_role_sync_after_update ON public.profiles;

-- Notifications: remover duplicata de push (manter apenas trigger_send_push_on_notification)
DROP TRIGGER IF EXISTS trigger_send_push_notification ON public.notifications;

-- Vehicle checkouts: remover duplicata de status update (manter trigger_update_vehicle_availability)
DROP TRIGGER IF EXISTS update_vehicle_status ON public.vehicle_checkouts;

-- Tool checkouts: remover trigger legado
DROP TRIGGER IF EXISTS on_checkout_status_change ON public.tool_checkouts;

-- =============================================
-- SEGURANÇA: Corrigir RLS policies permissivas
-- =============================================

-- Fix vehicle_checkouts INSERT: exigir ownership
DROP POLICY IF EXISTS "Authenticated users can insert vehicle checkouts" ON public.vehicle_checkouts;
CREATE POLICY "Authenticated users can insert vehicle checkouts"
  ON public.vehicle_checkouts
  FOR INSERT
  TO authenticated
  WITH CHECK (auth.uid() = user_id AND auth.uid() = checked_out_by);

-- Admins also need to insert for other users
DROP POLICY IF EXISTS "Admins can insert vehicle checkouts" ON public.vehicle_checkouts;
CREATE POLICY "Admins can insert vehicle checkouts"
  ON public.vehicle_checkouts
  FOR INSERT
  TO authenticated
  WITH CHECK (has_role(auth.uid(), 'admin'::user_role));

-- Fix fuel_records INSERT: exigir ownership
DROP POLICY IF EXISTS "Authenticated users can insert fuel records" ON public.fuel_records;
CREATE POLICY "Authenticated users can insert fuel records"
  ON public.fuel_records
  FOR INSERT
  TO authenticated
  WITH CHECK (auth.uid() = user_id);

-- Admins also need to insert fuel records for other users
DROP POLICY IF EXISTS "Admins can insert fuel records" ON public.fuel_records;
CREATE POLICY "Admins can insert fuel records"
  ON public.fuel_records
  FOR INSERT
  TO authenticated
  WITH CHECK (has_role(auth.uid(), 'admin'::user_role));
