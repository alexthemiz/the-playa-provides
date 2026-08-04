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

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders })
  }

  try {
    const { user_id } = await req.json()

    const { data: profile, error } = await supabase
      .from('profiles')
      .select('username, preferred_name, email, contact_email, welcome_email_sent_at')
      .eq('id', user_id)
      .single()

    if (error || !profile) throw new Error(error?.message ?? 'Profile not found')
    if (profile.welcome_email_sent_at) {
      return new Response(JSON.stringify({ ok: true, skipped: 'already sent' }), { headers: corsHeaders, status: 200 })
    }

    const usernameRaw = profile.username
    const displayNameRaw = profile.preferred_name || profile.username
    const contactEmailRaw = profile.contact_email || profile.email

    const username = escapeHtml(usernameRaw)
    const displayName = escapeHtml(displayNameRaw)
    const contactEmail = escapeHtml(contactEmailRaw)

    const profileUrl = `${SITE_URL}/profile/${encodeURIComponent(usernameRaw)}`
    const referralUrl = `${SITE_URL}/signup?ref=${encodeURIComponent(usernameRaw)}`

    const shareSubject = 'Check out The Playa Provides'
    const shareBody = `Hey, thought you'd like this. The Playa Provides is a site for lending, borrowing, and gifting gear in the Burning Man community. Take a look: ${referralUrl}`
    const mailtoShare = `mailto:?subject=${encodeURIComponent(shareSubject)}&body=${encodeURIComponent(shareBody)}`

    const html = `
<div style="font-family:sans-serif;max-width:520px;margin:0 auto;background:#fff;">
  <a href="${SITE_URL}" style="display:block;"><img src="${SITE_URL}/email/welcome-header.png" alt="The Playa Provides" style="display:block;width:100%;height:auto;" /></a>
  <div style="padding:24px;">
    <h1 style="font-size:18px;color:#111;margin:0 0 12px;">Welcome, ${displayName}!</h1>
    <p style="font-size:14px;color:#333;line-height:1.6;margin:0 0 18px;">
      Thanks for joining The Playa Provides, where you can borrow items from others, lend out your stuff,
      and track it all easily in one place. To get the most out of the site:
    </p>

    <table style="border-collapse:collapse;width:100%;font-size:14px;margin:0 0 20px;">
      <tr><td style="padding:4px 8px;color:#555;">&#9744;</td><td style="padding:4px 8px;">Add your <a href="${profileUrl}" style="color:#1C1610;text-decoration:underline;">2026 camp and playa history</a> so campmates can find you</td></tr>
      <tr style="background:#f9f9f9;"><td style="padding:4px 8px;color:#555;">&#9744;</td><td style="padding:4px 8px;">Add an item <a href="${SITE_URL}/add-item" style="color:#1C1610;text-decoration:underline;">to your inventory</a>, then list it or keep it private</td></tr>
      <tr><td style="padding:4px 8px;color:#555;">&#9744;</td><td style="padding:4px 8px;">Add items to <a href="${profileUrl}" style="color:#1C1610;text-decoration:underline;">your wish list</a> so others know what you need</td></tr>
      <tr style="background:#f9f9f9;"><td style="padding:4px 8px;color:#555;">&#9744;</td><td style="padding:4px 8px;">Set an <a href="${SITE_URL}/settings" style="color:#1C1610;text-decoration:underline;">item location</a> (home, storage, etc.)</td></tr>
      <tr><td style="padding:4px 8px;color:#555;">&#9744;</td><td style="padding:4px 8px;">Browse <a href="${SITE_URL}/find-items" style="color:#1C1610;text-decoration:underline;">what's available</a> to borrow or keep</td></tr>
      <tr style="background:#f9f9f9;"><td style="padding:4px 8px;color:#555;">&#9744;</td><td style="padding:4px 8px;"><a href="${mailtoShare}" style="color:#1C1610;text-decoration:underline;">Share the site</a> with your friends and campmates</td></tr>
    </table>

    <table role="presentation" style="border-collapse:collapse;margin:0 0 24px;">
      <tr>
        <td>
          <a href="${profileUrl}" style="display:inline-block;width:210px;box-sizing:border-box;text-align:center;padding:13px 0;background:#1E8A82;color:#fff;text-decoration:none;font-weight:bold;font-size:14px;border:2px solid #1C1610;box-shadow:3px 3px 0 #1C1610;">Fill out your profile &rarr;</a>
        </td>
        <td style="width:12px;"></td>
        <td>
          <a href="${SITE_URL}/add-item" style="display:inline-block;width:210px;box-sizing:border-box;text-align:center;padding:13px 0;background:#D4A020;color:#fff;text-decoration:none;font-weight:bold;font-size:14px;border:2px solid #1C1610;box-shadow:3px 3px 0 #1C1610;">Add to your inventory &rarr;</a>
        </td>
      </tr>
    </table>

    <hr style="border:none;border-top:1px solid #eee;margin:24px 0;" />

    <p style="font-size:13px;color:#4A3828;line-height:1.6;margin:0;">
      Have feedback, find a bug, or just want to say hi? <a href="mailto:alex@theplayaprovides.com" style="color:#1E8A82;">Email Alex</a> or reply here. We'd love to hear from you.
    </p>

    <hr style="border:none;border-top:1px solid #eee;margin:28px 0 18px;" />

    <div style="font-size:11px;color:#888;text-transform:uppercase;letter-spacing:0.05em;margin:0 0 8px;text-align:center;">Your Account Details</div>
    <table style="border-collapse:collapse;font-size:10.5px;line-height:1.5;margin:0 auto 8px;">
      <tr><td style="color:#888;padding:1px 8px 1px 0;white-space:nowrap;">Username</td><td style="font-weight:bold;padding:1px 0;text-align:right;">${username}</td></tr>
      <tr><td style="color:#888;padding:1px 8px 1px 0;white-space:nowrap;">Preferred Name</td><td style="font-weight:bold;padding:1px 0;text-align:right;">${displayName}</td></tr>
      <tr><td style="color:#888;padding:1px 8px 1px 0;white-space:nowrap;">Contact Email</td><td style="font-weight:bold;padding:1px 0;text-align:right;">${contactEmail}</td></tr>
    </table>
    <p style="font-size:11px;color:#888;margin:0;text-align:center;"><a href="${SITE_URL}/settings" style="color:#1E8A82;">Edit in Settings</a></p>
  </div>

  <table role="presentation" width="100%" style="border-collapse:collapse;background:#1C1610;">
    <tr>
      <td>
        <img src="${SITE_URL}/email/welcome-footer.png" alt="The Playa Provides" style="display:block;width:100%;height:auto;" />
      </td>
    </tr>
    <tr>
      <td style="padding:14px 24px 2px;text-align:center;">
        <a href="${SITE_URL}" style="display:inline-flex;align-items:center;color:#9A8878;text-decoration:none;font-size:12px;margin:0 12px;">
          <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="#1E8A82" stroke-width="2" style="vertical-align:-2px;margin-right:5px;"><circle cx="12" cy="12" r="10"/><line x1="2" y1="12" x2="22" y2="12"/><path d="M12 2a15.3 15.3 0 0 1 4 10 15.3 15.3 0 0 1-4 10 15.3 15.3 0 0 1-4-10 15.3 15.3 0 0 1 4-10z"/></svg>
          theplayaprovides.com
        </a>
        <a href="https://www.instagram.com/theplayaprovides_/" style="display:inline-flex;align-items:center;color:#9A8878;text-decoration:none;font-size:12px;margin:0 12px;">
          <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="#1E8A82" stroke-width="2" style="vertical-align:-2px;margin-right:5px;"><rect x="2" y="2" width="20" height="20" rx="5"/><circle cx="12" cy="12" r="4"/><circle cx="17.5" cy="6.5" r="1" fill="#1E8A82" stroke="none"/></svg>
          @theplayaprovides_
        </a>
      </td>
    </tr>
    <tr>
      <td style="padding:8px 24px 12px;text-align:center;">
        <a href="${SITE_URL}/about" style="color:#9A8878;text-decoration:none;font-size:11px;margin:0 10px;">About</a>
        <a href="${SITE_URL}/terms" style="color:#9A8878;text-decoration:none;font-size:11px;margin:0 10px;">Terms</a>
        <a href="${SITE_URL}/privacy" style="color:#9A8878;text-decoration:none;font-size:11px;margin:0 10px;">Privacy</a>
      </td>
    </tr>
    <tr>
      <td style="padding:10px 32px 0;text-align:center;border-top:1px solid rgba(154,136,120,0.2);">
        <p style="font-size:10.5px;color:#665c50;line-height:1.5;margin:10px 0 6px;">
          You're getting this one-time email because an account was just created at The Playa Provides with this address.
          There's nothing to unsubscribe from &mdash; we don't send marketing email, and you won't get another one of these.
          Didn't create this account? You can safely ignore it.
        </p>
      </td>
    </tr>
    <tr>
      <td style="padding:0 32px 14px;text-align:center;">
        <p style="font-size:10px;color:#4a4038;line-height:1.4;margin:0;">
          Not affiliated with or endorsed by Burning Man Project.
        </p>
      </td>
    </tr>
  </table>
</div>`

    const res = await fetch('https://api.resend.com/emails', {
      method: 'POST',
      headers: { 'Authorization': `Bearer ${RESEND_API_KEY}`, 'Content-Type': 'application/json' },
      body: JSON.stringify({
        from: 'The Playa Provides <hello@theplayaprovides.com>',
        to: contactEmailRaw,
        reply_to: 'alex@theplayaprovides.com',
        subject: 'Welcome to The Playa Provides!',
        html,
      }),
    })

    if (!res.ok) throw new Error(`Resend error: ${await res.text()}`)

    await supabase
      .from('profiles')
      .update({ welcome_email_sent_at: new Date().toISOString() })
      .eq('id', user_id)

    return new Response(JSON.stringify({ ok: true }), { headers: corsHeaders, status: 200 })
  } catch (err) {
    console.error(err)
    return new Response(JSON.stringify({ error: String(err) }), { headers: corsHeaders, status: 500 })
  }
})
