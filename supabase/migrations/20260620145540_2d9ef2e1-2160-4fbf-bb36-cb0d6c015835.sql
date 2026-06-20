
-- 1) user_roles: restrict policies to authenticated only
DROP POLICY IF EXISTS "Users can view own roles" ON public.user_roles;
DROP POLICY IF EXISTS "Admins can manage roles (insert)" ON public.user_roles;
DROP POLICY IF EXISTS "Admins can manage roles (update)" ON public.user_roles;
DROP POLICY IF EXISTS "Admins can manage roles (delete)" ON public.user_roles;

CREATE POLICY "Users can view own roles" ON public.user_roles
  FOR SELECT TO authenticated
  USING (user_id = auth.uid() OR public.has_role(auth.uid(), 'admin'::user_role));

CREATE POLICY "Admins can manage roles (insert)" ON public.user_roles
  FOR INSERT TO authenticated
  WITH CHECK (public.has_role(auth.uid(), 'admin'::user_role));

CREATE POLICY "Admins can manage roles (update)" ON public.user_roles
  FOR UPDATE TO authenticated
  USING (public.has_role(auth.uid(), 'admin'::user_role));

CREATE POLICY "Admins can manage roles (delete)" ON public.user_roles
  FOR DELETE TO authenticated
  USING (public.has_role(auth.uid(), 'admin'::user_role));

-- 2) imagens bucket: restrict SELECT to owner/admin
DROP POLICY IF EXISTS "Authenticated users can view images" ON storage.objects;
CREATE POLICY "Owners and admins can view images"
  ON storage.objects FOR SELECT TO authenticated
  USING (bucket_id = 'imagens' AND (owner = auth.uid() OR public.has_role(auth.uid(), 'admin'::user_role)));

-- 3) tool-images: keep public download via URL, restrict listing/select via API to admins
DROP POLICY IF EXISTS "Tool images are publicly accessible" ON storage.objects;
CREATE POLICY "Admins can list tool images"
  ON storage.objects FOR SELECT TO authenticated
  USING (bucket_id = 'tool-images' AND public.has_role(auth.uid(), 'admin'::user_role));

-- 4) Revoke EXECUTE on SECURITY DEFINER functions used only by triggers / internal
REVOKE EXECUTE ON FUNCTION public.handle_new_user() FROM PUBLIC, anon, authenticated;
REVOKE EXECUTE ON FUNCTION public.update_updated_at_column() FROM PUBLIC, anon, authenticated;
REVOKE EXECUTE ON FUNCTION public.update_tool_availability() FROM PUBLIC, anon, authenticated;
REVOKE EXECUTE ON FUNCTION public.update_vehicle_availability() FROM PUBLIC, anon, authenticated;
REVOKE EXECUTE ON FUNCTION public.log_vehicle_deletion() FROM PUBLIC, anon, authenticated;
REVOKE EXECUTE ON FUNCTION public.log_tool_deletion() FROM PUBLIC, anon, authenticated;
REVOKE EXECUTE ON FUNCTION public.log_vehicle_checkout() FROM PUBLIC, anon, authenticated;
REVOKE EXECUTE ON FUNCTION public.log_tool_checkout() FROM PUBLIC, anon, authenticated;
REVOKE EXECUTE ON FUNCTION public.log_issue_events() FROM PUBLIC, anon, authenticated;
REVOKE EXECUTE ON FUNCTION public.log_user_events() FROM PUBLIC, anon, authenticated;
REVOKE EXECUTE ON FUNCTION public.notify_issue_resolved() FROM PUBLIC, anon, authenticated;
REVOKE EXECUTE ON FUNCTION public.notify_new_issue() FROM PUBLIC, anon, authenticated;
REVOKE EXECUTE ON FUNCTION public.notify_new_user() FROM PUBLIC, anon, authenticated;
REVOKE EXECUTE ON FUNCTION public.notify_user_approved() FROM PUBLIC, anon, authenticated;
REVOKE EXECUTE ON FUNCTION public.notify_tool_checkout() FROM PUBLIC, anon, authenticated;
REVOKE EXECUTE ON FUNCTION public.notify_vehicle_checkout() FROM PUBLIC, anon, authenticated;
REVOKE EXECUTE ON FUNCTION public.notify_asset_transfer() FROM PUBLIC, anon, authenticated;
REVOKE EXECUTE ON FUNCTION public.notify_push_on_insert() FROM PUBLIC, anon, authenticated;
REVOKE EXECUTE ON FUNCTION public.validate_admin_manual_action() FROM PUBLIC, anon, authenticated;
REVOKE EXECUTE ON FUNCTION public.validate_admin_manual_vehicle_action() FROM PUBLIC, anon, authenticated;
REVOKE EXECUTE ON FUNCTION public.prevent_profile_privilege_escalation() FROM PUBLIC, anon, authenticated;
REVOKE EXECUTE ON FUNCTION public.sync_user_roles_from_profiles() FROM PUBLIC, anon, authenticated;
REVOKE EXECUTE ON FUNCTION public.cleanup_old_notifications() FROM PUBLIC, anon, authenticated;
REVOKE EXECUTE ON FUNCTION public.check_maintenance_reminders() FROM PUBLIC, anon, authenticated;
REVOKE EXECUTE ON FUNCTION public.check_overdue_tools() FROM PUBLIC, anon, authenticated;
REVOKE EXECUTE ON FUNCTION public.check_return_reminders() FROM PUBLIC, anon, authenticated;
REVOKE EXECUTE ON FUNCTION public.check_low_stock() FROM PUBLIC, anon, authenticated;
REVOKE EXECUTE ON FUNCTION public.check_prolonged_vehicle_use() FROM PUBLIC, anon, authenticated;
REVOKE EXECUTE ON FUNCTION public.check_vehicle_overdue_return() FROM PUBLIC, anon, authenticated;
REVOKE EXECUTE ON FUNCTION public.execute_asset_transfer(uuid) FROM PUBLIC, anon;

-- has_role used inside RLS (runs as SECURITY DEFINER caller); keep callable but revoke from anon
REVOKE EXECUTE ON FUNCTION public.has_role(uuid, user_role) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.has_role(uuid, user_role) TO authenticated;

-- Keep username->email lookup callable by anon (login flow)
-- get_email_from_username already accessible

-- Listing helpers: only authenticated
REVOKE EXECUTE ON FUNCTION public.get_approved_users() FROM PUBLIC, anon;
REVOKE EXECUTE ON FUNCTION public.get_active_clients_basic() FROM PUBLIC, anon;
REVOKE EXECUTE ON FUNCTION public.get_tool_usage_history(uuid) FROM PUBLIC, anon;
REVOKE EXECUTE ON FUNCTION public.get_last_cron_run(text) FROM PUBLIC, anon;
