'use client'

import { useState } from 'react'
import { createBrowserClient } from '@supabase/ssr' // Use this instead
import { useRouter } from 'next/navigation'
import Link from 'next/link'

export default function Login() {
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [loading, setLoading] = useState(false)
  const [message, setMessage] = useState('')
  
  const router = useRouter()

  // Initialize the browser-specific client
  const supabase = createBrowserClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
  )

  const handlePasswordLogin = async (e: React.FormEvent) => {
    e.preventDefault()
    setLoading(true)
    // ... rest of your handlePasswordLogin code stays exactly the same
    setMessage('')
    console.log("Attempting login for:", email) // Log for debugging

try {
      const { error } = await supabase.auth.signInWithPassword({
        email,
        password,
      })

      if (error) {
        console.error("Login error:", error.message)
        setMessage(`Error: ${error.message}`)
      } else {
        console.log("Login successful, syncing cookies...")
        
        // 1. Force Next.js to recognize the new session cookies
        router.refresh() 
        
        // 2. Short delay to ensure the refresh 'takes' before moving
        setTimeout(() => {
          router.push('/inventory')
        }, 150)
      }
    } catch (err) {
      console.error("Unexpected error:", err)
      setMessage("An unexpected error occurred.")
    } finally {
      // Always re-enable the button
      setLoading(false) 
    }
  }

  // Handle Magic Link (Backup/Forgot Password)
  const handleMagicLink = async () => {
    if (!email) {
      setMessage('Please enter your email first.')
      return
    }
    setLoading(true)
    setMessage('Sending magic link...')

    const { error } = await supabase.auth.signInWithOtp({
      email,
      options: {
        emailRedirectTo: `${window.location.origin}/auth/callback`,
      },
    })

    if (error) {
      setMessage(`Error: ${error.message}`)
    } else {
      setMessage('Success! Check your email for the link.')
    }
    setLoading(false)
  }

  return (
    <div className="max-w-md mx-auto mt-20 p-8 border rounded-xl shadow-sm bg-black text-white border-zinc-800">
      <h1 className="text-2xl font-bold mb-2">Sign In</h1>
      <p className="text-zinc-500 text-sm mb-6">Welcome back to the gear share.</p>
      
      <form onSubmit={handlePasswordLogin} className="space-y-4">
        <div>
          <label className="block text-xs uppercase tracking-widest text-zinc-500 font-bold mb-2">Email</label>
          <input 
            type="email" 
            placeholder="you@example.com" 
            value={email} 
            onChange={(e) => setEmail(e.target.value)}
            className="w-full p-3 bg-black border border-zinc-700 rounded-lg text-white outline-none focus:border-blue-500 transition"
            required 
          />
        </div>

        <div>
          <label className="block text-xs uppercase tracking-widest text-zinc-500 font-bold mb-2">Password</label>
          <input 
            type="password" 
            placeholder="••••••••" 
            value={password} 
            onChange={(e) => setPassword(e.target.value)}
            className="w-full p-3 bg-black border border-zinc-700 rounded-lg text-white outline-none focus:border-blue-500 transition"
            required 
          />
        </div>

        <button 
          type="submit" 
          disabled={loading}
          className="w-full bg-blue-600 text-white p-3 rounded-lg font-semibold hover:bg-blue-700 transition disabled:opacity-50"
        >
          {loading ? 'Processing...' : 'Sign In'}
        </button>
      </form>

      <div className="relative my-8">
        <div className="absolute inset-0 flex items-center"><span className="w-full border-t border-zinc-800"></span></div>
        <div className="relative flex justify-center text-xs uppercase"><span className="bg-black px-2 text-zinc-500">Or use a backup</span></div>
      </div>

      <button 
        onClick={handleMagicLink}
        className="w-full border border-zinc-700 text-white p-3 rounded-lg font-semibold hover:bg-zinc-900 transition mb-4"
      >
        Email me a Magic Link
      </button>

      {message && (
        <p className={`mt-4 text-center text-sm font-medium ${message.includes('Error') ? 'text-red-400' : 'text-blue-400'}`}>
          {message}
        </p>
      )}

      <div className="mt-8 pt-6 border-t border-zinc-800 text-center">
        <p className="text-sm text-zinc-500">Don't have an account?</p>
        <Link href="/signup" className="inline-block mt-2 text-blue-400 font-semibold hover:text-blue-300 transition">
          Create an Account &rarr;
        </Link>
      </div>
    </div>
  )
}