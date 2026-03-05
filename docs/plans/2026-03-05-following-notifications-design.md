# Following & Notifications — Design Doc

_Date: 2026-03-05_

## Goal

Allow users to follow other users, receive in-app notifications when someone they follow posts a new item, and filter `/find-items` by relationship. Email notifications are opt-in. Friends-only gear visibility is stubbed for future use.

---

## Relationship Model

**Approach A: mutual follows = friends (chosen)**

One `user_follows` table. Following is one-way. "Friends" is derived — if A follows B and B follows A, they are friends. No explicit friend request flow. Simple, low-friction, appropriate for a trust-based community.

Friend request flow and friends-only gear visibility are deferred to a future feature but the schema is designed to support them.

---

## Data Model

### `user_follows`

```sql
create table public.user_follows (
  follower_id uuid not null references public.profiles(id) on delete cascade,
  following_id uuid not null references public.profiles(id) on delete cascade,
  created_at timestamptz not null default now(),
  primary key (follower_id, following_id)
);
```

RLS:
- Authenticated users can insert their own rows (`follower_id = auth.uid()`)
- Authenticated users can delete their own rows
- Anyone (incl. anon) can select — needed to check follow status on profile pages

### `notifications`

```sql
create table public.notifications (
  id uuid primary key default gen_random_uuid(),
  recipient_id uuid not null references public.profiles(id) on delete cascade,
  type text not null check (type in ('new_item')),
  actor_id uuid not null references public.profiles(id) on delete cascade,
  item_id bigint references public.gear_items(id) on delete set null,
  read boolean not null default false,
  created_at timestamptz not null default now()
);
```

RLS:
- Recipient can select their own rows
- Recipient can update their own rows (mark read)
- Insert is handled by a `SECURITY DEFINER` trigger function — bypasses RLS

### `gear_items` — visibility stub

```sql
alter table public.gear_items
  add column visibility text not null default 'public'
  check (visibility in ('public', 'friends', 'private'));
```

No UI built yet. All existing items default to `'public'`. RLS and filtering logic for `'friends'` deferred until the friends-only gear feature is built.

### `profiles` — email opt-in

```sql
alter table public.profiles
  add column notify_new_items_email boolean not null default false;
```

---

## Backend

### Notification trigger

A Postgres function fires `AFTER INSERT ON gear_items`. It:
1. Queries `user_follows` for all `follower_id` where `following_id = NEW.user_id`
2. Bulk-inserts one row per follower into `notifications` (`type = 'new_item'`, `actor_id = NEW.user_id`, `item_id = NEW.id`)
3. For followers with `notify_new_items_email = true`, invokes the `send-follow-notification` edge function

The function runs as `SECURITY DEFINER` to bypass RLS on insert.

```sql
create or replace function public.notify_followers_on_new_item()
returns trigger
language plpgsql
security definer
as $$
begin
  insert into public.notifications (recipient_id, type, actor_id, item_id)
  select f.follower_id, 'new_item', NEW.user_id, NEW.id
  from public.user_follows f
  where f.following_id = NEW.user_id;

  -- Email notifications handled separately by edge function
  -- (called from app layer to avoid blocking the trigger)

  return NEW;
end;
$$;

create trigger on_gear_item_inserted
  after insert on public.gear_items
  for each row execute function public.notify_followers_on_new_item();
```

### `send-follow-notification` edge function

Called from the client after a new item is listed (not from the trigger, to avoid blocking the DB transaction). Sends email to followers who have `notify_new_items_email = true`. Pattern matches existing edge functions (`send-transfer-notification` etc.).

---

## UI

### `/profile/[username]`

- **Follow / Unfollow button** in the profile header area
- Shows current follower count (e.g. "12 followers")
- Button state: `Follow` (not following) → `Following` (following, hover shows `Unfollow`)
- Not shown on own profile

### Header bell icon

- `<Bell>` icon (lucide-react) in nav, right of existing links
- Red badge with unread count when > 0 (hidden when 0)
- Unread count polled every 30 seconds via `useEffect` interval
- Clicking opens a dropdown (max 10 items) listing recent notifications:
  - Format: _"[preferred_name] posted: [item_name]"_ with relative timestamp
  - Each row links to `/find-items` (scrolls to/highlights item — future enhancement)
  - Clicking a notification marks it read
  - "Mark all read" link at bottom of dropdown
- Dropdown closes on outside click

### `/find-items`

- New "Show items from" select in the filter bar (logged-in users only):
  - `Everyone` (default)
  - `People I Follow`
  - `People Who Follow Me`
  - `Both`
- When a relationship filter is selected, query joins `user_follows` to scope `gear_items` results

### `/settings`

- New **Notifications** section
- Single toggle: "Email me when someone I follow posts a new item" (default off)
- Saves to `profiles.notify_new_items_email`

---

## What's Deferred

- **Friends-only gear visibility** — `visibility` column is stubbed; UI + RLS enforcement built when needed
- **Explicit friend request flow** — deferred to future "Camps & Friends" feature
- **Loan/transfer events in notifications** — email only for now; wire into `notifications` table later
- **`/notifications` full page** — dropdown only in v1
- **Realtime bell updates** — polling only in v1; upgrade to Supabase Realtime if latency becomes an issue
