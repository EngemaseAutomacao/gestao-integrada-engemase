
CREATE TABLE public.data_retention_settings (
  id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  setting_key text NOT NULL UNIQUE,
  label text NOT NULL,
  description text,
  retention_days integer NOT NULL DEFAULT 90,
  enabled boolean NOT NULL DEFAULT false,
  updated_by uuid,
  created_at timestamp with time zone NOT NULL DEFAULT now(),
  updated_at timestamp with time zone NOT NULL DEFAULT now()
);

ALTER TABLE public.data_retention_settings ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Admins can view retention settings"
ON public.data_retention_settings FOR SELECT TO authenticated
USING (has_role(auth.uid(), 'admin'::user_role));

CREATE POLICY "Admins can insert retention settings"
ON public.data_retention_settings FOR INSERT TO authenticated
WITH CHECK (has_role(auth.uid(), 'admin'::user_role));

CREATE POLICY "Admins can update retention settings"
ON public.data_retention_settings FOR UPDATE TO authenticated
USING (has_role(auth.uid(), 'admin'::user_role));

CREATE POLICY "Admins can delete retention settings"
ON public.data_retention_settings FOR DELETE TO authenticated
USING (has_role(auth.uid(), 'admin'::user_role));

CREATE TRIGGER update_data_retention_settings_updated_at
BEFORE UPDATE ON public.data_retention_settings
FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- Seed default settings
INSERT INTO public.data_retention_settings (setting_key, label, description, retention_days, enabled) VALUES
  ('tool_checkout_photos', 'Fotos de Ferramentas', 'Fotos de retirada e devolução de ferramentas', 180, false),
  ('vehicle_checkout_photos', 'Fotos de Veículos', 'Fotos de retirada e devolução de veículos (5 ângulos)', 180, false),
  ('tool_checkout_history', 'Histórico de Ferramentas', 'Registros de retirada/devolução de ferramentas já devolvidas', 365, false),
  ('vehicle_checkout_history', 'Histórico de Veículos', 'Registros de retirada/devolução de veículos já devolvidos', 365, false),
  ('notifications', 'Notificações', 'Notificações lidas pelos usuários', 30, true),
  ('system_logs', 'Logs do Sistema', 'Registros de auditoria e logs de ações', 365, false),
  ('transfer_history', 'Histórico de Transferências', 'Transferências concluídas ou canceladas', 365, false);
