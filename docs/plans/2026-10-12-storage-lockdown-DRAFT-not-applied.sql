-- DRAFT — NOT APPLIED. Prepared during the 2026-10-12 post-hiatus audit; the apply
-- was declined at the time, pending Alex's explicit go-ahead. Once approved: apply it
-- via apply_migration, then move it into supabase/migrations/ under the version
-- Supabase reports (per CLAUDE.md protocol #8) and delete this draft.
--
-- WHAT IT FIXES (audit finding): storage.objects policies let ANY signed-in user
--   * overwrite any other user's gear photo (UPDATE policy on gear-photos), and
--   * overwrite/replace ANY camp's banner (UPDATE + INSERT on camp-banners),
-- and none of the three buckets had a file-size or file-type limit.
--
-- VERIFIED AGAINST THE CODE BEFORE WRITING:
--   * gear photos upload to unique random paths (`items/<random>.<ext>`), never with
--     upsert -> the gear-photos UPDATE policy is unused by the app.
--   * camp banners upload to `<camp uuid>/banner.<ext>` WITH upsert (INSERT + UPDATE
--     needed) and only the camp's page owner can reach the edit UI (same rule as the
--     camps_owner_update row policy) -> keep both, scope to page_owner_id.
--   * avatars have no UPDATE policy already; only limits are added.
--   * No DELETE policies exist on any bucket, so the app's `remove()` calls are silent
--     no-ops today (orphaned files accumulate). Deliberately NOT changed here; separate decision.

-- 1. gear-photos: drop the policy that allowed any signed-in user to overwrite photos.
drop policy if exists "Allow Uploads for Auth Users 1k8ue0v_2" on storage.objects;

-- 2. camp-banners: replace the any-user insert/update policies with page-owner-only ones.
drop policy if exists "Allow authenticated updates w7ayd7_0" on storage.objects;
drop policy if exists "Allow authenticated uploads w7ayd7_0" on storage.objects;

create policy "camp owners can upload banners" on storage.objects
  for insert to authenticated
  with check (
    bucket_id = 'camp-banners'
    and exists (
      select 1 from public.camps c
      where c.id::text = (storage.foldername(name))[1]
        and c.page_owner_id = (select auth.uid())
    )
  );

create policy "camp owners can replace banners" on storage.objects
  for update to authenticated
  using (
    bucket_id = 'camp-banners'
    and exists (
      select 1 from public.camps c
      where c.id::text = (storage.foldername(name))[1]
        and c.page_owner_id = (select auth.uid())
    )
  )
  with check (
    bucket_id = 'camp-banners'
    and exists (
      select 1 from public.camps c
      where c.id::text = (storage.foldername(name))[1]
        and c.page_owner_id = (select auth.uid())
    )
  );

-- 3. Upload limits. Images only (octet-stream tolerated: some browsers report HEIC/odd
--    JPEGs that way, and it is served as a download, never rendered as a page).
--    Largest existing files: gear 4.7 MB, banner 3.1 MB, avatar 3.6 MB.
update storage.buckets set
  file_size_limit = 15728640,
  allowed_mime_types = array['image/jpeg','image/png','image/webp','image/gif','image/avif','image/heic','image/heif','application/octet-stream']
where id = 'gear-photos';

update storage.buckets set
  file_size_limit = 10485760,
  allowed_mime_types = array['image/jpeg','image/png','image/webp','image/gif','image/avif','image/heic','image/heif','application/octet-stream']
where id = 'camp-banners';

update storage.buckets set
  file_size_limit = 8388608,
  allowed_mime_types = array['image/jpeg','image/png','image/webp','image/gif','image/avif','image/heic','image/heif','application/octet-stream']
where id = 'avatars';
