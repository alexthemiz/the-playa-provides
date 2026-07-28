'use client'

import { useState, useEffect } from 'react'
import { supabase } from '@/lib/supabaseClient'

const INK      = '#1C1610'
const INK_MID  = '#4A3828'
const INK_LITE = '#9A8878'
const PAPER    = '#F6F1E8'
const PAPER_LT = '#FDFAF4'
const TEAL     = '#1E8A82'

export default function ResetPassword() {
  const [checkingSession, setCheckingSession] = useState(true)
  const [hasSession,      setHasSession]      = useState(false)
  const [password,        setPassword]        = useState('')
  const [confirmPassword, setConfirmPassword] = useState('')
  const [loading, setLoading] = useState(false)
  const [message, setMessage] = useState('')
  const [done,    setDone]    = useState(false)

  useEffect(() => {
    supabase.auth.getSession().then(({ data: { session } }) => {
      setHasSession(!!session)
      setCheckingSession(false)
    })
  }, [])

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (password !== confirmPassword) { setMessage('Error: Passwords do not match.'); return }
    if (password.length < 6) { setMessage('Error: Password must be at least 6 characters.'); return }

    setLoading(true); setMessage('')
    try {
      const { error } = await supabase.auth.updateUser({ password })
      if (error) { setMessage(`Error: ${error.message}`) }
      else {
        setDone(true)
        setTimeout(() => { window.location.href = '/inventory' }, 1500)
      }
    } catch { setMessage('An unexpected error occurred.') }
    finally { setLoading(false) }
  }

  return (
    <div style={{ backgroundColor: PAPER, minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '40px 20px' }}>
      <div style={{ width: '100%', maxWidth: '360px', backgroundColor: PAPER_LT, border: `2px solid ${INK}`, boxShadow: `5px 5px 0 ${INK}`, padding: '32px' }}>

        <div style={{ fontFamily: "'Space Mono', monospace", fontSize: '0.58rem', fontWeight: 700, letterSpacing: '0.14em', textTransform: 'uppercase' as const, color: INK_LITE, marginBottom: '8px' }}>
          Password reset
        </div>
        <h1 style={{ fontFamily: "'Arvo', serif", fontSize: '1.8rem', fontWeight: 900, color: INK, margin: '0 0 24px', lineHeight: 1.1 }}>
          New <em style={{ fontStyle: 'italic', color: TEAL }}>Password.</em>
        </h1>

        {checkingSession ? (
          <p style={{ fontSize: '0.9rem', color: INK_MID }}>Checking your link…</p>
        ) : !hasSession ? (
          <p style={{ fontSize: '0.9rem', color: INK_MID, lineHeight: 1.6 }}>
            This reset link is invalid or has expired.{' '}
            <a href="/login" style={{ color: TEAL, fontWeight: 700, textDecoration: 'none' }}>Request a new one →</a>
          </p>
        ) : done ? (
          <p style={{ fontSize: '0.9rem', color: TEAL, fontWeight: 600, textAlign: 'center' as const }}>
            Password updated! Taking you to your inventory…
          </p>
        ) : (
          <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column' as const, gap: '14px' }}>
            <div>
              <label style={labelStyle}>New Password</label>
              <input type="password" placeholder="••••••••" value={password} onChange={e => setPassword(e.target.value)} required style={inputStyle} />
            </div>
            <div>
              <label style={labelStyle}>Confirm Password</label>
              <input type="password" placeholder="••••••••" value={confirmPassword} onChange={e => setConfirmPassword(e.target.value)} required style={inputStyle} />
            </div>

            <button type="submit" disabled={loading} style={{ ...ctaStyle, opacity: loading ? 0.6 : 1, cursor: loading ? 'not-allowed' : 'pointer', marginTop: '4px' }}>
              {loading ? 'Updating…' : 'Update Password →'}
            </button>
          </form>
        )}

        {message && (
          <p style={{ marginTop: '14px', textAlign: 'center' as const, fontSize: '0.84rem', fontWeight: 500, color: message.includes('Error') ? '#ef4444' : TEAL }}>
            {message}
          </p>
        )}
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
