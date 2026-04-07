# The Playa Provides — Task List

_Last updated: 2026-04-07 (session 25)_

---

## ✅ Session Start Checklist
1. Read **In Progress** and **Bugs** sections — what's actually unfinished?
2. Pick **one primary goal** for this session
3. If something comes up mid-session, ask: is this blocking my goal or a tangent? If tangent, log it and move on.
4. **End of session:** update TASKS.md before closing out

---

## 🎯 Next Session Priority
- [ ] **Fix OG image crop** — Resize to 1200×630px with padding/background in Canva, re-upload, re-push.

---

## 🏗️ In Progress / Needs Testing
- [ ] **Test spreadsheet import end-to-end in browser** — CSV upload, Excel upload, duplicate detection, error cases. (`fix/spreadsheet-import-user-id` merged — ready to test.)
- [ ] **End-to-end test: Following & Notifications** — Follow a user, list a new item as them, verify bell badge + dropdown appears; test mark-as-read and mark-all-read; verify email opt-in; verify /find-items relationship filter. _(Fully implemented in code — this is a testing task only, not a build task.)_
- [ ] **End-to-end test: Return flow** — Borrower clicks Return Item → owner sees Confirm Return → owner confirms → item goes back to Not Available. _(Fully implemented in code — this is a testing task only, not a build task.)_

---

## 🔧 Bugs & Fixes
- [ ] **Welcome modal fires on every login** — Should only show once per account (first login only). Investigate current trigger mechanism and fix so repeat logins don't show the modal.
- [ ] **OG preview image gets cropped when sharing links** — Current image is not 1200×630px. Resize with padding/background in Canva, re-upload to repo, re-push.
---

## ⚡ Quick Wins
- [ ] **Delete orphaned `/app/profile/page.tsx`** — Old "My Gear Manager" page, never linked to, uses outdated patterns (hardcoded dark theme, `burner_user_name` localStorage, stale column names). Safe to delete.
- [ ] **Investigate `/app/auth/page.tsx`** — May be an unlinked leftover. Check if anything routes to it before deleting.

---

## 🚀 Features
- [ ] **Resources directory submission from camp edit panel** — Visible only to logged-in camp page owners. Pre-fills camp name and pulls contact email from page owner's profile. Submits for backend approval same as the public form. Framed as a benefit of claiming your camp page, not a requirement.

---

## 🎨 Design & Brand

---

## 💡 Ideas & Long Term
- [ ] **Custom Supabase Auth domain** — Upgrade to Supabase Pro, set `auth.theplayaprovides.com` as custom auth domain + DNS config. Fixes Google OAuth consent screen showing `bklycpitofjrjhizttny.supabase.co` instead of the app domain.
- [ ] **Dispute arbitration UI** — Loans with `status = disputed` have no admin UI yet; flagged for future resolution flow.
- [ ] **Loan renewal / extension** — Extend return_by date without completing and re-creating the loan.
- [ ] **Camp-scoped gear sharing** — Share items with your camp only using `visibility` column + camp membership check.
- [ ] **Inventory-first reframe** — Shift site messaging to lead with gear organization as primary value prop; lending as optional bonus. Affects homepage copy, onboarding flow, and item-add form.
- [ ] **Camps Phase 2** — Needs further scoping. Includes: campmates filter on find-items, self-serve camp page claiming UI, camp gear inventory, playa_resources linking to camp pages.
- [ ] **BM API: 2026 camp placements** — In May 2026 when BM announces placement, hit the live API endpoint using the BM API key (stored in .env.local) to pull 2026 camp playa addresses and populate `playa_location` on camp pages. Also upsert any new 2026 camps not yet in the DB.
- [ ] **BM API: 2026 archive import** — Around March 2027, run `scripts/import-bm-camps.js` updated to include the 2026 S3 archive URL once BM posts it.
- [ ] **Create camps@theplayaprovides.com** — Set up in Resend, forward to alex@theplayaprovides.com.
- [ ] **Camp edit page — duplicate notice** — Add a small note in the edit UI: "Think there's a duplicate of your camp page? Email camps@theplayaprovides.com"
- [ ] **New user onboarding overhaul** — build out full onboarding flow including: welcome modal sequence, guided tour of key features, and persistent onboarding checklist. Needs full scoping session before building. Key questions: what triggers "new user" state, what completion looks like, where checklist lives.
- [ ] **Camp page: member chat** — real-time or async chat window on camp hub pages, visible to camp members only. Needs scoping (real-time vs. threaded, moderation, notifications).
- [ ] **SEO / noindex for restricted items** — Public items indexable by search engines; campmates-only and followers-only items should have noindex meta tag.
- [ ] **Incomplete profile nudge** — Some users have NULL full_name (and potentially other required fields) from before required field validation was added. Options: (A) Soft banner at top of /settings page if required fields are missing — non-blocking, just a nudge; (B) One-time modal after login prompting user to complete their profile, dismissible and non-blocking; (C) Validate only on save — no proactive warning, error only appears when user next visits /settings and tries to save. Option B is most user-friendly at scale.
- [ ] **Borrowed item detail page** — When an item is currently out on loan, determine what shows on the unique item page for: (1) the borrower, (2) the owner, (3) anyone else. Should "Request this item" be hidden? Should there be a loan status indicator?
- [ ] **Return flow limbo/reminder** — If owner never confirms return after borrower clicks "Return Item", send daily bell notification to owner. Add option for borrower to ping owner with a reminder button.
- [ ] **Camp member year/attendance breakdown** — Ability to filter or view all campers attending in a specific year, or see who's attending the current year across all camps.
- [ ] **Wish list ticker optimization** — Homepage currently fetches all profiles' wish_list arrays and flattens in the browser. At scale, replace with a dedicated `wish_list_items` table (one row per tag per user) to enable pagination, location filtering, and efficient querying.
- [ ] **Wish list search page** — Reverse find-items page: search all wish list items, filter by location, see who near you needs what.
- [ ] **In-app messaging** — Replace wish list match email/notification flow with a proper message thread when messaging is built.
- [ ] **Sitewide font overhaul** — Current fonts are functional but generic. Design pass needed across all pages.
- [ ] **Credibility layer** — TBD; some way to signal trustworthiness of lenders/borrowers.
- [ ] **Gamification / incentivization** — Badges, leaderboards, real-world prizes, playa party invitations.
- [ ] **Tailwind deviation** — Several components (`header.tsx`, `footer.tsx`, `RequestModal.tsx`, `resources/page.tsx`, `layout.tsx`, `terms/page.tsx`, `SubmitCampModal.tsx`, `ImageSlider.tsx`) use Tailwind utility classes in JSX despite CLAUDE.md convention. Not broken but inconsistent. Options: (A) update CLAUDE.md to officially allow Tailwind in JSX, or (B) do a cleanup pass to convert to inline styles. Decide before the codebase grows further.

---

## 🧹 Maintenance & Housekeeping
- [x] **Branching strategy** — DONE: CC now branches by default per CLAUDE.md
- [x] **Vercel preview deployments** — DONE: confirmed working
- [x] **Test accounts** — DONE: @abm and @smoreslab
- [ ] **Workflow tools audit** — Screenshot/Loom/CC tips, GitHub PR flow
- [ ] **End-to-end tests** — Return flow and following/notifications still untested

---

## 🧠 Brainstorming
_(nothing queued)_

---

## 🚀 Features (Designed, Ready to Build)
- [ ] **Notification types Phase 2** — Wire remaining transfer/loan/return events into the `notifications` table and bell. Most types are now in the schema and header switch; gaps: transfer acceptance bell insert, item request bell insert, loan return confirmation (done), any remaining edge cases.
- [ ] **Wish list match — logged-out state** — Currently the "I have one of these" button only shows to logged-in users. Consider showing a prompt to logged-out visitors to sign in to send a match.
- [ ] **New user guidance flow** — Tooltips or highlight circles around key features; step-by-step walkthrough page by page. Triggered on first login, after the welcome modal. Scope TBD.
- [ ] **FAQ page** — TBD whether it replaces /about or sits alongside it. Content TBD. Should cover: how borrowing/lending works, what happens if something is damaged, how camps work, how visibility settings work, how to get listed on the resources directory.

---

## ✅ Done
- [x] Fix: find-items — relationship filter chips renamed: "People I Follow" → "Following", "People Who Follow Me" → "Followers"; filter logic updated to match
- [x] Design: Homepage — hero line replaced with "But the playa can only provide because people provide."
- [x] Design: Homepage — Lend Items button color changed from orange (#E8834A) to purple (#d896ff)
- [x] Design: Homepage — numbered list replaced with 2×2 card grid (no borders, centered text, maxWidth 1000px) with four principle-based cards
- [x] Design: Homepage — On-Playa Resources text color changed from #666 to #2D241E
- [x] Design: Homepage — wishlist ticker moved above polaroid marquee
- [x] Design: Homepage — wishlist ticker and polaroid marquee wrapped in shared faint purple background (rgba(216,150,255,0.08)) to visually connect them as one unit
- [x] Fix: Homepage — card body copy updated: "Just because you're not going this year doesn't mean your stuff can't."
- [x] Feature: BM camp data import — fetched 2015–2025 JSON archives from BM public S3 URLs, seeded camps table with 5,314 unique camps (13,265 raw records, 17 same-year dupes skipped); added bm_uid and bm_homepage_url columns to camps table
- [x] Fix: Footer BM disclaimer — added "This app is not affiliated, endorsed, or verified by Burning Man Project." to footer in matching secondary text style
- [x] Fix: Camp autocomplete — now draws from 5,314 official BM camp names (2015–2025) instead of user-created stubs only
- [x] Maintenance: Duplicate camp cleanup — deleted confirmed duplicate camp records via SQL; query identified "name" / "name Camp" pairs across 5,314 records
- [x] Fix: "Add Year" button copy — removed +, capitalized to "Add Year"
- [x] Fix: Camp year default — new affiliation row defaults to one below the lowest year already entered
- [x] Fix: Camp page — BM data (description, homebase, bm_homepage_url) now renders on unclaimed stubs, not just claimed pages
- [x] Fix: Camp page — description word wrap fixed with whiteSpace: pre-wrap and wordBreak: break-word
- [x] Fix: Camp page — bm_homepage_url wired to Website pill in social links display
- [x] Fix: Camp page — side-by-side layout when both photo and description exist
- [x] Fix: Camp page — photo-only layout: capped at 400px wide, centered, sits beside camp info
- [x] Fix: Camp page — delete banner photo option added to edit UI with inline confirmation
- [x] Fix: Camp edit — "Banner Image" renamed to "Cover Photo", buttons updated to match
- [x] Fix: Camp edit — cover photo preview matches live page rendering, not full-width banner
- [x] Fix: Camp edit — Save Changes / Edit Camp buttons set to same fixed width
- [x] Fix: Camp edit — Save Changes button moved to top right, matching user profile page
- [x] Fix: Camp page — "(owner)" renamed to "(page owner)" in members list
- [x] Fix: Camp page — "2026 Camp?" column header renamed and widened to fit on one line
- [x] Fix: User profile edit — Cancel button added below Save Profile button
- [x] Feature: Settings page overhaul — Identity & Contact rename/reorder, pronouns field (DB migration), required asterisks, address card layout with "Set as default" checkbox, default location pre-select on /list-item and AddItemModal, Account & Security section (Change Email, Change Password with OAuth detection, Delete Account modal), zip_code field added
- [x] Feature: Delete Account — two-step confirmation modal in settings, `delete-account` edge function (scrubs profile PII, marks gear owner_deleted+private, unlinks camps, deletes follows/notifications/affiliations/loans/transfers, then calls auth.admin.deleteUser), homepage `?deleted=true` banner, owner_deleted guard on item detail + parallel modal + find-items query
- [x] Fix: Delete account FK chain — resolved series of blocking constraints: `item_loans/item_transfers` NO ACTION on profiles.id → CASCADE; `gear_items.location_id` NO ACTION → SET NULL; `social_links` NOT NULL conflict → set to `{}`; `gear_items.user_id` NOT NULL conflict with SET NULL FK rule → dropped NOT NULL
- [x] Design: Header hamburger menu (mobile) and logo "The Playa Provides______" updated in header and footer
- [x] Feature: Item visibility tiers — `visibility` column on `gear_items` with RLS enforcing public/followers/campmates/private; visibility selector on list-item form, edit modal, and inventory inline toggle; availability↔visibility coupling ('Not Available' → 'private'); owner visibility badge on profile page; "Log In to Request" gate on detail page, parallel modal, and find-items quick-view modal
- [x] Fix: Visibility constraint error — grayed-out disabled options in visibility dropdown with tooltips explaining why options aren't available (no followers / no camp affiliations)
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
- [x] Design: Resources page "Submit Your Camp" button moved to top right, styled to match site conventions
- [x] Feature: Social links on profile — `social_links jsonb` column on profiles, 6-field edit form inline in profile header, pill buttons in view mode (Lucide icons for FB/IG/LI/Globe; text for Bluesky/ePlaya)
- [x] Feature: Playa story field on profile — `playa_story text` column, textarea in edit mode, displayed in view mode below bio section
- [x] Design: Profile page layout restructure — Row 1: avatar+name/location/social links; Row 2: bio | wishlist; Row 3: story + playa history stacked
- [x] Feature: Camps layer Phase 1 — `camps` + `user_camp_affiliations` tables with RLS; multi-entry camp affiliation editor on profile (year dropdown, camp autocomplete with freeform stub creation, Open Camping option); profile view mode reads affiliations first with legacy burning_man_years/burning_man_camp fallback; /camps/[slug] page with unclaimed banner + member list + claimed layout
- [x] Feature: Find-items campmates filter — "My Campmates" multi-select chip on /find-items; campmate IDs fetched from user_camp_affiliations; filter chips for Everyone / People I Follow / People Who Follow Me / My Campmates (multi-select, independent toggles)
- [x] Feature: Notification bell full wiring — type-based text + href switch for new_item, new_follower, transfer_accepted/declined, loan_accepted/declined, item_request, camp_join; camp_id column added to notifications; 5 new DB triggers (new_follower, transfer_accepted/declined, loan_accepted/declined, camp_join)
- [x] Fix: Item request notifications wired to bell — notification row inserted into `notifications` table after request email sent, so bell picks it up
- [x] Fix: Transfer accepted/declined notifications wired to bell — notification insert added on recipient's accept/decline action so initiating party sees bell update
- [x] Feature: Camp page claim flow — inline form replaces mailto link; `camp_claim_requests` table with RLS + approval/denial triggers; `send-camp-claim-notification` edge function emails support; bell cases for camp_claim_approved/denied; approval auto-sets is_claimed + page_owner_id and denies other pending requests
- [x] Fix: Camp claim triggers — `user_id` → `recipient_id` in notifications INSERT; added CHECK constraint on `camp_claim_requests.status` ('pending'|'approved'|'denied'); expanded `notifications_type_check` constraint to cover all 10 notification types
- [x] Feature: Camp page updates — (page owner) label inline in members list; "Years Attended" column header; "Items from Camp Members" section with grid/list toggle, member item fetch (available + public/campmates visibility), quick-view modal with URL sync (/camps/[slug]/[id]), Request Item button; members list appears first, items section second; items default to list view; PolaroidPhoto `noRotate` prop added to prevent card overflow
- [x] Feature: Camp page editing + member management — edit mode panel (display name, description, founded year, homebase, social links, banner upload); member grid with Wish List / Years Attended / Returning in 2026? / Actions columns; admin can set roles, transfer ownership, remove members; non-member items gate; camp_member_removed bell notification
- [x] Feature: Camp page + profile 2026 returning status — DB: `returning_status` on `user_camp_affiliations`, `returning_2026` on `camps`; profile edit: Returning in 2026 field (Yes/Maybe/No chips + camp autocomplete), year cap at 2025, playa_story moved below history; camp members: per-member returning badge scoped to this camp; camp social links: edit trimmed to Facebook/Instagram/Website; camp layout: homebase plain text, conditional playa address display, "Returning in 2026?" select in edit form
- [x] Feature: Signup page required fields — Preferred Name, Username, and Full Name fields added to signup form; username uniqueness check before submit; Google OAuth incomplete profile redirects to /settings?setup=true with amber setup banner
- [x] Design: Homepage overhaul — triptych removed; numbered list (1/2/3) added; wishlist ticker added; polaroid marquee label added; hero copy tightened; layout, spacing, and background cleaned up to consistent white
- [x] Design: Profile page — Playa History and Playa Story moved to two-column side-by-side layout
- [x] Feature: "I have one of these" wish list match — `WishListMatchModal` (tag checkboxes + inventory toggles + note field + success state); DB migrations (`wish_list_match` type + `meta jsonb` on notifications); `send-wish-list-match-email` edge function (Resend, links to sender profile); bell notification wiring in header (both desktop + mobile)
- [x] Deploy: `send-dispute-notification` edge function — deployed via Supabase Dashboard, Verify JWT off
- [x] Deploy: `send-wish-list-match-email` edge function — deployed via Supabase Dashboard, Verify JWT off
- [x] Design: UX clarity pass — title style (28px bold #2D241E + underlined descriptor + NBSP), subhead copy, and `maxWidth: 1200px` left-edge alignment updated across /resources, /list-item, /inventory, /profile, /settings, /camps/[slug]; header pipe separator added between nav links; logo underline updated in header and footer; resources page layout restructured (button moved to subhead row)
- [x] Design: Camp page cleanup — removed ← Find Items back link, widened container to 1200px, members table column headers renamed (Camp Years → Years Attended, 2026 Camp → Returning in 2026?), items table reordered and View → column removed
- [x] Fix: Resources submission form — contact email and submitter name now required fields; Instagram field added; category list updated; reply-to header fixed on `send-request-email` edge function
- [x] Fix: Spreadsheet import user_id bug — `user_id` now added to each imported row; import aborts with error if no active session
- [x] Design: Favicon and OG preview image added — `app/favicon.png` added; OG image configured in `layout.tsx`
- [x] Design: find-items filter layout — responsive 3-row (desktop) / 4-row (landscape) / 5-row (portrait) layout via injected style tag; GLM toggle moved to bottom row
- [x] Design: find-items grid — responsive columns: 2-col portrait mobile, 3-col landscape, auto-fill desktop; handled via CSS class fi-grid
- [x] Fix: find-items title line break — `<span className="title-break" />` after "Provides" in h1 wraps to new line on portrait mobile (<430px)
- [x] Design: Header hamburger dropdown — changed from full-width below-header strip to absolute-positioned rounded dropdown (right-aligned, 220px min-width, box shadow); bell and menu mutually close each other
- [x] Fix: Title line break on remaining pages — `<span className="title-break" />` after "Provides" in h1 on list-item, inventory, profile, settings, camps/[slug], and resources pages; stacks title onto two lines on portrait mobile (<430px)
- [x] Design: Header hamburger dropdown flush styling — removed border-radius, box-shadow, and border; flush to right edge (right: 0); border-top only; nav links right-aligned via textAlign: right; camp items overflow wrapper added to prevent horizontal scroll
- [x] Fix: notifications RLS — added INSERT policy for wish_list_match type gated on actor_id = auth.uid() (was missing, causing silent 403 on send)
- [x] Fix: WishListMatchModal — added isFollowing prop; updated copy (title + subhead + section labels + note required asterisk); removed "+ Add Item to Inventory" link; inventory fetch now excludes Not Available items and fetches visibility column; selectedItemIds Map replaces selectedItemNames Set (id→name); note now required to enable Send; visibility labels on inventory items (followers only / campmates only / private)
- [x] Fix: WishListMatchModal — inventoryItems array (name + URL) built from selectedItemIds and passed to edge function body
- [x] Fix: send-wish-list-match-email edge function — inventory items now render as clickable links in email; wish-list-only tags render as plain text; safe fallback if inventoryItems absent — **redeploy via Supabase Dashboard required**
- [x] Copy: Homepage hero tagline updated — "Why let your stuff collect dust..." → "But the playa can only provide because people provide." _(branch: feature/homepage-copy)_
- [x] Design: Homepage "Lend Items" button color — changed from #E8834A (orange) to #d896ff (purple) _(branch: feature/homepage-copy)_
- [x] Design: Homepage numbered list → 2×2 card grid — four Principles cards (Radical Interdependence, Decommodification, Gifting, Participate) with italic emphasis via dangerouslySetInnerHTML _(branch: feature/homepage-copy)_
- [x] Fix: Homepage "On-Playa Resources" subhead color — changed from #666 (gray) to #2D241E (dark brown) _(branch: feature/homepage-copy)_
- [x] Fix: find-items relationship filter chips renamed — "People I Follow" → "Following", "People Who Follow Me" → "Followers"
- [x] Design: Inventory purple pass — Transfer To button and To Keep toggle changed from orange (#E8834A) to purple (#d896ff); inventory subhead line break added
- [x] Feature: In-app feedback widget — `FeedbackWidget` component (floating button, modal, session-gated); `send-feedback-notification` edge function (Resend → alex@); inserts to existing `feedback` table; wired into root layout after Footer
- [x] Fix: find-items — filter layout restructured for desktop, portrait, and landscape breakpoints using CSS media queries
- [x] Fix: find-items — grid columns responsive: 2-col portrait, 3-col landscape, auto-fill desktop
- [x] Fix: find-items — GLM toggle repositioned to bottom of filter section above items
- [x] Fix: find-items — "Search by keyword" and "Search by location" labels capitalized
- [x] Fix: find-items — "Categories:" label added before category chips
- [x] Fix: find-items — Available to chips constrained to single row on portrait with smaller sizing
- [x] Fix: find-items — grid card overflow fixed for portrait and landscape, cards no longer bleed past page edge
- [x] Fix: Header — hamburger dropdown right-aligned, flush with header right edge, nav links right-justified, no rounded card styling
- [x] Fix: Mobile portrait title line break — added after "Provides" on find-items, list-item, inventory, profile, settings, camps pages
- [x] Fix: Camp page mobile portrait — title and Edit Camp button stack vertically
- [x] Fix: Camp page mobile portrait — photo moves below description and meta fields
- [x] Fix: Camp page — members table horizontal scroll contained, page no longer scrolls horizontally
- [x] Fix: Camp page — Items from Camp Members table wrapped in horizontal scroll container
- [x] Fix: Profile page — mobile-responsive layout via embedded style tag and CSS media queries (≤640px): header stacks vertically (avatar centered, info full-width, button full-width), Wish List reorders above Bio, Bio/Wish grid collapses to single column, Available Items table horizontally scrollable
- [x] Feature: In-app feedback widget — floating button (bottom right, logged-in only), modal with Type/Description/Email fields, inserts into feedback Supabase table, triggers send-feedback-notification edge function to alex@theplayaprovides.com, page URL captured automatically
- [x] Deploy: send-feedback-notification edge function — deployed via Supabase Dashboard, Verify JWT off
- [x] Fix: Wish list match email reply-to — senderId passed in modal invoke body and edge function; sender email looked up via service role client; reply_to added to Resend call so replies go to sender not hello@
- [x] Fix: Wish list match email — sender name now hyperlinked to their profile in opening line; teal button replaced with "Reply to this email to let [name] know if you're interested."
- [x] Feature: Wish list match modal — Borrow/Keep radio buttons added inline on each wish list tag row, always visible; required before sending; validation hint shown if checked tag has no term selected; title updated to "Help make [name]'s wish list dreams come true"
- [x] Feature: Wish list match email — wish list items and inventory items rendered in separate sections; wish list items show term (To borrow / To keep); inventory items show availability status and appear in light purple (#f5e6ff) section with header "They also have these items you might like:"
- [x] Fix: Wish list match bell notification — (borrow)/(keep) updated to (to borrow)/(to keep) in both desktop and mobile bell switch statements
- [x] Fix: Settings page — delete location button added to each address card; grayed out and disabled on default location, active on non-default; confirmation modal before delete; new unsaved locations removed from state only, saved locations deleted from DB
- [x] Fix: Settings page — copy updates: "Item Request Email" → "Contact Email for Messaging"; field note updated; "Locations of Your Items" → "Where Your Items Are Stored"; location section note updated with line breaks
- [x] Fix: Settings page — browser alert() calls replaced with inline toast (fixed bottom-center, dark background, auto-dismisses after 3 seconds)
- [x] Fix: Header — "Offer an Item" renamed to "Offer Items" across all four instances in header
- [x] Feature: Camp members table — Location column added between Name and Wish List; pulls city and state from profiles; fixed-width 120px column; grid template tightened
