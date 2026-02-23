'use client';

import { useEffect, useState, use } from 'react';
import { supabase } from '@/lib/supabaseClient';
import { MapPin, User, Package, ChevronLeft, Shield, AlertTriangle, Calendar } from 'lucide-react';
import Link from 'next/link';
import RequestModal from '@/components/RequestModal'; // Assuming this is your path

export default function ItemDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const resolvedParams = use(params);
  const [item, setItem] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [isModalOpen, setIsModalOpen] = useState(false); // Added for the modal

  useEffect(() => {
    async function fetchItem() {
      setLoading(true);
      try {
        const { data: gear, error: gearError } = await supabase
          .from('gear_items')
          .select('*')
          .eq('id', resolvedParams.id)
          .single();

        if (gearError) throw gearError;

        const [profileRes, locationRes] = await Promise.all([
          supabase.from('profiles').select('preferred_name').eq('id', gear.user_id).single(),
          supabase.from('locations').select('city, zip_code').eq('id', gear.location_id).single()
        ]);

        setItem({
          ...gear,
          owner_name: profileRes.data?.preferred_name || 'Member',
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

  if (loading) return <div style={containerStyle}><p>Loading gear...</p></div>;
  if (!item) return <div style={containerStyle}><p>Gear not found.</p></div>;

  const isGift = item.availability_status === 'You can keep it';

  return (
    <div style={containerStyle}>
      <Link href="/find-items" style={backLinkStyle}>
        <ChevronLeft size={20} /> Back to Search
      </Link>

      <div style={contentGrid}>
        <div style={imageWrapper}>
          {item.image_urls?.[0] ? (
            <img src={item.image_urls[0]} alt={item.item_name} style={fullImgStyle} />
          ) : (
            <div style={noImgStyle}><Package size={64} /></div>
          )}
        </div>

        <div style={detailsPane}>
          <h1 style={titleStyle}>{item.item_name}</h1>
          <p style={categoryStyle}>{item.category} • {item.condition}</p>
          
          <div style={metaGroup}>
            <div style={metaItem}><MapPin size={18} color="#00ccff" /> {item.location_display}</div>
            <div style={metaItem}><User size={18} color="#00ccff" /> {isGift ? 'Offered' : 'Owned'} by {item.owner_name}</div>
          </div>

          {/* --- NEW: BORROWING TERMS & PRICES SECTION --- */}
          {!isGift && (
            <div style={termsSection}>
              <h4 style={labelStyle}>Lending Terms</h4>
              
              <div style={{ display: 'flex', gap: '20px', marginBottom: '20px' }}>
                {item.pickup_by && (
                  <div style={termDetail}><Calendar size={16} /> Pickup by {new Date(item.pickup_by).toLocaleDateString()}</div>
                )}
                {item.return_by && (
                  <div style={termDetail}><Calendar size={16} /> Return by {new Date(item.return_by).toLocaleDateString()}</div>
                )}
              </div>

              {item.return_terms && (
                <div style={returnTermsBox}>
                  <p style={{ margin: 0, fontSize: '14px', color: '#aaa', marginBottom: '5px', textTransform: 'uppercase', fontWeight: 'bold' }}>Condition of Return</p>
                  <p style={{ margin: 0, fontStyle: 'italic', color: '#eee' }}>"{item.return_terms}"</p>
                </div>
              )}

              <div style={{ display: 'flex', gap: '15px', marginTop: '15px' }}>
                {item.damage_price && (
                  <div style={priceTag}>
                    <Shield size={14} color="#f97316" /> Damage Agreement: ${Math.round(item.damage_price)}
                  </div>
                )}
                {item.loss_price && (
                  <div style={priceTag}>
                    <AlertTriangle size={14} color="#ef4444" /> Loss Agreement: ${Math.round(item.loss_price)}
                  </div>
                )}
              </div>
            </div>
          )}

          <div style={descSection}>
            <h4 style={labelStyle}>About this gear</h4>
            <p style={descText}>{item.description || 'No description provided.'}</p>
          </div>

          <button 
  style={borrowButtonStyle} 
  onClick={() => setIsModalOpen(true)}
>
  Request Item
</button>
        </div>
      </div>

      {isModalOpen && (
        <RequestModal item={item} onClose={() => setIsModalOpen(false)} />
      )}
    </div>
  );
}

// --- ADDED STYLES ---
const termsSection: React.CSSProperties = { backgroundColor: '#111', padding: '25px', borderRadius: '20px', border: '1px solid #222', marginBottom: '10px' };
const termDetail: React.CSSProperties = { display: 'flex', alignItems: 'center', gap: '8px', fontSize: '14px', color: '#ccc' };
const returnTermsBox: React.CSSProperties = { padding: '15px', backgroundColor: '#000', borderRadius: '12px', border: '1px solid #333' };
const priceTag: React.CSSProperties = { display: 'flex', alignItems: 'center', gap: '6px', fontSize: '14px', fontWeight: 'bold' };

// --- EXISTING STYLES (NO CHANGES) ---
const containerStyle: React.CSSProperties = { padding: '40px 20px', maxWidth: '1100px', margin: '0 auto', color: '#fff' };
const backLinkStyle: React.CSSProperties = { display: 'flex', alignItems: 'center', gap: '5px', color: '#00ccff', textDecoration: 'none', marginBottom: '30px', fontWeight: 'bold' };
const contentGrid: React.CSSProperties = { display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(350px, 1fr))', gap: '50px' };
const imageWrapper: React.CSSProperties = { borderRadius: '24px', overflow: 'hidden', backgroundColor: '#111', height: '500px', border: '1px solid #222' };
const fullImgStyle: React.CSSProperties = { width: '100%', height: '100%', objectFit: 'cover' };
const noImgStyle: React.CSSProperties = { height: '100%', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#222' };
const detailsPane: React.CSSProperties = { display: 'flex', flexDirection: 'column', gap: '10px' };
const titleStyle: React.CSSProperties = { fontSize: '42px', fontWeight: 'bold', margin: 0 };
const categoryStyle: React.CSSProperties = { color: '#00ccff', fontWeight: 'bold', fontSize: '18px', textTransform: 'uppercase', marginBottom: '20px' };
const metaGroup: React.CSSProperties = { display: 'flex', flexDirection: 'column', gap: '15px', marginBottom: '20px' };
const metaItem: React.CSSProperties = { display: 'flex', alignItems: 'center', gap: '10px', fontSize: '18px' };
const descSection: React.CSSProperties = { backgroundColor: '#0a0a0a', padding: '25px', borderRadius: '20px', border: '1px solid #222' };
const labelStyle: React.CSSProperties = { color: '#666', fontSize: '12px', textTransform: 'uppercase', marginBottom: '10px', letterSpacing: '1px' };
const descText: React.CSSProperties = { lineHeight: '1.7', color: '#ccc', fontSize: '16px' };
const borrowButtonStyle: React.CSSProperties = { marginTop: '30px', padding: '20px', borderRadius: '14px', border: 'none', backgroundColor: '#00ccff', color: '#000', fontWeight: 'bold', fontSize: '18px', cursor: 'pointer' };