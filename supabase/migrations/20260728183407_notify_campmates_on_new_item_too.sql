create or replace function public.notify_followers_on_new_item()
returns trigger
language plpgsql
security definer
set search_path to 'public'
as $function$
begin
  if NEW.availability_status = 'Not Available' then
    return NEW;
  end if;

  -- Recipients are followers (if visibility allows followers to see it)
  -- unioned with campmates (if visibility allows campmates to see it) --
  -- mirrors gear_items' own visibility RLS policy exactly. union (not
  -- union all) dedupes anyone who is both a follower and a campmate, so
  -- each person gets exactly one notification regardless of overlap.
  insert into public.notifications (recipient_id, type, actor_id, item_id)
  select recipient_id, 'new_item', NEW.user_id, NEW.id
  from (
    select f.follower_id as recipient_id
    from public.user_follows f
    where f.following_id = NEW.user_id
      and f.follower_id <> NEW.user_id
      and NEW.visibility in ('public', 'followers', 'followers_and_campmates')

    union

    select uca_viewer.user_id as recipient_id
    from public.user_camp_affiliations uca_viewer
    join public.user_camp_affiliations uca_owner on uca_viewer.camp_id = uca_owner.camp_id
    where uca_owner.user_id = NEW.user_id
      and uca_viewer.camp_id is not null
      and uca_viewer.user_id <> NEW.user_id
      and NEW.visibility in ('public', 'campmates', 'followers_and_campmates')
  ) recipients;

  return NEW;
end;
$function$;
