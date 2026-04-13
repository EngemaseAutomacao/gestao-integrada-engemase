
-- Add photo columns to time_entries
ALTER TABLE public.time_entries
  ADD COLUMN IF NOT EXISTS clock_in_photo_url text,
  ADD COLUMN IF NOT EXISTS clock_out_photo_url text;

-- Add entry type
ALTER TABLE public.time_entries
  ADD COLUMN IF NOT EXISTS entry_type text NOT NULL DEFAULT 'obra';

-- Add geofence alert columns
ALTER TABLE public.time_entries
  ADD COLUMN IF NOT EXISTS location_alert boolean NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS distance_from_site_meters numeric;

-- Add coordinates to construction_sites for geofencing
ALTER TABLE public.construction_sites
  ADD COLUMN IF NOT EXISTS latitude double precision,
  ADD COLUMN IF NOT EXISTS longitude double precision;
