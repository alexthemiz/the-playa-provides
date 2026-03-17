'use client';

import { useState } from 'react';
import { supabase } from '@/lib/supabaseClient';
import Link from 'next/link';
import { useRouter } from 'next/navigation';

export default function SignUpPage() {
  const router = useRouter();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [username, setUsername] = useState('');
  const [preferredName, setPreferredName] = useState('');
  const [fullName, setFullName] = useState('');
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState('');
  const [usernameError, setUsernameError] = useState('');
  // New state for the waiver
  const [acceptedTerms, setAcceptedTerms] = useState(false);

  const handleGoogleSignIn = async () => {
    const { error } = await supabase.auth.signInWithOAuth({
      provider: 'google',
      options: {
        redirectTo: `${window.location.origin}/auth/callback?next=/inventory`,
      },
    })
    if (error) setMessage(`Error: ${error.message}`)
  }

  const handleSignUp = async (e: React.FormEvent) => {
    e.preventDefault();
    
    // Safety check in case the button's disabled state is bypassed
    if (!acceptedTerms) {
      setMessage('Error: You must accept the terms to continue.');
      return;
    }

    setLoading(true);
    setMessage('');
    setUsernameError('');

    // Check username availability
    const { data: existing } = await supabase
      .from('profiles')
      .select('id')
      .eq('username', username.toLowerCase().trim())
      .maybeSingle();

    if (existing) {
      setUsernameError('This username is already taken.');
      setLoading(false);
      return;
    }

    const { error } = await supabase.auth.signUp({
      email,
      password,
      options: {
        data: {
          username: username.toLowerCase().trim(),
          preferred_name: preferredName,
          full_name: fullName.trim(),
          email: email,
        },
      },
    });

    if (error) {
      setMessage(`Error: ${error.message}`);
      setLoading(false);
    } else {
      setMessage('Account created! Redirecting...');
      router.refresh();
      setTimeout(() => {
        router.push('/inventory');
      }, 1500);
    }
  };

  // Dynamic button style based on acceptance
  const activeButtonStyle = {
    ...buttonStyle,
    cursor: acceptedTerms ? 'pointer' : 'not-allowed',
    opacity: acceptedTerms ? 1 : 0.3,
  };

  return (
    <div style={containerStyle}>
      <form onSubmit={handleSignUp} style={formStyle}>
        <h1 style={{ color: '#2D241E', marginBottom: '10px', fontSize: '1.5rem', fontWeight: 'bold' }}>Create Account</h1>
        <p style={{ color: '#888', marginBottom: '24px', fontSize: '0.875rem' }}>Join the community to start sharing gear.</p>

        {message && (
          <div style={{
            padding: '12px',
            borderRadius: '8px',
            backgroundColor: message.includes('Error') ? '#fef2f2' : '#f0fdf4',
            color: message.includes('Error') ? '#ef4444' : '#16a34a',
            marginBottom: '20px',
            fontSize: '0.875rem',
            textAlign: 'center' as const,
          }}>
            {message}
          </div>
        )}

        {/* GOOGLE BUTTON */}
        <button onClick={handleGoogleSignIn} style={googleButtonStyle}>
          <GoogleIcon />
          Continue with Google
        </button>
        <p style={{ fontSize: '11px', color: '#aaa', textAlign: 'center' as const, margin: '6px 0 16px' }}>
          By continuing, you agree to our community terms.
        </p>

        {/* DIVIDER */}
        <div style={{ position: 'relative' as const, margin: '0 0 20px' }}>
          <div style={{ position: 'absolute' as const, inset: 0, display: 'flex', alignItems: 'center' }}>
            <span style={{ width: '100%', borderTop: '1px solid #e5e5e5' }} />
          </div>
          <div style={{ position: 'relative' as const, display: 'flex', justifyContent: 'center' }}>
            <span style={{ backgroundColor: '#fff', padding: '0 10px', fontSize: '0.7rem', textTransform: 'uppercase' as const, color: '#aaa', letterSpacing: '0.08em' }}>
              Or create account with email
            </span>
          </div>
        </div>

        <div style={{ display: 'grid', gap: '15px' }}>
          <div>
            <label style={labelStyle}>Email</label>
            <input
              type="email"
              style={inputStyle}
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              required
              placeholder="you@example.com"
            />
          </div>

          <div>
            <label style={labelStyle}>Password</label>
            <input
              type="password"
              style={inputStyle}
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              required
              placeholder="••••••••"
            />
          </div>

          <div>
            <label style={labelStyle}>
              Full Name
              <span style={{ fontWeight: 'normal', textTransform: 'none' as const, letterSpacing: 0, color: '#bbb', marginLeft: '6px', fontSize: '0.7rem' }}>Kept private and never displayed publicly.</span>
            </label>
            <input
              type="text"
              style={inputStyle}
              value={fullName}
              onChange={(e) => setFullName(e.target.value)}
              required
              placeholder="e.g. Jane Smith"
            />
          </div>

          <div style={{ borderTop: '1px solid #e5e5e5', margin: '4px 0' }} />

          <div>
            <label style={labelStyle}>Preferred Name (Publicly Visible)</label>
            <input
              type="text"
              style={inputStyle}
              value={preferredName}
              onChange={(e) => setPreferredName(e.target.value)}
              required
              placeholder="e.g. Dusty Star"
            />
          </div>

          <div>
            <label style={labelStyle}>Username</label>
            <input
              type="text"
              style={{ ...inputStyle, borderColor: usernameError ? '#ef4444' : '#ddd' }}
              value={username}
              onChange={(e) => { setUsername(e.target.value.toLowerCase().replace(/\s/g, '')); setUsernameError(''); }}
              required
              placeholder="unique_handle"
            />
            {usernameError && (
              <p style={{ margin: '5px 0 0', fontSize: '0.75rem', color: '#ef4444' }}>{usernameError}</p>
            )}
          </div>

          {/* Mandatory Waiver Box */}
          <div style={{
            backgroundColor: '#f9f9f9',
            padding: '15px',
            borderRadius: '10px',
            border: '1px solid #e5e5e5',
            display: 'flex',
            gap: '12px',
            marginTop: '4px',
          }}>
            <input
              type="checkbox"
              id="terms"
              checked={acceptedTerms}
              onChange={(e) => setAcceptedTerms(e.target.checked)}
              style={{ marginTop: '3px', cursor: 'pointer' }}
            />
            <label htmlFor="terms" style={{ color: '#666', fontSize: '12px', lineHeight: '1.5' }}>
              I acknowledge that <strong style={{ color: '#2D241E' }}>The Playa Provides</strong> is a community tool.
              I agree the platform is not responsible for transactions or gear condition.
              Lend and borrow at my own risk.
            </label>
          </div>

          <button type="submit" disabled={loading || !acceptedTerms} style={activeButtonStyle}>
            {loading ? 'Creating Account...' : 'Sign Up'}
          </button>
        </div>

        <p style={{ marginTop: '25px', color: '#888', fontSize: '0.875rem', textAlign: 'center' as const }}>
          Already have an account? <Link href="/login" style={{ color: '#00aacc', textDecoration: 'none', fontWeight: 'bold' }}>Log In</Link>
        </p>
      </form>
    </div>
  );
}

// --- STYLES ---
const containerStyle: React.CSSProperties = { display: 'flex', alignItems: 'center', justifyContent: 'center', minHeight: '90vh', padding: '20px' };
const formStyle: React.CSSProperties = { backgroundColor: '#fff', padding: '28px', borderRadius: '14px', border: '1px solid #e5e5e5', boxShadow: '0 4px 20px rgba(0,0,0,0.06)', width: '100%', maxWidth: '520px' };
const labelStyle: React.CSSProperties = { display: 'block', color: '#888', fontSize: '0.75rem', marginBottom: '6px', textTransform: 'uppercase', letterSpacing: '0.08em', fontWeight: 'bold' };
const inputStyle: React.CSSProperties = { width: '100%', padding: '12px', backgroundColor: '#fff', border: '1px solid #ddd', color: '#2D241E', borderRadius: '8px', outline: 'none', fontSize: '1rem', boxSizing: 'border-box' };
const buttonStyle: React.CSSProperties = { width: '100%', padding: '13px', backgroundColor: '#00ccff', color: '#000', fontWeight: 600, border: 'none', borderRadius: '8px', fontSize: '1rem', marginTop: '10px' };

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