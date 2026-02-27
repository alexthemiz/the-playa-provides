'use client';

import Link from 'next/link';

export default function AuthCodeErrorPage() {
  return (
    <div style={containerStyle}>
      <div style={cardStyle}>
        <div style={{ fontSize: '2rem', marginBottom: '16px' }}>🔗</div>
        <h1 style={{ margin: '0 0 10px', fontSize: '1.4rem', fontWeight: 'bold', color: '#2D241E' }}>
          Link Expired or Invalid
        </h1>
        <p style={{ margin: '0 0 24px', color: '#666', fontSize: '0.95rem', lineHeight: '1.6' }}>
          That magic link has either expired or already been used. Links are single-use and valid for one hour.
        </p>
        <Link href="/login" style={buttonStyle}>
          Back to Login
        </Link>
        <p style={{ marginTop: '16px', fontSize: '0.8rem', color: '#aaa' }}>
          Just request a new magic link from the login page.
        </p>
      </div>
    </div>
  );
}

const containerStyle: React.CSSProperties = {
  display: 'flex',
  alignItems: 'center',
  justifyContent: 'center',
  minHeight: '80vh',
  padding: '20px',
  textAlign: 'center' as const,
};

const cardStyle: React.CSSProperties = {
  backgroundColor: '#fff',
  padding: '40px 32px',
  borderRadius: '16px',
  border: '1px solid #e5e5e5',
  boxShadow: '0 4px 20px rgba(0,0,0,0.06)',
  maxWidth: '380px',
  width: '100%',
};

const buttonStyle: React.CSSProperties = {
  display: 'inline-block',
  padding: '12px 28px',
  backgroundColor: '#00ccff',
  color: '#000',
  fontWeight: 600,
  borderRadius: '8px',
  textDecoration: 'none',
  fontSize: '0.95rem',
};
