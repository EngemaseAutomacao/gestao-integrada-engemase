ALTER TABLE public.vehicle_checkouts
  ADD COLUMN IF NOT EXISTS photo_interior_front_checkout text,
  ADD COLUMN IF NOT EXISTS photo_interior_back_checkout text,
  ADD COLUMN IF NOT EXISTS photo_interior_front_checkin text,
  ADD COLUMN IF NOT EXISTS photo_interior_back_checkin text;