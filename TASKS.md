# The Playa Provides — Task List

_Last updated: 2026-03-18 (session 17)_

---

## 🏗️ In Progress / Needs Testing
- [ ] **Test spreadsheet import end-to-end in browser** — CSV upload, Excel upload, duplicate detection, error cases
- [ ] **End-to-end test: Following & Notifications** — Follow a user, list a new item as them, verify bell badge + dropdown appears; test mark-as-read and mark-all-read; verify email opt-in; verify /find-items relationship filter
- [ ] **End-to-end test: Return flow** — Borrower clicks Return Item → owner sees Confirm Return → owner confirms → item goes back to Not Available
- [ ] **Deploy `send-dispute-notification` edge function** — paste `supabase/functions/send-dispute-notification/index.ts` into Supabase Dashboard, toggle Verify JWT off

---

## 🔧 Bugs & Fixes
- [ ] **Visibility constraint error — user-friendly copy** — When a user selects "People I Follow" or "Campmates" visibility but has no followers or camp affiliations, the site shows a raw database constraint error. Replace with friendly copy explaining why the option isn't available.
- [ ] **Item request notifications not wired to bell** — Requests currently only trigger an email via the `send-request-email` edge function; no row is inserted into the `notifications` table. Add a notification insert to the request flow (edge function or client-side after send) so the bell picks it up.
- [ ] **Notification bell not wired to transfer acceptance** — When a transfer is accepted or declined by the recipient, no bell notification fires for the initiating party. The `notifications` table has `transfer_accepted` and `transfer_declined` types and the header switch handles them, but the insert is missing from the transfer confirmation flow.



---

## ⚡ Quick Wins
- [ ] **Resources page: move "Submit Your Camp" button** — move to top right corner, style to match the "Add New Item" button on /inventory or "Edit Profile" button on /profile/[username]

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
- [ ] **Loan renewal / extension** — Extend return_by date without completing and re-creating the loan.
- [ ] **Camp-scoped gear sharing** — Share items with your camp only using `visibility` column + camp membership check.
- [ ] **Inventory-first reframe** — Shift site messaging to lead with gear organization as primary value prop; lending as optional bonus. Affects homepage copy, onboarding flow, and item-add form.
- [ ] **Camps Phase 2** — Needs further scoping. Includes: campmates filter on find-items, self-serve camp page claiming UI, BM API integration for official camp autocomplete, camp gear inventory, playa_resources linking to camp pages.
- [ ] **SEO / noindex for restricted items** — Public items indexable by search engines; campmates-only and followers-only items should have noindex meta tag.
- [ ] **Incomplete profile nudge** — Some users have NULL full_name (and potentially other required fields) from before required field validation was added. Options: (A) Soft banner at top of /settings page if required fields are missing — non-blocking, just a nudge; (B) One-time modal after login prompting user to complete their profile, dismissible and non-blocking; (C) Validate only on save — no proactive warning, error only appears when user next visits /settings and tries to save. Option B is most user-friendly at scale.
- [ ] **Borrowed item detail page** — When an item is currently out on loan, determine what shows on the unique item page for: (1) the borrower, (2) the owner, (3) anyone else. Should "Request this item" be hidden? Should there be a loan status indicator?
- [ ] **Return flow limbo/reminder** — If owner never confirms return after borrower clicks "Return Item", send daily bell notification to owner. Add option for borrower to ping owner with a reminder button.
---

## 🧠 Brainstorming
_(nothing queued)_

---

## 🚀 Features (Designed, Ready to Build)
- [ ] **Signup page required fields** — Add Preferred Name, Username, and Full Name fields to the signup form so new users aren't created with NULL required fields. Redirect to /settings is the fallback but capturing at signup is cleaner.
- [ ] **Notification types Phase 2** — Wire remaining transfer/loan/return events into the `notifications` table and bell. Most types are now in the schema and header switch; gaps: transfer acceptance bell insert, item request bell insert, loan return confirmation (done), any remaining edge cases.

---

## ✅ Done
- [x] Feature: Settings page overhaul — Identity & Contact rename/reorder, pronouns field (DB migration), required asterisks, address card layout with "Set as default" checkbox, default location pre-select on /list-item and AddItemModal, Account & Security section (Change Email, Change Password with OAuth detection, Delete Account modal), zip_code field added
- [x] Feature: Delete Account — two-step confirmation modal in settings, `delete-account` edge function (scrubs profile PII, marks gear owner_deleted+private, unlinks camps, deletes follows/notifications/affiliations/loans/transfers, then calls auth.admin.deleteUser), homepage `?deleted=true` banner, owner_deleted guard on item detail + parallel modal + find-items query
- [x] Fix: Delete account FK chain — resolved series of blocking constraints: `item_loans/item_transfers` NO ACTION on profiles.id → CASCADE; `gear_items.location_id` NO ACTION → SET NULL; `social_links` NOT NULL conflict → set to `{}`; `gear_items.user_id` NOT NULL conflict with SET NULL FK rule → dropped NOT NULL
- [x] Design: Header hamburger menu backdrop div, logo `______` underscore span in header + footer
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
- [x] Feature: Find-items campmates filter — "My Campmates" multi-select chip on /find-items; campmate IDs fetched from user_camp_affiliations; filter chips for Everyone / People I Follow / People Who Follow Me / My Campmates (multi-select, independent toggles)
- [x] Feature: Notification bell full wiring — type-based text + href switch for new_item, new_follower, transfer_accepted/declined, loan_accepted/declined, item_request, camp_join; camp_id column added to notifications; 5 new DB triggers (new_follower, transfer_accepted/declined, loan_accepted/declined, camp_join)
- [x] Feature: Camp page claim flow — inline form replaces mailto link; `camp_claim_requests` table with RLS + approval/denial triggers; `send-camp-claim-notification` edge function emails support; bell cases for camp_claim_approved/denied; approval auto-sets is_claimed + page_owner_id and denies other pending requests
- [x] Fix: Camp claim triggers — `user_id` → `recipient_id` in notifications INSERT; added CHECK constraint on `camp_claim_requests.status` ('pending'|'approved'|'denied'); expanded `notifications_type_check` constraint to cover all 10 notification types
- [x] Feature: Camp page updates — (page owner) label inline in members list; "Years Attended" column header; "Items from Camp Members" section with grid/list toggle, member item fetch (available + public/campmates visibility), quick-view modal with URL sync (/camps/[slug]/[id]), Request Item button; members list appears first, items section second; items default to list view; PolaroidPhoto `noRotate` prop added to prevent card overflow
- [x] Feature: Camp page editing + member management — edit mode panel (display name, description, founded year, homebase, social links, banner upload); member grid with Wish List / Years Attended / Returning in 2026? / Actions columns; admin can set roles, transfer ownership, remove members; non-member items gate; camp_member_removed bell notification
- [x] Feature: Camp page + profile 2026 returning status — DB: `returning_status` on `user_camp_affiliations`, `returning_2026` on `camps`; profile edit: Returning in 2026 field (Yes/Maybe/No chips + camp autocomplete), year cap at 2025, playa_story moved below history; camp members: per-member returning badge scoped to this camp; camp social links: edit trimmed to Facebook/Instagram/Website; camp layout: homebase plain text, conditional playa address display, "Returning in 2026?" select in edit form