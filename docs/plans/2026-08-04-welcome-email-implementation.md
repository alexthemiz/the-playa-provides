# Welcome Email Implementation Plan

> **For Claude:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Goal:** Send a one-time welcome email at signup with an onboarding checklist, two CTA buttons, an account-details recap, and a lean no-UI referral-attribution mechanism.

**Architecture:** A new Supabase edge function (`send-welcome-email`) builds and sends the email via Resend, following the exact pattern already used by the 11 other transactional emails in this codebase (plain HTML, client-invoked via `supabase.functions.invoke`, deployed with `verify_jwt: false`). It's triggered from `app/signup/page.tsx` right after `supabase.auth.signUp()` succeeds. Referral attribution piggybacks on the existing `handle_new_user` trigger's `raw_user_meta_data` pattern (same mechanism `username`/`preferred_name`/`full_name` already use) rather than inventing a new one. The two banner images are static PNGs under `/public`, not dynamically generated per-send — they never change, so there's no reason to pay generation cost on every email.

**Tech Stack:** Next.js App Router (`app/signup/page.tsx`), Supabase Postgres (migration + trigger), Supabase Edge Functions (Deno + Resend), no automated test suite in this repo — verification is via direct SQL checks, `curl`/manual edge function invocation, and a real end-to-end test signup (matching how every other feature in this codebase has been verified).

**Reference:** `docs/plans/2026-08-04-welcome-email-design.md` — read this first if anything below is ambiguous; it has the full rationale for every content/copy decision.

---

### Task 1: Migration — `referred_by` column + `handle_new_user` trigger update

**Files:**
- Migration applied live via `mcp__supabase__apply_migration` (project_id `bklycpitofjrjhizttny`), then saved locally.
- Create: `supabase/migrations/<version>_add_referred_by_to_profiles.sql` (exact filename depends on the version Supabase assigns — see Step 3).

**Step 1: Apply the migration**

Run via `mcp__supabase__apply_migration` with `name: "add_referred_by_to_profiles"` and this SQL:

```sql
ALTER TABLE public.profiles ADD COLUMN referred_by text;

CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  INSERT INTO public.profiles (id, username, preferred_name, full_name, email, referred_by)
  VALUES (
    new.id,
    lower(new.raw_user_meta_data->>'username'),
    new.raw_user_meta_data->>'preferred_name',
    new.raw_user_meta_data->>'full_name',
    COALESCE(new.raw_user_meta_data->>'email', new.email),
    nullif(lower(trim(new.raw_user_meta_data->>'referred_by')), '')
  );
  RETURN new;
END;
$$;
```

This is a straight `CREATE OR REPLACE` on the existing trigger function — every other field's behavior is unchanged, only `referred_by` is new. `nullif(lower(trim(...)), '')` means a signup with no `?ref=` param (or an empty one) stores `NULL`, not an empty string.

No new table, so the CLAUDE.md "every new table needs explicit grants" rule doesn't apply here — `profiles` already has its grants from when it was created.

**Step 2: Verify the trigger still works correctly**

Run via `mcp__supabase__execute_sql`:

```sql
select proname, prosrc from pg_proc where proname = 'handle_new_user';
```

Expected: the function body includes `referred_by` in both the column list and the `nullif(...)` expression.

**Step 3: Save the migration file locally**

Run `mcp__supabase__list_migrations`, find the version number that was just assigned (it'll be the newest one, timestamp newer than `20260804154109`), and write the exact same SQL from Step 1 to `supabase/migrations/<that_version>_add_referred_by_to_profiles.sql`. This is required per this project's CLAUDE.md — every `apply_migration` call must have a matching local file or the migration history silently goes out of sync with git.

**Step 4: Commit**

```bash
git add supabase/migrations/<version>_add_referred_by_to_profiles.sql
git commit -m "feat: add referred_by column for lean signup referral attribution"
```

---

### Task 2: Static banner images

**Files:**
- Create: `public/email/welcome-header.png`
- Create: `public/email/welcome-footer.png`

**Step 1: Copy the already-generated PNGs into the repo**

These were already generated during design (via a throwaway `next/og` route reusing `components/RadialPlayaMotif.tsx`, matching the pattern in `app/opengraph-image.tsx`) and are sitting in the scratchpad at:
- `C:\Users\alexm\AppData\Local\Temp\claude\C--Users-alexm-Documents-the-playa-provides\5cd765bf-5fa3-4bde-b8b3-43ed9388ca8b\scratchpad\email-header.png` (600×150, paper background, ink/teal wordmark)
- `C:\Users\alexm\AppData\Local\Temp\claude\C--Users-alexm-Documents-the-playa-provides\5cd765bf-5fa3-4bde-b8b3-43ed9388ca8b\scratchpad\email-footer.png` (600×120, dark ink background, paper/teal wordmark)

If this plan is executed in a fresh session/worktree where that scratchpad path no longer exists, regenerate them: create a temporary `app/temp-email-header/route.tsx` and `app/temp-email-footer/route.tsx` using `next/og`'s `ImageResponse` (copy the pattern from `app/opengraph-image.tsx`, importing `RadialPlayaMotif`), temporarily whitelist the route path in `middleware.ts`'s `isPublicRoute` (get explicit confirmation first — `middleware.ts` is a protected file per CLAUDE.md), `curl` the route to save the PNG, then **immediately revert** the `middleware.ts` change and delete the temp route.

```bash
mkdir -p public/email
cp "C:/Users/alexm/AppData/Local/Temp/claude/C--Users-alexm-Documents-the-playa-provides/5cd765bf-5fa3-4bde-b8b3-43ed9388ca8b/scratchpad/email-header.png" public/email/welcome-header.png
cp "C:/Users/alexm/AppData/Local/Temp/claude/C--Users-alexm-Documents-the-playa-provides/5cd765bf-5fa3-4bde-b8b3-43ed9388ca8b/scratchpad/email-footer.png" public/email/welcome-footer.png
```

**Step 2: Verify they're servable**

Files under `public/` are served from the site root with no middleware involvement — `middleware.ts`'s matcher config already excludes `.png` from interception (`.*\\.(?:svg|png|jpg|jpeg|gif|webp|html)$` is in the negative lookahead), so no whitelisting is needed for the real files. Confirm locally:

```bash
npm run dev &
curl -sS -o /dev/null -w "%{http_code}\n" http://localhost:3000/email/welcome-header.png
curl -sS -o /dev/null -w "%{http_code}\n" http://localhost:3000/email/welcome-footer.png
```

Expected: `200` for both, with no login redirect (since these bypass middleware entirely as static files).

**Step 3: Commit**

```bash
git add public/email/welcome-header.png public/email/welcome-footer.png
git commit -m "feat: add welcome-email header/footer banner images"
```

---

### Task 3: `send-welcome-email` edge function

**Files:**
- Create: `supabase/functions/send-welcome-email/index.ts`

**Step 1: Write the function**

```typescript
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

const RESEND_API_KEY = Deno.env.get('RESEND_API_KEY')!
const SUPABASE_URL = Deno.env.get('SUPABASE_URL')!
const SUPABASE_SERVICE_ROLE_KEY = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!
const SITE_URL = 'https://theplayaprovides.com'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY)

function escapeHtml(input: string): string {
  return input
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;')
}

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders })
  }

  try {
    const { user_id } = await req.json()

    const { data: profile, error } = await supabase
      .from('profiles')
      .select('username, preferred_name, email, contact_email')
      .eq('id', user_id)
      .single()

    if (error || !profile) throw new Error(error?.message ?? 'Profile not found')

    const usernameRaw = profile.username
    const displayNameRaw = profile.preferred_name || profile.username
    const contactEmailRaw = profile.contact_email || profile.email

    const username = escapeHtml(usernameRaw)
    const displayName = escapeHtml(displayNameRaw)
    const contactEmail = escapeHtml(contactEmailRaw)

    const profileUrl = `${SITE_URL}/profile/${encodeURIComponent(usernameRaw)}`
    const referralUrl = `${SITE_URL}/signup?ref=${encodeURIComponent(usernameRaw)}`

    const shareSubject = 'Check out The Playa Provides'
    const shareBody = `Hey, thought you'd like this. The Playa Provides is a site for lending, borrowing, and gifting gear in the Burning Man community. Take a look: ${referralUrl}`
    const mailtoShare = `mailto:?subject=${encodeURIComponent(shareSubject)}&body=${encodeURIComponent(shareBody)}`

    const html = `
<div style="font-family:sans-serif;max-width:520px;margin:0 auto;background:#fff;">
  <a href="${SITE_URL}" style="display:block;"><img src="${SITE_URL}/email/welcome-header.png" alt="The Playa Provides" style="display:block;width:100%;height:auto;" /></a>
  <div style="padding:24px;">
    <h1 style="font-size:18px;color:#111;margin:0 0 12px;">Welcome, ${displayName}!</h1>
    <p style="font-size:14px;color:#333;line-height:1.6;margin:0 0 18px;">
      Thanks for joining The Playa Provides, where you can borrow items from others, lend out your stuff,
      and track it all easily in one place. To get the most out of the site:
    </p>

    <table style="border-collapse:collapse;width:100%;font-size:14px;margin:0 0 20px;">
      <tr><td style="padding:4px 8px;color:#555;">&#9744;</td><td style="padding:4px 8px;">Add your <a href="${profileUrl}" style="color:#1C1610;text-decoration:underline;">2026 camp and playa history</a> so campmates can find you</td></tr>
      <tr style="background:#f9f9f9;"><td style="padding:4px 8px;color:#555;">&#9744;</td><td style="padding:4px 8px;">Add an item <a href="${SITE_URL}/add-item" style="color:#1C1610;text-decoration:underline;">to your inventory</a>, then list it or keep it private</td></tr>
      <tr><td style="padding:4px 8px;color:#555;">&#9744;</td><td style="padding:4px 8px;">Add items to <a href="${profileUrl}" style="color:#1C1610;text-decoration:underline;">your wish list</a> so others know what you need</td></tr>
      <tr style="background:#f9f9f9;"><td style="padding:4px 8px;color:#555;">&#9744;</td><td style="padding:4px 8px;">Set an <a href="${SITE_URL}/settings" style="color:#1C1610;text-decoration:underline;">item location</a> (home, storage, etc.)</td></tr>
      <tr><td style="padding:4px 8px;color:#555;">&#9744;</td><td style="padding:4px 8px;">Browse <a href="${SITE_URL}/find-items" style="color:#1C1610;text-decoration:underline;">what's available</a> to borrow or keep</td></tr>
      <tr style="background:#f9f9f9;"><td style="padding:4px 8px;color:#555;">&#9744;</td><td style="padding:4px 8px;"><a href="${mailtoShare}" style="color:#1C1610;text-decoration:underline;">Share the site</a> with your friends and campmates</td></tr>
    </table>

    <table role="presentation" style="border-collapse:collapse;margin:0 0 24px;">
      <tr>
        <td>
          <a href="${profileUrl}" style="display:inline-block;width:210px;box-sizing:border-box;text-align:center;padding:13px 0;background:#1E8A82;color:#fff;text-decoration:none;font-weight:bold;font-size:14px;border:2px solid #1C1610;box-shadow:3px 3px 0 #1C1610;">Fill out your profile &rarr;</a>
        </td>
        <td style="width:12px;"></td>
        <td>
          <a href="${SITE_URL}/add-item" style="display:inline-block;width:210px;box-sizing:border-box;text-align:center;padding:13px 0;background:#D4A020;color:#fff;text-decoration:none;font-weight:bold;font-size:14px;border:2px solid #1C1610;box-shadow:3px 3px 0 #1C1610;">Add to your inventory &rarr;</a>
        </td>
      </tr>
    </table>

    <hr style="border:none;border-top:1px solid #eee;margin:24px 0;" />

    <p style="font-size:13px;color:#4A3828;line-height:1.6;margin:0;">
      Have feedback, find a bug, or just want to say hi? <a href="mailto:alex@theplayaprovides.com" style="color:#1E8A82;">Email Alex</a> or reply here. We'd love to hear from you.
    </p>

    <hr style="border:none;border-top:1px solid #eee;margin:28px 0 18px;" />

    <div style="font-size:11px;color:#888;text-transform:uppercase;letter-spacing:0.05em;margin:0 0 8px;text-align:center;">Your Account Details</div>
    <table style="border-collapse:collapse;font-size:10.5px;line-height:1.5;margin:0 auto 8px;">
      <tr><td style="color:#888;padding:1px 8px 1px 0;white-space:nowrap;">Username</td><td style="font-weight:bold;padding:1px 0;text-align:right;">${username}</td></tr>
      <tr><td style="color:#888;padding:1px 8px 1px 0;white-space:nowrap;">Preferred Name</td><td style="font-weight:bold;padding:1px 0;text-align:right;">${displayName}</td></tr>
      <tr><td style="color:#888;padding:1px 8px 1px 0;white-space:nowrap;">Contact Email</td><td style="font-weight:bold;padding:1px 0;text-align:right;">${contactEmail}</td></tr>
    </table>
    <p style="font-size:11px;color:#888;margin:0;text-align:center;"><a href="${SITE_URL}/settings" style="color:#1E8A82;">Edit in Settings</a></p>
  </div>

  <table role="presentation" width="100%" style="border-collapse:collapse;background:#1C1610;">
    <tr>
      <td>
        <img src="${SITE_URL}/email/welcome-footer.png" alt="The Playa Provides" style="display:block;width:100%;height:auto;" />
      </td>
    </tr>
    <tr>
      <td style="padding:14px 24px 2px;text-align:center;">
        <a href="${SITE_URL}" style="display:inline-flex;align-items:center;color:#9A8878;text-decoration:none;font-size:12px;margin:0 12px;">
          <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="#1E8A82" stroke-width="2" style="vertical-align:-2px;margin-right:5px;"><circle cx="12" cy="12" r="10"/><line x1="2" y1="12" x2="22" y2="12"/><path d="M12 2a15.3 15.3 0 0 1 4 10 15.3 15.3 0 0 1-4 10 15.3 15.3 0 0 1-4-10 15.3 15.3 0 0 1 4-10z"/></svg>
          theplayaprovides.com
        </a>
        <a href="https://www.instagram.com/theplayaprovides_/" style="display:inline-flex;align-items:center;color:#9A8878;text-decoration:none;font-size:12px;margin:0 12px;">
          <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="#1E8A82" stroke-width="2" style="vertical-align:-2px;margin-right:5px;"><rect x="2" y="2" width="20" height="20" rx="5"/><circle cx="12" cy="12" r="4"/><circle cx="17.5" cy="6.5" r="1" fill="#1E8A82" stroke="none"/></svg>
          @theplayaprovides_
        </a>
      </td>
    </tr>
    <tr>
      <td style="padding:8px 24px 12px;text-align:center;">
        <a href="${SITE_URL}/about" style="color:#9A8878;text-decoration:none;font-size:11px;margin:0 10px;">About</a>
        <a href="${SITE_URL}/terms" style="color:#9A8878;text-decoration:none;font-size:11px;margin:0 10px;">Terms</a>
        <a href="${SITE_URL}/privacy" style="color:#9A8878;text-decoration:none;font-size:11px;margin:0 10px;">Privacy</a>
      </td>
    </tr>
    <tr>
      <td style="padding:10px 32px 0;text-align:center;border-top:1px solid rgba(154,136,120,0.2);">
        <p style="font-size:10.5px;color:#665c50;line-height:1.5;margin:10px 0 6px;">
          You're getting this one-time email because an account was just created at The Playa Provides with this address.
          There's nothing to unsubscribe from &mdash; we don't send marketing email, and you won't get another one of these.
          Didn't create this account? You can safely ignore it.
        </p>
      </td>
    </tr>
    <tr>
      <td style="padding:0 32px 14px;text-align:center;">
        <p style="font-size:10px;color:#4a4038;line-height:1.4;margin:0;">
          Not affiliated with or endorsed by Burning Man Project.
        </p>
      </td>
    </tr>
  </table>
</div>`

    const res = await fetch('https://api.resend.com/emails', {
      method: 'POST',
      headers: { 'Authorization': `Bearer ${RESEND_API_KEY}`, 'Content-Type': 'application/json' },
      body: JSON.stringify({
        from: 'The Playa Provides <hello@theplayaprovides.com>',
        to: contactEmailRaw,
        reply_to: 'alex@theplayaprovides.com',
        subject: 'Welcome to The Playa Provides!',
        html,
      }),
    })

    if (!res.ok) throw new Error(`Resend error: ${await res.text()}`)

    return new Response(JSON.stringify({ ok: true }), { headers: corsHeaders, status: 200 })
  } catch (err) {
    console.error(err)
    return new Response(JSON.stringify({ error: String(err) }), { headers: corsHeaders, status: 500 })
  }
})
```

Note: `reply_to` on the Resend payload is what makes the email's "or reply here" line actually true — without it, replies go to `hello@theplayaprovides.com` (the `from` address) instead of Alex.

**Step 2: Deploy**

Use `mcp__supabase__deploy_edge_function` with `project_id: "bklycpitofjrjhizttny"`, `name: "send-welcome-email"`, `entrypoint_path: "index.ts"`, the file content above, and `verify_jwt: false` — matching every other transactional email function in this project.

**Step 3: Smoke-test the function directly (before wiring it into signup)**

Pick any existing real profile's `id` (e.g. via `mcp__supabase__execute_sql`: `select id, username from public.profiles limit 1;`) and invoke the deployed function directly to confirm it doesn't error and actually sends:

```bash
curl -sS -X POST "https://bklycpitofjrjhizttny.supabase.co/functions/v1/send-welcome-email" \
  -H "Content-Type: application/json" \
  -d '{"user_id":"<a-real-profile-id>"}'
```

Expected: `{"ok":true}`. If you have access to that profile's inbox (e.g. your own test account `@alex`), confirm the email actually arrived and rendered correctly — check the header/footer images loaded, all links point where expected, and the account-details values match that profile.

**Step 4: Commit**

```bash
git add supabase/functions/send-welcome-email/index.ts
git commit -m "feat: add send-welcome-email edge function"
```

---

### Task 4: Wire it into signup

**Files:**
- Modify: `app/signup/page.tsx:35-50`

**Step 1: Capture the `?ref=` param and pass it through, then invoke the email on success**

Current code (lines 35–50):

```tsx
  const handleSignUp = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!acceptedTerms) { setMessage('Error: You must accept the terms to continue.'); return; }
    setLoading(true); setMessage(''); setUsernameError('');

    const { data: existing } = await supabase.from('profiles').select('id').eq('username', username.toLowerCase().trim()).maybeSingle();
    if (existing) { setUsernameError('This username is already taken.'); setLoading(false); return; }

    const { error } = await supabase.auth.signUp({
      email, password,
      options: { data: { username: username.toLowerCase().trim(), preferred_name: preferredName, full_name: fullName.trim(), email } },
    });

    if (error) { setMessage(`Error: ${error.message}`); setLoading(false); }
    else { setMessage('Account created! Redirecting…'); setTimeout(() => { window.location.href = '/profile/' + username.toLowerCase().trim(); }, 1500); }
  };
```

Replace with:

```tsx
  const handleSignUp = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!acceptedTerms) { setMessage('Error: You must accept the terms to continue.'); return; }
    setLoading(true); setMessage(''); setUsernameError('');

    const { data: existing } = await supabase.from('profiles').select('id').eq('username', username.toLowerCase().trim()).maybeSingle();
    if (existing) { setUsernameError('This username is already taken.'); setLoading(false); return; }

    const referredBy = new URLSearchParams(window.location.search).get('ref');

    const { data, error } = await supabase.auth.signUp({
      email, password,
      options: { data: { username: username.toLowerCase().trim(), preferred_name: preferredName, full_name: fullName.trim(), email, referred_by: referredBy } },
    });

    if (error) { setMessage(`Error: ${error.message}`); setLoading(false); }
    else {
      if (data.user?.id) {
        supabase.functions.invoke('send-welcome-email', { body: { user_id: data.user.id } }).catch(() => {});
      }
      setMessage('Account created! Redirecting…'); setTimeout(() => { window.location.href = '/profile/' + username.toLowerCase().trim(); }, 1500);
    }
  };
```

Two changes: `referredBy` is read straight from `window.location.search` (matching the existing pattern already used elsewhere in this codebase, e.g. `app/page.tsx`'s `URLSearchParams(window.location.search)` — no `useSearchParams` hook, no Suspense-boundary complications) and passed through `signUp`'s metadata alongside the fields already captured there. The welcome-email invoke is fire-and-forget with `.catch(() => {})`, matching the pattern used for `send-camp-submission` in `components/SubmitCampModal.tsx` — a failed email send should never block or error out the signup flow itself.

**Step 2: Verify with a real test signup**

Sign up a genuinely new test account through the actual `/signup` page (use a disposable email you control) and confirm:
1. The signup itself still works exactly as before (no regression).
2. The welcome email arrives.
3. Run `select username, referred_by from public.profiles where username = '<the test username>';` — `referred_by` should be `NULL` (no `?ref=` was used).

Then repeat with `/signup?ref=someexistingusername` and confirm that test account's `referred_by` column stores `someexistingusername`.

**Step 3: Commit**

```bash
git add app/signup/page.tsx
git commit -m "feat: send welcome email and capture referral on signup"
```

---

### Task 5: Update TASKS.md

**Files:**
- Modify: `TASKS.md`

**Step 1**

Add a dated entry under the relevant section (Core sharing loop / onboarding, or wherever email features are tracked) describing what shipped: welcome email at signup with onboarding checklist, account-details recap, and lean referral attribution (`profiles.referred_by`, no UI). Follow the existing entries' format and level of detail — summarize by feature/current-state per CLAUDE.md's End of Session Protocol, not a session-by-session log.

**Step 2: Commit**

```bash
git add TASKS.md
git commit -m "docs: TASKS.md — log welcome email + referral attribution"
```
