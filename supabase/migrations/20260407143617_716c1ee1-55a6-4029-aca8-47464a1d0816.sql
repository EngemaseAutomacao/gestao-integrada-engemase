
ALTER TABLE public.notifications DROP CONSTRAINT notifications_type_check;
ALTER TABLE public.notifications ADD CONSTRAINT notifications_type_check CHECK (type = ANY (ARRAY[
  'overdue', 'overdue_user_reminder', 'low_stock', 'return_reminder', 'maintenance_reminder',
  'checkout', 'checkin', 'user_pending', 'account_approved', 'issue_reported', 'issue_resolved',
  'vehicle_checkout', 'vehicle_checkin', 'vehicle_prolonged_use', 'vehicle_overdue_return',
  'manual', 'extension_request',
  'transfer_request', 'transfer_accepted', 'transfer_approved', 'transfer_rejected'
]));
