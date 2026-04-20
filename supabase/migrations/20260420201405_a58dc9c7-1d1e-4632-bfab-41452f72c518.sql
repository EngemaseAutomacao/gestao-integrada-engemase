CREATE OR REPLACE FUNCTION public.get_last_cron_run(_jobname text)
RETURNS timestamptz
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public, cron
AS $$
  SELECT d.end_time
  FROM cron.job j
  JOIN cron.job_run_details d ON d.jobid = j.jobid
  WHERE j.jobname = _jobname
    AND d.status = 'succeeded'
    AND public.has_role(auth.uid(), 'admin'::user_role)
  ORDER BY d.end_time DESC
  LIMIT 1;
$$;

GRANT EXECUTE ON FUNCTION public.get_last_cron_run(text) TO authenticated;