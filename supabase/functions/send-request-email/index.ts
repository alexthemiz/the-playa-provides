// deno-lint-ignore-file no-unused-vars
import { serve } from "https://deno.land/std@0.168.0/http/server.ts"

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
    const { _itemId, _ownerId, message, itemName } = await req.json()
    const RESEND_API_KEY = Deno.env.get('RESEND_API_KEY')
    
    const res = await fetch('https://api.resend.com/emails', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${RESEND_API_KEY}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        from: 'The Playa Provides <hello@theplayaprovides.com>',
        to: ['alex@theplayaprovides.com'], 
        subject: `New Request for: ${itemName}`,
        html: `
          <div style="font-family: sans-serif; color: #333;">
            <h1 style="color: #d97706;">New Borrow Request!</h1>
            <p>Someone is interested in your <strong>${itemName}</strong>.</p>
            <div style="background: #f3f4f6; padding: 15px; border-radius: 8px;">
              <p><strong>Message:</strong> ${message}</p>
            </div>
            <p style="font-size: 0.8em; color: #666; margin-top: 20px;">
              Sent via The Playa Provides
            </p>
          </div>
        `,
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