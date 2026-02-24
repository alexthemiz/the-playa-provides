'use client';

import Link from 'next/link';

export default function Footer() {
  return (
    <footer className="border-t border-[#A66D51] py-5" style={{ backgroundColor: '#C08261' }}>
      <div className="max-w-7xl mx-auto px-4 flex flex-col md:flex-row justify-between items-center gap-6">
        
        {/* Left Side: Branding */}
        <div className="flex flex-col items-center md:items-start flex-1">
          <h2 className="text-xl font-black text-[#2D241E] tracking-tighter uppercase leading-none">
            THE PLAYA PROVIDES
          </h2>
          <p className="text-[10px] text-[#2D241E] opacity-70 font-bold uppercase tracking-widest mt-1">
            © {new Date().getFullYear()} — All Rights Reserved
          </p>
        </div>

        {/* Center: Full Legal Navigation */}
        <nav className="flex gap-8 text-sm font-bold text-[#2D241E] flex-1 justify-center">
          <Link href="/about" className="hover:text-white transition-colors whitespace-nowrap">
            About
          </Link>
          <Link href="/terms" className="hover:text-white transition-colors whitespace-nowrap">
            Terms & Conditions
          </Link>
          <Link href="/privacy" className="hover:text-white transition-colors whitespace-nowrap">
            Privacy Policy
          </Link>
        </nav>

        {/* Right Side: Credit */}
        <div className="flex-1 text-center md:text-right">
          <p className="text-[11px] text-[#2D241E] font-medium italic leading-tight">
            Vibe coded with Gemini;<br />
            ideated with human brains.
          </p>
        </div>

      </div>
    </footer>
  );
}