-- Create notifications table
CREATE TABLE public.notifications (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  type TEXT NOT NULL CHECK (type IN ('overdue', 'low_stock', 'return_reminder')),
  title TEXT NOT NULL,
  message TEXT NOT NULL,
  read BOOLEAN NOT NULL DEFAULT false,
  tool_id UUID REFERENCES public.tools(id) ON DELETE CASCADE,
  checkout_id UUID REFERENCES public.tool_checkouts(id) ON DELETE CASCADE,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.notifications ENABLE ROW LEVEL SECURITY;

-- RLS Policies
CREATE POLICY "Users can view own notifications"
ON public.notifications
FOR SELECT
USING (auth.uid() = user_id);

CREATE POLICY "Users can update own notifications"
ON public.notifications
FOR UPDATE
USING (auth.uid() = user_id);

CREATE POLICY "Admins can create notifications"
ON public.notifications
FOR INSERT
WITH CHECK (
  EXISTS (
    SELECT 1 FROM public.profiles
    WHERE id = auth.uid() AND role = 'admin'
  )
);

-- Create index for performance
CREATE INDEX idx_notifications_user_id ON public.notifications(user_id);
CREATE INDEX idx_notifications_created_at ON public.notifications(created_at DESC);

-- Function to check for overdue tools
CREATE OR REPLACE FUNCTION public.check_overdue_tools()
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  overdue_record RECORD;
BEGIN
  FOR overdue_record IN
    SELECT 
      tc.id,
      tc.user_id,
      tc.tool_id,
      tc.estimated_return_date,
      t.name as tool_name
    FROM public.tool_checkouts tc
    JOIN public.tools t ON t.id = tc.tool_id
    WHERE tc.status = 'checked_out'
      AND tc.estimated_return_date IS NOT NULL
      AND tc.estimated_return_date < NOW()
      AND NOT EXISTS (
        SELECT 1 FROM public.notifications n
        WHERE n.checkout_id = tc.id
          AND n.type = 'overdue'
          AND n.created_at > NOW() - INTERVAL '24 hours'
      )
  LOOP
    INSERT INTO public.notifications (user_id, type, title, message, tool_id, checkout_id)
    VALUES (
      overdue_record.user_id,
      'overdue',
      'Ferramenta Atrasada',
      'A ferramenta "' || overdue_record.tool_name || '" está atrasada. Por favor, devolva o quanto antes.',
      overdue_record.tool_id,
      overdue_record.id
    );
  END LOOP;
END;
$$;

-- Function to check for low stock
CREATE OR REPLACE FUNCTION public.check_low_stock()
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  low_stock_record RECORD;
  admin_record RECORD;
BEGIN
  FOR low_stock_record IN
    SELECT 
      t.id,
      t.name,
      t.quantity_available,
      t.quantity_total
    FROM public.tools t
    WHERE t.quantity_available <= 2
      AND t.quantity_available < (t.quantity_total * 0.3)
      AND NOT EXISTS (
        SELECT 1 FROM public.notifications n
        WHERE n.tool_id = t.id
          AND n.type = 'low_stock'
          AND n.created_at > NOW() - INTERVAL '7 days'
      )
  LOOP
    -- Notify all admins
    FOR admin_record IN
      SELECT id FROM public.profiles WHERE role = 'admin'
    LOOP
      INSERT INTO public.notifications (user_id, type, title, message, tool_id)
      VALUES (
        admin_record.id,
        'low_stock',
        'Estoque Baixo',
        'A ferramenta "' || low_stock_record.name || '" está com estoque baixo (' || 
        low_stock_record.quantity_available || '/' || low_stock_record.quantity_total || ').',
        low_stock_record.id
      );
    END LOOP;
  END LOOP;
END;
$$;

-- Function to check for return reminders (3 days before)
CREATE OR REPLACE FUNCTION public.check_return_reminders()
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  reminder_record RECORD;
BEGIN
  FOR reminder_record IN
    SELECT 
      tc.id,
      tc.user_id,
      tc.tool_id,
      tc.estimated_return_date,
      t.name as tool_name
    FROM public.tool_checkouts tc
    JOIN public.tools t ON t.id = tc.tool_id
    WHERE tc.status = 'checked_out'
      AND tc.estimated_return_date IS NOT NULL
      AND tc.estimated_return_date BETWEEN NOW() AND NOW() + INTERVAL '3 days'
      AND NOT EXISTS (
        SELECT 1 FROM public.notifications n
        WHERE n.checkout_id = tc.id
          AND n.type = 'return_reminder'
          AND n.created_at > NOW() - INTERVAL '24 hours'
      )
  LOOP
    INSERT INTO public.notifications (user_id, type, title, message, tool_id, checkout_id)
    VALUES (
      reminder_record.user_id,
      'return_reminder',
      'Lembrete de Devolução',
      'Lembre-se: a ferramenta "' || reminder_record.tool_name || 
      '" deve ser devolvida em breve (' || 
      TO_CHAR(reminder_record.estimated_return_date, 'DD/MM/YYYY') || ').',
      reminder_record.tool_id,
      reminder_record.id
    );
  END LOOP;
END;
$$;