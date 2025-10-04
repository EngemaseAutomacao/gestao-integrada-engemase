-- Add condition field to tools table
ALTER TABLE public.tools 
ADD COLUMN IF NOT EXISTS condition TEXT DEFAULT 'good' 
CHECK (condition IN ('excellent', 'good', 'fair', 'poor', 'needs_maintenance'));

-- Create maintenance_records table
CREATE TABLE IF NOT EXISTS public.maintenance_records (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  tool_id UUID NOT NULL REFERENCES public.tools(id) ON DELETE CASCADE,
  performed_by UUID NOT NULL REFERENCES auth.users(id),
  maintenance_type TEXT NOT NULL CHECK (maintenance_type IN ('preventive', 'corrective', 'inspection', 'calibration', 'cleaning', 'repair')),
  description TEXT NOT NULL,
  condition_before TEXT CHECK (condition_before IN ('excellent', 'good', 'fair', 'poor', 'needs_maintenance')),
  condition_after TEXT CHECK (condition_after IN ('excellent', 'good', 'fair', 'poor', 'needs_maintenance')),
  cost DECIMAL(10,2),
  parts_replaced TEXT,
  next_maintenance_date DATE,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable RLS on maintenance_records
ALTER TABLE public.maintenance_records ENABLE ROW LEVEL SECURITY;

-- RLS Policies for maintenance_records
CREATE POLICY "Anyone can view maintenance records"
ON public.maintenance_records
FOR SELECT
USING (true);

CREATE POLICY "Admins can insert maintenance records"
ON public.maintenance_records
FOR INSERT
WITH CHECK (
  EXISTS (
    SELECT 1 FROM public.profiles
    WHERE id = auth.uid() AND role = 'admin'
  )
);

CREATE POLICY "Admins can update maintenance records"
ON public.maintenance_records
FOR UPDATE
USING (
  EXISTS (
    SELECT 1 FROM public.profiles
    WHERE id = auth.uid() AND role = 'admin'
  )
);

CREATE POLICY "Admins can delete maintenance records"
ON public.maintenance_records
FOR DELETE
USING (
  EXISTS (
    SELECT 1 FROM public.profiles
    WHERE id = auth.uid() AND role = 'admin'
  )
);

-- Create indexes for performance
CREATE INDEX idx_maintenance_tool_id ON public.maintenance_records(tool_id);
CREATE INDEX idx_maintenance_created_at ON public.maintenance_records(created_at DESC);

-- Create trigger for updated_at
CREATE TRIGGER update_maintenance_records_updated_at
BEFORE UPDATE ON public.maintenance_records
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();

-- Function to get tool usage history
CREATE OR REPLACE FUNCTION public.get_tool_usage_history(tool_uuid UUID)
RETURNS TABLE (
  checkout_id UUID,
  user_name TEXT,
  user_email TEXT,
  user_category TEXT,
  checkout_date TIMESTAMP WITH TIME ZONE,
  checkin_date TIMESTAMP WITH TIME ZONE,
  status TEXT,
  construction_site TEXT,
  days_used INTEGER
)
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT 
    tc.id as checkout_id,
    p.full_name as user_name,
    p.email as user_email,
    p.category::text as user_category,
    tc.checkout_date,
    tc.checkin_date,
    tc.status::text,
    tc.construction_site,
    CASE 
      WHEN tc.checkin_date IS NOT NULL 
      THEN EXTRACT(DAY FROM tc.checkin_date - tc.checkout_date)::INTEGER
      ELSE EXTRACT(DAY FROM NOW() - tc.checkout_date)::INTEGER
    END as days_used
  FROM public.tool_checkouts tc
  JOIN public.profiles p ON p.id = tc.user_id
  WHERE tc.tool_id = tool_uuid
  ORDER BY tc.checkout_date DESC;
$$;