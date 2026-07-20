# The Playa Provides — Task List

_Last updated: 2026-07-20 (full-site audit + follow-through complete)_

---

## ✅ Session Start Checklist
1. Read **In Progress** and **Bugs** sections — what's actually unfinished?
2. Pick **one primary goal** for this session
3. If something comes up mid-session, ask: is this blocking my goal or a tangent? If tangent, log it and move on.
4. **End of session:** update TASKS.md before closing out

---

## 🎯 Next Session Priority — Post-Launch

- [ ] **Welcome email** — Triggered on signup via Supabase DB webhook; design and copy TBD; uses existing Resend/edge function setup.
- [ ] **End-to-end test: Lend/Return flow** — Use two test accounts; go through full loan lifecycle; confirm emails fire.
- [ ] **End-to-end test: Following & Notifications** — Follow a user, list an item as them, verify bell badge + dropdown; mark-as-read; email opt-in.
- [ ] **Incomplete profile nudge** — Some early users have NULL full_name. Settings already validates full_name on save (option C); proactive banner/modal (options A/B) not built. See full options list under Ideas & Long Term.
- [ ] **Dust storm decision** — View `theplayaprovides.com/mockup-dust-storm.html`, decide storm / haze / skip; implement if yes.
- [ ] **Header nav link color** — "Provides" lime green already shipped (session 29). Still open: nav links are `#aaa` → consider white.

---

## 🏗️ In Progress / Needs Testing
- [ ] **Test spreadsheet import end-to-end in browser** — CSV upload, Excel upload, duplicate detection, error cases. (`fix/spreadsheet-import-user-id` merged — ready to test.)
- [ ] **Test Item History section** (2026-07-20) — owner-only collapsible section on item detail/quick-view/modal. Verify: shows correct dates/names as owner; a borrower sees nothing even for an active loan; layout renders below the button row, not beside it (fixed once already).
- [ ] **Test Items I've Given Away table** (2026-07-20) — on /inventory. Verify: item name always shows even if current owner made it private; "Given To" always shows; "Current Owner" shows real name when visible to you, "Not visible to you" when the current owner's privacy settings block it (test by re-gifting a test item to a third account and having them set it private).

---

## 🔧 Bugs & Fixes
_(moved to Pre-Launch Audit section above)_

---

## 🚀 Features
- [ ] **Welcome email** — `send-welcome-email` edge function triggered by Supabase DB webhook on INSERT to `profiles` table; sends from hello@theplayaprovides.com; copy drafted in Word doc (needs editing before build)
- [ ] **Resources directory submission from camp edit panel** — Visible only to logged-in camp page owners. Pre-fills camp name and pulls contact email from page owner's profile. Submits for backend approval same as the public form. Framed as a benefit of claiming your camp page, not a requirement.
- [ ] **BM packing list page (/packing-list)** — curated master list of ~60-80 items across 6-8 categories. Three states per item: "I Have" (prompts adding to inventory, private by default), "I Have Extra" (opens list-item funnel pre-filled with item name), "I Need" (one-click adds to wish list). State persisted to packing_list jsonb column on profiles. Content (the actual list) needs to be drafted before building.

---

## 🎨 Design & Brand
- [x] **Re-integrate map view into new find-items design** — Done: cards/list/map toggle added to results bar; MapView loaded via dynamic import; list view added as a bonus. _(session 29)_
- [x] **Copy/headline pass — eyebrows** — "My Gear", "Browse", "About" eyebrows removed from Inventory, Find Items, and About pages. _(session 29)_
- [ ] **Font swap** — Arvo serif is current. If it feels wrong after live-testing, swap as a one-line change in globals.css. Defer.

---

## 💡 Ideas & Long Term
 - [ ] /camps page — no index route exists (`app/camps/` only has `[slug]`), so it 404s; consider building as a searchable directory of all camps with claimed/unclaimed pages
 - [ ] /profile page — no index route exists (`app/profile/` only has `[username]`), so it 404s; consider redirecting logged-in users to their own profile (/profile/[username]), or building as a member directory
 - [ ] **Shepherd.js product tour** — two single-page tours (profile page, inventory page); steps highlight key UI elements; seen state stored in `onboarding_tours_seen` jsonb on profiles; build after UI stabilizes
 - [ ] **Custom Supabase Auth domain** — Upgrade to Supabase Pro, set `auth.theplayaprovides.com` as custom auth domain + DNS config. Fixes Google OAuth consent screen showing `bklycpitofjrjhizttny.supabase.co` instead of the app domain.
- [ ] **Dispute arbitration UI** — Loans with `status = disputed` have no admin UI yet; flagged for future resolution flow.
- [ ] **Loan renewal / extension** — Extend return_by date without completing and re-creating the loan.
- [ ] **Camp-scoped gear sharing** — Share items with your camp only using `visibility` column + camp membership check.
- [ ] **Inventory-first reframe** — Shift site messaging to lead with gear organization as primary value prop; lending as optional bonus. Affects homepage copy, onboarding flow, and item-add form.
- [ ] **Camps Phase 2** — Needs further scoping. Includes: campmates filter on find-items, self-serve camp page claiming UI, camp gear inventory, playa_resources linking to camp pages.
- [ ] **BM API: 2026 camp placements** — In May 2026 when BM announces placement, hit the live API endpoint using the BM API key (stored in .env.local) to pull 2026 camp playa addresses and populate `playa_location` on camp pages. Also upsert any new 2026 camps not yet in the DB.
- [ ] **BM API: 2026 archive import** — Around March 2027, run `scripts/import-bm-camps.js` updated to include the 2026 S3 archive URL once BM posts it.
- [ ] **Camp edit page — duplicate notice** — Add a small note in the edit UI: "Think there's a duplicate of your camp page? Email camps@theplayaprovides.com"
- [ ] **New user onboarding — welcome email** — D from the session 33 brainstorm; triggered on signup; copy TBD.
- [ ] **Camp page: member chat** — real-time or async chat window on camp hub pages, visible to camp members only. Needs scoping (real-time vs. threaded, moderation, notifications).
- [ ] **SEO / noindex for restricted items** — Public items indexable by search engines; campmates-only and followers-only items should have noindex meta tag.
- [ ] **Incomplete profile nudge** — Some users have NULL full_name (and potentially other required fields) from before required field validation was added. Option (C) validate-only-on-save is already shipped (`app/settings/client-page.tsx`). Still open: (A) soft banner at top of /settings if required fields missing, or (B) one-time modal after login. Option B is most user-friendly at scale.
- [x] **Borrowed item detail page** — DONE (session 2026-07-17): on-loan items hidden from find-items grid/list; item page still reachable directly with Edit/Transfer/Delete grayed for owner, Request grayed for third parties, "Return Item" button for the active borrower, "Currently on loan" badge for everyone. See done-log below.
- [x] **Item history — lending/transfer dates** — DONE 2026-07-20: revisited the 2026-07-17 decision (owner asked to reconsider). Owner-only collapsible "Item History" section shipped on all three item surfaces (detail page, quick-view, intercepted modal) — added-to-TPP date, each completed loan (lent to / returned by, linked username), each completed transfer (transferred from, linked username). Borrowers see nothing, not even for items they're actively borrowing. New `item_loans.returned_at` / `item_transfers.completed_at` columns (neither table had a reliable completion timestamp before) + an additional RLS SELECT policy granting the *current* owner of an item visibility into all its loan/transfer rows regardless of historical owner/borrower — that policy is the actual enforcement, not just client-side gating. `components/ItemHistory.tsx` is shared across all three surfaces to avoid re-duplicating this. Needs an authenticated click-through to verify the rendering.
- [ ] **Return flow limbo/reminder** — If owner never confirms return after borrower clicks "Return Item", send daily bell notification to owner. Add option for borrower to ping owner with a reminder button.
- [ ] **Camp member year/attendance breakdown** — Ability to filter or view all campers attending in a specific year, or see who's attending the current year across all camps.
- [ ] **Wish list ticker optimization** — Homepage currently fetches all profiles' wish_list arrays and flattens in the browser. At scale, replace with a dedicated `wish_list_items` table (one row per tag per user) to enable pagination, location filtering, and efficient querying.
- [ ] **Wish list search page** — Reverse find-items page: search all wish list items, filter by location, see who near you needs what.
- [ ] **In-app messaging** — Replace wish list match email/notification flow with a proper message thread when messaging is built.
- [ ] **Sitewide font overhaul** — Current fonts are functional but generic. Design pass needed across all pages.
- [ ] **Credibility layer** — TBD; some way to signal trustworthiness of lenders/borrowers.
- [ ] **Gamification / incentivization** — Badges, leaderboards, real-world prizes, playa party invitations.
- [x] **Tailwind deviation** — DONE 2026-07-17: `SubmitCampModal.tsx` (65 occurrences) and `ImageSlider.tsx` (last two remaining files) converted to inline styles, preserving existing visual design (rounded corners, soft shadows) rather than re-skinning to the sharp offset-shadow look — that's a separate, undecided design pass. Hover states converted to onMouseEnter/onMouseLeave + local state (matching `app/page.tsx`'s existing pattern); `md:` responsive breakpoints converted to CSS Grid auto-fit. Also caught `bg-cyan-400` (a Tailwind-class instance of the old brand cyan, invisible to hex-literal greps) in ImageSlider's active-dot indicator, updated to teal. No Tailwind utility classes remain anywhere in app/ or components/.
- [x] **Design consistency pass — old palette in modals** — DONE 2026-07-17: migrated all 15 flagged files (`LendModal`, `TransferModal`, `AddItemModal`, `WelcomeModal`, `WishListMatchModal`, `ImportSpreadsheetModal`, `FeedbackWidget`, `inventory/client-page`, `find-items/[id]/client-page`, `settings/client-page`, `profile/[username]/client-page`, `privacy`, `auth/auth-code-error`, `MapView`, plus `list-item/client-page`) from `#2D241E`/`#5ECFDF`/`#C08261`/`#3ABFD4` to current tokens. Also caught two variants the hex grep missed (`#00aacc`, an `rgba(0,204,255,...)` decomposition of `#00ccff`) and fixed text-contrast fallout on buttons whose bg got darker. Removed unused `--color-sienna`/`--color-playa-blue` CSS vars. `SubmitCampModal.tsx` intentionally skipped — bundled with its Tailwind conversion above. Verified via computed styles on /privacy and /auth/auth-code-error (reachable without login); the affected modals need an authenticated click-through to verify visually.
- [x] **Extract shared item-action-row logic** — DONE 2026-07-17, scoped down from the original idea: extracted the *stateful logic* (the `item_loans` fetch, `isBorrower`, and `handleReturnItem`) into `lib/useItemLoan.ts`, used by all three surfaces. Did NOT merge the JSX/button rendering into a shared component — the "Edit Details" vs "Edit" label difference between the detail page and the two compact surfaces is intentional (narrower space gets shorter labels, per earlier direction), not drift, so kept each file's own rendering to avoid visual-regression risk on a change that couldn't be click-tested.
- [x] **`alert()` stragglers** — DONE 2026-07-17: `list-item/client-page.tsx` + `AddItemModal.tsx` got the settings-page toast pattern; `SubmitCampModal.tsx` got an inline error line (kept Tailwind, that conversion is still the deferred item above); `AvatarUpload.tsx` got an `onError` callback prop wired to the profile page's existing `saveError` state.
- [x] **Dead `clever-endpoint` edge function** — DONE 2026-07-20: deleted via Supabase Dashboard (confirmed 0 invocations ever, since its deploy). Was a duplicate of `send-feedback-notification` under Supabase's auto-generated slug, left over from before that function was properly named.
- [x] **`gear_items` RLS policy consolidation** — DONE 2026-07-17: dropped two byte-identical duplicate policies, kept `Owner Access`.
- [x] **`SECURITY DEFINER` functions missing `search_path`** — DONE 2026-07-17: `set search_path = public` added to all 7 remaining flagged functions (2 of the original 9 were the dead loan/transfer-accepted triggers dropped earlier the same session). Advisor confirmed clean.
- [x] **Migrations not tracked in git** — DONE 2026-07-17: reconstructed all 46 migrations from `supabase_migrations.schema_migrations` (which stores the raw SQL Supabase's own tracking already keeps) into `supabase/migrations/`, one file per migration, named to match Supabase's version+name exactly. Retroactive documentation only, no schema changes applied. Going forward, every `apply_migration` call should also land its SQL here.
- [ ] **Leaked password protection disabled** — Supabase Auth setting (HaveIBeenPwned check), found 2026-07-17. Dashboard toggle (Authentication → Policies), not fixable via SQL/API.

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
- [x] **Notification types Phase 2** — DONE: transfer_accepted/declined, item_request, loan_return_confirmed, loan_pickup_ready, transfer_pickup_ready, and loan_return_pending are all wired to inserts + header switch cases as of 2026-07-17.
- [ ] **Wish list match — logged-out state** — Currently the "I have one of these" button only shows to logged-in users. Consider showing a prompt to logged-out visitors to sign in to send a match.
- [ ] **New user guidance flow** — Tooltips or highlight circles around key features; step-by-step walkthrough page by page. Triggered on first login, after the welcome modal. Scope TBD.
- [ ] **FAQ page** — TBD whether it replaces /about or sits alongside it. Content TBD. Should cover: how borrowing/lending works, what happens if something is damaged, how camps work, how visibility settings work, how to get listed on the resources directory.

---

## ✅ Done (session — 2026-07-17)

### Loan-aware item visibility + notifications
- [x] `gear_items.is_on_loan` boolean added, kept in sync via a `security definer` trigger on `item_loans` status changes — needed because `item_loans` itself is RLS-scoped to owner/borrower only, so a client-side join would silently return nothing for third-party viewers
- [x] find-items grid/list — actively-loaned items excluded
- [x] Item detail page + intercepted modal (`@modal/(.)find-items/[id]`) + find-items quick-view — all three now gate Edit/Transfer/Delete (owner) and Request (everyone else) gray when on loan; quick-view modal's CTA was missed in the first pass (reachable via direct URL sync bypassing the grid filter) and fixed in a follow-up
- [x] Active borrower sees a "Return Item" button on the item detail page instead of a dead Request button; confirming return inserts a new `loan_return_pending` bell notification for the owner (both from the detail page and from `/inventory`'s existing return flow) in addition to the existing email
- [x] find-items quick-view modal — added Transfer button, shortened owner labels to Edit/Transfer/Share/Delete to match the item detail page
- [x] Redesigned `app/@modal/(.)find-items/[id]/page.tsx` — was still on the pre-"Playful Field Guide" color scheme with only a bare Delete link; brought up to current design tokens + full button set
- [x] Bell notifications for owner-confirmed handover — `loan_pickup_ready` / `transfer_pickup_ready` types added, inserted from `handleOwnerConfirmTransfer`/`handleOwnerConfirmPickup` in `app/inventory/client-page.tsx`
- [x] Fixed `send-transfer-notification` edge function — deployed version was a stale copy-paste of `send-loan-notification` (read `loan_id`, queried `item_loans`, referenced the removed `pickup_by` column); local file was already correct but never redeployed — transfer emails had likely never actually sent. Redeployed via MCP.

### Bugs found along the way
- [x] Action column button alignment — `th` had 32px left padding the `td`s didn't match, drifting buttons left of their own header across all 4 inventory tables; added matching `tdActionStyle`
- [x] "Pending Handover"/"Send Reminder"/"I've Handed It Over" labels shortened for column width
- [x] **Visibility stuck private after loan return** — `updateStatus` (the To Borrow/To Keep/Private toggle) only ever forced `visibility: 'private'` moving *to* Not Available, never restored it moving away; since `handleOwnerConfirmReturn` sets an item to Not Available + private automatically, re-toggling status back to available left `visibility` stuck at `'private'` (not even a valid dropdown option), making the item invisible on find-items with no obvious cause. Fixed in `updateStatus`; also hand-fixed the two live items already stuck in that state.

### Full site audit (4 parallel investigations: dead code, design consistency, backend/DB, incomplete features)
- [x] **Security fix** — `gear_items` had two leftover RLS policies granting `anon` unconditional INSERT and UPDATE (`WITH CHECK (true)`), completely bypassing ownership — anyone with the public API key could insert junk listings or overwrite/vandalize any existing item's owner, terms, or visibility without logging in. Dropped both; existing owner-scoped policies already cover all real app behavior. Confirmed clean via `get_advisors` afterward.
- [x] **Return Item button gap closed** — the quick-view modal and intercepted `@modal` route were missing the borrower's Return Item flow entirely (only the full detail page had it from the loan-visibility feature earlier today); both now fetch the viewer's own loan row and show Return Item / Return Pending / Pending Handover states matching the detail page.
- [x] **Homepage checklist stuck-loading bug** — `fetchCurrentUser` in `app/page.tsx` had no try/catch; a thrown error would leave `checklistLoading` true forever. Added try/catch/finally (same pattern already documented as a recurring bug class). Also added try/catch to `fetchWishlists`/`fetchMarqueeItems` for consistency.
- [x] Removed 15 dead mockup/prototype HTML files from `public/` (publicly served at real URLs, zero code references) and `marketing.plugin` (unrelated Claude Code plugin bundle at repo root). Kept `mockup-dust-storm.html` — still an open decision.
- [x] Removed dead code: unused `handleDisputeReturn` + `displayName` state (`inventory/client-page.tsx`); unused `returnTermsBox`/`conditionLabelStyle`/`ownerBtnStyle`/`deleteItemBtnStyle` style consts (`find-items/[id]/client-page.tsx`); unused `User`/`Package` icon imports + `LIME`/`LIME_DK` consts + unused loop index (`find-items/page.tsx`); unused `detailsBoxStyle` (`AddItemModal.tsx`); unused `PAPER` const + dead `hasTerms` var (`RequestModal.tsx`).
- [x] Dropped two unreachable DB triggers (`on_loan_status_change`, `on_transfer_status_change`) — fired on `status = 'accepted'`/`'declined'`, a value the app's loan/transfer state machine never actually writes. Confirmed zero live trigger activity before dropping.
- [x] Remaining findings not fixed today (design consistency pass, shared item-action-row extraction, `alert()` cleanup, dead `clever-endpoint` edge function, RLS policy consolidation, `search_path` warnings, migrations-not-in-git gap) logged under Ideas & Long Term above.

### Audit follow-through
- [x] `gear_items` RLS policy consolidation — dropped two byte-identical duplicate owner policies.
- [x] `search_path` fixed on 7 `SECURITY DEFINER` functions (`notify_followers_on_new_item`, `notify_on_new_follower`, `notify_on_camp_join`, `handle_camp_claim_approved`, `handle_camp_claim_denied`, `confirm_transfer_receipt`, `handle_new_user`). Advisor confirmed clean afterward, aside from intentional public-form/storage-bucket warnings and informational SECURITY DEFINER RPC notices (already verified safe — each checks `auth.uid()` internally).
- [x] Found (not fixable via SQL): leaked password protection disabled in Supabase Auth — Dashboard-only toggle, logged for Alex.
- [x] `alert()` → inline error UI across `list-item/client-page.tsx`, `AddItemModal.tsx`, `SubmitCampModal.tsx`, `AvatarUpload.tsx`.
- [x] **Design consistency pass** — migrated all 15 flagged files off the pre-redesign palette to current tokens; caught two additional stale-color variants (`#00aacc`, an rgba decomposition of `#00ccff`) the original grep missed; removed 2 unused CSS custom properties. `SubmitCampModal.tsx` skipped (bundled with its own Tailwind conversion, still deferred).
- [x] **Shared `useItemLoan` hook extracted** (`lib/useItemLoan.ts`) — centralizes the `item_loans` fetch + `isBorrower` + `handleReturnItem` logic that all 3 item-view surfaces previously duplicated (the same duplication that caused the earlier Return Item gap). JSX/button rendering intentionally left per-file — didn't merge into a shared component since the label differences (Edit Details vs Edit) are deliberate, and a full JSX merge couldn't be visually verified without login.
- [x] **Everything closed out** — `SubmitCampModal.tsx`/`ImageSlider.tsx` converted off Tailwind, migration history reconstructed into git, `clever-endpoint` deleted via Dashboard (0 invocations ever, confirmed by Alex before deleting). Nothing outstanding from the 2026-07-17 full-site audit.

## ✅ Done (session 35 — 2026-06-08, pre-launch)

### Pre-launch audit fixes
- [x] Fix: borrow terms hidden for keep items — `isGift` checked wrong string (`'You can keep it'` → `'Available to Keep'`); fixed across all 8 surfaces: find-items detail page, parallel modal, quick-view panel, RequestModal UI, RequestModal pre-filled message, profile items table, camp card view, camp list view
- [x] Fix: orphaned "shoes" row (id 30) with null user_id and null location_id — deleted from DB
- [x] Fix: `getUser()` → `getSession()` in settings page — prevents GoTrue lock contention on mount
- [x] Fix: OG image resized to 1200×630px — replaced `public/TPP_logo1.png`
- [x] Confirmed: `/app/profile/page.tsx` and `/app/auth/page.tsx` already deleted — no action needed
- [x] Smoke test: Getting Started checklist — slide-in, items, Skip, collapsed bar all working
- [x] **Site promoted to public** 🎉

### RequestModal redesign
- [x] Redesign: borrow flow — title eyebrow + Arvo item name; 2-row terms block (Row 1: Posted by @username (linked to profile) | If damaged | If not returned; Row 2: Pick up by date input | Return by | Item Location); return condition italic quote; taller message textarea; Outfit font (not Courier New)
- [x] Redesign: keep flow — matching styled box with Posted by | Item Location; same message structure
- [x] Fix: message template — To: OwnerName (@username); Item: name (URL); Accept/Counter checkboxes only shown when terms exist; signature is preferred name + profile URL (no @username line, no parentheses)
- [x] Fix: pickup date inserts into message header block (not prepended above To: line)
- [x] Fix: Request button on item detail page and parallel modal — updated to new design system (teal #1E8A82, white text, ink border + offset shadow)

## ✅ Done (session 34 — 2026-06-08)
- [x] Deploy `send-loan-notification` — confirmed `pickup_by` was never in the email HTML; file was already clean; deployed to Supabase Dashboard (Verify JWT off).
- [x] Pre-launch codebase audit — audited all app/ and components/ files; key findings logged in Next Session Priority section.

## ✅ Done (session 33 — 2026-05-29)

### Cowork SEO audit & fixes
- [x] Audited all Cowork SEO commit changes — found 6 uncommitted server/client splits, 3 broken imports, Tailwind in terms page, stale brand color in privacy
- [x] Fix: `app/terms/page.tsx` — rewrote from Tailwind utility classes to inline CSS, matching design system (Arvo, Space Mono, ink/paper tokens)
- [x] Fix: `app/privacy/page.tsx` — link color `#00aacc` → `#1E8A82`
- [x] Fix: `app/camps/[slug]/page.tsx` — `@/utils/supabase/server` import didn't exist; replaced with inline `@supabase/ssr` createServerClient
- [x] Fix: Committed missing server/client shell files — `app/inventory/page.tsx`, `app/settings/page.tsx`, `app/camps/[slug]/page.tsx`, `app/list-item/page.tsx`, `app/find-items/[id]/page.tsx`, `app/profile/[username]/page.tsx` — all had been split by Cowork locally but never pushed; Vercel was serving old monolithic components
- [x] Fix: Committed `utils/supabase/server.ts` helper and remaining client files — `app/list-item/client-page.tsx`, `app/find-items/[id]/client-page.tsx`

### Getting Started checklist (feature)
- [x] DB migration: `checklist_dismissed` + `has_browsed` boolean columns added to `profiles` table
- [x] Feature: `components/ChecklistBox.tsx` — animated white box, 5 items with title + description + destination label, progress bar, auto-dismiss on completion, Skip button
- [x] Feature: Checklist wired into homepage hero right panel — slides in from behind header after 1s delay, overlays scrolling content; logged-out users always see scrolling content; fetches real completion state from 5 parallel Supabase queries
- [x] Feature: `/find-items` marks `has_browsed = true` on first visit (fire-and-forget)
- [x] Feature: Collapsed progress bar on profile page — shows for owner when checklist was dismissed but not complete; click toggles expand
- [x] Mockup: `public/mockup-checklist-hero.html` — shows slide-in animation with replay button, 3 color variants

### Odds & ends
- [x] Copy: Homepage — "See something you can use?..." → "Click on an item to see the details and make the request."
- [x] Design: Homepage resources buttons — size matched to hero Browse Gear / List Your Stuff buttons (13px 28px, 0.9rem)
- [x] Design: Inventory — `thStyle` + `labelStyle` header colors darkened `#9A8878` → `#4A3828`; Action column gets 32px left padding + `width: 1%` to push it right of Availability
- [x] Design: Settings — section box background `#FDFAF4` → `#EDE5D0` to match list-item form boxes; removed subtle box-shadow; fixed loading bg
- [x] Copy: Various — "My Campmates" → "Campmates" on find-items; Show from / Category / Available to labels get colons; "+" removed from Add Item button on profile; "if applicable" removed from checklist; "Returning in 2026?" → "Attending in 2026?" on profile
- [x] Design: Profile section headers — darkened `#9A8878` → `#4A3828`, bumped `0.6rem` → `0.68rem`; subheads added under Playa History and Wish List; Available Items gets owner subhead linking to inventory
- [x] Design: Find Items — Show From chips right-aligned (`marginLeft: auto`); Category/Show from/Available to labels get colons; objectFit `cover` → `contain` on card + list view photos
- [x] Design: List Item page — title left-aligned (rsp-px moved to inner div); subhead font/size matches inventory; h1 margin `0` → `0 0 12px`
- [x] Design: Find Items — black line moved between title and filters (matches inventory pattern); subhead added: "Browse gear available to borrow or keep from people in your community."
- [x] Design: Inventory — spreadsheet hint restored to subhead: "Click Import Inventory to add multiple items via spreadsheet."; `maxWidth` removed from subhead; `page.tsx` shell committed (was the uncommitted Cowork split)
- [x] Copy: About page — title "An About Page." → "About Page."; first 3 Why paragraphs moved outside accordion as static intro; Why accordion starts at "Because everything you need..."; 3 new "Because..." paragraphs; accordion gap tightened 20px → 8px
- [x] Copy: Resources page — "Directory" eyebrow removed; "Burn — composting" → "Burn: composting"; text box widened 560px → 750px; submit line rewritten
- [x] Copy: Homepage — hero title updated to "Why let your stuff gather dust in storage when it could be gathering dust on playa?" with "in storage" and "on playa?" in orange (non-italic); subhead tightened; "Camps providing community services" → "Camps providing services"; various tab copy updates
- [x] Copy: Profile — "Attending in 2026?" label (was "Returning")
- [x] SEO: CLAUDE.md updated with Supabase table grants protocol (rule #6)

### Camp pages redesign
- [x] Design: Camp pages full overhaul — header band pattern, all old `#2D241E`/`#C08261`/`borderRadius`/`#5ECFDF` replaced with design system tokens
- [x] Design: Camp title — "The Playa Provides" prefix removed; underline removed; last word in lime (#B8CC2A) italic
- [x] Design: Claim This Page flow — moved to header band right side; compact inline pill; claim form collapses into band
- [x] Design: Edit Camp button — matches Edit Profile style (transparent bg, ink border, offset shadow)
- [x] Design: Wish list tags in members table — now match profile page (teal chips, Space Mono)
- [x] Design: Year badges — mustard + white Space Mono (matches profile)
- [x] Design: Members table + camp items list — inventory-style container (FDFAF4 bg, ink border, EDE5D0 header row, Space Mono uppercase headers)
- [x] Design: Header band height — padding `28px 0 52px` to match other pages without subhead

## ✅ Done (session 32 — 2026-05-25)
- [x] Design: List Item — removed "Add to Inventory" eyebrow; title changed to "List an Item."; subhead added: "Make it available to borrow, give it away, or keep it hidden on your private inventory."; field `labelStyle` color darkened from `#9A8878` to `#4A3828`
- [x] Design: Settings — removed "Account" eyebrow above h1; `labelStyle` color darkened to match list-item
- [x] Copy: Homepage — Wish List row label updated to "Wish List Items" with subtext linking to the viewer's own profile; Available Now row updated with "See something you can use? Click on the item…" subtext; added `currentUsername` session fetch to power the profile link
- [x] Design: Find Items — swapped "Available to" and "Show from" filter row positions (Available to now lives with view toggle + count; Show from moves up to search row)
- [x] Design: Profile — Playa History moved to top grid (left col, alongside Wish List); Bio and Playa Story moved below as side-by-side bordered boxes (3fr / 1fr); mobile collapses both grids to single column
- [x] Design: Profile — "Manage Inventory" button swapped to outlined/secondary; "+ Add Item" button swapped to teal/primary with offset shadow
- [x] Feature: Inventory — Items Out on Loan, Items Being Transferred to Me, Items I'm Borrowing always render (no longer hidden when empty); empty-state rows shown with italic message

## ✅ Done (session 31 — 2026-05-25)
- [x] Design: Profile page — @username / pronouns / location merged onto same row as follower counts + Edit Profile / Follow button; gray separator line above Bio/Wish List removed
- [x] Fix: Profile header band — Edit Profile button right edge aligned with content section below; horizontal padding moved to inner max-width div so auto-margins match across header + content
- [x] Fix: All pages — header band left/right edges aligned with content below (inventory, find-items, resources, about, profile); fix applied by moving `padding: 0 40px` to the inner `maxWidth` container div instead of the outer band div
- [x] Fix: Mobile — global horizontal scroll eliminated; `overflow-x: hidden` on html/body, hero right panel hidden on mobile, header inner padding reduced to 16px at ≤640px
- [x] Feature: Frogger — swipe-to-move added for mobile (touchstart/touchend/touchmove handlers wired to movePlayer)
- [x] Fix: Feedback form — `send-feedback-notification` edge function was never deployed; widget was throwing on missing function and blocking success. Fixed: edge function call is now fire-and-forget (feedback saved to DB regardless); edge function file committed to `supabase/functions/send-feedback-notification/index.ts` (**still needs Dashboard deploy**)
- [x] Fix: Mobile audit — 6 fixes across 4 files:
  - find-items cards grid: hardcoded `padding: 20px 40px` → `rsp-px` class (16px on mobile)
  - find-items list view: Terms + Category columns hidden on mobile; grid collapses to `48px 1fr 90px`
  - find-items Show From row: view toggle + count always flush right via `margin-left: auto`
  - homepage resources section: text + button stacks vertically on mobile
  - profile header: @username/counts/button row stacks on mobile; right group uses `space-between`
  - inventory filter bar: Import + Add New Item buttons stretch full width on mobile
- [x] Design: Homepage On-Playa Resources section — rebuilt as 2-column layout (no box): left col "Camps providing services…" + Browse the Directory button; right col submit pitch copy + Submit Your Camp button; buttons aligned to same row via `margin-top: auto`; stacks to 1 col on mobile
- [x] Feature: Homepage — Submit Your Camp button opens `SubmitCampModal` directly (same modal as `/resources` page); no redirect needed

## ✅ Done
- [x] Fix: Profile page visibility filtering — owner sees all available items; logged-in non-owner sees only items they have access to based on follow/campmate relationship; logged-out visitors see public items only
- [x] Feature: Profile page Available Items — "Manage Inventory" (purple) and "Add New Item" (teal) buttons added to section header, owner-only; Add New Item opens AddItemModal inline
- [x] Feature: Profile page Available Items — item rows now open item page in new tab on click; View → column removed; Visible To column added for owner view
- [x] Fix: Find Items list view — View → column removed
- [x] Fix: Signup redirect — email signup now lands on /profile/[username]; Google OAuth redirect updated to /settings?setup=true
- [x] Fix: Welcome modal moved to profile page — triggers on first visit when has_seen_welcome is false and viewer is owner
 - [x] Fix: Settings page — after first save, redirects to /profile/[username] so Google OAuth users land on their profile after completing setup
 - [x] Fix: Signup redirect — replaced router.refresh() + router.push() with window.location.href hard nav to eliminate inventory flash
 - [x] Fix: Welcome modal button layout — "Set Up Your Profile →" is now the primary CTA (right, colored); "Browse Items" and "List Items" are secondary (left/middle); "List My First Item" removed
 - [x] Fix: Username case sensitivity — dropped unique_username constraint, replaced with case-insensitive unique index on lower(username); existing usernames backfilled to lowercase; settings input auto-lowercases on keystroke; uniqueness check and upsert normalize to lowercase; profile page URL lookup lowercased so /profile/Alex and /profile/alex resolve identically
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
- [x] Fix: theplayaprovides.org — redirects to theplayaprovides.com via Squarespace domain forwarding (301 permanent)
- [x] Setup: camps@theplayaprovides.com created in Google Workspace
- [x] Design: Footer — tightened height; nav links and BM disclaimer moved to same rows as Instagram handle and credit line
- [x] Content: About page — full copy overhaul with new accordion sections (Why? / How? / Who? / Can I Help?); Bop It audio easter egg
- [x] Content: TPP How-To Guide — fully updated Word doc reflecting all recent changes
- [x] Fix: Campmates Only visibility option grayed out — `user_camp_affiliations` rows with null `camp_id` (open camping / returning-status rows) poisoned the PostgREST `.in()` filter with a 400 Bad Request, silently zeroing out campMateIds; fixed with `.not('camp_id', 'is', null)` at DB query level in `list-item/page.tsx`, `inventory/page.tsx`, `AddItemModal.tsx`, and `find-items/page.tsx`; also switched `getUser()` → `getSession()` on list-item to prevent lock contention silently skipping the fetch
- [x] Design: Full visual overhaul — "Playful Field Guide" design system shipped across all 15 pages/components: Fraunces serif headlines, Space Mono labels, warm ink/paper palette (#1C1610 / #F6F1E8), offset-shadow buttons, ink borders, no border-radius, grain texture. Header (dark ink + lime accent), footer, homepage (polaroid marquee + Frogger easter egg + field notes grid), find-items (5-col polaroid grid, centered modal, category chips), login, signup, about (accordion), resources, settings, inventory, list-item, profile. Teal #1E8A82 replaces old #3ABFD4/#5ECFDF throughout.
- [x] Fix: Header active-page nav highlighting — usePathname() drives lime highlight on current page (desktop + mobile); previously hardcoded to "Offer Items" only. _(session 29)_
- [x] Design: Inventory — "My Gear" eyebrow removed; spreadsheet hint updated to "Click Import Inventory to add multiple items via spreadsheet." _(session 29)_
- [x] Design: About — "About" eyebrow removed from page header band. _(session 29)_
- [x] Design: Find Items — "Browse" eyebrow removed; pipe separators replaced with flex group divs (no more stray | at end of Category row); keyword field narrowed to ~45%; "Search by Location:" label added before ZIP; Cards/List/Map view toggle added to results bar; list view added as new view mode; MapView dynamically imported. _(session 29)_
- [x] Design: Profile — "Community / Your Profile" eyebrow and duplicate identity block removed from main content area; full identity (avatar, name, @username, pronouns, location, social links, follower/following counts, Edit/Follow button) moved into the page header band. _(session 29)_
- [x] Fix: Profile × encoding corruption — Ã— (garbled UTF-8) fixed to × in wish list remove button, followers/following modal close button, and playa history remove-year button. _(session 29)_
- [x] Design: Profile "Manage Inventory" button — updated from purple (#d896ff) to teal + 2px ink border + 2px offset shadow, matching the new design system. _(session 29)_
- [x] Design: Profile wish list — tags updated to square corners, Space Mono text, ink-bordered teal chips; input/Add button updated to new design tokens; "I have one of these" button updated to ink border + offset shadow. _(session 29)_
- [x] Design: Profile Playa History — year badges updated to mustard background (#D4A020) + white Space Mono text; affiliation cards use paper-dk background + ink border. _(session 29)_
- [x] Fix: Code review audit — `saveError` displayed inline on profile; ID comparison fixed (`String(i.id) === idFromUrl`) in find-items; `getSession()` swapped for `getUser()` in inventory; private item visibility guard added to find-items filteredItems; bell hover CSS moved from page.tsx to header.tsx; followers modal centering fixed; `return_pending` added to inboundLoans status filter; BellButton deduplicated (single component for desktop + mobile); unused `makeAvailableButtonStyle` constant removed. _(session 30)_
- [x] Design: Frogger — bicycle button moved below polaroids + centered; 🐸 stacked atop 🚲 icon; arrow keys added to bottom bar right side; player spawn drops to bottom bar row (PAD=48, row 0 = H - P_H - 4); JSX fragment fix resolved Vercel build failure. _(session 30)_
- [x] Fix: Homepage — removed green underline from "earning it on playa" span. _(session 30)_
- [x] Design: Homepage feature section — toggle renamed to "What's the Deal / What's the Point" (was "How it works / Why it matters"); 4 feature highlight cards in What's the Deal tab; Field Notes philosophical cards in What's the Point tab; copy edits: "A Decommodification Modification", "Do the math." removed. _(session 30)_
- [x] Fix: Bell — trigger button hides when dropdown opens; backdrop click still closes. _(session 30)_
- [x] Design: Find Items filter layout — "Search by Keyword:" label added before keyword field (matching location); Available To chips moved to search row (right of ZIP); view toggle + item count moved to Show From row (right-aligned); separate results bar removed. _(session 30)_
- [x] Fix: Find Items — corner tag "Free Keep" → "Keep". _(session 30)_
- [x] Design: Find Items list view — proper CSS grid table with column headers (Item / From / Terms / Category); description snippet inline with item name; return terms column (borrow items only); category chip per row. _(session 30)_
- [x] Feature: Find Items — view mode (cards/list/map) persisted in localStorage; survives page navigation and refresh. _(session 30)_
- [x] Feature: Frogger — 5-level progression: speed scales +18%/level (1.0×→1.72×), items per lane 6→10; Web Audio chirp on level win; LVL display in bottom bar; final win (beat level 5) exits game with gold flash and resets to level 1. _(session 30)_
- [x] Design: Dust storm hero mockup — `public/mockup-dust-storm.html` with canvas particle animation in 3 modes (Storm heavy / Haze subtle / Clear off); sandy-tan streaks sweeping left, warm haze overlay. Decision on whether to implement pending. _(session 30)_
