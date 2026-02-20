'use client';

import { useState } from 'react';
import { ChevronLeft, ChevronRight, Package } from 'lucide-react';

interface ImageSliderProps {
  images: string[] | null;
  aspectRatio?: string; // Optional: lets us use different shapes
}

export default function ImageSlider({ images, aspectRatio = "aspect-square" }: ImageSliderProps) {
  const [currentIndex, setCurrentIndex] = useState(0);

  if (!images || images.length === 0) {
    return (
      <div className={`flex flex-col items-center justify-center h-full text-gray-600 italic bg-[#111] min-h-[200px] ${aspectRatio}`}>
        <Package className="h-8 w-8 mb-2 opacity-20" />
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
    <div className={`relative w-full h-full overflow-hidden group ${aspectRatio}`}>
      <img 
        src={images[currentIndex]} 
        className="object-cover w-full h-full transition-opacity duration-300" 
        alt="Gear view" 
      />
      
      {images.length > 1 && (
        <>
          <div className="absolute inset-0 flex items-center justify-between p-2 opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none">
            <button onClick={prev} className="bg-black/60 hover:bg-black/90 text-white p-2 rounded-full backdrop-blur-sm transition-all border border-white/10 active:scale-90 pointer-events-auto">
              <ChevronLeft className="h-5 w-5" />
            </button>
            <button onClick={next} className="bg-black/60 hover:bg-black/90 text-white p-2 rounded-full backdrop-blur-sm transition-all border border-white/10 active:scale-90 pointer-events-auto">
              <ChevronRight className="h-5 w-5" />
            </button>
          </div>
          
          <div className="absolute bottom-4 left-1/2 -translate-x-1/2 flex gap-1.5 px-2 py-1 bg-black/40 backdrop-blur-md rounded-full border border-white/10">
            {images.map((_, i) => (
              <div 
                key={i} 
                className={`transition-all duration-300 rounded-full ${
                  i === currentIndex ? "bg-cyan-400 w-4 h-1" : "bg-white/30 w-1 h-1"
                }`} 
              />
            ))}
          </div>
        </>
      )}
    </div>
  );
}