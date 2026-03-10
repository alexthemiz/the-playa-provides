# Design: Wishlist Tag Input

**Date:** 2026-03-09
**Status:** Approved

## Goal

Replace the plain-text wishlist textarea on the profile page with an always-live tag input. Owner adds/removes tags without entering Edit Profile mode. Visitors see tags read-only. Tags stored as JSON array in Supabase.

## Data Layer

Migrate `wish_list` column from `text` to `jsonb`:

```sql
ALTER TABLE profiles
  ALTER COLUMN wish_list TYPE jsonb
  USING CASE
    WHEN wish_list IS NULL OR wish_list = '' THEN '[]'::jsonb
    ELSE jsonb_build_array(wish_list)
  END;
```

Existing plain-text values become a single-element array. Default is `'[]'`.

## Component

Inline in `app/profile/[username]/page.tsx` — no separate component file.

**New state:**
- `wishTags: string[]` — initialized from `profile.wish_list` on fetch
- `tagInput: string` — controlled input for new tag entry

**Owner view:** tag chips with X button + text input + "Add" button. Enter key triggers add. Empty and duplicate tags silently ignored.

**Visitor view:** tag chips only — no X buttons, no input field.

**Save pattern:** on add or remove, immediately call:
```ts
supabase.from('profiles').update({ wish_list: updatedTags }).eq('id', profile.id)
```
Fire-and-forget with silent error catch. No spinner needed.

`wish_list` removed from the existing `handleSave` batch update — managed independently.

## Styling

**Chip:** `backgroundColor: '#00ccff'`, `color: '#000'`, `borderRadius: '20px'`, `padding: '4px 12px'`, `fontSize: '13px'`, `fontWeight: 600`, `display: 'flex'`, `alignItems: 'center'`, `gap: '6px'`

**X button:** transparent background, no border, `cursor: 'pointer'`, `color: '#005566'`

**Input + Add button:** input matches existing `editInputStyle`; Add button is small, cyan, same border-radius as chips.

## What Doesn't Change

- Edit Profile mode (`isEditing`) — unchanged; wishlist operates independently
- All other profile fields (bio, name, years, camp) — still batched via `handleSave`
- Follower/following list, gear display — untouched
