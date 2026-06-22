
ALTER TABLE public.tool_issues DROP CONSTRAINT tool_issues_reported_by_fkey;
ALTER TABLE public.tool_issues ADD CONSTRAINT tool_issues_reported_by_fkey FOREIGN KEY (reported_by) REFERENCES public.profiles(id) ON DELETE CASCADE;

ALTER TABLE public.tool_issues DROP CONSTRAINT tool_issues_resolved_by_fkey;
ALTER TABLE public.tool_issues ADD CONSTRAINT tool_issues_resolved_by_fkey FOREIGN KEY (resolved_by) REFERENCES public.profiles(id) ON DELETE SET NULL;

ALTER TABLE public.time_entries DROP CONSTRAINT time_entries_user_id_fkey;
ALTER TABLE public.time_entries ADD CONSTRAINT time_entries_user_id_fkey FOREIGN KEY (user_id) REFERENCES public.profiles(id) ON DELETE CASCADE;
