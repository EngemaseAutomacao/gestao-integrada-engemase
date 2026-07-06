
ALTER TABLE public.vehicles
  ADD COLUMN IF NOT EXISTS is_charging boolean NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS charging_started_at timestamptz,
  ADD COLUMN IF NOT EXISTS charging_started_by uuid;

CREATE OR REPLACE FUNCTION public.set_vehicle_charging(_vehicle_id uuid, _is_charging boolean)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_status text;
BEGIN
  IF auth.uid() IS NULL THEN
    RAISE EXCEPTION 'Not authenticated';
  END IF;

  SELECT status INTO v_status FROM public.vehicles WHERE id = _vehicle_id;
  IF v_status IS NULL THEN
    RAISE EXCEPTION 'Veículo não encontrado';
  END IF;
  IF v_status = 'in_use' THEN
    RAISE EXCEPTION 'Veículo em uso não pode ser marcado como carregando';
  END IF;

  IF _is_charging THEN
    UPDATE public.vehicles
      SET is_charging = true,
          charging_started_at = now(),
          charging_started_by = auth.uid()
      WHERE id = _vehicle_id;
  ELSE
    UPDATE public.vehicles
      SET is_charging = false,
          charging_started_at = NULL,
          charging_started_by = NULL
      WHERE id = _vehicle_id;
  END IF;
END;
$$;

GRANT EXECUTE ON FUNCTION public.set_vehicle_charging(uuid, boolean) TO authenticated;
