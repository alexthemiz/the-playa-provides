# Project: The Playa Provides

## Mission
Peer-to-peer gear-sharing platform for the Burning Man community — list gear you own, borrow gear from or gift it to others, before/after/during the event.

## Tech Stack
- **Framework:** Next.js 16.1.6 (App Router), Turbopack dev server
- **Runtime:** React 19.2.3
- **Database/Auth:** Supabase (PostgreSQL), project ref `bklycpitofjrjhizttny`, using the `@supabase/ssr` client exclusively
  - `@supabase/auth-helpers-nextjs` is also installed but is a legacy package — do not use it for new code
- **Styling:** Inline React CSS objects for all component/page styles. No exceptions remain anywhere in `app/` or `components/` — the last two Tailwind-in-JSX files (`SubmitCampModal.tsx`, `ImageSlider.tsx`) were converted 2026-07-20.
  - Every literal style property (e.g., `flexDirection`, `position`) MUST use `as const` to satisfy TypeScript literal type requirements.
  - `globals.css` exists for base resets, CSS custom properties (theme tokens), and the Tailwind import — do not add component styles there.
  - Tailwind v4 is installed and imported in `globals.css` for the design token layer only. Do not use Tailwind utility classes in component JSX.
  - **Current design system ("Playful Field Guide")**, shipped sitewide: warm ink/paper palette, offset-shadow buttons (`border: 2px solid INK; boxShadow: 3px 3px 0 INK`), no border-radius, Arvo serif headlines, Space Mono labels/eyebrows, Outfit body text. Canonical hex tokens — treat anything outside this list as a pre-redesign leftover to fix, not a deliberate choice:
    - Ink: `#1C1610` (primary), `#4A3828` (mid/labels), `#9A8878` (light/muted)
    - Paper: `#F6F1E8` (page bg), `#EDE5D0` (dark paper / header rows), `#FDFAF4` (light paper / cards)
    - `#1E8A82` teal — primary CTA, borrow-flow actions
    - `#D4A020` mustard — secondary CTA, transfer/gift-flow actions
    - `#B8CC2A` lime — nav active-state highlight only, not a general accent
- **Theme:** Daylight Mode by default; respects system dark mode via CSS media query in `globals.css`.
  - Hardcoded backgrounds in components must use `#fff` or light neutrals — do not hardcode dark backgrounds in component styles.
  - Avoid "black sides" on pages; use `width: 100%` and `backgroundColor: '#fff'` on wrappers.
  - Do not force dark mode off via script; the `@media (prefers-color-scheme: dark)` block in `globals.css` handles OS-level preference gracefully.
- **Maps:** `leaflet` / `react-leaflet`, loaded via `dynamic(() => import(...), { ssr: false })` (see `components/MapView.tsx`) since Leaflet touches `window` at import time.
- **Spreadsheet import:** `papaparse` (CSV) + `xlsx` (Excel) power the bulk-import modal on `/inventory`.
- **Edge Functions:** Supabase Edge Functions (Deno runtime) live in `supabase/functions/`. The `deno.json` at project root is intentional and scoped to these functions. TypeScript errors reported under `supabase/functions/` (missing Deno globals, remote URL imports) are expected and can be ignored — they don't reflect a real problem.
- **Icons:** `lucide-react`

## File Structure (key paths)
- `app/` — Next.js App Router pages and layouts
- `app/@modal/` — Parallel route for item detail modals (intercepted from `/find-items/[id]`)
- `app/auth/callback/route.ts` — Auth callback route. **Do not touch without discussion.**
- `components/` — Shared UI components
  - `components/ItemHistory.tsx` — owner-only item history (added-to-TPP / lent / returned / transferred dates), shared across all 3 item-view surfaces
- `lib/supabaseClient.ts` — Browser-side Supabase client (`createBrowserClient`)
- `lib/useItemLoan.ts` — shared hook centralizing loan state (`myLoan`, `isBorrower`, `handleReturnItem`) for anywhere an item's Request/Return button can appear. This is the canonical home for that logic — see the gotcha below before reimplementing it in a new surface.
- `middleware.ts` — Auth session refresh middleware. **Do not touch without discussion.**
- `supabase/functions/` — Edge functions (Deno runtime). Deploy manually via Supabase Dashboard, see Key Patterns below.
- `supabase/migrations/` — Full migration history, one `.sql` file per migration actually applied to the live project, named `<Supabase-reported version>_<name>.sql`. This folder was nearly empty for months (1 file vs. 46 real migrations) until reconstructed 2026-07-17 from Supabase's own `supabase_migrations.schema_migrations` tracking table. **Every future schema change made via `apply_migration` (or the Dashboard SQL editor) should also be saved here** — otherwise the gap silently reopens and schema history stops being reconstructable from git.
- `types/inventory.ts` — Shared TypeScript types

## Operational Protocols
1. **Sequential Pacing:** Only perform one major step at a time. Number steps (1, 1.1, 1.2, 2, etc.). Do not proceed to a new major step until the user explicitly says "Done" or "Go."
2. **No Hallucinations:** Read files before suggesting paths. Never guess a folder name.
3. **Full File Deliverables:** For major page overhauls, provide the entire file content. For surgical fixes, provide the block with enough surrounding context for a quick Ctrl+F find.
4. **Auth Vigilance:** Do not modify `middleware.ts` or `app/auth/callback/route.ts` without a specific, discussed reason. We have a history of Auth Loops.
5. **End of Session Protocol:** After every commit and push, update `TASKS.md` — move completed items to ✅ Done, update 🏗️ In Progress, and add anything new that came up during the session. Keep it lean: this file doubles as external context (e.g. uploaded to a Claude Project) — a long session-by-session changelog belongs in git history, not in the live document. Summarize by feature/current-state, not by session number.
6. **Supabase Table Grants:** Every migration that creates a new table in the `public` schema MUST include explicit grants. Supabase no longer auto-grants access to new tables (enforced October 30, 2026). Without these, supabase-js queries will fail silently with a `42501` error. Always append to any `CREATE TABLE` migration:
   ```sql
   grant select on public.your_table to anon;
   grant select, insert, update, delete on public.your_table to authenticated;
   grant select, insert, update, delete on public.your_table to service_role;
   ```
7. **Branching:** Commit and push directly to `master` for all changes. Do not create feature branches unless Alex explicitly asks for one on a specific task.
8. **Migration tracking:** Save every applied migration as a file in `supabase/migrations/`, named to match what `list_migrations` reports (`<version>_<name>.sql`). See File Structure above for why this matters.

## Key Patterns & Gotchas
- **Post-auth navigation:** Always use `window.location.href` instead of `router.push()` for redirects after login/signup to avoid page flash issues
- **Responsive layout:** Use `<style>` tag with `@media` queries only — never `useEffect` or `useState` for window width detection
- **Edge functions — deploy AND verify:** Deploy manually via Supabase Dashboard → Edge Functions, toggle Verify JWT off. **Local source can silently drift from what's actually deployed.** `send-transfer-notification` was a stale copy-paste of a different function (wrong table, wrong column names, referenced a since-removed field) for months before being caught — the local file was already correct but had simply never been redeployed. If a function's behavior seems wrong, compare the local file against the live deployed version before assuming the local file is what's running.
- **Session reads:** Use `getSession()` for UI rendering, not `getUser()`, to avoid GoTrue lock contention — `getUser()` makes a network round-trip and holds a shared lock that queues every other Supabase call on the page behind it.
- **RLS silent failures:** RLS blocks return 0 rows with no error — always test visibility issues by checking RLS policies first, not application code.
- **RLS — extend with additive policies, don't loosen existing ones:** Postgres OR's multiple SELECT policies together, so when a feature needs one specific user to see *more* than the default policy allows, add a new, narrowly-scoped policy rather than relaxing the existing one. Be precise about exactly who the new policy grants access to — "current owner of this item" (`gear_items.user_id = auth.uid()`) is a materially different (and much safer) grant than "was ever involved with this item historically," which can expose someone's identity to a party they never had any relationship with. (See: Item History and Items I've Given Away features, both 2026-07-20 — an early draft of the latter over-granted this exact way and was walked back.)
- **Historical/provenance records should be snapshotted, not derived from a live join:** if a feature records "what you did" (e.g. an item's name at the moment you transferred it away), store that value at the time of the action rather than reading it live off the current row — otherwise the record can silently go blank or leak current-state info once the underlying row's ownership or visibility changes later. `item_transfers.item_name` is the working example.
- **CSS property naming:** camelCase in inline styles (`boxShadow`) won't be found by searches for `box-shadow` — use camelCase in all searches
- **Loan/transfer/request button row — 3 files, 1 shared hook:** the item-level Request/Return/Edit/Transfer/Delete button row exists independently in three files: `app/find-items/page.tsx` (quick-view modal), `app/find-items/[id]/client-page.tsx` (full detail page), and `app/@modal/(.)find-items/[id]/page.tsx` (intercepted modal). Always confirm which one you're editing. The stateful loan logic (`myLoan`, `isBorrower`, `handleReturnItem`) is centralized in `lib/useItemLoan.ts` — use it rather than reimplementing the fetch. The JSX/label differences between them (e.g. "Edit Details" on the full page vs. "Edit" in the two compact popups) are intentional, not drift — don't "fix" them into matching without checking first.
- **Test accounts:** `@alex` and `@abm`

## Tone & Style
Alex is direct, detail-oriented, and has a touch of wit. Be a grounded, high-competency peer. Own mistakes, fix them, move on. No lecture-bot behavior.
Alex also likes to know why things aren't working, or why something is acting the way it is; he has no coding experience or technical know-how, so is trying to learn as he goes along.

## Debugging Visual Issues

1. **Devtools first.** When a style change isn't appearing on the live site, open browser devtools, click the element, and read `element.style` before doing anything else. This immediately identifies which file and style is responsible.

2. **Find all instances before editing.** Use Ctrl+Shift+F to search for the button label text or style name across all files before making changes. Multiple components often render the same UI element — see the loan/transfer/request button row gotcha above for the canonical example of this.

3. **Verify file contents after CC runs.** CC's "done" confirmations on style changes are unreliable. Always check the actual file after CC reports completion.

4. **Branch testing requires Vercel preview configuration.** Feature branches are not automatically deployed by Vercel. Test visual changes directly on master (low risk) or configure Vercel to build previews from feature branches before testing.
