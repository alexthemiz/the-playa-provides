-- Mirrors the UPDATE policy added alongside the camp edit panel's edit
-- capability. Anyone can submit a resource linked to any camp (the
-- intended public-submission flow), so a bad-faith or mistaken listing can
-- end up attached to a camp its real owner never approved -- this is the
-- owner's only way to remove it. Scoped identically to the UPDATE policy:
-- only the linked camp's current page owner may delete.
create policy "Camp owners can delete their camp's resources"
on public.playa_resources
for delete
using (
  camp_id in (select id from public.camps where page_owner_id = auth.uid())
);
