-- Remove existing low_stock notifications and disable the function so it stops creating new ones
DELETE FROM public.notifications WHERE type = 'low_stock';

CREATE OR REPLACE FUNCTION public.check_low_stock()
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  -- Disabled: low stock notifications removed by user request
  RETURN;
END;
$$;