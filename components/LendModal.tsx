'use client'

import React, { useState } from 'react'
import { supabase } from '@/lib/supabaseClient'

interface Props {
  item: {
    id: string
    item_name: string
    // terms pre-filled from the listing
    return_by?: string | null
    damage_price?: number | null
    loss_price?: number | null
    return_terms?: string | null
  }
  ownerId: string
  onClose: () => void
  onSuccess: () => void
}

export default function LendModal({ item, ownerId, onClose, onSuccess }: Props) {
  const [query, setQuery] = useState('')
  const [matched, setMatched] = useState<{ id: string; username: string; preferred_name: string | null } | null>(null)
  const [lookupError, setLookupError] = useState('')
  const [lastSearchWasEmail, setLastSearchWasEmail] = useState(false)
  const [showInformalForm, setShowInformalForm] = useState(false)
  const [informalName, setInformalName] = useState('')
  const [handedOverAt, setHandedOverAt] = useState(new Date().toISOString().slice(0, 10))
  const [returnBy, setReturnBy] = useState(item.return_by || '')
  const [damageAgreement, setDamageAgreement] = useState(item.damage_price != null ? String(item.damage_price) : '')
  const [lossAgreement, setLossAgreement] = useState(item.loss_price != null ? String(item.loss_price) : '')
  const [notes, setNotes] = useState(item.return_terms || '')
  const [submitting, setSubmitting] = useState(false)
  const [submitError, setSubmitError] = useState('')

  const handleLookup = async () => {
    setLookupError('')
    setMatched(null)
    const q = query.trim().toLowerCase()
    setLastSearchWasEmail(q.includes('@'))
    if (!q) return

    let data: { id: string; username: string; preferred_name: string | null } | null = null

    if (q.includes('@')) {
      // contact_email is the address a user has explicitly opted to be found
      // by (Settings: "Contact Email for Messaging") — once set, it fully
      // replaces their login email for lookup purposes. Login email is only
      // a fallback for accounts that never set one (treats '' as unset too).
      const byContact = await supabase.from('profiles').select('id, username, preferred_name').ilike('contact_email', q).maybeSingle()
      data = byContact.data
      if (!data) {
        const byLogin = await supabase.rpc('find_profile_by_login_email', { p_email: q }).maybeSingle()
        data = byLogin.data as { id: string; username: string; preferred_name: string | null } | null
      }
    } else {
      const byUsername = await supabase.from('profiles').select('id, username, preferred_name').eq('username', q).maybeSingle()
      data = byUsername.data
    }

    if (!data) {
      setLookupError("No account found. Make sure they're registered on The Playa Provides.")
    } else if (data.id === ownerId) {
      setLookupError("You can't lend an item to yourself.")
    } else {
      setMatched(data)
    }
  }

  const handleConfirm = async () => {
    if (!showInformalForm && !matched) return
    if (showInformalForm && !informalName.trim()) return
    setSubmitting(true)
    setSubmitError('')
    const sharedTerms = {
      return_by: returnBy || null,
      damage_agreement: damageAgreement ? parseFloat(damageAgreement) : null,
      loss_agreement: lossAgreement ? parseFloat(lossAgreement) : null,
      notes: notes || null,
    }
    try {
      if (showInformalForm) {
        const { data: informalLoan, error } = await supabase
          .from('informal_loans')
          .insert({
            item_id: item.id,
            owner_id: ownerId,
            borrower_name: informalName.trim(),
            borrower_email: query.trim().toLowerCase(),
            handed_over_at: handedOverAt,
            ...sharedTerms,
          })
          .select()
          .single()
        if (error) throw error

        await supabase.functions.invoke('send-informal-loan-invite', {
          body: { informal_loan_id: informalLoan.id },
        })
      } else {
        if (!matched) return
        const { data: loan, error } = await supabase
          .from('item_loans')
          .insert({
            item_id: item.id,
            owner_id: ownerId,
            borrower_id: matched.id,
            ...sharedTerms,
          })
          .select()
          .single()
        if (error) throw error

        await supabase.from('notifications').insert({
          type: 'loan_initiated',
          recipient_id: matched.id,
          actor_id: ownerId,
          item_id: item.id,
        })

        await supabase.functions.invoke('send-loan-notification', {
          body: { type: 'initiated', loan_id: loan.id },
        })
      }

      onSuccess()
    } catch (err: any) {
      setSubmitError(err.message || 'Something went wrong.')
      setSubmitting(false)
    }
  }

  const isConfirmDisabled = (!showInformalForm && !matched) || (showInformalForm && !informalName.trim()) || submitting

  return (
    <div style={overlayStyle}>
      <div style={modalStyle}>
        <button onClick={onClose} style={closeStyle}>✕</button>
        <h2 style={{ margin: '0 0 8px', color: '#1C1610', fontSize: '1.2rem' }}>Lend Item</h2>
        <p style={{ margin: '0 0 20px', color: '#666', fontSize: '0.9rem' }}>
          Enter the username or email of the person borrowing{' '}
          <a href={`/find-items/${item.id}`} target="_blank" rel="noreferrer" style={{ color: '#1E8A82', fontWeight: 700, textDecoration: 'none' }}>{item.item_name}</a>, then confirm the terms.
        </p>

        {/* Lookup */}
        {!showInformalForm && (
          <>
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
            {lookupError && (
              lastSearchWasEmail ? (
                <div style={noAccountBoxStyle}>
                  <p style={{ ...errorStyle, margin: 0 }}>{lookupError}</p>
                  <p style={{ margin: '6px 0 10px', fontSize: '0.85rem', color: '#666' }}>
                    Want to lend it to them anyway? We&apos;ll email them the details and an invite to join.
                  </p>
                  <button onClick={() => setShowInformalForm(true)} style={lendAnywayButtonStyle}>
                    Lend to them anyway →
                  </button>
                </div>
              ) : (
                <p style={errorStyle}>{lookupError}</p>
              )
            )}
          </>
        )}
        {showInformalForm && (
          <div style={{ marginBottom: '12px' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '10px' }}>
              <span style={{ fontSize: '0.85rem', color: '#666' }}>Lending to <strong>{query}</strong> (no account)</span>
              <button
                onClick={() => { setShowInformalForm(false); setInformalName(''); setLookupError(''); }}
                style={{ background: 'none', border: 'none', color: '#1E8A82', cursor: 'pointer', fontSize: '0.8rem', fontWeight: 600 }}
              >
                ← back to search
              </button>
            </div>
            <label style={labelStyle}>Their name</label>
            <input
              value={informalName}
              onChange={e => setInformalName(e.target.value)}
              placeholder="e.g. Jamie"
              style={inputStyle}
            />
            <label style={{ ...labelStyle, marginTop: '10px' }}>Handed over on</label>
            <input
              type="date"
              value={handedOverAt}
              onChange={e => setHandedOverAt(e.target.value)}
              style={inputStyle}
            />
          </div>
        )}
        {matched && (
          <div style={matchedBoxStyle}>
            <span style={{ color: '#1C1610', fontWeight: 600 }}>{matched.preferred_name || matched.username}</span>
            <span style={{ color: '#888', fontSize: '0.85rem', marginLeft: '6px' }}>@{matched.username}</span>
          </div>
        )}

        {/* Terms */}
        <p style={{ margin: '20px 0 10px', fontWeight: 700, color: '#1C1610', fontSize: '0.9rem' }}>Lending Terms</p>

        <div style={termsGridStyle}>
          <div>
            <label style={labelStyle}>Return by</label>
            <input type="date" value={returnBy} onChange={e => setReturnBy(e.target.value)} style={inputStyle} />
          </div>
          <div>
            <label style={labelStyle}>If Damaged ($)</label>
            <input type="number" min="0" value={damageAgreement} onChange={e => setDamageAgreement(e.target.value)} placeholder="0" style={inputStyle} />
          </div>
          <div>
            <label style={labelStyle}>If Not Returned ($)</label>
            <input type="number" min="0" value={lossAgreement} onChange={e => setLossAgreement(e.target.value)} placeholder="0" style={inputStyle} />
          </div>
        </div>

        <div style={{ marginTop: '10px' }}>
          <label style={labelStyle}>Notes</label>
          <textarea
            value={notes}
            onChange={e => setNotes(e.target.value)}
            rows={3}
            placeholder="e.g. Please clean before returning, no modifications"
            style={{ ...inputStyle, resize: 'vertical' as const }}
          />
        </div>

        {submitError && <p style={errorStyle}>{submitError}</p>}

        <div style={{ display: 'flex', gap: '10px', marginTop: '20px', justifyContent: 'flex-end' }}>
          <button onClick={onClose} style={cancelButtonStyle}>Cancel</button>
          <button
            onClick={handleConfirm}
            disabled={isConfirmDisabled}
            style={{ ...confirmButtonStyle, opacity: isConfirmDisabled ? 0.5 : 1 }}
          >
            {submitting ? 'Sending...' : showInformalForm ? 'Lend Item' : 'Confirm Loan'}
          </button>
        </div>
      </div>
    </div>
  )
}

const overlayStyle: React.CSSProperties = { position: 'fixed', inset: 0, backgroundColor: 'rgba(0,0,0,0.5)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 1000 }
const modalStyle: React.CSSProperties = { backgroundColor: '#fff', borderRadius: '16px', padding: '28px', width: '500px', maxWidth: '90vw', maxHeight: '90vh', overflowY: 'auto' as const, position: 'relative' as const, boxShadow: '0 8px 32px rgba(0,0,0,0.15)' }
const closeStyle: React.CSSProperties = { position: 'absolute' as const, top: '16px', right: '16px', background: 'none', border: 'none', fontSize: '1rem', cursor: 'pointer', color: '#888' }
const inputStyle: React.CSSProperties = { width: '100%', padding: '10px', border: '1px solid #ddd', borderRadius: '6px', fontSize: '0.9rem', color: '#1C1610', boxSizing: 'border-box' as const }
const lookupButtonStyle: React.CSSProperties = { padding: '10px 16px', backgroundColor: '#1C1610', color: '#fff', border: 'none', borderRadius: '6px', cursor: 'pointer', fontWeight: 600, fontSize: '0.9rem', whiteSpace: 'nowrap' as const }
const matchedBoxStyle: React.CSSProperties = { backgroundColor: '#f0fdf4', border: '1px solid #bbf7d0', borderRadius: '8px', padding: '10px 14px', marginBottom: '4px' }
const errorStyle: React.CSSProperties = { color: '#dc2626', fontSize: '0.85rem', margin: '4px 0' }
const noAccountBoxStyle: React.CSSProperties = { backgroundColor: '#fef6f6', border: '1px solid #fecaca', borderRadius: '8px', padding: '12px 14px', marginBottom: '12px' }
const lendAnywayButtonStyle: React.CSSProperties = { width: '100%', padding: '9px 14px', backgroundColor: 'transparent', color: '#1E8A82', border: '1.5px solid #1E8A82', borderRadius: '6px', cursor: 'pointer', fontWeight: 600, fontSize: '0.85rem' }
const cancelButtonStyle: React.CSSProperties = { padding: '10px 18px', backgroundColor: '#f0f0f0', color: '#666', border: 'none', borderRadius: '6px', cursor: 'pointer', fontWeight: 600 }
const confirmButtonStyle: React.CSSProperties = { padding: '10px 18px', backgroundColor: '#1E8A82', color: '#fff', border: 'none', borderRadius: '6px', cursor: 'pointer', fontWeight: 600 }
const termsGridStyle: React.CSSProperties = { display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: '12px' }
const labelStyle: React.CSSProperties = { display: 'block', fontSize: '0.75rem', color: '#888', marginBottom: '5px' }
