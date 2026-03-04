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
