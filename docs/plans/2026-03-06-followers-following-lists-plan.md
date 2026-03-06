# Followers / Following Lists Implementation Plan

> **For Claude:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Goal:** Add owner-only expandable followers/following lists to the profile page, with avatar, name, follow toggle, and gear counts per person.

**Architecture:** All changes live in a single file (`app/profile/[username]/page.tsx`). New state variables track open list, loaded entries, and loading state. Data is fetched lazily on first expand and cached in state. No new pages, components, or DB migrations needed.

**Tech Stack:** Next.js App Router client component, Supabase browser client (`@supabase/ssr`), inline React CSS with `as const`, lucide-react icons.

---

### Task 1: Add new state and fetch `followingCount` alongside `followerCount`

**Files:**
- Modify: `app/profile/[username]/page.tsx`

**Context:** The existing `fetchProfileAndGear` already fetches `followerCount`. We need to also fetch how many people the profile owner is following, plus add the state for the list UI.

**Step 1: Add new state variables** after the existing `followError` state (around line 23):

```tsx
const [followingCount, setFollowingCount] = useState(0)
const [openList, setOpenList] = useState<'followers' | 'following' | null>(null)
const [followersList, setFollowersList] = useState<any[]>([])
const [followingList, setFollowingList] = useState<any[]>([])
const [listLoading, setListLoading] = useState(false)
```

**Step 2: Add `followingCount` query** inside `fetchProfileAndGear`, right after the `followerCount` query (after line 53):

```tsx
// Fetch following count
const { count: followingCnt } = await supabase
  .from('user_follows')
  .select('*', { count: 'exact', head: true })
  .eq('follower_id', profileData.id);
setFollowingCount(followingCnt ?? 0);
```

**Step 3: Verify** — push and open your profile. Open browser console and confirm no errors. The page should load and display exactly as before (no visible change yet).

**Step 4: Commit**

```bash
git add app/profile/[username]/page.tsx
git commit -m "feat: add followingCount state and fetch to profile page"
```

---

### Task 2: Update the nav row — clickable counts for owner, static for visitors

**Files:**
- Modify: `app/profile/[username]/page.tsx`

**Context:** The current nav row shows `{followerCount > 0 && <span>X followers</span>}`. We need to:
- For the **owner**: show "X followers · Y following" as two clickable spans (always, even if 0)
- For **non-owners**: keep existing behaviour (static span, only if followerCount > 0)

**Step 1: Replace** the follower count block in the nav row (the `{followerCount > 0 && (...)}` span, around lines 148–152) with:

```tsx
{isOwner ? (
  <div style={{ display: 'flex', alignItems: 'center', gap: '6px', fontSize: '0.85rem' }}>
    <button
      onClick={() => setOpenList(openList === 'followers' ? null : 'followers')}
      style={{
        background: 'none', border: 'none', cursor: 'pointer', padding: 0,
        color: openList === 'followers' ? '#00aacc' : '#888',
        fontWeight: openList === 'followers' ? 600 : 400,
        fontSize: '0.85rem',
      }}
    >
      {followerCount} {followerCount === 1 ? 'follower' : 'followers'}
    </button>
    <span style={{ color: '#ccc' }}>·</span>
    <button
      onClick={() => setOpenList(openList === 'following' ? null : 'following')}
      style={{
        background: 'none', border: 'none', cursor: 'pointer', padding: 0,
        color: openList === 'following' ? '#00aacc' : '#888',
        fontWeight: openList === 'following' ? 600 : 400,
        fontSize: '0.85rem',
      }}
    >
      {followingCount} following
    </button>
  </div>
) : (
  followerCount > 0 && (
    <span style={{ fontSize: '0.85rem', color: '#888' }}>
      {followerCount} {followerCount === 1 ? 'follower' : 'followers'}
    </span>
  )
)}
```

**Step 2: Verify** — push and view your profile. You should see "X followers · Y following" with both as clickable buttons. Clicking them doesn't do anything visible yet (no list renders), but the `openList` state should be toggling in React DevTools.

**Step 3: Commit**

```bash
git add app/profile/[username]/page.tsx
git commit -m "feat: add clickable followers/following count buttons for profile owner"
```

---

### Task 3: Build the `fetchList` function

**Files:**
- Modify: `app/profile/[username]/page.tsx`

**Context:** When the owner clicks a count, we lazy-load the list for that tab. If it's already been loaded (list state is non-empty), we skip the fetch. The function needs to: (1) fetch profiles from `user_follows`, (2) batch-fetch gear counts, (3) for the followers list, batch-check which ones the owner follows back.

**Step 1: Add `fetchList` function** after `handleFollowToggle` (around line 111):

```tsx
const fetchList = async (type: 'followers' | 'following') => {
  // Skip if already loaded
  if (type === 'followers' && followersList.length > 0) return;
  if (type === 'following' && followingList.length > 0) return;

  setListLoading(true);
  try {
    // 1. Fetch the list of profiles
    let userIds: string[] = [];
    let profiles: any[] = [];

    if (type === 'followers') {
      const { data } = await supabase
        .from('user_follows')
        .select('follower:profiles!follower_id(id, username, preferred_name, avatar_url)')
        .eq('following_id', profile.id);
      profiles = (data || []).map((r: any) => r.follower).filter(Boolean);
    } else {
      const { data } = await supabase
        .from('user_follows')
        .select('following:profiles!following_id(id, username, preferred_name, avatar_url)')
        .eq('follower_id', profile.id);
      profiles = (data || []).map((r: any) => r.following).filter(Boolean);
    }

    userIds = profiles.map((p: any) => p.id);

    if (userIds.length === 0) {
      if (type === 'followers') setFollowersList([]);
      else setFollowingList([]);
      return;
    }

    // 2. Batch-fetch gear counts
    const { data: gearRows } = await supabase
      .from('gear_items')
      .select('user_id, availability_status')
      .in('user_id', userIds)
      .in('availability_status', ['Available to Borrow', 'Available to Keep']);

    const borrowCounts: Record<string, number> = {};
    const keepCounts: Record<string, number> = {};
    for (const row of gearRows || []) {
      if (row.availability_status === 'Available to Borrow') {
        borrowCounts[row.user_id] = (borrowCounts[row.user_id] || 0) + 1;
      } else {
        keepCounts[row.user_id] = (keepCounts[row.user_id] || 0) + 1;
      }
    }

    // 3. For followers list: check which ones the owner follows back
    let followingSet = new Set<string>();
    if (type === 'followers' && currentUserId) {
      const { data: followRows } = await supabase
        .from('user_follows')
        .select('following_id')
        .eq('follower_id', currentUserId)
        .in('following_id', userIds);
      followingSet = new Set((followRows || []).map((r: any) => r.following_id));
    } else if (type === 'following') {
      // Owner follows all of them by definition
      followingSet = new Set(userIds);
    }

    const entries = profiles.map((p: any) => ({
      id: p.id,
      username: p.username,
      preferred_name: p.preferred_name,
      avatar_url: p.avatar_url,
      borrowCount: borrowCounts[p.id] || 0,
      keepCount: keepCounts[p.id] || 0,
      isFollowing: followingSet.has(p.id),
    }));

    if (type === 'followers') setFollowersList(entries);
    else setFollowingList(entries);

  } catch (err) {
    console.error('fetchList error:', err);
  } finally {
    setListLoading(false);
  }
};
```

**Step 2: Wire `fetchList` into the toggle buttons.** Update the two `onClick` handlers from Task 2:

```tsx
// followers button onClick:
onClick={() => {
  const next = openList === 'followers' ? null : 'followers';
  setOpenList(next);
  if (next === 'followers') fetchList('followers');
}}

// following button onClick:
onClick={() => {
  const next = openList === 'following' ? null : 'following';
  setOpenList(next);
  if (next === 'following') fetchList('following');
}}
```

**Step 3: Verify** — push and click "X followers" on your profile. Open the browser console and confirm no errors. The list data should be fetched (check Network tab for the Supabase requests). Nothing renders yet.

**Step 4: Commit**

```bash
git add app/profile/[username]/page.tsx
git commit -m "feat: add fetchList lazy loader for followers/following"
```

---

### Task 4: Render the expandable list

**Files:**
- Modify: `app/profile/[username]/page.tsx`

**Context:** The list renders inline below the nav row block (the closing `</div>` after `{followError && ...}`), and above the `<h1>` page headline. Each row: 40px avatar circle | name + @username (link) | follow button | borrow count | keep count.

**Step 1: Add the list JSX** after the nav row's closing `</div>` (around line 188), before the `<h1>`:

```tsx
{/* FOLLOWERS / FOLLOWING EXPANDABLE LIST */}
{isOwner && openList && (
  <div style={{ marginTop: '12px', border: '1px solid #e5e5e5', borderRadius: '10px', overflow: 'hidden' }}>
    {/* List header */}
    <div style={{
      display: 'grid',
      gridTemplateColumns: '40px 1fr 110px 90px 80px',
      gap: '12px', alignItems: 'center',
      padding: '8px 16px',
      fontSize: '10px', fontWeight: 700, color: '#aaa',
      textTransform: 'uppercase' as const, letterSpacing: '0.06em',
      borderBottom: '1px solid #f0f0f0',
    }}>
      <div />
      <div>{openList === 'followers' ? 'Follower' : 'Following'}</div>
      <div />
      <div>To Borrow</div>
      <div>To Keep</div>
    </div>

    {listLoading ? (
      <div style={{ padding: '20px 16px', color: '#aaa', fontSize: '0.875rem' }}>Loading...</div>
    ) : (openList === 'followers' ? followersList : followingList).length === 0 ? (
      <div style={{ padding: '20px 16px', color: '#aaa', fontSize: '0.875rem', fontStyle: 'italic' as const }}>
        {openList === 'followers' ? 'No followers yet.' : 'Not following anyone yet.'}
      </div>
    ) : (
      (openList === 'followers' ? followersList : followingList).map((entry) => (
        <div key={entry.id} style={{
          display: 'grid',
          gridTemplateColumns: '40px 1fr 110px 90px 80px',
          gap: '12px', alignItems: 'center',
          padding: '10px 16px',
          borderBottom: '1px solid #f9f9f9',
        }}>
          {/* Avatar */}
          <div style={{
            width: '40px', height: '40px', borderRadius: '50%',
            backgroundColor: '#f0f0f0',
            backgroundImage: entry.avatar_url ? `url(${entry.avatar_url})` : 'none',
            backgroundSize: 'cover', backgroundPosition: 'center',
            border: '2px solid #e5e5e5', flexShrink: 0,
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            fontSize: '1rem', color: '#C08261', fontWeight: 'bold',
          }}>
            {!entry.avatar_url && (entry.preferred_name?.charAt(0) || entry.username?.charAt(0) || '?')}
          </div>

          {/* Name + username */}
          <a href={`/profile/${entry.username}`} style={{ textDecoration: 'none', color: 'inherit' }}>
            <div style={{ fontWeight: 600, fontSize: '14px', color: '#2D241E' }}>
              {entry.preferred_name || entry.username}
            </div>
            <div style={{ fontSize: '12px', color: '#aaa' }}>@{entry.username}</div>
          </a>

          {/* Follow button — rendered by ListFollowButton handler below */}
          <button
            onClick={() => handleListFollowToggle(entry.id, openList)}
            style={{
              padding: '5px 14px',
              backgroundColor: entry.isFollowing ? '#f0f0f0' : '#00ccff',
              color: entry.isFollowing ? '#666' : '#000',
              border: entry.isFollowing ? '1px solid #ddd' : 'none',
              borderRadius: '6px', cursor: 'pointer',
              fontWeight: 600, fontSize: '12px',
            }}
          >
            {entry.isFollowing ? 'Following' : 'Follow'}
          </button>

          {/* Gear counts */}
          <div style={{ fontSize: '13px', color: '#444', textAlign: 'center' as const }}>
            {entry.borrowCount > 0 ? entry.borrowCount : <span style={{ color: '#ccc' }}>—</span>}
          </div>
          <div style={{ fontSize: '13px', color: '#444', textAlign: 'center' as const }}>
            {entry.keepCount > 0 ? entry.keepCount : <span style={{ color: '#ccc' }}>—</span>}
          </div>
        </div>
      ))
    )}
  </div>
)}
```

**Step 2: Verify** — push and click "X followers" or "Y following" on your profile. The list should expand and show the entries. The follow button won't work yet (we haven't added `handleListFollowToggle`).

**Step 3: Commit**

```bash
git add app/profile/[username]/page.tsx
git commit -m "feat: render expandable followers/following list on profile page"
```

---

### Task 5: Add `handleListFollowToggle` for follow/unfollow within the list

**Files:**
- Modify: `app/profile/[username]/page.tsx`

**Context:** Clicking Follow/Following in the list does an insert/delete on `user_follows` and updates the local list state optimistically. Same pattern as `handleFollowToggle` on the main profile, but mutates the list array instead of the top-level `isFollowing` state.

**Step 1: Add `handleListFollowToggle`** after `fetchList`:

```tsx
const handleListFollowToggle = async (targetId: string, listType: 'followers' | 'following') => {
  if (!currentUserId) return;

  const list = listType === 'followers' ? followersList : followingList;
  const setList = listType === 'followers' ? setFollowersList : setFollowingList;
  const entry = list.find(e => e.id === targetId);
  if (!entry) return;

  try {
    if (entry.isFollowing) {
      const { error } = await supabase
        .from('user_follows')
        .delete()
        .eq('follower_id', currentUserId)
        .eq('following_id', targetId);
      if (error) throw new Error(error.message);
      // Update followerCount on the profile page if we unfollowed someone in following list
      setList(prev => prev.map(e => e.id === targetId ? { ...e, isFollowing: false } : e));
    } else {
      const { error } = await supabase
        .from('user_follows')
        .insert({ follower_id: currentUserId, following_id: targetId });
      if (error) throw new Error(error.message);
      setList(prev => prev.map(e => e.id === targetId ? { ...e, isFollowing: true } : e));
    }
  } catch (err) {
    console.error('List follow toggle error:', err);
  }
};
```

**Step 2: Verify** — push and test follow/unfollow buttons in the list. Clicking "Follow" should change to "Following" and vice versa. Confirm the DB row is created/deleted by checking the Supabase dashboard → Table Editor → `user_follows`.

**Step 3: Commit**

```bash
git add app/profile/[username]/page.tsx
git commit -m "feat: follow/unfollow toggle within followers/following list"
```

---

### Task 6: Final check and push

**Step 1: Full flow check**
- View your profile → see "X followers · Y following" clickable
- Click "followers" → list expands, shows avatars, names, gear counts, follow buttons
- Click "followers" again → collapses
- Click "following" → different list opens
- Follow/unfollow someone in the list → button state updates immediately
- Visit another user's profile → counts are static, not clickable, no list

**Step 2: Update TASKS.md** — move "Followers/Following lists" to ✅ Done

**Step 3: Push everything**

```bash
git push
```
