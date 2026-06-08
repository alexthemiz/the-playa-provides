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
  const lines: string[] = [];
  lines.push(`To: ${ownerName}${ownerUsername ? `, @${ownerUsername}` : ''}`);
  lines.push(`Item: ${itemName}`);
  if (returnBy) lines.push(`Return by: ${new Date(returnBy).toLocaleDateString()}`);
  const fees: string[] = [];
  if (damagePrice) fees.push(`If damaged: $${damagePrice}`);
  if (lossPrice) fees.push(`If not returned: $${lossPrice}`);
  if (fees.length) lines.push(fees.join(', '));
  lines.push('');
  lines.push(`Hi! I'm interested in your ${itemName}.`);
  lines.push('');
  lines.push("I've reviewed the terms above and:");
  lines.push('Accept: [ ]');
  lines.push('Counter: [ ] ______');
  lines.push('');
  lines.push('');
  lines.push('Thank you!');
  lines.push(requesterName || '');
  if (requesterUsername) lines.push(`@${requesterUsername}`);
  lines.push('');
  lines.push(`theplayaprovides.com/find-items/${itemId}`);
  return lines.join('\n');
}

function buildKeepMessage(itemName: string, requesterName: string, requesterUsername: string, itemId: number | string): string {
  return `Hi! I'm interested in your ${itemName}. Is it still available?\n\n\nThank you!\n${requesterName || ''}${requesterUsername ? `\n@${requesterUsername}` : ''}\n\ntheplayaprovides.com/find-items/${itemId}`;
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
        setMessage(buildKeepMessage(item.item_name, rName, rUsername, item.id));
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
      const fullMessage = pickupDate
        ? `Pick up by: ${new Date(pickupDate + 'T12:00:00').toLocaleDateString()}\n\n${message}`
        : message;

      const { error } = await supabase.functions.invoke('send-request-email', {
        body: { itemId: item.id, ownerId: item.user_id, message: fullMessage, itemName: item.item_name, requesterName, requesterEmail },
      });

      if (error) throw error;
      setSent(true);
      if (requesterId) {
        supabase.from('notifications').insert({ type: 'item_request', recipient_id: item.user_id, actor_id: requesterId, item_id: item.id });
      }
      setTimeout(() => onClose(), 2000);
    } catch (err) {
      console.error('Error:', err);
      setSendError('Something went wrong. Please try again.');
    } finally {
      setSending(false);
    }
  };

  return (
    <div style={overlayStyle} onClick={onClose}>
      <div style={modalStyle} onClick={e => e.stopPropagation()}>

        {/* Header */}
        <div style={headerRowStyle}>
          <h2 style={titleStyle}>
            {isKeep ? 'Request to Keep' : 'Request to Borrow'}:{' '}
            <span style={{ fontStyle: 'italic' as const }}>{item.item_name}</span>
          </h2>
          <button onClick={onClose} style={closeBtnStyle}><X size={18} /></button>
        </div>

        {sent ? (
          <div style={{ padding: '40px 0', textAlign: 'center' as const }}>
            <div style={{ width: 56, height: 56, borderRadius: '50%', backgroundColor: '#d1fae5', display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto 16px' }}>
              <Send size={24} color="#059669" />
            </div>
            <p style={{ fontWeight: 700, fontSize: '1.1rem', color: INK, margin: '0 0 6px' }}>Message Sent!</p>
            <p style={{ color: '#888', fontSize: '0.88rem', margin: 0 }}>The owner will receive an email shortly.</p>
          </div>
        ) : (
          <>
            {/* Owner info row */}
            <div style={ownerRowStyle}>
              <span style={metaLabelStyle}>From:</span>
              <span style={{ color: INK, fontSize: '0.88rem' }}>
                {ownerName}{ownerUsername && <span style={{ color: '#888' }}> @{ownerUsername}</span>}
              </span>
            </div>

            {/* Borrow-only: damage/loss + return by + pick up date */}
            {!isKeep && (
              <>
                {(item.damage_price || item.loss_price) && (
                  <div style={termsRowStyle}>
                    {item.damage_price && (
                      <span style={termPillStyle}>If damaged: <strong>${Math.round(item.damage_price)}</strong></span>
                    )}
                    {item.loss_price && (
                      <span style={termPillStyle}>If not returned: <strong>${Math.round(item.loss_price)}</strong></span>
                    )}
                  </div>
                )}

                <div style={dateRowStyle}>
                  {item.return_by && (
                    <div style={dateHalfStyle}>
                      <span style={metaLabelStyle}>Return by</span>
                      <span style={{ fontSize: '0.88rem', color: INK, fontWeight: 600 }}>
                        {new Date(item.return_by).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })}
                      </span>
                    </div>
                  )}
                  <div style={dateHalfStyle}>
                    <label style={metaLabelStyle}>Pick up by</label>
                    <input
                      type="date"
                      value={pickupDate}
                      onChange={e => setPickupDate(e.target.value)}
                      style={dateInputStyle}
                    />
                  </div>
                </div>

                {item.return_terms && (
                  <p style={returnTermsStyle}>"{item.return_terms}"</p>
                )}
              </>
            )}

            {/* Message box */}
            <label style={{ ...metaLabelStyle, display: 'block', marginBottom: '6px' }}>Message to owner</label>
            <textarea
              value={message}
              onChange={e => setMessage(e.target.value)}
              style={textareaStyle}
            />

            {sendError && (
              <p style={{ color: '#ef4444', fontSize: '0.82rem', marginTop: '8px', textAlign: 'center' as const }}>{sendError}</p>
            )}

            <button
              onClick={handleSendRequest}
              disabled={sending || !message.trim()}
              style={{ ...sendBtnStyle, opacity: sending || !message.trim() ? 0.5 : 1 }}
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
  backgroundColor: PAPER, border: `2px solid ${INK}`, boxShadow: `5px 5px 0 ${INK}`,
  width: '100%', maxWidth: '480px', maxHeight: '90vh', overflowY: 'auto', padding: '24px',
  display: 'flex', flexDirection: 'column' as const, gap: '14px',
};
const headerRowStyle: React.CSSProperties = {
  display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: '12px',
};
const titleStyle: React.CSSProperties = {
  fontFamily: "'Arvo', serif", fontSize: '1.1rem', fontWeight: 700, color: INK,
  margin: 0, lineHeight: 1.3,
};
const closeBtnStyle: React.CSSProperties = {
  background: 'none', border: 'none', cursor: 'pointer', color: '#888',
  padding: '2px', flexShrink: 0, display: 'flex', alignItems: 'center',
};
const ownerRowStyle: React.CSSProperties = {
  display: 'flex', alignItems: 'center', gap: '8px',
  borderBottom: `1px solid rgba(28,22,16,0.12)`, paddingBottom: '12px',
};
const metaLabelStyle: React.CSSProperties = {
  fontFamily: "'Space Mono', monospace", fontSize: '0.6rem', fontWeight: 700,
  letterSpacing: '0.08em', textTransform: 'uppercase' as const, color: '#888',
};
const termsRowStyle: React.CSSProperties = {
  display: 'flex', gap: '10px', flexWrap: 'wrap' as const,
};
const termPillStyle: React.CSSProperties = {
  fontSize: '0.82rem', color: INK, backgroundColor: PAPER_DK,
  padding: '4px 10px', border: `1px solid rgba(28,22,16,0.15)`,
};
const dateRowStyle: React.CSSProperties = {
  display: 'flex', gap: '12px',
};
const dateHalfStyle: React.CSSProperties = {
  flex: 1, display: 'flex', flexDirection: 'column' as const, gap: '4px',
};
const dateInputStyle: React.CSSProperties = {
  width: '100%', border: `1.5px solid rgba(28,22,16,0.25)`, backgroundColor: '#fff',
  padding: '6px 8px', fontSize: '0.85rem', color: INK, outline: 'none',
  fontFamily: 'inherit', boxSizing: 'border-box' as const,
};
const returnTermsStyle: React.CSSProperties = {
  fontSize: '0.82rem', color: '#666', fontStyle: 'italic' as const,
  margin: 0, paddingLeft: '8px', borderLeft: `2px solid ${PAPER_DK}`,
};
const textareaStyle: React.CSSProperties = {
  width: '100%', minHeight: '260px', border: `1.5px solid rgba(28,22,16,0.25)`,
  backgroundColor: '#fff', padding: '10px 12px', fontSize: '0.83rem',
  color: INK, fontFamily: "'Courier New', monospace", lineHeight: 1.6,
  resize: 'vertical' as const, outline: 'none', boxSizing: 'border-box' as const,
};
const sendBtnStyle: React.CSSProperties = {
  width: '100%', padding: '12px', backgroundColor: TEAL, color: '#fff',
  border: `2px solid ${INK}`, boxShadow: `3px 3px 0 ${INK}`,
  fontWeight: 700, fontSize: '0.95rem', cursor: 'pointer',
  fontFamily: 'Outfit, sans-serif',
};
