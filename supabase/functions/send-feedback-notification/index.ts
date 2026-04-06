// deno-lint-ignore-file no-unused-vars
import { serve } from "https://deno.land/std@0.168.0/http/server.ts"

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

serve(async (req: Request) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders })
  }

  try {
    const { type, description, email, page_url, user_id } = await req.json()
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
        subject: `[TPP Feedback] ${type}`,
        html: `
          <div style="font-family: sans-serif; color: #333; max-width: 600px;">
            <h1 style="color: #C08261;">New Feedback Submission</h1>
            <p>A user has submitted feedback on The Playa Provides.</p>

            <table style="width: 100%; border-collapse: collapse; margin-top: 16px;">
              <tr style="background: #f9f9f9;">
                <td style="padding: 10px; font-weight: bold; width: 160px;">Type</td>
                <td style="padding: 10px;">${type}</td>
              </tr>
              <tr>
                <td style="padding: 10px; font-weight: bold;">Description</td>
                <td style="padding: 10px;">${description}</td>
              </tr>
              <tr style="background: #f9f9f9;">
                <td style="padding: 10px; font-weight: bold;">Email</td>
                <td style="padding: 10px;">${email || '—'}</td>
              </tr>
              <tr>
                <td style="padding: 10px; font-weight: bold;">Page URL</td>
                <td style="padding: 10px;">${page_url || '—'}</td>
              </tr>
            </table>

            <p style="font-size: 0.8em; color: #999; margin-top: 24px;">
              Submitted via The Playa Provides — user_id: ${user_id || '—'}
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
    const error = err as Error;
    return new Response(
      JSON.stringify({ error: error.message }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 400 }
    )
  }
})
