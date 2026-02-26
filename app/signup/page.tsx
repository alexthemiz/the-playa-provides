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
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState('');
  // New state for the waiver
  const [acceptedTerms, setAcceptedTerms] = useState(false);

  const handleSignUp = async (e: React.FormEvent) => {
    e.preventDefault();
    
    // Safety check in case the button's disabled state is bypassed
    if (!acceptedTerms) {
      setMessage('Error: You must accept the terms to continue.');
      return;
    }

    setLoading(true);
    setMessage('');

    const { data, error } = await supabase.auth.signUp({
      email,
      password,
      options: {
        data: {
          username: username.toLowerCase().trim(),
          preferred_name: preferredName,
          email: email,
        },
      },
    });

    if (error) {
      setMessage(`Error: ${error.message}`);
      setLoading(false);
    } else {
      setMessage('Account created! Redirecting...');
      setTimeout(() => {
        router.push('/inventory');
        router.refresh();
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
              style={inputStyle}
              value={username}
              onChange={(e) => setUsername(e.target.value.toLowerCase().replace(/\s/g, ''))}
              required
              placeholder="unique_handle"
            />
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
const formStyle: React.CSSProperties = { backgroundColor: '#fff', padding: '28px', borderRadius: '14px', border: '1px solid #e5e5e5', boxShadow: '0 4px 20px rgba(0,0,0,0.06)', width: '100%', maxWidth: '340px' };
const labelStyle: React.CSSProperties = { display: 'block', color: '#888', fontSize: '0.75rem', marginBottom: '6px', textTransform: 'uppercase', letterSpacing: '0.08em', fontWeight: 'bold' };
const inputStyle: React.CSSProperties = { width: '100%', padding: '12px', backgroundColor: '#fff', border: '1px solid #ddd', color: '#2D241E', borderRadius: '8px', outline: 'none', fontSize: '1rem', boxSizing: 'border-box' };
const buttonStyle: React.CSSProperties = { width: '100%', padding: '13px', backgroundColor: '#00ccff', color: '#000', fontWeight: 600, border: 'none', borderRadius: '8px', fontSize: '1rem', marginTop: '10px' };