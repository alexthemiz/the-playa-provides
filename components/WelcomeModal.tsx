'use client';

import { useRouter } from 'next/navigation';

interface WelcomeModalProps {
  userId: string;
  onClose: () => void;
}

export default function WelcomeModal({ userId, onClose }: WelcomeModalProps) {
  const router = useRouter();

  const dismiss = () => {
    localStorage.setItem(`tpp_welcomed_${userId}`, 'true');
    onClose();
  };

  const goTo = (path: string) => {
    dismiss();
    router.push(path);
  };

  return (
    <div style={overlayStyle}>
      <div style={modalStyle}>
        <button onClick={dismiss} style={{ position: 'absolute' as const, top: '14px', right: '16px', background: 'none', border: 'none', fontSize: '1.2rem', color: '#aaa', cursor: 'pointer', lineHeight: 1 }}>✕</button>

        {/* Header */}
        <div style={{ textAlign: 'center' as const, marginBottom: '20px' }}>
          <div style={{ fontSize: '1.6rem', marginBottom: '6px' }}>🔥</div>
          <h1 style={{ margin: '0 0 10px', fontSize: '1.6rem', color: '#2D241E', fontWeight: 'bold', lineHeight: 1.2 }}>
            The Playa Provides you<br />with a Welcome
          </h1>
          <p style={{ margin: 0, color: '#666', fontSize: '1rem', lineHeight: '1.6' }}>
            You&rsquo;re now part of a community of Burners sharing gear and supplies,
            making it more affordable for more people to get to the playa.
          </p>
        </div>

        {/* How it works */}
        <div style={{ display: 'flex', flexDirection: 'column' as const, gap: '14px', marginBottom: '32px' }}>
          {[
            { num: '1', title: 'List items you\'re willing to lend or gift.', desc: 'Use the site as your online inventory, then toggle items when they become available or unavailable.' },
            { num: '2', title: 'Search the listings for items you need', desc: 'Filter by category and location, to borrow or to keep.' },
            { num: '3', title: 'Connect and cover your bases right from the start', desc: 'When requesting to borrow an item, you and its owner can discuss any terms directly.' },
          ].map(step => (
            <div key={step.num} style={{ display: 'flex', gap: '14px', alignItems: 'flex-start' }}>
              <div style={{ width: '30px', height: '30px', borderRadius: '50%', backgroundColor: '#C08261', color: '#fff', display: 'flex', alignItems: 'center', justifyContent: 'center', fontWeight: 'bold', fontSize: '0.85rem', flexShrink: 0 }}>
                {step.num}
              </div>
              <div>
                <div style={{ fontWeight: 'bold', color: '#2D241E', fontSize: '0.95rem' }}>{step.title}</div>
                <div style={{ color: '#666', fontSize: '0.85rem', lineHeight: '1.5', marginTop: '2px' }}>{step.desc}</div>
              </div>
            </div>
          ))}
        </div>

        {/* CTAs */}
        <div style={{ display: 'flex', gap: '10px' }}>
          <button onClick={() => goTo('/find-items')} style={secondaryBtnStyle}>
            Browse Items
          </button>
          <button onClick={() => goTo('/list-item')} style={primaryBtnStyle}>
            List My First Item →
          </button>
        </div>

        <button onClick={dismiss} style={{ marginTop: '16px', background: 'none', border: 'none', color: '#aaa', fontSize: '0.8rem', cursor: 'pointer', width: '100%' }}>
          I&rsquo;ll explore on my own
        </button>
      </div>
    </div>
  );
}

const overlayStyle: React.CSSProperties = {
  position: 'fixed', top: 0, left: 0, width: '100%', height: '100%',
  backgroundColor: 'rgba(0,0,0,0.5)', backdropFilter: 'blur(4px)',
  display: 'flex', justifyContent: 'center', alignItems: 'center',
  zIndex: 1000, padding: '20px',
};

const modalStyle: React.CSSProperties = {
  position: 'relative' as const,
  backgroundColor: '#fff', borderRadius: '20px', padding: '28px 32px',
  width: '100%', maxWidth: '480px',
  boxShadow: '0 20px 60px rgba(0,0,0,0.15)',
  maxHeight: 'calc(100vh - 40px)', overflowY: 'auto' as const,
};

const primaryBtnStyle: React.CSSProperties = {
  flex: 2, padding: '14px', backgroundColor: '#C08261', color: '#fff',
  border: 'none', borderRadius: '10px', fontWeight: 'bold', fontSize: '0.95rem',
  cursor: 'pointer',
};

const secondaryBtnStyle: React.CSSProperties = {
  flex: 1, padding: '14px', backgroundColor: '#f5f5f5', color: '#444',
  border: '1px solid #ddd', borderRadius: '10px', fontWeight: 'bold', fontSize: '0.95rem',
  cursor: 'pointer',
};
