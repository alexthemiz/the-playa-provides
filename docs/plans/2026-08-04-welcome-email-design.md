# Welcome Email — Design

**Goal:** Send a one-time welcome email at signup that nudges new users through onboarding, gives them a quick-reference of their own account details, and makes it easy to pass the site along to friends and campmates.

**Status:** Design approved. Reference mockup: see conversation history for the final iterated HTML (functionally identical to what's described below); the implementation plan should treat this doc as the source of truth for content/structure, not re-derive copy from scratch.

## Scope

Single email, sent once, at signup. No follow-up/reminder sequence (considered and explicitly deferred — see Alternatives Considered).

## Trigger

Follows the existing codebase convention used by all 11 other transactional emails (`send-loan-notification`, `send-transfer-notification`, `send-informal-loan-invite`, etc.): a client-side `supabase.functions.invoke('send-welcome-email', {...})` call fired from [app/signup/page.tsx](app/signup/page.tsx) immediately after `supabase.auth.signUp()` succeeds. Not a DB trigger — no existing email in this codebase uses `pg_net`/DB-trigger dispatch except the unrelated `send-daily-report` cron job, and there's no reason to introduce a new pattern here.

## Visual style

Plain, functional HTML matching the existing 11 transactional emails (sans-serif, inline styles, table-based layout for email-client compatibility) — not the site's branded Arvo/Space Mono look, since custom webfonts are stripped by most email clients (Gmail, Outlook) and would silently fall back to a generic serif anyway. Chosen after comparing both directly.

Two brand-asset images are needed (both generated via a throwaway `next/og` `ImageResponse` route during design, matching the pattern in `app/opengraph-image.tsx` — reuse `components/RadialPlayaMotif.tsx`):
- **Header banner** (600×150, paper background, ink/teal wordmark, faint motif) — links to `https://theplayaprovides.com`.
- **Footer banner** (600×120, dark ink background, paper/teal wordmark, faint motif in paper) — a dark twin of the header, so the email opens and closes with the same visual language instead of two unrelated treatments.

Both images need to be hosted at a stable public URL for the real send (Resend requires accessible image URLs, not data URIs, for reliable rendering across clients). Recommend a permanent route (e.g. `app/api/email-assets/welcome-header/route.tsx` and `welcome-footer/route.tsx`) rather than regenerating a throwaway route per send.

## Content structure (top to bottom)

1. **Header banner image**, hyperlinked to the site.
2. **Greeting**: "Welcome, {preferred_name or username}!"
3. **Intro line** (reuses the homepage's existing hero subhead for brand consistency): "Lend what you've got, borrow what you need, and cut down on all those online purchases."
4. **Checklist** (6 items, mirrors [components/ChecklistBox.tsx](components/ChecklistBox.tsx) items 1–5, plus one new item):
   - Add your **2026 camp and playa history** (links to `/profile/{username}`)
   - Add an item **to your inventory** (links to `/add-item`), then list it or keep it private
   - Add items to **your wish list** (links to `/profile/{username}`) so others know what you need
   - Set an **item location** (links to `/settings`) (home, storage, etc.)
   - Browse **what's available** (links to `/find-items`) to borrow or keep
   - **Share the site** (mailto: link, see below) with your friends and campmates
5. **Two CTA buttons side by side**, styled to match the site's real button convention (`border: 2px solid #1C1610; box-shadow: 3px 3px 0 #1C1610`, no border-radius):
   - "Fill out your profile →" — teal (`#1E8A82`, matches site's primary/borrow-flow color), links to `/profile/{username}`
   - "Add to your inventory →" — mustard (`#D4A020`, matches site's gift/transfer-flow color), links to `/add-item`
6. **Feedback line**: "Have feedback, find a bug, or just want to say hi? Email Alex or reply here. We'd love to hear from you." — third person, present tense, no em dashes (per explicit feedback). "Email Alex" links to `mailto:alex@theplayaprovides.com`. **"Reply here" requires the edge function to set a `reply_to: 'alex@theplayaprovides.com'` header on the Resend send** — without it, replies land at `hello@theplayaprovides.com` (the `from` address) instead, making the copy false. This is a hard requirement for the implementation, not optional polish.
7. **Your Account Details** (centered, small/quiet styling — reads as a confirmation, not a form): Username, Preferred Name, Contact Email, right-aligned values, label left. "Edit in Settings" link below.
8. **Footer banner image** (dark), followed by centered: website + Instagram icon links (inline SVG, degrades to text-only in Outlook desktop — acceptable, noted and accepted), About/Terms/Privacy links, and required disclosure text: "You're getting this one-time email because an account was just created at The Playa Provides with this address. There's nothing to unsubscribe from — we don't send marketing email, and you won't get another one of these. Didn't create this account? You can safely ignore it." Plus the standard "Not affiliated with or endorsed by Burning Man Project" line used elsewhere on the site.

## "Share the site" mechanism

Not a dedicated button/section (an earlier draft had one, cut — see Alternatives Considered). Instead, the 6th checklist item's link is a `mailto:` link with a pre-filled subject and body (works with zero JavaScript, unlike a "copy link to clipboard" button which cannot function inside an email at all — email clients strip `<script>` entirely). Body links to `https://theplayaprovides.com/signup?ref={username}`.

## Referral attribution (lean version — no UI)

Add a `referred_by` column to `profiles` (or equivalent). On signup, if the URL carries `?ref={username}`, store the referring username on the new profile row. No dashboard, no stats UI, no reward/incentive program — purely a quiet attribution trail queryable later if it ever becomes useful. This was scoped down explicitly from a heavier "unique codes + stats page" version that was rejected as out-of-scope for this task.

## Alternatives considered and rejected

- **Dedicated "Invite a campmate" button/section**: cut. The button's own label didn't match what clicking it actually did (it opened the *account owner's own* signup link, not an invite action), and it duplicated the "forward this email" nudge already present. Folded into the checklist instead, using a `mailto:` compose-prefill link, which is both simpler and functionally honest about what the click does.
- **"Copy share link to clipboard" button**: rejected as technically infeasible — email clients strip JavaScript, so clipboard APIs cannot run from an email.
- **Follow-up reminder email** if checklist incomplete: rejected for v1 to keep scope to a single send; would need `pg_cron`-style delayed dispatch (like `send-daily-report`) if revisited later.
- **Full referral program** (unique codes, stats dashboard, rewards): rejected as a separate, larger feature outside this task's scope.
- **First-person, "hi I'm Alex" feedback copy**: rejected — email sends from `hello@`, not a personal address, so first-person voice was misleading. Switched to third-person/brand voice.

## Open implementation questions (for the plan to resolve, not blocking design approval)

- Exact hosting approach for the two banner images (permanent API route vs. static asset — recommend the former per above).
- Where exactly `referred_by` lives (new column on `profiles` vs. a separate table) — likely just a nullable column, but confirm against existing schema conventions during planning.
- Confirm Resend's `reply_to` field name/shape against the SDK version already in use elsewhere in this codebase.
