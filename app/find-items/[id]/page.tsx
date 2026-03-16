'use client';

import { useEffect, useState, use } from 'react';
import { supabase } from '@/lib/supabaseClient';
import { MapPin, User, ChevronLeft, Shield, AlertTriangle, Calendar } from 'lucide-react';
import Link from 'next/link';
import RequestModal from '@/components/RequestModal'; // Assuming this is your path
import PolaroidPhoto from '@/components/PolaroidPhoto';

export default function ItemDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const resolvedParams = use(params);
  const [item, setItem] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [session, setSession] = useState<any>(undefined); // undefined = not yet checked

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
  if (!item) return <div style={containerStyle}><p>This item isn't available, or you may need to log in to view it.</p></div>;

  const isGift = item.availability_status === 'You can keep it';

  return (
    <div style={containerStyle}>
      <Link href="/find-items" style={backLinkStyle}>
        <ChevronLeft size={20} /> Back to Search
      </Link>

      <div style={contentGrid}>
        {/* Left column: photo + button */}
        <div style={{ display: 'flex', flexDirection: 'column' as const, gap: '12px' }}>
          <PolaroidPhoto src={item.image_urls?.[0]} alt={item.item_name} itemId={item.id} />
          {session ? (
            <button style={borrowButtonStyle} onClick={() => setIsModalOpen(true)}>
              Request Item
            </button>
          ) : (
            <a href="/login" style={{ ...borrowButtonStyle, display: 'block', textAlign: 'center' as const, textDecoration: 'none' }}>
              Log In to Request
            </a>
          )}
        </div>

        {/* Right column: details */}
        <div style={detailsPane}>
          <h1 style={titleStyle}>{item.item_name}</h1>
          <p style={categoryStyle}>{item.category} • {item.condition}</p>

          <div style={metaGroup}>
            <div style={metaItem}><MapPin size={15} color="#00ccff" /> {item.location_display}</div>
            <div style={metaItem}><User size={15} color="#00ccff" /> {isGift ? 'Offered' : 'Owned'} by {item.owner_name}</div>
          </div>

          {!isGift && (
            <div style={termsSection}>
              <h4 style={labelStyle}>Lending Terms</h4>

              <div style={{ display: 'flex', gap: '20px', marginBottom: '16px' }}>
                {item.pickup_by && (
                  <div style={termDetail}><Calendar size={14} /> Pickup by {new Date(item.pickup_by).toLocaleDateString()}</div>
                )}
                {item.return_by && (
                  <div style={termDetail}><Calendar size={14} /> Return by {new Date(item.return_by).toLocaleDateString()}</div>
                )}
              </div>

              {item.return_terms && (
                <div style={returnTermsBox}>
                  <p style={{ margin: 0, fontSize: '12px', color: '#888', marginBottom: '4px', textTransform: 'uppercase' as const, fontWeight: 'bold' }}>Condition of Return</p>
                  <p style={{ margin: 0, fontStyle: 'italic' as const, color: '#444' }}>"{item.return_terms}"</p>
                </div>
              )}

              <div style={{ display: 'flex', gap: '15px', marginTop: '12px' }}>
                {item.damage_price && (
                  <div style={priceTag}>
                    <Shield size={13} color="#f97316" /> Damage: ${Math.round(item.damage_price)}
                  </div>
                )}
                {item.loss_price && (
                  <div style={priceTag}>
                    <AlertTriangle size={13} color="#ef4444" /> Loss: ${Math.round(item.loss_price)}
                  </div>
                )}
              </div>
            </div>
          )}

          <div style={descSection}>
            <h4 style={labelStyle}>About this item</h4>
            <p style={descText}>{item.description || 'No description provided.'}</p>
          </div>
        </div>
      </div>

      {isModalOpen && (
        <RequestModal item={item} onClose={() => setIsModalOpen(false)} />
      )}
    </div>
  );
}

const termsSection: React.CSSProperties = { backgroundColor: '#f7f7f7', padding: '16px', borderRadius: '12px', border: '1px solid #e5e5e5', marginBottom: '8px' };
const termDetail: React.CSSProperties = { display: 'flex', alignItems: 'center', gap: '8px', fontSize: '13px', color: '#444' };
const returnTermsBox: React.CSSProperties = { padding: '12px', backgroundColor: '#efefef', borderRadius: '8px', border: '1px solid #ddd' };
const priceTag: React.CSSProperties = { display: 'flex', alignItems: 'center', gap: '6px', fontSize: '13px', fontWeight: 'bold', color: '#2D241E' };

const containerStyle: React.CSSProperties = { padding: '32px 20px', maxWidth: '1000px', margin: '0 auto', color: '#2D241E' };
const backLinkStyle: React.CSSProperties = { display: 'flex', alignItems: 'center', gap: '5px', color: '#00ccff', textDecoration: 'none', marginBottom: '20px', fontWeight: 'bold' };
const contentGrid: React.CSSProperties = { display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(300px, 1fr))', gap: '28px' };
const detailsPane: React.CSSProperties = { display: 'flex', flexDirection: 'column' as const, gap: '8px' };
const titleStyle: React.CSSProperties = { fontSize: '26px', fontWeight: 'bold', margin: 0, color: '#2D241E' };
const categoryStyle: React.CSSProperties = { color: '#00aacc', fontWeight: 'bold', fontSize: '13px', textTransform: 'uppercase' as const, marginBottom: '8px', letterSpacing: '0.05em' };
const metaGroup: React.CSSProperties = { display: 'flex', flexDirection: 'column' as const, gap: '8px', marginBottom: '8px' };
const metaItem: React.CSSProperties = { display: 'flex', alignItems: 'center', gap: '8px', fontSize: '14px', color: '#444' };
const descSection: React.CSSProperties = { backgroundColor: '#f7f7f7', padding: '16px', borderRadius: '12px', border: '1px solid #e5e5e5' };
const labelStyle: React.CSSProperties = { color: '#888', fontSize: '11px', textTransform: 'uppercase' as const, marginBottom: '8px', letterSpacing: '1px', fontWeight: 700 };
const descText: React.CSSProperties = { lineHeight: '1.7', color: '#444', fontSize: '14px', margin: 0 };
const borrowButtonStyle: React.CSSProperties = { padding: '14px', borderRadius: '10px', border: 'none', backgroundColor: '#00ccff', color: '#000', fontWeight: 'bold', fontSize: '15px', cursor: 'pointer', width: '100%' };