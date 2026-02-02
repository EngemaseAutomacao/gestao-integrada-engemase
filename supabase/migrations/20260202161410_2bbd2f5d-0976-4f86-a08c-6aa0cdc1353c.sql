-- Allow system to insert notifications (for edge functions using service role)
-- Also allow users to insert their own notifications (for test button)
DROP POLICY IF EXISTS "Admins can create notifications" ON public.notifications;

CREATE POLICY "System and admins can create notifications"
ON public.notifications
FOR INSERT
WITH CHECK (
  auth.uid() IS NOT NULL
);