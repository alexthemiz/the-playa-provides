import { serve } from "https://deno.land/std@0.168.0/http/server.ts"
import { createClient } from "https://esm.sh/@supabase/supabase-js@2"

const RESEND_API_KEY = Deno.env.get('RESEND_API_KEY')

serve(async (req) => {
  const { itemId, ownerId, message, itemName } = await req.json()

  // 1. Initialize Supabase Admin
  const supabaseAdmin = createClient(
    Deno.env.get('SUPABASE_URL') ?? '',
    Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
  )

  // 2. Fetch the owner's profile and their Auth email
  const { data: profile } = await supabaseAdmin
    .from('profiles')
    .select('contact_email, preferred_name')
    .eq('id', ownerId)
    .single()

  const { data: authUser } = await supabaseAdmin.auth.admin.getUserById(ownerId)
  
  // 3. Logic: Use contact_email if it exists, otherwise use account email
  const targetEmail = profile?.contact_email || authUser.user?.email

  // 4. Send the email (Example using Resend API)
  const res = await fetch('https://api.resend.com/emails', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${RESEND_API_KEY}`,
    },
    body: JSON.stringify({
      from: 'Playa Provides <gear@yourdomain.com>',
      to: [targetEmail],
      subject: `Gear Request: ${itemName}`,
      html: `
        <h2>Hi ${profile?.preferred_name},</h2>
        <p>Someone is interested in your <strong>${itemName}</strong>!</p>
        <p style="padding: 15px; background: #f4f4f4; border-radius: 5px;">
          "${message}"
        </p>
        <p>Reply to this email to coordinate the handoff.</p>
      `,
    }),
  })

  return new Response(JSON.stringify({ sent: true }), { headers: { 'Content-Type': 'application/json' } })
})