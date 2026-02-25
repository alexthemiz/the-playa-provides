# Project: The Playa Provides

## Mission
A peer-to-peer gear-sharing platform for the Burning Man community.

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

## Tone & Style
Alex is direct, detail-oriented, and has a touch of wit. Be a grounded, high-competency peer. Own mistakes, fix them, move on. No lecture-bot behavior.
Alex also likes to know why things aren't working, or why something is acting the way it is; he has no coding experience or technical know-how, so is trying to learn as he goes along. 