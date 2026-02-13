'use client';

import { supabase } from '@/lib/supabaseClient';
import { useRouter } from 'next/navigation';
import Link from 'next/link';

export default function RootLayout({ children }: { children: React.ReactNode }) {
  const router = useRouter();

  const handleSignOut = async () => {
    await supabase.auth.signOut();
    router.push('/login'); 
  };

  return (
    <html lang="en">
      <body style={bodyStyle}>
        <header style={headerStyle}>
          <div style={navContainer}>
            <div style={logoStyle}>✨ The Playa Provides</div>
            
            <nav style={navLinksStyle}>
              <Link href="/gear-feed" style={linkStyle}>The Feed</Link>
              <Link href="/list-item" style={linkStyle}>Offer Gear</Link>
              <Link href="/settings" style={linkStyle}>My Profile</Link>
            </nav>

            <button onClick={handleSignOut} style={signOutButtonStyle}>
              Sign Out
            </button>
          </div>
        </header>

        <main style={{ paddingTop: '100px', minHeight: '100vh' }}> 
          {children}
        </main>
      </body>
    </html>
  );
}

const bodyStyle = { margin: 0, padding: 0, backgroundColor: '#0a0a0a', color: '#f5f5f5', fontFamily: 'sans-serif' };
const headerStyle = { position: 'fixed' as 'fixed', top: 0, width: '100%', backgroundColor: '#000', borderBottom: '1px solid #222', zIndex: 1000 };
const navContainer = { display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '0 40px', height: '70px', maxWidth: '1200px', margin: '0 auto' };
const logoStyle = { fontWeight: 'bold' as 'bold', fontSize: '1.4rem', color: '#fff', letterSpacing: '0.5px' };
const navLinksStyle = { display: 'flex', gap: '30px' };
const linkStyle = { color: '#aaa', textDecoration: 'none', fontSize: '0.9rem', fontWeight: '500' };
const signOutButtonStyle = { background: 'transparent', border: '1px solid #333', color: '#666', padding: '6px 12px', borderRadius: '4px', cursor: 'pointer', fontSize: '0.8rem' };