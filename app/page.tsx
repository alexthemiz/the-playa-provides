'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { supabase } from '@/lib/supabaseClient';
import PolaroidPhoto from '@/components/PolaroidPhoto';

export default function HomePage() {
  const [marqueeItems, setMarqueeItems] = useState<any[]>([]);
  const [marqueeHovered, setMarqueeHovered] = useState(false);
  const [showDeletedBanner, setShowDeletedBanner] = useState(false);
  const [wishlistTags, setWishlistTags] = useState<{ tag: string; username: string }[]>([]);
  const [wishlistHovered, setWishlistHovered] = useState(false);

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

      const withImages = (data || []).filter(
        (item: any) => Array.isArray(item.image_urls) && item.image_urls.length > 0
      );
      setMarqueeItems(withImages);
    }
    fetchMarqueeItems();
  }, []);

  useEffect(() => {
    async function fetchWishlists() {
      const { data } = await supabase
        .from('profiles')
        .select('username, wish_list')
        .not('wish_list', 'is', null);

      const tags: { tag: string; username: string }[] = [];
      for (const row of data || []) {
        if (!row.username) continue;
        const list = Array.isArray(row.wish_list) ? row.wish_list : [];
        for (const tag of list) {
          if (tag) tags.push({ tag, username: row.username });
        }
      }
      setWishlistTags(tags);
    }
    fetchWishlists();
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
        @keyframes wishlistTicker {
          from { transform: translateX(0); }
          to   { transform: translateX(-50%); }
        }
      `}</style>

      {/* Hero Section */}
      <section style={{
        padding: '80px 20px 20px',
        textAlign: 'center',
        background: '#ffffff',
      }}>
        <h1 style={{ fontSize: '4rem', marginBottom: '20px', fontWeight: '900', letterSpacing: '-2px', color: '#2D241E' }}>
          The Playa Provides<span className="blink-cursor" style={{ letterSpacing: '-2px', paddingRight: '4px' }}>__</span>
        </h1>

        <p style={{
          maxWidth: '750px',
          margin: '0 auto 32px',
          fontSize: '1.6rem',
          lineHeight: '1.4',
          color: '#2D241E',
          fontWeight: '700',
        }}>
          Why let your stuff collect dust in storage when it could be collecting dust on playa?
        </p>

        {/* Main Borrow/Lend Actions */}
        <div style={{ display: 'flex', gap: '16px', justifyContent: 'center', marginBottom: '0' }}>
          <Link href="/find-items" style={primaryBtn}>Borrow Items</Link>
          <Link href="/list-item" style={secondaryBtn}>Lend Items</Link>
        </div>
      </section>

      {/* Numbered list */}
      <div style={{ maxWidth: '860px', margin: '0 auto', padding: '40px 20px 40px', display: 'flex', flexDirection: 'column' as const, gap: '28px' }}>
        {[
          { n: '1', title: 'Easily keep track of what you own', sub: 'Your inventory stays private until you decide what to share, when, and with whom.' },
          { n: '2', title: 'Lend or give away what you\'re not using', sub: 'Make it easier and cheaper for your fellow burners to get to BRC.' },
          { n: '3', title: 'Borrow what you need', sub: 'Skip the Amazon order. Someone in the community probably has it already.' },
        ].map(({ n, title, sub }) => (
          <div key={n} style={{ display: 'flex', gap: '20px', alignItems: 'flex-start' }}>
            <span style={{ fontSize: '2.4rem', fontWeight: '900', color: '#00ccff', lineHeight: 1, flexShrink: 0, width: '40px', textAlign: 'center' as const }}>{n}</span>
            <div>
              <p style={{ margin: '0 0 4px', fontSize: '1.05rem', fontWeight: '700', color: '#2D241E' }}>{title}</p>
              <p style={{ margin: 0, fontSize: '0.95rem', color: '#777', lineHeight: '1.5' }}>{sub}</p>
            </div>
          </div>
        ))}
      </div>

      {/* Polaroid Marquee */}
      {marqueeItems.length > 0 && (
        <div style={{ width: '100%', backgroundColor: '#ffffff' }}>
          <p style={{ textAlign: 'center' as const, fontSize: '1.2rem', fontWeight: 700, color: '#2D241E', marginBottom: '16px', padding: '0 20px' }}>
            Missing supplies for the burn? See what users have made available.
          </p>
        <div style={{ overflow: 'hidden' as const, width: '100%', padding: '0 0 40px' }}>
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
        </div>
      )}

      {/* Wishlist Ticker */}
      {wishlistTags.length > 0 && (
        <div style={{ padding: '40px 0 20px', backgroundColor: '#fff' }}>
          <p style={{ textAlign: 'center' as const, fontSize: '1.2rem', fontWeight: 700, color: '#2D241E', marginBottom: '16px', padding: '0 20px' }}>
            Burners are looking for these items. Can you help them out?
          </p>
          <div style={{ overflow: 'hidden' as const, width: '100%', paddingTop: '8px', paddingBottom: '12px' }}>
            <div
              onMouseEnter={() => setWishlistHovered(true)}
              onMouseLeave={() => setWishlistHovered(false)}
              style={{
                display: 'flex',
                gap: '12px',
                width: 'max-content',
                animation: 'wishlistTicker 50s linear infinite',
                animationPlayState: wishlistHovered ? 'paused' : 'running',
                paddingLeft: '20px',
                alignItems: 'center',
              }}
            >
              {[...wishlistTags, ...wishlistTags].map(({ tag, username }, i) => (
                <a
                  key={i}
                  href={`/profile/${username}`}
                  style={{
                    flexShrink: 0,
                    padding: '5px 14px',
                    borderRadius: '20px',
                    border: '1px solid #00ccff',
                    backgroundColor: '#f0fcff',
                    color: '#007a99',
                    fontSize: '0.85rem',
                    fontWeight: 500,
                    textDecoration: 'none',
                    whiteSpace: 'nowrap' as const,
                  }}
                >
                  {tag}
                </a>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* On-Playa Resources */}
      <div style={{ textAlign: 'center' as const, padding: '40px 20px 60px' }}>
        <p style={{ fontSize: '1.2rem', color: '#666', marginBottom: '16px', fontWeight: 700 }}>
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
};

const secondaryBtn = {
  padding: '14px 32px',
  backgroundColor: '#C08261',
  color: 'white',
  borderRadius: '12px',
  textDecoration: 'none',
  fontWeight: 'bold',
  fontSize: '1.05rem',
};

const resourceBtn = {
  padding: '16px 36px',
  backgroundColor: '#F5E6D3',
  color: '#634832',
  borderRadius: '12px',
  textDecoration: 'none',
  fontWeight: 'bold',
  fontSize: '1rem',
  display: 'inline-block',
  border: '1px solid #E6D2B5'
};

// branching test
