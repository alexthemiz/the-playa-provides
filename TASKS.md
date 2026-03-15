# The Playa Provides — Task List

_Last updated: 2026-03-15 (session 12)_

---

## 🏗️ In Progress
- [ ] **Test spreadsheet import end-to-end in browser** — CSV upload, Excel upload, duplicate detection, error cases
- [ ] **End-to-end test: Following & Notifications** — Follow a user, list a new item as them, verify bell badge + dropdown appears; test mark-as-read and mark-all-read; verify email opt-in; verify /find-items relationship filter

---

## 🔧 Bugs & Fixes
_(nothing queued)_

---

## ⚡ Quick Wins
_(nothing queued)_

---

## 🚀 Features
_(nothing queued yet)_

---

## 🎨 Design & Brand
- [ ] **Profile page mobile layout** — 2-col grid rows may need responsive stacking on small screens

---

## 💡 Ideas & Long Term
- [ ] **Custom Supabase Auth domain** — Upgrade to Supabase Pro, set `auth.theplayaprovides.com` as custom auth domain + DNS config. Fixes Google OAuth consent screen showing `bklycpitofjrjhizttny.supabase.co` instead of the app domain.
- [ ] **Dispute arbitration UI** — Loans with `status = disputed` have no admin UI yet; flagged for future resolution flow.
- [ ] **Notifications for loan/transfer events** — Bell + email only covers new item listings in v1. Future: wire transfer/loan confirmations into the `notifications` table too.
- [ ] **Loan renewal / extension** — Extend return_by date without completing and re-creating the loan.
- [ ] **Friends-only gear visibility** — `visibility` column already stubbed on `gear_items`. Build UI toggle + RLS enforcement when critical mass warrants it.
- [ ] **Camp page claim flow** — Currently claim requests go via email. Future: self-serve claim with verification step.
- [ ] **Camp page editing** — Claimed pages need a UI to edit description, founded year, avatar, banner.
- [ ] **Camp-scoped gear sharing** — Share items with your camp only using `visibility` column + camp membership check.
- [ ] **Inventory-first reframe** — Shift site messaging to lead with gear organization as primary value prop; lending as optional bonus. Affects homepage copy, onboarding flow, and item-add form.
- [ ] **Camps Phase 2** — Needs further scoping. Includes: campmates filter on find-items, self-serve camp page claiming UI, BM API integration for official camp autocomplete, camp gear inventory, playa_resources linking to camp pages.
- [ ] **SEO / noindex for restricted items** — Public items indexable by search engines; campmates-only and followers-only items should have noindex meta tag.
---

## 🧠 Brainstorming
_(nothing queued)_

---

## 🚀 Features (Designed, Ready to Build)
- [ ] **Notification bell: link to item pages** — Clicking a notification in the bell dropdown should navigate to the relevant item page. Defer full messaging system until lending flow warrants it.

---

## ✅ Done
- [x] Feature: Item visibility tiers — `visibility` column on `gear_items` with RLS enforcing public/followers/campmates/private; visibility selector on list-item form, edit modal, and inventory inline toggle; availability↔visibility coupling ('Not Available' → 'private'); owner visibility badge on profile page; "Log In to Request" gate on detail page, parallel modal, and find-items quick-view modal
- [x] Fix: Regular-mode loading hangs (GoTrue lock contention) — header was calling getUser() which held the lock during a network request; switched to getSession() (local cache, ~1ms). Added lockAcquireTimeout: 5000 to fail faster. Added try/catch/finally to resources page so setLoading(false) always fires.
- [x] Fix: Email sender switched to hello@theplayaprovides.com via Resend SMTP (Supabase dashboard config)
- [x] Fix: Profile pages stuck on "Loading..." — root cause: getUser() makes a network call that can hang on expired/refreshing tokens; swapped to getSession() (reads local cache, no network call) for the owner-check
- [x] Fix: Logout button not working — root cause was middleware redirect loop; router.push('/login') raced with getUser() in middleware which still saw a valid session and bounced back; fixed with window.location.href for a clean hard nav
- [x] Design: WelcomeModal tightened — smaller icon, line break in title, X close button, tighter padding
- [x] Fix: `/auth/auth-code-error` page missing (magic link 404)
- [x] Fix: signup stuck on "Loading..." (router.refresh() race)
- [x] Fix: RequestModal stuck on "Sending..." (replaced alert with inline error state)
- [x] Fix: send-request-email edge function 401 (redeployed with --no-verify-jwt)
- [x] Feature: Spreadsheet import modal (upload → map columns → review → bulk insert)
- [x] Feature: Status column moved to 2nd position in inventory table
- [x] Fix: "Import Spreadsheet" renamed to "Import Inventory"
- [x] Fix: Add new location popup too narrow on /list-item (moved outside grid)
- [x] Fix: /resources page showed empty list with stale session (silent retry as anon)
- [x] Fix: Photo upload stuck on "Uploading..." (missing try/catch/finally)
- [x] Fix: Category filter on /inventory had wrong options (synced with list-item categories)
- [x] Fix: Locations dropdown broken for new users (auto-select "Add new location" when no saved locations)
- [x] Fix: Logout button unresponsive (attempt 1) — removed router.refresh() race + added try/catch; root cause turned out to be middleware redirect loop (see above)
- [x] Design: Page headline updates across all routes — "The Playa Provides: ..." branding, personalised with preferred_name on /list-item and /inventory, left-justified
- [x] Fix: "View →" link on /profile/[username] items list — was triggering intercepting route silently; changed to hard nav via &lt;a href&gt;
- [x] Feature: Google OAuth sign-in on /login and /signup
- [x] Feature: Privacy Policy page at /privacy — includes required Google Limited Use disclosure
- [x] Fix: /privacy and /terms added to middleware public routes (footer links now work without auth)
- [x] Design: /about page — replaced lorem ipsum with mission, contact, support, and contribute sections
- [x] Feature: Following & Notifications — `user_follows` + `notifications` tables, DB trigger fan-out, Follow/Unfollow button on profiles, bell icon in header with 30s polling + dropdown, `send-follow-notification` edge function, /find-items relationship filter, /settings email opt-in
- [x] Fix: New users redirected to /login from /find-items and /list-item after signup — root cause was stale Next.js router cache (pre-login redirects cached); fixed by adding router.refresh() to signup page (login page already had it)
- [x] Feature: Followers/Following expandable lists on profile page — owner-only clickable "X followers · Y following" counts in nav row; inline list with avatar, name, follow/unfollow toggle, gear counts (to borrow / to keep); lazy-loaded and cached
- [x] Feature: Lend To / Transfer To flows — escrow-style dual confirmation, email notifications via Resend, new `item_transfers` + `item_loans` tables, TransferModal + LendModal components, pending handover state in /inventory action column, "Items Out on Loan" + "Items I'm Borrowing" + "Items Being Transferred to Me" sections
- [x] Fix: Magic link removed from login page — Gmail pre-fetches single-use tokens and burns them; password + Google OAuth are sufficient
- [x] Design: Item detail page (/find-items/[id]) — light mode redesign, tighter layout, photo 260px, Request Item button below photo, "About this item" label
- [x] Design: Followers/following list table — narrower name column, "Items Available" super-label, show 0 instead of —
- [x] Feature: Polaroid photo frames — white frame, thick bottom, drop shadow, deterministic rotation by item ID; wired into /find-items grid cards (300×300 contain), quick-view modal, item detail page, and parallel modal route
- [x] Feature: Wishlist tag input — always-live cyan chips on profile page; owner adds/removes tags without Edit Profile mode; `wish_list` column migrated to jsonb; lowercase normalization + race-condition guard
- [x] Feature: Homepage polaroid marquee — slow infinite scroll of available items with photos between buttons and triptych; pauses on hover; links to item pages via hard nav (bypasses intercepting route)
- [x] Copy: Homepage triptych updated — "Practice Radical Interdependence", "Track Your Inventory", "Cut Down on Purchasing New Things"
- [x] Design: On-Playa Resources section moved below the triptych on homepage
- [x] Fix: Homepage marquee polaroid links not navigating — root cause: `<Link>` triggered `(.)find-items/[id]` intercepting route, which populated `@modal` slot that root layout doesn't render; fixed with `<a href>` hard nav
- [x] Design: Mobile header — tagline hidden below lg breakpoint (1024px), `w-full` on header fixes background not reaching screen edges, `whitespace-nowrap` on "Offer an Item" link
- [x] Design: /about page — accordion layout (5→3 sections), 4 census charts at 50% width centered, census link, merged Support/Help/Contact into one section
- [x] Design: /resources page — replaced list table with responsive card grid (auto-fill, 260px min)
- [x] Feature: Social links on profile — `social_links jsonb` column on profiles, 6-field edit form inline in profile header, pill buttons in view mode (Lucide icons for FB/IG/LI/Globe; text for Bluesky/ePlaya)
- [x] Feature: Playa story field on profile — `playa_story text` column, textarea in edit mode, displayed in view mode below bio section
- [x] Design: Profile page layout restructure — Row 1: avatar+name/location/social links; Row 2: bio | wishlist; Row 3: story + playa history stacked
- [x] Feature: Camps layer Phase 1 — `camps` + `user_camp_affiliations` tables with RLS; multi-entry camp affiliation editor on profile (year dropdown, camp autocomplete with freeform stub creation, Open Camping option); profile view mode reads affiliations first with legacy burning_man_years/burning_man_camp fallback; /camps/[slug] page with unclaimed banner + member list + claimed layout