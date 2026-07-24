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

function formatDate(d: string | null) {
  if (!d) return null
  return new Date(d + 'T00:00:00').toLocaleDateString('en-US', { month: 'long', day: 'numeric', year: 'numeric' })
}

// btoa() throws on any character outside Latin1 — a real risk here since
// itemName/ownerName come from user-entered profile/item data and this is a
// Burning Man community app (accented characters, emoji in names are
// plausible). Route through TextEncoder first so the base64 is built from
// actual UTF-8 bytes instead of raw JS string code units.
function toBase64(str: string) {
  const bytes = new TextEncoder().encode(str)
  let binary = ''
  bytes.forEach(b => { binary += String.fromCharCode(b) })
  return btoa(binary)
}

// ICS text values need commas/semicolons/backslashes/newlines escaped per
// RFC 5545 — without this, an item name or owner name containing e.g. a
// comma could produce a malformed calendar file some clients reject.
function icsEscape(text: string) {
  return text.replace(/\\/g, '\\\\').replace(/,/g, '\\,').replace(/;/g, '\\;').replace(/\n/g, '\\n')
}

// Minimal single-event ICS — no library needed, this is just a text format.
// UID reuses informal_loan_id (already a stable, unique UUID) rather than
// generating a fresh random one — that makes a resent invite update the
// SAME calendar event in the recipient's calendar app instead of creating
// a duplicate, and avoids introducing crypto.randomUUID() as a new,
// unverified-in-this-codebase API for something that already has a
// perfectly good stable ID available.
function buildIcs(uid: string, summary: string, description: string, dateStr: string) {
  const d = dateStr.replace(/-/g, '')
  return [
    'BEGIN:VCALENDAR',
    'VERSION:2.0',
    'PRODID:-//The Playa Provides//EN',
    'BEGIN:VEVENT',
    `UID:${uid}@theplayaprovides.com`,
    `DTSTAMP:${new Date().toISOString().replace(/[-:]/g, '').split('.')[0]}Z`,
    `DTSTART;VALUE=DATE:${d}`,
    `DTEND;VALUE=DATE:${d}`,
    `SUMMARY:${icsEscape(summary)}`,
    `DESCRIPTION:${icsEscape(description)}`,
    'END:VEVENT',
    'END:VCALENDAR',
  ].join('\r\n')
}

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders })
  }

  try {
    const { informal_loan_id } = await req.json()

    const { data: loan, error } = await supabase
      .from('informal_loans')
      .select('id, invite_token, borrower_name, borrower_email, handed_over_at, return_by, damage_agreement, loss_agreement, notes, gear_items(item_name, image_urls), owner:profiles!informal_loans_owner_id_fkey(preferred_name, username)')
      .eq('id', informal_loan_id)
      .single()

    if (error || !loan) throw new Error(error?.message ?? 'Informal loan not found')
    if (!loan.borrower_email) {
      return new Response(JSON.stringify({ ok: true, skipped: 'no email on file' }), { headers: corsHeaders, status: 200 })
    }

    const ownerNameRaw = (loan.owner as any)?.preferred_name || (loan.owner as any)?.username || 'Someone'
    const itemNameRaw = (loan.gear_items as any)?.item_name || 'an item'
    const ownerName = escapeHtml(ownerNameRaw)
    const itemName = escapeHtml(itemNameRaw)
    const notes = loan.notes ? escapeHtml(loan.notes) : ''
    const claimUrl = `${SITE_URL}/loan-invite/${loan.invite_token}`
    const returnByFormatted = formatDate(loan.return_by)

    const termsRows = [
      `<tr><td style="padding:4px 8px;color:#555;">Handed over</td><td style="padding:4px 8px;font-weight:bold;">${formatDate(loan.handed_over_at)}</td></tr>`,
      returnByFormatted ? `<tr style="background:#f9f9f9;"><td style="padding:4px 8px;color:#555;">Expected back</td><td style="padding:4px 8px;font-weight:bold;">${returnByFormatted}</td></tr>` : '',
      loan.damage_agreement != null ? `<tr><td style="padding:4px 8px;color:#555;">If damaged</td><td style="padding:4px 8px;font-weight:bold;">$${loan.damage_agreement}</td></tr>` : '',
      loan.loss_agreement != null ? `<tr style="background:#f9f9f9;"><td style="padding:4px 8px;color:#555;">If not returned</td><td style="padding:4px 8px;font-weight:bold;">$${loan.loss_agreement}</td></tr>` : '',
      notes ? `<tr><td style="padding:4px 8px;color:#555;">Notes</td><td style="padding:4px 8px;">${notes}</td></tr>` : '',
    ].filter(Boolean).join('')

    const html = `
<div style="font-family:sans-serif;max-width:520px;margin:0 auto;padding:20px;">
  <h1 style="font-size:18px;color:#111;">${ownerName} lent you ${itemName}</h1>
  <table style="border-collapse:collapse;width:100%;font-size:14px;margin:16px 0;">${termsRows}</table>
  <p style="font-size:14px;color:#333;">
    <a href="${claimUrl}" style="display:inline-block;padding:12px 20px;background:#1E8A82;color:#fff;text-decoration:none;border-radius:6px;font-weight:bold;">View this loan</a>
  </p>
  <p style="font-size:13px;color:#666;">
    New to The Playa Provides? That link lets you create an account. Already have one under a different email? Same link — just log in instead.
  </p>
</div>`

    const emailBody: any = {
      from: 'hello@theplayaprovides.com',
      to: loan.borrower_email,
      subject: `${ownerNameRaw} lent you ${itemNameRaw}`,
      html,
    }

    if (returnByFormatted) {
      const ics = buildIcs(loan.id, `Return ${itemNameRaw} to ${ownerNameRaw}`, `Via The Playa Provides: ${claimUrl}`, loan.return_by)
      emailBody.attachments = [{
        filename: 'return-reminder.ics',
        content: toBase64(ics),
      }]
    }

    const res = await fetch('https://api.resend.com/emails', {
      method: 'POST',
      headers: { 'Authorization': `Bearer ${RESEND_API_KEY}`, 'Content-Type': 'application/json' },
      body: JSON.stringify(emailBody),
    })

    if (!res.ok) throw new Error(`Resend error: ${await res.text()}`)

    return new Response(JSON.stringify({ ok: true }), { headers: corsHeaders, status: 200 })
  } catch (err) {
    console.error(err)
    return new Response(JSON.stringify({ error: String(err) }), { headers: corsHeaders, status: 500 })
  }
})
