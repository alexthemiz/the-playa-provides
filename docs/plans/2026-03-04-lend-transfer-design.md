# Lend To & Transfer To — Design Doc

_Date: 2026-03-04_

## Overview

Two new flows that allow owners to formally lend or transfer items to other registered users. Both use an escrow-style "pending handover" state with dual confirmation before the transaction finalizes. Notifications are email-only (via Resend), deferring on-site notifications to a future feature.

---

## Scope & Constraints

- **In scope:** Transfer To flow, Lend To flow, dual confirmation handover, loan return + dispute flag, email notifications, two new DB tables, two new Edge Functions, two new modals, new inventory sections.
- **Out of scope:** On-site notifications, dispute arbitration (status flagged only), unregistered recipients (registered users only).
- **Notification method:** Email only via existing Resend / `hello@theplayaprovides.com` infrastructure.
- **Recipient lookup:** By username or email address. Must match an existing account — no invite flow.
- **Email copy:** Uses `preferred_name ?? username` for all name references.

---

## Data Model

### `item_transfers`

| Column | Type | Notes |
|---|---|---|
| id | uuid | PK |
| item_id | uuid | FK → gear_items |
| owner_id | uuid | FK → profiles |
| recipient_id | uuid | FK → profiles |
| status | text | `pending_handover` \| `complete` \| `cancelled` |
| owner_confirmed | boolean | default false |
| recipient_confirmed | boolean | default false |
| created_at | timestamptz | |
| updated_at | timestamptz | |

Transaction finalizes (status → `complete`, item moves to recipient's inventory) when both `owner_confirmed` and `recipient_confirmed` are true.

### `item_loans`

| Column | Type | Notes |
|---|---|---|
| id | uuid | PK |
| item_id | uuid | FK → gear_items |
| owner_id | uuid | FK → profiles |
| borrower_id | uuid | FK → profiles |
| status | text | `pending_handover` \| `active` \| `return_pending` \| `complete` \| `disputed` \| `cancelled` |
| owner_confirmed_pickup | boolean | default false |
| borrower_confirmed_pickup | boolean | default false |
| borrower_confirmed_return | boolean | default false |
| owner_confirmed_return | boolean | default false |
| pickup_by | date | nullable |
| return_by | date | nullable |
| damage_agreement | numeric | nullable — $ amount agreed if damaged |
| loss_agreement | numeric | nullable — $ amount agreed if not returned |
| notes | text | nullable |
| created_at | timestamptz | |
| updated_at | timestamptz | |

Loan goes `active` when both pickup confirmations are true. Return completes when both return confirmations are true. `disputed` is a terminal flag for future arbitration.

**Note:** `gear_items.status` is NOT modified. Active transfer/loan records are checked at query time to determine if an item is locked. This avoids coupling two state machines.

---

## State Machines

### Transfer

```
available
  → owner clicks Transfer To, enters recipient username/email
pending_handover  (item locked — Transfer/Lend buttons hidden, Cancel shown)
  → owner clicks "I've Handed It Over"
    owner_confirmed = true
    email → recipient: "Got it? Log in to confirm."
  → recipient clicks "Got It" on /inventory
    recipient_confirmed = true
    → status = complete
    → item_id ownership updated: removed from owner's inventory, added to recipient's
  → owner clicks Cancel (any time before complete)
    → status = cancelled, item returns to available
```

### Loan — Pickup

```
available
  → owner clicks Lend To, enters username/email + reviews/edits terms
pending_handover  (item locked)
  → owner clicks "I've Handed It Over"
    owner_confirmed_pickup = true
    email → borrower: "Got it? Log in to confirm."
  → borrower clicks "Got It" on /inventory
    borrower_confirmed_pickup = true
    → status = active
    → item appears in owner's "Items Out on Loan" section
    → item appears in borrower's "Items I'm Borrowing" section
  → owner clicks Cancel (before active)
    → status = cancelled, item returns to available
```

### Loan — Return

```
active
  → borrower clicks "I've Returned It"
    borrower_confirmed_return = true, status = return_pending
    email → owner: "Sam says they've returned [item]. Log in to confirm."
  → owner clicks "Got It Back"
    owner_confirmed_return = true
    → status = complete, item returns to available in owner's inventory
  → owner clicks "Dispute Return"
    → status = disputed (flagged for future arbitration — no further automated action in v1)
```

---

## Email Notifications

All sent from `hello@theplayaprovides.com` via Resend. Names use `preferred_name ?? username`.

| Trigger | Recipient | Subject / Key content |
|---|---|---|
| Transfer initiated | Recipient | "[Name] is transferring [item] to you — they'll confirm when they hand it over" |
| Owner confirms handover (transfer) | Recipient | "[Name] says they've handed over [item] — log in to confirm you have it" |
| Loan initiated | Borrower | "[Name] is lending you [item] — terms listed — they'll confirm when they hand it over" |
| Owner confirms pickup (loan) | Borrower | "[Name] says they've handed over [item] — log in to confirm you have it" |
| Borrower confirms return | Owner | "[Name] says they've returned [item] — log in to confirm" |

---

## Edge Functions

Two new Supabase Edge Functions (Deno), deployed with `--no-verify-jwt`:

**`send-transfer-notification`**
- Called with `{ type: 'initiated' | 'owner_confirmed', transfer_id }`
- Looks up transfer record, joins item + owner + recipient names
- Sends appropriate email via Resend

**`send-loan-notification`**
- Called with `{ type: 'initiated' | 'owner_confirmed_pickup' | 'borrower_confirmed_return', loan_id }`
- Looks up loan record, joins item + owner + borrower names + terms
- Sends appropriate email via Resend

---

## RLS Policies

Applied to both `item_transfers` and `item_loans`:

| Operation | Who |
|---|---|
| SELECT | owner_id = auth.uid() OR recipient_id/borrower_id = auth.uid() |
| INSERT | authenticated user (becomes owner_id) |
| UPDATE | owner can update owner_confirmed fields + status; recipient/borrower can update their confirmed fields only |
| DELETE | not permitted — use status = cancelled |

---

## UI Changes

### `/inventory` — owner view

**Main table changes:**
- Items with an active transfer/loan record in `pending_handover`: show "Pending Handover" badge in Status column
- Replace Transfer/Lend buttons with: "I've Handed It Over" + "Cancel"
- If owner has confirmed but waiting on other party: show "Waiting for [name] to confirm…" + "Send Reminder" button (fires notification email again)

**New section below main table: "Items Out on Loan"**
- Columns: Item Name, Borrower, Return By, Status, Actions
- Actions: "Dispute Return" button (visible after borrower clicks returned), "Cancel" (while pending)

**New modals:**
- `TransferModal.tsx` — username/email input field with inline validation ("No account found"), confirm button
- `LendModal.tsx` — username/email input + terms section (pickup by date, return by date, damage agreement $, loss agreement $, notes) pre-filled from listing, editable before sending

### `/inventory` — borrower view

**New section: "Items I'm Borrowing"**
- Columns: Item Name, Owner, Return By, Status, Actions
- While `pending_handover`: "Got It" button
- While `active`: "I've Returned It" button

---

## Out of Scope (v1)

- Dispute arbitration (status flagged only, no admin UI)
- On-site / push notifications (email only)
- Unregistered recipient flow
- Loan renewal / extension
- Transfer to unregistered users via invite
