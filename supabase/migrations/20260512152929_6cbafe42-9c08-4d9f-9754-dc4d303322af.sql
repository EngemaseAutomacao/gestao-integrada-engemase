ALTER TABLE public.vehicle_checkouts 
ADD COLUMN km_checkin_automatic BOOLEAN DEFAULT false;

COMMENT ON COLUMN public.vehicle_checkouts.km_checkin_automatic IS 'Indica se o KM de chegada foi lido automaticamente pela IA.';