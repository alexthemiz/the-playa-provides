# Wishlist Tag Input — Implementation Plan

> **For Claude:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Goal:** Replace the plaintext wishlist textarea on the profile page with an always-live tag input — owner adds/removes tags immediately, visitors see tags read-only.

**Architecture:** Two tasks: (1) migrate the `wish_list` Supabase column from `text` to `jsonb`, (2) update `app/profile/[username]/page.tsx` with new state, save functions, and JSX. No new files created.

**Tech Stack:** Next.js App Router, React 19, Supabase `@supabase/ssr`, inline React CSS with `as const`.

---

## Context You Need

### Current wishlist location in `app/profile/[username]/page.tsx`

**State (line 14):** `profile` is a generic `any` object — `profile.wish_list` currently holds plain text.

**handleSave (lines 241–253):** Batch-saves bio, wish_list, preferred_name, etc. After this feature, `wish_list` is removed from this batch — it saves independently.

**Wishlist JSX (lines 500–514):** Inside a 2-column grid next to Bio. Currently a textarea in edit mode, a `<p>` in view mode. This entire block gets replaced.

**Style constants (lines 607–612):** `subheadStyle`, `editTextareaStyle` already defined — reuse them for the input.

### After migration, Supabase returns `wish_list` as a JS array
The Supabase JS client automatically deserializes `jsonb` columns into JS objects/arrays. So after migration, `profile.wish_list` will be `string[] | null` instead of `string | null`.

---

## Task 1: Migrate `wish_list` column to `jsonb`

**Files:**
- No code files — this is a Supabase SQL migration

**Step 1: Run this SQL in Supabase Dashboard → SQL Editor**

```sql
ALTER TABLE profiles
  ALTER COLUMN wish_list TYPE jsonb
  USING CASE
    WHEN wish_list IS NULL OR wish_list = '' THEN '[]'::jsonb
    ELSE jsonb_build_array(wish_list)
  END;
```

This converts:
- `NULL` → `[]`
- `''` → `[]`
- `'some text'` → `["some text"]` (preserves existing data as a single-element array)

**Step 2: Verify**

In the SQL Editor, run:
```sql
SELECT id, wish_list, pg_typeof(wish_list) FROM profiles LIMIT 5;
```
Expected: `pg_typeof` column shows `jsonb`. `wish_list` values show `[]` or `["some text"]`.

**Step 3: No commit needed** — Supabase schema change takes effect immediately.

---

## Task 2: Update `app/profile/[username]/page.tsx`

**Files:**
- Modify: `app/profile/[username]/page.tsx`

This task has 5 sub-steps. Make all changes, then commit once at the end.

---

### Step 1: Add `wishTags` and `tagInput` state

Find the existing state declarations block (around line 14–28). Add two new state variables after the existing ones:

```tsx
const [wishTags, setWishTags] = useState<string[]>([]);
const [tagInput, setTagInput] = useState('');
```

---

### Step 2: Initialize `wishTags` from fetched profile data

Find the `fetchProfileAndGear` function. After `setProfile(profileData)` (around line 49), add:

```tsx
setWishTags(Array.isArray(profileData.wish_list) ? profileData.wish_list : []);
```

This handles: `null`, `[]`, and `["tag1", "tag2"]` correctly. The `Array.isArray` guard is a safety net in case any row still has a non-array value.

---

### Step 3: Add `addTag` and `removeTag` functions

Add these two functions after `handleSave` (after line 253):

```tsx
const addTag = async () => {
  const tag = tagInput.trim();
  if (!tag || wishTags.includes(tag)) {
    setTagInput('');
    return;
  }
  const updated = [...wishTags, tag];
  setWishTags(updated);
  setTagInput('');
  await supabase.from('profiles').update({ wish_list: updated }).eq('id', profile.id);
};

const removeTag = async (tag: string) => {
  const updated = wishTags.filter(t => t !== tag);
  setWishTags(updated);
  await supabase.from('profiles').update({ wish_list: updated }).eq('id', profile.id);
};
```

No error handling spinner needed — these are fire-and-forget. The local state updates optimistically.

---

### Step 4: Remove `wish_list` from `handleSave`

Find `handleSave` (lines 241–253). Remove the `wish_list` line from the update payload:

**Before:**
```tsx
const handleSave = async () => {
  const { error } = await supabase.from('profiles').update({
    bio: profile.bio,
    wish_list: profile.wish_list,
    preferred_name: profile.preferred_name,
    burning_man_years: profile.burning_man_years,
    burning_man_camp: profile.burning_man_camp,
    avatar_url: profile.avatar_url,
  }).eq('id', profile.id);
```

**After:**
```tsx
const handleSave = async () => {
  const { error } = await supabase.from('profiles').update({
    bio: profile.bio,
    preferred_name: profile.preferred_name,
    burning_man_years: profile.burning_man_years,
    burning_man_camp: profile.burning_man_camp,
    avatar_url: profile.avatar_url,
  }).eq('id', profile.id);
```

---

### Step 5: Replace the wishlist JSX section

Find the Wish List section inside the 2-column grid (lines 500–514):

```tsx
<div>
  <h4 style={subheadStyle}>Wish List</h4>
  {isEditing ? (
    <textarea
      placeholder="Items I'm on the lookout for"
      style={editTextareaStyle}
      value={profile.wish_list || ''}
      onChange={e => setProfile({ ...profile, wish_list: e.target.value })}
    />
  ) : (
    <p style={{ fontSize: '1rem', color: profile.wish_list ? '#444' : '#aaa', fontStyle: profile.wish_list ? 'normal' as const : 'italic' as const, margin: 0, lineHeight: '1.6' }}>
      {profile.wish_list || 'Items I\'m on the lookout for'}
    </p>
  )}
</div>
```

Replace the entire block with:

```tsx
<div>
  <h4 style={subheadStyle}>Wish List</h4>

  {/* Tags display — always visible */}
  <div style={{ display: 'flex', flexWrap: 'wrap' as const, gap: '8px', marginBottom: wishTags.length > 0 ? '12px' : '0' }}>
    {wishTags.length === 0 && !isOwner && (
      <span style={{ color: '#aaa', fontStyle: 'italic' as const, fontSize: '0.9rem' }}>No wishlist yet.</span>
    )}
    {wishTags.map(tag => (
      <span key={tag} style={{
        display: 'inline-flex', alignItems: 'center', gap: '6px',
        backgroundColor: '#00ccff', color: '#000',
        borderRadius: '20px', padding: '4px 12px',
        fontSize: '13px', fontWeight: 600,
      }}>
        {tag}
        {isOwner && (
          <button
            onClick={() => removeTag(tag)}
            style={{
              background: 'transparent', border: 'none',
              cursor: 'pointer', padding: '0', lineHeight: 1,
              color: '#005566', fontSize: '14px', fontWeight: 'bold',
            }}
            aria-label={`Remove ${tag}`}
          >
            ×
          </button>
        )}
      </span>
    ))}
  </div>

  {/* Tag input — owner only, always visible (not tied to isEditing) */}
  {isOwner && (
    <div style={{ display: 'flex', gap: '8px' }}>
      <input
        type="text"
        value={tagInput}
        placeholder="Add an item..."
        onChange={e => setTagInput(e.target.value)}
        onKeyDown={e => { if (e.key === 'Enter') { e.preventDefault(); addTag(); } }}
        style={{
          flex: 1, backgroundColor: '#fff', color: '#2D241E',
          border: '1px solid #ddd', padding: '6px 10px',
          borderRadius: '6px', fontSize: '13px', outline: 'none',
        }}
      />
      <button
        onClick={addTag}
        style={{
          backgroundColor: '#00ccff', color: '#000',
          border: 'none', borderRadius: '6px',
          padding: '6px 14px', fontWeight: 600,
          fontSize: '13px', cursor: 'pointer',
        }}
      >
        Add
      </button>
    </div>
  )}
</div>
```

---

### Step 6: Commit

```bash
git add app/profile/[username]/page.tsx
git commit -m "feat: wishlist tag input — always-live, jsonb-backed, cyan chips"
```

---

## Task 3: Manual verification

**Step 1: Run the dev server**
```bash
npm run dev
```

**Step 2: Verify as owner**
- Log in and go to your own profile page (`/profile/[your-username]`)
- Wish List section shows an input field and "Add" button (no Edit Profile required)
- Type a tag, press Enter → chip appears with cyan background and × button
- Click Add button → same behavior
- Click × on a chip → tag disappears
- Refresh the page → tags persist (saved to Supabase)
- Empty string → ignored (no blank chip added)
- Duplicate tag → ignored

**Step 3: Verify as visitor**
- Log out (or use a different browser), go to the profile URL
- Wish List section shows chips with no × buttons and no input field
- If no tags: shows "No wishlist yet." in muted italic

**Step 4: Verify Edit Profile mode**
- As owner, click "Edit Profile" → bio and other fields become editable
- Wishlist section is unchanged (still shows chips + input, independent of Edit mode)
- Click "Save Profile" → bio saves, wishlist is unaffected

**Step 5: Push**
```bash
git push
```
