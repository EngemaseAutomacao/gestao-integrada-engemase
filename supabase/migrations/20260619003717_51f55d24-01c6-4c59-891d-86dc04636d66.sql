
-- Performance indexes (CREATE INDEX IF NOT EXISTS é seguro e idempotente)
CREATE INDEX IF NOT EXISTS idx_tool_checkouts_tool_status ON public.tool_checkouts (tool_id, status);
CREATE INDEX IF NOT EXISTS idx_tool_checkouts_user_status ON public.tool_checkouts (user_id, status);
CREATE INDEX IF NOT EXISTS idx_tool_checkouts_checkout_date ON public.tool_checkouts (checkout_date DESC);
CREATE INDEX IF NOT EXISTS idx_tool_checkouts_status_estimated ON public.tool_checkouts (status, estimated_return_date) WHERE status = 'checked_out';

CREATE INDEX IF NOT EXISTS idx_vehicle_checkouts_vehicle_status ON public.vehicle_checkouts (vehicle_id, status);
CREATE INDEX IF NOT EXISTS idx_vehicle_checkouts_user_status ON public.vehicle_checkouts (user_id, status);
CREATE INDEX IF NOT EXISTS idx_vehicle_checkouts_checkout_date ON public.vehicle_checkouts (checkout_date DESC);

CREATE INDEX IF NOT EXISTS idx_notifications_user_created ON public.notifications (user_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_notifications_user_unread ON public.notifications (user_id) WHERE read = false;

CREATE INDEX IF NOT EXISTS idx_asset_transfers_from_user ON public.asset_transfers (from_user_id, status);
CREATE INDEX IF NOT EXISTS idx_asset_transfers_to_user ON public.asset_transfers (to_user_id, status);

CREATE INDEX IF NOT EXISTS idx_vehicle_issues_vehicle ON public.vehicle_issues (vehicle_id, status);
CREATE INDEX IF NOT EXISTS idx_fuel_records_vehicle_date ON public.fuel_records (vehicle_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_time_entries_user_date ON public.time_entries (user_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_system_logs_created ON public.system_logs (created_at DESC);
CREATE INDEX IF NOT EXISTS idx_system_logs_entity ON public.system_logs (entity_type, entity_id);
