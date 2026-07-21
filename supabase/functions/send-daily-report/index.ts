import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

const RESEND_API_KEY = Deno.env.get('RESEND_API_KEY')!
const SUPABASE_URL = Deno.env.get('SUPABASE_URL')!
const SUPABASE_SERVICE_ROLE_KEY = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!

const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY)

Deno.serve(async (req) => {
  try {
    const now = new Date()
    const isMonday = now.getUTCDay() === 1 // pg_cron fires at 13:00 UTC = 8am ET (EST) / 9am EDT; day check is UTC

    // Helper: get stats for a time window
    async function getStats(since: Date) {
      const iso = since.toISOString()

      const [
        newSignups,
        { count: newItems },
        itemsByVisibility,
        { count: loansCreated },
        { count: loansActive },
        { count: loansReturned },
        { count: transfersCompleted },
        { count: newFollows },
        { count: feedbackSubmitted },
        { count: campClaims },
        recentLogins,
      ] = await Promise.all([
        // New signups, via auth.users.created_at (profiles has no created_at of its own)
        supabase.rpc('get_recent_signup_count', { since_time: iso }),
        // New items posted
        supabase.from('gear_items').select('*', { count: 'exact', head: true }).gte('created_at', iso).eq('owner_deleted', false),
        // Items by visibility (all-time snapshot for context)
        supabase.from('gear_items').select('visibility').eq('owner_deleted', false),
        // Loans created
        supabase.from('item_loans').select('*', { count: 'exact', head: true }).gte('created_at', iso),
        // Active loans
        supabase.from('item_loans').select('*', { count: 'exact', head: true }).eq('status', 'active'),
        // Loans returned (owner_confirmed_return = true, updated in window)
        supabase.from('item_loans').select('*', { count: 'exact', head: true }).eq('owner_confirmed_return', true).gte('updated_at', iso),
        // Transfers completed
        supabase.from('item_transfers').select('*', { count: 'exact', head: true }).not('completed_at', 'is', null).gte('completed_at', iso),
        // New follows
        supabase.from('user_follows').select('*', { count: 'exact', head: true }).gte('created_at', iso),
        // Feedback submissions
        supabase.from('feedback').select('*', { count: 'exact', head: true }).gte('created_at', iso),
        // Camp claim requests
        supabase.from('camp_claim_requests').select('*', { count: 'exact', head: true }).gte('created_at', iso),
        // Recent logins via auth.users
        supabase.rpc('get_recent_login_count', { since_time: iso }),
      ])

      // Tally visibility breakdown
      const visibilityMap: Record<string, number> = {}
      if (itemsByVisibility.data) {
        for (const row of itemsByVisibility.data) {
          visibilityMap[row.visibility] = (visibilityMap[row.visibility] || 0) + 1
        }
      }

      return {
        newUsers: newSignups.data ?? 0,
        newItems: newItems ?? 0,
        visibilityMap,
        loansCreated: loansCreated ?? 0,
        loansActive: loansActive ?? 0,
        loansReturned: loansReturned ?? 0,
        transfersCompleted: transfersCompleted ?? 0,
        newFollows: newFollows ?? 0,
        feedbackSubmitted: feedbackSubmitted ?? 0,
        campClaims: campClaims ?? 0,
        recentLogins: recentLogins.data ?? 0,
      }
    }

    function formatStats(stats: ReturnType<typeof getStats> extends Promise<infer T> ? T : never, label: string) {
      const vis = stats.visibilityMap
      return `
<h2 style="color:#111;border-bottom:1px solid #ddd;padding-bottom:6px;">${label}</h2>
<table style="border-collapse:collapse;width:100%;font-family:sans-serif;font-size:14px;">
  <tr><td style="padding:4px 8px;color:#555;">New signups</td><td style="padding:4px 8px;font-weight:bold;">${stats.newUsers}</td></tr>
  <tr style="background:#f9f9f9;"><td style="padding:4px 8px;color:#555;">Logins</td><td style="padding:4px 8px;font-weight:bold;">${stats.recentLogins}</td></tr>
  <tr><td style="padding:4px 8px;color:#555;">Items posted</td><td style="padding:4px 8px;font-weight:bold;">${stats.newItems}</td></tr>
  <tr style="background:#f9f9f9;"><td style="padding:4px 8px;color:#555;">Loans initiated</td><td style="padding:4px 8px;font-weight:bold;">${stats.loansCreated}</td></tr>
  <tr><td style="padding:4px 8px;color:#555;">Loans returned</td><td style="padding:4px 8px;font-weight:bold;">${stats.loansReturned}</td></tr>
  <tr style="background:#f9f9f9;"><td style="padding:4px 8px;color:#555;">Transfers completed</td><td style="padding:4px 8px;font-weight:bold;">${stats.transfersCompleted}</td></tr>
  <tr><td style="padding:4px 8px;color:#555;">New follows</td><td style="padding:4px 8px;font-weight:bold;">${stats.newFollows}</td></tr>
  <tr style="background:#f9f9f9;"><td style="padding:4px 8px;color:#555;">Feedback submitted</td><td style="padding:4px 8px;font-weight:bold;">${stats.feedbackSubmitted}</td></tr>
  <tr><td style="padding:4px 8px;color:#555;">Camp claim requests</td><td style="padding:4px 8px;font-weight:bold;">${stats.campClaims}</td></tr>
</table>
<p style="font-size:12px;color:#888;margin-top:8px;">
  Currently active loans: ${stats.loansActive} &nbsp;|&nbsp;
  Item visibility snapshot — public: ${vis['public'] ?? 0}, followers: ${vis['followers'] ?? 0}, campmates: ${vis['campmates'] ?? 0}, private: ${vis['private'] ?? 0}
</p>`
    }

    const oneDayAgo = new Date(now.getTime() - 24 * 60 * 60 * 1000)
    const sevenDaysAgo = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000)

    const dailyStats = await getStats(oneDayAgo)
    const weeklyStats = isMonday ? await getStats(sevenDaysAgo) : null

    const dateLabel = now.toLocaleDateString('en-US', { weekday: 'long', month: 'long', day: 'numeric', year: 'numeric', timeZone: 'America/New_York' })
    const subject = isMonday
      ? `TPP Weekly + Daily Report — ${dateLabel}`
      : `TPP Daily Report — ${dateLabel}`

    const html = `
<div style="font-family:sans-serif;max-width:600px;margin:0 auto;padding:20px;">
  <h1 style="font-size:18px;color:#111;">The Playa Provides — Admin Report</h1>
  <p style="color:#555;font-size:13px;">${dateLabel}</p>
  ${formatStats(dailyStats, 'Yesterday')}
  ${weeklyStats ? formatStats(weeklyStats, 'Last 7 Days') : ''}
  <p style="font-size:11px;color:#aaa;margin-top:24px;">Sent automatically by TPP. <a href="https://supabase.com/dashboard/project/bklycpitofjrjhizttny" style="color:#aaa;">Supabase dashboard</a></p>
</div>`

    const res = await fetch('https://api.resend.com/emails', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${RESEND_API_KEY}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        from: 'hello@theplayaprovides.com',
        to: 'alex@theplayaprovides.com',
        subject,
        html,
      }),
    })

    if (!res.ok) {
      const err = await res.text()
      throw new Error(`Resend error: ${err}`)
    }

    return new Response(JSON.stringify({ ok: true }), { status: 200 })
  } catch (err) {
    console.error(err)
    return new Response(JSON.stringify({ error: String(err) }), { status: 500 })
  }
})
