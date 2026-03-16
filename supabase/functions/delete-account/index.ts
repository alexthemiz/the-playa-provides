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
    const SUPABASE_URL = Deno.env.get('SUPABASE_URL')!
    const SUPABASE_SERVICE_ROLE_KEY = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!

    const adminClient = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY, {
      auth: { autoRefreshToken: false, persistSession: false }
    })

    // 1. Verify JWT from Authorization header to get user_id
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

    // 2. Parse body and verify user_id matches JWT
    const { user_id } = await req.json()
    if (callerUser.id !== user_id) {
      return new Response(JSON.stringify({ error: 'Unauthorized: user_id mismatch' }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 403,
      })
    }

    // 3. Delete auth user first — if this fails, abort entirely
    const { error: deleteAuthError } = await adminClient.auth.admin.deleteUser(user_id)
    if (deleteAuthError) {
      console.error('deleteUser failed:', deleteAuthError.message)
      return new Response(JSON.stringify({ error: 'Failed to delete auth account: ' + deleteAuthError.message }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 500,
      })
    }

    // Auth account is gone. Continue cleaning up data.
    // Errors from here are logged but don't stop the process.
    const errors: string[] = []

    // 4. Scrub personal data from profiles and set deleted_at
    const { error: profileErr } = await adminClient
      .from('profiles')
      .update({
        full_name: null,
        preferred_name: null,
        username: null,
        email: null,
        avatar_url: null,
        bio: null,
        phone_number: null,
        contact_email: null,
        city: null,
        state: null,
        zip_code: null,
        social_links: null,
        pronouns: null,
        playa_story: null,
        wish_list: null,
        burning_man_years: null,
        burning_man_camp: null,
        deleted_at: new Date().toISOString(),
      })
      .eq('id', user_id)
    if (profileErr) errors.push('profiles scrub: ' + profileErr.message)

    // 5. Mark gear items as owner_deleted and private
    const { error: gearErr } = await adminClient
      .from('gear_items')
      .update({ owner_deleted: true, visibility: 'private' })
      .eq('user_id', user_id)
    if (gearErr) errors.push('gear_items: ' + gearErr.message)

    // 6. Delete locations
    const { error: locErr } = await adminClient
      .from('locations')
      .delete()
      .eq('user_id', user_id)
    if (locErr) errors.push('locations: ' + locErr.message)

    // 7. Delete camp affiliations
    const { error: campAffErr } = await adminClient
      .from('user_camp_affiliations')
      .delete()
      .eq('user_id', user_id)
    if (campAffErr) errors.push('user_camp_affiliations: ' + campAffErr.message)

    // 8. Delete follows (both directions)
    const { error: followsErr1 } = await adminClient
      .from('user_follows')
      .delete()
      .eq('follower_id', user_id)
    if (followsErr1) errors.push('user_follows (follower): ' + followsErr1.message)

    const { error: followsErr2 } = await adminClient
      .from('user_follows')
      .delete()
      .eq('following_id', user_id)
    if (followsErr2) errors.push('user_follows (following): ' + followsErr2.message)

    // 9. Delete notifications (both directions)
    const { error: notifErr1 } = await adminClient
      .from('notifications')
      .delete()
      .eq('recipient_id', user_id)
    if (notifErr1) errors.push('notifications (recipient): ' + notifErr1.message)

    const { error: notifErr2 } = await adminClient
      .from('notifications')
      .delete()
      .eq('actor_id', user_id)
    if (notifErr2) errors.push('notifications (actor): ' + notifErr2.message)

    // 10. Delete item loans (both directions)
    const { error: loanErr1 } = await adminClient
      .from('item_loans')
      .delete()
      .eq('owner_id', user_id)
    if (loanErr1) errors.push('item_loans (owner): ' + loanErr1.message)

    const { error: loanErr2 } = await adminClient
      .from('item_loans')
      .delete()
      .eq('borrower_id', user_id)
    if (loanErr2) errors.push('item_loans (borrower): ' + loanErr2.message)

    // 11. Delete item transfers (both directions)
    const { error: transferErr1 } = await adminClient
      .from('item_transfers')
      .delete()
      .eq('owner_id', user_id)
    if (transferErr1) errors.push('item_transfers (owner): ' + transferErr1.message)

    const { error: transferErr2 } = await adminClient
      .from('item_transfers')
      .delete()
      .eq('recipient_id', user_id)
    if (transferErr2) errors.push('item_transfers (recipient): ' + transferErr2.message)

    // 12. Unclaim camps owned by this user
    const { error: campsErr } = await adminClient
      .from('camps')
      .update({ page_owner_id: null, is_claimed: false })
      .eq('page_owner_id', user_id)
    if (campsErr) errors.push('camps: ' + campsErr.message)

    // 13. Nullify submitted_by on playa_resources
    const { error: resourcesErr } = await adminClient
      .from('playa_resources')
      .update({ submitted_by: null })
      .eq('submitted_by', user_id)
    if (resourcesErr) errors.push('playa_resources: ' + resourcesErr.message)

    if (errors.length > 0) {
      console.error('Data cleanup errors after auth deletion:', errors)
    }

    return new Response(
      JSON.stringify({ success: true, cleanup_errors: errors }),
      {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 200,
      }
    )

  } catch (err: unknown) {
    const error = err as Error
    return new Response(
      JSON.stringify({ error: error.message }),
      {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 400,
      }
    )
  }
})
