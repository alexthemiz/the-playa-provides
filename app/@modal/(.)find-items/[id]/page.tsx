'use client';

import { useRouter } from 'next/navigation';
import { useEffect, useState, use } from 'react';
import { supabase } from '@/lib/supabaseClient';
import { MapPin, User, Package, X } from 'lucide-react';

export default function ItemModal({ params }: { params: Promise<{ id: string }> }) {
  const router = useRouter();
  const resolvedParams = use(params);
  const [item, setItem] = useState<any>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function fetchEnrichedItem() {
      setLoading(true);
      try {
        // 1. Fetch the base gear item
        const { data: gear, error: gearError } = await supabase
          .from('gear_items')
          .select('*')
          .eq('id', resolvedParams.id)
          .single();

        if (gearError) throw gearError;

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

  return (
    <div style={overlayStyle} onClick={close}>
      <div style={modalStyle} onClick={(e) => e.stopPropagation()}>
        <button onClick={close} style={closeButtonStyle}><X size={20} /></button>
        
        {loading ? (
          <p style={{ color: '#fff', textAlign: 'center' }}>Loading gear details...</p>
        ) : item ? (
          <div>
            {/* Image Preview */}
            <div style={imagePreviewStyle}>
              {item.image_urls?.[0] ? (
                <img src={item.image_urls[0]} alt={item.item_name} style={imgStyle} />
              ) : (
                <div style={noImgStyle}><Package size={48} /></div>
              )}
            </div>

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
              
              <button style={actionButtonStyle}>
                Request to Borrow
              </button>
            </div>
          </div>
        ) : (
          <p style={{ color: '#fff' }}>Item not found.</p>
        )}
      </div>
    </div>
  );
}

// --- STYLES ---
const overlayStyle: React.CSSProperties = {
  position: 'fixed', top: 0, left: 0, right: 0, bottom: 0,
  backgroundColor: 'rgba(0, 0, 0, 0.85)', display: 'flex',
  alignItems: 'center', justifyContent: 'center', zIndex: 1000, backdropFilter: 'blur(8px)'
};

const modalStyle: React.CSSProperties = {
  backgroundColor: '#0a0a0a', padding: '30px', borderRadius: '24px',
  width: '95%', maxWidth: '500px', position: 'relative', border: '1px solid #222',
  maxHeight: '90vh', overflowY: 'auto'
};

const closeButtonStyle: React.CSSProperties = {
  position: 'absolute', top: '15px', right: '15px', background: '#222',
  border: 'none', color: '#fff', width: '36px', height: '36px',
  borderRadius: '50%', cursor: 'pointer', display: 'flex', alignItems: 'center',
  justifyContent: 'center', zIndex: 10
};

const imagePreviewStyle: React.CSSProperties = {
  width: '100%', height: '250px', borderRadius: '16px', overflow: 'hidden', backgroundColor: '#111'
};

const imgStyle: React.CSSProperties = { width: '100%', height: '100%', objectFit: 'cover' };
const noImgStyle: React.CSSProperties = { height: '100%', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#333' };
const titleStyle: React.CSSProperties = { color: '#fff', fontSize: '24px', margin: '0 0 5px 0' };
const categoryStyle: React.CSSProperties = { color: '#00ccff', fontSize: '14px', fontWeight: 'bold', textTransform: 'uppercase', marginBottom: '20px' };
const infoGridStyle: React.CSSProperties = { display: 'flex', flexDirection: 'column', gap: '10px', color: '#fff', fontSize: '14px' };
const infoItemStyle: React.CSSProperties = { display: 'flex', alignItems: 'center', gap: '10px' };
const dividerStyle: React.CSSProperties = { border: '0', borderTop: '1px solid #222', margin: '20px 0' };
const sectionLabelStyle: React.CSSProperties = { color: '#666', fontSize: '12px', textTransform: 'uppercase', marginBottom: '8px', letterSpacing: '1px' };
const descriptionStyle: React.CSSProperties = { color: '#ccc', lineHeight: '1.6', fontSize: '15px', marginBottom: '30px' };
const actionButtonStyle: React.CSSProperties = {
  width: '100%', padding: '15px', borderRadius: '12px', border: 'none',
  backgroundColor: '#00ccff', color: '#000', fontWeight: 'bold', cursor: 'pointer', fontSize: '16px'
};