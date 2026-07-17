'use client';
import { useState, useEffect } from 'react';
import { supabase } from '@/lib/supabaseClient';
import { X, Send } from 'lucide-react';

interface RequestModalProps {
  item: any;
  onClose: () => void;
}

const INK   = '#1C1610';
const TEAL  = '#1E8A82';
const PAPER = '#FDFAF4';
const PAPER_DK = '#EDE5D0';

function buildMessage({
  ownerName, ownerUsername, requesterName, requesterUsername,
  itemName, itemId, returnBy, damagePrice, lossPrice,
}: {
  ownerName: string; ownerUsername: string;
  requesterName: string; requesterUsername: string;
  itemName: string; itemId: number | string;
  returnBy: string | null; damagePrice: number | null; lossPrice: number | null;
}): string {
  const hasTerms = !!(returnBy || damagePrice || lossPrice);
  const lines: string[] = [];
  lines.push(`To: ${ownerName}${ownerUsername ? ` (@${ownerUsername})` : ''}`);
  lines.push(`Item: ${itemName} (theplayaprovides.com/find-items/${itemId})`);
  if (returnBy) lines.push(`Return by: ${new Date(returnBy).toLocaleDateString()}`);
  const fees: string[] = [];
  if (damagePrice) fees.push(`If damaged: $${damagePrice}`);
  if (lossPrice) fees.push(`If not returned: $${lossPrice}`);
  if (fees.length) lines.push(fees.join(', '));
  lines.push('');
  lines.push(`Hi! I'm interested in your ${itemName}.`);
  lines.push('');
  if (hasTerms) {
    lines.push("I've reviewed the terms above and:");
    lines.push('Accept: [ ]');
    lines.push('Counter: [ ] ______');
    lines.push('');
  }
  lines.push('');
  lines.push('Thank you!');
  lines.push(requesterName || '');
  if (requesterUsername) lines.push(`theplayaprovides.com/profile/${requesterUsername}`);
  return lines.join('\n');
}

function buildKeepMessage(itemName: string, ownerName: string, ownerUsername: string, requesterName: string, requesterUsername: string, itemId: number | string): string {
  const lines: string[] = [];
  lines.push(`To: ${ownerName}${ownerUsername ? ` (@${ownerUsername})` : ''}`);
  lines.push(`Item: ${itemName} (theplayaprovides.com/find-items/${itemId})`);
  lines.push('');
  lines.push(`Hi! I'm interested in your ${itemName}. Is it still available?`);
  lines.push('');
  lines.push('');
  lines.push('Thank you!');
  lines.push(requesterName || '');
  if (requesterUsername) lines.push(`theplayaprovides.com/profile/${requesterUsername}`);
  return lines.join('\n');
}

export default function RequestModal({ item, onClose }: RequestModalProps) {
  const isKeep = item.availability_status === 'Available to Keep';

  const [message, setMessage] = useState('');
  const [pickupDate, setPickupDate] = useState('');
  const [sending, setSending] = useState(false);
  const [sent, setSent] = useState(false);
  const [sendError, setSendError] = useState('');
  const [requesterName, setRequesterName] = useState('');
  const [requesterEmail, setRequesterEmail] = useState('');
  const [requesterId, setRequesterId] = useState('');
  const [requesterUsername, setRequesterUsername] = useState('');
  const [ownerName, setOwnerName] = useState(item.owner_name || '');
  const [ownerUsername, setOwnerUsername] = useState(item.owner_username || '');

  useEffect(() => {
    async function loadData() {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;
      setRequesterEmail(user.email || '');
      setRequesterId(user.id);

      const [requesterRes, ownerRes] = await Promise.all([
        supabase.from('profiles').select('preferred_name, username, contact_email').eq('id', user.id).maybeSingle(),
        item.owner_username
          ? Promise.resolve({ data: { preferred_name: item.owner_name, username: item.owner_username } })
          : supabase.from('profiles').select('preferred_name, username').eq('id', item.user_id).maybeSingle(),
      ]);

      const rName = requesterRes.data?.preferred_name || '';
      const rUsername = requesterRes.data?.username || '';
      const oName = ownerRes.data?.preferred_name || ownerName;
      const oUsername = ownerRes.data?.username || '';

      if (requesterRes.data?.contact_email) setRequesterEmail(requesterRes.data.contact_email);
      setRequesterName(rName);
      setRequesterUsername(rUsername);
      setOwnerName(oName);
      setOwnerUsername(oUsername);

      if (isKeep) {
        setMessage(buildKeepMessage(item.item_name, oName, oUsername, rName, rUsername, item.id));
      } else {
        setMessage(buildMessage({
          ownerName: oName, ownerUsername: oUsername,
          requesterName: rName, requesterUsername: rUsername,
          itemName: item.item_name, itemId: item.id,
          returnBy: item.return_by || null,
          damagePrice: item.damage_price || null,
          lossPrice: item.loss_price || null,
        }));
      }
    }
    loadData();
  }, []);

  const handleSendRequest = async () => {
    setSending(true);
    setSendError('');
    try {
      let fullMessage = message;
      if (pickupDate) {
        const pickupLine = `Pick up by: ${new Date(pickupDate + 'T12:00:00').toLocaleDateString()}`;
        const firstBlank = fullMessage.indexOf('\n\n');
        fullMessage = firstBlank !== -1
          ? fullMessage.slice(0, firstBlank) + '\n' + pickupLine + fullMessage.slice(firstBlank)
          : pickupLine + '\n\n' + fullMessage;
      }

      const { error } = await supabase.functions.invoke('send-request-email', {
        body: { itemId: item.id, ownerId: item.user_id, message: fullMessage, itemName: item.item_name, requesterName, requesterUsername, requesterEmail },
      });

      if (error) throw error;
      setSent(true);
      if (requesterId) {
        const { error: notifErr } = await supabase.from('notifications').insert({ type: 'item_request', recipient_id: item.user_id, actor_id: requesterId, item_id: item.id });
        if (notifErr) console.error('item_request notification insert failed:', notifErr.message);
      }
      setTimeout(() => onClose(), 2000);
    } catch (err) {
      console.error('Error:', err);
      setSendError('Something went wrong. Please try again.');
    } finally {
      setSending(false);
    }
  };

  const hasTerms = !isKeep && !!(item.return_by || item.damage_price || item.loss_price);
  const locationDisplay: string = item.location_display ||
    (item.locations ? [item.locations.city, item.locations.zip_code].filter(Boolean).join(' ') : '') ||
    '—';

  return (
    <div style={overlayStyle} onClick={onClose}>
      <div style={modalStyle} onClick={e => e.stopPropagation()}>

        {/* Header */}
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: '12px', paddingBottom: '16px', borderBottom: `1px solid rgba(28,22,16,0.12)` }}>
          <div>
            <p style={{ fontFamily: "'Space Mono', monospace", fontSize: '0.58rem', fontWeight: 700, letterSpacing: '0.1em', textTransform: 'uppercase' as const, color: '#888', margin: '0 0 4px' }}>
              {isKeep ? 'Request to Keep' : 'Request to Borrow'}
            </p>
            <h2 style={{ fontFamily: "'Arvo', serif", fontSize: '1.15rem', fontWeight: 700, color: INK, margin: 0, lineHeight: 1.3 }}>
              {item.item_name}
            </h2>
          </div>
          <button onClick={onClose} style={{ background: 'none', border: 'none', cursor: 'pointer', color: '#888', padding: '2px', flexShrink: 0, display: 'flex', alignItems: 'center' }}>
            <X size={18} />
          </button>
        </div>

        {sent ? (
          <div style={{ padding: '40px 0', textAlign: 'center' as const }}>
            <div style={{ width: 52, height: 52, borderRadius: '50%', backgroundColor: '#d1fae5', display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto 14px' }}>
              <Send size={22} color="#059669" />
            </div>
            <p style={{ fontWeight: 700, fontSize: '1rem', color: INK, margin: '0 0 4px' }}>Message Sent!</p>
            <p style={{ color: '#888', fontSize: '0.85rem', margin: 0 }}>The owner will receive an email shortly.</p>
          </div>
        ) : (
          <>
            {/* Borrow-only: terms block */}
            {!isKeep && (
              <div style={{ backgroundColor: PAPER_DK, border: `1px solid rgba(28,22,16,0.12)`, padding: '12px 14px', display: 'flex', flexDirection: 'column' as const, gap: '10px' }}>
                {/* Row 1: Posted by | If damaged | If not returned */}
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: '0 16px' }}>
                  <div style={cellStyle}>
                    <span style={metaLabelStyle}>Posted by</span>
                    {ownerUsername
                      ? <a href={`/profile/${ownerUsername}`} target="_blank" rel="noreferrer" style={{ fontSize: '0.88rem', color: TEAL, fontWeight: 600, textDecoration: 'none' }}>@{ownerUsername}</a>
                      : <span style={{ fontSize: '0.88rem', color: INK, fontWeight: 600 }}>{ownerName || '—'}</span>
                    }
                  </div>
                  <div style={cellStyle}>
                    <span style={metaLabelStyle}>If damaged</span>
                    <span style={{ fontSize: '0.88rem', color: INK, fontWeight: 600 }}>
                      {item.damage_price ? `$${Math.round(item.damage_price)}` : <span style={{ color: '#aaa', fontWeight: 400 }}>—</span>}
                    </span>
                  </div>
                  <div style={cellStyle}>
                    <span style={metaLabelStyle}>If not returned</span>
                    <span style={{ fontSize: '0.88rem', color: INK, fontWeight: 600 }}>
                      {item.loss_price ? `$${Math.round(item.loss_price)}` : <span style={{ color: '#aaa', fontWeight: 400 }}>—</span>}
                    </span>
                  </div>
                </div>
                {/* Row 2: Pick up by (input) | Return by (display) | Item Location */}
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: '0 16px', paddingTop: '10px', borderTop: `1px solid rgba(28,22,16,0.1)` }}>
                  <div style={cellStyle}>
                    <label style={metaLabelStyle}>Pick up by</label>
                    <input
                      type="date"
                      value={pickupDate}
                      onChange={e => setPickupDate(e.target.value)}
                      style={{ width: '100%', border: `1px solid rgba(28,22,16,0.2)`, backgroundColor: '#fff', padding: '5px 7px', fontSize: '0.82rem', color: INK, outline: 'none', fontFamily: 'inherit', boxSizing: 'border-box' as const }}
                    />
                  </div>
                  <div style={cellStyle}>
                    <span style={metaLabelStyle}>Return by</span>
                    <span style={{ fontSize: '0.88rem', color: INK, fontWeight: 600 }}>
                      {item.return_by
                        ? new Date(item.return_by).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })
                        : <span style={{ color: '#aaa', fontWeight: 400 }}>—</span>}
                    </span>
                  </div>
                  <div style={cellStyle}>
                    <span style={metaLabelStyle}>Item Location</span>
                    <span style={{ fontSize: '0.88rem', color: INK, fontWeight: 600 }}>{locationDisplay}</span>
                  </div>
                </div>
              </div>
            )}

            {/* Keep-only: posted by + location */}
            {isKeep && (
              <div style={{ backgroundColor: PAPER_DK, border: `1px solid rgba(28,22,16,0.12)`, padding: '12px 14px', display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0 16px' }}>
                <div style={cellStyle}>
                  <span style={metaLabelStyle}>Posted by</span>
                  {ownerUsername
                    ? <a href={`/profile/${ownerUsername}`} target="_blank" rel="noreferrer" style={{ fontSize: '0.88rem', color: TEAL, fontWeight: 600, textDecoration: 'none' }}>@{ownerUsername}</a>
                    : <span style={{ fontSize: '0.88rem', color: INK, fontWeight: 600 }}>{ownerName || '—'}</span>
                  }
                </div>
                <div style={cellStyle}>
                  <span style={metaLabelStyle}>Item Location</span>
                  <span style={{ fontSize: '0.88rem', color: INK, fontWeight: 600 }}>{locationDisplay}</span>
                </div>
              </div>
            )}

            {/* Return condition quote */}
            {!isKeep && item.return_terms && (
              <p style={{ fontSize: '0.82rem', color: '#666', fontStyle: 'italic' as const, margin: 0, paddingLeft: '10px', borderLeft: `2px solid ${PAPER_DK}` }}>
                &ldquo;{item.return_terms}&rdquo;
              </p>
            )}

            {/* Message box */}
            <div>
              <label style={{ ...metaLabelStyle, display: 'block', marginBottom: '6px' }}>Message to owner</label>
              <textarea
                value={message}
                onChange={e => setMessage(e.target.value)}
                style={{ width: '100%', minHeight: '260px', border: `1.5px solid rgba(28,22,16,0.2)`, backgroundColor: '#fff', padding: '12px', fontSize: '0.85rem', color: INK, fontFamily: 'Outfit, sans-serif', lineHeight: 1.65, resize: 'vertical' as const, outline: 'none', boxSizing: 'border-box' as const }}
              />
            </div>

            {sendError && (
              <p style={{ color: '#ef4444', fontSize: '0.82rem', margin: 0, textAlign: 'center' as const }}>{sendError}</p>
            )}

            <button
              onClick={handleSendRequest}
              disabled={sending || !message.trim()}
              style={{ width: '100%', padding: '12px', backgroundColor: TEAL, color: '#fff', border: `2px solid ${INK}`, boxShadow: `3px 3px 0 ${INK}`, fontWeight: 700, fontSize: '0.95rem', cursor: 'pointer', fontFamily: 'Outfit, sans-serif', opacity: sending || !message.trim() ? 0.5 : 1 }}
            >
              {sending ? 'Sending…' : 'Send Request'}
            </button>
          </>
        )}
      </div>
    </div>
  );
}

// ── Styles ──────────────────────────────────────────────────────────────────

const overlayStyle: React.CSSProperties = {
  position: 'fixed', inset: 0, backgroundColor: 'rgba(0,0,0,0.5)',
  backdropFilter: 'blur(4px)', display: 'flex', alignItems: 'center',
  justifyContent: 'center', padding: '16px', zIndex: 2000,
};
const modalStyle: React.CSSProperties = {
  backgroundColor: '#fff', border: `2px solid ${INK}`, boxShadow: `5px 5px 0 ${INK}`,
  width: '100%', maxWidth: '480px', maxHeight: '90vh', overflowY: 'auto', padding: '24px',
  display: 'flex', flexDirection: 'column' as const, gap: '16px',
};
const metaLabelStyle: React.CSSProperties = {
  fontFamily: "'Space Mono', monospace", fontSize: '0.58rem', fontWeight: 700,
  letterSpacing: '0.08em', textTransform: 'uppercase' as const, color: '#888',
};
const cellStyle: React.CSSProperties = {
  display: 'flex', flexDirection: 'column' as const, gap: '4px',
};
