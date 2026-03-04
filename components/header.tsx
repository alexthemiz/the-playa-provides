'use client'

import Link from 'next/link'
import { useEffect, useState } from 'react'
import { supabase } from '../lib/supabaseClient'
import { useRouter } from 'next/navigation'

export default function Header() {
  const [user, setUser] = useState<any>(null)
  const [username, setUsername] = useState<string | null>(null)
  const router = useRouter()

  useEffect(() => {
    const getUserData = async () => {
      const { data: { user } } = await supabase.auth.getUser()
      setUser(user)

      if (user) {
        const { data: profile } = await supabase
          .from('profiles')
          .select('username')
          .eq('id', user.id)
          .maybeSingle() 
        
        if (profile) setUsername(profile.username)
      }
    }

    getUserData()

    const { data: { subscription } } = supabase.auth.onAuthStateChange(async (event, session) => {
      const currentUser = session?.user ?? null
      setUser(currentUser)
      
      if (currentUser) {
        const { data: profile } = await supabase
          .from('profiles')
          .select('username')
          .eq('id', currentUser.id)
          .maybeSingle()
        if (profile) setUsername(profile.username)
      } else {
        setUsername(null)
      }
    })

    return () => subscription.unsubscribe()
  }, [])

  const handleSignOut = async () => {
    try {
      await supabase.auth.signOut()
    } catch (err) {
      console.error('signOut error:', err)
    }
    setUser(null)
    setUsername(null)
    router.push('/login')
  }

  // Visual Theme - Dusty Sienna Daylight
  const headerBg = { backgroundColor: '#C08261' } 
  const mainTextColor = 'text-[#2D241E]' 
  const hoverEffect = 'hover:text-[#00ccff]' // Updated to match your accent color preference

  return (
    <header className="border-b border-[#A66D51] sticky top-0 z-50 shadow-sm" style={headerBg}>
      <div className="max-w-7xl mx-auto px-4 h-16 flex items-center justify-between">
      <Link href="/" className="hover:opacity-80 transition flex flex-col leading-tight">
        <span className={`font-black text-xl uppercase tracking-tighter ${mainTextColor}`}>The Playa Provides</span>
        {user && (
          <span className={`text-[13px] font-medium ${mainTextColor} opacity-60 normal-case tracking-normal`}>Why let your stuff collect dust in storage when it could be earning dust on playa?</span>
        )}
      </Link>
        
        <nav className="flex gap-6 items-center">
          <Link href="/resources" className={`text-sm font-medium ${mainTextColor} ${hoverEffect} transition`}>
            On-Playa Resources
          </Link>
          <Link href="/find-items" className={`text-sm font-medium ${mainTextColor} ${hoverEffect} transition`}>
            Find Items
          </Link>
          <Link href="/list-item" className={`text-sm font-medium ${mainTextColor} ${hoverEffect} transition`}>
            Offer an Item
          </Link>

          {user ? (
            <>
              <Link href="/inventory" className={`text-sm font-medium ${mainTextColor} ${hoverEffect} transition`}>
                My Inventory
              </Link>

              {username && (
                <Link href={`/profile/${username}`} className={`text-sm font-medium ${mainTextColor} ${hoverEffect} transition`}>
                  My Profile
                </Link>
              )}

              <Link href="/settings" className={`text-sm font-medium ${mainTextColor} ${hoverEffect} transition`}>
                Settings
              </Link>

              <button 
                onClick={handleSignOut}
                className="text-sm font-bold text-red-800 hover:text-red-600 transition cursor-pointer"
              >
                Logout
              </button>
            </>
          ) : (
            <Link 
              href="/login" 
              className="bg-[#2D241E] text-[#C08261] px-4 py-2 rounded-lg text-sm font-bold hover:bg-black transition"
            >
              Login
            </Link>
          )}
        </nav>
      </div>
    </header>
  )
}