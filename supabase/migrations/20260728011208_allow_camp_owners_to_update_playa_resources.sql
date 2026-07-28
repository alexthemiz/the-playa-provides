-- Task 8 (camps-visibility): the camp edit panel's new "On-Playa Resources"
-- section lets a claimed camp's page owner edit their own already-submitted
-- resource listing (via SubmitCampModal's existingResource prop, which does
-- an UPDATE rather than an INSERT). playa_resources previously had only an
-- INSERT policy ("Anyone can submit a resource") and a SELECT policy
-- ("Anyone can view resources") -- no UPDATE policy existed at all, so any
-- update() call (from any role) silently affected 0 rows with no error,
-- per the standard RLS-silent-failure gotcha.
--
-- Scoped narrowly per CLAUDE.md's additive-policy guidance: only the
-- CURRENT page owner of the camp a resource is linked to (camps.page_owner_id
-- = auth.uid()) may update that resource. A resource with no camp_id
-- (submitted by a non-account-holder, not linked to any camp) has no owner
-- and remains uneditable by anyone other than a future admin/review flow --
-- consistent with it never having been claimable in the first place.
create policy "Camp owners can update their camp's resources"
on public.playa_resources
for update
using (
  camp_id in (select id from public.camps where page_owner_id = auth.uid())
)
with check (
  camp_id in (select id from public.camps where page_owner_id = auth.uid())
);
