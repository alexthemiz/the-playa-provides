CREATE OR REPLACE FUNCTION get_recent_signup_count(since_time timestamptz)
RETURNS integer
LANGUAGE sql
SECURITY DEFINER
SET search_path = ''
AS $$
  SELECT COUNT(*)::integer
  FROM auth.users
  WHERE created_at >= since_time;
$$;
