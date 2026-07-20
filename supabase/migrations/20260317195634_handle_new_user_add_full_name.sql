CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  INSERT INTO public.profiles (id, username, preferred_name, full_name, email)
  VALUES (
    new.id,
    lower(new.raw_user_meta_data->>'username'),
    new.raw_user_meta_data->>'preferred_name',
    new.raw_user_meta_data->>'full_name',
    COALESCE(new.raw_user_meta_data->>'email', new.email)
  );
  RETURN new;
END;
$$;
