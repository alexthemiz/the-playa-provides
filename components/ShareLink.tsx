'use client';

import { useState } from 'react';
import { shareItem } from '@/lib/shareItem';

interface ShareLinkProps {
  itemId: string | number;
  itemName: string;
  style?: React.CSSProperties;
}

export default function ShareLink({ itemId, itemName, style }: ShareLinkProps) {
  const [copied, setCopied] = useState(false);

  const handleClick = async () => {
    const result = await shareItem(itemId, itemName);
    if (result === 'copied') {
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    }
  };

  return (
    <button onClick={handleClick} style={style}>
      {copied ? 'Copied!' : 'Share'}
    </button>
  );
}
