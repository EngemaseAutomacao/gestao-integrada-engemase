-- Drop the existing foreign key constraint
ALTER TABLE public.maintenance_records 
DROP CONSTRAINT IF EXISTS maintenance_records_performed_by_fkey;

-- Add new foreign key constraint to profiles table
ALTER TABLE public.maintenance_records 
ADD CONSTRAINT maintenance_records_performed_by_fkey 
FOREIGN KEY (performed_by) REFERENCES public.profiles(id) ON DELETE CASCADE;