// deno-lint-ignore-file no-unused-vars
import { serve } from "https://deno.land/std@0.168.0/http/server.ts"
import { createClient } from "https://esm.sh/@supabase/supabase-js@2"

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

class HttpError extends Error {
  status: number

  constructor(status: number, message: string) {
    super(message)
    this.status = status
  }
}

serve(async (req: Request) => {
  // 1. Handle CORS preflight
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders })
  }

  try {
    const {
      itemId,
      ownerId,
      message,
      requesterName,
      requesterEmail,
      desiredPickupDate,
    } = await req.json()

    const RESEND_API_KEY = Deno.env.get('RESEND_API_KEY')
    const SUPABASE_URL = Deno.env.get('SUPABASE_URL')!
    const SUPABASE_ANON_KEY = Deno.env.get('SUPABASE_ANON_KEY')!
    const SUPABASE_SERVICE_ROLE_KEY = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!
    const authHeader = req.headers.get('Authorization')

    if (!authHeader) {
      throw new HttpError(401, 'You must be logged in to send a request')
    }

    if (!itemId) {
      throw new HttpError(400, 'Missing itemId')
    }

    if (!message?.trim()) {
      throw new HttpError(400, 'Missing request message')
    }

    const adminClient = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY)
    const authClient = createClient(SUPABASE_URL, SUPABASE_ANON_KEY, {
      global: { headers: { Authorization: authHeader } },
    })

    const {
      data: { user: requesterUser },
      error: requesterUserError,
    } = await authClient.auth.getUser()

    if (requesterUserError || !requesterUser) {
      throw new HttpError(401, 'You must be logged in to send a request')
    }

    const { data: item, error: itemError } = await adminClient
      .from('gear_items')
      .select('id, user_id, item_name, availability_status')
      .eq('id', itemId)
      .single()

    if (itemError || !item) {
      throw new HttpError(404, 'Item not found')
    }

    if (ownerId && ownerId !== item.user_id) {
      throw new HttpError(400, 'Item owner mismatch')
    }

    if (item.user_id === requesterUser.id) {
      throw new HttpError(400, 'You cannot request your own item')
    }

    if (item.availability_status === 'Not Available') {
      throw new HttpError(409, 'This item is no longer available')
    }

    const { data: requesterProfile } = await adminClient
      .from('profiles')
      .select('preferred_name, contact_email')
      .eq('id', requesterUser.id)
      .maybeSingle()

    const { data: ownerProfile } = await adminClient
      .from('profiles')
      .select('contact_email, preferred_name')
      .eq('id', item.user_id)
      .single()

    let ownerEmail = ownerProfile?.contact_email
    const ownerName = ownerProfile?.preferred_name || 'there'
    const resolvedRequesterName = requesterName?.trim()
      || requesterProfile?.preferred_name
      || requesterUser.user_metadata?.preferred_name
      || requesterUser.user_metadata?.full_name
      || 'A community member'
    const resolvedRequesterEmail = requesterEmail?.trim()
      || requesterProfile?.contact_email
      || requesterUser.email
      || ''
    const requestKind = item.availability_status === 'Available to Keep' ? 'keep' : 'borrow'

    if (!ownerEmail) {
      const { data: { user: ownerUser } } = await adminClient.auth.admin.getUserById(item.user_id)
      ownerEmail = ownerUser?.email
    }

    if (!ownerEmail) {
      throw new HttpError(400, 'Could not find owner email')
    }

    const { data: createdRequest, error: requestInsertError } = await adminClient
      .from('item_requests')
      .insert([{
        item_id: item.id,
        owner_id: item.user_id,
        requester_id: requesterUser.id,
        request_kind: requestKind,
        message: message.trim(),
        requester_name: resolvedRequesterName,
        requester_email: resolvedRequesterEmail || null,
        desired_pickup_date: desiredPickupDate || null,
      }])
      .select('id')
      .single()

    if (requestInsertError) {
      if (requestInsertError.code === '23505') {
        throw new HttpError(409, 'This item already has a pending request')
      }
      throw requestInsertError
    }

    const { error: availabilityError } = await adminClient
      .from('gear_items')
      .update({ availability_status: 'Not Available' })
      .eq('id', item.id)
      .eq('user_id', item.user_id)

    if (availabilityError) {
      await adminClient
        .from('item_requests')
        .delete()
        .eq('id', createdRequest.id)
      throw availabilityError
    }

    const pickupHtml = desiredPickupDate
      ? `
            <div style="background: #eef7ff; border: 1px solid #cfe8ff; padding: 15px; border-radius: 8px; margin: 16px 0;">
              <p style="margin: 0; font-size: 0.9em; color: #4b5563;"><strong>Desired pickup date:</strong> ${new Date(`${desiredPickupDate}T12:00:00`).toLocaleDateString()}</p>
            </div>
        `
      : ''

    const res = await fetch('https://api.resend.com/emails', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${RESEND_API_KEY}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        from: 'The Playa Provides <hello@theplayaprovides.com>',
        to: [ownerEmail],
        subject: `New Request for: ${item.item_name}`,
        html: `
          <div style="font-family: sans-serif; color: #333; max-width: 600px;">
            <h1 style="color: #C08261;">New Borrow Request!</h1>
            <p>Hey ${ownerName}, someone is interested in your <strong>${item.item_name}</strong>.</p>
            ${pickupHtml}
            <div style="background: #f3f4f6; padding: 15px; border-radius: 8px; margin: 16px 0;">
              <p style="margin: 0;"><strong>Message:</strong></p>
              <p style="margin: 8px 0 0; font-style: italic;">"${message.trim()}"</p>
            </div>
            <div style="background: #fdf3ec; border: 1px solid #f0d8c8; padding: 15px; border-radius: 8px; margin: 16px 0;">
              <p style="margin: 0; font-size: 0.9em; color: #666;"><strong>From:</strong> ${resolvedRequesterName}${resolvedRequesterEmail ? ` &lt;${resolvedRequesterEmail}&gt;` : ''}</p>
              ${resolvedRequesterEmail ? `<p style="margin: 8px 0 0; font-size: 0.9em; color: #666;">Reply directly to this email to get in touch.</p>` : ''}
            </div>
            <p style="font-size: 0.8em; color: #999; margin-top: 24px;">
              Sent via <a href="https://theplayaprovides.com" style="color: #C08261;">The Playa Provides</a>
            </p>
          </div>
        `,
        reply_to: resolvedRequesterEmail || undefined,
      }),
    })

    const data = await res.json()

    return new Response(
      JSON.stringify({
        ...data,
        request: createdRequest,
      }),
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
        status: err instanceof HttpError ? err.status : 400
      }
    )
  }
})
