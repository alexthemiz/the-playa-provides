SELECT cron.schedule(
  'tpp-daily-report',
  '0 13 * * *',
  $$
  SELECT net.http_post(
    url := 'https://bklycpitofjrjhizttny.supabase.co/functions/v1/send-daily-report',
    headers := jsonb_build_object(
      'Content-Type', 'application/json',
      'Authorization', 'Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImJrbHljcGl0b2ZqcmpoaXp0dG55Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzEwMDE5ODIsImV4cCI6MjA4NjU3Nzk4Mn0.9574T11Yfl63OQ8FzIlRIeb3p97niwMqfwDHSA9iZo0'
    ),
    body := '{}'::jsonb
  );
  $$
);
