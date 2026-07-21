'use client';

import { useState } from 'react';
import { Share2, Check } from 'lucide-react';
import { shareItem } from '@/lib/shareItem';

const INK = '#1C1610';

interface ShareButtonProps {
  itemId: string | number;
  itemName: string;
  style?: React.CSSProperties;
}

export default function ShareButton({ itemId, itemName, style }: ShareButtonProps) {
  const [copied, setCopied] = useState(false);

  const handleShare = async () => {
    const result = await shareItem(itemId, itemName);
    if (result === 'copied') {
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    }
  };

  return (
    <button onClick={handleShare} style={{ ...shareButtonStyle, ...style }}>
      {copied ? <Check size={16} /> : <Share2 size={16} />}
      {copied ? 'Link copied!' : 'Share'}
    </button>
  );
}

const shareButtonStyle: React.CSSProperties = {
  width: 'auto',
  padding: '10px 20px',
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
