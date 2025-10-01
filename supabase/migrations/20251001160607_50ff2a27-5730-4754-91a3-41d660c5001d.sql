-- Add construction site and estimated return date fields to tool_checkouts
ALTER TABLE public.tool_checkouts 
ADD COLUMN construction_site TEXT,
ADD COLUMN estimated_return_date TIMESTAMPTZ;

-- Add comment to columns
COMMENT ON COLUMN public.tool_checkouts.construction_site IS 'Nome da obra para onde a ferramenta está sendo levada';
COMMENT ON COLUMN public.tool_checkouts.estimated_return_date IS 'Data estimada para devolução da ferramenta';