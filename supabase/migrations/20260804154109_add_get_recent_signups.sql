CREATE OR REPLACE FUNCTION get_recent_signups(since_time timestamptz)
RETURNS TABLE (username text, full_name text, created_at timestamptz)
LANGUAGE sql
SECURITY DEFINER
SET search_path = ''
AS $$
  SELECT p.username, p.full_name, u.created_at
  FROM auth.users u
  JOIN public.profiles p ON p.id = u.id
  WHERE u.created_at >= since_time
  ORDER BY u.created_at DESC;
$$;
