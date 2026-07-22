-- about_camp was collected by the Submit Your Camp form but never displayed
-- anywhere on the resources page — it overlapped with the required, shown
-- `description` (service) field. Dropped along with removing it from the form.
alter table public.playa_resources drop column if exists about_camp;
