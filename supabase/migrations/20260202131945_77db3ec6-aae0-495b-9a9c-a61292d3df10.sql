-- Add approved column to profiles table
ALTER TABLE public.profiles 
ADD COLUMN approved boolean NOT NULL DEFAULT true;