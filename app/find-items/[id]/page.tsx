'use client';

import { useEffect, useState, use } from 'react';
import { supabase } from '@/lib/supabaseClient';
import { MapPin, User, ChevronLeft, Shield, AlertTriangle, Calendar } from 'lucide-react';
import Link from 'next/link';
import RequestModal from '@/components/RequestModal'; // Assuming this is your path
import ImageSlider from '@/components/ImageSlider';

export default function ItemDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const resolvedParams = use(params);
  const [item, setItem] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [session, setSession] = useState<any>(undefined); // undefined = not yet checked
  const [confirmDelete, setConfirmDelete] = useState(false);
  const [deleting, setDeleting] = useState(false);

  useEffect(() => {
    async function fetchItem() {
      setLoading(true);
      try {
        const { data: { session: s } } = await supabase.auth.getSession();
        setSession(s);

        const { data: gear, error: gearError } = await supabase
          .from('gear_items')
          .select('*')
          .eq('id', resolvedParams.id)
          .single();

        if (gearError) throw gearError;
        if (gear.owner_deleted) { setLoading(false); return; }

        const [profileRes, locationRes] = await Promise.all([
          supabase.from('profiles').select('preferred_name, username').eq('id', gear.user_id).single(),
          supabase.from('locations').select('city, zip_code').eq('id', gear.location_id).single()
        ]);

        setItem({
          ...gear,
          owner_name: profileRes.data?.preferred_name || 'Member',
          owner_username: profileRes.data?.username || null,
          location_display: locationRes.data
            ? `${locationRes.data.city} (${locationRes.data.zip_code})`
            : 'Location N/A'
        });
      } catch (err) {
        console.error("Detail page fetch error:", err);
      } finally {
        setLoading(false);
      }
    }
    fetchItem();
  }, [resolvedParams.id]);

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

  if (loading) return <div style={containerStyle}><p>Loading gear...</p></div>;
  if (!item) return <div style={containerStyle}><p>This item isn't available, or you may need to log in to view it.</p></div>;

  const isGift = item.availability_status === 'You can keep it';
  const requestLabel = item.availability_status === 'Available to Keep' ? 'Request to Keep' : 'Request to Borrow';

  return (
    <div style={containerStyle}>
      <Link href="/find-items" style={backLinkStyle}>
        <ChevronLeft size={20} /> Back to Search
      </Link>

      <div style={contentGrid}>
        {/* Left column: photo */}
        <div style={{ display: 'flex', flexDirection: 'column' as const, gap: '12px' }}>
          <div style={{ borderRadius: '16px', overflow: 'hidden', width: '100%', aspectRatio: '1 / 1' }}>
            <ImageSlider images={item.image_urls} />
          </div>
        </div>

        {/* Right column: details */}
        <div style={detailsPane}>
          <h1 style={titleStyle}>{item.item_name}</h1>
          <p style={categoryStyle}>{item.category} • {item.condition}</p>

          {/* Location | Owner row */}
          <div style={locationOwnerRow}>
            <span style={metaItem}>
              <MapPin size={15} color="#00ccff" /> {item.location_display}
            </span>
            <span style={{ color: '#bbb', fontSize: '14px', margin: '0 6px' }}>|</span>
            <span style={metaItem}>
              <User size={15} color="#00ccff" />
              {item.owner_username ? (
                <span>{isGift ? 'Offered' : 'Owned'} by <Link href={`/profile/${item.owner_username}`} style={ownerLinkStyle}>{item.owner_name}</Link></span>
              ) : (
                <span>{isGift ? 'Offered' : 'Owned'} by {item.owner_name}</span>
              )}
            </span>
          </div>

          {/* Pick up / Return by row — outside the lending terms box */}
          {!isGift && (item.pickup_by || item.return_by) && (
            <div style={dateRow}>
              {item.pickup_by && (
                <span style={datePill}>
                  <Calendar size={13} />
                  Pick up by: <strong>{new Date(item.pickup_by).toLocaleDateString()}</strong>
                </span>
              )}
              {item.return_by && (
                <span style={datePill}>
                  <Calendar size={13} />
                  Return by: <strong>{new Date(item.return_by).toLocaleDateString()}</strong>
                </span>
              )}
            </div>
          )}

          {/* DESCRIPTION box */}
          {(item.description) && (
            <div style={descSection}>
              <h4 style={descLabelStyle}>DESCRIPTION</h4>
              <p style={descText}>{item.description}</p>
            </div>
          )}
          {!item.description && (
            <div style={descSection}>
              <h4 style={descLabelStyle}>DESCRIPTION</h4>
              <p style={{ ...descText, color: '#aaa', fontStyle: 'italic' as const }}>No description provided.</p>
            </div>
          )}

          {/* Lending Terms box */}
          {!isGift && (item.damage_price || item.loss_price || item.return_terms) && (
            <div style={termsSection}>
              <h4 style={termsTitleStyle}>Lending Terms</h4>

              {/* Damage / Loss — now inside the box */}
              {(item.damage_price || item.loss_price) && (
                <div style={{ display: 'flex', gap: '15px', marginBottom: item.return_terms ? '12px' : '0' }}>
                  {item.damage_price && (
                    <div style={priceTag}>
                      <Shield size={13} color="#f97316" /> If Damaged: <strong>${Math.round(item.damage_price)}</strong>
                    </div>
                  )}
                  {item.loss_price && (
                    <div style={priceTag}>
                      <AlertTriangle size={13} color="#ef4444" /> If Not Returned: <strong>${Math.round(item.loss_price)}</strong>
                    </div>
                  )}
                </div>
              )}

              {/* Condition upon return */}
              {item.return_terms && (
                <p style={{ margin: 0, fontSize: '13px', color: '#444' }}>{item.return_terms}</p>
              )}
            </div>
          )}

          {/* Button row — centered, below text column */}
          <div style={{ display: 'flex', justifyContent: 'center' as const, gap: '10px', marginTop: '8px' }}>
            {session?.user?.id === item.user_id ? (
              <>
                <a href={`/list-item?edit=${item.id}`} style={ownerBtnStyle}>Edit Listing</a>
                <button onClick={() => setConfirmDelete(true)} style={ownerBtnStyle}>Delete This Item</button>
              </>
            ) : session ? (
              <button style={borrowButtonStyle} onClick={() => setIsModalOpen(true)}>
                {requestLabel}
              </button>
            ) : (
              <a href="/login" style={{ ...borrowButtonStyle, display: 'block', textAlign: 'center' as const, textDecoration: 'none' }}>
                Log In to Request
              </a>
            )}
          </div>
        </div>
      </div>

      {isModalOpen && (
        <RequestModal item={item} onClose={() => setIsModalOpen(false)} />
      )}

      {confirmDelete && (
        <div style={deleteOverlayStyle}>
          <div style={deleteModalStyle}>
            <p style={{ margin: '0 0 20px 0', fontSize: '15px', color: '#2D241E', lineHeight: 1.5 }}>
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

// ── Styles ─────────────────────────────────────────────────────────────────

const containerStyle: React.CSSProperties = { padding: '32px 20px', maxWidth: '1000px', margin: '0 auto', color: '#2D241E' };
const backLinkStyle: React.CSSProperties = { display: 'flex', alignItems: 'center', gap: '5px', color: '#00ccff', textDecoration: 'none', marginBottom: '20px', fontWeight: 'bold' };
const contentGrid: React.CSSProperties = { display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(300px, 1fr))', gap: '28px' };
const detailsPane: React.CSSProperties = { display: 'flex', flexDirection: 'column' as const, gap: '10px' };
const titleStyle: React.CSSProperties = { fontSize: '26px', fontWeight: 'bold', margin: 0, color: '#2D241E' };
const categoryStyle: React.CSSProperties = { color: '#00aacc', fontWeight: 'bold', fontSize: '13px', textTransform: 'uppercase' as const, marginBottom: '4px', letterSpacing: '0.05em' };

// Location | Owner row
const locationOwnerRow: React.CSSProperties = { display: 'flex', alignItems: 'center', flexWrap: 'wrap' as const, gap: '4px', fontSize: '14px', color: '#444' };
const metaItem: React.CSSProperties = { display: 'flex', alignItems: 'center', gap: '6px', fontSize: '14px', color: '#444' };
const ownerLinkStyle: React.CSSProperties = { color: '#00aacc', textDecoration: 'none', fontWeight: '500' };

// Pick up / Return by row
const dateRow: React.CSSProperties = { display: 'flex', gap: '16px', flexWrap: 'wrap' as const };
const datePill: React.CSSProperties = { display: 'flex', alignItems: 'center', gap: '6px', fontSize: '13px', color: '#555', backgroundColor: '#f5f5f5', padding: '5px 10px', borderRadius: '8px', border: '1px solid #e5e5e5' };

// Description box
const descSection: React.CSSProperties = { backgroundColor: '#f7f7f7', padding: '14px 16px', borderRadius: '12px', border: '1px solid #e5e5e5' };
const descLabelStyle: React.CSSProperties = { color: '#555', fontSize: '11px', textTransform: 'uppercase' as const, marginBottom: '8px', marginTop: 0, letterSpacing: '1px', fontWeight: 800 };
const descText: React.CSSProperties = { lineHeight: '1.7', color: '#444', fontSize: '14px', margin: 0 };

// Lending Terms box
const termsSection: React.CSSProperties = { backgroundColor: '#f7f7f7', padding: '16px', borderRadius: '12px', border: '1px solid #e5e5e5' };
const termsTitleStyle: React.CSSProperties = { color: '#555', fontSize: '11px', textTransform: 'uppercase' as const, marginBottom: '8px', marginTop: 0, letterSpacing: '1px', fontWeight: 800 };
const priceTag: React.CSSProperties = { display: 'flex', alignItems: 'center', gap: '6px', fontSize: '13px', color: '#2D241E' };
const returnTermsBox: React.CSSProperties = { padding: '10px 12px', backgroundColor: '#efefef', borderRadius: '8px', border: '1px solid #ddd' };
const conditionLabelStyle: React.CSSProperties = { margin: '0 0 4px 0', fontSize: '10px', color: '#888', textTransform: 'uppercase' as const, fontWeight: 'bold', letterSpacing: '0.06em' };

// Request / owner buttons
const borrowButtonStyle: React.CSSProperties = { padding: '12px 24px', borderRadius: '10px', border: 'none', backgroundColor: '#00ccff', color: '#000', fontWeight: 'bold', fontSize: '15px', cursor: 'pointer' };
const ownerBtnStyle: React.CSSProperties = { padding: '10px 20px', backgroundColor: '#fff', color: '#2D241E', border: '1px solid #ddd', borderRadius: '8px', fontSize: '13px', fontWeight: 600, cursor: 'pointer', textDecoration: 'none' };

const deleteItemBtnStyle: React.CSSProperties = { padding: '8px 20px', backgroundColor: '#fff0f0', color: '#cc0000', border: '1px solid #ffaaaa', borderRadius: '8px', fontSize: '13px', cursor: 'pointer', fontWeight: '600' };
const deleteOverlayStyle: React.CSSProperties = { position: 'fixed', inset: 0, backgroundColor: 'rgba(0,0,0,0.5)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 1100, padding: '20px' };
const deleteModalStyle: React.CSSProperties = { backgroundColor: '#fff', padding: '24px', borderRadius: '16px', maxWidth: '400px', width: '100%', boxShadow: '0 20px 60px rgba(0,0,0,0.2)' };
const cancelBtnStyle: React.CSSProperties = { padding: '10px 20px', backgroundColor: '#f5f5f5', color: '#333', border: 'none', borderRadius: '8px', cursor: 'pointer', fontSize: '14px', fontWeight: '600' };
const confirmDeleteBtnStyle: React.CSSProperties = { padding: '10px 20px', backgroundColor: '#fff0f0', color: '#cc0000', border: '1px solid #ffaaaa', borderRadius: '8px', cursor: 'pointer', fontSize: '14px', fontWeight: '600' };
