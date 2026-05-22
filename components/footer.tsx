'use client';

import Link from 'next/link';
import { Instagram } from 'lucide-react';

const INK      = '#1C1610'
const INK_LITE = '#9A8878'
const PAPER    = '#F6F1E8'
const LIME     = '#B8CC2A'

export default function Footer() {
  return (
    <footer style={{ backgroundColor: INK, borderTop: `3px solid ${LIME}`, padding: '20px 40px' }}>
      <div style={{ maxWidth: '1400px', margin: '0 auto', display: 'flex', flexWrap: 'wrap', justifyContent: 'space-between', alignItems: 'center', gap: '16px' }}>

        {/* Branding */}
        <div>
          <div style={{ fontFamily: "'Arvo', serif", fontSize: '1rem', fontWeight: 700, color: PAPER, letterSpacing: '-0.01em' }}>
            The Playa <em style={{ fontStyle: 'italic', color: LIME }}>Provides</em>
          </div>
          <div style={{ fontFamily: "'Space Mono', monospace", fontSize: '0.6rem', color: INK_LITE, marginTop: '4px', letterSpacing: '0.06em' }}>
            © {new Date().getFullYear()} — All Rights Reserved
          </div>
        </div>

        {/* Nav */}
        <nav style={{ display: 'flex', gap: '24px', alignItems: 'center' }}>
          <Link href="/about"   style={{ fontSize: '0.78rem', color: INK_LITE, textDecoration: 'none', fontWeight: 500 }}>About</Link>
          <Link href="/terms"   style={{ fontSize: '0.78rem', color: INK_LITE, textDecoration: 'none', fontWeight: 500 }}>Terms</Link>
          <Link href="/privacy" style={{ fontSize: '0.78rem', color: INK_LITE, textDecoration: 'none', fontWeight: 500 }}>Privacy</Link>
          <span style={{ color: '#333', fontSize: '0.75rem' }}>|</span>
          <a
            href="https://www.instagram.com/theplayaprovides_/"
            target="_blank" rel="noopener noreferrer"
            style={{ display: 'flex', alignItems: 'center', gap: '5px', fontSize: '0.78rem', color: INK_LITE, textDecoration: 'none', fontWeight: 500 }}
          >
            <Instagram size={13} />
            @theplayaprovides_
          </a>
        </nav>

        {/* Disclaimer */}
        <div style={{ textAlign: 'right' }}>
          <div style={{ fontFamily: "'Space Mono', monospace", fontSize: '0.58rem', color: '#333', lineHeight: 1.5 }}>
            Not affiliated with or endorsed by Burning Man Project.<br />
            Built with Claude Code; ideated with human brains.
          </div>
        </div>

      </div>
    </footer>
  );
}
