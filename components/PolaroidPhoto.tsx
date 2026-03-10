import { Package } from 'lucide-react';

interface PolaroidPhotoProps {
  src?: string;
  alt: string;
  itemId: number;
  imageHeight?: number;
}

export default function PolaroidPhoto({ src, alt, itemId, imageHeight = 220 }: PolaroidPhotoProps) {
  const rotation = ((itemId % 7) - 3) * 0.7;

  return (
    <div style={{
      backgroundColor: '#fff',
      padding: '10px 10px 28px 10px',
      boxShadow: '0 4px 12px rgba(0,0,0,0.15)',
      transform: `rotate(${rotation}deg)`,
      boxSizing: 'border-box' as const,
      width: '100%',
    }}>
      <div style={{ width: '100%', height: `${imageHeight}px`, overflow: 'hidden' as const, backgroundColor: '#f0f0f0' }}>
        {src ? (
          <img
            src={src}
            alt={alt}
            style={{ width: '100%', height: '100%', objectFit: 'cover' as const, display: 'block' }}
          />
        ) : (
          <div style={{ width: '100%', height: '100%', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#ccc' }}>
            <Package size={48} />
          </div>
        )}
      </div>
    </div>
  );
}
