# Design: Polaroid-Style Item Photos

**Date:** 2026-03-09
**Status:** Approved

## Goal

Add a polaroid-style frame to all large item photo display contexts across the site — white border, thicker at the bottom, subtle drop shadow, slight rotation unique to each item. Small thumbnails (50px table cells) are excluded.

## Approach

**Option A selected:** New `<PolaroidPhoto>` reusable component. Single source of truth for the frame style. All call sites import and use it.

## Component Spec

**File:** `components/PolaroidPhoto.tsx`

**Props:**
- `src: string` — image URL
- `alt: string` — alt text
- `itemId: number` — used to derive deterministic rotation

**Visual spec:**
- Outer wrapper: `backgroundColor: '#fff'`
- Padding: `10px 10px 28px 10px` — uniform sides, thick bottom (the polaroid caption space)
- Box shadow: `0 4px 12px rgba(0,0,0,0.15)`
- Border-radius: `0` — polaroids have sharp corners
- Rotation: `((itemId % 7) - 3) * 0.7` degrees → range ±2.1°, stable per item
- Inner `<img>`: `width: 100%`, `height: 100%`, `objectFit: 'cover'`, `display: 'block'` (no baseline gap)
- No-image fallback: centered `<Package>` icon on light grey background

## Where It's Used

| Context | File | Notes |
|---|---|---|
| Grid card image | `app/find-items/page.tsx` | Replaces existing `imageWrapperStyle` + ImageSlider; first image only |
| Quick-view inline modal | `app/find-items/page.tsx` | Replaces ImageSlider in the modal overlay |
| Item detail page | `app/find-items/[id]/page.tsx` | Replaces `imageWrapper` div + img tag |
| Parallel modal route | `app/@modal/(.)find-items/[id]/page.tsx` | Same treatment |

## What Doesn't Change

- `<ImageSlider>` component — untouched, still used for full carousel contexts if needed in future
- All 50px thumbnails (inventory table, find-items list view, profile gear list)
- Upload preview images in `/list-item` and `AddItemModal`
- User avatars

## Layout Notes

- Grid card: parent card's image area needs `overflow: visible` so shadow and rotation don't get clipped. The card's own border-radius stays on the card container, not the image wrapper.
- The `PolaroidPhoto` component controls its own dimensions via its wrapper; call sites set the container height via a wrapping div if needed.

## Rotation Math

```ts
const rotation = ((itemId % 7) - 3) * 0.7;
// itemId % 7 → 0–6
// minus 3 → -3 to +3
// times 0.7 → -2.1° to +2.1°
```

Seven slots means adjacent items in a list rarely have the same tilt, and the pattern only repeats every 7 items.
