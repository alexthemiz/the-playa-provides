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
    const { loan_id, dispute_message } = await req.json()

    const RESEND_API_KEY = Deno.env.get('RESEND_API_KEY')
    const SUPABASE_URL = Deno.env.get('SUPABASE_URL')!
    const SUPABASE_SERVICE_ROLE_KEY = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!
    const admin = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY)

    const { data: loan, error } = await admin
      .from('item_loans')
      .select(`
        *,
        gear_items ( item_name ),
        owner:profiles!item_loans_owner_id_fkey ( username, preferred_name ),
        borrower:profiles!item_loans_borrower_id_fkey ( username, preferred_name )
      `)
      .eq('id', loan_id)
      .single()

    if (error || !loan) throw new Error('Loan not found')

    const ownerName = loan.owner?.preferred_name || loan.owner?.username || 'Unknown'
    const borrowerName = loan.borrower?.preferred_name || loan.borrower?.username || 'Unknown'
    const itemName = loan.gear_items?.item_name || 'an item'

    const html = `
      <div style="font-family: sans-serif; color: #333; max-width: 600px;">
        <h1 style="color: #C08261;">Loan Dispute Submitted</h1>
        <table style="border-collapse: collapse; width: 100%; margin: 12px 0;">
          <tr><td style="padding: 6px 0; color: #888; font-size: 0.85em;">Loan ID</td><td style="padding: 6px 0;">${loan_id}</td></tr>
          <tr><td style="padding: 6px 0; color: #888; font-size: 0.85em;">Item</td><td style="padding: 6px 0;">${itemName}</td></tr>
          <tr><td style="padding: 6px 0; color: #888; font-size: 0.85em;">Owner</td><td style="padding: 6px 0;">${ownerName}</td></tr>
          <tr><td style="padding: 6px 0; color: #888; font-size: 0.85em;">Borrower</td><td style="padding: 6px 0;">${borrowerName}</td></tr>
        </table>
        <div style="background: #fef2f2; border: 1px solid #fecaca; padding: 16px; border-radius: 8px; margin: 16px 0;">
          <p style="margin: 0; font-size: 0.9em; color: #7f1d1d;"><strong>Dispute message:</strong></p>
          <p style="margin: 8px 0 0; white-space: pre-wrap;">${dispute_message}</p>
        </div>
        <p style="font-size: 0.8em; color: #999; margin-top: 24px;">Sent via <a href="https://theplayaprovides.com" style="color: #C08261;">The Playa Provides</a></p>
      </div>
    `

    const res = await fetch('https://api.resend.com/emails', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${RESEND_API_KEY}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        from: 'The Playa Provides <hello@theplayaprovides.com>',
        to: ['support@theplayaprovides.com'],
        subject: `Dispute: ${ownerName} vs ${borrowerName} — ${itemName}`,
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
