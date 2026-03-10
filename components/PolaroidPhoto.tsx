import { Package } from 'lucide-react';

interface PolaroidPhotoProps {
  src?: string;
  alt: string;
  itemId: number;
  imageSize?: number; // if set, renders a fixed square with objectFit:contain
}

export default function PolaroidPhoto({ src, alt, itemId, imageSize }: PolaroidPhotoProps) {
  const rotation = ((itemId % 7) - 3) * 0.7;

  const imageContent = src ? (
    imageSize ? (
      <img
        src={src}
        alt={alt}
        style={{ width: '100%', height: '100%', objectFit: 'contain' as const, display: 'block' }}
      />
    ) : (
      <img
        src={src}
        alt={alt}
        style={{ width: '100%', height: 'auto', display: 'block' }}
      />
    )
  ) : (
    <div style={{ width: '100%', height: '100%', minHeight: '200px', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#ccc', backgroundColor: '#f0f0f0' }}>
      <Package size={48} />
    </div>
  );

  return (
    <div style={{
      backgroundColor: '#fff',
      padding: '10px 10px 28px 10px',
      boxShadow: '0 4px 12px rgba(0,0,0,0.15)',
      transform: `rotate(${rotation}deg)`,
      boxSizing: 'border-box' as const,
      width: imageSize ? `${imageSize + 20}px` : '100%',
    }}>
      {imageSize ? (
        <div style={{ width: `${imageSize}px`, height: `${imageSize}px`, overflow: 'hidden' as const, backgroundColor: '#f0f0f0' }}>
          {imageContent}
        </div>
      ) : imageContent}
    </div>
  );
}
