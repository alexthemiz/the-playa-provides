// deno-lint-ignore-file no-unused-vars
import { serve } from "https://deno.land/std@0.168.0/http/server.ts"
import { createClient } from "https://esm.sh/@supabase/supabase-js@2"

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

function escapeHtml(input: string): string {
  return input
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;')
}

serve(async (req: Request) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders })
  }

  try {
    const { recipientId, senderId, selectedWishItems, note, inventoryItems: rawInventoryItems } = await req.json()
    const inventoryItems = rawInventoryItems || []

    const RESEND_API_KEY = Deno.env.get('RESEND_API_KEY')
    const SUPABASE_URL = Deno.env.get('SUPABASE_URL')!
    const SUPABASE_SERVICE_ROLE_KEY = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!

    const adminClient = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY)

    // Caller must be the sender they claim to be — this endpoint runs with
    // verify_jwt off, so the auth check has to happen in code.
    const authHeader = req.headers.get('Authorization')
    if (!authHeader) {
      return new Response(JSON.stringify({ error: 'Missing authorization header' }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 401,
      })
    }
    const token = authHeader.replace('Bearer ', '')
    const { data: { user: callerUser }, error: jwtError } = await adminClient.auth.getUser(token)
    if (jwtError || !callerUser) {
      return new Response(JSON.stringify({ error: 'Invalid or expired token' }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 401,
      })
    }
    if (callerUser.id !== senderId) {
      return new Response(JSON.stringify({ error: 'Unauthorized: senderId mismatch' }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 403,
      })
    }

    // Look up recipient's contact email and name
    const { data: recipientProfile } = await adminClient
      .from('profiles')
      .select('contact_email, preferred_name')
      .eq('id', recipientId)
      .single()

    let recipientEmail = recipientProfile?.contact_email
    const recipientName = escapeHtml(recipientProfile?.preferred_name || 'there')

    // Fall back to auth email
    if (!recipientEmail) {
      const { data: { user: recipientUser } } = await adminClient.auth.admin.getUserById(recipientId)
      recipientEmail = recipientUser?.email
    }

    if (!recipientEmail) {
      throw new Error('Could not find recipient email')
    }

    // Sender display info comes from their own profile, never from the
    // request body — a caller who's authenticated as senderId still
    // shouldn't be able to put arbitrary text in the "From" line.
    let senderEmail: string | undefined
    const { data: senderProfileData } = await adminClient
      .from('profiles')
      .select('contact_email, username, preferred_name')
      .eq('id', senderId)
      .single()
    senderEmail = senderProfileData?.contact_email
    if (!senderEmail) {
      const { data: { user: senderUser } } = await adminClient.auth.admin.getUserById(senderId)
      senderEmail = senderUser?.email
    }
    const senderName = escapeHtml(senderProfileData?.preferred_name || senderProfileData?.username || 'Someone')
    const senderUsername = escapeHtml(senderProfileData?.username || '')

    const wishListHtml = (selectedWishItems as { name: string; term: string }[])
      .map(({ name, term }) =>
        `<li style="margin: 4px 0;">${escapeHtml(name)} - To ${escapeHtml(term)}</li>`
      ).join('')

    const inventoryHtml = (inventoryItems as { name: string; url: string; availStatus: string }[])
      .map(({ name, url, availStatus }) => {
        const label = availStatus === 'Available to Borrow' ? 'To borrow'
          : availStatus === 'Available to Keep' ? 'To keep'
          : '';
        const safeUrl = typeof url === 'string' && url.startsWith('https://theplayaprovides.com/') ? url : 'https://theplayaprovides.com/find-items'
        return `<li style="margin: 4px 0;"><a href="${safeUrl}" style="color: #C08261; font-weight: bold;">${escapeHtml(name)}</a>${label ? ` - ${label}` : ''}</li>`;
      }).join('')

    const noteHtml = note
      ? `<div style="background: #f3f4f6; padding: 15px; border-radius: 8px; margin: 16px 0;">
           <p style="margin: 0;"><strong>Their note:</strong></p>
           <p style="margin: 8px 0 0; font-style: italic;">"${escapeHtml(note)}"</p>
         </div>`
      : ''

    const res = await fetch('https://api.resend.com/emails', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${RESEND_API_KEY}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        from: 'The Playa Provides <hello@theplayaprovides.com>',
        to: [recipientEmail],
        reply_to: senderEmail ? [senderEmail] : undefined,
        subject: `${senderName} has something on your wish list`,
        html: `
          <div style="font-family: sans-serif; color: #333; max-width: 600px;">
            <h1 style="color: #C08261;">Someone has what you're looking for!</h1>
            <p>Hey ${recipientName}, <a href="https://theplayaprovides.com/profile/${senderUsername}" style="color: #C08261; font-weight: bold;">${senderName}</a> says they have some items from your wish list:</p>
            <ul style="background: #fdf3ec; border: 1px solid #f0d8c8; padding: 15px 15px 15px 30px; border-radius: 8px; margin: 16px 0;">
              ${wishListHtml}
            </ul>
            ${inventoryItems.length > 0 ? `
              <p style="margin-top: 20px;">They also have these items you might like:</p>
              <ul style="background: #f5e6ff; border: 1px solid #e8c8ff; padding: 15px 15px 15px 30px; border-radius: 8px; margin: 8px 0;">
                ${inventoryHtml}
              </ul>
            ` : ''}
            ${noteHtml}
            <p style="margin-top: 20px;">Reply to this email to let ${senderName} know if you're interested.</p>
            <p style="font-size: 0.8em; color: #999; margin-top: 24px;">
              Sent via <a href="https://theplayaprovides.com" style="color: #C08261;">The Playa Provides</a>
            </p>
          </div>
        `,
      }),
    })

    const data = await res.json()

    return new Response(
      JSON.stringify(data),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 200 }
    )

  } catch (err: unknown) {
    const error = err as Error
    return new Response(
      JSON.stringify({ error: error.message }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 400 }
    )
  }
})
