-- Remove unused clients infrastructure
ALTER TABLE public.construction_sites DROP COLUMN IF EXISTS client_id;
DROP FUNCTION IF EXISTS public.get_active_clients_basic();
DROP TABLE IF EXISTS public.clients CASCADE;