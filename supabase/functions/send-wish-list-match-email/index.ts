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
    const { recipientId, senderName, senderUsername, selectedItems, note } = await req.json()

    const RESEND_API_KEY = Deno.env.get('RESEND_API_KEY')
    const SUPABASE_URL = Deno.env.get('SUPABASE_URL')!
    const SUPABASE_SERVICE_ROLE_KEY = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!

    const adminClient = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY)

    // Look up recipient's contact email and name
    const { data: recipientProfile } = await adminClient
      .from('profiles')
      .select('contact_email, preferred_name')
      .eq('id', recipientId)
      .single()

    let recipientEmail = recipientProfile?.contact_email
    const recipientName = recipientProfile?.preferred_name || 'there'

    // Fall back to auth email
    if (!recipientEmail) {
      const { data: { user: recipientUser } } = await adminClient.auth.admin.getUserById(recipientId)
      recipientEmail = recipientUser?.email
    }

    if (!recipientEmail) {
      throw new Error('Could not find recipient email')
    }

    const itemListHtml = (selectedItems as string[])
      .map((item: string) => `<li style="margin: 4px 0;">${item}</li>`)
      .join('')

    const noteHtml = note
      ? `<div style="background: #f3f4f6; padding: 15px; border-radius: 8px; margin: 16px 0;">
           <p style="margin: 0;"><strong>Their note:</strong></p>
           <p style="margin: 8px 0 0; font-style: italic;">"${note}"</p>
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
        subject: `${senderName} has something on your wish list`,
        html: `
          <div style="font-family: sans-serif; color: #333; max-width: 600px;">
            <h1 style="color: #C08261;">Someone has what you're looking for!</h1>
            <p>Hey ${recipientName}, <strong>${senderName}</strong> says they have some items from your wish list:</p>
            <ul style="background: #fdf3ec; border: 1px solid #f0d8c8; padding: 15px 15px 15px 30px; border-radius: 8px; margin: 16px 0;">
              ${itemListHtml}
            </ul>
            ${noteHtml}
            <p>
              <a href="https://theplayaprovides.com/profile/${senderUsername}" style="display: inline-block; padding: 12px 24px; background: #5ECFDF; color: #000; text-decoration: none; border-radius: 8px; font-weight: bold;">
                View ${senderName}'s Profile
              </a>
            </p>
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
