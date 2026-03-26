'use client';

import { useState, useEffect } from 'react';
import { supabase } from '@/lib/supabaseClient';

interface Props {
  profile: {
    id: string;
    preferred_name?: string | null;
    username: string;
    contact_email?: string | null;
  };
  wishTags: string[];
  currentUserId: string;
  onClose: () => void;
}

export default function WishListMatchModal({ profile, wishTags, currentUserId, onClose }: Props) {
  const [myItems, setMyItems] = useState<any[]>([]);
  const [selectedTags, setSelectedTags] = useState<Set<string>>(new Set());
  const [selectedItemNames, setSelectedItemNames] = useState<Set<string>>(new Set());
  const [note, setNote] = useState('');
  const [sending, setSending] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState(false);

  const recipientName = profile.preferred_name || profile.username;

  useEffect(() => {
    async function fetchMyInventory() {
      const { data } = await supabase
        .from('gear_items')
        .select('id, item_name')
        .eq('user_id', currentUserId)
        .order('item_name', { ascending: true });
      setMyItems(data || []);
    }
    fetchMyInventory();
  }, [currentUserId]);

  const toggleTag = (tag: string) => {
    setSelectedTags(prev => {
      const next = new Set(prev);
      next.has(tag) ? next.delete(tag) : next.add(tag);
      return next;
    });
  };

  const toggleItem = (name: string) => {
    setSelectedItemNames(prev => {
      const next = new Set(prev);
      next.has(name) ? next.delete(name) : next.add(name);
      return next;
    });
  };

  const allSelected = [...selectedTags, ...selectedItemNames];
  const canSend = allSelected.length > 0 && !sending;

  const handleSend = async () => {
    setSending(true);
    setError('');
    try {
      // Fetch sender info for the notification and email
      const { data: senderProfile } = await supabase
        .from('profiles')
        .select('username, preferred_name')
        .eq('id', currentUserId)
        .single();

      const senderName = senderProfile?.preferred_name || senderProfile?.username || 'Someone';
      const senderUsername = senderProfile?.username || '';

      // Insert notification
      const { error: notifErr } = await supabase.from('notifications').insert({
        type: 'wish_list_match',
        recipient_id: profile.id,
        actor_id: currentUserId,
        item_id: null,
        meta: { items: allSelected, note: note.trim() || null },
      });
      if (notifErr) throw new Error(notifErr.message);

      // Fire-and-forget email
      supabase.functions.invoke('send-wish-list-match-email', {
        body: {
          recipientId: profile.id,
          senderName,
          senderUsername,
          selectedItems: allSelected,
          note: note.trim() || null,
        },
      }).catch(() => {});

      setSuccess(true);
    } catch (err: any) {
      setError(err.message || 'Something went wrong.');
    } finally {
      setSending(false);
    }
  };

  return (
    <div style={overlayStyle}>
      <div style={modalStyle}>
        <button onClick={onClose} style={closeStyle}>✕</button>

        {success ? (
          <div style={{ textAlign: 'center' as const, padding: '20px 0' }}>
            <p style={{ fontSize: '1.4rem', marginBottom: '8px' }}>🎉</p>
            <p style={{ fontWeight: 700, fontSize: '1.05rem', color: '#2D241E', margin: '0 0 8px' }}>
              Message sent to {recipientName}!
            </p>
            <p style={{ fontSize: '0.9rem', color: '#777', margin: 0 }}>
              They'll get a notification and an email. The playa provides!
            </p>
          </div>
        ) : (
          <>
            <h2 style={{ margin: '0 0 4px', color: '#2D241E', fontSize: '1.15rem', paddingRight: '24px' }}>
              Let {recipientName} know what you have
            </h2>
            <p style={{ margin: '0 0 20px', color: '#888', fontSize: '0.85rem' }}>
              Select the items from their wish list that you have, or choose from your inventory.
            </p>

            {/* Wish list tag checkboxes */}
            <p style={sectionLabelStyle}>Their wish list</p>
            <div style={{ display: 'flex', flexDirection: 'column' as const, gap: '8px', marginBottom: '20px' }}>
              {wishTags.map(tag => (
                <label key={tag} style={checkRowStyle}>
                  <input
                    type="checkbox"
                    checked={selectedTags.has(tag)}
                    onChange={() => toggleTag(tag)}
                    style={{ accentColor: '#5ECFDF', width: '15px', height: '15px', flexShrink: 0 }}
                  />
                  <span style={{ fontSize: '0.95rem', color: '#2D241E' }}>{tag}</span>
                </label>
              ))}
            </div>

            {/* Inventory items */}
            <p style={sectionLabelStyle}>
              Or select from your inventory
              <a
                href="/list-item"
                target="_blank"
                rel="noopener noreferrer"
                style={{ marginLeft: '10px', fontSize: '0.78rem', color: '#00aacc', textDecoration: 'none', fontWeight: 600 }}
              >
                + Add Item to Inventory
              </a>
            </p>
            {myItems.length === 0 ? (
              <p style={{ fontSize: '0.85rem', color: '#aaa', fontStyle: 'italic' as const, marginBottom: '20px' }}>
                No items in your inventory yet.
              </p>
            ) : (
              <div style={{ display: 'flex', flexDirection: 'column' as const, gap: '8px', marginBottom: '20px', maxHeight: '180px', overflowY: 'auto' as const, paddingRight: '4px' }}>
                {myItems.map(item => (
                  <label key={item.id} style={checkRowStyle}>
                    <input
                      type="checkbox"
                      checked={selectedItemNames.has(item.item_name)}
                      onChange={() => toggleItem(item.item_name)}
                      style={{ accentColor: '#5ECFDF', width: '15px', height: '15px', flexShrink: 0 }}
                    />
                    <span style={{ fontSize: '0.95rem', color: '#2D241E' }}>{item.item_name}</span>
                  </label>
                ))}
              </div>
            )}

            {/* Note */}
            <p style={{ ...sectionLabelStyle, marginBottom: '6px' }}>Add a note <span style={{ color: '#bbb', fontWeight: 400 }}>(optional)</span></p>
            <textarea
              value={note}
              onChange={e => setNote(e.target.value)}
              rows={3}
              placeholder="e.g. I have a 10-person tent in great condition — happy to lend!"
              style={{ width: '100%', padding: '10px', border: '1px solid #ddd', borderRadius: '6px', fontSize: '0.9rem', color: '#2D241E', boxSizing: 'border-box' as const, resize: 'vertical' as const, outline: 'none', marginBottom: '4px' }}
            />

            {error && <p style={{ color: '#dc2626', fontSize: '0.85rem', margin: '4px 0 8px' }}>{error}</p>}

            <div style={{ display: 'flex', gap: '10px', marginTop: '16px', justifyContent: 'flex-end' }}>
              <button onClick={onClose} style={cancelStyle}>Cancel</button>
              <button
                onClick={handleSend}
                disabled={!canSend}
                style={{ ...sendStyle, opacity: canSend ? 1 : 0.4, cursor: canSend ? 'pointer' : 'default' as const }}
              >
                {sending ? 'Sending...' : 'Send'}
              </button>
            </div>
          </>
        )}
      </div>
    </div>
  );
}

const overlayStyle: React.CSSProperties = {
  position: 'fixed', inset: 0, backgroundColor: 'rgba(0,0,0,0.5)',
  display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 1000,
};
const modalStyle: React.CSSProperties = {
  backgroundColor: '#fff', borderRadius: '16px', padding: '28px',
  width: '480px', maxWidth: '92vw', maxHeight: '90vh', overflowY: 'auto',
  position: 'relative', boxShadow: '0 8px 32px rgba(0,0,0,0.15)',
};
const closeStyle: React.CSSProperties = {
  position: 'absolute', top: '16px', right: '16px',
  background: 'none', border: 'none', fontSize: '1rem', cursor: 'pointer', color: '#888',
};
const sectionLabelStyle: React.CSSProperties = {
  fontSize: '0.78rem', fontWeight: 700, color: '#888',
  textTransform: 'uppercase', letterSpacing: '0.05em', margin: '0 0 10px',
};
const checkRowStyle: React.CSSProperties = {
  display: 'flex', alignItems: 'center', gap: '10px', cursor: 'pointer',
  padding: '6px 10px', borderRadius: '6px', backgroundColor: '#f9f9f9',
  border: '1px solid #eee',
};
const cancelStyle: React.CSSProperties = {
  padding: '10px 18px', backgroundColor: '#f0f0f0', color: '#666',
  border: 'none', borderRadius: '6px', cursor: 'pointer', fontWeight: 600,
};
const sendStyle: React.CSSProperties = {
  padding: '10px 18px', backgroundColor: '#5ECFDF', color: '#000',
  border: 'none', borderRadius: '6px', fontWeight: 600,
};
