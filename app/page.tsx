'use client';

import Link from 'next/link';

export default function HomePage() {
  return (
    <div style={{ backgroundColor: '#000', minHeight: '100vh', color: 'white', fontFamily: 'sans-serif' }}>
      {/* Hero Section */}
      <section style={{ 
        padding: '120px 20px', 
        textAlign: 'center', 
        background: 'radial-gradient(circle at center, #1a1a1a 0%, #000 100%)',
        borderBottom: '1px solid #222' 
      }}>
        <h1 style={{ fontSize: '4rem', marginBottom: '24px', fontWeight: '900', letterSpacing: '-2px', color: '#fff' }}>
          The Playa Provides
        </h1>
        <p style={{ 
          maxWidth: '750px', 
          margin: '0 auto', 
          fontSize: '1.4rem', 
          lineHeight: '1.6', 
          color: '#d4a373',
          fontWeight: '500'
        }}>
          "Why let your stuff collect dust in storage when it could be collecting dust on playa? 
          Gift or lend your items to others: you’ll save them money, cut into big box store 
          earnings, and get you partaking in the circular economy."
        </p>
        
        <div style={{ marginTop: '50px', display: 'flex', gap: '20px', justifyContent: 'center' }}>
          <Link href="/find-items" style={primaryBtn}>Find Gear</Link>
          <Link href="/list-item" style={secondaryBtn}>List Your Gear</Link>
        </div>
      </section>

      {/* The Core Pillars */}
      <section style={{ padding: '80px 20px', display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))', gap: '30px', maxWidth: '1100px', margin: '0 auto' }}>
        <div style={cardStyle}>
          <div style={iconStyle}>🎁</div>
          <h3 style={{ fontSize: '1.5rem', marginBottom: '10px' }}>Gift</h3>
          <p style={{ color: '#888', lineHeight: '1.5' }}>Pass on gear you no longer need to a fellow burner. Keep the cycle moving and reduce waste.</p>
        </div>
        <div style={cardStyle}>
          <div style={iconStyle}>🤝</div>
          <h3 style={{ fontSize: '1.5rem', marginBottom: '10px' }}>Lend</h3>
          <p style={{ color: '#888', lineHeight: '1.5' }}>Share high-quality items for a single burn. Trust-based communal sharing at its best.</p>
        </div>
        <div style={cardStyle}>
          <div style={iconStyle}>♻️</div>
          <h3 style={{ fontSize: '1.5rem', marginBottom: '10px' }}>Reduce</h3>
          <p style={{ color: '#888', lineHeight: '1.5' }}>Stop the "Buy-and-Dump" cycle at big-box retailers. Protect the playa and your wallet.</p>
        </div>
      </section>
    </div>
  );
}

// Styling Constants
const primaryBtn = { 
  padding: '16px 36px', 
  backgroundColor: '#00ccff', 
  color: 'black', 
  borderRadius: '12px', 
  textDecoration: 'none', 
  fontWeight: 'bold',
  fontSize: '1.1rem',
  transition: 'transform 0.2s'
};

const secondaryBtn = { 
  padding: '16px 36px', 
  backgroundColor: 'transparent', 
  color: 'white', 
  border: '1px solid #444', 
  borderRadius: '12px', 
  textDecoration: 'none', 
  fontWeight: 'bold',
  fontSize: '1.1rem'
};

const cardStyle = { 
  padding: '40px 30px', 
  backgroundColor: '#0a0a0a', 
  borderRadius: '20px', 
  border: '1px solid #1a1a1a', 
  textAlign: 'center' as 'center' 
};

const iconStyle = {
  fontSize: '2.5rem',
  marginBottom: '15px'
};