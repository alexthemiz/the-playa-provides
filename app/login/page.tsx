'use client'

import { useState } from 'react'
import { supabase } from '@/lib/supabaseClient'
import { useRouter } from 'next/navigation'
import Link from 'next/link'

export default function Login() {
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [loading, setLoading] = useState(false)
  const [message, setMessage] = useState('')

  const router = useRouter()

  const handlePasswordLogin = async (e: React.FormEvent) => {
    e.preventDefault()
    setLoading(true)
    setMessage('')

    try {
      const { error } = await supabase.auth.signInWithPassword({ email, password })
      if (error) {
        setMessage(`Error: ${error.message}`)
      } else {
        router.refresh()
        setTimeout(() => router.push('/inventory'), 150)
      }
    } catch (err) {
      setMessage('An unexpected error occurred.')
    } finally {
      setLoading(false)
    }
  }

  const handleMagicLink = async () => {
    if (!email) {
      setMessage('Please enter your email first.')
      return
    }
    setLoading(true)
    setMessage('Sending magic link...')
    const { error } = await supabase.auth.signInWithOtp({
      email,
      options: { emailRedirectTo: `${window.location.origin}/auth/callback` },
    })
    setMessage(error ? `Error: ${error.message}` : 'Success! Check your email for the link.')
    setLoading(false)
  }

  return (
    <div style={cardStyle}>
      <h1 style={{ fontSize: '1.5rem', fontWeight: 'bold', marginBottom: '8px', color: '#2D241E' }}>Sign In</h1>
      <p style={{ color: '#888', fontSize: '0.875rem', marginBottom: '24px' }}>Welcome back to the gear share.</p>

      <form onSubmit={handlePasswordLogin} style={{ display: 'flex', flexDirection: 'column' as const, gap: '16px' }}>
        <div>
          <label style={labelStyle}>Email</label>
          <input
            type="email"
            placeholder="you@example.com"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            style={inputStyle}
            required
          />
        </div>

        <div>
          <label style={labelStyle}>Password</label>
          <input
            type="password"
            placeholder="••••••••"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            style={inputStyle}
            required
          />
        </div>

        <button
          type="submit"
          disabled={loading}
          style={{ ...submitButtonStyle, opacity: loading ? 0.5 : 1, cursor: loading ? 'not-allowed' : 'pointer' }}
        >
          {loading ? 'Processing...' : 'Sign In'}
        </button>
      </form>

      {/* DIVIDER */}
      <div style={{ position: 'relative' as const, margin: '28px 0' }}>
        <div style={{ position: 'absolute' as const, inset: 0, display: 'flex', alignItems: 'center' }}>
          <span style={{ width: '100%', borderTop: '1px solid #e5e5e5' }} />
        </div>
        <div style={{ position: 'relative' as const, display: 'flex', justifyContent: 'center' }}>
          <span style={{ backgroundColor: '#fff', padding: '0 10px', fontSize: '0.7rem', textTransform: 'uppercase' as const, color: '#aaa', letterSpacing: '0.08em' }}>
            Or use a backup
          </span>
        </div>
      </div>

      <button onClick={handleMagicLink} style={magicLinkButtonStyle}>
        Email me a Magic Link
      </button>

      {message && (
        <p style={{ marginTop: '16px', textAlign: 'center' as const, fontSize: '0.875rem', fontWeight: 500, color: message.includes('Error') ? '#ef4444' : '#00aacc' }}>
          {message}
        </p>
      )}

      <div style={{ marginTop: '28px', paddingTop: '20px', borderTop: '1px solid #e5e5e5', textAlign: 'center' as const }}>
        <p style={{ fontSize: '0.875rem', color: '#888' }}>Don't have an account?</p>
        <Link href="/signup" style={{ display: 'inline-block', marginTop: '8px', color: '#00aacc', fontWeight: 600, textDecoration: 'none' }}>
          Create an Account &rarr;
        </Link>
      </div>
    </div>
  )
}

const cardStyle: React.CSSProperties = {
  maxWidth: '448px', margin: '80px auto 40px', padding: '36px',
  border: '1px solid #e5e5e5', borderRadius: '14px',
  boxShadow: '0 4px 20px rgba(0,0,0,0.06)', backgroundColor: '#fff',
};

const labelStyle: React.CSSProperties = {
  display: 'block', fontSize: '0.75rem', textTransform: 'uppercase',
  letterSpacing: '0.08em', color: '#888', fontWeight: 'bold', marginBottom: '8px',
};

const inputStyle: React.CSSProperties = {
  width: '100%', padding: '12px', backgroundColor: '#fff',
  border: '1px solid #ddd', borderRadius: '8px', color: '#2D241E',
  outline: 'none', boxSizing: 'border-box', fontSize: '1rem',
};

const submitButtonStyle: React.CSSProperties = {
  width: '100%', backgroundColor: '#00ccff', color: '#000',
  padding: '13px', borderRadius: '8px', fontWeight: 600,
  border: 'none', fontSize: '1rem',
};

const magicLinkButtonStyle: React.CSSProperties = {
  width: '100%', border: '1px solid #ddd', backgroundColor: '#fff',
  color: '#2D241E', padding: '13px', borderRadius: '8px',
  fontWeight: 600, cursor: 'pointer', fontSize: '1rem',
};
