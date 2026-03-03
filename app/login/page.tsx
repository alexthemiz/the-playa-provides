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

  const handleGoogleSignIn = async () => {
    const { error } = await supabase.auth.signInWithOAuth({
      provider: 'google',
      options: {
        redirectTo: `${window.location.origin}/auth/callback?next=/inventory`,
      },
    })
    if (error) setMessage(`Error: ${error.message}`)
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
      <h1 style={{ fontSize: '1.5rem', fontWeight: 'bold', marginBottom: '4px', color: '#2D241E' }}>Sign In</h1>
      <p style={{ color: '#888', fontSize: '0.875rem', marginBottom: '18px' }}>Welcome back to the gear share.</p>

      <form onSubmit={handlePasswordLogin} style={{ display: 'flex', flexDirection: 'column' as const, gap: '12px' }}>
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

      {/* GOOGLE BUTTON */}
      <div style={{ margin: '18px 0 0' }}>
        <button onClick={handleGoogleSignIn} style={googleButtonStyle}>
          <GoogleIcon />
          Continue with Google
        </button>
      </div>

      {/* DIVIDER */}
      <div style={{ position: 'relative' as const, margin: '18px 0' }}>
        <div style={{ position: 'absolute' as const, inset: 0, display: 'flex', alignItems: 'center' }}>
          <span style={{ width: '100%', borderTop: '1px solid #e5e5e5' }} />
        </div>
        <div style={{ position: 'relative' as const, display: 'flex', justifyContent: 'center' }}>
          <span style={{ backgroundColor: '#fff', padding: '0 10px', fontSize: '0.7rem', textTransform: 'uppercase' as const, color: '#aaa', letterSpacing: '0.08em' }}>
            Or sign in with email
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

      <div style={{ marginTop: '18px', paddingTop: '14px', borderTop: '1px solid #e5e5e5', textAlign: 'center' as const }}>
        <p style={{ fontSize: '0.875rem', color: '#888' }}>Don't have an account?</p>
        <Link href="/signup" style={{ display: 'inline-block', marginTop: '8px', color: '#00aacc', fontWeight: 600, textDecoration: 'none' }}>
          Create an Account &rarr;
        </Link>
      </div>
    </div>
  )
}

const cardStyle: React.CSSProperties = {
  maxWidth: '340px', margin: '40px auto 40px', padding: '28px',
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

const googleButtonStyle: React.CSSProperties = {
  width: '100%', display: 'flex', alignItems: 'center', justifyContent: 'center',
  border: '1px solid #ddd', backgroundColor: '#fff', color: '#2D241E',
  padding: '13px', borderRadius: '8px', fontWeight: 600, cursor: 'pointer', fontSize: '1rem',
};

function GoogleIcon() {
  return (
    <svg width="18" height="18" viewBox="0 0 24 24" style={{ marginRight: '10px', flexShrink: 0 }}>
      <path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"/>
      <path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"/>
      <path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l3.66-2.84z"/>
      <path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"/>
    </svg>
  );
}
