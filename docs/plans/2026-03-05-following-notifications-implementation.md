# Following & Notifications Implementation Plan

> **For Claude:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Goal:** Let users follow each other, receive in-app bell notifications when someone they follow lists a new item, filter /find-items by relationship, and opt into email notifications.

**Architecture:** `user_follows` table (composite PK) + `notifications` table; a Postgres SECURITY DEFINER trigger fans out in-app notifications on gear insert; a separate edge function handles opt-in emails (called from the client, not the trigger). Bell in the header polls every 30s. Follow/Unfollow button lives on profile pages.

**Tech Stack:** Supabase (PostgreSQL + Edge Functions), Next.js App Router, React, lucide-react, Resend email API.

---

## Task 1: DB Migration — `user_follows` + `notifications` + schema additions

**Files:**
- Run SQL in Supabase Dashboard → SQL Editor

**Step 1: Run the migration**

Copy and run this SQL in one shot in the Supabase dashboard:

```sql
-- user_follows table
create table public.user_follows (
  follower_id uuid not null references public.profiles(id) on delete cascade,
  following_id uuid not null references public.profiles(id) on delete cascade,
  created_at timestamptz not null default now(),
  primary key (follower_id, following_id)
);

-- notifications table
create table public.notifications (
  id uuid primary key default gen_random_uuid(),
  recipient_id uuid not null references public.profiles(id) on delete cascade,
  type text not null check (type in ('new_item')),
  actor_id uuid not null references public.profiles(id) on delete cascade,
  item_id bigint references public.gear_items(id) on delete set null,
  read boolean not null default false,
  created_at timestamptz not null default now()
);

-- Indexes for fast queries
create index on public.notifications (recipient_id, created_at desc);
create index on public.user_follows (following_id);

-- gear_items visibility stub
alter table public.gear_items
  add column if not exists visibility text not null default 'public'
  check (visibility in ('public', 'friends', 'private'));

-- profiles email opt-in
alter table public.profiles
  add column if not exists notify_new_items_email boolean not null default false;
```

**Step 2: Verify**

In the Supabase Table Editor, check that `user_follows` and `notifications` appear. Check `gear_items` has a `visibility` column. Check `profiles` has `notify_new_items_email`.

---

## Task 2: DB Migration — RLS policies

**Step 1: Run RLS SQL**

```sql
-- Enable RLS
alter table public.user_follows enable row level security;
alter table public.notifications enable row level security;

-- user_follows: anyone can read (needed for follow-status checks on profile pages)
create policy "Anyone can view follows"
  on public.user_follows for select
  using (true);

-- user_follows: users can only insert their own follow
create policy "Users can follow"
  on public.user_follows for insert
  with check (follower_id = auth.uid());

-- user_follows: users can only unfollow themselves
create policy "Users can unfollow"
  on public.user_follows for delete
  using (follower_id = auth.uid());

-- notifications: users can only see their own
create policy "Users see own notifications"
  on public.notifications for select
  using (recipient_id = auth.uid());

-- notifications: users can mark their own as read
create policy "Users can update own notifications"
  on public.notifications for update
  using (recipient_id = auth.uid());

-- notifications: insert only via SECURITY DEFINER trigger (no client insert policy needed)
```

**Step 2: Verify**

No error in the SQL editor. Tables should now have RLS enabled.

---

## Task 3: DB Migration — notification trigger

**Step 1: Run trigger SQL**

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

  return NEW;
end;
$$;

create trigger on_gear_item_inserted
  after insert on public.gear_items
  for each row execute function public.notify_followers_on_new_item();
```

**Step 2: Verify**

No error. You can test it later end-to-end — skip for now, keep moving.

---

## Task 4: Edge Function — `send-follow-notification`

**Files:**
- Create: `supabase/functions/send-follow-notification/index.ts`
- Deploy via Supabase Dashboard → Edge Functions (CLI not installed)

**Step 1: Write the function**

Create the file with this content:

```typescript
// deno-lint-ignore-file no-unused-vars
import { serve } from "https://deno.land/std@0.168.0/http/server.ts"
import { createClient } from "https://esm.sh/@supabase/supabase-js@2"

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

serve(async (req: Request) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders })
  }

  try {
    const { item_id, poster_id } = await req.json()

    const RESEND_API_KEY = Deno.env.get('RESEND_API_KEY')
    const SUPABASE_URL = Deno.env.get('SUPABASE_URL')!
    const SUPABASE_SERVICE_ROLE_KEY = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!
    const admin = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY)

    // Fetch the item and poster
    const { data: item, error: itemErr } = await admin
      .from('gear_items')
      .select('item_name, user_id, profiles!gear_items_user_id_fkey(username, preferred_name)')
      .eq('id', item_id)
      .single()

    if (itemErr || !item) throw new Error('Item not found')

    const poster = (item as any).profiles
    const posterName = poster?.preferred_name || poster?.username || 'Someone'
    const itemName = item.item_name || 'a new item'

    // Fetch followers who have email opt-in enabled
    const { data: followers, error: followErr } = await admin
      .from('user_follows')
      .select('follower_id, profiles!user_follows_follower_id_fkey(contact_email, notify_new_items_email)')
      .eq('following_id', poster_id)

    if (followErr) throw new Error('Could not fetch followers')

    const emailPromises = (followers || [])
      .filter((f: any) => f.profiles?.notify_new_items_email)
      .map(async (f: any) => {
        let email = f.profiles?.contact_email
        if (!email) {
          const { data: { user } } = await admin.auth.admin.getUserById(f.follower_id)
          email = user?.email
        }
        if (!email) return

        return fetch('https://api.resend.com/emails', {
          method: 'POST',
          headers: {
            'Authorization': `Bearer ${RESEND_API_KEY}`,
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            from: 'The Playa Provides <hello@theplayaprovides.com>',
            to: [email],
            subject: `${posterName} just listed: ${itemName}`,
            html: `
              <div style="font-family: sans-serif; color: #333; max-width: 600px;">
                <h1 style="color: #C08261;">New Item From Someone You Follow</h1>
                <p><strong>${posterName}</strong> just listed <strong>${itemName}</strong> on The Playa Provides.</p>
                <p><a href="https://theplayaprovides.com/find-items" style="color: #C08261;">Browse items →</a></p>
                <p style="font-size: 0.8em; color: #999; margin-top: 24px;">
                  You're receiving this because you follow ${posterName} and have email notifications enabled.<br/>
                  <a href="https://theplayaprovides.com/settings" style="color: #C08261;">Update your notification settings</a>
                </p>
              </div>
            `,
          }),
        })
      })

    await Promise.allSettled(emailPromises)

    return new Response(JSON.stringify({ ok: true }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      status: 200,
    })

  } catch (err: unknown) {
    const error = err as Error
    return new Response(JSON.stringify({ error: error.message }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      status: 400,
    })
  }
})
```

**Step 2: Deploy via Supabase Dashboard**

1. Go to Supabase Dashboard → Edge Functions → "Create a new function"
2. Name it `send-follow-notification`
3. Paste the file contents
4. Toggle **Verify JWT: OFF** (same as the other notification functions)
5. Click Deploy

**Step 3: Verify**

Function appears in the Edge Functions list with status "Active".

---

## Task 5: Update `app/list-item` — invoke edge function after listing

**Files:**
- Modify: `app/list-item/page.tsx`

**Step 1: Find where the item is inserted**

Search for `.from('gear_items').insert(` in `app/list-item/page.tsx`. After the insert succeeds and you have the new item's `id`, add the edge function call.

**Step 2: Add the invocation**

After the insert returns the new item (look for where it navigates away or resets the form), add:

```typescript
// Notify followers (fire-and-forget — don't await, don't block the UX)
if (insertedItem?.id) {
  supabase.functions.invoke('send-follow-notification', {
    body: { item_id: insertedItem.id, poster_id: session.user.id },
  })
}
```

You'll need to read the exact insert code first to know the variable names. The insert result will look something like `const { data: insertedItem, error } = await supabase.from('gear_items').insert({...}).select().single()`.

**Step 3: Verify**

List a new item. No error on submit. Edge function invoked (check Supabase Dashboard → Edge Functions → Logs).

---

## Task 6: Follow/Unfollow button on `/profile/[username]`

**Files:**
- Modify: `app/profile/[username]/page.tsx`

**Step 1: Add state + fetch logic**

In `PublicProfilePage`, add these state variables near the top of the component:

```typescript
const [currentUserId, setCurrentUserId] = useState<string | null>(null)
const [isFollowing, setIsFollowing] = useState(false)
const [followerCount, setFollowerCount] = useState(0)
const [followLoading, setFollowLoading] = useState(false)
```

In `fetchProfileAndGear`, after setting `isOwner`, save `currentUserId` to state and fetch follow status + count:

```typescript
setCurrentUserId(currentUserId)

// Fetch follower count
const { count } = await supabase
  .from('user_follows')
  .select('*', { count: 'exact', head: true })
  .eq('following_id', profileData.id)
setFollowerCount(count ?? 0)

// Check if current user follows this profile
if (currentUserId && currentUserId !== profileData.id) {
  const { data: followRow } = await supabase
    .from('user_follows')
    .select('follower_id')
    .eq('follower_id', currentUserId)
    .eq('following_id', profileData.id)
    .maybeSingle()
  setIsFollowing(!!followRow)
}
```

**Step 2: Add follow/unfollow handler**

```typescript
const handleFollowToggle = async () => {
  if (!currentUserId || !profile) return
  setFollowLoading(true)
  try {
    if (isFollowing) {
      await supabase
        .from('user_follows')
        .delete()
        .eq('follower_id', currentUserId)
        .eq('following_id', profile.id)
      setIsFollowing(false)
      setFollowerCount(c => c - 1)
    } else {
      await supabase
        .from('user_follows')
        .insert({ follower_id: currentUserId, following_id: profile.id })
      setIsFollowing(true)
      setFollowerCount(c => c + 1)
    }
  } catch (err) {
    console.error('Follow toggle error:', err)
  } finally {
    setFollowLoading(false)
  }
}
```

**Step 3: Add the button to the NAV ROW**

The nav row is in the JSX at line ~90. It currently shows the Edit Profile button on the right for owners. Add the Follow button for non-owners:

```tsx
{/* NAV ROW */}
<div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
  <Link href="/find-items" style={{ color: '#888', textDecoration: 'none' }}>← Find Items</Link>
  <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
    {followerCount > 0 && (
      <span style={{ fontSize: '0.85rem', color: '#888' }}>
        {followerCount} {followerCount === 1 ? 'follower' : 'followers'}
      </span>
    )}
    {isOwner ? (
      <button
        onClick={() => isEditing ? handleSave() : setIsEditing(true)}
        style={{
          padding: '8px 20px',
          backgroundColor: isEditing ? '#4CAF50' : '#00ccff',
          color: isEditing ? '#fff' : '#000',
          border: 'none', borderRadius: '6px', cursor: 'pointer', fontWeight: 'bold',
        }}
      >
        {isEditing ? 'Save Profile' : 'Edit Profile'}
      </button>
    ) : currentUserId ? (
      <button
        onClick={handleFollowToggle}
        disabled={followLoading}
        style={{
          padding: '8px 20px',
          backgroundColor: isFollowing ? '#f0f0f0' : '#00ccff',
          color: isFollowing ? '#666' : '#000',
          border: isFollowing ? '1px solid #ddd' : 'none',
          borderRadius: '6px', cursor: followLoading ? 'default' : 'pointer',
          fontWeight: 'bold', opacity: followLoading ? 0.6 : 1,
        }}
      >
        {followLoading ? '...' : isFollowing ? 'Following' : 'Follow'}
      </button>
    ) : null}
  </div>
</div>
```

**Step 4: Verify**

- Visit someone else's profile → "Follow" button appears
- Click → button changes to "Following", follower count increments
- Click again → unfollows, count decrements
- Own profile → no Follow button, Edit Profile shows as before
- Not logged in → no Follow button

---

## Task 7: Bell icon + notifications dropdown in Header

**Files:**
- Modify: `components/header.tsx`

**Step 1: Add imports**

Add `Bell` to the lucide-react import at the top of header.tsx:

```typescript
import { Bell } from 'lucide-react'
```

**Step 2: Add state + polling**

After the existing `useState` declarations, add:

```typescript
const [unreadCount, setUnreadCount] = useState(0)
const [notifications, setNotifications] = useState<any[]>([])
const [bellOpen, setBellOpen] = useState(false)
```

After `getUserData()` is defined (or inside it), add a `fetchUnread` function. Then set up a poll interval. Add this inside the `useEffect`:

```typescript
const fetchUnread = async () => {
  const { data: { session } } = await supabase.auth.getSession()
  if (!session) return
  const { count } = await supabase
    .from('notifications')
    .select('*', { count: 'exact', head: true })
    .eq('recipient_id', session.user.id)
    .eq('read', false)
  setUnreadCount(count ?? 0)
}

fetchUnread()
const pollInterval = setInterval(fetchUnread, 30000)
// Add to cleanup:  clearInterval(pollInterval)
```

Update the cleanup `return` to also clear the interval:

```typescript
return () => {
  subscription.unsubscribe()
  clearInterval(pollInterval)
}
```

**Step 3: Add fetchNotifications (for when bell is clicked)**

```typescript
const fetchNotifications = async () => {
  const { data: { session } } = await supabase.auth.getSession()
  if (!session) return
  const { data } = await supabase
    .from('notifications')
    .select(`
      id, type, read, created_at,
      actor:profiles!notifications_actor_id_fkey(username, preferred_name),
      item:gear_items!notifications_item_id_fkey(item_name)
    `)
    .eq('recipient_id', session.user.id)
    .order('created_at', { ascending: false })
    .limit(10)
  setNotifications(data || [])
}
```

**Step 4: Add markAllRead handler**

```typescript
const handleMarkAllRead = async () => {
  const { data: { session } } = await supabase.auth.getSession()
  if (!session) return
  await supabase
    .from('notifications')
    .update({ read: true })
    .eq('recipient_id', session.user.id)
    .eq('read', false)
  setUnreadCount(0)
  setNotifications(prev => prev.map(n => ({ ...n, read: true })))
}

const handleNotificationClick = async (notificationId: string) => {
  await supabase.from('notifications').update({ read: true }).eq('id', notificationId)
  setNotifications(prev => prev.map(n => n.id === notificationId ? { ...n, read: true } : n))
  setUnreadCount(prev => Math.max(0, prev - 1))
  setBellOpen(false)
}
```

**Step 5: Add bell JSX**

In the `<nav>` element, between the Settings link and the Logout button (both inside the `{user ? (...)  }` block), add:

```tsx
{/* BELL */}
<div style={{ position: 'relative' as const }}>
  <button
    onClick={() => {
      setBellOpen(prev => !prev)
      if (!bellOpen) fetchNotifications()
    }}
    style={{ background: 'none', border: 'none', cursor: 'pointer', position: 'relative' as const, padding: '4px', display: 'flex', alignItems: 'center' }}
  >
    <Bell size={20} color="#2D241E" />
    {unreadCount > 0 && (
      <span style={{
        position: 'absolute' as const, top: '-4px', right: '-4px',
        backgroundColor: '#dc2626', color: '#fff', borderRadius: '50%',
        width: '16px', height: '16px', fontSize: '10px', fontWeight: 'bold',
        display: 'flex', alignItems: 'center', justifyContent: 'center',
      }}>
        {unreadCount > 9 ? '9+' : unreadCount}
      </span>
    )}
  </button>

  {bellOpen && (
    <>
      {/* Backdrop to close on outside click */}
      <div
        onClick={() => setBellOpen(false)}
        style={{ position: 'fixed' as const, inset: 0, zIndex: 49 }}
      />
      <div style={{
        position: 'absolute' as const, right: 0, top: '36px',
        backgroundColor: '#fff', border: '1px solid #eee', borderRadius: '12px',
        boxShadow: '0 8px 32px rgba(0,0,0,0.12)', width: '320px', zIndex: 50,
        maxHeight: '400px', overflowY: 'auto' as const,
      }}>
        <div style={{ padding: '12px 16px', borderBottom: '1px solid #f0f0f0', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <span style={{ fontWeight: 700, color: '#2D241E', fontSize: '0.9rem' }}>Notifications</span>
          {unreadCount > 0 && (
            <button onClick={handleMarkAllRead} style={{ background: 'none', border: 'none', color: '#00aacc', cursor: 'pointer', fontSize: '0.8rem', fontWeight: 600 }}>
              Mark all read
            </button>
          )}
        </div>
        {notifications.length === 0 ? (
          <div style={{ padding: '24px 16px', color: '#aaa', fontSize: '0.85rem', textAlign: 'center' as const }}>
            No notifications yet
          </div>
        ) : (
          notifications.map(n => {
            const actorName = n.actor?.preferred_name || n.actor?.username || 'Someone'
            const itemName = n.item?.item_name || 'an item'
            const timeAgo = formatTimeAgo(n.created_at)
            return (
              <a
                key={n.id}
                href="/find-items"
                onClick={() => handleNotificationClick(n.id)}
                style={{
                  display: 'block', padding: '12px 16px', borderBottom: '1px solid #f5f5f5',
                  backgroundColor: n.read ? '#fff' : '#f0fdf4',
                  textDecoration: 'none', color: '#2D241E',
                }}
              >
                <div style={{ fontSize: '0.85rem', lineHeight: 1.4 }}>
                  <strong>{actorName}</strong> posted: {itemName}
                </div>
                <div style={{ fontSize: '0.75rem', color: '#aaa', marginTop: '3px' }}>{timeAgo}</div>
              </a>
            )
          })
        )}
      </div>
    </>
  )}
</div>
```

**Step 6: Add `formatTimeAgo` helper**

Add this outside the component (bottom of the file):

```typescript
function formatTimeAgo(dateStr: string): string {
  const diff = Date.now() - new Date(dateStr).getTime()
  const mins = Math.floor(diff / 60000)
  if (mins < 1) return 'just now'
  if (mins < 60) return `${mins}m ago`
  const hours = Math.floor(mins / 60)
  if (hours < 24) return `${hours}h ago`
  return `${Math.floor(hours / 24)}d ago`
}
```

**Step 7: Verify**

- Bell icon appears in nav for logged-in users
- Red badge shows unread count when > 0
- Clicking bell opens dropdown
- Outside click closes dropdown
- "Mark all read" clears badges
- Logged-out users: no bell visible

---

## Task 8: "Show items from" filter on `/find-items`

**Files:**
- Modify: `app/find-items/page.tsx`

**Step 1: Add state**

```typescript
const [userId, setUserId] = useState<string | null>(null)
const [relationshipFilter, setRelationshipFilter] = useState<'everyone' | 'following' | 'followers' | 'both'>('everyone')
const [followingIds, setFollowingIds] = useState<string[]>([])
const [followerIds, setFollowerIds] = useState<string[]>([])
```

**Step 2: Fetch user + relationships in useEffect**

Add a fetch alongside `fetchItems()`:

```typescript
useEffect(() => {
  fetchItems()
  fetchRelationships()
}, [])

async function fetchRelationships() {
  const { data: { session } } = await supabase.auth.getSession()
  if (!session) return
  setUserId(session.user.id)

  const [followingRes, followersRes] = await Promise.all([
    supabase.from('user_follows').select('following_id').eq('follower_id', session.user.id),
    supabase.from('user_follows').select('follower_id').eq('following_id', session.user.id),
  ])

  setFollowingIds((followingRes.data || []).map((r: any) => r.following_id))
  setFollowerIds((followersRes.data || []).map((r: any) => r.follower_id))
}
```

**Step 3: Add relationship filter to `filteredItems`**

In the existing `filteredItems` filter chain, add one more condition:

```typescript
const matchesRelationship = (() => {
  if (!userId || relationshipFilter === 'everyone') return true
  if (relationshipFilter === 'following') return followingIds.includes(item.user_id)
  if (relationshipFilter === 'followers') return followerIds.includes(item.user_id)
  if (relationshipFilter === 'both') return followingIds.includes(item.user_id) || followerIds.includes(item.user_id)
  return true
})()
return isAvailable && matchesSearch && matchesZip && matchesCategory && matchesAvailability && matchesRelationship
```

**Step 4: Add dropdown to topBarStyle row**

In the JSX filter bar (the `<div style={topBarStyle}>` block), add the dropdown after the Availability filter and before the view toggle. Only render it when logged in (`userId` is set):

```tsx
{userId && (
  <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
    <span style={filterLabelStyle}>Show items from:</span>
    <select
      value={relationshipFilter}
      onChange={e => setRelationshipFilter(e.target.value as any)}
      style={{ padding: '8px 10px', border: '1px solid #eee', borderRadius: '8px', backgroundColor: '#f9f9f9', fontSize: '0.82rem', color: '#111', cursor: 'pointer' }}
    >
      <option value="everyone">Everyone</option>
      <option value="following">People I Follow</option>
      <option value="followers">People Who Follow Me</option>
      <option value="both">Both</option>
    </select>
  </div>
)}
```

**Step 5: Verify**

- Not logged in: no dropdown
- Logged in: dropdown visible
- Selecting "People I Follow" filters to items from followed users (or empty if you follow nobody)
- "Everyone" shows all items

---

## Task 9: Email opt-in toggle on `/settings`

**Files:**
- Modify: `app/settings/page.tsx`

**Step 1: The `profile` state already loads all columns**

The settings page fetches `profiles.select('*')` so `notify_new_items_email` will already be in `profile` state after the migration.

**Step 2: Add the Notifications section**

Find the closing `</div>` before the Save button (around line 174). Add a new section before it:

```tsx
{/* NOTIFICATIONS */}
<section style={sectionStyle}>
  <h3 style={sectionHeaderStyle}>Notifications</h3>
  <label style={{ display: 'flex', alignItems: 'flex-start', gap: '10px', cursor: 'pointer' }}>
    <input
      type="checkbox"
      checked={profile.notify_new_items_email || false}
      onChange={e => setProfile({ ...profile, notify_new_items_email: e.target.checked })}
      style={{ marginTop: '2px', accentColor: '#00ccff', cursor: 'pointer', width: '16px', height: '16px' }}
    />
    <div>
      <div style={{ fontSize: '0.9rem', fontWeight: 600, color: '#111' }}>
        Email me when someone I follow posts a new item
      </div>
      <div style={{ fontSize: '0.8rem', color: '#888', marginTop: '3px', lineHeight: 1.4 }}>
        Off by default. You can always check the bell icon in the header for in-app notifications.
      </div>
    </div>
  </label>
</section>
```

The existing `handleSave` already calls `supabase.from('profiles').upsert({ id: user.id, ...profile, ... })` so `notify_new_items_email` will be saved automatically.

**Step 3: Verify**

- Settings page loads → Notifications section visible
- Toggle on → Save → reload → still on
- Toggle off → Save → reload → still off

---

## Task 10: Wire `send-follow-notification` into `/list-item`

**Files:**
- Modify: `app/list-item/page.tsx` (read first to find the exact insert code)

**Step 1: Read the file**

Open `app/list-item/page.tsx` and find the `gear_items` insert — look for `.from('gear_items').insert(`. Note the variable that holds the inserted row.

**Step 2: Add the edge function call**

After a successful insert (where you have the new item's id and the session user's id), add:

```typescript
// Fire-and-forget: notify followers who have email opt-in
supabase.functions.invoke('send-follow-notification', {
  body: { item_id: newItem.id, poster_id: session.user.id },
})
```

This is a fire-and-forget — don't await it, don't block the user's flow.

**Step 3: Verify**

List a new item. Edge function logs in Supabase Dashboard should show the invocation (even if no followers yet).

---

## Task 11: End-to-end smoke test

**Do this manually with two test accounts.**

1. **Login as User A.** Go to User B's profile → click Follow.
2. **Login as User B.** List a new item.
3. **Login as User A.** Bell icon should show unread badge. Click it — notification should say "User B posted: [item name]".
4. Click the notification → it marks as read, badge decrements.
5. "Mark all read" should clear all badges.
6. Enable email opt-in in User A's Settings. User B lists another item. User A should receive an email.
7. Go to /find-items → select "People I Follow" → only User B's items should appear.

---

## Task 12: Commit + push + update TASKS.md

**Step 1: Stage and commit**

```bash
git add app/profile/[username]/page.tsx components/header.tsx app/find-items/page.tsx app/settings/page.tsx app/list-item/page.tsx supabase/functions/send-follow-notification/index.ts
git commit -m "feat: following, in-app notifications, and email opt-in

- user_follows + notifications tables with RLS
- Postgres trigger fans out in-app notifications on gear insert
- Follow/Unfollow button on profile pages with follower count
- Bell icon in header with 30s polling and dropdown
- send-follow-notification edge function for opt-in emails
- /find-items filter: show items from people I follow / followers / both
- /settings: email notification opt-in toggle

Co-Authored-By: Claude Sonnet 4.6 <noreply@anthropic.com>"
```

**Step 2: Push**

```bash
git push origin master
```

**Step 3: Update TASKS.md**

Move "Following & Notifications" from "Features (Designed, Ready to Build)" to "✅ Done". Update "🏗️ In Progress" if needed.
