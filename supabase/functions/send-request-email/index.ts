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
  // 1. Handle CORS preflight
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders })
  }

  try {
    const { ownerId, message, itemName, requesterName, requesterUsername, requesterEmail } = await req.json()

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

    const safeItemName = escapeHtml(itemName || '')
    const safeMessage = escapeHtml(message || '')
    const safeOwnerName = escapeHtml(ownerName)
    const safeRequesterName = escapeHtml(requesterName || 'A community member')

    const fromLine = requesterUsername
      ? `${safeRequesterName} (<a href="https://theplayaprovides.com/profile/${escapeHtml(requesterUsername)}" style="color:#1E8A82; text-decoration:none; font-weight:600;">@${escapeHtml(requesterUsername)}</a>)`
      : safeRequesterName

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
          <div style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Arial, sans-serif; color: #2D241E; max-width: 560px; margin: 0 auto;">
            <div style="background: #1E8A82; padding: 20px 24px;">
              <p style="margin: 0; color: rgba(255,255,255,0.85); font-size: 11px; font-weight: 700; letter-spacing: 0.08em; text-transform: uppercase;">New Borrow Request</p>
              <h1 style="margin: 6px 0 0; color: #fff; font-size: 20px; font-weight: 700;">${safeItemName}</h1>
            </div>
            <div style="padding: 24px; background: #fff; border: 1px solid #eee; border-top: none;">
              <p style="margin: 0 0 16px; font-size: 15px; line-height: 1.5;">Hey ${safeOwnerName}, someone is interested in your <strong>${safeItemName}</strong>.</p>

              <p style="margin: 0 0 6px; font-size: 11px; font-weight: 700; letter-spacing: 0.06em; text-transform: uppercase; color: #999;">From</p>
              <p style="margin: 0 0 20px; font-size: 15px;">${fromLine}</p>

              <p style="margin: 0 0 6px; font-size: 11px; font-weight: 700; letter-spacing: 0.06em; text-transform: uppercase; color: #999;">Message</p>
              <div style="border: 1px solid #e5ddd0; background: #FBF8F2; padding: 16px; margin-bottom: 20px; white-space: pre-wrap; font-size: 13px; line-height: 1.6; color: #4A3828; font-family: 'Courier New', monospace;">${safeMessage}</div>

              ${requesterEmail ? `<p style="margin: 0; font-size: 13px; color: #888;">Reply directly to this email to get in touch.</p>` : ''}
            </div>
            <p style="font-size: 12px; color: #aaa; margin: 16px 4px 0;">
              Sent via <a href="https://theplayaprovides.com" style="color: #1E8A82;">The Playa Provides</a>
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
