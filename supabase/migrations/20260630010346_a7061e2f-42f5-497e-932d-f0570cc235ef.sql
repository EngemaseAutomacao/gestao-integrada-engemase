
-- Remove notification types: issue_reported, issue_resolved, account_approved, user_pending
DROP TRIGGER IF EXISTS trigger_notify_new_user ON public.profiles;
DROP TRIGGER IF EXISTS trigger_notify_user_approved ON public.profiles;
DROP FUNCTION IF EXISTS public.notify_new_user() CASCADE;
DROP FUNCTION IF EXISTS public.notify_user_approved() CASCADE;
DROP FUNCTION IF EXISTS public.notify_issue_resolved() CASCADE;
DROP FUNCTION IF EXISTS public.notify_issue_reported() CASCADE;

DELETE FROM public.notifications
WHERE type IN ('issue_reported','issue_resolved','account_approved','user_pending');
