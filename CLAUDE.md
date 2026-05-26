# Project: The Playa Provides

## Mission
Peer-to-peer sharing platform for the Burning Man community.

## Tech Stack
- **Framework:** Next.js 16.1.6 (App Router)
- **Runtime:** React 19
- **Database/Auth:** Supabase (PostgreSQL) using the `@supabase/ssr` client
  - `@supabase/auth-helpers-nextjs` is also installed but is a legacy package — do not use it for new code; prefer `@supabase/ssr` exclusively
- **Styling:** Inline React CSS objects for all component/page styles.
  - Every literal style property (e.g., `flexDirection`, `position`) MUST use `as const` to satisfy TypeScript literal type requirements.
  - `globals.css` exists for base resets, CSS custom properties (theme tokens), and the Tailwind import — do not add component styles there.
  - Tailwind v4 is installed and imported in `globals.css` for the design token layer only. Do not use Tailwind utility classes in component JSX.
- **Theme:** Daylight Mode by default; respects system dark mode via CSS media query in `globals.css`.
  - Hardcoded backgrounds in components must use `#fff` or light neutrals — do not hardcode dark backgrounds in component styles.
  - Avoid "black sides" on pages; use `width: 100%` and `backgroundColor: '#fff'` on wrappers.
  - Do not force dark mode off via script; the `@media (prefers-color-scheme: dark)` block in `globals.css` handles OS-level preference gracefully.
- **Edge Functions:** Supabase Edge Functions (Deno runtime) live in `supabase/functions/`. The `deno.json` at project root is intentional and scoped to these functions.
- **Icons:** `lucide-react`

## File Structure (key paths)
- `app/` — Next.js App Router pages and layouts
- `app/@modal/` — Parallel route for item detail modals (intercepted from `/find-items/[id]`)
- `app/auth/callback/route.ts` — Auth callback route. **Do not touch without discussion.**
- `components/` — Shared UI components
- `lib/supabaseClient.ts` — Browser-side Supabase client (`createBrowserClient`)
- `middleware.ts` — Auth session refresh middleware. **Do not touch without discussion.**
- `supabase/functions/send-request-email/` — Edge Function for request notification emails (Resend API)
- `types/inventory.ts` — Shared TypeScript types

## Operational Protocols
1. **Sequential Pacing:** Only perform one major step at a time. Number steps (1, 1.1, 1.2, 2, etc.). Do not proceed to a new major step until the user explicitly says "Done" or "Go."
2. **No Hallucinations:** Read files before suggesting paths. Never guess a folder name.
3. **Full File Deliverables:** For major page overhauls, provide the entire file content. For surgical fixes, provide the block with enough surrounding context for a quick Ctrl+F find.
4. **Auth Vigilance:** Do not modify `middleware.ts` or `app/auth/callback/route.ts` without a specific, discussed reason. We have a history of Auth Loops.
5. **End of Session Protocol:** After every commit and push, update `TASKS.md` — move completed items to ✅ Done, update 🏗️ In Progress, and add anything new that came up during the session.
6. **Supabase Table Grants:** Every migration that creates a new table in the `public` schema MUST include explicit grants. Supabase no longer auto-grants access to new tables (enforced October 30, 2026). Without these, supabase-js queries will fail silently with a `42501` error. Always append to any `CREATE TABLE` migration:
   ```sql
   grant select on public.your_table to anon;
   grant select, insert, update, delete on public.your_table to authenticated;
   grant select, insert, update, delete on public.your_table to service_role;
   ```
7. **Branching:** Commit and push directly to `master` for all changes. Do not create feature branches unless Alex explicitly asks for one on a specific task.

## Key Patterns & Gotchas
- **Post-auth navigation:** Always use `window.location.href` instead of `router.push()` for redirects after login/signup to avoid page flash issues
- **Responsive layout:** Use `<style>` tag with `@media` queries only — never `useEffect` or `useState` for window width detection
- **Edge functions:** Always deploy manually via Supabase Dashboard → Edge Functions; toggle Verify JWT off
- **Session reads:** Use `getSession()` for UI rendering, not `getUser()`, to avoid GoTrue lock contention
- **Test accounts:** `@alex` and `@abm`
- **RLS silent failures:** RLS blocks return 0 rows with no error — always test visibility issues by checking RLS policies first
- **CSS property naming:** camelCase in inline styles (`boxShadow`) won't be found by searches for `box-shadow` — use camelCase in all searches
- **The Request to Borrow button** exists in three separate files — always confirm which file is being edited before making changes

## Tone & Style
Alex is direct, detail-oriented, and has a touch of wit. Be a grounded, high-competency peer. Own mistakes, fix them, move on. No lecture-bot behavior.
Alex also likes to know why things aren't working, or why something is acting the way it is; he has no coding experience or technical know-how, so is trying to learn as he goes along.

## Debugging Visual Issues

1. **Devtools first.** When a style change isn't appearing on the live site, open browser devtools, click the element, and read `element.style` before doing anything else. This immediately identifies which file and style is responsible.

2. **Find all instances before editing.** Use Ctrl+Shift+F to search for the button label text or style name across all files before making changes. Multiple components often render the same UI element (e.g. the Request button exists in find-items/page.tsx, @modal/(.)find-items/[id]/page.tsx, and find-items/[id]/page.tsx).

3. **Verify file contents after CC runs.** CC's "done" confirmations on style changes are unreliable. Always check the actual file after CC reports completion.

4. **Branch testing requires Vercel preview configuration.** Feature branches are not automatically deployed by Vercel. Test visual changes directly on master (low risk) or configure Vercel to build previews from feature branches before testing.