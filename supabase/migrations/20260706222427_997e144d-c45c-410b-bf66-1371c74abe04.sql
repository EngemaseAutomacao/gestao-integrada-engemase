
CREATE TABLE IF NOT EXISTS public.vehicle_charging_sessions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  vehicle_id uuid NOT NULL REFERENCES public.vehicles(id) ON DELETE CASCADE,
  started_at timestamptz NOT NULL DEFAULT now(),
  started_by uuid,
  ended_at timestamptz,
  ended_by uuid,
  created_at timestamptz NOT NULL DEFAULT now()
);

GRANT SELECT ON public.vehicle_charging_sessions TO authenticated;
GRANT ALL ON public.vehicle_charging_sessions TO service_role;

ALTER TABLE public.vehicle_charging_sessions ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Authenticated can view charging sessions"
  ON public.vehicle_charging_sessions FOR SELECT
  USING (auth.uid() IS NOT NULL);

CREATE POLICY "Admins can delete charging sessions"
  ON public.vehicle_charging_sessions FOR DELETE
  USING (has_role(auth.uid(), 'admin'::user_role));

CREATE INDEX IF NOT EXISTS idx_charging_sessions_vehicle
  ON public.vehicle_charging_sessions(vehicle_id, started_at DESC);

CREATE INDEX IF NOT EXISTS idx_charging_sessions_open
  ON public.vehicle_charging_sessions(vehicle_id) WHERE ended_at IS NULL;

CREATE OR REPLACE FUNCTION public.set_vehicle_charging(_vehicle_id uuid, _is_charging boolean)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_status text;
  v_type   text;
BEGIN
  IF auth.uid() IS NULL THEN
    RAISE EXCEPTION 'Not authenticated';
  END IF;

  SELECT status, vehicle_type INTO v_status, v_type
    FROM public.vehicles WHERE id = _vehicle_id;

  IF v_status IS NULL THEN
    RAISE EXCEPTION 'Veículo não encontrado';
  END IF;
  IF v_type <> 'platform' THEN
    RAISE EXCEPTION 'Apenas plataformas podem ser marcadas como carregando';
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

    -- Abre uma sessão nova só se não houver outra aberta
    IF NOT EXISTS (
      SELECT 1 FROM public.vehicle_charging_sessions
      WHERE vehicle_id = _vehicle_id AND ended_at IS NULL
    ) THEN
      INSERT INTO public.vehicle_charging_sessions (vehicle_id, started_by, started_at)
      VALUES (_vehicle_id, auth.uid(), now());
    END IF;
  ELSE
    UPDATE public.vehicles
      SET is_charging = false,
          charging_started_at = NULL,
          charging_started_by = NULL
      WHERE id = _vehicle_id;

    UPDATE public.vehicle_charging_sessions
      SET ended_at = now(),
          ended_by = auth.uid()
      WHERE vehicle_id = _vehicle_id AND ended_at IS NULL;
  END IF;
END;
$$;

GRANT EXECUTE ON FUNCTION public.set_vehicle_charging(uuid, boolean) TO authenticated;
