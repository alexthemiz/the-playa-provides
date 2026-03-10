# Homepage Polaroid Marquee — Implementation Plan

> **For Claude:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Goal:** Add a slow infinite horizontal marquee of polaroid-style item photos between the Borrow/Lend buttons and the triptych section, and move the On-Playa Resources section below the triptych.

**Architecture:** Single file change — `app/page.tsx`. Add Supabase data fetch in `useEffect` for available items with images, render them in a CSS `@keyframes` marquee with duplicate items for seamless looping. Hover pauses the animation via React state. Resources section cut from hero and pasted after the triptych.

**Tech Stack:** Next.js 16 App Router (client component), React 19, Supabase `@supabase/ssr` browser client, `PolaroidPhoto` component, inline `<style>` tag for keyframes, inline React CSS.

---

## Context You Need

### Current `app/page.tsx` structure

```
'use client'
import Link from 'next/link'

HomePage():
  <div>                                    ← page wrapper
    <section>                              ← hero
      <h1>The Playa Provides</h1>
      <p>tagline</p>
      <div> Borrow / Lend buttons </div>   ← line 31–34
      <div> Resources link/button </div>   ← lines 37–42 (MOVE THIS)
    </section>
    <section>                              ← triptych (3-column grid)
      Gift/Lend card
      Digital Inventory card
      Reduce card
    </section>
  </div>
```

### PolaroidPhoto component

Already exists at `components/PolaroidPhoto.tsx`. Props:
- `src?: string` — image URL
- `alt: string`
- `itemId: number`
- `imageSize?: number` — when set, renders a fixed square with `objectFit: contain`

With `imageSize={160}`, the outer frame is `180px` wide (160px image + 10px padding each side).

### Marquee loop math

Render `[...items, ...items]` (items duplicated). Animate `translateX(0)` → `translateX(-50%)`. When the first copy has scrolled fully off screen, the second copy is in exactly the same position as the first started — seamless loop. Duration 60s = slow crawl.

### Supabase client import

```tsx
import { supabase } from '@/lib/supabaseClient';
```

---

## Task 1: Update `app/page.tsx`

**Files:**
- Modify: `app/page.tsx`

This task has 7 steps. Make all changes, then commit once at the end.

---

### Step 1: Add imports

Replace the current import block at the top of the file:

```tsx
'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { supabase } from '@/lib/supabaseClient';
import PolaroidPhoto from '@/components/PolaroidPhoto';
```

---

### Step 2: Add state inside `HomePage`

Add these two state variables at the top of the `HomePage` function body, before the `return`:

```tsx
const [marqueeItems, setMarqueeItems] = useState<any[]>([]);
const [marqueeHovered, setMarqueeHovered] = useState(false);
```

---

### Step 3: Add `useEffect` to fetch items

Add this `useEffect` immediately after the state declarations:

```tsx
useEffect(() => {
  async function fetchMarqueeItems() {
    const { data } = await supabase
      .from('gear_items')
      .select('id, item_name, image_urls, availability_status')
      .in('availability_status', ['Available to Borrow', 'Available to Keep'])
      .limit(20);

    // Only show items that have at least one image
    const withImages = (data || []).filter(
      (item: any) => Array.isArray(item.image_urls) && item.image_urls.length > 0
    );
    setMarqueeItems(withImages);
  }
  fetchMarqueeItems();
}, []);
```

No error handling needed — if it fails, `marqueeItems` stays `[]` and the marquee simply doesn't render.

---

### Step 4: Add `<style>` tag for keyframes

Add this as the **first child** inside the outermost `<div>` (the page wrapper, line 7), before the hero `<section>`:

```tsx
<style>{`
  @keyframes marquee {
    from { transform: translateX(0); }
    to   { transform: translateX(-50%); }
  }
`}</style>
```

---

### Step 5: Update hero section — remove Resources block

The hero `<section>` currently ends with a Resources div (lines 37–42). Remove it entirely:

**Remove this block from the hero section:**
```tsx
{/* Secondary Resources Action */}
<div style={{ maxWidth: '600px', margin: '0 auto' }}>
  <p style={{ fontSize: '1rem', color: '#666', marginBottom: '16px' }}>
    Find the camps providing services that make Burning Man more sustainable
  </p>
  <Link href="/resources" style={resourceBtn}>On-Playa Resources</Link>
</div>
```

Also remove the `marginBottom: '48px'` from the Borrow/Lend buttons wrapper (line 31), replacing it with `marginBottom: '0'` — the marquee provides its own spacing.

The hero `<section>` after this change ends cleanly after the Borrow/Lend buttons div.

---

### Step 6: Add marquee section + move Resources section

After the closing `</section>` of the hero and **before** the opening `<section>` of the triptych, insert:

```tsx
{/* Polaroid Marquee */}
{marqueeItems.length > 0 && (
  <div style={{ overflow: 'hidden' as const, width: '100%', padding: '40px 0', backgroundColor: '#FAF9F6' }}>
    <div
      onMouseEnter={() => setMarqueeHovered(true)}
      onMouseLeave={() => setMarqueeHovered(false)}
      style={{
        display: 'flex',
        gap: '24px',
        width: 'max-content',
        animation: 'marquee 60s linear infinite',
        animationPlayState: marqueeHovered ? 'paused' : 'running',
        paddingLeft: '24px',
      }}
    >
      {[...marqueeItems, ...marqueeItems].map((item: any, i: number) => (
        <Link
          key={i}
          href={`/find-items/${item.id}`}
          style={{ textDecoration: 'none', flexShrink: 0 }}
        >
          <PolaroidPhoto
            src={item.image_urls[0]}
            alt={item.item_name}
            itemId={item.id}
            imageSize={160}
          />
        </Link>
      ))}
    </div>
  </div>
)}
```

After the closing `</section>` of the triptych, insert the Resources section:

```tsx
{/* On-Playa Resources */}
<div style={{ textAlign: 'center' as const, padding: '20px 20px 60px' }}>
  <p style={{ fontSize: '1rem', color: '#666', marginBottom: '16px' }}>
    Find the camps providing services that make Burning Man more sustainable
  </p>
  <Link href="/resources" style={resourceBtn}>On-Playa Resources</Link>
</div>
```

---

### Step 7: Commit

```bash
git add app/page.tsx
git commit -m "feat: polaroid marquee on homepage + move resources below triptych"
```

---

## Task 2: Manual verification

**Step 1: Run dev server**
```bash
npm run dev
```

**Step 2: Visit `/` in the browser**

Check:
- [ ] Marquee appears between the Borrow/Lend buttons and the triptych
- [ ] Polaroids scroll slowly left, continuously
- [ ] Hovering over the marquee pauses the animation
- [ ] Unhovering resumes scrolling
- [ ] Each polaroid is clickable — clicking takes you to `/find-items/[id]`
- [ ] Polaroids show the correct tilt (different per item ID)
- [ ] On-Playa Resources section appears below the triptych, not above it
- [ ] If database has fewer than ~10 items, looping is visible but not jarring

**Step 3: Check empty state**

If you want to test empty state: temporarily change `limit(20)` to `limit(0)` and verify the marquee section doesn't render at all (no blank gap).

**Step 4: Push**
```bash
git push
```
