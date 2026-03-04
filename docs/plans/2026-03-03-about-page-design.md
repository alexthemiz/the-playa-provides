# Design: About Page Overhaul

**Date:** 2026-03-03
**Status:** Approved
**Scope:** Overwrite `app/about/page.tsx` — no new routes, no new components, no state

---

## Goal

Replace the lorem ipsum placeholder on `/about` with real content that serves three purposes:
1. Tells visitors what the platform is and why it exists
2. Gives users a clear way to contact us
3. Invites support (donations) and collaboration (feature ideas, code help)

---

## Page Structure

Single-column flowing layout, `max-width: 720px`, consistent with `/privacy` styling. Four sections separated by horizontal dividers.

### Section 1 — Mission
- Headline: `The Playa Provides: About`
- 2–3 sentences: what the platform is, who it's for, the radical gifting / community ethos of Burning Man that inspired it.

### Section 2 — Get in Touch
- Short lead-in: questions, bugs, feedback, ideas — all welcome.
- Prominent `mailto:hello@theplayaprovides.com` link.

### Section 3 — Support the Project
- Soft, low-pressure tone: the site is free and will stay free; it costs time and money to run; if you've found value in it, contributions are appreciated.
- No payment link for now — Venmo exists but is not linked yet. Section can be updated when a public donation link is ready.

### Section 4 — Help Build It
- Community project framing: open to feature ideas and code/design contributors.
- Same email link as Section 2.

---

## Constraints
- Inline React CSS (`React.CSSProperties`) with `as const` for literals — no Tailwind in JSX
- Static content only — no client state, no `'use client'` directive needed
- Footer already links to `/about`; no footer changes required
- `/about` is already in the middleware public routes; no middleware changes needed

---

## Out of Scope
- Venmo / donation link (deferred until a public payment link is set up)
- FAQ content (not needed yet; can be added as a fifth section later)
- Separate `/contact` route
