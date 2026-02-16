'use client'
import { useState } from 'react'
import { supabase } from '@/lib/supabaseClient'

export default function LoginPage() {
  const [email, setEmail] = useState('')
  const [message, setMessage] = useState('')

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault()
    setMessage('Sending magic link...')

    const { error } = await supabase.auth.signInWithOtp({
      email,
      options: {
        // This is why your link finally worked!
        emailRedirectTo: `${window.location.origin}/auth/callback`,
      },
    })

    if (error) {
      setMessage(`Error: ${error.message}`)
    } else {
      setMessage('Success! Check your email for the magic link.')
    }
  }

  return (
    <div className="max-w-md mx-auto mt-20 p-6 border rounded-xl shadow-sm">
      <h1 className="text-2xl font-bold mb-4">Sign In</h1>
      <form onSubmit={handleLogin} className="space-y-4">
        <input 
          type="email" 
          placeholder="Enter your email" 
          value={email} 
          onChange={(e) => setEmail(e.target.value)}
          className="w-full p-3 border rounded-lg"
          required 
        />
        <button type="submit" className="w-full bg-blue-600 text-white p-3 rounded-lg font-semibold hover:bg-blue-700 transition">
          Send Magic Link
        </button>
      </form>
      {message && <p className="mt-4 text-center text-sm font-medium text-blue-600">{message}</p>}
    </div>
  )
}