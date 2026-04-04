
-- Table for material requests/requisitions
CREATE TABLE public.material_requests (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  requested_by_name TEXT NOT NULL,
  construction_site TEXT,
  status TEXT NOT NULL DEFAULT 'pending',
  notes TEXT,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Table for items within a material request
CREATE TABLE public.material_request_items (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  request_id UUID NOT NULL REFERENCES public.material_requests(id) ON DELETE CASCADE,
  material_name TEXT NOT NULL,
  quantity NUMERIC NOT NULL DEFAULT 1,
  unit TEXT NOT NULL DEFAULT 'un',
  notes TEXT,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.material_requests ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.material_request_items ENABLE ROW LEVEL SECURITY;

-- RLS for material_requests
CREATE POLICY "Users can view own requests" ON public.material_requests
  FOR SELECT TO authenticated USING (user_id = auth.uid());

CREATE POLICY "Users can insert own requests" ON public.material_requests
  FOR INSERT TO authenticated WITH CHECK (user_id = auth.uid());

CREATE POLICY "Admins can view all requests" ON public.material_requests
  FOR SELECT TO authenticated USING (public.has_role(auth.uid(), 'admin'));

CREATE POLICY "Admins can update all requests" ON public.material_requests
  FOR UPDATE TO authenticated USING (public.has_role(auth.uid(), 'admin'));

CREATE POLICY "Admins can delete requests" ON public.material_requests
  FOR DELETE TO authenticated USING (public.has_role(auth.uid(), 'admin'));

-- RLS for material_request_items
CREATE POLICY "Users can view own request items" ON public.material_request_items
  FOR SELECT TO authenticated USING (
    EXISTS (SELECT 1 FROM public.material_requests WHERE id = request_id AND user_id = auth.uid())
  );

CREATE POLICY "Users can insert items to own requests" ON public.material_request_items
  FOR INSERT TO authenticated WITH CHECK (
    EXISTS (SELECT 1 FROM public.material_requests WHERE id = request_id AND user_id = auth.uid())
  );

CREATE POLICY "Admins can view all request items" ON public.material_request_items
  FOR SELECT TO authenticated USING (public.has_role(auth.uid(), 'admin'));

CREATE POLICY "Admins can update all request items" ON public.material_request_items
  FOR UPDATE TO authenticated USING (public.has_role(auth.uid(), 'admin'));

CREATE POLICY "Admins can delete request items" ON public.material_request_items
  FOR DELETE TO authenticated USING (public.has_role(auth.uid(), 'admin'));
