# Polaroid Photo Frame — Implementation Plan

> **For Claude:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Goal:** Add a `<PolaroidPhoto>` component and wire it into 4 large-image display contexts across the site.

**Architecture:** Single reusable component in `components/PolaroidPhoto.tsx`. It accepts `src`, `alt`, `itemId`, and an optional `imageHeight` prop. Rotation is derived from `itemId` — deterministic, no state. Four call sites swap out their existing image containers for `<PolaroidPhoto>`.

**Tech Stack:** React, TypeScript, inline CSS (React.CSSProperties with `as const` on string literals). No new dependencies.

---

## Context You Need

### Rotation formula
```ts
const rotation = ((itemId % 7) - 3) * 0.7;
// Range: −2.1° to +2.1°. Stable per item ID forever.
```

### Files touched
| File | What changes |
|---|---|
| `components/PolaroidPhoto.tsx` | CREATE — new component |
| `app/find-items/page.tsx` | CardView image area + quick-view modal image area |
| `app/find-items/[id]/page.tsx` | Replace imageWrapper + img |
| `app/@modal/(.)find-items/[id]/page.tsx` | Replace imagePreviewStyle div + img |

### Key current structures

**`app/find-items/page.tsx` — CardView (line ~378):**
```tsx
<div style={cardStyle}>           // has overflow: 'hidden'
  <div style={imageWrapperStyle}> // height: 180px, overflow: 'hidden'
    <ImageSlider images={item.image_urls} />
    <div style={badgeStyle}>...</div>  // position: absolute overlay
  </div>
  ...
```
`cardStyle` has `overflow: 'hidden'` — must change to `'visible'` so rotated frame isn't clipped.

**`app/find-items/page.tsx` — quick-view modal (line ~300):**
```tsx
<div style={{ height: '280px', borderRadius: '12px', overflow: 'hidden', marginBottom: '20px', backgroundColor: '#f0f0f0' }}>
  <ImageSlider images={selectedItem.image_urls} />
</div>
```

**`app/find-items/[id]/page.tsx` — imageWrapper:**
```tsx
const imageWrapper: React.CSSProperties = { borderRadius: '16px', overflow: 'hidden', backgroundColor: '#f0f0f0', height: '260px', border: '1px solid #e5e5e5' };
// Used as: <div style={imageWrapper}><img .../></div>
```

**`app/@modal/(.)find-items/[id]/page.tsx` — imagePreviewStyle:**
```tsx
const imagePreviewStyle: React.CSSProperties = { width: '100%', height: '250px', borderRadius: '16px', overflow: 'hidden', backgroundColor: '#111' };
// Used as: <div style={imagePreviewStyle}><img .../></div>  or  <div style={noImgStyle}>...</div>
```

---

## Task 1: Create `components/PolaroidPhoto.tsx`

**Files:**
- Create: `components/PolaroidPhoto.tsx`

**Step 1: Create the file with this exact content**

```tsx
import { Package } from 'lucide-react';

interface PolaroidPhotoProps {
  src?: string;
  alt: string;
  itemId: number;
  imageHeight?: number;
}

export default function PolaroidPhoto({ src, alt, itemId, imageHeight = 220 }: PolaroidPhotoProps) {
  const rotation = ((itemId % 7) - 3) * 0.7;

  return (
    <div style={{
      backgroundColor: '#fff',
      padding: '10px 10px 28px 10px',
      boxShadow: '0 4px 12px rgba(0,0,0,0.15)',
      transform: `rotate(${rotation}deg)`,
      boxSizing: 'border-box' as const,
      width: '100%',
    }}>
      <div style={{ width: '100%', height: `${imageHeight}px`, overflow: 'hidden' as const, backgroundColor: '#f0f0f0' }}>
        {src ? (
          <img
            src={src}
            alt={alt}
            style={{ width: '100%', height: '100%', objectFit: 'cover' as const, display: 'block' }}
          />
        ) : (
          <div style={{ width: '100%', height: '100%', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#ccc' }}>
            <Package size={48} />
          </div>
        )}
      </div>
    </div>
  );
}
```

**Step 2: Verify it builds (no TypeScript errors)**

Run: `npx tsc --noEmit`
Expected: No errors from PolaroidPhoto.tsx

**Step 3: Commit**

```bash
git add components/PolaroidPhoto.tsx
git commit -m "feat: add PolaroidPhoto component — white frame, thick bottom, rotation by item ID"
```

---

## Task 2: Wire into `app/find-items/page.tsx` — grid card

**Files:**
- Modify: `app/find-items/page.tsx`

**Step 1: Add the import at the top of the file**

Find the existing imports block and add:
```tsx
import PolaroidPhoto from '@/components/PolaroidPhoto';
```

**Step 2: Update `cardStyle` — remove `overflow: 'hidden'`**

Find:
```tsx
const cardStyle: React.CSSProperties = { backgroundColor: '#fff', border: '1px solid #eee', borderRadius: '12px', overflow: 'hidden', boxShadow: '0 2px 8px rgba(0,0,0,0.05)' };
```
Replace with:
```tsx
const cardStyle: React.CSSProperties = { backgroundColor: '#fff', border: '1px solid #eee', borderRadius: '12px', boxShadow: '0 2px 8px rgba(0,0,0,0.05)' };
```

**Step 3: Update `imageWrapperStyle` — remove `overflow: hidden`, add padding for rotation room**

Find:
```tsx
const imageWrapperStyle: React.CSSProperties = { height: '180px', position: 'relative', backgroundColor: '#f0f0f0' };
```
Replace with:
```tsx
const imageWrapperStyle: React.CSSProperties = { position: 'relative' as const, backgroundColor: 'transparent', padding: '12px 12px 0 12px' };
```
(Padding gives visual room for the rotated frame. Height is now controlled by PolaroidPhoto's imageHeight prop.)

**Step 4: Update CardView JSX — swap ImageSlider for PolaroidPhoto**

Find (inside CardView):
```tsx
<div style={imageWrapperStyle}>
  <ImageSlider images={item.image_urls} />
  <div style={badgeStyle}>{item.availability_status === 'Available to Keep' ? 'Keep' : 'Borrow'}</div>
</div>
```
Replace with:
```tsx
<div style={imageWrapperStyle}>
  <PolaroidPhoto src={item.image_urls?.[0]} alt={item.item_name} itemId={item.id} imageHeight={160} />
  <div style={badgeStyle}>{item.availability_status === 'Available to Keep' ? 'Keep' : 'Borrow'}</div>
</div>
```
(imageHeight 160 — smaller than the old 180 to account for the polaroid's own internal padding)

**Step 5: Check badgeStyle is `position: absolute` with a `zIndex`**

Find `badgeStyle` in the style constants. Confirm it has `position: 'absolute'`. If it's missing `zIndex`, add `zIndex: 1`. It should sit on top of the polaroid frame.

**Step 6: Commit**

```bash
git add app/find-items/page.tsx
git commit -m "feat: polaroid frame on find-items grid cards"
```

---

## Task 3: Wire into `app/find-items/page.tsx` — quick-view modal

**Files:**
- Modify: `app/find-items/page.tsx` (same file as Task 2)

**Step 1: Locate the quick-view modal image area (around line 300)**

Find:
```tsx
<div style={{ height: '280px', borderRadius: '12px', overflow: 'hidden', marginBottom: '20px', backgroundColor: '#f0f0f0' }}>
  <ImageSlider images={selectedItem.image_urls} />
</div>
```

Replace with:
```tsx
<div style={{ marginBottom: '20px' }}>
  <PolaroidPhoto src={selectedItem.image_urls?.[0]} alt={selectedItem.item_name} itemId={selectedItem.id} imageHeight={220} />
</div>
```

**Step 2: Commit**

```bash
git add app/find-items/page.tsx
git commit -m "feat: polaroid frame on find-items quick-view modal"
```

---

## Task 4: Wire into `app/find-items/[id]/page.tsx`

**Files:**
- Modify: `app/find-items/[id]/page.tsx`

**Step 1: Add import**

```tsx
import PolaroidPhoto from '@/components/PolaroidPhoto';
```

**Step 2: Replace image container in JSX**

The left column currently has:
```tsx
<div style={imageWrapper}>
  {item.image_urls?.[0] ? (
    <img src={item.image_urls[0]} alt={item.item_name} style={fullImgStyle} />
  ) : (
    <div style={noImgStyle}><Package size={48} /></div>
  )}
</div>
```

Replace the entire `<div style={imageWrapper}>...</div>` block with:
```tsx
<PolaroidPhoto src={item.image_urls?.[0]} alt={item.item_name} itemId={item.id} imageHeight={220} />
```

**Step 3: Remove the now-unused style constants**

Delete these three constants (they're no longer referenced):
```tsx
const imageWrapper: React.CSSProperties = ...
const fullImgStyle: React.CSSProperties = ...
const noImgStyle: React.CSSProperties = ...
```

Also remove `Package` from the lucide-react import if it's no longer used elsewhere in the file.

**Step 4: Run TypeScript check**

Run: `npx tsc --noEmit`
Expected: No errors.

**Step 5: Commit**

```bash
git add app/find-items/\[id\]/page.tsx
git commit -m "feat: polaroid frame on item detail page"
```

---

## Task 5: Wire into `app/@modal/(.)find-items/[id]/page.tsx`

**Files:**
- Modify: `app/@modal/(.)find-items/[id]/page.tsx`

**Step 1: Add import**

```tsx
import PolaroidPhoto from '@/components/PolaroidPhoto';
```

**Step 2: Replace image container in JSX**

Find:
```tsx
<div style={imagePreviewStyle}>
  {item.image_urls?.[0] ? (
    <img src={item.image_urls[0]} alt={item.item_name} style={imgStyle} />
  ) : (
    <div style={noImgStyle}><Package size={48} /></div>
  )}
</div>
```

Replace with:
```tsx
<PolaroidPhoto src={item.image_urls?.[0]} alt={item.item_name} itemId={item.id} imageHeight={200} />
```

**Step 3: Remove unused style constants**

Delete:
```tsx
const imagePreviewStyle: React.CSSProperties = ...
const imgStyle: React.CSSProperties = ...
const noImgStyle: React.CSSProperties = ...
```

Remove `Package` from the lucide-react import if no longer used.

**Step 4: TypeScript check**

Run: `npx tsc --noEmit`
Expected: No errors.

**Step 5: Commit**

```bash
git add "app/@modal/(.)find-items/[id]/page.tsx"
git commit -m "feat: polaroid frame on parallel modal route"
```

---

## Task 6: Push and verify

**Step 1: Push**
```bash
git push
```

**Step 2: Manual verification checklist**

- [ ] `/find-items` grid view — cards show polaroid frame, different tilts per item, badge overlay still visible
- [ ] `/find-items` list view — no polaroid (thumbnails unchanged)
- [ ] `/find-items` — click a card to open quick-view modal — polaroid frame visible
- [ ] `/find-items/[id]` — item detail page shows polaroid frame with rotation
- [ ] Navigate to `/find-items/25` from `/find-items` — parallel modal route shows polaroid frame
- [ ] No-image fallback — item with no photos shows Package icon inside polaroid frame
- [ ] Same item always has same tilt (refresh page, confirm)
