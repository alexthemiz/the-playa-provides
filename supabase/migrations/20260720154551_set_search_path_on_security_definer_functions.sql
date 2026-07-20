alter function public.notify_followers_on_new_item() set search_path = public;
alter function public.notify_on_new_follower() set search_path = public;
alter function public.notify_on_camp_join() set search_path = public;
alter function public.handle_camp_claim_approved() set search_path = public;
alter function public.handle_camp_claim_denied() set search_path = public;
alter function public.confirm_transfer_receipt(p_transfer_id uuid) set search_path = public;
alter function public.handle_new_user() set search_path = public;
