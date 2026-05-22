'use client'

import { useState } from 'react'
import { supabase } from '@/lib/supabaseClient'
import { useRouter } from 'next/navigation'
import Link from 'next/link'

const INK      = '#1C1610'
const INK_MID  = '#4A3828'
const INK_LITE = '#9A8878'
const PAPER    = '#F6F1E8'
const PAPER_LT = '#FDFAF4'
const LIME     = '#B8CC2A'
const TEAL     = '#1E8A82'

export default function Login() {
  const [email,    setEmail]    = useState('')
  const [password, setPassword] = useState('')
  const [loading,  setLoading]  = useState(false)
  const [message,  setMessage]  = useState('')
  const router = useRouter()

  const handlePasswordLogin = async (e: React.FormEvent) => {
    e.preventDefault()
    setLoading(true); setMessage('')
    try {
      const { error } = await supabase.auth.signInWithPassword({ email, password })
      if (error) { setMessage(`Error: ${error.message}`) }
      else { router.refresh(); setTimeout(() => router.push('/inventory'), 150) }
    } catch { setMessage('An unexpected error occurred.') }
    finally { setLoading(false) }
  }

  const handleGoogleSignIn = async () => {
    const { error } = await supabase.auth.signInWithOAuth({
      provider: 'google',
      options: { redirectTo: `${window.location.origin}/auth/callback?next=/inventory` },
    })
    if (error) setMessage(`Error: ${error.message}`)
  }

  return (
    <div style={{ backgroundColor: PAPER, minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '40px 20px' }}>
      <div style={{ width: '100%', maxWidth: '360px', backgroundColor: PAPER_LT, border: `2px solid ${INK}`, boxShadow: `5px 5px 0 ${INK}`, padding: '32px' }}>

        <div style={{ fontFamily: "'Space Mono', monospace", fontSize: '0.58rem', fontWeight: 700, letterSpacing: '0.14em', textTransform: 'uppercase' as const, color: INK_LITE, marginBottom: '8px' }}>
          Welcome back
        </div>
        <h1 style={{ fontFamily: "'Fraunces', serif", fontSize: '1.8rem', fontWeight: 900, color: INK, margin: '0 0 24px', lineHeight: 1.1 }}>
          Sign <em style={{ fontStyle: 'italic', color: TEAL }}>In.</em>
        </h1>

        {/* Google */}
        <button onClick={handleGoogleSignIn} style={{ width: '100%', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '10px', border: `1.5px solid rgba(28,22,16,0.2)`, backgroundColor: PAPER_LT, color: INK, padding: '12px', fontWeight: 600, cursor: 'pointer', fontSize: '0.9rem', fontFamily: 'inherit', marginBottom: '6px' }}>
          <GoogleIcon />
          Continue with Google
        </button>
        <p style={{ fontFamily: "'Space Mono', monospace", fontSize: '0.55rem', color: INK_LITE, textAlign: 'center' as const, marginBottom: '20px', letterSpacing: '0.04em' }}>
          by continuing you agree to our community terms
        </p>

        {/* Divider */}
        <div style={{ display: 'flex', alignItems: 'center', gap: '12px', marginBottom: '20px' }}>
          <div style={{ flex: 1, borderTop: `1px solid rgba(28,22,16,0.12)` }} />
          <span style={{ fontFamily: "'Space Mono', monospace", fontSize: '0.55rem', color: INK_LITE, textTransform: 'uppercase' as const, letterSpacing: '0.08em' }}>or email</span>
          <div style={{ flex: 1, borderTop: `1px solid rgba(28,22,16,0.12)` }} />
        </div>

        <form onSubmit={handlePasswordLogin} style={{ display: 'flex', flexDirection: 'column' as const, gap: '14px' }}>
          <div>
            <label style={labelStyle}>Email</label>
            <input type="email" placeholder="you@example.com" value={email} onChange={e => setEmail(e.target.value)} required style={inputStyle} />
          </div>
          <div>
            <label style={labelStyle}>Password</label>
            <input type="password" placeholder="••••••••" value={password} onChange={e => setPassword(e.target.value)} required style={inputStyle} />
          </div>

          <button type="submit" disabled={loading} style={{ ...ctaStyle, opacity: loading ? 0.6 : 1, cursor: loading ? 'not-allowed' : 'pointer', marginTop: '4px' }}>
            {loading ? 'Signing in…' : 'Sign In →'}
          </button>
        </form>

        {message && (
          <p style={{ marginTop: '14px', textAlign: 'center' as const, fontSize: '0.84rem', fontWeight: 500, color: message.includes('Error') ? '#ef4444' : TEAL }}>
            {message}
          </p>
        )}

        <div style={{ marginTop: '20px', paddingTop: '16px', borderTop: `1px solid rgba(28,22,16,0.1)`, textAlign: 'center' as const }}>
          <p style={{ fontSize: '0.84rem', color: INK_LITE, marginBottom: '8px' }}>Don't have an account?</p>
          <Link href="/signup" style={{ fontSize: '0.84rem', color: TEAL, fontWeight: 700, textDecoration: 'none' }}>
            Create an Account →
          </Link>
        </div>
      </div>
    </div>
  )
}

const labelStyle: React.CSSProperties = {
  display: 'block', fontFamily: "'Space Mono', monospace",
  fontSize: '0.58rem', fontWeight: 700, letterSpacing: '0.1em',
  textTransform: 'uppercase' as const, color: '#9A8878', marginBottom: '7px',
}

const inputStyle: React.CSSProperties = {
  width: '100%', padding: '11px 13px', backgroundColor: '#FDFAF4',
  border: '1.5px solid rgba(28,22,16,0.25)', color: '#1C1610',
  outline: 'none', boxSizing: 'border-box' as const, fontSize: '0.95rem',
  fontFamily: 'inherit',
}

const ctaStyle: React.CSSProperties = {
  width: '100%', backgroundColor: '#1E8A82', color: '#fff',
  padding: '13px', fontWeight: 700, border: '2px solid #1C1610',
  boxShadow: '3px 3px 0 #1C1610', fontSize: '0.95rem', fontFamily: 'inherit',
}

function GoogleIcon() {
  return (
    <svg width="17" height="17" viewBox="0 0 24 24" style={{ flexShrink: 0 }}>
      <path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"/>
      <path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"/>
      <path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l3.66-2.84z"/>
      <path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"/>
    </svg>
  )
}
