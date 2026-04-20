-- Add client_id to construction_sites
ALTER TABLE public.construction_sites 
ADD COLUMN client_id UUID REFERENCES public.clients(id) ON DELETE SET NULL;

-- Create an index for the foreign key
CREATE INDEX idx_construction_sites_client_id ON public.construction_sites(client_id);
