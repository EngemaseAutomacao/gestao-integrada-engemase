-- Add vehicle_type to distinguish platforms from regular vehicles
ALTER TABLE public.vehicles
ADD COLUMN IF NOT EXISTS vehicle_type text NOT NULL DEFAULT 'vehicle';

-- Add platform-specific photo columns to vehicle_checkouts
ALTER TABLE public.vehicle_checkouts
ADD COLUMN IF NOT EXISTS photo_control_checkout text,
ADD COLUMN IF NOT EXISTS photo_control_checkin text,
ADD COLUMN IF NOT EXISTS photo_wheel_fl_checkout text,
ADD COLUMN IF NOT EXISTS photo_wheel_fl_checkin text,
ADD COLUMN IF NOT EXISTS photo_wheel_fr_checkout text,
ADD COLUMN IF NOT EXISTS photo_wheel_fr_checkin text,
ADD COLUMN IF NOT EXISTS photo_wheel_rl_checkout text,
ADD COLUMN IF NOT EXISTS photo_wheel_rl_checkin text,
ADD COLUMN IF NOT EXISTS photo_wheel_rr_checkout text,
ADD COLUMN IF NOT EXISTS photo_wheel_rr_checkin text,
ADD COLUMN IF NOT EXISTS charges_during_use integer;