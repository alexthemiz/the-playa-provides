'use client';

import { useEffect, useState, use } from 'react';
import { supabase } from '@/lib/supabaseClient';
import { MapPin, User, Package, ChevronLeft } from 'lucide-react';
import Link from 'next/link';

export default function ItemDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const resolvedParams = use(params);
  const [item, setItem] = useState<any>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function fetchItem() {
      setLoading(true);
      try {
        // 1. Fetch the base gear item
        const { data: gear, error: gearError } = await supabase
          .from('gear_items')
          .select('*')
          .eq('id', resolvedParams.id)
          .single();

        if (gearError) throw gearError;

        // 2. Fetch Owner and Location (Manual Join)
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

  return (
    <div style={containerStyle}>
      {/* Navigation */}
      <Link href="/find-items" style={backLinkStyle}>
        <ChevronLeft size={20} /> Back to Search
      </Link>

      <div style={contentGrid}>
        {/* Left Side: Large Image */}
        <div style={imageWrapper}>
          {item.image_urls?.[0] ? (
            <img src={item.image_urls[0]} alt={item.item_name} style={fullImgStyle} />
          ) : (
            <div style={noImgStyle}><Package size={64} /></div>
          )}
        </div>

        {/* Right Side: Details */}
        <div style={detailsPane}>
          <h1 style={titleStyle}>{item.item_name}</h1>
          <p style={categoryStyle}>{item.category} • {item.condition}</p>
          
          <div style={metaGroup}>
            <div style={metaItem}><MapPin size={18} color="#00ccff" /> {item.location_display}</div>
            <div style={metaItem}><User size={18} color="#00ccff" /> Owned by {item.owner_name}</div>
          </div>

          <div style={descSection}>
            <h4 style={labelStyle}>About this gear</h4>
            <p style={descText}>{item.description || 'No description provided.'}</p>
          </div>

          <button style={borrowButtonStyle}>Request to Borrow</button>
        </div>
      </div>
    </div>
  );
}

// --- STYLES ---
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