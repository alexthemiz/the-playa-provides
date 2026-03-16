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
    const { camp_id, user_id, role, years } = await req.json()

    const RESEND_API_KEY = Deno.env.get('RESEND_API_KEY')
    const SUPABASE_URL = Deno.env.get('SUPABASE_URL')!
    const SUPABASE_SERVICE_ROLE_KEY = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!
    const admin = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY)

    // Fetch the camp
    const { data: camp, error: campErr } = await admin
      .from('camps')
      .select('display_name, slug')
      .eq('id', camp_id)
      .single()

    if (campErr || !camp) throw new Error('Camp not found')

    // Fetch the claimant's profile
    const { data: profile, error: profileErr } = await admin
      .from('profiles')
      .select('username, preferred_name, contact_email')
      .eq('id', user_id)
      .single()

    if (profileErr || !profile) throw new Error('Profile not found')

    const claimantName = (profile as any).preferred_name || (profile as any).username || 'Someone'
    const campName = (camp as any).display_name
    const campSlug = (camp as any).slug

    // Get claimant's auth email as fallback
    let claimantEmail = (profile as any).contact_email
    if (!claimantEmail) {
      const { data: { user } } = await admin.auth.admin.getUserById(user_id)
      claimantEmail = user?.email
    }

    // Send notification email to support
    await fetch('https://api.resend.com/emails', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${RESEND_API_KEY}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        from: 'The Playa Provides <hello@theplayaprovides.com>',
        to: ['support@theplayaprovides.com'],
        subject: `Camp claim request: ${campName}`,
        html: `
          <div style="font-family: sans-serif; color: #333; max-width: 600px;">
            <h1 style="color: #C08261;">New Camp Claim Request</h1>
            <p><strong>${claimantName}</strong> (${claimantEmail || 'no email'}) has requested to claim <strong>${campName}</strong>.</p>
            ${role ? `<p><strong>Role:</strong> ${role}</p>` : ''}
            ${years ? `<p><strong>Years attended:</strong> ${years}</p>` : ''}
            <p>
              <a href="https://supabase.com/dashboard/project/bklycpitofjrjhizttny/editor" style="color: #C08261;">
                Review in Supabase dashboard →
              </a>
            </p>
            <p style="font-size: 0.8em; color: #999;">
              To approve: UPDATE camp_claim_requests SET status = 'approved' WHERE camp_id = '${camp_id}' AND user_id = '${user_id}';<br/>
              To deny: UPDATE camp_claim_requests SET status = 'denied' WHERE camp_id = '${camp_id}' AND user_id = '${user_id}';
            </p>
          </div>
        `,
      }),
    })

    return new Response(JSON.stringify({ ok: true }), {
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
