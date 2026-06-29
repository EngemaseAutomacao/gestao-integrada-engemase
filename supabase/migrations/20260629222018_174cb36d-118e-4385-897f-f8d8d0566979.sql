-- Remove módulos descontinuados: Manutenção, Combustível, Materiais
DROP FUNCTION IF EXISTS public.check_maintenance_reminders() CASCADE;
DROP TABLE IF EXISTS public.material_request_items CASCADE;
DROP TABLE IF EXISTS public.material_requests CASCADE;
DROP TABLE IF EXISTS public.maintenance_records CASCADE;
DROP TABLE IF EXISTS public.fuel_records CASCADE;