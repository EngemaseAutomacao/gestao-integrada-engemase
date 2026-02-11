-- Add 'socios' to user_category enum
ALTER TYPE public.user_category ADD VALUE IF NOT EXISTS 'socios';
