-- Create vehicles table
CREATE TABLE public.vehicles (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  name TEXT NOT NULL,
  plate TEXT NOT NULL UNIQUE,
  brand TEXT,
  model TEXT,
  year INTEGER,
  color TEXT,
  image_url TEXT,
  status TEXT DEFAULT 'available' CHECK (status IN ('available', 'in_use', 'maintenance')),
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  created_by UUID REFERENCES public.profiles(id)
);

-- Create vehicle checkouts table
CREATE TABLE public.vehicle_checkouts (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  vehicle_id UUID NOT NULL REFERENCES public.vehicles(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES public.profiles(id),
  checkout_date TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  checkin_date TIMESTAMP WITH TIME ZONE,
  km_checkout INTEGER NOT NULL,
  km_checkin INTEGER,
  destination TEXT,
  purpose TEXT,
  notes TEXT,
  status TEXT DEFAULT 'checked_out' CHECK (status IN ('checked_out', 'checked_in')),
  checked_out_by UUID NOT NULL REFERENCES public.profiles(id),
  checked_in_by UUID REFERENCES public.profiles(id),
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.vehicles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.vehicle_checkouts ENABLE ROW LEVEL SECURITY;

-- RLS Policies for vehicles
CREATE POLICY "Anyone can view vehicles" ON public.vehicles FOR SELECT USING (true);
CREATE POLICY "Admins can insert vehicles" ON public.vehicles FOR INSERT WITH CHECK (
  EXISTS (SELECT 1 FROM public.profiles WHERE id = auth.uid() AND role = 'admin')
);
CREATE POLICY "Admins can update vehicles" ON public.vehicles FOR UPDATE USING (
  EXISTS (SELECT 1 FROM public.profiles WHERE id = auth.uid() AND role = 'admin')
);
CREATE POLICY "Admins can delete vehicles" ON public.vehicles FOR DELETE USING (
  EXISTS (SELECT 1 FROM public.profiles WHERE id = auth.uid() AND role = 'admin')
);

-- RLS Policies for vehicle_checkouts
CREATE POLICY "Authenticated users can view vehicle checkouts" ON public.vehicle_checkouts FOR SELECT USING (auth.uid() IS NOT NULL);
CREATE POLICY "Authenticated users can insert vehicle checkouts" ON public.vehicle_checkouts FOR INSERT WITH CHECK (auth.uid() IS NOT NULL);
CREATE POLICY "Users can update their own checkouts or admins can update any" ON public.vehicle_checkouts FOR UPDATE USING (
  user_id = auth.uid() OR EXISTS (SELECT 1 FROM public.profiles WHERE id = auth.uid() AND role = 'admin')
);

-- Create trigger for updated_at
CREATE TRIGGER update_vehicles_updated_at BEFORE UPDATE ON public.vehicles FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
CREATE TRIGGER update_vehicle_checkouts_updated_at BEFORE UPDATE ON public.vehicle_checkouts FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- Function to update vehicle availability
CREATE OR REPLACE FUNCTION public.update_vehicle_availability()
RETURNS TRIGGER AS $$
BEGIN
  IF TG_OP = 'INSERT' AND NEW.status = 'checked_out' THEN
    UPDATE public.vehicles SET status = 'in_use' WHERE id = NEW.vehicle_id;
  ELSIF TG_OP = 'UPDATE' AND OLD.status = 'checked_out' AND NEW.status = 'checked_in' THEN
    UPDATE public.vehicles SET status = 'available' WHERE id = NEW.vehicle_id;
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;

CREATE TRIGGER update_vehicle_status AFTER INSERT OR UPDATE ON public.vehicle_checkouts FOR EACH ROW EXECUTE FUNCTION public.update_vehicle_availability();