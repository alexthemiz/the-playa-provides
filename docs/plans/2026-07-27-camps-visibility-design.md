# Camps Visibility & On-Playa Resources Linking — Design

## Overview

Camps are currently almost invisible in the app: there's no nav link, no `/camps` index, and the only way to reach a camp's page is a link on someone's profile (if they happen to have a camp affiliation shown). This is largely accidental rather than a deliberate privacy decision — nothing in the project's history documents camps being hidden on purpose. Meanwhile, camp membership is the key that unlocks a real feature (campmate-only gear lending), so making it easier to find and manage your own camp(s) is a legitimate, low-risk improvement.

Separately, the on-playa resources directory (`/resources`, populated via the "Submit Your Camp" form) has never been connected to the real camps system — a resources listing is just a free-text camp name with no link to an actual camp record. This design also closes that gap.

## Scope

**In scope:**
- A "My Camps" link in the header nav (logged-in only) and a new `/camps` page aggregating a member's own camp(s).
- Connecting `playa_resources` (the on-playa services directory) to real `camps` records, so a claimed camp's owner can submit/manage their listing from their own camp page, pre-filled from data that already exists.

**Explicitly not in scope (decided against during brainstorming, not omitted by accident):**
- A public directory/browser of all ~5,463 camps. Camp hubs are private by design (gear visibility is member-only), so browsing camps you're not in has no payoff and undermines that model.
- Any change to how someone actually joins a camp. It stays exactly as it is today: self-service, via the Playa History section of your own profile, no verification. This is already an honor-system process; nothing here makes it more or less so.
- Any change to the non-member message on a camp's own page ("Only members of this camp can view this list"). Deliberately kept terse rather than turned into an inviting call-to-action, so it doesn't read as "join here to unlock the gear list."
- Guest (logged-out) access to `/camps`. See "Header & Access" below for why.
- A request-to-join-with-owner-approval flow. This would be the only way to make camp membership actually verified rather than self-declared, but it only works for the 4 currently-claimed camps, and is a meaningfully bigger feature on its own. Noted for a future session, not built here.
- Backfilling old `playa_resources` rows with a `camp_id`. Moot — there is currently exactly one row in that table, so there's nothing to backfill.

## Header & Access

"My Camps" is added to the header nav in the same place and the same way as My Inventory / My Profile / Settings: it simply doesn't render for a logged-out visitor. `/camps` is not added to `middleware.ts`'s public-route whitelist, so it inherits the same default-gated behavior those other pages already get — a logged-out visitor who somehow hits the URL directly gets redirected to `/login`, same as today. **No middleware changes at all.**

This was a real fork earlier in the design: showing custom text like "log in to view your camps" *on* the page (rather than a redirect) would have required whitelisting `/camps` for guests — the same category of change made once before for the lending feature's claim page. Once framed as "My Camps" (a personal utility, not a discovery/marketing page), there's no guest-facing content to justify that cost, so the redirect-only behavior is both cheaper and more consistent with the rest of the app.

## `/camps` Page

Two sections, both members-only (page itself requires login):

**Your Camps** — one sub-section per camp the current user is affiliated with (from `user_camp_affiliations`). Each sub-section shows:
- The camp's name, linking to its full `/camps/[slug]` page.
- A full copy of that camp's "Items from Camp Members" table — the exact same query/component the camp's own page already uses, not a summary. If someone is in two camps, they see two full tables stacked; one camp, one section.

If the user has no camp affiliation yet, this section shows an empty state instead, pointing at the search below and at Playa History.

**Find your camp** — a search box reusing the same lookup already built into the profile editor (`ilike` search against `camps.display_name`). Selecting a result links to that camp's `/camps/[slug]` page. This doesn't join anything by itself — it's a lookup, not a join action.

Below both: a plain link, "Update your Playa History on your profile →". Playa History remains the only place that actually records a camp affiliation — nothing here duplicates that.

**Not on this page:** "Submit Your Camp" / the on-playa resources form. That's a distinct concept (a camp offering public services on playa) from a camp's TPP presence, and stays where it already lives (homepage, `/resources`) — see below for how the two get connected instead.

## Camps ↔ On-Playa Resources Linking

### Data model changes (`playa_resources`)

- Add `camp_id uuid null references public.camps(id) on delete set null` — nullable because anonymous submissions with no matching camp still won't have one; `set null` (not cascade) because a resources listing should survive even if the linked camp record is ever removed.
- Drop `homebase_city`, `homebase_state`, `homebase_zip`; add a single `homebase text` column, matching `camps.homebase`'s actual shape (a freeform string like "Brooklyn, NY" — never structured city/state/zip). Safe to do outright since the table currently has exactly one row.
- Add `camp_description text` (nullable).
- `website` and `instagram` already exist as their own columns and need no schema change — see field mapping below.

### Field mapping (auto-fill on camp selection)

Camps don't have a dedicated "website" column — a camp's own site lives at `social_links->>'website'` (a jsonb field also holding `instagram`/`facebook`/etc.), with `bm_homepage_url` (Burning Man's own registry link, synced automatically) as a fallback when a camp hasn't set their own site.

| `playa_resources` field | Source | Notes |
|---|---|---|
| `camp_name` | `camps.display_name` | |
| `homebase` | `camps.homebase` | direct copy, same shape |
| `website` | `camps.social_links.website`, else `camps.bm_homepage_url` | |
| `instagram` | `camps.social_links.instagram` | |
| `location_address` | `camps.playa_location` | mostly empty today (BM hasn't published 2026 placements yet); auto-fills for free once that data exists |
| `camp_description` (new) | `camps.description` | |

`offering_category`, `description` (the "Description of Service" field), `public_email`, `contact_email`, `submitter_name`, `accepting_campers` have no corresponding camp field and stay manual, as today.

Auto-fill only writes into fields that are still empty at the moment a camp is selected — it never overwrites something the submitter already typed.

Auto-filled values are stored as ordinary column values at submit time, not derived live from a join. A resources listing reflects what was true when it was submitted; if a camp's bio changes later, existing listings don't silently change with it. This matches the fields' treatment consistently — no field in this form is special-cased as a live join.

### Form changes (`SubmitCampModal`)

- The `camp_name` free-text input becomes a search-and-select (same `ilike` lookup pattern used elsewhere). Selecting a real camp sets the hidden `camp_id` and triggers the auto-fill above. No match found → falls back to typing a name manually, `camp_id` stays null, exactly like today's behavior.
- New field: **"Camp Description"**, placed alongside the existing field (labeled "Description of Service" — unchanged, no rename needed since that's already the current label).
- No change to moderation: every submission — anonymous or from a claimed camp's own edit panel — still inserts with `is_verified: false` and goes through the same manual review. No auto-verification for claimed-camp submissions, at least for now.

### Camp edit panel (`/camps/[slug]`, claimed camps only)

New "On-Playa Resources" section, visible only in the existing owner-only edit mode:
- If the camp has no linked listing yet: a "List an on-playa offering →" button opens the same submission form, but with the camp already selected/locked (no search step) and every mappable field pre-filled immediately.
- If it already has one or more listings (a camp can have several, one per `offering_category`, matching the existing one-category-per-row model): show them, with the ability to open the same form pre-filled with the existing values to edit.

### `/resources` page

Any listing with `camp_id` set gets a "View camp page →" link to `/camps/[slug]`, so a Burning Man visitor browsing resources can click through to see the camp's real TPP presence.

## Testing

No automated test suite exists in this project — verification is `npx tsc --noEmit` plus manual/SQL checks, matching every other feature built this way so far. Specific things to verify once built:
- "My Camps" nav link is absent when logged out; `/camps` redirects to `/login` for a logged-out direct visit (no change in behavior, just confirming nothing broke).
- A user in 2 camps sees 2 full item tables on `/camps`; a user in 0 camps sees the empty state.
- Camp search on `/camps` and in `SubmitCampModal` returns real matches and links/selects correctly.
- Selecting a camp in `SubmitCampModal` auto-fills only empty fields, using real data from a camp that has `homebase`/`social_links`/`description` populated.
- A submission with no camp match still saves correctly with `camp_id` null.
- The claimed-camp-owner submission path pre-fills correctly and still lands with `is_verified: false`.
- `/resources` shows "View camp page →" only for listings with a `camp_id`, linking to the right slug.
