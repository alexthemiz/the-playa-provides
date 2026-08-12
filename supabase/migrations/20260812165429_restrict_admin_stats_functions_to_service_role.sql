-- get_recent_signups/get_recent_signup_count/get_recent_login_count read directly from
-- auth.users via SECURITY DEFINER. Postgres grants EXECUTE to PUBLIC by default on function
-- creation, so anon/authenticated could call these via PostgREST RPC despite them being
-- admin-only stats used exclusively by send-daily-report (which calls via service_role key).
revoke execute on function public.get_recent_signups(timestamptz) from public, anon, authenticated;
revoke execute on function public.get_recent_signup_count(timestamptz) from public, anon, authenticated;
revoke execute on function public.get_recent_login_count(timestamptz) from public, anon, authenticated;

grant execute on function public.get_recent_signups(timestamptz) to service_role;
grant execute on function public.get_recent_signup_count(timestamptz) to service_role;
grant execute on function public.get_recent_login_count(timestamptz) to service_role;
