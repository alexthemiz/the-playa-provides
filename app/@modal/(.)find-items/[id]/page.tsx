'use client';

import { useRouter } from 'next/navigation';
import { useEffect, useState, use } from 'react';
import { supabase } from '@/lib/supabaseClient';
import { MapPin, User, X } from 'lucide-react';
import Link from 'next/link';
import PolaroidPhoto from '@/components/PolaroidPhoto';
import RequestModal from '@/components/RequestModal';
import ShareButton from '@/components/ShareButton';
import LendModal from '@/components/LendModal';
import TransferModal from '@/components/TransferModal';
import { CATEGORY_ACCENTS, DEFAULT_CATEGORY_ACCENT } from '@/lib/categoryColors';

const INK      = '#1C1610';
const INK_MID  = '#4A3828';
const INK_LITE = '#9A8878';
const PAPER_DK = '#EDE5D0';
const PAPER_LT = '#FDFAF4';
const TEAL     = '#1E8A82';
const MUSTARD  = '#D4A020';
const MUSTARD_LT = '#F5F0D0';

export default function ItemModal({ params }: { params: Promise<{ id: string }> }) {
  const router = useRouter();
  const resolvedParams = use(params);
  const [item, setItem] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [session, setSession] = useState<any>(undefined);
  const [isRequestOpen, setIsRequestOpen] = useState(false);
  const [confirmDelete, setConfirmDelete] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const [showTransferFlow, setShowTransferFlow] = useState(false);
  const [myLoan, setMyLoan] = useState<any>(null);
  const [returningItem, setReturningItem] = useState(false);

  useEffect(() => {
    async function fetchEnrichedItem() {
      setLoading(true);
      try {
        const { data: { session: s } } = await supabase.auth.getSession();
        setSession(s);

        // 1. Fetch the base gear item
        const { data: gear, error: gearError } = await supabase
          .from('gear_items')
          .select('*')
          .eq('id', resolvedParams.id)
          .single();

        if (gearError) throw gearError;
        if (gear.owner_deleted) { setLoading(false); return; }

        // 2. Fetch Owner and Location in parallel (The "Manual Join")
        const [profileRes, locationRes] = await Promise.all([
          supabase.from('profiles').select('preferred_name, username').eq('id', gear.user_id).single(),
          supabase.from('locations').select('city, zip_code').eq('id', gear.location_id).single()
        ]);

        // 3. Combine data
        setItem({
          ...gear,
          owner_name: profileRes.data?.preferred_name || 'Member',
          owner_username: profileRes.data?.username || null,
          location_display: locationRes.data
            ? `${locationRes.data.city} (${locationRes.data.zip_code})`
            : 'Location N/A'
        });

        // RLS scopes this to rows where the current user is the owner or
        // borrower — returns null for everyone else, which is what we want.
        if (s?.user) {
          const { data: loan } = await supabase
            .from('item_loans')
            .select('id, status, borrower_id, owner_id')
            .eq('item_id', resolvedParams.id)
            .in('status', ['pending_handover', 'active', 'return_pending'])
            .maybeSingle();
          setMyLoan(loan);
        }
      } catch (err) {
        console.error("Modal fetch error:", err);
      } finally {
        setLoading(false);
      }
    }
    fetchEnrichedItem();
  }, [resolvedParams.id]);

  const close = () => router.back();

  async function handleReturnItem() {
    if (!myLoan || !item) return;
    setReturningItem(true);
    try {
      const { error } = await supabase
        .from('item_loans')
        .update({ borrower_confirmed_return: true, status: 'return_pending' })
        .eq('id', myLoan.id);
      if (error) throw error;
      setMyLoan((prev: any) => ({ ...prev, status: 'return_pending' }));
      await supabase.from('notifications').insert({
        type: 'loan_return_pending',
        recipient_id: myLoan.owner_id,
        actor_id: session?.user?.id,
        item_id: item.id,
      });
      await supabase.functions.invoke('send-loan-notification', {
        body: { type: 'borrower_confirmed_return', loan_id: myLoan.id },
      });
    } catch (err: any) {
      console.error('Return item error:', err.message);
    } finally {
      setReturningItem(false);
    }
  }

  async function handleDeleteItem() {
    if (!item) return;
    setDeleting(true);
    try {
      if (item.image_urls?.length) {
        const paths = item.image_urls.map((url: string) => {
          const parts = url.split('/gear-photos/');
          return parts.length > 1 ? parts[1] : null;
        }).filter(Boolean);
        if (paths.length) await supabase.storage.from('gear-photos').remove(paths);
      }
      const { error } = await supabase.from('gear_items').delete().eq('id', item.id);
      if (error) throw error;
      window.location.href = '/inventory';
    } catch (err: any) {
      console.error('Delete error:', err.message);
      setDeleting(false);
    }
  }

  const isGift = item?.availability_status === 'Available to Keep';
  const isOwner = session?.user?.id === item?.user_id;
  const isBorrower = !!myLoan && myLoan.borrower_id === session?.user?.id;

  return (
    <div style={overlayStyle} onClick={close}>
      <div style={modalStyle} onClick={(e) => e.stopPropagation()}>
        <button
          onClick={close}
          style={{
            position: 'sticky', top: 0, float: 'right', zIndex: 10,
            background: PAPER_DK, border: 'none', cursor: 'pointer',
            padding: '10px 14px', color: INK_LITE,
            borderBottom: `1px solid rgba(28,22,16,0.12)`,
            borderLeft: `1px solid rgba(28,22,16,0.12)`,
            fontFamily: "'Space Mono', monospace", fontSize: '0.6rem',
            fontWeight: 700, letterSpacing: '0.06em',
            display: 'flex', alignItems: 'center', gap: '5px',
          }}
        >
          <X size={12} /> CLOSE
        </button>

        {loading ? (
          <p style={{ color: INK_MID, textAlign: 'center', padding: '40px 28px' }}>Loading gear details...</p>
        ) : item ? (
          <div>
            {/* Image Preview */}
            <div style={{ padding: '20px 28px 0' }}>
              <PolaroidPhoto src={item.image_urls?.[0]} alt={item.item_name} itemId={item.id} />
            </div>

            <div style={{ padding: '20px 28px 28px' }}>
              <h2 style={{ fontFamily: "'Arvo', serif", fontSize: '1.5rem', fontWeight: 900, color: INK, margin: '0 0 6px', lineHeight: 1.1 }}>
                {item.item_name}
              </h2>
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '16px', fontSize: '0.82rem', color: INK_MID, flexWrap: 'wrap' as const }}>
                <User size={14} color={TEAL} />
                {item.owner_username ? (
                  <Link href={`/profile/${item.owner_username}`} onClick={e => e.stopPropagation()} style={{ color: TEAL, textDecoration: 'none', fontWeight: 600 }}>
                    {item.owner_name}
                  </Link>
                ) : (
                  <span>{item.owner_name}</span>
                )}
                <span style={{ color: INK_LITE }}>·</span>
                <span style={{ display: 'flex', alignItems: 'center', gap: '3px', color: INK_LITE }}>
                  <MapPin size={13} />
                  {item.location_display}
                </span>
                {item.category && (
                  <span style={{ marginLeft: 'auto', flexShrink: 0, fontFamily: "'Space Mono', monospace", fontSize: '0.58rem', fontWeight: 700, letterSpacing: '0.06em', textTransform: 'uppercase' as const, padding: '3px 8px', border: `1px solid ${CATEGORY_ACCENTS[item.category] || DEFAULT_CATEGORY_ACCENT}`, color: '#fff', background: CATEGORY_ACCENTS[item.category] || DEFAULT_CATEGORY_ACCENT, whiteSpace: 'nowrap' as const }}>
                    {item.category}
                  </span>
                )}
              </div>

              <hr style={{ border: 'none', borderTop: `1px solid rgba(28,22,16,0.1)`, margin: '0 0 16px' }} />

              {/* Description */}
              <div style={{ marginBottom: '16px' }}>
                <div style={{ fontFamily: "'Space Mono', monospace", fontSize: '0.58rem', fontWeight: 700, letterSpacing: '0.1em', textTransform: 'uppercase' as const, color: INK_LITE, marginBottom: '6px' }}>Description</div>
                <p style={{ fontSize: '0.88rem', color: INK_MID, lineHeight: 1.6, margin: 0 }}>{item.description || 'No description provided.'}</p>
              </div>

              {/* Terms */}
              {!isGift && (item.return_by || item.return_terms || item.damage_price || item.loss_price) && (
                <div style={{ marginBottom: '16px', padding: '14px', backgroundColor: PAPER_DK, border: `1px solid rgba(28,22,16,0.12)` }}>
                  <div style={{ fontFamily: "'Space Mono', monospace", fontSize: '0.58rem', fontWeight: 700, letterSpacing: '0.1em', textTransform: 'uppercase' as const, color: INK_LITE, marginBottom: '10px' }}>Borrowing Terms</div>
                  {item.return_by && (
                    <div style={{ fontSize: '0.84rem', color: INK_MID, marginBottom: '5px' }}>Return by: <strong style={{ color: INK }}>{new Date(item.return_by).toLocaleDateString()}</strong></div>
                  )}
                  {item.damage_price && (
                    <div style={{ fontSize: '0.84rem', color: INK_MID, marginBottom: '5px' }}>If damaged: <strong style={{ color: INK }}>${item.damage_price}</strong></div>
                  )}
                  {item.loss_price && (
                    <div style={{ fontSize: '0.84rem', color: INK_MID, marginBottom: '5px' }}>If not returned: <strong style={{ color: INK }}>${item.loss_price}</strong></div>
                  )}
                  {item.return_terms && (
                    <div style={{ fontSize: '0.84rem', color: INK_MID, fontStyle: 'italic', borderTop: `1px solid rgba(28,22,16,0.08)`, marginTop: '8px', paddingTop: '8px' }}>
                      "{item.return_terms}"
                    </div>
                  )}
                </div>
              )}

              {item.is_on_loan && (
                <div style={{ display: 'inline-block', padding: '3px 10px', marginBottom: '12px', backgroundColor: MUSTARD_LT, color: '#92400e', fontFamily: "'Space Mono', monospace", fontSize: '0.7rem', fontWeight: 700 }}>
                  Currently on loan
                </div>
              )}

              {/* CTA */}
              {isOwner ? (
                <div style={{ display: 'flex', alignItems: 'center', gap: '10px', width: '100%' }}>
                  {item.is_on_loan ? (
                    <>
                      <span style={disabledPillStyle}>Edit</span>
                      <span style={disabledPillStyle}>Transfer</span>
                      <ShareButton itemId={item.id} itemName={item.item_name} style={shareInlineBtnStyle} />
                      <span style={{ ...disabledPillStyle, marginLeft: 'auto' }}>Delete</span>
                    </>
                  ) : (
                    <>
                      <a href={`/list-item?edit=${item.id}`} style={editBtnStyle}>Edit</a>
                      <button onClick={() => setShowTransferFlow(true)} style={transferBtnStyle}>Transfer</button>
                      <ShareButton itemId={item.id} itemName={item.item_name} style={shareInlineBtnStyle} />
                      <button onClick={() => setConfirmDelete(true)} style={{ ...deleteBtnStyle, marginLeft: 'auto' }}>Delete</button>
                    </>
                  )}
                </div>
              ) : isBorrower && myLoan.status === 'active' ? (
                <div style={{ display: 'flex', alignItems: 'center', gap: '10px', width: '100%' }}>
                  <button
                    onClick={handleReturnItem}
                    disabled={returningItem}
                    style={{ ...actionButtonStyle, backgroundColor: '#16a34a' }}
                  >
                    {returningItem ? 'Returning...' : 'Return Item'}
                  </button>
                </div>
              ) : isBorrower && myLoan.status === 'return_pending' ? (
                <span style={{ ...disabledPillStyle, display: 'block', width: '100%', textAlign: 'center' as const, padding: '14px' }}>
                  Return Pending — waiting on owner to confirm
                </span>
              ) : isBorrower && myLoan.status === 'pending_handover' ? (
                <span style={{ ...disabledPillStyle, display: 'block', width: '100%', textAlign: 'center' as const, padding: '14px' }}>
                  Pending handover — check your inventory
                </span>
              ) : (
                <div style={{ display: 'flex', alignItems: 'center', gap: '10px', width: '100%' }}>
                  {item.is_on_loan ? (
                    <span style={{ ...disabledPillStyle, display: 'block', width: '100%', textAlign: 'center' as const, padding: '14px' }}>
                      Currently on loan
                    </span>
                  ) : session ? (
                    <button style={actionButtonStyle} onClick={() => setIsRequestOpen(true)}>
                      {isGift ? 'Request to Keep' : 'Request to Borrow'}
                    </button>
                  ) : (
                    <a href="/login" style={{ ...actionButtonStyle, display: 'block', textAlign: 'center' as const, textDecoration: 'none' }}>
                      Log In to Request
                    </a>
                  )}
                  <ShareButton itemId={item.id} itemName={item.item_name} style={{ ...shareInlineBtnStyle, marginLeft: 'auto' }} />
                </div>
              )}
            </div>
          </div>
        ) : (
          <p style={{ color: INK_MID, padding: '40px 28px' }}>This item isn't available, or you may need to log in to view it.</p>
        )}
      </div>

      {isRequestOpen && item && (
        <RequestModal item={item} onClose={() => setIsRequestOpen(false)} />
      )}

      {showTransferFlow && item && (
        isGift ? (
          <TransferModal item={item} ownerId={item.user_id} onClose={() => setShowTransferFlow(false)} onSuccess={() => setShowTransferFlow(false)} />
        ) : (
          <LendModal item={item} ownerId={item.user_id} onClose={() => setShowTransferFlow(false)} onSuccess={() => setShowTransferFlow(false)} />
        )
      )}

      {confirmDelete && (
        <div style={deleteOverlayStyle}>
          <div style={deleteModalStyle}>
            <p style={{ margin: '0 0 20px 0', fontSize: '15px', color: INK, lineHeight: 1.5 }}>
              Are you sure you want to delete this item? This cannot be undone.
            </p>
            <div style={{ display: 'flex', gap: '10px', justifyContent: 'flex-end' }}>
              <button onClick={() => setConfirmDelete(false)} style={cancelBtnStyle}>Cancel</button>
              <button onClick={handleDeleteItem} disabled={deleting} style={confirmDeleteBtnStyle}>
                {deleting ? 'Deleting...' : 'Delete Item'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

// --- STYLES ---
const overlayStyle: React.CSSProperties = {
  position: 'fixed', inset: 0, backgroundColor: 'rgba(28,22,16,0.6)',
  display: 'flex', alignItems: 'center', justifyContent: 'center',
  zIndex: 1000, padding: '20px', backdropFilter: 'blur(3px)',
};

const modalStyle: React.CSSProperties = {
  backgroundColor: PAPER_LT, padding: '0',
  width: '100%', maxWidth: '520px', position: 'relative',
  border: `2px solid ${INK}`, boxShadow: `6px 6px 0 ${INK}`,
  maxHeight: '92vh', overflowY: 'auto',
};

const actionButtonStyle: React.CSSProperties = {
  width: '100%', padding: '14px', border: `2px solid ${INK}`,
  boxShadow: `3px 3px 0 ${INK}`, backgroundColor: TEAL, color: '#fff',
  fontWeight: 700, cursor: 'pointer', fontSize: '0.95rem', fontFamily: 'Outfit, sans-serif',
};
const editBtnStyle: React.CSSProperties = { padding: '10px 20px', backgroundColor: '#fff', color: TEAL, border: `2px solid ${TEAL}`, fontSize: '13px', fontWeight: 700, cursor: 'pointer', textDecoration: 'none', whiteSpace: 'nowrap' as const, fontFamily: 'Outfit, sans-serif' };
const transferBtnStyle: React.CSSProperties = { padding: '10px 20px', backgroundColor: '#fff', color: MUSTARD, border: `2px solid ${MUSTARD}`, fontSize: '13px', fontWeight: 700, cursor: 'pointer', whiteSpace: 'nowrap' as const, fontFamily: 'Outfit, sans-serif' };
const deleteBtnStyle: React.CSSProperties = { padding: '10px 20px', backgroundColor: '#fff0f0', color: '#cc0000', border: '2px solid #cc0000', fontSize: '13px', fontWeight: 700, cursor: 'pointer', whiteSpace: 'nowrap' as const, fontFamily: 'Outfit, sans-serif' };
const shareInlineBtnStyle: React.CSSProperties = { width: 'auto', flex: '0 0 auto', padding: '10px 20px', marginTop: 0, border: `2px solid ${INK}`, backgroundColor: '#fff', fontSize: '13px', whiteSpace: 'nowrap' as const };
const disabledPillStyle: React.CSSProperties = { padding: '10px 20px', backgroundColor: '#f5f5f5', color: '#aaa', border: '2px solid #e0e0e0', fontSize: '13px', fontWeight: 700, whiteSpace: 'nowrap' as const, fontFamily: 'Outfit, sans-serif' };

const deleteOverlayStyle: React.CSSProperties = { position: 'fixed', inset: 0, backgroundColor: 'rgba(0,0,0,0.5)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 1100, padding: '20px' };
const deleteModalStyle: React.CSSProperties = { backgroundColor: '#fff', padding: '24px', borderRadius: '16px', maxWidth: '400px', width: '100%', boxShadow: '0 20px 60px rgba(0,0,0,0.2)' };
const cancelBtnStyle: React.CSSProperties = { padding: '10px 20px', backgroundColor: '#f5f5f5', color: '#333', border: 'none', borderRadius: '8px', cursor: 'pointer', fontSize: '14px', fontWeight: '600' };
const confirmDeleteBtnStyle: React.CSSProperties = { padding: '10px 20px', backgroundColor: '#fff0f0', color: '#cc0000', border: '1px solid #ffaaaa', borderRadius: '8px', cursor: 'pointer', fontSize: '14px', fontWeight: '600' };
