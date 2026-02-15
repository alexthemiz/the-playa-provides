'use client';
import { createBrowserClient } from '@supabase/ssr'
import { useState } from 'react';

export default function LoginPage() {
  const [email, setEmail] = useState('');
  const [message, setMessage] = useState('');
  
  // Initialize the new Supabase client
  const supabase = createBrowserClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
  );

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    const { error } = await supabase.auth.signInWithOtp({
      email,
      options: { 
        emailRedirectTo: `${location.origin}/auth/callback` 
      },
    });
    if (error) setMessage(error.message);
    else setMessage('Check your email for the magic link!');
  };

  return (
    <div className="max-w-md mx-auto mt-20 p-8 border rounded-xl shadow-sm">
      <h2 className="text-2xl font-bold mb-4">Sign In</h2>
      <p className="mb-6 text-gray-600">Enter your email to receive a magic login link.</p>
      <form onSubmit={handleLogin} className="space-y-4">
        <input 
          type="email" 
          placeholder="your@email.com" 
          className="w-full p-3 border rounded-lg"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          required
        />
        <button className="w-full bg-black text-white p-3 rounded-lg font-bold hover:bg-gray-800 transition">
          Send Magic Link
        </button>
      </form>
      {message && <p className="mt-4 text-sm text-blue-600 font-medium">{message}</p>}
    </div>
  );
}