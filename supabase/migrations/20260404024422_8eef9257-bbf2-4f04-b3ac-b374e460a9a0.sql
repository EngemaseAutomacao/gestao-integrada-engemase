
CREATE TABLE public.vehicle_issues (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  vehicle_id UUID NOT NULL REFERENCES public.vehicles(id) ON DELETE CASCADE,
  checkout_id UUID REFERENCES public.vehicle_checkouts(id) ON DELETE SET NULL,
  reported_by UUID NOT NULL REFERENCES public.profiles(id),
  title TEXT NOT NULL,
  description TEXT NOT NULL,
  severity public.issue_severity NOT NULL DEFAULT 'medium',
  status public.issue_status NOT NULL DEFAULT 'open',
  resolution_notes TEXT,
  resolved_by UUID REFERENCES public.profiles(id),
  resolved_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE public.vehicle_issues ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Authenticated users can view vehicle issues"
  ON public.vehicle_issues FOR SELECT TO authenticated
  USING (auth.uid() IS NOT NULL);

CREATE POLICY "Authenticated users can report vehicle issues"
  ON public.vehicle_issues FOR INSERT TO authenticated
  WITH CHECK (auth.uid() = reported_by);

CREATE POLICY "Admins can update all vehicle issues"
  ON public.vehicle_issues FOR UPDATE TO authenticated
  USING (public.has_role(auth.uid(), 'admin'));

CREATE POLICY "Users can update own vehicle issues"
  ON public.vehicle_issues FOR UPDATE TO authenticated
  USING (auth.uid() = reported_by);

CREATE POLICY "Admins can delete vehicle issues"
  ON public.vehicle_issues FOR DELETE TO authenticated
  USING (public.has_role(auth.uid(), 'admin'));
