update public.profiles set welcome_email_sent_at = now() where welcome_email_sent_at is null;
