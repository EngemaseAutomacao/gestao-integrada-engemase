
-- Create time_entries table for online time clock
CREATE TABLE public.time_entries (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  entry_date DATE NOT NULL DEFAULT CURRENT_DATE,
  clock_in TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  clock_out TIMESTAMP WITH TIME ZONE,
  clock_in_latitude DOUBLE PRECISION,
  clock_in_longitude DOUBLE PRECISION,
  clock_in_address TEXT,
  clock_out_latitude DOUBLE PRECISION,
  clock_out_longitude DOUBLE PRECISION,
  clock_out_address TEXT,
  notes TEXT,
  status TEXT NOT NULL DEFAULT 'open',
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.time_entries ENABLE ROW LEVEL SECURITY;

-- Users can view own entries
CREATE POLICY "Users can view own time entries" ON public.time_entries
  FOR SELECT TO authenticated
  USING (user_id = auth.uid());

-- Admins can view all entries
CREATE POLICY "Admins can view all time entries" ON public.time_entries
  FOR SELECT TO authenticated
  USING (has_role(auth.uid(), 'admin'::user_role));

-- Users can insert own entries
CREATE POLICY "Users can insert own time entries" ON public.time_entries
  FOR INSERT TO authenticated
  WITH CHECK (user_id = auth.uid());

-- Users can update own entries
CREATE POLICY "Users can update own time entries" ON public.time_entries
  FOR UPDATE TO authenticated
  USING (user_id = auth.uid());

-- Admins can update all entries
CREATE POLICY "Admins can update all time entries" ON public.time_entries
  FOR UPDATE TO authenticated
  USING (has_role(auth.uid(), 'admin'::user_role));

-- Admins can delete entries
CREATE POLICY "Admins can delete time entries" ON public.time_entries
  FOR DELETE TO authenticated
  USING (has_role(auth.uid(), 'admin'::user_role));
