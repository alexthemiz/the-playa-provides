'use client'

import Link from 'next/link'
import { useEffect, useState } from 'react'
import { usePathname } from 'next/navigation'
import { supabase } from '../lib/supabaseClient'
import { Bell, Menu, X } from 'lucide-react'

// ── Design tokens ────────────────────────────────────────────────────────────
const INK      = '#1C1610'
const INK_MID  = '#4A3828'
const INK_LITE = '#9A8878'
const PAPER    = '#F6F1E8'
const PAPER_LT = '#FDFAF4'
const LIME     = '#B8CC2A'
const TEAL     = '#1E8A82'

// ── Shared style objects ─────────────────────────────────────────────────────
const headerStyle: React.CSSProperties = {
  backgroundColor: INK,
  borderBottom: `3px solid ${LIME}`,
  position: 'sticky',
  top: 0,
  zIndex: 50,
  width: '100%',
}

const innerStyle: React.CSSProperties = {
  maxWidth: '1400px',
  margin: '0 auto',
  padding: '0 40px',
  height: '52px',
  display: 'flex',
  alignItems: 'center',
  justifyContent: 'space-between',
}

const logoStyle: React.CSSProperties = {
  fontFamily: "'Arvo', serif",
  fontSize: '1.1rem',
  fontWeight: 700,
  color: PAPER,
  textDecoration: 'none',
  letterSpacing: '-0.01em',
  lineHeight: 1,
}

const navStyle: React.CSSProperties = {
  display: 'flex',
  gap: '20px',
  alignItems: 'center',
}

const linkStyle: React.CSSProperties = {
  fontSize: '0.78rem',
  color: '#aaa',
  textDecoration: 'none',
  fontWeight: 500,
  letterSpacing: '0.03em',
  whiteSpace: 'nowrap' as const,
}

const offerLinkStyle: React.CSSProperties = {
  ...linkStyle,
  color: LIME,
  fontWeight: 700,
}

const pipeStyle: React.CSSProperties = {
  color: '#444',
  fontSize: '0.75rem',
  userSelect: 'none' as const,
}

const logoutBtnStyle: React.CSSProperties = {
  fontSize: '0.75rem',
  color: INK_LITE,
  background: 'none',
  border: 'none',
  cursor: 'pointer',
  padding: 0,
  fontFamily: 'inherit',
  fontWeight: 500,
  letterSpacing: '0.03em',
}

const loginLinkStyle: React.CSSProperties = {
  fontSize: '0.78rem',
  color: INK,
  textDecoration: 'none',
  fontWeight: 700,
  backgroundColor: LIME,
  padding: '6px 14px',
  letterSpacing: '0.02em',
  whiteSpace: 'nowrap' as const,
}

// Notification dropdown — white card, keeps existing behaviour
const dropdownStyle: React.CSSProperties = {
  position: 'absolute' as const,
  right: 0,
  top: '36px',
  backgroundColor: PAPER_LT,
  border: `1.5px solid ${INK}`,
  boxShadow: `4px 4px 0 ${INK}`,
  width: '320px',
  zIndex: 50,
  maxHeight: '400px',
  overflowY: 'auto' as const,
}

const dropdownHeaderStyle: React.CSSProperties = {
  padding: '10px 16px',
  borderBottom: `1px solid rgba(28,22,16,0.12)`,
  display: 'flex',
  justifyContent: 'space-between',
  alignItems: 'center',
}

// Mobile menu dropdown
const mobileMenuStyle: React.CSSProperties = {
  position: 'absolute' as const,
  right: 0,
  top: '52px',
  minWidth: '220px',
  backgroundColor: INK,
  borderTop: `1px solid rgba(184,204,42,0.3)`,
  borderLeft: `1.5px solid ${LIME}`,
  borderBottom: `1.5px solid ${LIME}`,
  padding: '16px 24px',
  display: 'flex',
  flexDirection: 'column' as const,
  gap: '16px',
  zIndex: 50,
  textAlign: 'right' as const,
}

// ── Component ────────────────────────────────────────────────────────────────
export default function Header() {
  const pathname = usePathname()

  // Returns link style with active (lime) highlight when the path matches
  const navLinkStyle = (href: string): React.CSSProperties => {
    const isActive = pathname === href || (href !== '/' && pathname.startsWith(href))
    return isActive ? offerLinkStyle : linkStyle
  }

  const [user, setUser]                   = useState<any>(null)
  const [username, setUsername]           = useState<string | null>(null)
  const [unreadCount, setUnreadCount]     = useState(0)
  const [notifications, setNotifications] = useState<any[]>([])
  const [bellOpen, setBellOpen]           = useState(false)
  const [menuOpen, setMenuOpen]           = useState(false)

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
          if (!pollInterval) pollInterval = setInterval(fetchUnread, 30000)
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
    try { await supabase.auth.signOut() } catch (err) { console.error('signOut error:', err) }
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
    } catch (err) { console.error('markAllRead error:', err) }
  }

  const handleNotificationClick = async (notificationId: string) => {
    try {
      const { error } = await supabase.from('notifications').update({ read: true }).eq('id', notificationId)
      if (error) throw error
      setNotifications(prev => prev.map(n => n.id === notificationId ? { ...n, read: true } : n))
      setUnreadCount(prev => Math.max(0, prev - 1))
    } catch (err) { console.error('notificationClick error:', err) }
    setBellOpen(false)
  }

  // ── Bell dropdown (shared desktop + mobile) ───────────────────────────────
  const BellDropdown = () => (
    <>
      <div onClick={() => setBellOpen(false)} style={{ position: 'fixed' as const, inset: 0, zIndex: 49 }} />
      <div style={dropdownStyle}>
        <div style={dropdownHeaderStyle}>
          <span style={{ fontWeight: 700, color: INK, fontSize: '0.88rem', fontFamily: "'Arvo', serif" }}>
            Notifications
          </span>
          {unreadCount > 0 && (
            <button onClick={handleMarkAllRead} style={{ background: 'none', border: 'none', color: TEAL, cursor: 'pointer', fontSize: '0.78rem', fontWeight: 600, fontFamily: 'inherit' }}>
              Mark all read
            </button>
          )}
        </div>
        {notifications.length === 0 ? (
          <div style={{ padding: '24px 16px', color: INK_LITE, fontSize: '0.85rem', textAlign: 'center' as const, fontStyle: 'italic' }}>
            No notifications yet
          </div>
        ) : (
          notifications.map(n => {
            const actorName = (n.actor as any)?.preferred_name || (n.actor as any)?.username || 'Someone'
            const itemName  = (n.item as any)?.item_name || 'an item'
            const campName  = (n.camp as any)?.display_name || 'a camp'
            const campSlug  = (n.camp as any)?.slug || ''
            const timeAgo   = formatTimeAgo(n.created_at)
            const { text, href } = (() => {
              switch (n.type) {
                case 'new_item':              return { text: `posted a new item: ${itemName}`,              href: `/find-items/${n.item_id}` }
                case 'new_follower':          return { text: 'started following you',                       href: `/profile/${(n.actor as any)?.username}` }
                case 'transfer_accepted':     return { text: `accepted your transfer of ${itemName}`,       href: '/inventory' }
                case 'transfer_declined':     return { text: `declined your transfer of ${itemName}`,       href: '/inventory' }
                case 'loan_accepted':         return { text: `accepted your borrow request for ${itemName}`,href: '/inventory' }
                case 'loan_declined':         return { text: `declined your borrow request for ${itemName}`,href: '/inventory' }
                case 'item_request':          return { text: `requested your ${itemName}`,                  href: '/inventory' }
                case 'camp_join':             return { text: `joined ${campName}`,                          href: `/camps/${campSlug}` }
                case 'camp_claim_approved':   return { text: `Your claim for ${campName} was approved!`,    href: `/camps/${campSlug}` }
                case 'camp_claim_denied':     return { text: `Your claim for ${campName} was not approved`, href: `/camps/${campSlug}` }
                case 'loan_return_confirmed': return { text: `confirmed return of ${itemName}`,             href: '/inventory' }
                case 'camp_member_removed':   return { text: `You have been removed from ${campName}`,      href: '/' }
                case 'wish_list_match': {
                  const items     = (n.meta as any)?.items
                  const formatted = Array.isArray(items)
                    ? items.map((i: string) => i.replace('(borrow)', '(to borrow)').replace('(keep)', '(to keep)')).join(', ')
                    : 'something on your wish list'
                  return { text: `says they have: ${formatted}`, href: `/profile/${(n.actor as any)?.username}` }
                }
                default: return { text: 'sent you a notification', href: '/inventory' }
              }
            })()
            return (
              <a
                key={n.id}
                href={href}
                onClick={() => handleNotificationClick(n.id)}
                style={{
                  display: 'block', padding: '12px 16px',
                  borderBottom: '1px solid rgba(28,22,16,0.08)',
                  backgroundColor: n.read ? PAPER_LT : '#EDF7F0',
                  textDecoration: 'none', color: INK,
                }}
              >
                <div style={{ fontSize: '0.84rem', lineHeight: 1.45, color: INK_MID }}>
                  <strong style={{ color: INK }}>{actorName}</strong> {text}
                </div>
                <div style={{ fontSize: '0.72rem', color: INK_LITE, marginTop: '3px', fontFamily: "'Space Mono', monospace" }}>{timeAgo}</div>
              </a>
            )
          })
        )}
      </div>
    </>
  )

  // ── Mobile nav link helpers ───────────────────────────────────────────────
  const mobileLinkStyle: React.CSSProperties = { ...linkStyle, color: '#ccc' }
  const mobileLogoutStyle: React.CSSProperties = { ...logoutBtnStyle, color: '#888', textAlign: 'right' as const }
  const mobileNavLinkStyle = (href: string): React.CSSProperties => {
    const isActive = pathname === href || (href !== '/' && pathname.startsWith(href))
    return isActive ? { ...mobileLinkStyle, color: LIME, fontWeight: 700 } : mobileLinkStyle
  }

  return (
    <header style={headerStyle}>
      <style>{`
        .header-desktop-nav { display: none; }
        .header-mobile-controls { display: flex; }
        @media (min-width: 1024px) {
          .header-desktop-nav { display: flex; }
          .header-mobile-controls { display: none; }
        }
      `}</style>
      <div style={innerStyle}>

        {/* Logo */}
        <Link href="/" style={logoStyle}>
          The Playa <em style={{ fontStyle: 'italic', color: LIME }}>Provides</em>
        </Link>

        {/* Desktop nav — hidden below 1024px */}
        <nav style={navStyle} className="header-desktop-nav">
          <Link href="/about" style={navLinkStyle('/about')} className="hover-nav-link">About</Link>
          <span style={pipeStyle}>|</span>
          <Link href="/resources" style={navLinkStyle('/resources')} className="hover-nav-link">On-Playa Resources</Link>
          <span style={pipeStyle}>|</span>
          <Link href="/find-items" style={navLinkStyle('/find-items')} className="hover-nav-link">Find Items</Link>
          <Link href="/list-item" style={navLinkStyle('/list-item')}>Offer Items</Link>

          {user ? (
            <>
              <Link href="/inventory" style={navLinkStyle('/inventory')} className="hover-nav-link">My Inventory</Link>
              {username && (
                <Link href={`/profile/${username}`} style={navLinkStyle(`/profile/${username}`)} className="hover-nav-link">My Profile</Link>
              )}
              <Link href="/settings" style={navLinkStyle('/settings')} className="hover-nav-link">Settings</Link>

              {/* Bell */}
              <div style={{ position: 'relative' as const }}>
                <button
                  onClick={() => { const will = !bellOpen; setBellOpen(will); if (will) fetchNotifications(); }}
                  style={{ background: 'none', border: 'none', cursor: 'pointer', position: 'relative' as const, padding: '4px', display: 'flex', alignItems: 'center' }}
                >
                  <Bell size={18} color="#aaa" />
                  {unreadCount > 0 && (
                    <span style={{
                      position: 'absolute' as const, top: '-4px', right: '-4px',
                      backgroundColor: '#dc2626', color: '#fff', borderRadius: '50%',
                      width: '15px', height: '15px', fontSize: '9px', fontWeight: 'bold',
                      display: 'flex', alignItems: 'center', justifyContent: 'center',
                    }}>
                      {unreadCount > 9 ? '9+' : unreadCount}
                    </span>
                  )}
                </button>
                {bellOpen && <BellDropdown />}
              </div>

              <button onClick={handleSignOut} style={logoutBtnStyle}>Logout</button>
            </>
          ) : (
            <Link href="/login" style={loginLinkStyle}>Login</Link>
          )}
        </nav>

        {/* Mobile: bell + hamburger */}
        <div className="header-mobile-controls" style={{ gap: '12px', alignItems: 'center' }}>
          {user && (
            <div style={{ position: 'relative' as const }}>
              <button
                onClick={() => { const will = !bellOpen; setBellOpen(will); if (will) fetchNotifications(); setMenuOpen(false); }}
                style={{ background: 'none', border: 'none', cursor: 'pointer', position: 'relative' as const, padding: '4px', display: 'flex', alignItems: 'center' }}
              >
                <Bell size={18} color="#aaa" />
                {unreadCount > 0 && (
                  <span style={{
                    position: 'absolute' as const, top: '-4px', right: '-4px',
                    backgroundColor: '#dc2626', color: '#fff', borderRadius: '50%',
                    width: '15px', height: '15px', fontSize: '9px', fontWeight: 'bold',
                    display: 'flex', alignItems: 'center', justifyContent: 'center',
                  }}>
                    {unreadCount > 9 ? '9+' : unreadCount}
                  </span>
                )}
              </button>
              {bellOpen && <BellDropdown />}
            </div>
          )}

          <button
            onClick={() => { setMenuOpen(!menuOpen); setBellOpen(false); }}
            style={{ background: 'none', border: 'none', cursor: 'pointer', padding: '4px', display: 'flex', alignItems: 'center' }}
          >
            {menuOpen ? <X size={22} color={LIME} /> : <Menu size={22} color="#aaa" />}
          </button>
        </div>
      </div>

      {/* Mobile dropdown */}
      {menuOpen && (
        <>
          <div onClick={() => setMenuOpen(false)} style={{ position: 'fixed' as const, inset: 0, zIndex: 49 }} />
          <div style={mobileMenuStyle}>
            <Link href="/about"       onClick={() => setMenuOpen(false)} style={mobileNavLinkStyle('/about')}>About</Link>
            <Link href="/resources"   onClick={() => setMenuOpen(false)} style={mobileNavLinkStyle('/resources')}>On-Playa Resources</Link>
            <Link href="/find-items"  onClick={() => setMenuOpen(false)} style={mobileNavLinkStyle('/find-items')}>Find Items</Link>
            <Link href="/list-item"   onClick={() => setMenuOpen(false)} style={mobileNavLinkStyle('/list-item')}>Offer Items</Link>
            {user ? (
              <>
                <Link href="/inventory"               onClick={() => setMenuOpen(false)} style={mobileNavLinkStyle('/inventory')}>My Inventory</Link>
                {username && <Link href={`/profile/${username}`} onClick={() => setMenuOpen(false)} style={mobileNavLinkStyle(`/profile/${username}`)}>My Profile</Link>}
                <Link href="/settings"                onClick={() => setMenuOpen(false)} style={mobileNavLinkStyle('/settings')}>Settings</Link>
                <button onClick={() => { setMenuOpen(false); handleSignOut(); }} style={mobileLogoutStyle}>Logout</button>
              </>
            ) : (
              <Link href="/login" onClick={() => setMenuOpen(false)} style={{ ...loginLinkStyle, display: 'inline-block', textAlign: 'center' as const }}>Login</Link>
            )}
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
