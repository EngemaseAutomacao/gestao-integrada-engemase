-- Remove the duplicate push notification trigger that sends empty/duplicate notifications
DROP TRIGGER IF EXISTS trigger_send_push_on_notification ON public.notifications;
DROP FUNCTION IF EXISTS public.send_push_on_notification();