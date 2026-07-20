drop policy if exists "Users can insert wish_list_match notifications" on public.notifications;

create policy "Users can insert notifications as themselves"
  on public.notifications
  for insert
  to authenticated
  with check (actor_id = auth.uid());
