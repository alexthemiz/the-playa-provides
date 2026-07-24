'use client'

import { useEffect, useState } from 'react'
import { supabase } from '@/lib/supabaseClient'

const INK      = '#1C1610'
const INK_MID  = '#4A3828'
const INK_LITE = '#9A8878'
const PAPER    = '#F6F1E8'
const PAPER_LT = '#FDFAF4'
const TEAL     = '#1E8A82'

// `date` columns come back as 'YYYY-MM-DD' — parsing that directly with
// `new Date(...)` treats it as UTC midnight, which renders a day early in
// any timezone behind UTC. Anchoring to local noon avoids the shift.
function formatDate(d: string) {
  return new Date(d + 'T12:00:00').toLocaleDateString()
}

interface Preview {
  item_name: string
  item_image_url: string | null
  owner_display_name: string
  handed_over_at: string
  return_by: string | null
  damage_agreement: number | null
  loss_agreement: number | null
  status: string
}

export default function ClientPage({ token }: { token: string }) {
  const [preview, setPreview] = useState<Preview | null>(null)
  const [loading, setLoading] = useState(true)
  const [session, setSession] = useState<any>(null)
  const [claiming, setClaiming] = useState(false)
  const [claimError, setClaimError] = useState('')
  const [claimed, setClaimed] = useState(false)

  useEffect(() => {
    supabase.rpc('get_informal_loan_preview', { p_token: token }).then(({ data, error }) => {
      if (!error && data && data.length > 0) setPreview(data[0])
      setLoading(false)
    })
    supabase.auth.getSession().then(({ data: { session } }) => setSession(session))
  }, [token])

  async function handleClaim() {
    setClaiming(true)
    setClaimError('')
    const { error } = await supabase.rpc('claim_informal_loan', { p_token: token })
    if (error) {
      setClaimError(error.message)
      setClaiming(false)
    } else {
      setClaimed(true)
    }
  }

  if (loading) {
    return <div style={pageStyle}><div style={cardStyle}><p style={{ color: INK_MID }}>Loading…</p></div></div>
  }

  if (!preview) {
    return (
      <div style={pageStyle}>
        <div style={cardStyle}>
          <h1 style={h1Style}>Not found</h1>
          <p style={{ color: INK_MID }}>This loan invite wasn&apos;t found.</p>
        </div>
      </div>
    )
  }

  if (claimed) {
    return (
      <div style={pageStyle}>
        <div style={cardStyle}>
          <h1 style={h1Style}>You&apos;re all <em style={{ fontStyle: 'italic', color: TEAL }}>set!</em></h1>
          <p style={{ color: INK_MID, marginBottom: '20px' }}>This loan is now linked to your account.</p>
          <a href="/inventory" style={primaryBtnStyle}>Go to your inventory →</a>
        </div>
      </div>
    )
  }

  if (preview.status !== 'active') {
    return (
      <div style={pageStyle}>
        <div style={cardStyle}>
          <h1 style={h1Style}>No longer available</h1>
          <p style={{ color: INK_MID }}>This loan invite is no longer available (it&apos;s already {preview.status}).</p>
        </div>
      </div>
    )
  }

  return (
    <div style={pageStyle}>
      <div style={cardStyle}>
        <div style={eyebrowStyle}>You&apos;ve been lent something</div>
        <h1 style={h1Style}>{preview.owner_display_name} lent you <em style={{ fontStyle: 'italic', color: TEAL }}>{preview.item_name}</em></h1>

        {preview.item_image_url && (
          <img src={preview.item_image_url} alt={preview.item_name} style={{ width: '100%', maxHeight: '220px', objectFit: 'cover' as const, border: `2px solid ${INK}`, marginBottom: '16px' }} />
        )}

        <table style={{ width: '100%', borderCollapse: 'collapse' as const, fontSize: '0.9rem', marginBottom: '20px' }}>
          <tbody>
            <tr><td style={termLabelStyle}>Handed over</td><td style={termValueStyle}>{formatDate(preview.handed_over_at)}</td></tr>
            {preview.return_by && <tr><td style={termLabelStyle}>Expected back</td><td style={termValueStyle}>{formatDate(preview.return_by)}</td></tr>}
            {preview.damage_agreement != null && <tr><td style={termLabelStyle}>If damaged</td><td style={termValueStyle}>${preview.damage_agreement}</td></tr>}
            {preview.loss_agreement != null && <tr><td style={termLabelStyle}>If not returned</td><td style={termValueStyle}>${preview.loss_agreement}</td></tr>}
          </tbody>
        </table>

        {session ? (
          <>
            <p style={{ color: INK_MID, fontSize: '0.9rem', marginBottom: '14px' }}>Is this you? Claim this loan to link it to your account.</p>
            <button
              onClick={handleClaim}
              disabled={claiming}
              style={{ ...primaryBtnStyle, width: '100%', border: `2px solid ${INK}`, cursor: claiming ? 'not-allowed' : 'pointer', opacity: claiming ? 0.6 : 1, fontFamily: 'inherit' }}
            >
              {claiming ? 'Claiming…' : 'Claim this loan'}
            </button>
            {claimError && <p style={{ color: '#dc2626', fontSize: '0.85rem', marginTop: '10px' }}>{claimError}</p>}
          </>
        ) : (
          <>
            <p style={{ color: INK_MID, fontSize: '0.9rem', marginBottom: '14px' }}>Log in or create an account, then come back to this page (or click the link in your email again) to claim this loan.</p>
            <div style={{ display: 'flex', gap: '10px' }}>
              <a href="/login" style={{ ...secondaryBtnStyle, flex: 1, textAlign: 'center' as const }}>Log In</a>
              <a href="/signup" style={{ ...primaryBtnStyle, flex: 1, textAlign: 'center' as const }}>Sign Up</a>
            </div>
          </>
        )}
      </div>
    </div>
  )
}

const pageStyle: React.CSSProperties = { backgroundColor: PAPER, minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '40px 20px' }
const cardStyle: React.CSSProperties = { width: '100%', maxWidth: '480px', backgroundColor: PAPER_LT, border: `2px solid ${INK}`, boxShadow: `5px 5px 0 ${INK}`, padding: '32px' }
const eyebrowStyle: React.CSSProperties = { fontFamily: "'Space Mono', monospace", fontSize: '0.58rem', fontWeight: 700, letterSpacing: '0.14em', textTransform: 'uppercase' as const, color: INK_LITE, marginBottom: '8px' }
const h1Style: React.CSSProperties = { fontFamily: "'Arvo', serif", fontSize: '1.6rem', fontWeight: 900, color: INK, margin: '0 0 20px', lineHeight: 1.15 }
const termLabelStyle: React.CSSProperties = { padding: '6px 0', color: INK_LITE, borderBottom: '1px solid rgba(28,22,16,0.1)' }
const termValueStyle: React.CSSProperties = { padding: '6px 0', color: INK, fontWeight: 700, textAlign: 'right' as const, borderBottom: '1px solid rgba(28,22,16,0.1)' }
const primaryBtnStyle: React.CSSProperties = { display: 'inline-block', backgroundColor: TEAL, color: '#fff', padding: '13px', fontWeight: 700, border: `2px solid ${INK}`, boxShadow: `3px 3px 0 ${INK}`, fontSize: '0.95rem', textDecoration: 'none', fontFamily: 'Outfit, sans-serif', textAlign: 'center' as const }
const secondaryBtnStyle: React.CSSProperties = { display: 'inline-block', backgroundColor: 'transparent', color: INK, padding: '13px', fontWeight: 700, border: `2px solid ${INK}`, fontSize: '0.95rem', textDecoration: 'none', fontFamily: 'Outfit, sans-serif', textAlign: 'center' as const }
