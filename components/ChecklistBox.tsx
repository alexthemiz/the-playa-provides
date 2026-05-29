'use client'

import { useEffect } from 'react'
import { useRouter } from 'next/navigation'

const INK      = '#1C1610'
const INK_LITE = '#9A8878'
const TEAL     = '#1E8A82'

export interface ChecklistState {
  playaHistory: boolean
  wishList:     boolean
  locations:    boolean
  listedItem:   boolean
  browsed:      boolean
}

interface ChecklistBoxProps {
  state:     ChecklistState
  username:  string | null
  onDismiss: () => void
}

const ITEMS = [
  {
    key:   'playaHistory' as const,
    label: 'Playa History',
    desc:  'Connect with campmates to see what they have and need',
    where: 'Profile',
    href:  (username: string | null) => username ? `/profile/${username}` : '/profile',
  },
  {
    key:   'wishList' as const,
    label: 'Wish List',
    desc:  "Share what you're looking for so others can reach out",
    where: 'Profile',
    href:  (username: string | null) => username ? `/profile/${username}` : '/profile',
  },
  {
    key:   'locations' as const,
    label: 'Item Locations',
    desc:  'Home, storage unit, wherever your stuff lives',
    where: 'Settings',
    href:  (_: string | null) => '/settings',
  },
  {
    key:   'listedItem' as const,
    label: 'List an Item',
    desc:  'Choose who can view it or to keep it private',
    where: 'List Item',
    href:  (_: string | null) => '/list-item',
  },
  {
    key:   'browsed' as const,
    label: 'Browse Items',
    desc:  "See what's available to borrow or keep",
    where: 'Find Items',
    href:  (_: string | null) => '/find-items',
  },
]

export default function ChecklistBox({ state, username, onDismiss }: ChecklistBoxProps) {
  const router = useRouter()

  const completed = Object.values(state).filter(Boolean).length
  const total     = ITEMS.length

  // Auto-dismiss when all complete
  useEffect(() => {
    if (Object.values(state).every(Boolean)) {
      const t = setTimeout(onDismiss, 1200)
      return () => clearTimeout(t)
    }
  }, [state, onDismiss])

  return (
    <>
      <style>{`
        @keyframes checklistSlideDown {
          from { transform: translateY(-110%); }
          to   { transform: translateY(0); }
        }
        .cl-box-enter {
          transform: translateY(-110%);
          animation: checklistSlideDown 1.1s cubic-bezier(0.22, 1, 0.36, 1) 1s both;
        }
      `}</style>

      {/* Overlay — absolutely positioned over scrolling content */}
      <div style={{
        position: 'absolute' as const, inset: 0,
        display: 'flex', alignItems: 'center', justifyContent: 'center',
        padding: '0 38px',
        pointerEvents: 'none' as const,
        zIndex: 10,
      }}>
        <div
          className="cl-box-enter"
          style={{
            width: '100%',
            background: '#fff',
            border: '1.5px solid rgba(28,22,16,0.2)',
            padding: '16px 14px 12px',
            pointerEvents: 'all' as const,
          }}
        >
          {/* Header */}
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '12px' }}>
            <div>
              <div style={{ fontFamily: "'Arvo', serif", fontSize: '1rem', fontWeight: 700, color: INK }}>
                Getting Started
              </div>
              <div style={{ fontSize: '0.72rem', color: INK_LITE, marginTop: '2px' }}>
                {completed} of {total} complete
              </div>
            </div>
            <button
              onClick={onDismiss}
              style={{
                fontFamily: "'Space Mono', monospace", fontSize: '0.52rem', color: INK_LITE,
                background: 'none', border: 'none', cursor: 'pointer',
                letterSpacing: '0.06em', textTransform: 'uppercase' as const,
                whiteSpace: 'nowrap' as const, flexShrink: 0, marginLeft: '12px',
              }}
            >
              Skip ✕
            </button>
          </div>

          {/* Items */}
          {ITEMS.map((item, i) => {
            const done   = state[item.key]
            const isLast = i === ITEMS.length - 1
            return (
              <div
                key={item.key}
                onClick={() => router.push(item.href(username))}
                style={{
                  display: 'flex', alignItems: 'center', gap: '10px',
                  padding: '9px 0',
                  borderBottom: isLast ? 'none' : '1px solid rgba(28,22,16,0.08)',
                  cursor: 'pointer',
                }}
              >
                {/* Checkbox */}
                <div style={{
                  width: '18px', height: '18px', flexShrink: 0,
                  border: `2px solid ${done ? TEAL : INK}`,
                  background: done ? TEAL : '#FDFAF4',
                  display: 'flex', alignItems: 'center', justifyContent: 'center',
                }}>
                  {done && (
                    <span style={{ color: '#fff', fontSize: '0.7rem', fontWeight: 700, lineHeight: 1 }}>✓</span>
                  )}
                </div>

                {/* Text */}
                <div style={{ flex: 1 }}>
                  <div style={{
                    fontSize: '0.8rem', fontWeight: 700,
                    color: done ? INK_LITE : INK,
                    textDecoration: done ? 'line-through' : 'none',
                    textDecorationColor: 'rgba(28,22,16,0.25)',
                    lineHeight: 1.2,
                  }}>
                    {item.label}
                  </div>
                  <div style={{ fontSize: '0.74rem', color: done ? '#C4B8AC' : INK_LITE, lineHeight: 1.35, marginTop: '2px' }}>
                    {item.desc}
                  </div>
                </div>

                {/* Destination */}
                <span style={{
                  fontFamily: "'Space Mono', monospace", fontSize: '0.54rem', color: INK_LITE,
                  letterSpacing: '0.06em', textTransform: 'uppercase' as const,
                  flexShrink: 0, alignSelf: 'flex-start' as const, marginTop: '2px',
                }}>
                  {item.where} →
                </span>
              </div>
            )
          })}

          {/* Progress bar */}
          <div style={{ display: 'flex', alignItems: 'center', gap: '10px', marginTop: '10px', paddingTop: '8px', borderTop: '1px solid rgba(28,22,16,0.1)' }}>
            <div style={{ flex: 1, height: '3px', background: 'rgba(28,22,16,0.12)' }}>
              <div style={{ height: '100%', background: TEAL, width: `${(completed / total) * 100}%`, transition: 'width 0.3s ease' }} />
            </div>
            <span style={{ fontFamily: "'Space Mono', monospace", fontSize: '0.52rem', fontWeight: 700, color: INK_LITE, letterSpacing: '0.06em', whiteSpace: 'nowrap' as const }}>
              {completed} / {total}
            </span>
          </div>
        </div>
      </div>
    </>
  )
}
