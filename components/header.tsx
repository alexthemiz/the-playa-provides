'use client'

import Link from 'next/link'
import { useEffect, useState } from 'react'
import { supabase } from '../lib/supabaseClient'
import { useRouter } from 'next/navigation'

export default function Header() {
  const [user, setUser] = useState<any>(null)
  const router = useRouter()

  useEffect(() => {
    const getUser = async () => {
      const { data: { user } } = await supabase.auth.getUser()
      setUser(user)
    }
    getUser()

    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
      setUser(session?.user ?? null)
    })

    return () => subscription.unsubscribe()
  }, [])

  const handleSignOut = async () => {
    await supabase.auth.signOut()
    router.refresh() // Refresh to update the UI
  }

  return (
    <header className="border-b bg-white sticky top-0 z-50">
      <div className="max-w-7xl mx-auto px-4 h-16 flex items-center justify-between">
        <Link href="/" className="font-bold text-xl hover:opacity-80 transition">
          The Playa Provides
        </Link>
        
        <nav className="flex gap-6 items-center">
          <Link href="/gear-feed" className="text-sm font-medium hover:text-blue-600 transition">
            Search for Gear
          </Link>
          <Link href="/list-item" className="text-sm font-medium hover:text-blue-600 transition">
            Share your Gear
          </Link>
          
          {user ? (
            <>
              <Link href="/profile" className="text-sm font-medium hover:text-blue-600 transition">
                My Inventory
              </Link>
              <Link href="/settings" className="text-sm font-medium hover:text-blue-600 transition">
                Settings
              </Link>
              <button 
                onClick={handleSignOut}
                className="text-sm font-bold text-red-600 hover:text-red-800 transition"
              >
                Logout
              </button>
            </>
          ) : (
            <Link 
              href="/login" 
              className="bg-black text-white px-4 py-2 rounded-lg text-sm font-bold hover:bg-gray-800 transition"
            >
              Login
            </Link>
          )}
        </nav>
      </div>
    </header>
  )
}