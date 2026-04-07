
-- Create transfer status enum
CREATE TYPE public.transfer_status AS ENUM ('pending', 'accepted', 'approved', 'rejected', 'cancelled');

-- Create asset transfers table
CREATE TABLE public.asset_transfers (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  asset_type TEXT NOT NULL CHECK (asset_type IN ('tool', 'vehicle')),
  tool_checkout_id UUID REFERENCES public.tool_checkouts(id),
  vehicle_checkout_id UUID REFERENCES public.vehicle_checkouts(id),
  from_user_id UUID NOT NULL REFERENCES public.profiles(id),
  to_user_id UUID NOT NULL REFERENCES public.profiles(id),
  status public.transfer_status NOT NULL DEFAULT 'pending',
  notes TEXT,
  accepted_at TIMESTAMPTZ,
  approved_at TIMESTAMPTZ,
  approved_by UUID REFERENCES public.profiles(id),
  rejected_at TIMESTAMPTZ,
  rejected_by UUID REFERENCES public.profiles(id),
  rejection_reason TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.asset_transfers ENABLE ROW LEVEL SECURITY;

-- RLS Policies
CREATE POLICY "Users can view own transfers" ON public.asset_transfers
  FOR SELECT TO authenticated
  USING (from_user_id = auth.uid() OR to_user_id = auth.uid());

CREATE POLICY "Admins can view all transfers" ON public.asset_transfers
  FOR SELECT TO authenticated
  USING (has_role(auth.uid(), 'admin'::user_role));

CREATE POLICY "Users can create transfers for own assets" ON public.asset_transfers
  FOR INSERT TO authenticated
  WITH CHECK (from_user_id = auth.uid());

CREATE POLICY "Recipients can update pending transfers" ON public.asset_transfers
  FOR UPDATE TO authenticated
  USING (to_user_id = auth.uid() AND status = 'pending');

CREATE POLICY "Admins can update accepted transfers" ON public.asset_transfers
  FOR UPDATE TO authenticated
  USING (has_role(auth.uid(), 'admin'::user_role));

CREATE POLICY "Initiator can cancel pending transfers" ON public.asset_transfers
  FOR UPDATE TO authenticated
  USING (from_user_id = auth.uid() AND status = 'pending');

-- Enable realtime
ALTER PUBLICATION supabase_realtime ADD TABLE public.asset_transfers;

-- Trigger for updated_at
CREATE TRIGGER update_asset_transfers_updated_at
  BEFORE UPDATE ON public.asset_transfers
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- Notification trigger for transfers
CREATE OR REPLACE FUNCTION public.notify_asset_transfer()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
DECLARE
  from_name TEXT;
  to_name TEXT;
  asset_name TEXT;
  admin_rec RECORD;
BEGIN
  SELECT full_name INTO from_name FROM public.profiles WHERE id = NEW.from_user_id;
  SELECT full_name INTO to_name FROM public.profiles WHERE id = NEW.to_user_id;

  -- Get asset name
  IF NEW.asset_type = 'tool' THEN
    SELECT t.name INTO asset_name FROM public.tools t
    JOIN public.tool_checkouts tc ON tc.tool_id = t.id
    WHERE tc.id = NEW.tool_checkout_id;
  ELSE
    SELECT v.name || ' (' || v.plate || ')' INTO asset_name FROM public.vehicles v
    JOIN public.vehicle_checkouts vc ON vc.vehicle_id = v.id
    WHERE vc.id = NEW.vehicle_checkout_id;
  END IF;

  IF TG_OP = 'INSERT' THEN
    -- Notify recipient
    INSERT INTO public.notifications (user_id, type, title, message)
    VALUES (
      NEW.to_user_id,
      'transfer_request',
      'Solicitação de Transferência',
      COALESCE(from_name, 'Usuário') || ' quer transferir "' || COALESCE(asset_name, 'item') || '" para você.'
    );
  ELSIF TG_OP = 'UPDATE' THEN
    IF OLD.status = 'pending' AND NEW.status = 'accepted' THEN
      -- Notify admins for approval
      FOR admin_rec IN SELECT id FROM public.profiles WHERE role = 'admin' LOOP
        INSERT INTO public.notifications (user_id, type, title, message)
        VALUES (
          admin_rec.id,
          'transfer_accepted',
          'Transferência Aceita - Aguardando Aprovação',
          COALESCE(to_name, 'Usuário') || ' aceitou a transferência de "' || COALESCE(asset_name, 'item') || '" de ' || COALESCE(from_name, 'usuário') || '. Aguardando aprovação.'
        );
      END LOOP;
      -- Notify initiator
      INSERT INTO public.notifications (user_id, type, title, message)
      VALUES (
        NEW.from_user_id,
        'transfer_accepted',
        'Transferência Aceita',
        COALESCE(to_name, 'Usuário') || ' aceitou a transferência de "' || COALESCE(asset_name, 'item') || '". Aguardando aprovação do administrador.'
      );
    ELSIF OLD.status = 'accepted' AND NEW.status = 'approved' THEN
      -- Notify both users
      INSERT INTO public.notifications (user_id, type, title, message)
      VALUES (
        NEW.from_user_id,
        'transfer_approved',
        'Transferência Aprovada',
        'A transferência de "' || COALESCE(asset_name, 'item') || '" para ' || COALESCE(to_name, 'usuário') || ' foi aprovada.'
      );
      INSERT INTO public.notifications (user_id, type, title, message)
      VALUES (
        NEW.to_user_id,
        'transfer_approved',
        'Transferência Aprovada',
        'A transferência de "' || COALESCE(asset_name, 'item') || '" de ' || COALESCE(from_name, 'usuário') || ' foi aprovada. O item agora está sob sua responsabilidade.'
      );
    ELSIF NEW.status = 'rejected' THEN
      -- Notify both users
      INSERT INTO public.notifications (user_id, type, title, message)
      VALUES (
        NEW.from_user_id,
        'transfer_rejected',
        'Transferência Rejeitada',
        'A transferência de "' || COALESCE(asset_name, 'item') || '" foi rejeitada.' || CASE WHEN NEW.rejection_reason IS NOT NULL THEN ' Motivo: ' || NEW.rejection_reason ELSE '' END
      );
      INSERT INTO public.notifications (user_id, type, title, message)
      VALUES (
        NEW.to_user_id,
        'transfer_rejected',
        'Transferência Rejeitada',
        'A transferência de "' || COALESCE(asset_name, 'item') || '" foi rejeitada.' || CASE WHEN NEW.rejection_reason IS NOT NULL THEN ' Motivo: ' || NEW.rejection_reason ELSE '' END
      );
    END IF;
  END IF;
  RETURN NEW;
END;
$$;

CREATE TRIGGER on_asset_transfer_change
  AFTER INSERT OR UPDATE ON public.asset_transfers
  FOR EACH ROW EXECUTE FUNCTION notify_asset_transfer();

-- Function to execute the transfer (update checkout records)
CREATE OR REPLACE FUNCTION public.execute_asset_transfer(transfer_id UUID)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
DECLARE
  t RECORD;
BEGIN
  SELECT * INTO t FROM public.asset_transfers WHERE id = transfer_id AND status = 'approved';
  IF NOT FOUND THEN
    RAISE EXCEPTION 'Transfer not found or not approved';
  END IF;

  IF t.asset_type = 'tool' THEN
    -- Close original checkout
    UPDATE public.tool_checkouts
    SET status = 'checked_in', checkin_date = now(), checked_in_by = t.from_user_id,
        notes = COALESCE(notes, '') || ' [Transferido para outro usuário]'
    WHERE id = t.tool_checkout_id;

    -- Create new checkout for recipient
    INSERT INTO public.tool_checkouts (tool_id, user_id, checked_out_by, construction_site, status, notes)
    SELECT tc.tool_id, t.to_user_id, t.to_user_id, tc.construction_site, 'checked_out',
           'Recebido via transferência de ' || (SELECT full_name FROM public.profiles WHERE id = t.from_user_id)
    FROM public.tool_checkouts tc WHERE tc.id = t.tool_checkout_id;

  ELSIF t.asset_type = 'vehicle' THEN
    -- Close original checkout
    UPDATE public.vehicle_checkouts
    SET status = 'checked_in', checkin_date = now(), checked_in_by = t.from_user_id,
        notes = COALESCE(notes, '') || ' [Transferido para outro usuário]'
    WHERE id = t.vehicle_checkout_id;

    -- Create new checkout for recipient
    INSERT INTO public.vehicle_checkouts (vehicle_id, user_id, checked_out_by, destination, destination_address, km_checkout, status, notes,
      photo_front_checkout, photo_back_checkout, photo_left_checkout, photo_right_checkout, photo_dashboard_checkout)
    SELECT vc.vehicle_id, t.to_user_id, t.to_user_id, vc.destination, vc.destination_address, 
           COALESCE(vc.km_checkin, vc.km_checkout), 'checked_out',
           'Recebido via transferência de ' || (SELECT full_name FROM public.profiles WHERE id = t.from_user_id),
           vc.photo_front_checkout, vc.photo_back_checkout, vc.photo_left_checkout, vc.photo_right_checkout, vc.photo_dashboard_checkout
    FROM public.vehicle_checkouts vc WHERE vc.id = t.vehicle_checkout_id;
  END IF;

  -- Log the transfer
  INSERT INTO public.system_logs (action, entity_type, entity_id, user_id, user_name, details)
  VALUES (
    'transfer',
    t.asset_type,
    COALESCE(t.tool_checkout_id, t.vehicle_checkout_id),
    t.approved_by,
    (SELECT full_name FROM public.profiles WHERE id = t.approved_by),
    jsonb_build_object(
      'from_user', (SELECT full_name FROM public.profiles WHERE id = t.from_user_id),
      'to_user', (SELECT full_name FROM public.profiles WHERE id = t.to_user_id),
      'transfer_id', t.id
    )
  );
END;
$$;
