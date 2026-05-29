# Getting Started Checklist Implementation Plan

> **For Claude:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Goal:** Show a slide-in Getting Started checklist in the homepage hero right panel for new logged-in users, with real-data completion detection and a collapsed fallback on the profile page.

**Architecture:** A Supabase migration adds `checklist_dismissed` and `has_browsed` columns to `profiles`. The homepage fetches checklist state in parallel with existing data fetches and renders the checklist overlay (with CSS slide-in animation) over the existing scrolling hero content. Completion is derived from real data queries, not separate flags. The profile page shows a collapsed progress bar if dismissed but incomplete.

**Tech Stack:** Next.js 16 App Router, React 19, Supabase SSR (`@supabase/ssr`), inline React CSS objects (`as const`), design tokens (INK/PAPER/TEAL etc.)

---

### Task 1: Supabase migration — add columns to profiles

**Files:**
- Create: `supabase/migrations/20260529_checklist_columns.sql`

**Step 1: Write the migration**

```sql
alter table public.profiles
  add column if not exists checklist_dismissed boolean not null default false,
  add column if not exists has_browsed boolean not null default false;
```

No new table — no grants needed (columns inherit the table's existing RLS policies).

**Step 2: Apply via Supabase MCP**

Use `mcp__supabase__apply_migration` with the SQL above and migration name `checklist_columns`.

**Step 3: Verify columns exist**

Use `mcp__supabase__execute_sql`:
```sql
select column_name, data_type, column_default
from information_schema.columns
where table_name = 'profiles'
  and column_name in ('checklist_dismissed', 'has_browsed');
```
Expected: 2 rows returned.

**Step 4: Commit the migration file**

```bash
git add supabase/migrations/20260529_checklist_columns.sql
git commit -m "db: add checklist_dismissed and has_browsed columns to profiles"
```

---

### Task 2: Create ChecklistBox component

**Files:**
- Create: `components/ChecklistBox.tsx`

**Step 1: Write the component**

```tsx
'use client'

import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'

const INK      = '#1C1610'
const INK_LITE = '#9A8878'
const PAPER_DK = '#EDE5D0'
const TEAL     = '#1E8A82'

export interface ChecklistState {
  playaHistory: boolean
  wishList:     boolean
  locations:    boolean
  listedItem:   boolean
  browsed:      boolean
}

interface ChecklistBoxProps {
  state:       ChecklistState
  username:    string | null
  onDismiss:   () => void
}

const ITEMS = [
  {
    key:   'playaHistory' as const,
    label: 'Playa History',
    desc:  'Connect with campmates to see what they have and need',
    where: 'Profile',
    href:  (username: string | null) => username ? `/profile/${username}` : '/profile',
  },
  {
    key:   'wishList' as const,
    label: 'Wish List',
    desc:  "Share what you're looking for so others can reach out",
    where: 'Profile',
    href:  (username: string | null) => username ? `/profile/${username}` : '/profile',
  },
  {
    key:   'locations' as const,
    label: 'Item Locations',
    desc:  'Home, storage unit, wherever your stuff lives',
    where: 'Settings',
    href:  () => '/settings',
  },
  {
    key:   'listedItem' as const,
    label: 'List an Item',
    desc:  'Choose who can view it or to keep it private',
    where: 'List Item',
    href:  () => '/list-item',
  },
  {
    key:   'browsed' as const,
    label: 'Browse Items',
    desc:  "See what's available to borrow or keep",
    where: 'Find Items',
    href:  () => '/find-items',
  },
]

export default function ChecklistBox({ state, username, onDismiss }: ChecklistBoxProps) {
  const router = useRouter()
  const [visible, setVisible] = useState(false)

  useEffect(() => {
    // trigger animation class after mount so CSS transition fires
    const t = setTimeout(() => setVisible(true), 50)
    return () => clearTimeout(t)
  }, [])

  const completed = Object.values(state).filter(Boolean).length
  const total     = ITEMS.length

  const handleNavigate = (href: string) => {
    router.push(href)
  }

  return (
    <>
      <style>{`
        @keyframes checklistSlideDown {
          from { transform: translateY(-110%); }
          to   { transform: translateY(0); }
        }
        .cl-box-enter {
          animation: checklistSlideDown 1.1s cubic-bezier(0.22, 1, 0.36, 1) 1s both;
        }
      `}</style>

      {/* Overlay — sits on top of scrolling content */}
      <div style={{
        position: 'absolute', inset: 0,
        display: 'flex', alignItems: 'center', justifyContent: 'center',
        padding: '0 38px',
        pointerEvents: 'none',
        zIndex: 10,
      }}>
        <div
          className="cl-box-enter"
          style={{
            width: '100%',
            background: '#fff',
            border: `1.5px solid rgba(28,22,16,0.2)`,
            padding: '16px 14px 12px',
            pointerEvents: 'all',
            transform: 'translateY(-110%)', // held up before animation fires
          }}
        >
          {/* Header */}
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '12px' }}>
            <div>
              <div style={{ fontFamily: "'Arvo', serif", fontSize: '1rem', fontWeight: 700, color: INK }}>Getting Started</div>
              <div style={{ fontSize: '0.72rem', color: INK_LITE, marginTop: '2px' }}>{completed} of {total} complete</div>
            </div>
            <button
              onClick={onDismiss}
              style={{ fontFamily: "'Space Mono', monospace", fontSize: '0.52rem', color: INK_LITE, background: 'none', border: 'none', cursor: 'pointer', letterSpacing: '0.06em', textTransform: 'uppercase' as const, whiteSpace: 'nowrap' as const, flexShrink: 0, marginLeft: '12px' }}
            >
              Skip ✕
            </button>
          </div>

          {/* Items */}
          {ITEMS.map((item, i) => {
            const done = state[item.key]
            const isLast = i === ITEMS.length - 1
            return (
              <div
                key={item.key}
                onClick={() => handleNavigate(item.href(username))}
                style={{
                  display: 'flex', alignItems: 'center', gap: '10px',
                  padding: '9px 0',
                  borderBottom: isLast ? 'none' : `1px solid rgba(28,22,16,0.08)`,
                  cursor: 'pointer',
                }}
              >
                {/* Checkbox */}
                <div style={{
                  width: '18px', height: '18px', flexShrink: 0,
                  border: `2px solid ${done ? TEAL : INK}`,
                  background: done ? TEAL : '#FDFAF4',
                  display: 'flex', alignItems: 'center', justifyContent: 'center',
                }}>
                  {done && <span style={{ color: '#fff', fontSize: '0.7rem', fontWeight: 700, lineHeight: 1 }}>✓</span>}
                </div>

                {/* Text */}
                <div style={{ flex: 1 }}>
                  <div style={{
                    fontSize: '0.8rem', fontWeight: 700, color: done ? INK_LITE : INK,
                    textDecoration: done ? 'line-through' : 'none',
                    textDecorationColor: 'rgba(28,22,16,0.25)',
                    lineHeight: 1.2,
                  }}>
                    {item.label}
                  </div>
                  <div style={{ fontSize: '0.74rem', color: done ? '#C4B8AC' : INK_LITE, lineHeight: 1.35, marginTop: '2px' }}>
                    {item.desc}
                  </div>
                </div>

                {/* Destination */}
                <span style={{ fontFamily: "'Space Mono', monospace", fontSize: '0.54rem', color: INK_LITE, letterSpacing: '0.06em', textTransform: 'uppercase' as const, flexShrink: 0, alignSelf: 'flex-start' as const, marginTop: '2px' }}>
                  {item.where} →
                </span>
              </div>
            )
          })}

          {/* Progress bar */}
          <div style={{ display: 'flex', alignItems: 'center', gap: '10px', marginTop: '10px', paddingTop: '8px', borderTop: `1px solid rgba(28,22,16,0.1)` }}>
            <div style={{ flex: 1, height: '3px', background: 'rgba(28,22,16,0.12)' }}>
              <div style={{ height: '100%', background: TEAL, width: `${(completed / total) * 100}%`, transition: 'width 0.3s ease' }} />
            </div>
            <span style={{ fontFamily: "'Space Mono', monospace", fontSize: '0.52rem', fontWeight: 700, color: INK_LITE, letterSpacing: '0.06em', whiteSpace: 'nowrap' as const }}>
              {completed} / {total}
            </span>
          </div>
        </div>
      </div>
    </>
  )
}
```

**Step 2: Commit**

```bash
git add components/ChecklistBox.tsx
git commit -m "feat: add ChecklistBox component with slide-in animation"
```

---

### Task 3: Wire checklist into homepage

**Files:**
- Modify: `app/page.tsx`

**Step 1: Add checklist state fetching**

In the existing `fetchCurrentUser` useEffect (which already fetches `username`), expand the profiles query to also fetch checklist-related fields. Then run parallel queries for completion detection.

Add these state variables near the top of `HomePage`:

```tsx
const [checklistState,     setChecklistState]     = useState<import('@/components/ChecklistBox').ChecklistState | null>(null)
const [checklistDismissed, setChecklistDismissed] = useState<boolean>(false)
const [checklistLoading,   setChecklistLoading]   = useState(true)
```

Replace the existing `fetchCurrentUser` useEffect with:

```tsx
useEffect(() => {
  async function fetchCurrentUser() {
    const { data: { session } } = await supabase.auth.getSession()
    if (!session?.user) { setChecklistLoading(false); return }
    const uid = session.user.id

    const { data: profile } = await supabase
      .from('profiles')
      .select('username, checklist_dismissed, wish_list')
      .eq('id', uid)
      .single()

    if (!profile) { setChecklistLoading(false); return }
    setCurrentUsername(profile.username)
    setChecklistDismissed(profile.checklist_dismissed ?? false)

    if (profile.checklist_dismissed) { setChecklistLoading(false); return }

    // parallel completion checks
    const [campsRes, locsRes, gearRes] = await Promise.all([
      supabase.from('user_camp_affiliations').select('id', { count: 'exact', head: true }).eq('user_id', uid),
      supabase.from('locations').select('id', { count: 'exact', head: true }).eq('user_id', uid),
      supabase.from('gear_items').select('id', { count: 'exact', head: true }).eq('user_id', uid),
    ])

    const state: import('@/components/ChecklistBox').ChecklistState = {
      playaHistory: (campsRes.count ?? 0) > 0,
      wishList:     Array.isArray(profile.wish_list) && profile.wish_list.length > 0,
      locations:    (locsRes.count ?? 0) > 0,
      listedItem:   (gearRes.count ?? 0) > 0,
      browsed:      profile.has_browsed ?? false,   // NOTE: add has_browsed to select above
    }
    setChecklistState(state)
    setChecklistLoading(false)
  }
  fetchCurrentUser()
}, [])
```

**IMPORTANT:** Update the select string to include `has_browsed`:
```tsx
.select('username, checklist_dismissed, wish_list, has_browsed')
```

**Step 2: Add dismiss handler**

```tsx
const handleChecklistDismiss = async () => {
  setChecklistDismissed(true)
  const { data: { session } } = await supabase.auth.getSession()
  if (!session?.user) return
  await supabase.from('profiles').update({ checklist_dismissed: true }).eq('id', session.user.id)
}
```

**Step 3: Compute whether checklist should show**

```tsx
const allComplete    = checklistState ? Object.values(checklistState).every(Boolean) : false
const showChecklist  = !checklistLoading && checklistState !== null && !checklistDismissed && !allComplete
```

**Step 4: Import ChecklistBox**

```tsx
import ChecklistBox from '@/components/ChecklistBox'
```

**Step 5: Update the hero right panel JSX**

The right panel currently has `gameRunning ? game : scrollContent`. Wrap the scroll content with `position: relative` and overlay the checklist on top. Locate the existing right panel div (the one with `ref={heroRightRef}`) and make it `position: 'relative'`. Then inside the `!gameRunning` branch, add the ChecklistBox after the scroll content:

```tsx
{!gameRunning && (
  <>
    {/* existing scroll rows — unchanged */}
    ...

    {/* Frogger trigger */}
    ...

    {/* Checklist overlay — only for logged-in new users */}
    {showChecklist && (
      <ChecklistBox
        state={checklistState!}
        username={currentUsername}
        onDismiss={handleChecklistDismiss}
      />
    )}
  </>
)}
```

**Step 6: Commit**

```bash
git add app/page.tsx
git commit -m "feat: wire ChecklistBox into homepage hero panel"
```

---

### Task 4: Mark has_browsed on /find-items

**Files:**
- Modify: `app/find-items/page.tsx`

**Step 1: Add a one-time effect to set has_browsed**

In `find-items/page.tsx`, add a useEffect that fires once on mount and sets `has_browsed = true` for the logged-in user if not already set:

```tsx
useEffect(() => {
  async function markBrowsed() {
    const { data: { session } } = await supabase.auth.getSession()
    if (!session?.user) return
    // fire-and-forget, don't block the page
    supabase
      .from('profiles')
      .update({ has_browsed: true })
      .eq('id', session.user.id)
      .eq('has_browsed', false) // only update if not already set (avoids unnecessary writes)
      .then(() => {})
  }
  markBrowsed()
}, [])
```

**Step 2: Commit**

```bash
git add app/find-items/page.tsx
git commit -m "feat: mark has_browsed on first visit to find-items"
```

---

### Task 5: Collapsed progress bar on profile page

**Files:**
- Modify: `app/profile/[username]/client-page.tsx`

**Step 1: Add collapsed checklist state**

In the profile page, add state and fetch checklist data for the owner. Add near other state declarations:

```tsx
const [checklistState,     setChecklistState]     = useState<null | { playaHistory: boolean; wishList: boolean; locations: boolean; listedItem: boolean; browsed: boolean }>(null)
const [checklistDismissed, setChecklistDismissed] = useState(false)
const [checklistExpanded,  setChecklistExpanded]  = useState(false)
```

In `fetchProfileAndGear`, after confirming `isOwner`, add:

```tsx
if (sessionUserId && sessionUserId === profileData.id) {
  // existing owner logic...
  setChecklistDismissed(profileData.checklist_dismissed ?? false)

  const [campsRes, locsRes, gearRes] = await Promise.all([
    supabase.from('user_camp_affiliations').select('id', { count: 'exact', head: true }).eq('user_id', sessionUserId),
    supabase.from('locations').select('id', { count: 'exact', head: true }).eq('user_id', sessionUserId),
    supabase.from('gear_items').select('id', { count: 'exact', head: true }).eq('user_id', sessionUserId),
  ])

  setChecklistState({
    playaHistory: (campsRes.count ?? 0) > 0,
    wishList:     Array.isArray(profileData.wish_list) && profileData.wish_list.length > 0,
    locations:    (locsRes.count ?? 0) > 0,
    listedItem:   (gearRes.count ?? 0) > 0,
    browsed:      profileData.has_browsed ?? false,
  })
}
```

**IMPORTANT:** Add `checklist_dismissed, has_browsed` to the profiles select query at the top of `fetchProfileAndGear`.

**Step 2: Render collapsed bar**

Show the collapsed bar at the top of the page content area — only when owner, dismissed but not complete:

```tsx
{(() => {
  if (!isOwner || !checklistState || !checklistDismissed) return null
  const completed = Object.values(checklistState).filter(Boolean).length
  const total = 5
  if (completed === total) return null

  return (
    <div
      onClick={() => setChecklistExpanded(e => !e)}
      style={{
        display: 'flex', alignItems: 'center', gap: '14px',
        padding: '12px 20px', marginBottom: '20px',
        background: '#FDFAF4', border: `2px solid #1C1610`,
        boxShadow: `4px 4px 0 #1C1610`, cursor: 'pointer',
      }}
    >
      <span style={{ fontFamily: "'Arvo', serif", fontSize: '0.88rem', fontWeight: 700, color: '#1C1610', flexShrink: 0 }}>
        Getting Started
      </span>
      <div style={{ flex: 1, height: '6px', background: '#EDE5D0', border: `1px solid rgba(28,22,16,0.15)` }}>
        <div style={{ height: '100%', background: '#1E8A82', width: `${(completed / total) * 100}%` }} />
      </div>
      <span style={{ fontFamily: "'Space Mono', monospace", fontSize: '0.55rem', fontWeight: 700, color: '#9A8878', letterSpacing: '0.06em', whiteSpace: 'nowrap' as const, flexShrink: 0 }}>
        {completed} of {total} complete
      </span>
      <span style={{ color: '#9A8878', fontSize: '0.75rem', flexShrink: 0 }}>{checklistExpanded ? '▴' : '▾'}</span>
    </div>
  )
})()}
```

Expanding the bar is a stretch goal — for now the click just toggles `checklistExpanded` visually. Full expand-to-show-items can be a follow-up.

**Step 3: Commit**

```bash
git add app/profile/[username]/client-page.tsx
git commit -m "feat: show collapsed checklist progress bar on profile page when dismissed"
```

---

### Task 6: Auto-dismiss when all complete

**Files:**
- Modify: `components/ChecklistBox.tsx`

**Step 1: Add a completion effect**

In `ChecklistBox`, add a useEffect that fires `onDismiss` automatically when all items complete:

```tsx
useEffect(() => {
  const allDone = Object.values(state).every(Boolean)
  if (allDone) {
    // short delay so user sees the final checkmark before it disappears
    const t = setTimeout(onDismiss, 1200)
    return () => clearTimeout(t)
  }
}, [state, onDismiss])
```

**Step 2: Commit**

```bash
git add components/ChecklistBox.tsx
git commit -m "feat: auto-dismiss checklist when all 5 items complete"
```

---

### Task 7: Final push and smoke test

**Step 1: Push to master**

```bash
git push origin master
```

**Step 2: Smoke test checklist**

- Log out → homepage right panel shows scrolling content only ✓
- Log in as a fresh/new-ish account → checklist slides in after 1s delay ✓
- Click a checklist item → navigates to correct page ✓
- Complete an action (e.g. add a wish list item) → return to homepage, item shows as checked ✓
- Click Skip → checklist disappears on homepage ✓
- Visit profile page → collapsed progress bar appears at top ✓
- Complete all 5 → checklist auto-dismisses after 1.2s ✓
- Revisit homepage after completion → scrolling content shows, no checklist ✓

**Step 3: Update TASKS.md and MEMORY.md**
