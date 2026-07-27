# Camps Visibility & On-Playa Resources Linking Implementation Plan

> **For Claude:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Goal:** Add a "My Camps" nav link and `/camps` page aggregating a member's own camp hubs, and connect the on-playa resources directory to real camp records so a claimed camp can be found from its own page.

**Architecture:** A new `/camps` page reuses the same member-affiliation and item-visibility logic the individual camp page (`/camps/[slug]`) already has, extracted into a shared hook (`lib/useCampItems.ts`) and a shared rendering component (`components/CampItemsTable.tsx`) so both surfaces stay in sync on what counts as "campmate-visible." Separately, `playa_resources` gets a nullable `camp_id` link to `camps`, and `SubmitCampModal` gains a camp search/select that auto-fills whatever overlapping fields already exist on the matched camp.

**Tech Stack:** Next.js 16 App Router, Supabase (Postgres + RLS), `@supabase/ssr`. No automated test framework exists in this project (`package.json` has no test script) — every task's "verify" step is `npx tsc --noEmit` plus a concrete manual/SQL check, matching how every other feature in this codebase has been verified.

**Design doc:** `docs/plans/2026-07-27-camps-visibility-design.md` — read that first for the full rationale; this plan assumes it.

---

## Task 1: Migration — `playa_resources` schema changes

**Files:**
- Create via `mcp__supabase__apply_migration` (name: `link_playa_resources_to_camps`), then save the exact SQL Supabase reports to `supabase/migrations/<version>_link_playa_resources_to_camps.sql`.

**Step 1: Write the migration SQL**

```sql
-- Links a resources listing to a real camp record. Nullable because
-- anonymous submissions with no matching camp still won't have one.
-- ON DELETE SET NULL (not CASCADE) because a resources listing is a
-- standalone directory entry that should survive even if the linked
-- camp record is ever removed.
alter table public.playa_resources
  add column camp_id uuid references public.camps(id) on delete set null;

-- camps.homebase is a single freeform string ("Brooklyn, NY", "Seattle",
-- "Redding") -- never structured city/state/zip. The three-column split
-- on this table couldn't be auto-filled from that without either leaving
-- state/zip blank or badly guessing at a split. Safe to replace outright:
-- this table currently has exactly one row.
alter table public.playa_resources
  drop column homebase_city,
  drop column homebase_state,
  drop column homebase_zip;

alter table public.playa_resources
  add column homebase text;

alter table public.playa_resources
  add column camp_description text;
```

**Step 2: Apply it** via `mcp__supabase__apply_migration` (`project_id: bklycpitofjrjhizttny`, `name: link_playa_resources_to_camps`).

**Step 3: Verify**

```sql
select column_name, data_type, is_nullable from information_schema.columns
where table_schema = 'public' and table_name = 'playa_resources'
order by ordinal_position;
```
Expected: `homebase_city`/`homebase_state`/`homebase_zip` are gone; `camp_id` (uuid, nullable), `homebase` (text, nullable), `camp_description` (text, nullable) are present.

```sql
select conname, confdeltype, pg_get_constraintdef(oid) from pg_constraint
where conrelid = 'public.playa_resources'::regclass and contype = 'f';
```
Expected: a `camp_id` foreign key to `camps(id)` with `confdeltype = 'n'` (SET NULL).

Confirm the existing single row in the table didn't error out from the column drop (it has no data in the dropped columns to worry about, but confirm the row still exists):
```sql
select count(*) from playa_resources;
```
Expected: `1` (unchanged).

**Step 4: Save the migration file** to `supabase/migrations/<version>_link_playa_resources_to_camps.sql` (version from `mcp__supabase__list_migrations`).

**Step 5: Commit**

```bash
git add supabase/migrations/<version>_link_playa_resources_to_camps.sql
git commit -m "feat: link playa_resources to camps, consolidate homebase to one field"
```

---

## Task 2: Extract `lib/useCampItems.ts`

**Files:**
- Create: `lib/useCampItems.ts`

This hook is the security-sensitive part of "what gear can members of this camp see" — it's about to be needed in two places (the existing camp page and the new `/camps` page), and the availability/visibility filtering must stay byte-for-byte identical between them or one surface could show items the other correctly hides. Extracting it now, before Task 3 uses it twice, is the whole point of this task.

**Step 1: Write the hook**

```tsx
'use client'

import { useEffect, useState } from 'react'
import { supabase } from '@/lib/supabaseClient'

// Given a camp's member user IDs, returns the gear items they've made
// available to campmates -- the exact same query the camp page has always
// used. `memberIds` is joined into the effect's dependency array because a
// fresh array reference (e.g. from `.map()`) on every render would
// otherwise refetch every render even when the actual IDs haven't changed.
export function useCampItems(memberIds: string[]) {
  const [items, setItems] = useState<any[]>([])
  const [loading, setLoading] = useState(true)
  const key = memberIds.join(',')

  useEffect(() => {
    if (memberIds.length === 0) {
      setItems([])
      setLoading(false)
      return
    }
    let cancelled = false
    async function fetchItems() {
      setLoading(true)
      try {
        const { data: gear, error } = await supabase
          .from('gear_items')
          .select('*')
          .in('user_id', memberIds)
          .in('availability_status', ['Available to Borrow', 'Available to Keep'])
          .in('visibility', ['public', 'campmates'])
          .eq('owner_deleted', false)
        if (error) throw error

        const userIds = [...new Set((gear || []).map((i: any) => i.user_id))]
        const locationIds = [...new Set((gear || []).map((i: any) => i.location_id).filter(Boolean))]

        const [profilesRes, locationsRes] = await Promise.all([
          supabase.from('profiles').select('id, preferred_name, username').in('id', userIds),
          locationIds.length
            ? supabase.from('locations').select('id, city, state, zip_code').in('id', locationIds)
            : Promise.resolve({ data: [] as any[] }),
        ])

        if (cancelled) return
        setItems((gear || []).map((item: any) => ({
          ...item,
          profiles: profilesRes.data?.find((p: any) => p.id === item.user_id),
          locations: (locationsRes.data || []).find((l: any) => l.id === item.location_id),
        })))
      } catch (err: any) {
        console.error('useCampItems error:', err.message)
      } finally {
        if (!cancelled) setLoading(false)
      }
    }
    fetchItems()
    return () => { cancelled = true }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [key])

  return { items, loading }
}
```

**Step 2: Verify**

```bash
npx tsc --noEmit
```
Expected: no new errors (this file isn't used anywhere yet, so it should just typecheck cleanly on its own).

**Step 3: Commit**

```bash
git add lib/useCampItems.ts
git commit -m "feat: extract useCampItems hook from camp page"
```

---

## Task 3: Extract `components/CampItemsTable.tsx`, update the camp page to use both

**Files:**
- Create: `components/CampItemsTable.tsx`
- Modify: `app/camps/[slug]/client-page.tsx`

**Step 1: Create the shared component**

This moves `CampCardView`, `CampListView`, the grid/list toggle, the loading skeleton, the empty state, and their styles out of the camp page verbatim — no behavior changes, just relocated so `/camps` can use the identical rendering in Task 5. The "Only members can view this" gate and the "Items from Camp Members" heading stay OUT of this component and remain on the camp's own page only — `/camps`' "Your Camps" section only ever shows camps the viewer already belongs to, so there's nothing to gate there.

`components/CampItemsTable.tsx`:
```tsx
'use client'

import { useState } from 'react'
import Link from 'next/link'
import { LayoutGrid, List, MapPin, User, Package } from 'lucide-react'
import PolaroidPhoto from '@/components/PolaroidPhoto'

interface Props {
  items: any[]
  loading: boolean
}

export default function CampItemsTable({ items, loading }: Props) {
  const [viewMode, setViewMode] = useState<'grid' | 'list'>('list')

  return (
    <div>
      <div style={{ display: 'flex', justifyContent: 'flex-end', marginBottom: '10px' }}>
        <div style={campToggleGroupStyle}>
          <button onClick={() => setViewMode('grid')} style={{ ...campToggleButtonStyle, backgroundColor: viewMode === 'grid' ? '#1C1610' : 'transparent' }}>
            <LayoutGrid size={18} color={viewMode === 'grid' ? '#fff' : '#4A3828'} />
          </button>
          <button onClick={() => setViewMode('list')} style={{ ...campToggleButtonStyle, backgroundColor: viewMode === 'list' ? '#1C1610' : 'transparent' }}>
            <List size={18} color={viewMode === 'list' ? '#fff' : '#4A3828'} />
          </button>
        </div>
      </div>

      {loading ? (
        <>
          <style>{campGridResponsiveCss}</style>
          <div className="camp-grid">{[...Array(3)].map((_, i) => <div key={i} style={campSkeletonStyle} />)}</div>
        </>
      ) : items.length === 0 ? (
        <p style={{ color: '#9A8878', fontSize: '0.9rem', fontStyle: 'italic' as const }}>No items have been shared by camp members yet.</p>
      ) : (
        <div style={{ overflowX: 'auto' as const, maxWidth: '100%', width: '100%' }}>
          {viewMode === 'grid' && <style>{campGridResponsiveCss}</style>}
          <div className={viewMode === 'grid' ? 'camp-grid' : undefined} style={viewMode === 'grid' ? undefined : campListContainerStyle}>
            {viewMode === 'list' && (
              <div style={campListHeaderStyle}>
                <div style={{ width: '50px' }} />
                <div>Item</div>
                <div>Owner</div>
                <div>Category</div>
                <div>Location</div>
                <div>Description</div>
                <div>Terms</div>
              </div>
            )}
            {items.map(item => (
              <Link key={item.id} href={`/find-items/${item.id}`} style={{ textDecoration: 'none', display: 'block' }}>
                {viewMode === 'grid' ? <CampCardView item={item} /> : <CampListView item={item} />}
              </Link>
            ))}
          </div>
        </div>
      )}
    </div>
  )
}

function CampCardView({ item }: { item: any }) {
  const ownerName = item.profiles?.preferred_name || 'Member'
  const locationDisplay = item.locations
    ? [item.locations.city, item.locations.state].filter(Boolean).join(', ')
    : 'N/A'
  const isKeep = item.availability_status === 'Available to Keep'
  const hasTerms = !isKeep && (item.return_by || item.return_terms)
  return (
    <div style={{ backgroundColor: '#FDFAF4', border: '1.5px solid rgba(28,22,16,0.15)', boxShadow: '3px 3px 0 rgba(28,22,16,0.1)' }}>
      <div style={{ position: 'relative' as const, backgroundColor: 'transparent', padding: '8px 8px 0 8px', width: '100%', overflow: 'hidden', boxSizing: 'border-box' as const }}>
        <PolaroidPhoto src={item.image_urls?.[0]} alt={item.item_name} itemId={item.id} noRotate />
        <div style={{ position: 'absolute', top: '6px', left: '6px', backgroundColor: isKeep ? '#C24820' : '#1E8A82', color: '#fff', padding: '2px 6px', border: 'none', fontFamily: "'Space Mono', monospace", fontSize: '0.5rem', fontWeight: 700, zIndex: 5 }}>
          {isKeep ? 'Keep' : 'Borrow'}
        </div>
      </div>
      <div style={{ padding: '10px 12px 12px' }}>
        <h3 style={{ margin: 0, color: '#1C1610', fontSize: '0.9rem', fontWeight: 700, lineHeight: 1.2, fontFamily: "'Arvo', serif" }}>{item.item_name}</h3>
        <p style={{ color: '#9A8878', fontSize: '0.65rem', margin: '4px 0 8px', textTransform: 'uppercase' as const, fontWeight: 'bold' }}>{item.category} • {item.condition}</p>
        <div style={{ display: 'flex', justifyContent: 'space-between', color: '#4A3828', fontSize: '0.7rem', borderTop: '1px solid rgba(28,22,16,0.08)', paddingTop: '8px', gap: '6px' }}>
          <span style={{ display: 'flex', alignItems: 'center', gap: '3px', overflow: 'hidden', whiteSpace: 'nowrap' as const, textOverflow: 'ellipsis' as const }}><MapPin size={10} style={{ flexShrink: 0 }} />{locationDisplay}</span>
          {item.profiles?.username ? (
            <Link href={`/profile/${item.profiles.username}`} onClick={e => e.stopPropagation()} style={{ display: 'flex', alignItems: 'center', gap: '3px', color: '#1E8A82', textDecoration: 'none', overflow: 'hidden', whiteSpace: 'nowrap' as const, textOverflow: 'ellipsis' as const }}>
              <User size={10} style={{ flexShrink: 0 }} />{ownerName}
            </Link>
          ) : (
            <span style={{ display: 'flex', alignItems: 'center', gap: '3px', overflow: 'hidden', whiteSpace: 'nowrap' as const, textOverflow: 'ellipsis' as const }}><User size={10} style={{ flexShrink: 0 }} />{ownerName}</span>
          )}
        </div>
        {hasTerms && (
          <div style={{ fontSize: '0.65rem', color: '#9A8878', borderTop: '1px solid rgba(28,22,16,0.08)', paddingTop: '6px', marginTop: '6px' }}>
            {item.return_by && <span>Return by {new Date(item.return_by).toLocaleDateString()}</span>}
            {item.return_terms && !item.return_by && <span>Has terms</span>}
          </div>
        )}
      </div>
    </div>
  )
}

const CAMP_LIST_COLS = '50px 160px 90px 100px 110px 1.5fr 1fr'

function CampListView({ item }: { item: any }) {
  const ownerName = item.profiles?.preferred_name || 'Member'
  const locationDisplay = item.locations
    ? [item.locations.city, item.locations.state].filter(Boolean).join(', ')
    : '—'
  const isKeep = item.availability_status === 'Available to Keep'
  const termsSummary = isKeep ? '' : [
    item.return_by ? `Return by ${new Date(item.return_by).toLocaleDateString()}` : null,
    item.damage_price ? `Damage agr. $${item.damage_price}` : null,
    item.loss_price ? `Loss agr. $${item.loss_price}` : null,
    item.return_terms ? 'Custom terms' : null,
  ].filter(Boolean).join(' · ')
  return (
    <div style={{ display: 'grid', gridTemplateColumns: CAMP_LIST_COLS, gap: '10px', alignItems: 'center', padding: '10px 12px', backgroundColor: '#FDFAF4', borderBottom: '1px solid rgba(28,22,16,0.08)' }}>
      <div style={{ width: '50px', height: '50px', overflow: 'hidden', backgroundColor: '#EDE5D0', flexShrink: 0 }}>
        {item.image_urls?.[0]
          ? <img src={item.image_urls[0]} alt={item.item_name} style={{ width: '100%', height: '100%', objectFit: 'contain' as const }} />
          : <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', height: '100%', color: '#9A8878' }}><Package size={16} /></div>}
      </div>
      <div style={{ overflow: 'hidden' }}>
        <div style={{ fontWeight: 600, color: '#1C1610', fontSize: '14px' }}>{item.item_name}</div>
        <div style={{ fontSize: '0.5rem', backgroundColor: isKeep ? '#C24820' : '#1E8A82', color: '#fff', fontFamily: "'Space Mono', monospace", fontWeight: 700, textTransform: 'uppercase' as const, marginTop: '2px', display: 'inline-block', padding: '2px 6px' }}>
          {isKeep ? 'Keep' : 'Borrow'}
        </div>
      </div>
      <div style={{ fontSize: '12px', color: '#4A3828', overflow: 'hidden', whiteSpace: 'nowrap' as const }}>
        {item.profiles?.username ? (
          <Link href={`/profile/${item.profiles.username}`} onClick={e => e.stopPropagation()} style={{ color: '#1E8A82', textDecoration: 'none' }}>{ownerName}</Link>
        ) : ownerName}
      </div>
      <div style={{ fontSize: '12px', color: '#4A3828', overflow: 'hidden', whiteSpace: 'nowrap' as const }}>{item.category}</div>
      <div style={{ fontSize: '12px', color: '#4A3828', display: 'flex', alignItems: 'center', overflow: 'hidden', whiteSpace: 'nowrap' as const }}><MapPin size={11} style={{ marginRight: '3px', flexShrink: 0 }} />{locationDisplay}</div>
      <div style={{ fontSize: '12px', color: '#4A3828', overflow: 'hidden', display: '-webkit-box', WebkitLineClamp: 2, WebkitBoxOrient: 'vertical' as const }}>{item.description || '—'}</div>
      <div style={{ fontSize: '11px', color: '#9A8878', overflow: 'hidden', whiteSpace: 'nowrap' as const }}>{termsSummary || '—'}</div>
    </div>
  )
}

const campToggleGroupStyle: React.CSSProperties = { display: 'flex', border: '2px solid #1C1610', overflow: 'hidden' }
const campToggleButtonStyle: React.CSSProperties = { border: 'none', padding: '6px 10px', cursor: 'pointer' }
// Mirrors .fi-grid on /find-items so camp item cards match the browse-items
// layout: 3 per row on mobile (portrait and landscape), same breakpoints.
const campGridResponsiveCss = `
  .camp-grid {
    display: grid;
    grid-template-columns: repeat(auto-fill, minmax(260px, 1fr));
    gap: 20px;
  }
  @media (min-width: 1100px) { .camp-grid { grid-template-columns: repeat(5, 1fr); } }
  @media (min-width:  860px) and (max-width: 1099px) { .camp-grid { grid-template-columns: repeat(4, 1fr); } }
  @media (max-width: 859px) { .camp-grid { grid-template-columns: repeat(3, 1fr); gap: 12px; } }
  @media (max-width: 480px) { .camp-grid { gap: 8px; } }
`
const campListContainerStyle: React.CSSProperties = { display: 'flex', flexDirection: 'column' as const, backgroundColor: '#FDFAF4', border: '1.5px solid rgba(28,22,16,0.12)', overflowX: 'auto' as const }
const campListHeaderStyle: React.CSSProperties = { display: 'grid', gridTemplateColumns: CAMP_LIST_COLS, gap: '10px', padding: '12px 15px', fontSize: '0.6rem', fontWeight: 700, color: '#4A3828', fontFamily: "'Space Mono', monospace", textTransform: 'uppercase' as const, letterSpacing: '0.08em', borderBottom: '1.5px solid rgba(28,22,16,0.12)', backgroundColor: '#EDE5D0' }
const campSkeletonStyle: React.CSSProperties = { height: '280px', backgroundColor: '#EDE5D0' }
```

**Step 2: Update the camp page to use both extracted pieces**

In `app/camps/[slug]/client-page.tsx`:

1. Remove these state declarations (no longer needed — `useCampItems` and `CampItemsTable` own this state now):
   ```tsx
   const [campItems, setCampItems] = useState<any[]>([]);
   const [campItemsLoading, setCampItemsLoading] = useState(false);
   const [campViewMode, setCampViewMode] = useState<'grid' | 'list'>('list');
   ```
2. Remove the entire `useEffect` block starting at `// Fetch items from camp members whenever the member list resolves` through its closing `}, [members]);` (the block that currently sets `campItems`/`campItemsLoading` manually).
3. Add near the top of the component, after `members` state is available:
   ```tsx
   const memberIds = members.map((m: any) => m.id);
   const { items: campItems, loading: campItemsLoading } = useCampItems(memberIds);
   ```
4. Add the import: `import { useCampItems } from '@/lib/useCampItems'` and `import CampItemsTable from '@/components/CampItemsTable'`.
5. Replace the entire "Camp items section" block:
   ```tsx
   {/* Camp items section */}
   <div style={{ marginTop: '48px' }}>
     <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '10px' }}>
       <h2 style={sectionHeadStyle}>Items from Camp Members</h2>
       {isMember && (
         <div style={campToggleGroupStyle}>
           <button onClick={() => setCampViewMode('grid')} style={{ ...campToggleButtonStyle, backgroundColor: campViewMode === 'grid' ? '#1C1610' : 'transparent' }}>
             <LayoutGrid size={18} color={campViewMode === 'grid' ? '#fff' : '#4A3828'} />
           </button>
           <button onClick={() => setCampViewMode('list')} style={{ ...campToggleButtonStyle, backgroundColor: campViewMode === 'list' ? '#1C1610' : 'transparent' }}>
             <List size={18} color={campViewMode === 'list' ? '#fff' : '#4A3828'} />
           </button>
         </div>
       )}
     </div>

     {/* Non-member gate */}
     {!isMember ? (
       <p style={{ color: '#9A8878', fontSize: '0.9rem', fontStyle: 'italic' as const }}>
         Only members of this camp can view this list.
       </p>
     ) : campItemsLoading ? (
       <>
         <style>{campGridResponsiveCss}</style>
         <div className="camp-grid">{[...Array(3)].map((_, i) => <div key={i} style={campSkeletonStyle} />)}</div>
       </>
     ) : campItems.length === 0 ? (
       <p style={{ color: '#9A8878', fontSize: '0.9rem', fontStyle: 'italic' as const }}>No items have been shared by camp members yet.</p>
     ) : (
       <div style={{ overflowX: 'auto' as const, maxWidth: '100%', width: '100%' }}>
       {campViewMode === 'grid' && <style>{campGridResponsiveCss}</style>}
       <div className={campViewMode === 'grid' ? 'camp-grid' : undefined} style={campViewMode === 'grid' ? undefined : campListContainerStyle}>
         {campViewMode === 'list' && (
           <div style={campListHeaderStyle}>
             <div style={{ width: '50px' }} />
             <div>Item</div>
             <div>Owner</div>
             <div>Category</div>
             <div>Location</div>
             <div>Description</div>
             <div>Terms</div>
           </div>
         )}
         {campItems.map(item => (
           <Link key={item.id} href={`/find-items/${item.id}`} style={{ textDecoration: 'none', display: 'block' }}>
             {campViewMode === 'grid' ? <CampCardView item={item} /> : <CampListView item={item} />}
           </Link>
         ))}
       </div>
       </div>
     )}
   </div>
   ```
   with:
   ```tsx
   {/* Camp items section */}
   <div style={{ marginTop: '48px' }}>
     <h2 style={{ ...sectionHeadStyle, marginBottom: '10px' }}>Items from Camp Members</h2>
     {!isMember ? (
       <p style={{ color: '#9A8878', fontSize: '0.9rem', fontStyle: 'italic' as const }}>
         Only members of this camp can view this list.
       </p>
     ) : (
       <CampItemsTable items={campItems} loading={campItemsLoading} />
     )}
   </div>
   ```
6. Remove the now-dead code at the bottom of the file: the `CampCardView`/`CampListView` function definitions, and the styles `campToggleGroupStyle`, `campToggleButtonStyle`, `campGridResponsiveCss`, `campListContainerStyle`, `campListHeaderStyle`, `campSkeletonStyle` (all moved into `CampItemsTable.tsx` in Step 1 — grep for each name first to confirm nothing else in this file still references them before deleting).
7. Remove now-unused imports if `LayoutGrid`/`List`/`MapPin`/`User`/`Package`/`PolaroidPhoto` are no longer referenced elsewhere in this file (check with grep — `MapPin`/`User`/`Package` in particular may still be used elsewhere on the page, e.g. in the claim form or member table; only remove imports that are genuinely unused after this change).

**Step 3: Verify**

```bash
npx tsc --noEmit
```
Expected: no new errors.

Manually: visit a camp page you're a member of (as `@alex` or `@abm`), confirm the items table still renders identically (grid/list toggle works, items show correctly) — this is a pure refactor, so the page should look and behave exactly as before.

**Step 4: Commit**

```bash
git add components/CampItemsTable.tsx "app/camps/[slug]/client-page.tsx"
git commit -m "refactor: camp page — extract CampItemsTable, use shared useCampItems hook"
```

---

## Task 4: Header nav — "My Camps" link

**Files:**
- Modify: `components/header.tsx`

**Step 1: Add the desktop nav link**

In the desktop `<nav>` block, next to `My Profile` (inside the `{user ? (...) : (...)}` block so it's logged-in only, matching My Inventory/My Profile/Settings exactly):

Change:
```tsx
              <Link href="/inventory" style={navLinkStyle('/inventory')} className="hover-nav-link">My Inventory</Link>
              {username && (
                <Link href={`/profile/${username}`} style={navLinkStyle(`/profile/${username}`)} className="hover-nav-link">My Profile</Link>
              )}
              <Link href="/settings" style={navLinkStyle('/settings')} className="hover-nav-link">Settings</Link>
```
to:
```tsx
              <Link href="/inventory" style={navLinkStyle('/inventory')} className="hover-nav-link">My Inventory</Link>
              <Link href="/camps" style={navLinkStyle('/camps')} className="hover-nav-link">My Camps</Link>
              {username && (
                <Link href={`/profile/${username}`} style={navLinkStyle(`/profile/${username}`)} className="hover-nav-link">My Profile</Link>
              )}
              <Link href="/settings" style={navLinkStyle('/settings')} className="hover-nav-link">Settings</Link>
```

**Step 2: Add the mobile nav link**

Change:
```tsx
                <Link href="/inventory"               onClick={() => setMenuOpen(false)} style={mobileNavLinkStyle('/inventory')}>My Inventory</Link>
                {username && <Link href={`/profile/${username}`} onClick={() => setMenuOpen(false)} style={mobileNavLinkStyle(`/profile/${username}`)}>My Profile</Link>}
                <Link href="/settings"                onClick={() => setMenuOpen(false)} style={mobileNavLinkStyle('/settings')}>Settings</Link>
```
to:
```tsx
                <Link href="/inventory"               onClick={() => setMenuOpen(false)} style={mobileNavLinkStyle('/inventory')}>My Inventory</Link>
                <Link href="/camps"                   onClick={() => setMenuOpen(false)} style={mobileNavLinkStyle('/camps')}>My Camps</Link>
                {username && <Link href={`/profile/${username}`} onClick={() => setMenuOpen(false)} style={mobileNavLinkStyle(`/profile/${username}`)}>My Profile</Link>}
                <Link href="/settings"                onClick={() => setMenuOpen(false)} style={mobileNavLinkStyle('/settings')}>Settings</Link>
```

**Step 3: Verify**

```bash
npx tsc --noEmit
```
Expected: no new errors. `/camps` doesn't exist as a route yet (built in Task 5), so this link will 404 until then — that's expected and fine for this task; don't skip ahead.

Manually: confirm "My Camps" appears in both desktop and mobile nav only when logged in, in the same position pattern as My Inventory/My Profile/Settings, and is absent when logged out.

**Step 4: Commit**

```bash
git add components/header.tsx
git commit -m "feat: header — add My Camps nav link"
```

---

## Task 5: New `/camps` page

**Files:**
- Create: `app/camps/page.tsx`
- Create: `app/camps/client-page.tsx`

This route sits alongside the existing `app/camps/[slug]/` dynamic route — Next.js resolves `/camps` to this new static page and `/camps/anything-else` to the dynamic one, no conflict.

No middleware change: `/camps` is intentionally NOT added to `middleware.ts`'s public-route whitelist. A logged-out visitor hitting this URL gets the same automatic redirect to `/login` that `/inventory`/`/settings` already get today — this is the default behavior, not something to configure.

**Step 1: Server wrapper**

`app/camps/page.tsx`:
```tsx
import ClientPage from './client-page'

export default function Page() {
  return <ClientPage />
}
```

**Step 2: Client page**

`app/camps/client-page.tsx`:
```tsx
'use client'

import { useEffect, useState } from 'react'
import Link from 'next/link'
import { supabase } from '@/lib/supabaseClient'
import { useCampItems } from '@/lib/useCampItems'
import CampItemsTable from '@/components/CampItemsTable'

const INK      = '#1C1610'
const INK_MID  = '#4A3828'
const INK_LITE = '#9A8878'
const PAPER    = '#F6F1E8'
const PAPER_LT = '#FDFAF4'
const TEAL     = '#1E8A82'

interface MyCamp {
  id: string
  slug: string
  display_name: string
}

interface SearchResult {
  id: string
  slug: string
  display_name: string
}

export default function ClientPage() {
  const [myCamps, setMyCamps] = useState<MyCamp[]>([])
  const [loading, setLoading] = useState(true)
  const [query, setQuery] = useState('')
  const [results, setResults] = useState<SearchResult[]>([])
  const [searching, setSearching] = useState(false)

  useEffect(() => {
    async function fetchMyCamps() {
      const { data: { session } } = await supabase.auth.getSession()
      if (!session) { setLoading(false); return }

      const { data: affRows } = await supabase
        .from('user_camp_affiliations')
        .select('camp_id')
        .eq('user_id', session.user.id)
        .not('camp_id', 'is', null)

      const campIds = [...new Set((affRows || []).map((r: any) => r.camp_id))]
      if (campIds.length === 0) { setLoading(false); return }

      const { data: camps } = await supabase
        .from('camps')
        .select('id, slug, display_name')
        .in('id', campIds)
        .order('display_name')

      setMyCamps(camps || [])
      setLoading(false)
    }
    fetchMyCamps()
  }, [])

  useEffect(() => {
    if (!query.trim()) { setResults([]); return }
    let cancelled = false
    setSearching(true)
    const handle = setTimeout(async () => {
      const { data } = await supabase
        .from('camps')
        .select('id, slug, display_name')
        .ilike('display_name', `%${query.trim()}%`)
        .limit(8)
      if (!cancelled) { setResults(data || []); setSearching(false) }
    }, 250)
    return () => { cancelled = true; clearTimeout(handle) }
  }, [query])

  return (
    <div style={{ backgroundColor: PAPER, minHeight: '100vh', padding: '40px 20px' }}>
      <div style={{ maxWidth: '900px', margin: '0 auto' }}>
        <div style={eyebrowStyle}>Camps</div>
        <h1 style={h1Style}>Your <em style={{ fontStyle: 'italic', color: TEAL }}>Camps.</em></h1>

        {loading ? (
          <p style={{ color: INK_MID }}>Loading…</p>
        ) : myCamps.length === 0 ? (
          <div style={emptyStateStyle}>
            <p style={{ color: INK_MID, margin: '0 0 4px' }}>You&apos;re not in a camp yet.</p>
            <p style={{ color: INK_LITE, fontSize: '0.85rem', margin: 0 }}>
              Search for your camp below, or{' '}
              <Link href="/settings" style={{ color: TEAL }}>update your Playa History on your profile</Link> to join one.
            </p>
          </div>
        ) : (
          myCamps.map(camp => <CampSection key={camp.id} camp={camp} />)
        )}

        <div style={{ marginTop: '48px' }}>
          <h2 style={sectionHeadStyle}>Find Your Camp</h2>
          <input
            value={query}
            onChange={e => setQuery(e.target.value)}
            placeholder="Search by camp name…"
            style={searchInputStyle}
          />
          {searching && <p style={{ color: INK_LITE, fontSize: '0.85rem', marginTop: '8px' }}>Searching…</p>}
          {results.length > 0 && (
            <div style={{ marginTop: '10px', display: 'flex', flexDirection: 'column' as const, gap: '6px' }}>
              {results.map(r => (
                <Link key={r.id} href={`/camps/${r.slug}`} style={resultRowStyle}>
                  {r.display_name}
                </Link>
              ))}
            </div>
          )}
          {!searching && query.trim() && results.length === 0 && (
            <p style={{ color: INK_LITE, fontSize: '0.85rem', marginTop: '8px' }}>No camps found matching &quot;{query}&quot;.</p>
          )}
        </div>

        <p style={{ marginTop: '32px', fontSize: '0.9rem' }}>
          <Link href="/settings" style={{ color: TEAL }}>Update your Playa History on your profile →</Link>
        </p>
      </div>
    </div>
  )
}

function CampSection({ camp }: { camp: MyCamp }) {
  const [memberIds, setMemberIds] = useState<string[]>([])

  useEffect(() => {
    async function fetchMemberIds() {
      const { data } = await supabase
        .from('user_camp_affiliations')
        .select('user_id')
        .eq('camp_id', camp.id)
      setMemberIds([...new Set((data || []).map((r: any) => r.user_id))])
    }
    fetchMemberIds()
  }, [camp.id])

  const { items, loading } = useCampItems(memberIds)

  return (
    <div style={{ marginBottom: '40px' }}>
      <h2 style={sectionHeadStyle}>
        <Link href={`/camps/${camp.slug}`} style={{ color: INK, textDecoration: 'none' }}>
          {camp.display_name} →
        </Link>
      </h2>
      <CampItemsTable items={items} loading={loading} />
    </div>
  )
}

const eyebrowStyle: React.CSSProperties = { fontFamily: "'Space Mono', monospace", fontSize: '0.6rem', fontWeight: 700, letterSpacing: '0.14em', textTransform: 'uppercase' as const, color: INK_LITE, marginBottom: '8px' }
const h1Style: React.CSSProperties = { fontFamily: "'Arvo', serif", fontSize: '2rem', fontWeight: 900, color: INK, margin: '0 0 28px', lineHeight: 1.1 }
const sectionHeadStyle: React.CSSProperties = { fontFamily: "'Arvo', serif", fontSize: '1.2rem', fontWeight: 700, color: INK, margin: '0 0 14px' }
const emptyStateStyle: React.CSSProperties = { backgroundColor: PAPER_LT, border: `1.5px solid rgba(28,22,16,0.15)`, padding: '20px', marginBottom: '20px' }
const searchInputStyle: React.CSSProperties = { width: '100%', maxWidth: '400px', padding: '10px 12px', border: `1.5px solid rgba(28,22,16,0.25)`, backgroundColor: PAPER_LT, color: INK, outline: 'none', boxSizing: 'border-box' as const, fontSize: '0.9rem' }
const resultRowStyle: React.CSSProperties = { display: 'block', padding: '8px 12px', backgroundColor: PAPER_LT, border: `1.5px solid rgba(28,22,16,0.12)`, color: INK, textDecoration: 'none', fontSize: '0.9rem' }
```

Note on the search: it deliberately does NOT offer a "create this camp" fallback the way the profile editor's `findOrCreateCamp` does. This page's search is a read-only lookup against existing camps (matching the design doc's "This doesn't join anything by itself — it's a lookup, not a join action") — creating a new unclaimed camp record is Playa History's job, not this page's.

**Step 3: Verify**

```bash
npx tsc --noEmit
```
Expected: no new errors.

Manually (as `@alex` or `@abm`, whichever has a camp affiliation — check via `select * from user_camp_affiliations where user_id = '<their id>'` if unsure): visit `/camps`, confirm your camp(s) show with their items table, confirm searching for a camp name returns results that link to the right `/camps/[slug]` page, confirm logging out and visiting `/camps` redirects to `/login`.

**Step 4: Commit**

```bash
git add app/camps/page.tsx app/camps/client-page.tsx
git commit -m "feat: add /camps page — Your Camps aggregator + camp search"
```

---

## Task 6: `SubmitCampModal` — camp search/select, auto-fill, new field, homebase consolidation

**Files:**
- Modify: `components/SubmitCampModal.tsx`

**Step 1: Add props for reuse from the camp edit panel (Task 8)**

Change:
```tsx
interface SubmitCampModalProps {
  onClose: () => void;
}

export default function SubmitCampModal({ onClose }: SubmitCampModalProps) {
```
to:
```tsx
interface SubmitCampModalProps {
  onClose: () => void;
  lockedCamp?: { id: string; display_name: string; homebase: string | null; social_links: Record<string, string> | null; bm_homepage_url: string | null; description: string | null; playa_location: string | null };
}

export default function SubmitCampModal({ onClose, lockedCamp }: SubmitCampModalProps) {
```

**Step 2: Update `formData` shape for the new fields**

Change:
```tsx
  const [formData, setFormData] = useState({
    camp_name: '',
    submitter_name: '',
    contact_email: '',
    offering_category: 'Compost',
    location_address: 'TBD',
    description: '',
    homebase_city: '',
    homebase_state: '',
    homebase_zip: '',
    website: '',
    instagram: '',
    public_email: '',
    accepting_campers: false
  });
```
to:
```tsx
  function autofillFromCamp(camp: NonNullable<SubmitCampModalProps['lockedCamp']>) {
    return {
      camp_id: camp.id,
      camp_name: camp.display_name,
      homebase: camp.homebase || '',
      website: camp.social_links?.website || camp.bm_homepage_url || '',
      instagram: camp.social_links?.instagram || '',
      location_address: camp.playa_location || 'TBD',
      camp_description: camp.description || '',
    };
  }

  const [formData, setFormData] = useState({
    camp_id: lockedCamp?.id || null as string | null,
    camp_name: lockedCamp?.display_name || '',
    submitter_name: '',
    contact_email: '',
    offering_category: 'Compost',
    location_address: lockedCamp?.playa_location || 'TBD',
    description: '',
    camp_description: lockedCamp?.description || '',
    homebase: lockedCamp?.homebase || '',
    website: (lockedCamp?.social_links?.website || lockedCamp?.bm_homepage_url) || '',
    instagram: lockedCamp?.social_links?.instagram || '',
    public_email: '',
    accepting_campers: false
  });
```

Remove the `states` array entirely (`const states = [...]`) — no longer used once the three-field homebase split is gone.

**Step 3: Add camp search state and the search effect**

Add near the other `useState` calls:
```tsx
  const [campQuery, setCampQuery] = useState(lockedCamp?.display_name || '');
  const [campResults, setCampResults] = useState<any[]>([]);
  const [campSearching, setCampSearching] = useState(false);
  const [showCampResults, setShowCampResults] = useState(false);
```

Add an effect (needs `useEffect` added to the `import { useState } from 'react'` line — change it to `import { useState, useEffect } from 'react'`):
```tsx
  useEffect(() => {
    if (lockedCamp) return; // camp already fixed, no search needed
    if (!campQuery.trim() || campQuery === formData.camp_name) { setCampResults([]); return; }
    let cancelled = false;
    setCampSearching(true);
    const handle = setTimeout(async () => {
      const { data } = await supabase.from('camps').select('id, display_name, homebase, social_links, bm_homepage_url, description, playa_location').ilike('display_name', `%${campQuery.trim()}%`).limit(8);
      if (!cancelled) { setCampResults(data || []); setCampSearching(false); }
    }, 250);
    return () => { cancelled = true; clearTimeout(handle); };
  }, [campQuery, lockedCamp, formData.camp_name]);

  function selectCamp(camp: any) {
    const filled = autofillFromCamp(camp);
    setFormData(prev => ({
      ...prev,
      camp_id: filled.camp_id,
      camp_name: filled.camp_name,
      // Only fill fields the submitter hasn't already touched.
      homebase: prev.homebase || filled.homebase,
      website: prev.website || filled.website,
      instagram: prev.instagram || filled.instagram,
      location_address: prev.location_address === 'TBD' ? filled.location_address : prev.location_address,
      camp_description: prev.camp_description || filled.camp_description,
    }));
    setCampQuery(filled.camp_name);
    setShowCampResults(false);
  }
```

**Step 4: Replace the Camp Name field with search-and-select**

Change:
```tsx
              <div>
                <label style={labelStyle}>Camp Name *</label>
                <input required style={inputStyle} value={formData.camp_name} onChange={field('camp_name')} placeholder="e.g. Camp Dust-Off" />
              </div>
```
to:
```tsx
              <div style={{ position: 'relative' as const }}>
                <label style={labelStyle}>Camp Name *</label>
                {lockedCamp ? (
                  <input required disabled style={{ ...inputStyle, backgroundColor: PAPER_DK, color: INK_LITE, cursor: 'not-allowed' }} value={formData.camp_name} readOnly />
                ) : (
                  <>
                    <input
                      required
                      style={inputStyle}
                      value={campQuery}
                      onChange={e => {
                        setCampQuery(e.target.value);
                        setFormData(prev => ({ ...prev, camp_id: null, camp_name: e.target.value }));
                        setShowCampResults(true);
                      }}
                      onFocus={() => setShowCampResults(true)}
                      placeholder="Search for your camp, or type a new name"
                    />
                    {campSearching && <p style={fieldNoteStyle}>Searching…</p>}
                    {showCampResults && campResults.length > 0 && (
                      <div style={campResultsDropdownStyle}>
                        {campResults.map(c => (
                          <button key={c.id} type="button" onClick={() => selectCamp(c)} style={campResultRowStyle}>
                            {c.display_name}
                          </button>
                        ))}
                      </div>
                    )}
                    {formData.camp_id && (
                      <p style={fieldNoteStyle}>Linked to this camp&apos;s page on The Playa Provides.</p>
                    )}
                  </>
                )}
              </div>
```

**Step 5: Add the Camp Description field, next to Description of Service**

Change:
```tsx
              <div>
                <label style={labelStyle}>Description of Service *</label>
                <textarea required style={{ ...inputStyle, height: '64px', resize: 'vertical' as const }} value={formData.description} onChange={field('description')} placeholder="e.g. Accepting aluminum cans daily from 2-4pm" />
              </div>
```
to:
```tsx
              <div>
                <label style={labelStyle}>Description of Service *</label>
                <textarea required style={{ ...inputStyle, height: '64px', resize: 'vertical' as const }} value={formData.description} onChange={field('description')} placeholder="e.g. Accepting aluminum cans daily from 2-4pm" />
              </div>

              <div>
                <label style={labelStyle}>Camp Description</label>
                <textarea style={{ ...inputStyle, height: '64px', resize: 'vertical' as const }} value={formData.camp_description} onChange={field('camp_description')} placeholder="Who you are as a camp" />
              </div>
```

**Step 6: Replace the homebase three-field row with one field**

Change:
```tsx
              <div style={homebaseRowStyle}>
                <div style={{ flex: '2 1 160px' }}>
                  <label style={labelStyle}>Homebase City</label>
                  <input style={inputStyle} value={formData.homebase_city} onChange={field('homebase_city')} placeholder="San Francisco" />
                </div>
                <div style={{ flex: '1 1 70px' }}>
                  <label style={labelStyle}>State</label>
                  <select style={{ ...inputStyle, cursor: 'pointer' }} value={formData.homebase_state} onChange={field('homebase_state')}>
                    <option value="">--</option>
                    {states.map(s => <option key={s} value={s}>{s}</option>)}
                  </select>
                </div>
                <div style={{ flex: '1 1 80px' }}>
                  <label style={labelStyle}>Zip</label>
                  <input style={inputStyle} value={formData.homebase_zip} onChange={field('homebase_zip')} placeholder="94110" />
                </div>
              </div>
```
to:
```tsx
              <div>
                <label style={labelStyle}>Homebase</label>
                <input style={inputStyle} value={formData.homebase} onChange={field('homebase')} placeholder="San Francisco, CA" />
              </div>
```

`homebaseRowStyle` is now unused — remove its constant definition too (grep first to confirm nothing else uses it).

**Step 7: Verify the submit still works with the new shape**

`handleSubmit` already does `supabase.from('playa_resources').insert([{ ...formData, is_verified: false }])` — no change needed there, since `formData` now naturally includes `camp_id`, `homebase`, `camp_description` and no longer includes the three dropped fields. Confirm this by reading the current `handleSubmit` after your edits — it should need no changes.

**Step 8: Verify**

```bash
npx tsc --noEmit
```
Expected: no new errors.

Manually: open "Submit Your Camp" from `/resources`, type a real camp name (e.g. one you know exists, like your own test account's camp), confirm search results appear, select one, confirm Camp Name/Homebase/Website/Instagram/Camp Description fields fill in with that camp's real data (check what that camp actually has populated first via SQL, so you know what to expect), confirm typing over an auto-filled field before submitting keeps your typed value. Then submit and confirm via `select * from playa_resources order by created_at desc limit 1` that `camp_id`, `homebase`, `camp_description` all saved correctly. Also test the no-match path: type a made-up camp name with no results, confirm you can still submit with `camp_id` null.

**Step 9: Commit**

```bash
git add components/SubmitCampModal.tsx
git commit -m "feat: SubmitCampModal — camp search/select with auto-fill, Camp Description field, single homebase field"
```

---

## Task 7: Update `send-camp-submission` edge function for the new field shape

**Files:**
- Modify: `supabase/functions/send-camp-submission/index.ts`
- Deploy via `mcp__supabase__deploy_edge_function`.

**Step 1: Update the email body**

The current "Homebase" row reads `[formData.homebase_city, formData.homebase_state, formData.homebase_zip].filter(Boolean).join(', ')` — those fields no longer exist on `formData`. Change:
```ts
              <tr>
                <td style="padding: 10px; font-weight: bold;">Homebase</td>
                <td style="padding: 10px;">${[formData.homebase_city, formData.homebase_state, formData.homebase_zip].filter(Boolean).join(', ') || '—'}</td>
              </tr>
```
to:
```ts
              <tr>
                <td style="padding: 10px; font-weight: bold;">Homebase</td>
                <td style="padding: 10px;">${formData.homebase || '—'}</td>
              </tr>
```

Add a row showing whether this submission is linked to a real camp record, since that's new and useful context for manual review — insert right after the Camp Name row:
```ts
              <tr>
                <td style="padding: 10px; font-weight: bold; width: 160px;">Camp Name</td>
                <td style="padding: 10px;">${formData.camp_name}</td>
              </tr>
              <tr style="background: #f9f9f9;">
                <td style="padding: 10px; font-weight: bold;">Linked Camp</td>
                <td style="padding: 10px;">${formData.camp_id ? `Yes (camp_id: ${formData.camp_id})` : 'No match found'}</td>
              </tr>
```
(Note the original had `Camp Name` on a plain row and `Category` next with `background: #f9f9f9` — adjust the alternating `background: #f9f9f9` striping on the rows that follow so it stays visually alternating after inserting this new row. Read the current file's full row sequence before editing to get the striping right.)

**Step 2: Deploy**

Use `mcp__supabase__deploy_edge_function` with `project_id: bklycpitofjrjhizttny`, `name: send-camp-submission`, Verify JWT off (matching its current deployed setting — confirm via `mcp__supabase__get_edge_function` before deploying, don't assume).

**Step 3: Verify**

Trigger a real test submission through `SubmitCampModal` (from Task 6's testing, or a fresh one) and confirm the notification email arrives with the updated Homebase value and the new Linked Camp row showing correctly for both a linked and an unlinked submission.

**Step 4: Commit**

```bash
git add supabase/functions/send-camp-submission/index.ts
git commit -m "feat: send-camp-submission — update for consolidated homebase field, show camp link status"
```

---

## Task 8: Camp edit panel — "On-Playa Resources" section

**Files:**
- Modify: `app/camps/[slug]/client-page.tsx`

**Step 1: Add state for this camp's resources listings**

Near the other state declarations:
```tsx
  const [campResources, setCampResources] = useState<any[]>([]);
  const [showResourcesForm, setShowResourcesForm] = useState(false);
  const [editingResource, setEditingResource] = useState<any | null>(null);
```

**Step 2: Fetch this camp's linked listings**

Add a new effect (or fold into the existing `fetchCamp` effect after `campData` is known):
```tsx
  useEffect(() => {
    async function fetchCampResources() {
      if (!camp?.id) return;
      const { data } = await supabase.from('playa_resources').select('*').eq('camp_id', camp.id);
      setCampResources(data || []);
    }
    fetchCampResources();
  }, [camp?.id]);
```

**Step 3: Add the section to the edit panel**

Inside the existing `{camp.is_claimed && editMode && (...)}` block, after the Social Links section and before the closing `{editError && ...}` line, add:
```tsx
          {/* On-Playa Resources */}
          <div style={{ marginBottom: '14px' }}>
            <label style={editLabelStyle}>On-Playa Resources</label>
            {campResources.length === 0 ? (
              <p style={{ color: '#9A8878', fontSize: '0.85rem', margin: '0 0 8px' }}>Not listed yet.</p>
            ) : (
              <div style={{ display: 'flex', flexDirection: 'column' as const, gap: '6px', marginBottom: '8px' }}>
                {campResources.map(r => (
                  <div key={r.id} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '8px 10px', backgroundColor: '#FDFAF4', border: '1px solid rgba(28,22,16,0.12)' }}>
                    <span style={{ fontSize: '0.85rem', color: '#1C1610' }}>{r.offering_category}{!r.is_verified && ' (pending review)'}</span>
                    <button type="button" onClick={() => { setEditingResource(r); setShowResourcesForm(true); }} style={{ background: 'none', border: 'none', color: '#1E8A82', cursor: 'pointer', fontSize: '0.8rem', fontWeight: 600 }}>Edit</button>
                  </div>
                ))}
              </div>
            )}
            <button type="button" onClick={() => { setEditingResource(null); setShowResourcesForm(true); }} style={editLendAnywayStyleOrSimilarSecondaryButton}>
              List an on-playa offering →
            </button>
          </div>
```

For the button style, reuse an existing secondary/outline button style already defined in this file rather than inventing a new one — grep the file for an existing teal-outline button constant (there should be one used elsewhere on this page, e.g. for a secondary action) and use that name in place of `editLendAnywayStyleOrSimilarSecondaryButton` above. If none fits, define a small local style matching the pattern: `{ padding: '8px 14px', backgroundColor: 'transparent', color: '#1E8A82', border: '1.5px solid #1E8A82', cursor: 'pointer', fontWeight: 600, fontSize: '0.85rem' }`.

**Step 4: Render the modal**

`SubmitCampModal` needs a `description`/`offering_category`/etc. to be EDITABLE when `editingResource` is set, not just pre-filled from the camp for a brand-new listing. This means `lockedCamp`'s shape from Task 6 isn't quite enough for the edit case — when editing an existing resource, the form should start from that resource's own saved values (not re-derive from the camp), while still being locked to the same camp. Extend `SubmitCampModalProps` (from Task 6) with an optional `existingResource?: any` prop; when present, `formData`'s initial state should spread `existingResource` instead of calling `autofillFromCamp`, and `handleSubmit` should `.update(...).eq('id', existingResource.id)` instead of `.insert(...)` when `existingResource` is set. Work out the exact conditional in `handleSubmit` and the initial `formData` state now, re-reading `SubmitCampModal.tsx` as it stands after Task 6's edits before writing this, since the exact state shape matters here.

At the bottom of the camp `[slug]` client-page, near where `showClaimForm` or similar modals are rendered conditionally:
```tsx
      {showResourcesForm && (
        <SubmitCampModal
          onClose={() => { setShowResourcesForm(false); setEditingResource(null); }}
          lockedCamp={camp}
          existingResource={editingResource}
        />
      )}
```
(`camp` as fetched already has `id`, `display_name`, `homebase`, `social_links`, `bm_homepage_url`, `description`, `playa_location` — confirm the select in `fetchCamp`'s `.select('*')` already includes all of these, which it should since it's `select('*')` on the whole row.)

After a successful submit from this modal, the parent page's `campResources` list should refresh — the simplest approach is re-running the Step 2 fetch on modal close: change `onClose` above to also call the resources-fetch function again (extract it to a named function rather than an inline effect-only closure so it can be called from both places).

**Step 5: Verify**

```bash
npx tsc --noEmit
```
Expected: no new errors.

Manually (as the owner of a claimed camp — you may need to claim a test camp first if none of your test accounts own one yet): enter edit mode on your camp, confirm the On-Playa Resources section shows "Not listed yet.", click "List an on-playa offering →", confirm the form opens with Camp Name locked and other fields pre-filled from the camp's real data, submit it, confirm it now shows in the list (labeled "(pending review)" since `is_verified` is still false), click Edit on it, confirm the form re-opens with that listing's actual saved values, change something and save, confirm the update persisted via SQL.

**Step 6: Commit**

```bash
git add "app/camps/[slug]/client-page.tsx" components/SubmitCampModal.tsx
git commit -m "feat: camp edit panel — list/edit on-playa resources listings"
```

---

## Task 9: `/resources` page — homebase field, "View camp page" link

**Files:**
- Modify: `app/resources/page.tsx`

**Step 1: Update the query to include the linked camp's slug**

Find the `.select('*')` calls on `playa_resources` (there are two — a primary fetch and a retry) and change them to also pull the linked camp's slug:
```tsx
        const { data, error } = await supabase.from('playa_resources').select('*, camps(slug)').eq('is_verified', true).order('camp_name', { ascending: true });
```
(apply the same `, camps(slug)` addition to the retry query a few lines below it).

**Step 2: Update the homebase display**

Change:
```tsx
              const homebase = [res.homebase_city, res.homebase_state].filter(Boolean).join(', ');
```
to:
```tsx
              const homebase = res.homebase;
```

**Step 3: Add the "View camp page" link**

After the camp name block:
```tsx
                  {/* Camp name */}
                  <div style={{ fontFamily: "'Arvo', serif", fontWeight: 700, color: INK, fontSize: '1rem', marginBottom: '8px', lineHeight: 1.25 }}>
                    {res.camp_name}
                  </div>
```
add, right after it:
```tsx
                  {res.camps?.slug && (
                    <a href={`/camps/${res.camps.slug}`} style={{ fontSize: '0.75rem', color: TEAL, textDecoration: 'none', marginBottom: '10px', display: 'inline-block' }}>
                      View camp page →
                    </a>
                  )}
```

**Step 4: Verify**

```bash
npx tsc --noEmit
```
Expected: no new errors.

Manually: after Task 6/8's testing has created at least one linked, verified resources entry (you may need to manually flip `is_verified = true` via SQL for a test row, since the review UI isn't part of this plan), confirm `/resources` shows "View camp page →" linking to the right `/camps/[slug]`, and that an unlinked entry (no `camp_id`) shows no such link. Confirm homebase still displays correctly for a linked entry with `homebase` set.

**Step 5: Commit**

```bash
git add app/resources/page.tsx
git commit -m "feat: /resources — show homebase from consolidated field, link to camp page when linked"
```

---

## Task 10: Update `TASKS.md`

**Files:**
- Modify: `TASKS.md`

**Step 1:** Add a fresh bullet under **Next Session Priority** summarizing what shipped (My Camps nav + `/camps` aggregator page, camps↔resources linking with auto-fill) and what needs manual verification on prod — the full flow: nav link visibility, `/camps` showing real camp data for a real member, camp search, submitting/editing an on-playa resources listing from a claimed camp's edit panel, and the `/resources` page showing the camp link.

**Step 2:** Add a line to the **Current Feature State → Camps** section noting the new `/camps` page and the `playa_resources.camp_id` link now exist.

**Step 3: Commit**

```bash
git add TASKS.md
git commit -m "docs: TASKS.md — log camps visibility and on-playa resources linking"
```

---

## Notes for whoever executes this plan

- No automated test framework exists in this project — every "verify" step above is a real manual/SQL check, not a placeholder.
- Every migration task includes both an `apply_migration` step and a "save the file to `supabase/migrations/`" step — both are required per this project's migration-tracking convention.
- Task 3's extraction (hook + shared component) is a pure refactor with no behavior change — verify the camp page looks identical before and after, since a regression there would be easy to miss (it'd look right for someone in one camp and only misbehave for edge cases like an empty member list).
- Task 6 and Task 8 are tightly coupled — `SubmitCampModal`'s `existingResource` prop (needed for Task 8's edit capability) isn't specified in full in Task 6, deliberately, since it depends on re-reading the file's exact post-Task-6 state. Whoever implements Task 8 needs to actually look at the real file, not assume the shape described here is complete.
- `/camps` is deliberately NOT added to `middleware.ts` — no changes to that file anywhere in this plan.
