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

  const handleSignUp = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setMessage('');

    // Sign up the user in Supabase Auth
    // We pass username and preferred_name as 'data' so the SQL trigger can find them
const { data, error } = await supabase.auth.signUp({
  email,
  password,
  options: {
    data: {
      username: username.toLowerCase().trim(),
      preferred_name: preferredName,
      email: email, // <--- This must be here!
    },
  },
})

    if (error) {
      setMessage(`Error: ${error.message}`);
      setLoading(false);
    } else {
      // Since Email Confirmation is OFF, they are technically logged in.
      // We'll give them a success message and redirect to the inventory.
      setMessage('Account created! Redirecting...');
      setTimeout(() => {
        router.push('/inventory');
        router.refresh();
      }, 1500);
    }
  };

  return (
    <div style={containerStyle}>
      <form onSubmit={handleSignUp} style={formStyle}>
        <h1 style={{ color: 'white', marginBottom: '10px', fontSize: '28px' }}>Create Account</h1>
        <p style={{ color: '#888', marginBottom: '30px', fontSize: '14px' }}>Join the community to start sharing gear.</p>

        {message && (
          <div style={{ 
            padding: '12px', 
            borderRadius: '8px', 
            backgroundColor: message.includes('Error') ? '#441111' : '#114411', 
            color: 'white', 
            marginBottom: '20px',
            fontSize: '14px',
            textAlign: 'center'
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

          <div style={{ borderTop: '1px solid #222', margin: '10px 0' }} />

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

          <button type="submit" disabled={loading} style={buttonStyle}>
            {loading ? 'Creating Account...' : 'Sign Up'}
          </button>
        </div>

        <p style={{ marginTop: '25px', color: '#666', fontSize: '14px', textAlign: 'center' }}>
          Already have an account? <Link href="/login" style={{ color: '#00ccff', textDecoration: 'none', fontWeight: 'bold' }}>Log In</Link>
        </p>
      </form>
    </div>
  );
}

// --- STYLES ---
const containerStyle: React.CSSProperties = { display: 'flex', alignItems: 'center', justifyContent: 'center', minHeight: '90vh', padding: '20px' };
const formStyle: React.CSSProperties = { backgroundColor: '#0a0a0a', padding: '40px', borderRadius: '20px', border: '1px solid #222', width: '100%', maxWidth: '420px' };
const labelStyle: React.CSSProperties = { display: 'block', color: '#888', fontSize: '11px', marginBottom: '6px', textTransform: 'uppercase', letterSpacing: '1px', fontWeight: 'bold' };
const inputStyle: React.CSSProperties = { width: '100%', padding: '12px', backgroundColor: '#000', border: '1px solid #333', color: 'white', borderRadius: '8px', outline: 'none', fontSize: '15px' };
const buttonStyle: React.CSSProperties = { width: '100%', padding: '15px', backgroundColor: '#00ccff', color: 'black', fontWeight: 'bold', border: 'none', borderRadius: '8px', cursor: 'pointer', fontSize: '16px', marginTop: '10px' };