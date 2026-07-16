REVOKE EXECUTE ON FUNCTION public.enforce_profile_immutable_fields() FROM PUBLIC;
REVOKE EXECUTE ON FUNCTION public.enforce_profile_immutable_fields() FROM anon;
REVOKE EXECUTE ON FUNCTION public.enforce_profile_immutable_fields() FROM authenticated;
GRANT EXECUTE ON FUNCTION public.enforce_profile_immutable_fields() TO service_role;