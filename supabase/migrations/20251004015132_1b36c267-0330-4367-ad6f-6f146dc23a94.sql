-- Rename serial_number column to tag
ALTER TABLE public.tools RENAME COLUMN serial_number TO tag;

-- Add brand column
ALTER TABLE public.tools ADD COLUMN brand text;