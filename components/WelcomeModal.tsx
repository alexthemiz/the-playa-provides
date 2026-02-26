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

        {/* Header */}
        <div style={{ textAlign: 'center' as const, marginBottom: '28px' }}>
          <div style={{ fontSize: '2.4rem', marginBottom: '12px' }}>🔥</div>
          <h1 style={{ margin: '0 0 10px', fontSize: '1.6rem', color: '#2D241E', fontWeight: 'bold' }}>
            Welcome to The Playa Provides
          </h1>
          <p style={{ margin: 0, color: '#666', fontSize: '1rem', lineHeight: '1.6' }}>
            You&rsquo;re now part of a community of Burners sharing gear,
            reducing costs and waste, and helping each other get to the playa.
          </p>
        </div>

        {/* How it works */}
        <div style={{ display: 'flex', flexDirection: 'column' as const, gap: '14px', marginBottom: '32px' }}>
          {[
            { num: '1', title: 'List your gear', desc: 'Add anything you\'re willing to lend or give away. You\'ll be asked where it\'s stored — you can add that right on the form.' },
            { num: '2', title: 'Browse the community', desc: 'Find what you need for your build. Filter by category, location, borrow or keep.' },
            { num: '3', title: 'Connect directly', desc: 'Send a request to the owner. It goes straight to their inbox so you can coordinate the handoff.' },
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
            Browse Gear
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
  backgroundColor: '#fff', borderRadius: '20px', padding: '36px',
  width: '100%', maxWidth: '480px',
  boxShadow: '0 20px 60px rgba(0,0,0,0.15)',
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
