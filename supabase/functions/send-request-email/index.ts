// deno-lint-ignore-file no-unused-vars
import { serve } from "https://deno.land/std@0.168.0/http/server.ts"
import { createClient } from "https://esm.sh/@supabase/supabase-js@2"

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

serve(async (req: Request) => {
  // 1. Handle CORS preflight
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders })
  }

  try {
    const { ownerId, message, itemName, requesterName, requesterEmail } = await req.json()

    const RESEND_API_KEY = Deno.env.get('RESEND_API_KEY')
    const SUPABASE_URL = Deno.env.get('SUPABASE_URL')!
    const SUPABASE_SERVICE_ROLE_KEY = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!

    // 2. Look up owner's contact email from their profile
    const adminClient = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY)

    const { data: ownerProfile } = await adminClient
      .from('profiles')
      .select('contact_email, preferred_name')
      .eq('id', ownerId)
      .single()

    let ownerEmail = ownerProfile?.contact_email
    const ownerName = ownerProfile?.preferred_name || 'there'

    // 3. Fall back to their auth account email if no contact_email set
    if (!ownerEmail) {
      const { data: { user: ownerUser } } = await adminClient.auth.admin.getUserById(ownerId)
      ownerEmail = ownerUser?.email
    }

    if (!ownerEmail) {
      throw new Error('Could not find owner email')
    }

    const res = await fetch('https://api.resend.com/emails', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${RESEND_API_KEY}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        from: 'The Playa Provides <hello@theplayaprovides.com>',
        to: [ownerEmail],
        subject: `New Request for: ${itemName}`,
        html: `
          <div style="font-family: sans-serif; color: #333; max-width: 600px;">
            <h1 style="color: #C08261;">New Borrow Request!</h1>
            <p>Hey ${ownerName}, someone is interested in your <strong>${itemName}</strong>.</p>
            <div style="background: #f3f4f6; padding: 15px; border-radius: 8px; margin: 16px 0;">
              <p style="margin: 0;"><strong>Message:</strong></p>
              <p style="margin: 8px 0 0; font-style: italic;">"${message}"</p>
            </div>
            <div style="background: #fdf3ec; border: 1px solid #f0d8c8; padding: 15px; border-radius: 8px; margin: 16px 0;">
              <p style="margin: 0; font-size: 0.9em; color: #666;"><strong>From:</strong> ${requesterName || 'A community member'}${requesterEmail ? ` &lt;${requesterEmail}&gt;` : ''}</p>
              ${requesterEmail ? `<p style="margin: 8px 0 0; font-size: 0.9em; color: #666;">Reply directly to this email to get in touch.</p>` : ''}
            </div>
            <p style="font-size: 0.8em; color: #999; margin-top: 24px;">
              Sent via <a href="https://theplayaprovides.com" style="color: #C08261;">The Playa Provides</a>
            </p>
          </div>
        `,
        reply_to: requesterEmail || undefined,
      }),
    })

    const data = await res.json()

    return new Response(
      JSON.stringify(data),
      {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 200
      }
    )

  } catch (err: unknown) {
    const error = err as Error;
    return new Response(
      JSON.stringify({ error: error.message }),
      {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 400
      }
    )
  }
})
