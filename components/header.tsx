'use client'

import Link from 'next/link'
import { useEffect, useState } from 'react'
import { supabase } from '../lib/supabaseClient'

import { Bell, Menu, X } from 'lucide-react'

export default function Header() {
  const [user, setUser] = useState<any>(null)
  const [username, setUsername] = useState<string | null>(null)
  const [unreadCount, setUnreadCount] = useState(0)
  const [notifications, setNotifications] = useState<any[]>([])
  const [bellOpen, setBellOpen] = useState(false)
  const [menuOpen, setMenuOpen] = useState(false)


  useEffect(() => {
    let pollInterval: ReturnType<typeof setInterval> | undefined

    const fetchUnread = async () => {
      const { data: { session } } = await supabase.auth.getSession()
      if (!session) return
      const { count } = await supabase
        .from('notifications')
        .select('*', { count: 'exact', head: true })
        .eq('recipient_id', session.user.id)
        .eq('read', false)
      setUnreadCount(count ?? 0)
    }

    const getUserData = async () => {
      try {
        const { data: { session } } = await supabase.auth.getSession()
        const user = session?.user ?? null
        setUser(user)

        if (user) {
          const { data: profile } = await supabase
            .from('profiles')
            .select('username')
            .eq('id', user.id)
            .maybeSingle()

          if (profile) setUsername(profile.username)

          fetchUnread()
          if (!pollInterval) {
            pollInterval = setInterval(fetchUnread, 30000)
          }
        }
      } catch (err) {
        console.error('Header auth error:', err)
      }
    }

    getUserData()

    const { data: { subscription } } = supabase.auth.onAuthStateChange((event, session) => {
      const currentUser = session?.user ?? null
      setUser(currentUser)

      if (!currentUser) {
        setUsername(null)
      } else if (event !== 'INITIAL_SESSION') {
        setTimeout(getUserData, 0)
      }
    })

    return () => {
      subscription.unsubscribe()
      clearInterval(pollInterval)
    }
  }, [])

  const handleSignOut = async () => {
    try {
      await supabase.auth.signOut()
    } catch (err) {
      console.error('signOut error:', err)
    }
    window.location.href = '/login'
  }

  const fetchNotifications = async () => {
    const { data: { session } } = await supabase.auth.getSession()
    if (!session) return
    const { data } = await supabase
      .from('notifications')
      .select(`
        id, type, read, created_at, item_id, camp_id, meta,
        actor:profiles!notifications_actor_id_fkey(username, preferred_name),
        item:gear_items!notifications_item_id_fkey(item_name),
        camp:camps!notifications_camp_id_fkey(display_name, slug)
      `)
      .eq('recipient_id', session.user.id)
      .order('created_at', { ascending: false })
      .limit(10)
    setNotifications(data || [])
  }

  const handleMarkAllRead = async () => {
    const { data: { session } } = await supabase.auth.getSession()
    if (!session) return
    try {
      const { error } = await supabase
        .from('notifications')
        .update({ read: true })
        .eq('recipient_id', session.user.id)
        .eq('read', false)
      if (error) throw error
      setUnreadCount(0)
      setNotifications(prev => prev.map(n => ({ ...n, read: true })))
    } catch (err) {
      console.error('markAllRead error:', err)
    }
  }

  const handleNotificationClick = async (notificationId: string) => {
    try {
      const { error } = await supabase.from('notifications').update({ read: true }).eq('id', notificationId)
      if (error) throw error
      setNotifications(prev => prev.map(n => n.id === notificationId ? { ...n, read: true } : n))
      setUnreadCount(prev => Math.max(0, prev - 1))
    } catch (err) {
      console.error('notificationClick error:', err)
    }
    setBellOpen(false)
  }

  const headerBg = { backgroundColor: '#E8834A' }
  const mainTextColor = 'text-[#2D241E]'
  const hoverEffect = 'hover:text-[#3ABFD4]'

  const navLinks = user ? (
    <>
      <Link href="/resources" onClick={() => setMenuOpen(false)} className={`text-sm font-bold ${mainTextColor} ${hoverEffect} transition`}>On-Playa Resources</Link>
      <Link href="/find-items" onClick={() => setMenuOpen(false)} className={`text-sm font-bold ${mainTextColor} ${hoverEffect} transition`}>Find Items</Link>
      <Link href="/list-item" onClick={() => setMenuOpen(false)} className={`text-sm font-bold ${mainTextColor} ${hoverEffect} transition whitespace-nowrap`}>Offer an Item</Link>
      <Link href="/inventory" onClick={() => setMenuOpen(false)} className={`text-sm font-bold ${mainTextColor} ${hoverEffect} transition`}>My Inventory</Link>
      {username && (
        <Link href={`/profile/${username}`} onClick={() => setMenuOpen(false)} className={`text-sm font-bold ${mainTextColor} ${hoverEffect} transition`}>My Profile</Link>
      )}
      <Link href="/settings" onClick={() => setMenuOpen(false)} className={`text-sm font-bold ${mainTextColor} ${hoverEffect} transition`}>Settings</Link>
      <button
        onClick={() => { setMenuOpen(false); handleSignOut() }}
        className="text-sm font-bold text-red-800 hover:text-red-600 transition cursor-pointer text-left"
      >
        Logout
      </button>
    </>
  ) : (
    <>
      <Link href="/resources" onClick={() => setMenuOpen(false)} className={`text-sm font-bold ${mainTextColor} ${hoverEffect} transition`}>On-Playa Resources</Link>
      <Link href="/find-items" onClick={() => setMenuOpen(false)} className={`text-sm font-bold ${mainTextColor} ${hoverEffect} transition`}>Find Items</Link>
      <Link href="/list-item" onClick={() => setMenuOpen(false)} className={`text-sm font-bold ${mainTextColor} ${hoverEffect} transition whitespace-nowrap`}>Offer an Item</Link>
      <Link
        href="/login"
        onClick={() => setMenuOpen(false)}
        className="bg-[#2D241E] text-[#E8834A] px-4 py-2 rounded-lg text-sm font-bold hover:bg-black transition"
      >
        Login
      </Link>
    </>
  )

  return (
    <header className="w-full border-b border-[#A66D51] sticky top-0 z-50 shadow-sm" style={headerBg}>
      <div className="max-w-7xl mx-auto px-4 h-16 flex items-center justify-between">

        {/* Logo */}
        <Link href="/" className="hover:opacity-80 transition flex flex-col leading-tight">
          <span className={`font-black text-xl uppercase tracking-tighter ${mainTextColor}`}>
            The Playa Provides<span style={{ textDecoration: 'underline' }}>{'\u00a0\u00a0\u00a0\u00a0\u00a0\u00a0\u00a0\u00a0'}</span>
          </span>
        </Link>

        {/* Desktop nav */}
        <nav className="hidden lg:flex gap-6 items-center">
          <Link href="/resources" className={`text-sm font-bold ${mainTextColor} ${hoverEffect} transition`}>On-Playa Resources</Link>
          <span style={{ color: '#2D241E', opacity: 0.35, fontSize: '14px', userSelect: 'none' as const }}>|</span>
          <Link href="/find-items" className={`text-sm font-bold ${mainTextColor} ${hoverEffect} transition`}>Find Items</Link>
          <Link href="/list-item" className={`text-sm font-bold ${mainTextColor} ${hoverEffect} transition whitespace-nowrap`}>Offer an Item</Link>

          {user ? (
            <>
              <Link href="/inventory" className={`text-sm font-bold ${mainTextColor} ${hoverEffect} transition`}>My Inventory</Link>
              {username && (
                <Link href={`/profile/${username}`} className={`text-sm font-bold ${mainTextColor} ${hoverEffect} transition`}>My Profile</Link>
              )}
              <Link href="/settings" className={`text-sm font-bold ${mainTextColor} ${hoverEffect} transition`}>Settings</Link>

              {/* Bell */}
              <div style={{ position: 'relative' as const }}>
                <button
                  onClick={() => {
                    const willOpen = !bellOpen
                    setBellOpen(willOpen)
                    if (willOpen) fetchNotifications()
                  }}
                  style={{ background: 'none', border: 'none', cursor: 'pointer', position: 'relative' as const, padding: '4px', display: 'flex', alignItems: 'center' }}
                >
                  <Bell size={20} color="#2D241E" />
                  {unreadCount > 0 && (
                    <span style={{
                      position: 'absolute' as const, top: '-4px', right: '-4px',
                      backgroundColor: '#dc2626', color: '#fff', borderRadius: '50%',
                      width: '16px', height: '16px', fontSize: '10px', fontWeight: 'bold',
                      display: 'flex', alignItems: 'center', justifyContent: 'center',
                    }}>
                      {unreadCount > 9 ? '9+' : unreadCount}
                    </span>
                  )}
                </button>

                {bellOpen && (
                  <>
                    <div onClick={() => setBellOpen(false)} style={{ position: 'fixed' as const, inset: 0, zIndex: 49 }} />
                    <div style={{
                      position: 'absolute' as const, right: 0, top: '36px',
                      backgroundColor: '#fff', border: '1px solid #eee', borderRadius: '12px',
                      boxShadow: '0 8px 32px rgba(0,0,0,0.12)', width: '320px', zIndex: 50,
                      maxHeight: '400px', overflowY: 'auto' as const,
                    }}>
                      <div style={{ padding: '12px 16px', borderBottom: '1px solid #f0f0f0', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                        <span style={{ fontWeight: 700, color: '#2D241E', fontSize: '0.9rem' }}>Notifications</span>
                        {unreadCount > 0 && (
                          <button onClick={handleMarkAllRead} style={{ background: 'none', border: 'none', color: '#00aacc', cursor: 'pointer', fontSize: '0.8rem', fontWeight: 600 }}>
                            Mark all read
                          </button>
                        )}
                      </div>
                      {notifications.length === 0 ? (
                        <div style={{ padding: '24px 16px', color: '#aaa', fontSize: '0.85rem', textAlign: 'center' as const }}>No notifications yet</div>
                      ) : (
                        notifications.map(n => {
                          const actorName = (n.actor as any)?.preferred_name || (n.actor as any)?.username || 'Someone'
                          const itemName = (n.item as any)?.item_name || 'an item'
                          const campName = (n.camp as any)?.display_name || 'a camp'
                          const campSlug = (n.camp as any)?.slug || ''
                          const timeAgo = formatTimeAgo(n.created_at)
                          const { text, href } = (() => {
                            switch (n.type) {
                              case 'new_item': return { text: `posted a new item: ${itemName}`, href: `/find-items/${n.item_id}` }
                              case 'new_follower': return { text: 'started following you', href: `/profile/${(n.actor as any)?.username}` }
                              case 'transfer_accepted': return { text: `accepted your transfer of ${itemName}`, href: '/inventory' }
                              case 'transfer_declined': return { text: `declined your transfer of ${itemName}`, href: '/inventory' }
                              case 'loan_accepted': return { text: `accepted your borrow request for ${itemName}`, href: '/inventory' }
                              case 'loan_declined': return { text: `declined your borrow request for ${itemName}`, href: '/inventory' }
                              case 'item_request': return { text: `requested your ${itemName}`, href: '/inventory' }
                              case 'camp_join': return { text: `joined ${campName}`, href: `/camps/${campSlug}` }
                              case 'camp_claim_approved': return { text: `Your claim for ${campName} was approved!`, href: `/camps/${campSlug}` }
                              case 'camp_claim_denied': return { text: `Your claim for ${campName} was not approved`, href: `/camps/${campSlug}` }
                              case 'loan_return_confirmed': return { text: `confirmed return of ${itemName}`, href: '/inventory' }
                              case 'camp_member_removed': return { text: `You have been removed from ${campName}`, href: '/' }
                              case 'wish_list_match': { const items = (n.meta as any)?.items; return { text: `says they have: ${Array.isArray(items) ? items.join(', ') : 'something on your wish list'}`, href: `/profile/${(n.actor as any)?.username}` } }
                              default: return { text: 'sent you a notification', href: '/inventory' }
                            }
                          })()
                          return (
                            <a
                              key={n.id}
                              href={href}
                              onClick={() => handleNotificationClick(n.id)}
                              style={{
                                display: 'block', padding: '12px 16px', borderBottom: '1px solid #f5f5f5',
                                backgroundColor: n.read ? '#fff' : '#f0fdf4',
                                textDecoration: 'none', color: '#2D241E',
                              }}
                            >
                              <div style={{ fontSize: '0.85rem', lineHeight: 1.4 }}>
                                <strong>{actorName}</strong> {text}
                              </div>
                              <div style={{ fontSize: '0.75rem', color: '#aaa', marginTop: '3px' }}>{timeAgo}</div>
                            </a>
                          )
                        })
                      )}
                    </div>
                  </>
                )}
              </div>

              <button
                onClick={handleSignOut}
                className="text-sm font-bold text-red-800 hover:text-red-600 transition cursor-pointer"
              >
                Logout
              </button>
            </>
          ) : (
            <Link href="/login" className="bg-[#2D241E] text-[#E8834A] px-4 py-2 rounded-lg text-sm font-bold hover:bg-black transition">
              Login
            </Link>
          )}
        </nav>

        {/* Mobile: bell (if logged in) + hamburger */}
        <div className="flex lg:hidden items-center gap-3">
          {user && (
            <div style={{ position: 'relative' as const }}>
              <button
                onClick={() => {
                  const willOpen = !bellOpen
                  setBellOpen(willOpen)
                  if (willOpen) fetchNotifications()
                  setMenuOpen(false)
                }}
                style={{ background: 'none', border: 'none', cursor: 'pointer', position: 'relative' as const, padding: '4px', display: 'flex', alignItems: 'center' }}
              >
                <Bell size={20} color="#2D241E" />
                {unreadCount > 0 && (
                  <span style={{
                    position: 'absolute' as const, top: '-4px', right: '-4px',
                    backgroundColor: '#dc2626', color: '#fff', borderRadius: '50%',
                    width: '16px', height: '16px', fontSize: '10px', fontWeight: 'bold',
                    display: 'flex', alignItems: 'center', justifyContent: 'center',
                  }}>
                    {unreadCount > 9 ? '9+' : unreadCount}
                  </span>
                )}
              </button>

              {bellOpen && (
                <>
                  <div onClick={() => setBellOpen(false)} style={{ position: 'fixed' as const, inset: 0, zIndex: 49 }} />
                  <div style={{
                    position: 'absolute' as const, right: 0, top: '36px',
                    backgroundColor: '#fff', border: '1px solid #eee', borderRadius: '12px',
                    boxShadow: '0 8px 32px rgba(0,0,0,0.12)', width: '290px', zIndex: 50,
                    maxHeight: '400px', overflowY: 'auto' as const,
                  }}>
                    <div style={{ padding: '12px 16px', borderBottom: '1px solid #f0f0f0', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                      <span style={{ fontWeight: 700, color: '#2D241E', fontSize: '0.9rem' }}>Notifications</span>
                      {unreadCount > 0 && (
                        <button onClick={handleMarkAllRead} style={{ background: 'none', border: 'none', color: '#00aacc', cursor: 'pointer', fontSize: '0.8rem', fontWeight: 600 }}>
                          Mark all read
                        </button>
                      )}
                    </div>
                    {notifications.length === 0 ? (
                      <div style={{ padding: '24px 16px', color: '#aaa', fontSize: '0.85rem', textAlign: 'center' as const }}>No notifications yet</div>
                    ) : (
                      notifications.map(n => {
                        const actorName = (n.actor as any)?.preferred_name || (n.actor as any)?.username || 'Someone'
                        const itemName = (n.item as any)?.item_name || 'an item'
                        const campName = (n.camp as any)?.display_name || 'a camp'
                        const campSlug = (n.camp as any)?.slug || ''
                        const timeAgo = formatTimeAgo(n.created_at)
                        const { text, href } = (() => {
                          switch (n.type) {
                            case 'new_item': return { text: `posted a new item: ${itemName}`, href: `/find-items/${n.item_id}` }
                            case 'new_follower': return { text: 'started following you', href: `/profile/${(n.actor as any)?.username}` }
                            case 'transfer_accepted': return { text: `accepted your transfer of ${itemName}`, href: '/inventory' }
                            case 'transfer_declined': return { text: `declined your transfer of ${itemName}`, href: '/inventory' }
                            case 'loan_accepted': return { text: `accepted your borrow request for ${itemName}`, href: '/inventory' }
                            case 'loan_declined': return { text: `declined your borrow request for ${itemName}`, href: '/inventory' }
                            case 'item_request': return { text: `requested your ${itemName}`, href: '/inventory' }
                            case 'camp_join': return { text: `joined ${campName}`, href: `/camps/${campSlug}` }
                            case 'camp_claim_approved': return { text: `Your claim for ${campName} was approved!`, href: `/camps/${campSlug}` }
                            case 'camp_claim_denied': return { text: `Your claim for ${campName} was not approved`, href: `/camps/${campSlug}` }
                            case 'loan_return_confirmed': return { text: `confirmed return of ${itemName}`, href: '/inventory' }
                            case 'camp_member_removed': return { text: `You have been removed from ${campName}`, href: '/' }
                            default: return { text: 'sent you a notification', href: '/inventory' }
                          }
                        })()
                        return (
                          <a
                            key={n.id}
                            href={href}
                            onClick={() => handleNotificationClick(n.id)}
                            style={{
                              display: 'block', padding: '12px 16px', borderBottom: '1px solid #f5f5f5',
                              backgroundColor: n.read ? '#fff' : '#f0fdf4',
                              textDecoration: 'none', color: '#2D241E',
                            }}
                          >
                            <div style={{ fontSize: '0.85rem', lineHeight: 1.4 }}>
                              <strong>{actorName}</strong> {text}
                            </div>
                            <div style={{ fontSize: '0.75rem', color: '#aaa', marginTop: '3px' }}>{timeAgo}</div>
                          </a>
                        )
                      })
                    )}
                  </div>
                </>
              )}
            </div>
          )}

          <button
            onClick={() => { setMenuOpen(!menuOpen); setBellOpen(false); }}
            style={{ background: 'none', border: 'none', cursor: 'pointer', padding: '4px', display: 'flex', alignItems: 'center' }}
          >
            {menuOpen ? <X size={24} color="#2D241E" /> : <Menu size={24} color="#2D241E" />}
          </button>
        </div>
      </div>

      {/* Mobile dropdown menu */}
      {menuOpen && (
        <>
          <div
            onClick={() => setMenuOpen(false)}
            style={{ position: 'fixed' as const, inset: 0, zIndex: 49 }}
            className="lg:hidden"
          />
          <div
            style={{
              position: 'absolute' as const, right: '16px', top: '64px',
              width: 'auto', minWidth: '220px', borderRadius: '12px',
              backgroundColor: '#E8834A',
              boxShadow: '0 8px 24px rgba(0,0,0,0.15)',
              padding: '16px 20px',
              display: 'flex', flexDirection: 'column' as const, gap: '16px',
              zIndex: 50,
              border: '1px solid #A66D51',
            }}
          >
            {navLinks}
          </div>
        </>
      )}
    </header>
  )
}

function formatTimeAgo(dateStr: string): string {
  const diff = Date.now() - new Date(dateStr).getTime()
  const mins = Math.floor(diff / 60000)
  if (mins < 1) return 'just now'
  if (mins < 60) return `${mins}m ago`
  const hours = Math.floor(mins / 60)
  if (hours < 24) return `${hours}h ago`
  return `${Math.floor(hours / 24)}d ago`
}