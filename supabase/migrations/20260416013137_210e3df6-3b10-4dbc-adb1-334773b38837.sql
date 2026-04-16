
ALTER TABLE public.tool_issues ADD COLUMN IF NOT EXISTS photo_url text;

ALTER TABLE public.material_requests ADD COLUMN IF NOT EXISTS rejection_reason text;
ALTER TABLE public.material_requests ADD COLUMN IF NOT EXISTS approved_by uuid;
ALTER TABLE public.material_requests ADD COLUMN IF NOT EXISTS approved_at timestamp with time zone;
