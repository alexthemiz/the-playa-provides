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
    const formData = await req.json()
    const RESEND_API_KEY = Deno.env.get('RESEND_API_KEY')

    const res = await fetch('https://api.resend.com/emails', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${RESEND_API_KEY}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        from: 'The Playa Provides <hello@theplayaprovides.com>',
        to: ['contact@theplayaprovides.com'],
        subject: `New Camp Submission: ${formData.camp_name}`,
        html: `
          <div style="font-family: sans-serif; color: #333; max-width: 600px;">
            <h1 style="color: #C08261;">New Camp Submission</h1>
            <p>A new camp has been submitted for review on The Playa Provides.</p>

            <table style="width: 100%; border-collapse: collapse; margin-top: 16px;">
              <tr style="background: #f9f9f9;">
                <td style="padding: 10px; font-weight: bold; width: 160px;">Camp Name</td>
                <td style="padding: 10px;">${formData.camp_name}</td>
              </tr>
              <tr>
                <td style="padding: 10px; font-weight: bold;">Category</td>
                <td style="padding: 10px;">${formData.offering_category}</td>
              </tr>
              <tr style="background: #f9f9f9;">
                <td style="padding: 10px; font-weight: bold;">Description</td>
                <td style="padding: 10px;">${formData.description}</td>
              </tr>
              <tr>
                <td style="padding: 10px; font-weight: bold;">Homebase</td>
                <td style="padding: 10px;">${[formData.homebase_city, formData.homebase_state, formData.homebase_zip].filter(Boolean).join(', ') || '—'}</td>
              </tr>
              <tr style="background: #f9f9f9;">
                <td style="padding: 10px; font-weight: bold;">Website</td>
                <td style="padding: 10px;">${formData.website || '—'}</td>
              </tr>
              <tr>
                <td style="padding: 10px; font-weight: bold;">Contact Email</td>
                <td style="padding: 10px;">${formData.public_email || '—'}</td>
              </tr>
              <tr style="background: #f9f9f9;">
                <td style="padding: 10px; font-weight: bold;">About the Camp</td>
                <td style="padding: 10px;">${formData.about_camp || '—'}</td>
              </tr>
              <tr>
                <td style="padding: 10px; font-weight: bold;">Accepting Campers?</td>
                <td style="padding: 10px;">${formData.accepting_campers ? 'Yes' : 'No'}</td>
              </tr>
            </table>

            <p style="font-size: 0.8em; color: #999; margin-top: 24px;">
              Submitted via The Playa Provides — review and verify in Supabase.
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
