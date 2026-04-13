
-- Create clients table
CREATE TABLE public.clients (
  id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  name text NOT NULL,
  contact_name text,
  contact_phone text,
  contact_email text,
  address text,
  active boolean NOT NULL DEFAULT true,
  created_by uuid REFERENCES public.profiles(id),
  created_at timestamp with time zone NOT NULL DEFAULT now(),
  updated_at timestamp with time zone NOT NULL DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.clients ENABLE ROW LEVEL SECURITY;

-- Policies
CREATE POLICY "Authenticated users can view active clients"
  ON public.clients FOR SELECT TO authenticated
  USING (auth.uid() IS NOT NULL);

CREATE POLICY "Admins can insert clients"
  ON public.clients FOR INSERT TO authenticated
  WITH CHECK (has_role(auth.uid(), 'admin'::user_role));

CREATE POLICY "Admins can update clients"
  ON public.clients FOR UPDATE TO authenticated
  USING (has_role(auth.uid(), 'admin'::user_role));

CREATE POLICY "Admins can delete clients"
  ON public.clients FOR DELETE TO authenticated
  USING (has_role(auth.uid(), 'admin'::user_role));

-- Timestamp trigger
CREATE TRIGGER update_clients_updated_at
  BEFORE UPDATE ON public.clients
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- Add client_name to time_entries
ALTER TABLE public.time_entries
  ADD COLUMN IF NOT EXISTS client_name text;
