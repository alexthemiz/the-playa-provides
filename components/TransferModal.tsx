'use client'

import React, { useState } from 'react'
import { supabase } from '@/lib/supabaseClient'

interface Props {
  item: { id: string; item_name: string }
  ownerId: string
  onClose: () => void
  onSuccess: () => void
}

export default function TransferModal({ item, ownerId, onClose, onSuccess }: Props) {
  const [query, setQuery] = useState('')
  const [matched, setMatched] = useState<{ id: string; username: string; preferred_name: string | null } | null>(null)
  const [lookupError, setLookupError] = useState('')
  const [submitting, setSubmitting] = useState(false)
  const [submitError, setSubmitError] = useState('')

  const handleLookup = async () => {
    setLookupError('')
    setMatched(null)
    if (!query.trim()) return
    const isEmail = query.includes('@')
    let profileQuery = supabase.from('profiles').select('id, username, preferred_name')
    if (isEmail) {
      profileQuery = profileQuery.eq('contact_email', query.trim().toLowerCase())
    } else {
      profileQuery = profileQuery.eq('username', query.trim().toLowerCase())
    }
    const { data } = await profileQuery.maybeSingle()
    if (!data) {
      setLookupError("No account found. Make sure they're registered on The Playa Provides.")
    } else if (data.id === ownerId) {
      setLookupError("You can't transfer an item to yourself.")
    } else {
      setMatched(data)
    }
  }

  const handleConfirm = async () => {
    if (!matched) return
    setSubmitting(true)
    setSubmitError('')
    try {
      const { data: transfer, error } = await supabase
        .from('item_transfers')
        .insert({
          item_id: item.id,
          owner_id: ownerId,
          recipient_id: matched.id,
        })
        .select()
        .single()
      if (error) throw error

      await supabase.functions.invoke('send-transfer-notification', {
        body: { type: 'initiated', transfer_id: transfer.id },
      })

      onSuccess()
    } catch (err: any) {
      setSubmitError(err.message || 'Something went wrong.')
      setSubmitting(false)
    }
  }

  return (
    <div style={overlayStyle}>
      <div style={modalStyle}>
        <button onClick={onClose} style={closeStyle}>✕</button>
        <h2 style={{ margin: '0 0 8px', color: '#2D241E', fontSize: '1.2rem' }}>Transfer Item</h2>
        <p style={{ margin: '0 0 20px', color: '#666', fontSize: '0.9rem' }}>
          Enter the username or email of the person you're giving <strong>{item.item_name}</strong> to.
        </p>

        <div style={{ display: 'flex', gap: '8px', marginBottom: '12px' }}>
          <input
            value={query}
            onChange={e => { setQuery(e.target.value); setMatched(null); setLookupError('') }}
            onKeyDown={e => e.key === 'Enter' && handleLookup()}
            placeholder="username or email"
            style={inputStyle}
          />
          <button onClick={handleLookup} style={lookupButtonStyle}>Find</button>
        </div>

        {lookupError && <p style={errorStyle}>{lookupError}</p>}

        {matched && (
          <div style={matchedBoxStyle}>
            <span style={{ color: '#2D241E', fontWeight: 600 }}>
              {matched.preferred_name || matched.username}
            </span>
            <span style={{ color: '#888', fontSize: '0.85rem', marginLeft: '6px' }}>@{matched.username}</span>
          </div>
        )}

        {submitError && <p style={errorStyle}>{submitError}</p>}

        <div style={{ display: 'flex', gap: '10px', marginTop: '20px', justifyContent: 'flex-end' }}>
          <button onClick={onClose} style={cancelButtonStyle}>Cancel</button>
          <button
            onClick={handleConfirm}
            disabled={!matched || submitting}
            style={{ ...confirmButtonStyle, opacity: (!matched || submitting) ? 0.5 : 1 }}
          >
            {submitting ? 'Sending...' : 'Confirm Transfer'}
          </button>
        </div>
      </div>
    </div>
  )
}

const overlayStyle: React.CSSProperties = { position: 'fixed', inset: 0, backgroundColor: 'rgba(0,0,0,0.5)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 1000 }
const modalStyle: React.CSSProperties = { backgroundColor: '#fff', borderRadius: '16px', padding: '28px', width: '440px', maxWidth: '90vw', position: 'relative' as const, boxShadow: '0 8px 32px rgba(0,0,0,0.15)' }
const closeStyle: React.CSSProperties = { position: 'absolute' as const, top: '16px', right: '16px', background: 'none', border: 'none', fontSize: '1rem', cursor: 'pointer', color: '#888' }
const inputStyle: React.CSSProperties = { flex: 1, padding: '10px', border: '1px solid #ddd', borderRadius: '6px', fontSize: '0.9rem', color: '#2D241E' }
const lookupButtonStyle: React.CSSProperties = { padding: '10px 16px', backgroundColor: '#2D241E', color: '#fff', border: 'none', borderRadius: '6px', cursor: 'pointer', fontWeight: 600, fontSize: '0.9rem' }
const matchedBoxStyle: React.CSSProperties = { backgroundColor: '#f0fdf4', border: '1px solid #bbf7d0', borderRadius: '8px', padding: '10px 14px', marginBottom: '4px' }
const errorStyle: React.CSSProperties = { color: '#dc2626', fontSize: '0.85rem', margin: '4px 0' }
const cancelButtonStyle: React.CSSProperties = { padding: '10px 18px', backgroundColor: '#f0f0f0', color: '#666', border: 'none', borderRadius: '6px', cursor: 'pointer', fontWeight: 600 }
const confirmButtonStyle: React.CSSProperties = { padding: '10px 18px', backgroundColor: '#C08261', color: '#fff', border: 'none', borderRadius: '6px', cursor: 'pointer', fontWeight: 600 }
