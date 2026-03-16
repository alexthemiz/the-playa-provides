'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { supabase } from '@/lib/supabaseClient';
import PolaroidPhoto from '@/components/PolaroidPhoto';

export default function HomePage() {
  const [marqueeItems, setMarqueeItems] = useState<any[]>([]);
  const [marqueeHovered, setMarqueeHovered] = useState(false);
  const [showDeletedBanner, setShowDeletedBanner] = useState(false);

  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    if (params.get('deleted') === 'true') {
      setShowDeletedBanner(true);
      const url = new URL(window.location.href);
      url.searchParams.delete('deleted');
      window.history.replaceState({}, '', url.toString());
    }
  }, []);

  useEffect(() => {
    async function fetchMarqueeItems() {
      const { data } = await supabase
        .from('gear_items')
        .select('id, item_name, image_urls, availability_status')
        .in('availability_status', ['Available to Borrow', 'Available to Keep'])
        .limit(20);

      // Only show items that have at least one image
      const withImages = (data || []).filter(
        (item: any) => Array.isArray(item.image_urls) && item.image_urls.length > 0
      );
      setMarqueeItems(withImages);
    }
    fetchMarqueeItems();
  }, []);

  return (
    <div style={{ backgroundColor: '#ffffff', minHeight: '100vh', color: '#2D241E', fontFamily: 'sans-serif' }}>

      {showDeletedBanner && (
        <div style={{ backgroundColor: '#dcfce7', borderBottom: '1px solid #86efac', padding: '12px 20px', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <span style={{ color: '#166534', fontSize: '0.9rem', fontWeight: 600 }}>Your account has been successfully deleted.</span>
          <button onClick={() => setShowDeletedBanner(false)} style={{ background: 'none', border: 'none', cursor: 'pointer', color: '#166534', fontSize: '1.1rem', lineHeight: 1 }}>×</button>
        </div>
      )}

      <style>{`
        @keyframes marquee {
          from { transform: translateX(0); }
          to   { transform: translateX(-50%); }
        }
      `}</style>

      {/* Hero Section */}
      <section style={{
        padding: '80px 20px 40px',
        textAlign: 'center',
        background: 'radial-gradient(circle at center, #FAF9F6 0%, #ffffff 100%)',
      }}>
        <h1 style={{ fontSize: '4rem', marginBottom: '20px', fontWeight: '900', letterSpacing: '-2px', color: '#2D241E' }}>
          The Playa Provides
        </h1>

        <p style={{
          maxWidth: '850px',
          margin: '0 auto',
          fontSize: '1.3rem',
          lineHeight: '1.5',
          color: '#C08261',
          fontWeight: '500',
          marginBottom: '32px'
        }}>
          Why let your stuff collect dust in storage when it could be collecting dust on playa? Gift or lend your items, save your fellow burners money, and take the circular economy for a spin.
        </p>

        {/* Main Borrow/Lend Actions */}
        <div style={{ display: 'flex', gap: '16px', justifyContent: 'center', marginBottom: '0' }}>
          <Link href="/find-items" style={primaryBtn}>Borrow Items</Link>
          <Link href="/list-item" style={secondaryBtn}>Lend Items</Link>
        </div>
      </section>

      {/* Polaroid Marquee */}
      {marqueeItems.length > 0 && (
        <div style={{ overflow: 'hidden' as const, width: '100%', padding: '40px 0', backgroundColor: '#FAF9F6' }}>
          <div
            onMouseEnter={() => setMarqueeHovered(true)}
            onMouseLeave={() => setMarqueeHovered(false)}
            style={{
              display: 'flex',
              gap: '24px',
              width: 'max-content',
              animation: 'marquee 60s linear infinite',
              animationPlayState: marqueeHovered ? 'paused' : 'running',
              paddingLeft: '24px',
            }}
          >
            {[...marqueeItems, ...marqueeItems].map((item: any, i: number) => (
              <a
                key={i}
                href={`/find-items/${item.id}`}
                style={{ textDecoration: 'none', flexShrink: 0 }}
              >
                <PolaroidPhoto
                  src={item.image_urls[0]}
                  alt={item.item_name}
                  itemId={item.id}
                  imageSize={160}
                />
              </a>
            ))}
          </div>
        </div>
      )}

      {/* The Core Pillars */}
      <section style={{
        padding: '40px 20px 80px',
        display: 'grid',
        gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))',
        gap: '24px',
        maxWidth: '1100px',
        margin: '0 auto'
      }}>
        <div style={cardStyle}>
          <div style={iconStyle}>🎁</div>
          <h3 style={{ fontSize: '1.4rem', marginBottom: '8px', color: '#2D241E' }}>Practice Radical Interdependence</h3>
          <p style={{ color: '#666', fontSize: '0.95rem', lineHeight: '1.5' }}>
            Getting to the playa is expensive enough. Help a fellow burner cut costs by lending or passing on gear you're not using.
          </p>
        </div>

        <div style={cardStyle}>
          <div style={iconStyle}>📋</div>
          <h3 style={{ fontSize: '1.4rem', marginBottom: '8px', color: '#2D241E' }}>Track Your Inventory</h3>
          <p style={{ color: '#666', fontSize: '0.95rem', lineHeight: '1.5' }}>
            Your list stays private until you choose what you're open to sharing, when, and how.
          </p>
        </div>

        <div style={cardStyle}>
          <div style={iconStyle}>♻️</div>
          <h3 style={{ fontSize: '1.4rem', marginBottom: '8px', color: '#2D241E' }}>Cut Down on Purchasing New Things</h3>
          <p style={{ color: '#666', fontSize: '0.95rem', lineHeight: '1.5' }}>
            The world has enough stuff already. Let yours go to the playa this year even if you can't.
          </p>
        </div>
      </section>

      {/* On-Playa Resources */}
      <div style={{ textAlign: 'center' as const, padding: '20px 20px 60px' }}>
        <p style={{ fontSize: '1rem', color: '#666', marginBottom: '16px' }}>
          Find the camps providing services that make Burning Man more sustainable
        </p>
        <Link href="/resources" style={resourceBtn}>On-Playa Resources</Link>
      </div>
    </div>
  );
}

// Styling Constants
const primaryBtn = {
  padding: '14px 32px',
  backgroundColor: '#00ccff',
  color: 'white',
  borderRadius: '12px',
  textDecoration: 'none',
  fontWeight: 'bold',
  fontSize: '1.05rem',
  boxShadow: '0 4px 12px rgba(0, 204, 255, 0.25)'
};

const secondaryBtn = {
  padding: '14px 32px',
  backgroundColor: '#C08261',
  color: 'white',
  borderRadius: '12px',
  textDecoration: 'none',
  fontWeight: 'bold',
  fontSize: '1.05rem',
  boxShadow: '0 4px 12px rgba(192, 130, 97, 0.25)'
};

const resourceBtn = {
  padding: '12px 28px',
  backgroundColor: '#F5E6D3',
  color: '#634832',
  borderRadius: '12px',
  textDecoration: 'none',
  fontWeight: 'bold',
  fontSize: '0.95rem',
  display: 'inline-block',
  border: '1px solid #E6D2B5'
};

const cardStyle = {
  padding: '32px 24px',
  backgroundColor: '#FAF9F6',
  borderRadius: '24px',
  border: '1px solid #f0eee9',
  textAlign: 'center' as 'center'
};

const iconStyle = {
  fontSize: '2.2rem',
  marginBottom: '12px'
};
