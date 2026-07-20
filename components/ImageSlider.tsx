'use client';

import { useState } from 'react';
import { ChevronLeft, ChevronRight, Package } from 'lucide-react';

const TEAL = '#1E8A82';

interface ImageSliderProps {
  images: string[] | null;
  aspectRatio?: string; // CSS aspect-ratio value, e.g. "1 / 1" or "4 / 3"
}

export default function ImageSlider({ images, aspectRatio = "1 / 1" }: ImageSliderProps) {
  const [currentIndex, setCurrentIndex] = useState(0);
  const [hovering, setHovering] = useState(false);
  const [arrowHovered, setArrowHovered] = useState<'prev' | 'next' | null>(null);

  if (!images || images.length === 0) {
    return (
      <div style={{ display: 'flex', flexDirection: 'column' as const, alignItems: 'center', justifyContent: 'center', height: '100%', minHeight: '200px', color: '#a1a1aa', fontStyle: 'italic' as const, backgroundColor: '#111', aspectRatio }}>
        <Package style={{ height: '32px', width: '32px', marginBottom: '8px', opacity: 0.2 }} />
        No Photos
      </div>
    );
  }

  const next = (e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setCurrentIndex((prev) => (prev + 1) % images.length);
  };

  const prev = (e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setCurrentIndex((prev) => (prev - 1 + images.length) % images.length);
  };

  return (
    <div
      onMouseEnter={() => setHovering(true)}
      onMouseLeave={() => setHovering(false)}
      style={{ position: 'relative' as const, width: '100%', height: '100%', overflow: 'hidden', aspectRatio }}
    >
      <img
        src={images[currentIndex]}
        style={{ objectFit: 'contain' as const, width: '100%', height: '100%', transition: 'opacity 0.3s', backgroundColor: '#000' }}
        alt="Gear view"
      />

      {images.length > 1 && (
        <>
          <div style={{ position: 'absolute' as const, inset: 0, display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '8px', opacity: hovering ? 1 : 0, transition: 'opacity 0.2s' }}>
            <button
              onClick={prev}
              onMouseEnter={() => setArrowHovered('prev')}
              onMouseLeave={() => setArrowHovered(null)}
              style={{ pointerEvents: 'auto' as const, backgroundColor: arrowHovered === 'prev' ? 'rgba(0,0,0,0.9)' : 'rgba(0,0,0,0.6)', color: '#fff', padding: '8px', borderRadius: '999px', backdropFilter: 'blur(4px)', border: '1px solid rgba(255,255,255,0.1)', cursor: 'pointer', transition: 'background-color 0.15s', display: 'flex' }}
            >
              <ChevronLeft style={{ height: '20px', width: '20px' }} />
            </button>
            <button
              onClick={next}
              onMouseEnter={() => setArrowHovered('next')}
              onMouseLeave={() => setArrowHovered(null)}
              style={{ pointerEvents: 'auto' as const, backgroundColor: arrowHovered === 'next' ? 'rgba(0,0,0,0.9)' : 'rgba(0,0,0,0.6)', color: '#fff', padding: '8px', borderRadius: '999px', backdropFilter: 'blur(4px)', border: '1px solid rgba(255,255,255,0.1)', cursor: 'pointer', transition: 'background-color 0.15s', display: 'flex' }}
            >
              <ChevronRight style={{ height: '20px', width: '20px' }} />
            </button>
          </div>

          <div style={{ position: 'absolute' as const, bottom: '16px', left: '50%', transform: 'translateX(-50%)', display: 'flex', gap: '6px', padding: '4px 8px', backgroundColor: 'rgba(0,0,0,0.4)', backdropFilter: 'blur(6px)', borderRadius: '999px', border: '1px solid rgba(255,255,255,0.1)' }}>
            {images.map((_, i) => (
              <div
                key={i}
                style={{
                  transition: 'all 0.3s', borderRadius: '999px',
                  backgroundColor: i === currentIndex ? TEAL : 'rgba(255,255,255,0.3)',
                  width: i === currentIndex ? '16px' : '4px', height: '4px',
                }}
              />
            ))}
          </div>
        </>
      )}
    </div>
  );
}
