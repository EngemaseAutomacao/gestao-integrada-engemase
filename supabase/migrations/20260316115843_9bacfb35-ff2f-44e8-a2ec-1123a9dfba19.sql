
-- 1. Enable realtime for notifications
ALTER PUBLICATION supabase_realtime ADD TABLE public.notifications;

-- 2. Create construction_sites table
CREATE TABLE public.construction_sites (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name text NOT NULL,
  address text,
  active boolean NOT NULL DEFAULT true,
  created_by uuid REFERENCES public.profiles(id),
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.construction_sites ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Authenticated users can view construction sites"
  ON public.construction_sites FOR SELECT
  TO authenticated
  USING (auth.uid() IS NOT NULL);

CREATE POLICY "Admins can insert construction sites"
  ON public.construction_sites FOR INSERT
  TO authenticated
  WITH CHECK (has_role(auth.uid(), 'admin'::user_role));

CREATE POLICY "Admins can update construction sites"
  ON public.construction_sites FOR UPDATE
  TO authenticated
  USING (has_role(auth.uid(), 'admin'::user_role));

CREATE POLICY "Admins can delete construction sites"
  ON public.construction_sites FOR DELETE
  TO authenticated
  USING (has_role(auth.uid(), 'admin'::user_role));

CREATE TRIGGER update_construction_sites_updated_at
  BEFORE UPDATE ON public.construction_sites
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();

-- 3. Create fuel_records table
CREATE TABLE public.fuel_records (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  vehicle_id uuid NOT NULL REFERENCES public.vehicles(id) ON DELETE CASCADE,
  vehicle_checkout_id uuid REFERENCES public.vehicle_checkouts(id),
  user_id uuid NOT NULL REFERENCES public.profiles(id),
  fuel_type text NOT NULL DEFAULT 'gasoline',
  liters numeric NOT NULL,
  cost_per_liter numeric,
  total_cost numeric,
  km_at_refuel integer NOT NULL,
  gas_station text,
  notes text,
  refuel_date timestamptz NOT NULL DEFAULT now(),
  created_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.fuel_records ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Authenticated users can view fuel records"
  ON public.fuel_records FOR SELECT
  TO authenticated
  USING (auth.uid() IS NOT NULL);

CREATE POLICY "Authenticated users can insert fuel records"
  ON public.fuel_records FOR INSERT
  TO authenticated
  WITH CHECK (auth.uid() IS NOT NULL);

CREATE POLICY "Users can update own fuel records or admins"
  ON public.fuel_records FOR UPDATE
  TO authenticated
  USING ((user_id = auth.uid()) OR has_role(auth.uid(), 'admin'::user_role));

CREATE POLICY "Admins can delete fuel records"
  ON public.fuel_records FOR DELETE
  TO authenticated
  USING (has_role(auth.uid(), 'admin'::user_role));
