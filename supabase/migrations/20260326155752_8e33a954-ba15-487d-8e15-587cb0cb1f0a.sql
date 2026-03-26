
-- Drop the restrictive check constraint
ALTER TABLE public.notifications DROP CONSTRAINT notifications_type_check;

-- Add updated constraint with ALL notification types used in the system
ALTER TABLE public.notifications ADD CONSTRAINT notifications_type_check CHECK (
  type = ANY (ARRAY[
    'overdue'::text,
    'overdue_user_reminder'::text,
    'low_stock'::text,
    'return_reminder'::text,
    'maintenance_reminder'::text,
    'checkout'::text,
    'checkin'::text,
    'user_pending'::text,
    'account_approved'::text,
    'issue_reported'::text,
    'issue_resolved'::text,
    'vehicle_checkout'::text,
    'vehicle_checkin'::text,
    'vehicle_prolonged_use'::text
  ])
);
