ALTER TABLE public.vehicle_checkouts
  ADD COLUMN is_outside_city boolean DEFAULT false,
  ADD COLUMN origin_address text,
  ADD COLUMN origin_latitude double precision,
  ADD COLUMN origin_longitude double precision,
  ADD COLUMN destination_address text,
  ADD COLUMN estimated_distance_km numeric,
  ADD COLUMN estimated_duration_minutes integer;