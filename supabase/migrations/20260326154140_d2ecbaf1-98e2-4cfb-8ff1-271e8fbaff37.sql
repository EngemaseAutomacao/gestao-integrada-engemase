
-- Drop all triggers first to avoid conflicts, then recreate

-- updated_at triggers
DROP TRIGGER IF EXISTS update_tools_updated_at ON public.tools;
DROP TRIGGER IF EXISTS update_tool_checkouts_updated_at ON public.tool_checkouts;
DROP TRIGGER IF EXISTS update_tool_issues_updated_at ON public.tool_issues;
DROP TRIGGER IF EXISTS update_maintenance_records_updated_at ON public.maintenance_records;
DROP TRIGGER IF EXISTS update_vehicles_updated_at ON public.vehicles;
DROP TRIGGER IF EXISTS update_vehicle_checkouts_updated_at ON public.vehicle_checkouts;
DROP TRIGGER IF EXISTS update_profiles_updated_at ON public.profiles;
DROP TRIGGER IF EXISTS update_construction_sites_updated_at ON public.construction_sites;
DROP TRIGGER IF EXISTS update_time_entries_updated_at ON public.time_entries;

-- functional triggers
DROP TRIGGER IF EXISTS trigger_update_tool_availability ON public.tool_checkouts;
DROP TRIGGER IF EXISTS trigger_update_vehicle_availability ON public.vehicle_checkouts;
DROP TRIGGER IF EXISTS trigger_prevent_privilege_escalation ON public.profiles;
DROP TRIGGER IF EXISTS trigger_sync_user_roles ON public.profiles;
DROP TRIGGER IF EXISTS trigger_notify_tool_checkout ON public.tool_checkouts;
DROP TRIGGER IF EXISTS trigger_notify_vehicle_checkout ON public.vehicle_checkouts;
DROP TRIGGER IF EXISTS trigger_notify_new_issue ON public.tool_issues;
DROP TRIGGER IF EXISTS trigger_notify_new_user ON public.profiles;
DROP TRIGGER IF EXISTS trigger_notify_user_approved ON public.profiles;
DROP TRIGGER IF EXISTS trigger_notify_issue_resolved ON public.tool_issues;
DROP TRIGGER IF EXISTS trigger_send_push_on_notification ON public.notifications;

-- 1. updated_at triggers
CREATE TRIGGER update_tools_updated_at BEFORE UPDATE ON public.tools FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
CREATE TRIGGER update_tool_checkouts_updated_at BEFORE UPDATE ON public.tool_checkouts FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
CREATE TRIGGER update_tool_issues_updated_at BEFORE UPDATE ON public.tool_issues FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
CREATE TRIGGER update_maintenance_records_updated_at BEFORE UPDATE ON public.maintenance_records FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
CREATE TRIGGER update_vehicles_updated_at BEFORE UPDATE ON public.vehicles FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
CREATE TRIGGER update_vehicle_checkouts_updated_at BEFORE UPDATE ON public.vehicle_checkouts FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
CREATE TRIGGER update_profiles_updated_at BEFORE UPDATE ON public.profiles FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
CREATE TRIGGER update_construction_sites_updated_at BEFORE UPDATE ON public.construction_sites FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
CREATE TRIGGER update_time_entries_updated_at BEFORE UPDATE ON public.time_entries FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- 2. Tool availability
CREATE TRIGGER trigger_update_tool_availability AFTER INSERT OR UPDATE ON public.tool_checkouts FOR EACH ROW EXECUTE FUNCTION public.update_tool_availability();

-- 3. Vehicle availability
CREATE TRIGGER trigger_update_vehicle_availability AFTER INSERT OR UPDATE ON public.vehicle_checkouts FOR EACH ROW EXECUTE FUNCTION public.update_vehicle_availability();

-- 4. Privilege escalation prevention
CREATE TRIGGER trigger_prevent_privilege_escalation BEFORE UPDATE ON public.profiles FOR EACH ROW EXECUTE FUNCTION public.prevent_profile_privilege_escalation();

-- 5. Sync user roles
CREATE TRIGGER trigger_sync_user_roles AFTER INSERT OR UPDATE OR DELETE ON public.profiles FOR EACH ROW EXECUTE FUNCTION public.sync_user_roles_from_profiles();

-- 6. Tool checkout/checkin notifications
CREATE TRIGGER trigger_notify_tool_checkout AFTER INSERT OR UPDATE ON public.tool_checkouts FOR EACH ROW EXECUTE FUNCTION public.notify_tool_checkout();

-- 7. Vehicle checkout/checkin notifications
CREATE TRIGGER trigger_notify_vehicle_checkout AFTER INSERT OR UPDATE ON public.vehicle_checkouts FOR EACH ROW EXECUTE FUNCTION public.notify_vehicle_checkout();

-- 8. New issue notification
CREATE TRIGGER trigger_notify_new_issue AFTER INSERT ON public.tool_issues FOR EACH ROW EXECUTE FUNCTION public.notify_new_issue();

-- 9. New user notification
CREATE TRIGGER trigger_notify_new_user AFTER INSERT ON public.profiles FOR EACH ROW EXECUTE FUNCTION public.notify_new_user();

-- 10. User approved notification
CREATE TRIGGER trigger_notify_user_approved AFTER UPDATE ON public.profiles FOR EACH ROW EXECUTE FUNCTION public.notify_user_approved();

-- 11. Issue resolved notification
CREATE TRIGGER trigger_notify_issue_resolved AFTER UPDATE ON public.tool_issues FOR EACH ROW EXECUTE FUNCTION public.notify_issue_resolved();

-- 12. Push notification on new notification
CREATE TRIGGER trigger_send_push_on_notification AFTER INSERT ON public.notifications FOR EACH ROW EXECUTE FUNCTION public.send_push_on_notification();

-- 13. Enable pg_net extension (needed for push notifications via triggers)
CREATE EXTENSION IF NOT EXISTS pg_net WITH SCHEMA extensions;
