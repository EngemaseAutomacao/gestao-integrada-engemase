DROP TRIGGER IF EXISTS trg_notify_new_issue ON public.tool_issues;
DROP TRIGGER IF EXISTS trg_notify_new_vehicle_issue ON public.vehicle_issues;
DROP TRIGGER IF EXISTS trg_log_issue_events ON public.tool_issues;
DROP TRIGGER IF EXISTS trg_log_vehicle_issue_events ON public.vehicle_issues;
DROP FUNCTION IF EXISTS public.notify_new_issue() CASCADE;
DROP FUNCTION IF EXISTS public.notify_issue_resolved() CASCADE;
DROP FUNCTION IF EXISTS public.log_issue_events() CASCADE;

DROP TABLE IF EXISTS public.tool_issues CASCADE;
DROP TABLE IF EXISTS public.vehicle_issues CASCADE;
DROP TABLE IF EXISTS public.time_entries CASCADE;

ALTER TABLE public.tools DROP COLUMN IF EXISTS image_url;