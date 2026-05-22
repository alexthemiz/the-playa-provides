'use client';

import { useState } from 'react';
import { supabase } from '@/lib/supabaseClient';
import Link from 'next/link';
import { useRouter } from 'next/navigation';

const INK      = '#1C1610'
const INK_LITE = '#9A8878'
const PAPER    = '#F6F1E8'
const PAPER_LT = '#FDFAF4'
const PAPER_DK = '#EDE5D0'
const TEAL     = '#1E8A82'

export default function SignUpPage() {
  const router = useRouter();
  const [email,          setEmail]          = useState('');
  const [password,       setPassword]       = useState('');
  const [username,       setUsername]       = useState('');
  const [preferredName,  setPreferredName]  = useState('');
  const [fullName,       setFullName]       = useState('');
  const [loading,        setLoading]        = useState(false);
  const [message,        setMessage]        = useState('');
  const [usernameError,  setUsernameError]  = useState('');
  const [acceptedTerms,  setAcceptedTerms]  = useState(false);

  const handleGoogleSignIn = async () => {
    const { error } = await supabase.auth.signInWithOAuth({
      provider: 'google',
      options: { redirectTo: `${window.location.origin}/auth/callback?next=/settings?setup=true` },
    });
    if (error) setMessage(`Error: ${error.message}`);
  };

  const handleSignUp = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!acceptedTerms) { setMessage('Error: You must accept the terms to continue.'); return; }
    setLoading(true); setMessage(''); setUsernameError('');

    const { data: existing } = await supabase.from('profiles').select('id').eq('username', username.toLowerCase().trim()).maybeSingle();
    if (existing) { setUsernameError('This username is already taken.'); setLoading(false); return; }

    const { error } = await supabase.auth.signUp({
      email, password,
      options: { data: { username: username.toLowerCase().trim(), preferred_name: preferredName, full_name: fullName.trim(), email } },
    });

    if (error) { setMessage(`Error: ${error.message}`); setLoading(false); }
    else { setMessage('Account created! Redirecting…'); setTimeout(() => { window.location.href = '/profile/' + username.toLowerCase().trim(); }, 1500); }
  };

  return (
    <div style={{ backgroundColor: PAPER, minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '40px 20px' }}>
      <div style={{ width: '100%', maxWidth: '520px', backgroundColor: PAPER_LT, border: `2px solid ${INK}`, boxShadow: `5px 5px 0 ${INK}`, padding: '32px' }}>

        <div style={eyebrowStyle}>Join the community</div>
        <h1 style={h1Style}>Create <em style={{ fontStyle: 'italic', color: TEAL }}>Account.</em></h1>

        {message && (
          <div style={{ padding: '12px 14px', marginBottom: '20px', fontSize: '0.84rem', fontWeight: 500, backgroundColor: message.includes('Error') ? '#fef2f2' : '#f0fdf4', color: message.includes('Error') ? '#ef4444' : '#16a34a', border: `1px solid ${message.includes('Error') ? '#fca5a5' : '#86efac'}` }}>
            {message}
          </div>
        )}

        {/* Google */}
        <button onClick={handleGoogleSignIn} style={googleBtnStyle}>
          <GoogleIcon /> Continue with Google
        </button>
        <p style={{ fontFamily: "'Space Mono', monospace", fontSize: '0.55rem', color: INK_LITE, textAlign: 'center' as const, margin: '6px 0 18px', letterSpacing: '0.04em' }}>
          by continuing you agree to our community terms
        </p>

        {/* Divider */}
        <div style={{ display: 'flex', alignItems: 'center', gap: '12px', marginBottom: '20px' }}>
          <div style={{ flex: 1, borderTop: `1px solid rgba(28,22,16,0.12)` }} />
          <span style={{ fontFamily: "'Space Mono', monospace", fontSize: '0.55rem', color: INK_LITE, textTransform: 'uppercase' as const, letterSpacing: '0.08em' }}>or email</span>
          <div style={{ flex: 1, borderTop: `1px solid rgba(28,22,16,0.12)` }} />
        </div>

        <form onSubmit={handleSignUp} style={{ display: 'grid', gap: '14px' }}>
          <div>
            <label style={labelStyle}>Email</label>
            <input type="email" style={inputStyle} value={email} onChange={e => setEmail(e.target.value)} required placeholder="you@example.com" />
          </div>
          <div>
            <label style={labelStyle}>Password</label>
            <input type="password" style={inputStyle} value={password} onChange={e => setPassword(e.target.value)} required placeholder="••••••••" />
          </div>
          <div>
            <label style={labelStyle}>
              Full Name
              <span style={{ fontWeight: 'normal', textTransform: 'none' as const, letterSpacing: 0, color: '#bbb', marginLeft: '6px', fontSize: '0.65rem' }}>Private — never shown publicly</span>
            </label>
            <input type="text" style={inputStyle} value={fullName} onChange={e => setFullName(e.target.value)} required placeholder="e.g. Jane Smith" />
          </div>

          <hr style={{ border: 'none', borderTop: `1px solid rgba(28,22,16,0.1)`, margin: '2px 0' }} />

          <div>
            <label style={labelStyle}>Preferred Name <span style={{ fontWeight: 'normal', textTransform: 'none' as const, letterSpacing: 0, color: '#bbb', marginLeft: '6px', fontSize: '0.65rem' }}>Publicly visible</span></label>
            <input type="text" style={inputStyle} value={preferredName} onChange={e => setPreferredName(e.target.value)} required placeholder="e.g. Dusty Star" />
          </div>
          <div>
            <label style={labelStyle}>Username</label>
            <input
              type="text"
              style={{ ...inputStyle, borderColor: usernameError ? '#ef4444' : 'rgba(28,22,16,0.25)' }}
              value={username}
              onChange={e => { setUsername(e.target.value.toLowerCase().replace(/\s/g, '')); setUsernameError(''); }}
              required
              placeholder="unique_handle"
            />
            {usernameError && <p style={{ margin: '5px 0 0', fontSize: '0.75rem', color: '#ef4444' }}>{usernameError}</p>}
          </div>

          {/* Terms waiver */}
          <div style={{ backgroundColor: PAPER_DK, padding: '14px', border: `1px solid rgba(28,22,16,0.12)`, display: 'flex', gap: '12px', alignItems: 'flex-start' }}>
            <input type="checkbox" id="terms" checked={acceptedTerms} onChange={e => setAcceptedTerms(e.target.checked)} style={{ marginTop: '3px', cursor: 'pointer', accentColor: TEAL }} />
            <label htmlFor="terms" style={{ color: INK_LITE, fontSize: '0.78rem', lineHeight: 1.55, cursor: 'pointer' }}>
              I acknowledge that <strong style={{ color: INK }}>The Playa Provides</strong> is a community tool.
              I agree the platform is not responsible for transactions or gear condition.
              Lend and borrow at my own risk.
            </label>
          </div>

          <button
            type="submit"
            disabled={loading || !acceptedTerms}
            style={{ ...ctaStyle, opacity: loading || !acceptedTerms ? 0.4 : 1, cursor: loading || !acceptedTerms ? 'not-allowed' : 'pointer' }}
          >
            {loading ? 'Creating Account…' : 'Sign Up →'}
          </button>
        </form>

        <p style={{ marginTop: '20px', color: INK_LITE, fontSize: '0.84rem', textAlign: 'center' as const }}>
          Already have an account?{' '}
          <Link href="/login" style={{ color: TEAL, textDecoration: 'none', fontWeight: 700 }}>Log In →</Link>
        </p>
      </div>
    </div>
  );
}

const eyebrowStyle: React.CSSProperties = { fontFamily: "'Space Mono', monospace", fontSize: '0.58rem', fontWeight: 700, letterSpacing: '0.14em', textTransform: 'uppercase' as const, color: INK_LITE, marginBottom: '8px' }
const h1Style: React.CSSProperties = { fontFamily: "'Arvo', serif", fontSize: '1.8rem', fontWeight: 900, color: INK, margin: '0 0 24px', lineHeight: 1.1 }
const labelStyle: React.CSSProperties = { display: 'block', fontFamily: "'Space Mono', monospace", fontSize: '0.58rem', fontWeight: 700, letterSpacing: '0.1em', textTransform: 'uppercase' as const, color: '#9A8878', marginBottom: '7px' }
const inputStyle: React.CSSProperties = { width: '100%', padding: '11px 13px', backgroundColor: '#FDFAF4', border: '1.5px solid rgba(28,22,16,0.25)', color: '#1C1610', outline: 'none', boxSizing: 'border-box' as const, fontSize: '0.95rem', fontFamily: 'inherit' }
const ctaStyle: React.CSSProperties = { width: '100%', backgroundColor: '#1E8A82', color: '#fff', padding: '13px', fontWeight: 700, border: '2px solid #1C1610', boxShadow: '3px 3px 0 #1C1610', fontSize: '0.95rem', fontFamily: 'inherit' }
const googleBtnStyle: React.CSSProperties = { width: '100%', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '10px', border: '1.5px solid rgba(28,22,16,0.2)', backgroundColor: '#FDFAF4', color: '#1C1610', padding: '12px', fontWeight: 600, cursor: 'pointer', fontSize: '0.9rem', fontFamily: 'inherit' }

function GoogleIcon() {
  return (
    <svg width="17" height="17" viewBox="0 0 24 24" style={{ flexShrink: 0 }}>
      <path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"/>
      <path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"/>
      <path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l3.66-2.84z"/>
      <path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"/>
    </svg>
  );
}
