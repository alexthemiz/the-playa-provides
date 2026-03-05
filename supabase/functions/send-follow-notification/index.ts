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
    const { item_id, poster_id } = await req.json()

    const RESEND_API_KEY = Deno.env.get('RESEND_API_KEY')
    const SUPABASE_URL = Deno.env.get('SUPABASE_URL')!
    const SUPABASE_SERVICE_ROLE_KEY = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!
    const admin = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY)

    // Fetch the item and poster
    const { data: item, error: itemErr } = await admin
      .from('gear_items')
      .select('item_name, user_id, profiles!gear_items_user_id_fkey(username, preferred_name)')
      .eq('id', item_id)
      .single()

    if (itemErr || !item) throw new Error('Item not found')

    const poster = (item as any).profiles
    const posterName = poster?.preferred_name || poster?.username || 'Someone'
    const itemName = item.item_name || 'a new item'

    // Fetch followers who have email opt-in enabled
    const { data: followers, error: followErr } = await admin
      .from('user_follows')
      .select('follower_id, profiles!user_follows_follower_id_fkey(contact_email, notify_new_items_email)')
      .eq('following_id', poster_id)

    if (followErr) throw new Error('Could not fetch followers')

    const emailPromises = (followers || [])
      .filter((f: any) => f.profiles?.notify_new_items_email)
      .map(async (f: any) => {
        let email = f.profiles?.contact_email
        if (!email) {
          const { data: { user } } = await admin.auth.admin.getUserById(f.follower_id)
          email = user?.email
        }
        if (!email) return

        return fetch('https://api.resend.com/emails', {
          method: 'POST',
          headers: {
            'Authorization': `Bearer ${RESEND_API_KEY}`,
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            from: 'The Playa Provides <hello@theplayaprovides.com>',
            to: [email],
            subject: `${posterName} just listed: ${itemName}`,
            html: `
              <div style="font-family: sans-serif; color: #333; max-width: 600px;">
                <h1 style="color: #C08261;">New Item From Someone You Follow</h1>
                <p><strong>${posterName}</strong> just listed <strong>${itemName}</strong> on The Playa Provides.</p>
                <p><a href="https://theplayaprovides.com/find-items" style="color: #C08261;">Browse items →</a></p>
                <p style="font-size: 0.8em; color: #999; margin-top: 24px;">
                  You're receiving this because you follow ${posterName} and have email notifications enabled.<br/>
                  <a href="https://theplayaprovides.com/settings" style="color: #C08261;">Update your notification settings</a>
                </p>
              </div>
            `,
          }),
        })
      })

    await Promise.allSettled(emailPromises)

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
