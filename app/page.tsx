'use client';

import Link from 'next/link';

export default function HomePage() {
  return (
    <div style={{ backgroundColor: '#ffffff', minHeight: '100vh', color: '#2D241E', fontFamily: 'sans-serif' }}>
      {/* Hero Section */}
      <section style={{ 
        padding: '80px 20px 40px', // Reduced padding to tighten layout
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
        <div style={{ display: 'flex', gap: '16px', justifyContent: 'center', marginBottom: '48px' }}>
          <Link href="/find-items" style={primaryBtn}>Borrow Items</Link>
          <Link href="/list-item" style={secondaryBtn}>Lend Items</Link>
        </div>

        {/* Secondary Resources Action */}
        <div style={{ maxWidth: '600px', margin: '0 auto' }}>
          <p style={{ fontSize: '1rem', color: '#666', marginBottom: '16px' }}>
            Find the camps providing services that make Burning Man more sustainable
          </p>
          <Link href="/resources" style={resourceBtn}>On-Playa Resources</Link>
        </div>
      </section>

      {/* The Core Pillars - Moved Up & Tighter */}
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
          <h3 style={{ fontSize: '1.4rem', marginBottom: '8px', color: '#2D241E' }}>Gift or Lend</h3>
          <p style={{ color: '#666', fontSize: '0.95rem', lineHeight: '1.5' }}>
            Pass on gear you no longer need or lend high-quality items to the community.
          </p>
        </div>

        <div style={cardStyle}>
          <div style={iconStyle}>📋</div>
          <h3 style={{ fontSize: '1.4rem', marginBottom: '8px', color: '#2D241E' }}>Digital Inventory</h3>
          <p style={{ color: '#666', fontSize: '0.95rem', lineHeight: '1.5' }}>
            A cloud-based home for your gear. Keep track of every stake and strut, whether you're sharing or just staying organized.
          </p>
        </div>

        <div style={cardStyle}>
          <div style={iconStyle}>♻️</div>
          <h3 style={{ fontSize: '1.4rem', marginBottom: '8px', color: '#2D241E' }}>Reduce</h3>
          <p style={{ color: '#666', fontSize: '0.95rem', lineHeight: '1.5' }}>
            Stop the "Buy-and-Dump" cycle. Protect the desert and your wallet by sharing what we already own.
          </p>
        </div>
      </section>
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
  backgroundColor: '#F5E6D3', // Soft Sand/Gold color
  color: '#634832', // Deep brown text for contrast
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