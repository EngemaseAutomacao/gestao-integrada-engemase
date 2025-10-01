-- Create enum types for user categories and roles
CREATE TYPE public.user_category AS ENUM ('engemase_employee', 'third_party');
CREATE TYPE public.user_role AS ENUM ('admin', 'employee', 'third_party');
CREATE TYPE public.checkout_status AS ENUM ('checked_out', 'checked_in');

-- Create profiles table for additional user information
CREATE TABLE public.profiles (
  id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  email TEXT NOT NULL,
  full_name TEXT NOT NULL,
  category public.user_category NOT NULL DEFAULT 'engemase_employee',
  role public.user_role NOT NULL DEFAULT 'employee',
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Enable RLS on profiles
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;

-- Profiles RLS policies
CREATE POLICY "Users can view all profiles"
  ON public.profiles FOR SELECT
  TO authenticated
  USING (true);

CREATE POLICY "Users can update own profile"
  ON public.profiles FOR UPDATE
  TO authenticated
  USING (auth.uid() = id);

CREATE POLICY "Admins can insert profiles"
  ON public.profiles FOR INSERT
  TO authenticated
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.profiles
      WHERE id = auth.uid() AND role = 'admin'
    )
  );

CREATE POLICY "Admins can update all profiles"
  ON public.profiles FOR UPDATE
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.profiles
      WHERE id = auth.uid() AND role = 'admin'
    )
  );

CREATE POLICY "Admins can delete profiles"
  ON public.profiles FOR DELETE
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.profiles
      WHERE id = auth.uid() AND role = 'admin'
    )
  );

-- Create tools table
CREATE TABLE public.tools (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  description TEXT,
  serial_number TEXT UNIQUE,
  quantity_available INTEGER NOT NULL DEFAULT 0,
  quantity_total INTEGER NOT NULL DEFAULT 0,
  employee_only BOOLEAN NOT NULL DEFAULT false,
  qr_code TEXT UNIQUE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  created_by UUID REFERENCES public.profiles(id)
);

-- Enable RLS on tools
ALTER TABLE public.tools ENABLE ROW LEVEL SECURITY;

-- Tools RLS policies
CREATE POLICY "Anyone can view tools"
  ON public.tools FOR SELECT
  TO authenticated
  USING (true);

CREATE POLICY "Admins can insert tools"
  ON public.tools FOR INSERT
  TO authenticated
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.profiles
      WHERE id = auth.uid() AND role = 'admin'
    )
  );

CREATE POLICY "Admins can update tools"
  ON public.tools FOR UPDATE
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.profiles
      WHERE id = auth.uid() AND role = 'admin'
    )
  );

CREATE POLICY "Admins can delete tools"
  ON public.tools FOR DELETE
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.profiles
      WHERE id = auth.uid() AND role = 'admin'
    )
  );

-- Create tool checkouts table for tracking history
CREATE TABLE public.tool_checkouts (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tool_id UUID NOT NULL REFERENCES public.tools(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  status public.checkout_status NOT NULL DEFAULT 'checked_out',
  checkout_date TIMESTAMPTZ NOT NULL DEFAULT now(),
  checkin_date TIMESTAMPTZ,
  checked_out_by UUID NOT NULL REFERENCES public.profiles(id),
  checked_in_by UUID REFERENCES public.profiles(id),
  notes TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Enable RLS on tool_checkouts
ALTER TABLE public.tool_checkouts ENABLE ROW LEVEL SECURITY;

-- Tool checkouts RLS policies
CREATE POLICY "Users can view own checkouts"
  ON public.tool_checkouts FOR SELECT
  TO authenticated
  USING (user_id = auth.uid());

CREATE POLICY "Admins can view all checkouts"
  ON public.tool_checkouts FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.profiles
      WHERE id = auth.uid() AND role = 'admin'
    )
  );

CREATE POLICY "Users can create checkouts"
  ON public.tool_checkouts FOR INSERT
  TO authenticated
  WITH CHECK (user_id = auth.uid());

CREATE POLICY "Admins can create any checkout"
  ON public.tool_checkouts FOR INSERT
  TO authenticated
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.profiles
      WHERE id = auth.uid() AND role = 'admin'
    )
  );

CREATE POLICY "Users can update own checkouts"
  ON public.tool_checkouts FOR UPDATE
  TO authenticated
  USING (user_id = auth.uid());

CREATE POLICY "Admins can update all checkouts"
  ON public.tool_checkouts FOR UPDATE
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.profiles
      WHERE id = auth.uid() AND role = 'admin'
    )
  );

-- Create function to auto-create profile on user signup
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  INSERT INTO public.profiles (id, email, full_name, category, role)
  VALUES (
    NEW.id,
    NEW.email,
    COALESCE(NEW.raw_user_meta_data->>'full_name', NEW.email),
    COALESCE((NEW.raw_user_meta_data->>'category')::public.user_category, 'engemase_employee'),
    COALESCE((NEW.raw_user_meta_data->>'role')::public.user_role, 'employee')
  );
  RETURN NEW;
END;
$$;

-- Trigger to create profile on user signup
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();

-- Create function to update updated_at timestamp
CREATE OR REPLACE FUNCTION public.update_updated_at_column()
RETURNS TRIGGER
LANGUAGE plpgsql
AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$;

-- Add triggers for updated_at
CREATE TRIGGER update_profiles_updated_at
  BEFORE UPDATE ON public.profiles
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_tools_updated_at
  BEFORE UPDATE ON public.tools
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_tool_checkouts_updated_at
  BEFORE UPDATE ON public.tool_checkouts
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- Create function to update tool availability on checkout/checkin
CREATE OR REPLACE FUNCTION public.update_tool_availability()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF TG_OP = 'INSERT' AND NEW.status = 'checked_out' THEN
    UPDATE public.tools
    SET quantity_available = quantity_available - 1
    WHERE id = NEW.tool_id AND quantity_available > 0;
  ELSIF TG_OP = 'UPDATE' AND OLD.status = 'checked_out' AND NEW.status = 'checked_in' THEN
    UPDATE public.tools
    SET quantity_available = quantity_available + 1
    WHERE id = NEW.tool_id;
  END IF;
  RETURN NEW;
END;
$$;

-- Trigger to update tool availability
CREATE TRIGGER on_checkout_status_change
  AFTER INSERT OR UPDATE ON public.tool_checkouts
  FOR EACH ROW EXECUTE FUNCTION public.update_tool_availability();