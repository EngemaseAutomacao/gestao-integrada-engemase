-- Update handle_new_user function to include username and approved field
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  INSERT INTO public.profiles (id, email, full_name, username, category, role, approved)
  VALUES (
    NEW.id,
    NEW.email,
    COALESCE(NEW.raw_user_meta_data->>'full_name', NEW.email),
    NEW.raw_user_meta_data->>'username',
    COALESCE((NEW.raw_user_meta_data->>'category')::public.user_category, 'engemase_employee'),
    COALESCE((NEW.raw_user_meta_data->>'role')::public.user_role, 'employee'),
    false  -- New users are not approved by default
  );
  RETURN NEW;
END;
$$;