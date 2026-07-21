# The Playa Provides — Task List

_Last updated: 2026-07-21_

> **Note on this file's shape:** this is a living project-state document, not a changelog. It's meant to be uploaded as context (e.g. to a Claude Project) without dragging in months of session-by-session history — if you want the archaeology of *how* something was built, `git log -p TASKS.md` and the commit history have it. What lives here is: what's actually shipped and how it currently works, what's mid-flight, and what's next.

---

## ✅ Session Start Checklist
1. Read **Next Session Priority** and **In Progress / Needs Testing** — what's actually unfinished?
2. Pick **one primary goal** for this session.
3. If something comes up mid-session, ask: is this blocking my goal or a tangent? If tangent, log it under Ideas & Long Term and move on.
4. **End of session:** update this file — move finished work into Current Feature State (or delete the line if it's truly redundant with what's already documented there), refresh Next Session Priority, keep it lean.

---

## 🎯 Next Session Priority

- [ ] **Verify profile 2026 spotlight row on prod** — Burning Man 2026 status (Attending/Maybe Attending/Not Attending + camp or Open Camping) now renders as its own bordered row above the Playa History heading, and is excluded from the year-chip list below (which now ends at 2025). Only shows when a `returning_status` is actually set for 2026; only in the non-editing (published) view — the existing "Attending in 2026?" edit form is unchanged.
- [ ] **Verify location-adding bug fix on prod** — new-location inserts (list-item, inventory loan-location picker, settings) were silently failing site-wide with a `Could not find the 'lat' column of 'locations'` schema-cache error; root cause was `lib/geocodeZip.ts` returning `{lat, lng}` while the table's real columns are `latitude`/`longitude`. Fixed 2026-07-21 by renaming the helper's return shape. Audited every other Supabase insert/update/upsert call site (client + edge functions) against the live schema at the same time — no other column-name mismatches found. Confirm a friend/new user can now add a location end to end.
- [ ] **Verify first daily admin report email** — cron fires 13:00 UTC (8am EST / 9am EDT) daily; first run expected 2026-07-22. If no email, check `cron.job_run_details` and the `send-daily-report` edge function logs.
- [ ] **Verify 2026-07-21 fixes on prod** — (1) follower/following counts on own profile open the lists modal again; (2) inventory Availability toggles no longer collide with the Action column (root cause: 190px of buttons in a 170px column — enlarged browser font settings made it worse; column widened to 240px + wrap fallback); (3) camp members table: compact rows + horizontal scroll on mobile, Wish List column now last and absorbs desktop free space, Years/2026 ("2026 Camp?") moved left of it; (4) list-item on a phone: no page zoom when tapping fields (applies site-wide — form fields are 16px on mobile now), centered normal-width submit button, Lending Terms relabel + Return Instructions label; the Return by/If Damaged/If Not Returned tray now stacks to one column below 940px viewport width (was overlapping/misaligning in both portrait and landscape at 3-across — same fix applied to the Add Item modal, which duplicates this UI); (5) camp item grid now matches find-items' mobile card layout (3/row, compact text) instead of collapsing to 1 column; (6) bell dropdown auto-marks everything read on open, no separate click needed; (7) inventory Remind button now shows Sending/Reminder Sent feedback and is capped to once per 24h (localStorage-based, not DB-enforced).
- [ ] **Welcome email** — Triggered on signup via Supabase DB webhook; design and copy TBD. Uses the existing Resend/edge-function setup (other transactional emails already work this way).
- [ ] **End-to-end test: Lend/Return flow** — Two test accounts, full loan lifecycle, confirm emails + bell notifications fire at each step.
- [ ] **End-to-end test: Following & Notifications** — Follow a user, list an item as them, verify bell badge + dropdown, mark-as-read, email opt-in.
- [ ] **Test Item History section** — owner-only collapsible section on item detail page/quick-view/intercepted modal (shipped 2026-07-20, not yet click-tested). Verify: correct dates/names as owner; a borrower sees nothing even for an item they're actively borrowing; renders below the button row (a flex-layout bug put it beside the buttons once already, fixed).
- [ ] **Test Items I've Given Away table** — on /inventory (shipped 2026-07-20, not yet click-tested). Verify: item name always shows even if the current owner made it private; "Current Owner" shows a real name when visible to you, "Not visible to you" when their privacy settings block it; "View Listing" links when visible, shows N/A otherwise.
- [ ] **Dust storm homepage decision** — `theplayaprovides.com/mockup-dust-storm.html` has 3 modes (storm/haze/clear); pick one or skip.
- [ ] **Header nav link color** — lime "Provides" wordmark already shipped; still open whether the `#aaa` nav links should go white.
- [ ] **Delete `mockup-dust-storm.html`** once the decision above is made, either way (implement as a component if chosen, just delete if not).

---

## 🏗️ In Progress / Needs Testing
- [ ] **Spreadsheet import** — CSV/Excel upload, duplicate detection, error cases. Built and merged, never fully click-tested end to end.

---

## 🧭 Current Feature State

### Core sharing loop
- **List an item** (`/list-item`) — name, category, condition, description, photos (up to 4), location, availability (`Available to Borrow` / `Available to Keep` / `Not Available`), visibility, lending terms (damage/loss price, return terms). Edit reuses the same form via `?edit=<id>`.
- **Find items** (`/find-items`) — search, category filter, location/zip, relationship filter (Everyone/Following/Followers/Campmates), cards/list/map view (persisted in localStorage). Quick-view modal on click; full detail page at `/find-items/[id]`; an intercepted parallel-route modal also exists at `app/@modal/(.)find-items/[id]/page.tsx` for client-side navigation into the same route — all three independently implement the same button row (see CLAUDE.md gotcha).
- **Borrow flow:** Requester clicks Request → `RequestModal` sends a message + creates an `item_request` notification. Owner separately initiates the actual loan via "Lend To" (`LendModal`, looks up recipient by username/email) — this is what creates the `item_loans` row, not the request itself. Loan state machine: `pending_handover` → (owner confirms handover) → (borrower confirms pickup) `active` → (borrower confirms return) `return_pending` → (owner confirms) `complete`. Also `cancelled` / `disputed`.
- **Gift/transfer flow:** Owner initiates via "Transfer To" (`TransferModal`), same recipient-lookup pattern. `item_transfers` row: `pending_handover` → (owner confirms handover) → (recipient confirms receipt via `confirm_transfer_receipt` RPC) `complete` — that RPC is what actually moves `gear_items.user_id` to the recipient and marks the item Not Available/private for them to re-list.
- **Inventory** (`/inventory`) — owner's item table (with To Borrow/To Keep/Private toggle + visibility dropdown) plus four always-rendered sub-tables: Items Out on Loan, Items Being Transferred to Me, Items I'm Borrowing, Items I've Given Away.

### Visibility & privacy
- `gear_items.visibility`: `public` / `private` / `followers` / `campmates` / `followers_and_campmates`. Enforced via the `gear_items_visibility` RLS SELECT policy (owner always sees own items; public always visible; followers/campmates checked via `user_follows` / `user_camp_affiliations`).
- Marking an item `Not Available` forces `visibility = 'private'`; leaving that status restores public visibility (doesn't touch a deliberately-chosen followers/campmates setting).
- `gear_items.is_on_loan` — boolean kept in sync by a trigger on `item_loans` status changes. While true, the item is excluded from `/find-items` entirely; its own detail page/quick-view/modal stay reachable but gray out Edit/Transfer/Delete (owner) and Request (everyone else), and show a Return Item button to the actual current borrower.
- **Item History** (`components/ItemHistory.tsx`) — owner-only collapsible section on all three item-view surfaces. Shows when the item was added to TPP, each loan once pickup is confirmed (lent to, then returned by once that also happens — linked username), each completed transfer (transferred from, linked username). Enforced by an RLS policy granting the *current* owner (`gear_items.user_id = auth.uid()`) visibility into every loan/transfer row for that item — a borrower never satisfies this, and a past owner loses it the moment they transfer the item away.
- **Items I've Given Away** (on `/inventory`) — every completed transfer where you were the owner. Item name is snapshotted onto `item_transfers.item_name` at transfer time (so it survives the item later going private under a new owner); "Current Owner" and "View Listing" both respect the item's live, real visibility rules with no special bypass — if the current owner hasn't made it visible to you, you see "Not visible to you" / "N/A" rather than their identity.

### Notifications
- Single `notifications` table (`recipient_id`, `actor_id`, `item_id`, `camp_id`, `type`, `meta` jsonb, `read`), bell icon in header polling every 30s.
- Current allowed types (`notifications_type_check` constraint): `new_item`, `new_follower`, `transfer_accepted`, `transfer_declined`, `loan_accepted`, `loan_declined`, `item_request`, `camp_join`, `camp_claim_approved`, `camp_claim_denied`, `loan_return_confirmed`, `camp_member_removed`, `wish_list_match`, `loan_pickup_ready`, `transfer_pickup_ready`, `loan_return_pending`, `loan_initiated`, `transfer_initiated`. `loan_accepted`/`loan_declined` are defined but currently unreachable — nothing in the app writes those specific values (the accept/decline flow works differently than that early design assumed).
- Every type has a matching `case` in `components/header.tsx`'s bell dropdown for display text + link.
- Opening the bell dropdown auto-marks all unread notifications as read (no per-item clicking needed).

### Admin
- **Daily stats email** — `send-daily-report` edge function (deployed, Verify JWT off) emails alex@theplayaprovides.com daily at 13:00 UTC (8am EST / 9am EDT) via pg_cron job `tpp-daily-report` + `pg_net`. Mondays add a Last-7-Days section. Stats: signups + logins (via `get_recent_signup_count` / `get_recent_login_count` SECURITY DEFINER helpers reading `auth.users` — profiles has no `created_at`), items posted, loans initiated/returned/active, transfers completed, follows, feedback, camp claims, visibility snapshot. The cron job's SQL (with the anon key baked in) lives in `supabase/migrations/20260721161622_schedule_daily_report_cron.sql`.

### Onboarding
- Getting Started checklist (`components/ChecklistBox.tsx`) — slides in on the homepage hero for logged-in users with incomplete setup (playa history, wish list, a saved location, a listed item, having browsed items). Dismissal is **session-scoped** (sessionStorage, not a permanent DB flag) — skipping it hides it for that browser session only; it resurfaces on a fresh session if items are still incomplete. `profiles.checklist_dismissed` still exists in the schema but is no longer written to.
- Welcome modal on first profile visit (`has_seen_welcome` flag).

### Camps
- `camps` + `user_camp_affiliations` tables. Claim flow (`camp_claim_requests`, approve/deny only via service role — no client UPDATE policy). Camp pages at `/camps/[slug]` with member management, roles, editing. No `/camps` index route exists yet (404s) — see Ideas & Long Term.
- Seeded from Burning Man's public camp-placement archives (2015–2025), ~5,300 camps.

### Design system
- "Playful Field Guide" — see CLAUDE.md for the full token list. Shipped sitewide across all pages/components. No Tailwind utility classes remain in `app/` or `components/` as of 2026-07-20.

### Auth & account
- Email/password + Google OAuth. Google OAuth users with an incomplete profile get redirected to `/settings?setup=true`.
- Delete Account (in Settings) — two-step confirmation, `delete-account` edge function scrubs PII, marks gear `owner_deleted` + private, unlinks camps, deletes follows/notifications/affiliations/loans/transfers, then deletes the auth user.
- Magic link login was removed — Gmail's link pre-fetching burns single-use tokens. Password + Google OAuth only.

---

## 🔧 Known Issues / Tech Debt
- [ ] **Leaked password protection disabled** in Supabase Auth (HaveIBeenPwned check) — Dashboard toggle under Authentication → Policies, not fixable via SQL/API.
- [ ] **`loan_accepted`/`loan_declined` notification types are unreachable** — defined in the schema and header switch but nothing in the app's current loan state machine writes those exact status values. Either wire them up for real or remove them; low priority, not causing harm.
- [ ] **No `/camps` or `/profile` index routes** — both 404 since only `[slug]`/`[username]` dynamic routes exist. See Ideas & Long Term for what they could become.

---

## 💡 Ideas & Long Term
- [ ] **/camps index page** — currently 404s; build as a searchable directory of all camps, claimed and unclaimed.
- [ ] **/profile index page** — currently 404s; redirect logged-in users to their own profile, or build as a member directory.
- [ ] **Shepherd.js product tour** — two single-page tours (profile, inventory); `onboarding_tours_seen` jsonb on profiles; build after UI stabilizes.
- [ ] **Custom Supabase Auth domain** — upgrade to Pro, set `auth.theplayaprovides.com`, fixes the Google OAuth consent screen showing the raw Supabase project URL.
- [ ] **Dispute arbitration UI** — loans with `status = 'disputed'` have no admin resolution flow yet.
- [ ] **Loan renewal/extension** — extend `return_by` without completing and re-creating the loan.
- [ ] **Camp-scoped gear sharing** — share with campmates only, via the existing `visibility` column.
- [ ] **Inventory-first reframe** — lead site messaging with gear organization as the primary value prop, lending as a bonus. Touches homepage copy, onboarding, list-item form.
- [ ] **Camps Phase 2** — campmates filter on find-items (partially done), self-serve claiming polish, camp gear inventory, resources-directory linking.
- [ ] **BM API: 2026 camp placements** — hit the live BM API once 2026 placement is announced (~May 2026) to populate `playa_location`; also the 2026 S3 archive import (~March 2027) via `scripts/import-bm-camps.js`.
- [ ] **Camp edit page — duplicate notice** — small UI note pointing to camps@theplayaprovides.com.
- [ ] **Camp page member chat** — real-time or async, members-only. Needs scoping.
- [ ] **SEO noindex for restricted items** — campmates-only/followers-only listings should get a noindex meta tag; public ones stay indexable.
- [ ] **Incomplete profile nudge** — validate-on-save already ships (Settings blocks save without required fields). Still open: a soft banner or one-time modal proactively prompting early users with a NULL `full_name` to complete their profile.
- [ ] **Return flow limbo/reminder** — daily bell nudge to the owner if they never confirm a return after the borrower clicks Return Item; optional manual reminder button for the borrower too.
- [ ] **Camp member year/attendance breakdown** — filter/view campers by attendance year across camps.
- [ ] **Wish list ticker optimization** — homepage currently fetches every profile's `wish_list` array and flattens client-side; replace with a dedicated `wish_list_items` table at scale.
- [ ] **Wish list search page** — reverse find-items: search what people need, not what's offered.
- [ ] **In-app messaging** — replace the wish-list-match email/notification flow with real message threads once messaging exists.
- [ ] **Sitewide font overhaul** — current fonts are functional but generic; open design pass.
- [ ] **Credibility layer** — some way to signal lender/borrower trustworthiness. TBD.
- [ ] **Gamification** — badges, leaderboards, real-world prizes. TBD.
- [ ] **BM packing list page** (`/packing-list`) — curated ~60–80 item checklist across categories, three states per item (I Have / I Have Extra / I Need) wired into inventory and wish list. Content needs drafting before building.
- [ ] **Resources directory submission from camp edit panel** — let claimed-camp owners submit to the resources directory pre-filled from their camp page, framed as a claiming benefit.
- [ ] **New user guidance flow** — tooltips/highlights walking through key features on first login, after the welcome modal. Scope TBD.
- [ ] **FAQ page** — TBD whether it replaces or sits alongside `/about`.
- [ ] **Dust storm hero effect** — see Next Session Priority, decision pending.

---

## 🧹 Maintenance & Housekeeping
- [x] Branching strategy — commit directly to `master`, no feature branches unless asked.
- [x] Vercel preview deployments confirmed working.
- [x] Test accounts: `@alex` and `@abm` (see CLAUDE.md).
- [ ] **Workflow tools audit** — Screenshot/Loom/CC tips, GitHub PR flow. Not started.
