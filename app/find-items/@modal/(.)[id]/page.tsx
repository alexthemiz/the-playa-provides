'use client';

import { useRouter } from 'next/navigation';
import { useEffect, useState } from 'react'; // Removed ', React'
import { supabase } from '@/lib/supabaseClient';

export default function ItemModal({ params }: { params: any }) {
  const router = useRouter();
  const [item, setItem] = useState<any>(null);

  useEffect(() => {
    async function setupAndFetch() {
      // Safely unwrap params inside the effect
      const resolvedParams = await params;
      const itemId = resolvedParams.id;

      const { data, error } = await supabase
        .from('gear_items')
        .select('*')
        .eq('id', itemId)
        .single();
        
      if (error) console.error("Modal fetch error:", error);
      else setItem(data);
    }
    setupAndFetch();
  }, [params]);

  const close = () => router.back();

  return (
    <div style={overlayStyle} onClick={close}>
      <div style={modalStyle} onClick={(e) => e.stopPropagation()}>
        <button onClick={close} style={closeButtonStyle}>✕</button>
        
        {item ? (
          <div>
            <h2 style={{ color: '#fff', fontSize: '24px', marginBottom: '10px' }}>{item.item_name}</h2>
            <p style={{ color: '#00ccff', fontWeight: 'bold' }}>{item.category}</p>
            <hr style={{ border: '0', borderTop: '1px solid #333', margin: '20px 0' }} />
            <div style={{ color: '#ccc', lineHeight: '1.6' }}>
              {item.description || 'No description provided.'}
            </div>
          </div>
        ) : (
          <p style={{ color: '#fff' }}>Loading gear details...</p>
        )}
      </div>
    </div>
  );
}

// Keep the same overlayStyle, modalStyle, and closeButtonStyle from before
const overlayStyle: React.CSSProperties = {
  position: 'fixed',
  top: 0,
  left: 0,
  right: 0,
  bottom: 0,
  backgroundColor: 'rgba(0, 0, 0, 0.85)',
  display: 'flex',
  alignItems: 'center',
  justifyContent: 'center',
  zIndex: 1000,
  backdropFilter: 'blur(8px)'
};

const modalStyle: React.CSSProperties = {
  backgroundColor: '#111',
  padding: '40px',
  borderRadius: '24px',
  width: '90%',
  maxWidth: '500px',
  position: 'relative',
  border: '1px solid #222'
};

const closeButtonStyle: React.CSSProperties = {
  position: 'absolute',
  top: '20px',
  right: '20px',
  background: '#222',
  border: 'none',
  color: '#fff',
  width: '30px',
  height: '30px',
  borderRadius: '50%',
  cursor: 'pointer',
  display: 'flex',
  alignItems: 'center',
  justifyContent: 'center'
};