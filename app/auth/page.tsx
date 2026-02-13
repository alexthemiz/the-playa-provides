'use client';

import { useState } from 'react';
import { supabase } from '@/lib/supabaseClient';
import { useRouter } from 'next/navigation';
import Link from 'next/link';

export default function AuthPage() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [isSignUp, setIsSignUp] = useState(false);
  const [message, setMessage] = useState('');
  const router = useRouter();

  async function handleAuth(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    setMessage('');

    if (isSignUp) {
      // Create a new account
      const { error } = await supabase.auth.signUp({ email, password });
      if (error) setMessage(error.message);
      else setMessage('Success! Check your email for a confirmation link.');
    } else {
      // Login to existing account
      const { error } = await supabase.auth.signInWithPassword({ email, password });
      if (error) setMessage(error.message);
      else router.push('/settings'); // Redirect to settings on success
    }
    setLoading(false);
  }

  return (
    <div style={{ padding: '40px', maxWidth: '400px', margin: '0 auto', color: 'white', fontFamily: 'sans-serif' }}>
      <Link href="/inventory" style={{ color: '#aaa', textDecoration: 'none', fontSize: '0.9rem' }}>← Back</Link>
      
      <h1 style={{ marginTop: '20px' }}>{isSignUp ? 'Create Account' : 'Sign In'}</h1>
      <p style={{ color: '#888', marginBottom: '20px' }}>
        {isSignUp ? 'Join the community to manage your gear.' : 'Welcome back!'}
      </p>

      <form onSubmit={handleAuth} style={{ display: 'grid', gap: '15px' }}>
        <div style={{ display: 'grid', gap: '5px' }}>
          <label style={{ fontSize: '0.8rem', color: '#888' }}>Email Address</label>
          <input 
            type="email" 
            placeholder="you@example.com" 
            style={inputStyle} 
            value={email} 
            onChange={e => setEmail(e.target.value)} 
            required 
          />
        </div>
        <div style={{ display: 'grid', gap: '5px' }}>
          <label style={{ fontSize: '0.8rem', color: '#888' }}>Password</label>
          <input 
            type="password" 
            placeholder="••••••••" 
            style={inputStyle} 
            value={password} 
            onChange={e => setPassword(e.target.value)} 
            required 
          />
        </div>

        {message && (
          <div style={{ padding: '10px', backgroundColor: '#331111', color: '#ff6666', borderRadius: '4px', fontSize: '0.9rem' }}>
            {message}
          </div>
        )}

        <button type="submit" disabled={loading} style={btnStyle}>
          {loading ? 'Processing...' : isSignUp ? 'Sign Up' : 'Login'}
        </button>
      </form>

      <button 
        onClick={() => setIsSignUp(!isSignUp)} 
        style={{ background: 'none', border: 'none', color: '#00ccff', marginTop: '25px', cursor: 'pointer', width: '100%', textAlign: 'center' }}
      >
        {isSignUp ? 'Already have an account? Sign In' : "Don't have an account? Create one"}
      </button>
    </div>
  );
}

const inputStyle = { padding: '12px', borderRadius: '4px', border: '1px solid #333', backgroundColor: '#111', color: 'white' };
const btnStyle = { padding: '14px', backgroundColor: 'white', color: 'black', fontWeight: 'bold', border: 'none', borderRadius: '4px', cursor: 'pointer', marginTop: '10px' };