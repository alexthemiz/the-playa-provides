create or replace function public.notify_followers_on_new_item()
returns trigger
language plpgsql
security definer
set search_path to 'public'
as $function$
begin
  -- Skip items the poster kept private, or that followers wouldn't be
  -- able to see anyway (campmates-only visibility). Previously this
  -- fired unconditionally on every insert, notifying followers about
  -- items they had no access to view.
  if NEW.availability_status = 'Not Available' then
    return NEW;
  end if;

  if NEW.visibility not in ('public', 'followers', 'followers_and_campmates') then
    return NEW;
  end if;

  insert into public.notifications (recipient_id, type, actor_id, item_id)
  select f.follower_id, 'new_item', NEW.user_id, NEW.id
  from public.user_follows f
  where f.following_id = NEW.user_id;

  return NEW;
end;
$function$;
