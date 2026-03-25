'use client';

import { useRouter } from 'next/navigation';
import { useEffect, useState, use } from 'react';
import { supabase } from '@/lib/supabaseClient';
import { MapPin, User, X } from 'lucide-react';
import PolaroidPhoto from '@/components/PolaroidPhoto';
import RequestModal from '@/components/RequestModal';

export default function ItemModal({ params }: { params: Promise<{ id: string }> }) {
  const router = useRouter();
  const resolvedParams = use(params);
  const [item, setItem] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [session, setSession] = useState<any>(undefined);
  const [isRequestOpen, setIsRequestOpen] = useState(false);
  const [confirmDelete, setConfirmDelete] = useState(false);
  const [deleting, setDeleting] = useState(false);

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
          supabase.from('profiles').select('preferred_name').eq('id', gear.user_id).single(),
          supabase.from('locations').select('city, zip_code').eq('id', gear.location_id).single()
        ]);

        // 3. Combine data
        setItem({
          ...gear,
          owner_name: profileRes.data?.preferred_name || 'Member',
          location_display: locationRes.data 
            ? `${locationRes.data.city} (${locationRes.data.zip_code})` 
            : 'Location N/A'
        });
      } catch (err) {
        console.error("Modal fetch error:", err);
      } finally {
        setLoading(false);
      }
    }
    fetchEnrichedItem();
  }, [resolvedParams.id]);

  const close = () => router.back();

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

  return (
    <div style={overlayStyle} onClick={close}>
      <div style={modalStyle} onClick={(e) => e.stopPropagation()}>
        <button onClick={close} style={closeButtonStyle}><X size={20} /></button>
        
        {loading ? (
          <p style={{ color: '#333', textAlign: 'center' }}>Loading gear details...</p>
        ) : item ? (
          <div>
            {/* Image Preview */}
            <PolaroidPhoto src={item.image_urls?.[0]} alt={item.item_name} itemId={item.id} />

            <div style={{ marginTop: '20px' }}>
              <h2 style={titleStyle}>{item.item_name}</h2>
              <p style={categoryStyle}>{item.category} • {item.condition}</p>
              
              <div style={infoGridStyle}>
                <div style={infoItemStyle}>
                  <MapPin size={16} color="#00ccff" />
                  <span>{item.location_display}</span>
                </div>
                <div style={infoItemStyle}>
                  <User size={16} color="#00ccff" />
                  <span>Owned by {item.owner_name}</span>
                </div>
              </div>

              <hr style={dividerStyle} />
              
              <h4 style={sectionLabelStyle}>Description</h4>
              <p style={descriptionStyle}>{item.description || 'No description provided.'}</p>
              
              {session ? (
                <button style={actionButtonStyle} onClick={() => setIsRequestOpen(true)}>
                  Request Item
                </button>
              ) : (
                <a href="/login" style={{ ...actionButtonStyle, display: 'block', textAlign: 'center' as const, textDecoration: 'none' }}>
                  Log In to Request
                </a>
              )}
              {session?.user?.id === item.user_id && (
                <div style={{ display: 'flex', justifyContent: 'center', marginTop: '8px' }}>
                  <button onClick={() => setConfirmDelete(true)} style={deleteItemBtnStyle}>
                    Delete this item
                  </button>
                </div>
              )}
            </div>
          </div>
        ) : (
          <p style={{ color: '#333' }}>This item isn't available, or you may need to log in to view it.</p>
        )}
      </div>
      {isRequestOpen && item && (
        <RequestModal item={item} onClose={() => setIsRequestOpen(false)} />
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

// --- STYLES ---
const overlayStyle: React.CSSProperties = {
  position: 'fixed', top: 0, left: 0, right: 0, bottom: 0,
  backgroundColor: 'rgba(0, 0, 0, 0.4)', display: 'flex',
  alignItems: 'center', justifyContent: 'center', zIndex: 1000, backdropFilter: 'blur(4px)'
};

const modalStyle: React.CSSProperties = {
  backgroundColor: '#fff', padding: '30px', borderRadius: '24px',
  width: '95%', maxWidth: '500px', position: 'relative',
  maxHeight: '90vh', overflowY: 'auto'
};

const closeButtonStyle: React.CSSProperties = {
  position: 'absolute', top: '15px', right: '15px', background: '#f5f5f5',
  border: 'none', color: '#666', width: '36px', height: '36px',
  borderRadius: '50%', cursor: 'pointer', display: 'flex', alignItems: 'center',
  justifyContent: 'center', zIndex: 10
};

const titleStyle: React.CSSProperties = { color: '#111', fontSize: '24px', margin: '0 0 5px 0' };
const categoryStyle: React.CSSProperties = { color: '#00ccff', fontSize: '14px', fontWeight: 'bold', textTransform: 'uppercase', marginBottom: '20px' };
const infoGridStyle: React.CSSProperties = { display: 'flex', flexDirection: 'column', gap: '10px', color: '#333', fontSize: '14px' };
const infoItemStyle: React.CSSProperties = { display: 'flex', alignItems: 'center', gap: '10px', color: '#333' };
const dividerStyle: React.CSSProperties = { border: '0', borderTop: '1px solid #eee', margin: '20px 0' };
const sectionLabelStyle: React.CSSProperties = { color: '#aaa', fontSize: '12px', textTransform: 'uppercase', marginBottom: '8px', letterSpacing: '1px' };
const descriptionStyle: React.CSSProperties = { color: '#444', lineHeight: '1.6', fontSize: '15px', marginBottom: '30px' };
const actionButtonStyle: React.CSSProperties = {
  width: '100%', padding: '15px', borderRadius: '12px', border: 'none',
  backgroundColor: '#00ccff', color: '#000', fontWeight: 'bold', cursor: 'pointer', fontSize: '16px'
};
const deleteItemBtnStyle: React.CSSProperties = { padding: '8px 20px', backgroundColor: '#fff0f0', color: '#cc0000', border: '1px solid #ffaaaa', borderRadius: '8px', fontSize: '13px', cursor: 'pointer', fontWeight: '600' };
const deleteOverlayStyle: React.CSSProperties = { position: 'fixed', inset: 0, backgroundColor: 'rgba(0,0,0,0.5)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 1100, padding: '20px' };
const deleteModalStyle: React.CSSProperties = { backgroundColor: '#fff', padding: '24px', borderRadius: '16px', maxWidth: '400px', width: '100%', boxShadow: '0 20px 60px rgba(0,0,0,0.2)' };
const cancelBtnStyle: React.CSSProperties = { padding: '10px 20px', backgroundColor: '#f5f5f5', color: '#333', border: 'none', borderRadius: '8px', cursor: 'pointer', fontSize: '14px', fontWeight: '600' };
const confirmDeleteBtnStyle: React.CSSProperties = { padding: '10px 20px', backgroundColor: '#fff0f0', color: '#cc0000', border: '1px solid #ffaaaa', borderRadius: '8px', cursor: 'pointer', fontSize: '14px', fontWeight: '600' };