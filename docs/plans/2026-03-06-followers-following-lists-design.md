# Design: Followers / Following Expandable Lists on Profile Page

**Date:** 2026-03-06
**Status:** Approved

---

## Summary

Add owner-only expandable lists for followers and following directly on the `/profile/[username]` page. Clicking "X followers" or "Y following" in the nav row toggles an inline list below. Each row shows avatar, name, a follow/unfollow toggle, and counts of items available to borrow and keep.

---

## UI / Interaction

### Nav Row

Replace the current static follower count text with two clickable spans (owner only):

```
← Find Items               3 followers · 12 following    [Edit Profile]
```

- Both counts are always shown to the owner (even if 0)
- Non-owners continue to see the static count as today (shown only if > 0, not clickable)
- Clicking "followers" or "following" toggles the corresponding list open/closed
- Clicking the active one again collapses it (only one list open at a time)

### Expandable List

Renders inline below the nav row, above the page headline. Columns:

| Column | Detail |
|--------|--------|
| Avatar | 40px circle; fallback to first initial of preferred_name |
| Name / @username | preferred_name in bold, @username in grey below; whole row links to `/profile/[username]` |
| Follow button | "Follow" (cyan) or "Following" (grey outline); toggles on click |
| To Borrow | Count of their gear_items with `availability_status = 'Available to Borrow'` |
| To Keep | Count of their gear_items with `availability_status = 'Available to Keep'` |

Loading state: "Loading..." text while fetching. Empty state: "No followers yet." / "Not following anyone yet."

---

## Data Fetching

Lazy — only fetches when the list is first opened (cached after that).

### Followers list

```sql
SELECT profiles.id, profiles.username, profiles.preferred_name, profiles.avatar_url
FROM user_follows
JOIN profiles ON profiles.id = user_follows.follower_id
WHERE user_follows.following_id = <profile.id>
```

Then:
- Batch-fetch gear counts: `gear_items.select('user_id, availability_status').in('user_id', followerIds)`
- Batch-check which followers the owner already follows back: `user_follows.select('following_id').eq('follower_id', currentUserId).in('following_id', followerIds)`

### Following list

```sql
SELECT profiles.id, profiles.username, profiles.preferred_name, profiles.avatar_url
FROM user_follows
JOIN profiles ON profiles.id = user_follows.following_id
WHERE user_follows.follower_id = <profile.id>
```

Then:
- Batch-fetch gear counts same as above
- All entries start as `isFollowing: true` (by definition, the owner follows them all)

---

## State

New state added to `PublicProfilePage`:

```typescript
const [openList, setOpenList] = useState<'followers' | 'following' | null>(null)
const [followersList, setFollowersList] = useState<ListEntry[]>([])
const [followingList, setFollowingList] = useState<ListEntry[]>([])
const [listLoading, setListLoading] = useState(false)
const [followingCount, setFollowingCount] = useState(0)

type ListEntry = {
  id: string
  username: string
  preferred_name: string | null
  avatar_url: string | null
  borrowCount: number
  keepCount: number
  isFollowing: boolean
}
```

`followingCount` fetched alongside `followerCount` in the existing `fetchProfileAndGear` call.

---

## Follow Toggle in List

Same pattern as `handleFollowToggle` on the profile page — direct insert/delete on `user_follows`, destructure `{ error }`, throw on error, update list entry state optimistically after DB success.

---

## Privacy

- The expand buttons (and the `following` count) are only rendered when `isOwner === true`
- No new RLS changes needed — existing `user_follows` SELECT policy already allows `auth.uid() = follower_id OR auth.uid() = following_id`

---

## Files Changed

- `app/profile/[username]/page.tsx` — all changes in this one file; no new components or pages needed
