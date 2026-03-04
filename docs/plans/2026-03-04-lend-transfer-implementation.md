# Lend To & Transfer To — Implementation Plan

> **For Claude:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Goal:** Add Lend To and Transfer To flows to /inventory — escrow-style handover with dual confirmation and email notifications.

**Architecture:** Two new Supabase tables (`item_transfers`, `item_loans`) track state. The /inventory page gains two modals to initiate flows, action buttons that change based on active records, and two new sections for in-progress loans. Two new Edge Functions send emails via Resend at key state transitions.

**Tech Stack:** Next.js 16 App Router, Supabase (PostgreSQL + Edge Functions), Resend email API, React inline CSS (no Tailwind in JSX), TypeScript, Deno (edge functions only).

---

## Key Conventions (read before starting)

- **Styles:** All component styles use inline React CSS objects (`style={{ ... }}`). Every literal CSS value (e.g., `'flex'`, `'pointer'`) must be typed `as const` or the object must be typed `: React.CSSProperties`. No Tailwind utility classes in JSX.
- **Supabase client:** Import from `@/lib/supabaseClient` — it's a singleton `createBrowserClient`.
- **No test framework** in this project. "Verify" steps are manual browser checks.
- **Edge functions:** Deno runtime in `supabase/functions/`. TSC errors there are expected/ignored. Deploy with `supabase functions deploy <name> --no-verify-jwt`.
- **Email names:** Always use `preferred_name ?? username` — never hard-coded fallback to auth email display name.
- **DB migrations:** Run SQL directly in Supabase dashboard → SQL Editor. No migration files needed.

---

## Task 1: DB Migration — `item_transfers` table

**Files:**
- Run in: Supabase Dashboard → SQL Editor

**Step 1: Run this SQL**

```sql
create table public.item_transfers (
  id uuid primary key default gen_random_uuid(),
  item_id uuid not null references public.gear_items(id) on delete cascade,
  owner_id uuid not null references public.profiles(id),
  recipient_id uuid not null references public.profiles(id),
  status text not null default 'pending_handover'
    check (status in ('pending_handover', 'complete', 'cancelled')),
  owner_confirmed boolean not null default false,
  recipient_confirmed boolean not null default false,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

-- RLS
alter table public.item_transfers enable row level security;

create policy "owner or recipient can select"
  on public.item_transfers for select
  using (owner_id = auth.uid() or recipient_id = auth.uid());

create policy "owner can insert"
  on public.item_transfers for insert
  with check (owner_id = auth.uid());

create policy "parties can update"
  on public.item_transfers for update
  using (owner_id = auth.uid() or recipient_id = auth.uid());
```

**Step 2: Verify**

In Supabase Dashboard → Table Editor, confirm `item_transfers` table exists with all columns.

**Step 3: Commit**

```bash
git add -A
git commit -m "docs: note item_transfers table created in Supabase"
```

(No file changes — SQL ran in dashboard. Commit is just a checkpoint.)

---

## Task 2: DB Migration — `item_loans` table

**Files:**
- Run in: Supabase Dashboard → SQL Editor

**Step 1: Run this SQL**

```sql
create table public.item_loans (
  id uuid primary key default gen_random_uuid(),
  item_id uuid not null references public.gear_items(id) on delete cascade,
  owner_id uuid not null references public.profiles(id),
  borrower_id uuid not null references public.profiles(id),
  status text not null default 'pending_handover'
    check (status in ('pending_handover', 'active', 'return_pending', 'complete', 'disputed', 'cancelled')),
  owner_confirmed_pickup boolean not null default false,
  borrower_confirmed_pickup boolean not null default false,
  borrower_confirmed_return boolean not null default false,
  owner_confirmed_return boolean not null default false,
  pickup_by date,
  return_by date,
  damage_agreement numeric,
  loss_agreement numeric,
  notes text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

-- RLS
alter table public.item_loans enable row level security;

create policy "owner or borrower can select"
  on public.item_loans for select
  using (owner_id = auth.uid() or borrower_id = auth.uid());

create policy "owner can insert"
  on public.item_loans for insert
  with check (owner_id = auth.uid());

create policy "parties can update"
  on public.item_loans for update
  using (owner_id = auth.uid() or borrower_id = auth.uid());
```

**Step 2: Verify**

In Supabase Dashboard → Table Editor, confirm `item_loans` table exists.

**Step 3: Commit**

```bash
git commit --allow-empty -m "docs: note item_loans table created in Supabase"
```

---

## Task 3: TypeScript types

**Files:**
- Modify: `types/inventory.ts`

**Step 1: Add transfer and loan types**

Append to the end of `types/inventory.ts`:

```typescript
export type TransferStatus = 'pending_handover' | 'complete' | 'cancelled';
export type LoanStatus = 'pending_handover' | 'active' | 'return_pending' | 'complete' | 'disputed' | 'cancelled';

export interface ItemTransfer {
  id: string;
  item_id: string;
  owner_id: string;
  recipient_id: string;
  status: TransferStatus;
  owner_confirmed: boolean;
  recipient_confirmed: boolean;
  created_at: string;
  updated_at: string;
  // joined
  gear_items?: { item_name: string };
  owner?: { username: string; preferred_name: string | null };
  recipient?: { username: string; preferred_name: string | null };
}

export interface ItemLoan {
  id: string;
  item_id: string;
  owner_id: string;
  borrower_id: string;
  status: LoanStatus;
  owner_confirmed_pickup: boolean;
  borrower_confirmed_pickup: boolean;
  borrower_confirmed_return: boolean;
  owner_confirmed_return: boolean;
  pickup_by: string | null;
  return_by: string | null;
  damage_agreement: number | null;
  loss_agreement: number | null;
  notes: string | null;
  created_at: string;
  updated_at: string;
  // joined
  gear_items?: { item_name: string };
  owner?: { username: string; preferred_name: string | null };
  borrower?: { username: string; preferred_name: string | null };
}
```

**Step 2: Verify**

Check that `types/inventory.ts` compiles with no errors (the Next.js dev server will show TypeScript errors in the terminal if any).

**Step 3: Commit**

```bash
git add types/inventory.ts
git commit -m "feat: add TypeScript types for item_transfers and item_loans"
```

---

## Task 4: Edge Function — `send-transfer-notification`

**Files:**
- Create: `supabase/functions/send-transfer-notification/index.ts`

**Step 1: Create the function**

```typescript
// deno-lint-ignore-file no-unused-vars
import { serve } from "https://deno.land/std@0.168.0/http/server.ts"
import { createClient } from "https://esm.sh/@supabase/supabase-js@2"

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

serve(async (req: Request) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders })
  }

  try {
    const { type, transfer_id } = await req.json()
    // type: 'initiated' | 'owner_confirmed'

    const RESEND_API_KEY = Deno.env.get('RESEND_API_KEY')
    const SUPABASE_URL = Deno.env.get('SUPABASE_URL')!
    const SUPABASE_SERVICE_ROLE_KEY = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!
    const admin = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY)

    // Fetch transfer with related data
    const { data: transfer, error } = await admin
      .from('item_transfers')
      .select(`
        *,
        gear_items ( item_name ),
        owner:profiles!item_transfers_owner_id_fkey ( username, preferred_name, contact_email ),
        recipient:profiles!item_transfers_recipient_id_fkey ( username, preferred_name, contact_email )
      `)
      .eq('id', transfer_id)
      .single()

    if (error || !transfer) throw new Error('Transfer not found')

    const ownerName = transfer.owner?.preferred_name || transfer.owner?.username || 'Someone'
    const itemName = transfer.gear_items?.item_name || 'an item'

    // Resolve recipient email
    let recipientEmail = transfer.recipient?.contact_email
    if (!recipientEmail) {
      const { data: { user } } = await admin.auth.admin.getUserById(transfer.recipient_id)
      recipientEmail = user?.email
    }
    if (!recipientEmail) throw new Error('Could not find recipient email')

    let subject = ''
    let html = ''

    if (type === 'initiated') {
      subject = `${ownerName} is transferring ${itemName} to you`
      html = `
        <div style="font-family: sans-serif; color: #333; max-width: 600px;">
          <h1 style="color: #C08261;">You're Getting an Item!</h1>
          <p>${ownerName} has indicated they're transferring <strong>${itemName}</strong> to you.</p>
          <p>Once they've physically handed it over, they'll mark it as handed off in the app — you'll get another email to confirm receipt.</p>
          <p style="font-size: 0.8em; color: #999; margin-top: 24px;">
            Sent via <a href="https://theplayaprovides.com" style="color: #C08261;">The Playa Provides</a>
          </p>
        </div>
      `
    } else if (type === 'owner_confirmed') {
      subject = `${ownerName} says they've handed over ${itemName} — confirm receipt`
      html = `
        <div style="font-family: sans-serif; color: #333; max-width: 600px;">
          <h1 style="color: #C08261;">Did You Get It?</h1>
          <p>${ownerName} says they've handed over <strong>${itemName}</strong> to you.</p>
          <p>Log in to <a href="https://theplayaprovides.com/inventory" style="color: #C08261;">your inventory</a> and confirm you have it. Once you do, the item will appear in your inventory.</p>
          <p style="font-size: 0.8em; color: #999; margin-top: 24px;">
            Sent via <a href="https://theplayaprovides.com" style="color: #C08261;">The Playa Provides</a>
          </p>
        </div>
      `
    } else {
      throw new Error(`Unknown notification type: ${type}`)
    }

    const res = await fetch('https://api.resend.com/emails', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${RESEND_API_KEY}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        from: 'The Playa Provides <hello@theplayaprovides.com>',
        to: [recipientEmail],
        subject,
        html,
      }),
    })

    const data = await res.json()
    return new Response(JSON.stringify(data), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      status: 200,
    })

  } catch (err: unknown) {
    const error = err as Error
    return new Response(JSON.stringify({ error: error.message }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      status: 400,
    })
  }
})
```

**Step 2: Deploy**

```bash
supabase functions deploy send-transfer-notification --no-verify-jwt
```

Expected: `Deployed successfully.`

**Step 3: Commit**

```bash
git add supabase/functions/send-transfer-notification/
git commit -m "feat: add send-transfer-notification edge function"
```

---

## Task 5: Edge Function — `send-loan-notification`

**Files:**
- Create: `supabase/functions/send-loan-notification/index.ts`

**Step 1: Create the function**

```typescript
// deno-lint-ignore-file no-unused-vars
import { serve } from "https://deno.land/std@0.168.0/http/server.ts"
import { createClient } from "https://esm.sh/@supabase/supabase-js@2"

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

serve(async (req: Request) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders })
  }

  try {
    const { type, loan_id } = await req.json()
    // type: 'initiated' | 'owner_confirmed_pickup' | 'borrower_confirmed_return'

    const RESEND_API_KEY = Deno.env.get('RESEND_API_KEY')
    const SUPABASE_URL = Deno.env.get('SUPABASE_URL')!
    const SUPABASE_SERVICE_ROLE_KEY = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!
    const admin = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY)

    const { data: loan, error } = await admin
      .from('item_loans')
      .select(`
        *,
        gear_items ( item_name ),
        owner:profiles!item_loans_owner_id_fkey ( username, preferred_name, contact_email ),
        borrower:profiles!item_loans_borrower_id_fkey ( username, preferred_name, contact_email )
      `)
      .eq('id', loan_id)
      .single()

    if (error || !loan) throw new Error('Loan not found')

    const ownerName = loan.owner?.preferred_name || loan.owner?.username || 'Someone'
    const borrowerName = loan.borrower?.preferred_name || loan.borrower?.username || 'Someone'
    const itemName = loan.gear_items?.item_name || 'an item'

    const formatDate = (d: string | null) => d ? new Date(d).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' }) : 'Not specified'

    const termsHtml = `
      <table style="border-collapse: collapse; width: 100%; margin: 12px 0;">
        <tr><td style="padding: 6px 0; color: #888; font-size: 0.85em;">Pick up by</td><td style="padding: 6px 0;">${formatDate(loan.pickup_by)}</td></tr>
        <tr><td style="padding: 6px 0; color: #888; font-size: 0.85em;">Return by</td><td style="padding: 6px 0;">${formatDate(loan.return_by)}</td></tr>
        <tr><td style="padding: 6px 0; color: #888; font-size: 0.85em;">Damage fee</td><td style="padding: 6px 0;">${loan.damage_agreement != null ? `$${loan.damage_agreement}` : 'Not specified'}</td></tr>
        <tr><td style="padding: 6px 0; color: #888; font-size: 0.85em;">Loss fee</td><td style="padding: 6px 0;">${loan.loss_agreement != null ? `$${loan.loss_agreement}` : 'Not specified'}</td></tr>
        ${loan.notes ? `<tr><td style="padding: 6px 0; color: #888; font-size: 0.85em;">Notes</td><td style="padding: 6px 0;">${loan.notes}</td></tr>` : ''}
      </table>
    `

    let toEmail: string | undefined
    let subject = ''
    let html = ''

    if (type === 'initiated') {
      // email borrower
      let borrowerEmail = loan.borrower?.contact_email
      if (!borrowerEmail) {
        const { data: { user } } = await admin.auth.admin.getUserById(loan.borrower_id)
        borrowerEmail = user?.email
      }
      toEmail = borrowerEmail
      subject = `${ownerName} is lending you ${itemName}`
      html = `
        <div style="font-family: sans-serif; color: #333; max-width: 600px;">
          <h1 style="color: #C08261;">You're Borrowing an Item!</h1>
          <p>${ownerName} has indicated they're lending you <strong>${itemName}</strong> under these terms:</p>
          <div style="background: #f7f7f7; padding: 16px; border-radius: 8px; margin: 16px 0;">${termsHtml}</div>
          <p>Once they've physically handed it over, they'll mark it in the app — you'll get another email to confirm you have it.</p>
          <p style="font-size: 0.8em; color: #999; margin-top: 24px;">Sent via <a href="https://theplayaprovides.com" style="color: #C08261;">The Playa Provides</a></p>
        </div>
      `
    } else if (type === 'owner_confirmed_pickup') {
      // email borrower
      let borrowerEmail = loan.borrower?.contact_email
      if (!borrowerEmail) {
        const { data: { user } } = await admin.auth.admin.getUserById(loan.borrower_id)
        borrowerEmail = user?.email
      }
      toEmail = borrowerEmail
      subject = `${ownerName} says they've handed over ${itemName} — confirm you have it`
      html = `
        <div style="font-family: sans-serif; color: #333; max-width: 600px;">
          <h1 style="color: #C08261;">Did You Get It?</h1>
          <p>${ownerName} says they've handed over <strong>${itemName}</strong>.</p>
          <p>Log in to <a href="https://theplayaprovides.com/inventory" style="color: #C08261;">your inventory</a> and click "Got It" to confirm. This activates the loan and records the agreed terms.</p>
          <div style="background: #f7f7f7; padding: 16px; border-radius: 8px; margin: 16px 0;">${termsHtml}</div>
          <p style="font-size: 0.8em; color: #999; margin-top: 24px;">Sent via <a href="https://theplayaprovides.com" style="color: #C08261;">The Playa Provides</a></p>
        </div>
      `
    } else if (type === 'borrower_confirmed_return') {
      // email owner
      let ownerEmail = loan.owner?.contact_email
      if (!ownerEmail) {
        const { data: { user } } = await admin.auth.admin.getUserById(loan.owner_id)
        ownerEmail = user?.email
      }
      toEmail = ownerEmail
      subject = `${borrowerName} says they've returned ${itemName} — confirm receipt`
      html = `
        <div style="font-family: sans-serif; color: #333; max-width: 600px;">
          <h1 style="color: #C08261;">Your Item Is On Its Way Back</h1>
          <p>${borrowerName} says they've returned <strong>${itemName}</strong>.</p>
          <p>Log in to <a href="https://theplayaprovides.com/inventory" style="color: #C08261;">your inventory</a> and confirm you got it back — or flag a dispute if something's not right.</p>
          <p style="font-size: 0.8em; color: #999; margin-top: 24px;">Sent via <a href="https://theplayaprovides.com" style="color: #C08261;">The Playa Provides</a></p>
        </div>
      `
    } else {
      throw new Error(`Unknown notification type: ${type}`)
    }

    if (!toEmail) throw new Error('Could not resolve recipient email')

    const res = await fetch('https://api.resend.com/emails', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${RESEND_API_KEY}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        from: 'The Playa Provides <hello@theplayaprovides.com>',
        to: [toEmail],
        subject,
        html,
      }),
    })

    const data = await res.json()
    return new Response(JSON.stringify(data), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      status: 200,
    })

  } catch (err: unknown) {
    const error = err as Error
    return new Response(JSON.stringify({ error: error.message }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      status: 400,
    })
  }
})
```

**Step 2: Deploy**

```bash
supabase functions deploy send-loan-notification --no-verify-jwt
```

**Step 3: Commit**

```bash
git add supabase/functions/send-loan-notification/
git commit -m "feat: add send-loan-notification edge function"
```

---

## Task 6: `TransferModal` component

**Files:**
- Create: `components/TransferModal.tsx`

**Step 1: Create the component**

```tsx
'use client'

import React, { useState } from 'react'
import { supabase } from '@/lib/supabaseClient'

interface Props {
  item: { id: string; item_name: string }
  ownerId: string
  onClose: () => void
  onSuccess: () => void
}

export default function TransferModal({ item, ownerId, onClose, onSuccess }: Props) {
  const [query, setQuery] = useState('')
  const [matched, setMatched] = useState<{ id: string; username: string; preferred_name: string | null } | null>(null)
  const [lookupError, setLookupError] = useState('')
  const [submitting, setSubmitting] = useState(false)
  const [submitError, setSubmitError] = useState('')

  const handleLookup = async () => {
    setLookupError('')
    setMatched(null)
    if (!query.trim()) return
    const isEmail = query.includes('@')
    let profileQuery = supabase.from('profiles').select('id, username, preferred_name')
    if (isEmail) {
      // Look up via auth email — need to match contact_email field
      profileQuery = profileQuery.eq('contact_email', query.trim().toLowerCase())
    } else {
      profileQuery = profileQuery.eq('username', query.trim().toLowerCase())
    }
    const { data } = await profileQuery.maybeSingle()
    if (!data) {
      setLookupError('No account found. Make sure they're registered on The Playa Provides.')
    } else if (data.id === ownerId) {
      setLookupError('You can't transfer an item to yourself.')
    } else {
      setMatched(data)
    }
  }

  const handleConfirm = async () => {
    if (!matched) return
    setSubmitting(true)
    setSubmitError('')
    try {
      const { data: transfer, error } = await supabase
        .from('item_transfers')
        .insert({
          item_id: item.id,
          owner_id: ownerId,
          recipient_id: matched.id,
        })
        .select()
        .single()
      if (error) throw error

      // Fire notification email
      await supabase.functions.invoke('send-transfer-notification', {
        body: { type: 'initiated', transfer_id: transfer.id },
      })

      onSuccess()
    } catch (err: any) {
      setSubmitError(err.message || 'Something went wrong.')
      setSubmitting(false)
    }
  }

  return (
    <div style={overlayStyle}>
      <div style={modalStyle}>
        <button onClick={onClose} style={closeStyle}>✕</button>
        <h2 style={{ margin: '0 0 8px', color: '#2D241E', fontSize: '1.2rem' }}>Transfer Item</h2>
        <p style={{ margin: '0 0 20px', color: '#666', fontSize: '0.9rem' }}>
          Enter the username or email of the person you're giving <strong>{item.item_name}</strong> to.
        </p>

        <div style={{ display: 'flex', gap: '8px', marginBottom: '12px' }}>
          <input
            value={query}
            onChange={e => { setQuery(e.target.value); setMatched(null); setLookupError('') }}
            onKeyDown={e => e.key === 'Enter' && handleLookup()}
            placeholder="username or email"
            style={inputStyle}
          />
          <button onClick={handleLookup} style={lookupButtonStyle}>Find</button>
        </div>

        {lookupError && <p style={errorStyle}>{lookupError}</p>}

        {matched && (
          <div style={matchedBoxStyle}>
            <span style={{ color: '#2D241E', fontWeight: 600 }}>
              {matched.preferred_name || matched.username}
            </span>
            <span style={{ color: '#888', fontSize: '0.85rem', marginLeft: '6px' }}>@{matched.username}</span>
          </div>
        )}

        {submitError && <p style={errorStyle}>{submitError}</p>}

        <div style={{ display: 'flex', gap: '10px', marginTop: '20px', justifyContent: 'flex-end' }}>
          <button onClick={onClose} style={cancelButtonStyle}>Cancel</button>
          <button
            onClick={handleConfirm}
            disabled={!matched || submitting}
            style={{ ...confirmButtonStyle, opacity: (!matched || submitting) ? 0.5 : 1 }}
          >
            {submitting ? 'Sending...' : 'Confirm Transfer'}
          </button>
        </div>
      </div>
    </div>
  )
}

const overlayStyle: React.CSSProperties = { position: 'fixed', inset: 0, backgroundColor: 'rgba(0,0,0,0.5)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 1000 }
const modalStyle: React.CSSProperties = { backgroundColor: '#fff', borderRadius: '16px', padding: '28px', width: '440px', maxWidth: '90vw', position: 'relative' as const, boxShadow: '0 8px 32px rgba(0,0,0,0.15)' }
const closeStyle: React.CSSProperties = { position: 'absolute' as const, top: '16px', right: '16px', background: 'none', border: 'none', fontSize: '1rem', cursor: 'pointer', color: '#888' }
const inputStyle: React.CSSProperties = { flex: 1, padding: '10px', border: '1px solid #ddd', borderRadius: '6px', fontSize: '0.9rem', color: '#2D241E' }
const lookupButtonStyle: React.CSSProperties = { padding: '10px 16px', backgroundColor: '#2D241E', color: '#fff', border: 'none', borderRadius: '6px', cursor: 'pointer', fontWeight: 600, fontSize: '0.9rem' }
const matchedBoxStyle: React.CSSProperties = { backgroundColor: '#f0fdf4', border: '1px solid #bbf7d0', borderRadius: '8px', padding: '10px 14px', marginBottom: '4px' }
const errorStyle: React.CSSProperties = { color: '#dc2626', fontSize: '0.85rem', margin: '4px 0' }
const cancelButtonStyle: React.CSSProperties = { padding: '10px 18px', backgroundColor: '#f0f0f0', color: '#666', border: 'none', borderRadius: '6px', cursor: 'pointer', fontWeight: 600 }
const confirmButtonStyle: React.CSSProperties = { padding: '10px 18px', backgroundColor: '#C08261', color: '#fff', border: 'none', borderRadius: '6px', cursor: 'pointer', fontWeight: 600 }
```

**Step 2: Verify in browser**

- Open /inventory, click Transfer To on an "Available to Keep" item (button doesn't have onClick yet — will be wired in Task 8)
- Confirm component file has no TypeScript errors in the dev server terminal

**Step 3: Commit**

```bash
git add components/TransferModal.tsx
git commit -m "feat: add TransferModal component"
```

---

## Task 7: `LendModal` component

**Files:**
- Create: `components/LendModal.tsx`

**Step 1: Create the component**

```tsx
'use client'

import React, { useState } from 'react'
import { supabase } from '@/lib/supabaseClient'

interface Props {
  item: {
    id: string
    item_name: string
    // terms pre-filled from the listing
    pickup_by?: string | null
    return_by?: string | null
    damage_fee?: number | null
    borrowing_terms?: string | null
  }
  ownerId: string
  onClose: () => void
  onSuccess: () => void
}

export default function LendModal({ item, ownerId, onClose, onSuccess }: Props) {
  const [query, setQuery] = useState('')
  const [matched, setMatched] = useState<{ id: string; username: string; preferred_name: string | null } | null>(null)
  const [lookupError, setLookupError] = useState('')
  const [pickupBy, setPickupBy] = useState(item.pickup_by || '')
  const [returnBy, setReturnBy] = useState(item.return_by || '')
  const [damageAgreement, setDamageAgreement] = useState(item.damage_fee != null ? String(item.damage_fee) : '')
  const [lossAgreement, setLossAgreement] = useState('')
  const [notes, setNotes] = useState(item.borrowing_terms || '')
  const [submitting, setSubmitting] = useState(false)
  const [submitError, setSubmitError] = useState('')

  const handleLookup = async () => {
    setLookupError('')
    setMatched(null)
    if (!query.trim()) return
    const isEmail = query.includes('@')
    let profileQuery = supabase.from('profiles').select('id, username, preferred_name')
    if (isEmail) {
      profileQuery = profileQuery.eq('contact_email', query.trim().toLowerCase())
    } else {
      profileQuery = profileQuery.eq('username', query.trim().toLowerCase())
    }
    const { data } = await profileQuery.maybeSingle()
    if (!data) {
      setLookupError('No account found. Make sure they're registered on The Playa Provides.')
    } else if (data.id === ownerId) {
      setLookupError('You can't lend an item to yourself.')
    } else {
      setMatched(data)
    }
  }

  const handleConfirm = async () => {
    if (!matched) return
    setSubmitting(true)
    setSubmitError('')
    try {
      const { data: loan, error } = await supabase
        .from('item_loans')
        .insert({
          item_id: item.id,
          owner_id: ownerId,
          borrower_id: matched.id,
          pickup_by: pickupBy || null,
          return_by: returnBy || null,
          damage_agreement: damageAgreement ? parseFloat(damageAgreement) : null,
          loss_agreement: lossAgreement ? parseFloat(lossAgreement) : null,
          notes: notes || null,
        })
        .select()
        .single()
      if (error) throw error

      await supabase.functions.invoke('send-loan-notification', {
        body: { type: 'initiated', loan_id: loan.id },
      })

      onSuccess()
    } catch (err: any) {
      setSubmitError(err.message || 'Something went wrong.')
      setSubmitting(false)
    }
  }

  return (
    <div style={overlayStyle}>
      <div style={modalStyle}>
        <button onClick={onClose} style={closeStyle}>✕</button>
        <h2 style={{ margin: '0 0 8px', color: '#2D241E', fontSize: '1.2rem' }}>Lend Item</h2>
        <p style={{ margin: '0 0 20px', color: '#666', fontSize: '0.9rem' }}>
          Enter the username or email of the person borrowing <strong>{item.item_name}</strong>, then confirm the terms.
        </p>

        {/* Lookup */}
        <div style={{ display: 'flex', gap: '8px', marginBottom: '12px' }}>
          <input
            value={query}
            onChange={e => { setQuery(e.target.value); setMatched(null); setLookupError('') }}
            onKeyDown={e => e.key === 'Enter' && handleLookup()}
            placeholder="username or email"
            style={inputStyle}
          />
          <button onClick={handleLookup} style={lookupButtonStyle}>Find</button>
        </div>
        {lookupError && <p style={errorStyle}>{lookupError}</p>}
        {matched && (
          <div style={matchedBoxStyle}>
            <span style={{ color: '#2D241E', fontWeight: 600 }}>{matched.preferred_name || matched.username}</span>
            <span style={{ color: '#888', fontSize: '0.85rem', marginLeft: '6px' }}>@{matched.username}</span>
          </div>
        )}

        {/* Terms */}
        <p style={{ margin: '20px 0 10px', fontWeight: 700, color: '#2D241E', fontSize: '0.9rem' }}>Lending Terms</p>

        <div style={termsGridStyle}>
          <div>
            <label style={labelStyle}>Pick up by</label>
            <input type="date" value={pickupBy} onChange={e => setPickupBy(e.target.value)} style={inputStyle} />
          </div>
          <div>
            <label style={labelStyle}>Return by</label>
            <input type="date" value={returnBy} onChange={e => setReturnBy(e.target.value)} style={inputStyle} />
          </div>
          <div>
            <label style={labelStyle}>Damage Agreement ($)</label>
            <input type="number" min="0" value={damageAgreement} onChange={e => setDamageAgreement(e.target.value)} placeholder="0" style={inputStyle} />
          </div>
          <div>
            <label style={labelStyle}>Loss Agreement ($)</label>
            <input type="number" min="0" value={lossAgreement} onChange={e => setLossAgreement(e.target.value)} placeholder="0" style={inputStyle} />
          </div>
        </div>

        <div style={{ marginTop: '10px' }}>
          <label style={labelStyle}>Notes</label>
          <textarea
            value={notes}
            onChange={e => setNotes(e.target.value)}
            rows={3}
            placeholder="e.g. Please clean before returning, no modifications"
            style={{ ...inputStyle, resize: 'vertical' as const }}
          />
        </div>

        {submitError && <p style={errorStyle}>{submitError}</p>}

        <div style={{ display: 'flex', gap: '10px', marginTop: '20px', justifyContent: 'flex-end' }}>
          <button onClick={onClose} style={cancelButtonStyle}>Cancel</button>
          <button
            onClick={handleConfirm}
            disabled={!matched || submitting}
            style={{ ...confirmButtonStyle, opacity: (!matched || submitting) ? 0.5 : 1 }}
          >
            {submitting ? 'Sending...' : 'Confirm Loan'}
          </button>
        </div>
      </div>
    </div>
  )
}

const overlayStyle: React.CSSProperties = { position: 'fixed', inset: 0, backgroundColor: 'rgba(0,0,0,0.5)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 1000 }
const modalStyle: React.CSSProperties = { backgroundColor: '#fff', borderRadius: '16px', padding: '28px', width: '500px', maxWidth: '90vw', maxHeight: '90vh', overflowY: 'auto' as const, position: 'relative' as const, boxShadow: '0 8px 32px rgba(0,0,0,0.15)' }
const closeStyle: React.CSSProperties = { position: 'absolute' as const, top: '16px', right: '16px', background: 'none', border: 'none', fontSize: '1rem', cursor: 'pointer', color: '#888' }
const inputStyle: React.CSSProperties = { width: '100%', padding: '10px', border: '1px solid #ddd', borderRadius: '6px', fontSize: '0.9rem', color: '#2D241E', boxSizing: 'border-box' as const }
const lookupButtonStyle: React.CSSProperties = { padding: '10px 16px', backgroundColor: '#2D241E', color: '#fff', border: 'none', borderRadius: '6px', cursor: 'pointer', fontWeight: 600, fontSize: '0.9rem', whiteSpace: 'nowrap' as const }
const matchedBoxStyle: React.CSSProperties = { backgroundColor: '#f0fdf4', border: '1px solid #bbf7d0', borderRadius: '8px', padding: '10px 14px', marginBottom: '4px' }
const errorStyle: React.CSSProperties = { color: '#dc2626', fontSize: '0.85rem', margin: '4px 0' }
const cancelButtonStyle: React.CSSProperties = { padding: '10px 18px', backgroundColor: '#f0f0f0', color: '#666', border: 'none', borderRadius: '6px', cursor: 'pointer', fontWeight: 600 }
const confirmButtonStyle: React.CSSProperties = { padding: '10px 18px', backgroundColor: '#00ccff', color: '#000', border: 'none', borderRadius: '6px', cursor: 'pointer', fontWeight: 600 }
const termsGridStyle: React.CSSProperties = { display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px' }
const labelStyle: React.CSSProperties = { display: 'block', fontSize: '0.75rem', color: '#888', marginBottom: '5px' }
```

**Step 2: Verify**

No TypeScript errors in dev server terminal.

**Step 3: Commit**

```bash
git add components/LendModal.tsx
git commit -m "feat: add LendModal component"
```

---

## Task 8: Wire modals and pending state into `/inventory`

**Files:**
- Modify: `app/inventory/page.tsx`

This task has the most changes. Do them as a single edit to the file.

**Step 1: Update imports and state at the top of the file**

After the existing imports, add:
```tsx
import TransferModal from '@/components/TransferModal'
import LendModal from '@/components/LendModal'
```

Add to state declarations (after `const [displayName, ...]`):
```tsx
const [activeTransfers, setActiveTransfers] = useState<any[]>([])
const [activeLoans, setActiveLoans] = useState<any[]>([])
const [transferItem, setTransferItem] = useState<any>(null)
const [lendItem, setLendItem] = useState<any>(null)
```

**Step 2: Fetch active transfers and loans in `fetchMyInventory`**

Inside `fetchMyInventory`, after `setItems(data || [])`, add:

```tsx
// Fetch active transfers (owner side)
const { data: transferData } = await supabase
  .from('item_transfers')
  .select('item_id, status, owner_confirmed, recipient_confirmed, recipient:profiles!item_transfers_recipient_id_fkey(preferred_name, username)')
  .eq('owner_id', user.id)
  .in('status', ['pending_handover'])
setActiveTransfers(transferData || [])

// Fetch active loans (owner side)
const { data: loanData } = await supabase
  .from('item_loans')
  .select('item_id, id, status, owner_confirmed_pickup, borrower_confirmed_pickup, return_by, borrower:profiles!item_loans_borrower_id_fkey(preferred_name, username)')
  .eq('owner_id', user.id)
  .in('status', ['pending_handover', 'active', 'return_pending'])
setActiveLoans(loanData || [])
```

**Step 3: Update `renderActionButton` to show pending state and wire modals**

Replace the existing `renderActionButton` function:

```tsx
function renderActionButton(item: any) {
  const status = item.availability_status

  // Check for active transfer on this item
  const transfer = activeTransfers.find(t => t.item_id === item.id)
  if (transfer) {
    const recipientName = transfer.recipient?.preferred_name || transfer.recipient?.username || 'recipient'
    if (transfer.owner_confirmed) {
      return (
        <div style={{ display: 'flex', flexDirection: 'column' as const, gap: '4px' }}>
          <span style={pendingBadgeStyle}>Pending Handover</span>
          <span style={{ fontSize: '0.75rem', color: '#888' }}>Waiting for {recipientName}…</span>
          <button onClick={() => handleSendTransferReminder(transfer)} style={reminderButtonStyle}>Send Reminder</button>
        </div>
      )
    }
    return (
      <div style={{ display: 'flex', flexDirection: 'column' as const, gap: '4px' }}>
        <span style={pendingBadgeStyle}>Pending Handover</span>
        <button onClick={() => handleOwnerConfirmTransfer(transfer)} style={handsOverButtonStyle}>I've Handed It Over</button>
        <button onClick={() => handleCancelTransfer(transfer)} style={cancelActionButtonStyle}>Cancel</button>
      </div>
    )
  }

  // Check for active loan on this item
  const loan = activeLoans.find(l => l.item_id === item.id && ['pending_handover'].includes(l.status))
  if (loan) {
    const borrowerName = loan.borrower?.preferred_name || loan.borrower?.username || 'borrower'
    if (loan.owner_confirmed_pickup) {
      return (
        <div style={{ display: 'flex', flexDirection: 'column' as const, gap: '4px' }}>
          <span style={pendingBadgeStyle}>Pending Handover</span>
          <span style={{ fontSize: '0.75rem', color: '#888' }}>Waiting for {borrowerName}…</span>
          <button onClick={() => handleSendLoanReminder(loan)} style={reminderButtonStyle}>Send Reminder</button>
        </div>
      )
    }
    return (
      <div style={{ display: 'flex', flexDirection: 'column' as const, gap: '4px' }}>
        <span style={pendingBadgeStyle}>Pending Handover</span>
        <button onClick={() => handleOwnerConfirmPickup(loan)} style={handsOverButtonStyle}>I've Handed It Over</button>
        <button onClick={() => handleCancelLoan(loan)} style={cancelActionButtonStyle}>Cancel</button>
      </div>
    )
  }

  if (status === 'Available to Borrow') {
    return <button onClick={() => setLendItem(item)} style={lendButtonStyle}>Lend To</button>
  }
  if (status === 'Available to Keep') {
    return <button onClick={() => setTransferItem(item)} style={transferButtonStyle}>Transfer To</button>
  }
  return <button style={makeAvailableButtonStyle}>Make Available</button>
}
```

**Step 4: Add action handler functions** (add after `downloadCSV`):

```tsx
async function handleOwnerConfirmTransfer(transfer: any) {
  const { error } = await supabase
    .from('item_transfers')
    .update({ owner_confirmed: true })
    .eq('id', transfer.id)
  if (!error) {
    await supabase.functions.invoke('send-transfer-notification', {
      body: { type: 'owner_confirmed', transfer_id: transfer.id },
    })
    fetchMyInventory()
  }
}

async function handleCancelTransfer(transfer: any) {
  const { error } = await supabase
    .from('item_transfers')
    .update({ status: 'cancelled' })
    .eq('id', transfer.id)
  if (!error) fetchMyInventory()
}

async function handleSendTransferReminder(transfer: any) {
  await supabase.functions.invoke('send-transfer-notification', {
    body: { type: 'owner_confirmed', transfer_id: transfer.id },
  })
}

async function handleOwnerConfirmPickup(loan: any) {
  const { error } = await supabase
    .from('item_loans')
    .update({ owner_confirmed_pickup: true })
    .eq('id', loan.id)
  if (!error) {
    await supabase.functions.invoke('send-loan-notification', {
      body: { type: 'owner_confirmed_pickup', loan_id: loan.id },
    })
    fetchMyInventory()
  }
}

async function handleCancelLoan(loan: any) {
  const { error } = await supabase
    .from('item_loans')
    .update({ status: 'cancelled' })
    .eq('id', loan.id)
  if (!error) fetchMyInventory()
}

async function handleSendLoanReminder(loan: any) {
  await supabase.functions.invoke('send-loan-notification', {
    body: { type: 'owner_confirmed_pickup', loan_id: loan.id },
  })
}
```

**Step 5: Add modal JSX** — at the bottom of the return, before the closing `</div>`, add:

```tsx
{transferItem && userId && (
  <TransferModal
    item={transferItem}
    ownerId={userId}
    onClose={() => setTransferItem(null)}
    onSuccess={() => { setTransferItem(null); fetchMyInventory() }}
  />
)}

{lendItem && userId && (
  <LendModal
    item={lendItem}
    ownerId={userId}
    onClose={() => setLendItem(null)}
    onSuccess={() => { setLendItem(null); fetchMyInventory() }}
  />
)}
```

**Step 6: Add new action button styles** at the bottom of the file:

```tsx
const pendingBadgeStyle: React.CSSProperties = { display: 'inline-block', padding: '2px 8px', backgroundColor: '#fef3c7', color: '#92400e', borderRadius: '10px', fontSize: '0.7rem', fontWeight: 700 }
const handsOverButtonStyle: React.CSSProperties = { height: '28px', padding: '0 10px', fontSize: '0.7rem', backgroundColor: '#16a34a', color: '#fff', border: 'none', borderRadius: '5px', cursor: 'pointer', fontWeight: 'bold', whiteSpace: 'nowrap' as const }
const reminderButtonStyle: React.CSSProperties = { height: '24px', padding: '0 8px', fontSize: '0.7rem', backgroundColor: '#f0f0f0', color: '#666', border: '1px solid #ddd', borderRadius: '4px', cursor: 'pointer', whiteSpace: 'nowrap' as const }
const cancelActionButtonStyle: React.CSSProperties = { height: '24px', padding: '0 8px', fontSize: '0.7rem', backgroundColor: '#fff', color: '#dc2626', border: '1px solid #fca5a5', borderRadius: '4px', cursor: 'pointer', whiteSpace: 'nowrap' as const }
```

**Step 7: Verify in browser**

1. Go to /inventory
2. Click "Transfer To" on an "Available to Keep" item → TransferModal should open
3. Click "Lend To" on an "Available to Borrow" item → LendModal should open
4. In TransferModal, type a valid username → "Find" → green matched box appears
5. Confirm → record created in `item_transfers` table (check Supabase dashboard)
6. Back on /inventory, item now shows "Pending Handover" badge + "I've Handed It Over" + "Cancel"

**Step 8: Commit**

```bash
git add app/inventory/page.tsx
git commit -m "feat: wire Transfer To and Lend To buttons with modals and pending handover state"
```

---

## Task 9: Add "Items Out on Loan" section (owner view)

**Files:**
- Modify: `app/inventory/page.tsx`

This section shows active loans where the user is the owner.

**Step 1: Add active loan handlers for dispute/confirm return**

Add after the existing handler functions from Task 8:

```tsx
async function handleDisputeReturn(loan: any) {
  await supabase
    .from('item_loans')
    .update({ status: 'disputed' })
    .eq('id', loan.id)
  fetchMyInventory()
}

async function handleOwnerConfirmReturn(loan: any) {
  await supabase
    .from('item_loans')
    .update({ owner_confirmed_return: true, status: 'complete' })
    .eq('id', loan.id)
  fetchMyInventory()
}
```

**Step 2: Add the section to the JSX**

In the return statement, after the main `</div>` that closes the table (before the CSV download div), add:

```tsx
{/* ITEMS OUT ON LOAN */}
{activeLoans.filter(l => ['active', 'return_pending'].includes(l.status)).length > 0 && (
  <div style={{ marginTop: '40px' }}>
    <h2 style={{ color: '#2D241E', fontSize: '1.1rem', fontWeight: 700, marginBottom: '16px' }}>
      Items Out on Loan
    </h2>
    <div style={tableContainerStyle}>
      <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left' as const }}>
        <thead>
          <tr style={headerRowStyle}>
            <th style={thStyle}>Item</th>
            <th style={thStyle}>Borrower</th>
            <th style={thStyle}>Return By</th>
            <th style={thStyle}>Status</th>
            <th style={thStyle}>Action</th>
          </tr>
        </thead>
        <tbody>
          {activeLoans
            .filter(l => ['active', 'return_pending'].includes(l.status))
            .map(loan => {
              const borrowerName = loan.borrower?.preferred_name || loan.borrower?.username || '—'
              const returnBy = loan.return_by ? new Date(loan.return_by).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' }) : '—'
              const itemName = items.find(i => i.id === loan.item_id)?.item_name || '—'
              return (
                <tr key={loan.id} style={rowStyle}>
                  <td style={{ ...tdStyle, fontWeight: 600, color: '#2D241E' }}>{itemName}</td>
                  <td style={tdStyle}>{borrowerName}</td>
                  <td style={tdStyle}>{returnBy}</td>
                  <td style={tdStyle}>
                    <span style={{ fontSize: '0.8rem', color: loan.status === 'return_pending' ? '#92400e' : '#555' }}>
                      {loan.status === 'return_pending' ? 'Return Pending' : 'Out on Loan'}
                    </span>
                  </td>
                  <td style={tdStyle}>
                    {loan.status === 'return_pending' && (
                      <div style={{ display: 'flex', gap: '6px' }}>
                        <button onClick={() => handleOwnerConfirmReturn(loan)} style={handsOverButtonStyle}>Got It Back</button>
                        <button onClick={() => handleDisputeReturn(loan)} style={cancelActionButtonStyle}>Dispute</button>
                      </div>
                    )}
                  </td>
                </tr>
              )
            })}
        </tbody>
      </table>
    </div>
  </div>
)}
```

**Step 3: Verify in browser**

Initiate a loan, have both parties confirm pickup (or manually update `status` to `active` in Supabase dashboard). Item should appear in "Items Out on Loan" section.

**Step 4: Commit**

```bash
git add app/inventory/page.tsx
git commit -m "feat: add Items Out on Loan section to /inventory"
```

---

## Task 10: Add "Items I'm Borrowing" and "Items Pending Transfer" sections (recipient/borrower view)

**Files:**
- Modify: `app/inventory/page.tsx`

**Step 1: Add state for received-side records**

Add to state declarations:

```tsx
const [inboundTransfers, setInboundTransfers] = useState<any[]>([])
const [inboundLoans, setInboundLoans] = useState<any[]>([])
```

**Step 2: Fetch inbound records in `fetchMyInventory`**

After the owner-side fetches, add:

```tsx
// Inbound transfers (recipient side)
const { data: inboundTransferData } = await supabase
  .from('item_transfers')
  .select('id, item_id, status, owner_confirmed, recipient_confirmed, owner:profiles!item_transfers_owner_id_fkey(preferred_name, username), gear_items(item_name)')
  .eq('recipient_id', user.id)
  .in('status', ['pending_handover'])
setInboundTransfers(inboundTransferData || [])

// Inbound loans (borrower side)
const { data: inboundLoanData } = await supabase
  .from('item_loans')
  .select('id, item_id, status, owner_confirmed_pickup, borrower_confirmed_pickup, borrower_confirmed_return, return_by, owner:profiles!item_loans_owner_id_fkey(preferred_name, username), gear_items(item_name)')
  .eq('borrower_id', user.id)
  .in('status', ['pending_handover', 'active'])
setInboundLoans(inboundLoanData || [])
```

**Step 3: Add action handlers**

```tsx
async function handleRecipientConfirmTransfer(transfer: any) {
  const { error } = await supabase
    .from('item_transfers')
    .update({ recipient_confirmed: true, status: 'complete' })
    .eq('id', transfer.id)
  if (!error) fetchMyInventory()
}

async function handleBorrowerConfirmPickup(loan: any) {
  const { error } = await supabase
    .from('item_loans')
    .update({ borrower_confirmed_pickup: true, status: 'active' })
    .eq('id', loan.id)
  if (!error) fetchMyInventory()
}

async function handleBorrowerConfirmReturn(loan: any) {
  const { error } = await supabase
    .from('item_loans')
    .update({ borrower_confirmed_return: true, status: 'return_pending' })
    .eq('id', loan.id)
  if (!error) {
    await supabase.functions.invoke('send-loan-notification', {
      body: { type: 'borrower_confirmed_return', loan_id: loan.id },
    })
    fetchMyInventory()
  }
}
```

**Step 4: Add sections to JSX**

After the "Items Out on Loan" section, add:

```tsx
{/* ITEMS PENDING TRANSFER TO ME */}
{inboundTransfers.length > 0 && (
  <div style={{ marginTop: '40px' }}>
    <h2 style={{ color: '#2D241E', fontSize: '1.1rem', fontWeight: 700, marginBottom: '16px' }}>
      Items Being Transferred to Me
    </h2>
    <div style={tableContainerStyle}>
      <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left' as const }}>
        <thead>
          <tr style={headerRowStyle}>
            <th style={thStyle}>Item</th>
            <th style={thStyle}>From</th>
            <th style={thStyle}>Status</th>
            <th style={thStyle}>Action</th>
          </tr>
        </thead>
        <tbody>
          {inboundTransfers.map(transfer => {
            const ownerName = transfer.owner?.preferred_name || transfer.owner?.username || '—'
            const itemName = transfer.gear_items?.item_name || '—'
            return (
              <tr key={transfer.id} style={rowStyle}>
                <td style={{ ...tdStyle, fontWeight: 600, color: '#2D241E' }}>{itemName}</td>
                <td style={tdStyle}>{ownerName}</td>
                <td style={tdStyle}>
                  <span style={{ fontSize: '0.8rem', color: '#555' }}>
                    {transfer.owner_confirmed ? 'Handed over — confirm receipt' : 'Pending handover'}
                  </span>
                </td>
                <td style={tdStyle}>
                  {transfer.owner_confirmed && (
                    <button onClick={() => handleRecipientConfirmTransfer(transfer)} style={handsOverButtonStyle}>
                      Got It
                    </button>
                  )}
                </td>
              </tr>
            )
          })}
        </tbody>
      </table>
    </div>
  </div>
)}

{/* ITEMS I'M BORROWING */}
{inboundLoans.length > 0 && (
  <div style={{ marginTop: '40px' }}>
    <h2 style={{ color: '#2D241E', fontSize: '1.1rem', fontWeight: 700, marginBottom: '16px' }}>
      Items I'm Borrowing
    </h2>
    <div style={tableContainerStyle}>
      <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left' as const }}>
        <thead>
          <tr style={headerRowStyle}>
            <th style={thStyle}>Item</th>
            <th style={thStyle}>From</th>
            <th style={thStyle}>Return By</th>
            <th style={thStyle}>Status</th>
            <th style={thStyle}>Action</th>
          </tr>
        </thead>
        <tbody>
          {inboundLoans.map(loan => {
            const ownerName = loan.owner?.preferred_name || loan.owner?.username || '—'
            const itemName = loan.gear_items?.item_name || '—'
            const returnBy = loan.return_by ? new Date(loan.return_by).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' }) : '—'
            return (
              <tr key={loan.id} style={rowStyle}>
                <td style={{ ...tdStyle, fontWeight: 600, color: '#2D241E' }}>{itemName}</td>
                <td style={tdStyle}>{ownerName}</td>
                <td style={tdStyle}>{returnBy}</td>
                <td style={tdStyle}>
                  <span style={{ fontSize: '0.8rem', color: '#555' }}>
                    {loan.status === 'pending_handover'
                      ? loan.owner_confirmed_pickup ? 'Confirm you have it' : 'Waiting for handover'
                      : 'Active loan'}
                  </span>
                </td>
                <td style={tdStyle}>
                  {loan.status === 'pending_handover' && loan.owner_confirmed_pickup && (
                    <button onClick={() => handleBorrowerConfirmPickup(loan)} style={handsOverButtonStyle}>Got It</button>
                  )}
                  {loan.status === 'active' && (
                    <button onClick={() => handleBorrowerConfirmReturn(loan)} style={cancelActionButtonStyle}>I've Returned It</button>
                  )}
                </td>
              </tr>
            )
          })}
        </tbody>
      </table>
    </div>
  </div>
)}
```

**Step 5: Verify in browser**

Using two test accounts, initiate a loan or transfer. Both sections should appear on the respective user's /inventory.

**Step 6: Commit**

```bash
git add app/inventory/page.tsx
git commit -m "feat: add Items I'm Borrowing and inbound transfer sections to /inventory"
```

---

## Task 11: Update TASKS.md

**Files:**
- Modify: `TASKS.md`

Move "Lend To / Transfer buttons" from ⚡ Quick Wins to ✅ Done. Add any follow-up items discovered (dispute arbitration UI, on-site notifications) to 💡 Ideas.

**Step 1: Update TASKS.md**

```bash
git add TASKS.md
git commit -m "docs: mark Lend To / Transfer To as done, update TASKS.md"
```

---

## End-to-End Verification Checklist

Before closing this feature, manually verify each path:

**Transfer flow:**
- [ ] Owner clicks Transfer To → modal opens
- [ ] Invalid username shows error message
- [ ] Valid username shows matched user name
- [ ] Confirm → record in `item_transfers`, item shows "Pending Handover" badge
- [ ] Owner clicks "I've Handed It Over" → badge updates, "Send Reminder" appears
- [ ] Recipient logs in → sees item in "Items Being Transferred to Me" with "Got It" button
- [ ] Recipient clicks "Got It" → item disappears from owner's inventory, appears in recipient's

**Loan flow:**
- [ ] Owner clicks Lend To → modal opens with terms pre-filled
- [ ] Confirm → record in `item_loans`, "Pending Handover" badge on item
- [ ] Owner clicks "I've Handed It Over" → email sent to borrower
- [ ] Borrower clicks "Got It" → item appears in "Items I'm Borrowing", item appears in owner's "Items Out on Loan"
- [ ] Borrower clicks "I've Returned It" → status becomes `return_pending`, email sent to owner
- [ ] Owner clicks "Got It Back" → loan complete, item returns to available
- [ ] Owner clicks "Dispute" → status becomes `disputed`

**Cancel flow:**
- [ ] Owner can Cancel before handing over → item returns to available
