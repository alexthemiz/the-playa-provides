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
