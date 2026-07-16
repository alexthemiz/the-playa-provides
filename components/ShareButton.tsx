'use client';

import { useState } from 'react';
import { Share2, Check } from 'lucide-react';

const INK = '#1C1610';

interface ShareButtonProps {
  itemId: string | number;
  itemName: string;
}

export default function ShareButton({ itemId, itemName }: ShareButtonProps) {
  const [copied, setCopied] = useState(false);

  const handleShare = async () => {
    const url = `${window.location.origin}/find-items/${itemId}`;

    if (navigator.share) {
      try {
        await navigator.share({
          title: itemName,
          text: `Check out "${itemName}" on The Playa Provides`,
          url,
        });
      } catch (err: unknown) {
        if ((err as Error)?.name !== 'AbortError') {
          console.error('Share failed:', err);
        }
      }
      return;
    }

    try {
      await navigator.clipboard.writeText(url);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch (err: unknown) {
      console.error('Copy failed:', err);
    }
  };

  return (
    <button onClick={handleShare} style={shareButtonStyle}>
      {copied ? <Check size={16} /> : <Share2 size={16} />}
      {copied ? 'Link copied!' : 'Share'}
    </button>
  );
}

const shareButtonStyle: React.CSSProperties = {
  width: '100%',
  padding: '12px 28px',
  marginTop: '8px',
  display: 'flex',
  alignItems: 'center',
  justifyContent: 'center',
  gap: '8px',
  backgroundColor: 'transparent',
  color: INK,
  border: `2px solid ${INK}`,
  fontWeight: 700,
  fontSize: '0.9rem',
  cursor: 'pointer',
  fontFamily: 'Outfit, sans-serif',
};
