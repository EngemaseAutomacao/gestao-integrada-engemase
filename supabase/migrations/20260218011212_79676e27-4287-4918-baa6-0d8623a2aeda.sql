
-- Add first_login column to profiles (defaults to true for new users)
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS first_login boolean NOT NULL DEFAULT true;

-- Set existing users as NOT first login (they already have passwords)
UPDATE public.profiles SET first_login = false;
