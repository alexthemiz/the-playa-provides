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
  isFollowing: boolean;
  onClose: () => void;
}

export default function WishListMatchModal({ profile, wishTags, currentUserId, isFollowing, onClose }: Props) {
  const [myItems, setMyItems] = useState<any[]>([]);
  const [selectedTags, setSelectedTags] = useState<Set<string>>(new Set());
  const [tagTerms, setTagTerms] = useState<Map<string, 'borrow' | 'keep'>>(new Map());
  const [selectedItemIds, setSelectedItemIds] = useState<Map<string, string>>(new Map());
  const [note, setNote] = useState('');
  const [sending, setSending] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState(false);

  const recipientName = profile.preferred_name || profile.username;

  useEffect(() => {
    async function fetchMyInventory() {
      const { data } = await supabase
        .from('gear_items')
        .select('id, item_name, visibility, availability_status')
        .eq('user_id', currentUserId)
        .neq('availability_status', 'Not Available')
        .order('item_name', { ascending: true });
      setMyItems(data || []);
    }
    fetchMyInventory();
  }, [currentUserId]);

  const toggleTag = (tag: string) => {
    if (selectedTags.has(tag)) {
      setSelectedTags(prev => { const next = new Set(prev); next.delete(tag); return next; });
      setTagTerms(prev => { const next = new Map(prev); next.delete(tag); return next; });
    } else {
      setSelectedTags(prev => { const next = new Set(prev); next.add(tag); return next; });
    }
  };

  const toggleItem = (id: string, name: string) => {
    setSelectedItemIds(prev => {
      const next = new Map(prev);
      next.has(id) ? next.delete(id) : next.set(id, name);
      return next;
    });
  };

  const allSelected = [...selectedTags, ...[...selectedItemIds.values()]];
  const allCheckedTagsHaveTerms = [...selectedTags].every(tag => tagTerms.has(tag));
  const canSend = allSelected.length > 0 && note.trim().length > 0 && allCheckedTagsHaveTerms && !sending;

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
        meta: { items: [...selectedTags].map(tag => `${tag} (${tagTerms.get(tag)})`), note: note.trim() || null },
      });
      if (notifErr) throw new Error(notifErr.message);

      // Build inventory items with URLs and availability status for the email
      const inventoryItems = [...selectedItemIds.entries()].map(([id, name]) => {
        const itemData = myItems.find(i => i.id === id);
        return {
          name,
          url: `https://theplayaprovides.com/find-items/${id}`,
          availStatus: itemData?.availability_status || '',
        };
      });

      // Fire-and-forget email
      supabase.functions.invoke('send-wish-list-match-email', {
        body: {
          recipientId: profile.id,
          senderName,
          senderUsername,
          senderId: currentUserId,
          selectedWishItems: [...selectedTags].map(tag => ({
            name: tag,
            term: tagTerms.get(tag),
          })),
          inventoryItems,
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
              Help make {recipientName}&apos;s wish list dreams come true
            </h2>
            <p style={{ margin: '0 0 20px', color: '#888', fontSize: '0.85rem' }}>
              Select the items from their wish list you have, and any from your inventory you think they may want
            </p>

            {/* Wish list tag checkboxes */}
            <p style={sectionLabelStyle}>Their wish list <span style={{ color: '#dc2626' }}>*</span></p>
            <div style={{ display: 'flex', flexDirection: 'column' as const, gap: '8px', marginBottom: '8px' }}>
              {wishTags.map(tag => (
                <label key={tag} style={{ ...checkRowStyle, justifyContent: 'space-between' as const }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                    <input
                      type="checkbox"
                      checked={selectedTags.has(tag)}
                      onChange={() => toggleTag(tag)}
                      style={{ accentColor: '#5ECFDF', width: '15px', height: '15px', flexShrink: 0 }}
                    />
                    <span style={{ fontSize: '0.95rem', color: '#2D241E' }}>{tag}</span>
                  </div>
                  <div style={{ display: 'flex', gap: '12px', flexShrink: 0 }}>
                    {(['borrow', 'keep'] as const).map(term => (
                      <label key={term} onClick={e => e.stopPropagation()} style={{ display: 'flex', alignItems: 'center', gap: '4px', cursor: 'pointer', fontSize: '0.82rem', color: '#555' }}>
                        <input
                          type="radio"
                          name={`term-${tag}`}
                          value={term}
                          checked={tagTerms.get(tag) === term}
                          onChange={() => setTagTerms(prev => new Map(prev).set(tag, term))}
                          style={{ accentColor: '#5ECFDF' }}
                        />
                        {term === 'borrow' ? 'To Borrow' : 'To Keep'}
                      </label>
                    ))}
                  </div>
                </label>
              ))}
            </div>

            {[...selectedTags].some(tag => !tagTerms.has(tag)) && (
              <p style={{ fontSize: '0.8rem', color: '#dc2626', margin: '-8px 0 12px' }}>
                Please select To Borrow or To Keep for each checked item.
              </p>
            )}

            {/* Inventory items */}
            <p style={{ ...sectionLabelStyle, marginTop: '12px' }}>Share a listing from your inventory <span style={{ fontWeight: 400, color: '#aaa' }}>(Optional)</span></p>
            {myItems.length === 0 ? (
              <p style={{ fontSize: '0.85rem', color: '#aaa', fontStyle: 'italic' as const, marginBottom: '20px' }}>
                No items in your inventory yet.
              </p>
            ) : (
              <div style={{ display: 'flex', flexDirection: 'column' as const, gap: '8px', marginBottom: '20px', maxHeight: '180px', overflowY: 'auto' as const, paddingRight: '4px' }}>
                {myItems.map(item => {
                  const visLabel = (() => {
                    if (!item.visibility || item.visibility === 'public') return null;
                    if (item.visibility === 'campmates') return 'campmates only';
                    if (item.visibility === 'followers' || item.visibility === 'followers_campmates') {
                      return isFollowing ? null : 'followers only';
                    }
                    if (item.visibility === 'private') return 'private';
                    return null;
                  })();
                  const availLabel = (() => {
                    if (item.availability_status === 'Available to Borrow') return 'to borrow';
                    if (item.availability_status === 'Available to Keep') return 'to keep';
                    return null;
                  })();
                  return (
                    <label key={item.id} style={checkRowStyle}>
                      <input
                        type="checkbox"
                        checked={selectedItemIds.has(item.id)}
                        onChange={() => toggleItem(item.id, item.item_name)}
                        style={{ accentColor: '#5ECFDF', width: '15px', height: '15px', flexShrink: 0 }}
                      />
                      <span style={{ fontSize: '0.95rem', color: '#2D241E' }}>{item.item_name}</span>
                      {visLabel && (
                        <span style={{ fontSize: '0.72rem', color: '#aaa', marginLeft: '6px', fontStyle: 'italic' }}>
                          {visLabel}
                        </span>
                      )}
                      {availLabel && (
                        <span style={{ fontSize: '0.72rem', color: '#aaa', marginLeft: 'auto', fontStyle: 'italic' as const }}>
                          {availLabel}
                        </span>
                      )}
                    </label>
                  );
                })}
              </div>
            )}

            {/* Note */}
            <p style={{ ...sectionLabelStyle, marginBottom: '6px' }}>Add a note <span style={{ color: '#dc2626', fontWeight: 400 }}>*</span></p>
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
