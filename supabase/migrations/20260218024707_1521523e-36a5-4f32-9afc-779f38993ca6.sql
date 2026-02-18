
-- Add 4-angle photo columns for checkout
ALTER TABLE public.vehicle_checkouts ADD COLUMN IF NOT EXISTS photo_front_checkout text;
ALTER TABLE public.vehicle_checkouts ADD COLUMN IF NOT EXISTS photo_back_checkout text;
ALTER TABLE public.vehicle_checkouts ADD COLUMN IF NOT EXISTS photo_left_checkout text;
ALTER TABLE public.vehicle_checkouts ADD COLUMN IF NOT EXISTS photo_right_checkout text;

-- Add 4-angle photo columns for checkin
ALTER TABLE public.vehicle_checkouts ADD COLUMN IF NOT EXISTS photo_front_checkin text;
ALTER TABLE public.vehicle_checkouts ADD COLUMN IF NOT EXISTS photo_back_checkin text;
ALTER TABLE public.vehicle_checkouts ADD COLUMN IF NOT EXISTS photo_left_checkin text;
ALTER TABLE public.vehicle_checkouts ADD COLUMN IF NOT EXISTS photo_right_checkin text;
