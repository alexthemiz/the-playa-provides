'use client';

import { useEffect, useState } from 'react';
import { MessageSquare, X } from 'lucide-react';
import { supabase } from '@/lib/supabaseClient';

export default function FeedbackWidget() {
  const [session, setSession] = useState<any>(null);
  const [isOpen, setIsOpen] = useState(false);
  const [type, setType] = useState('Bug Report');
  const [description, setDescription] = useState('');
  const [email, setEmail] = useState('');
  const [descError, setDescError] = useState('');
  const [submitError, setSubmitError] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [success, setSuccess] = useState(false);

  useEffect(() => {
    supabase.auth.getSession().then(({ data: { session } }) => {
      setSession(session);
      if (session?.user?.email) setEmail(session.user.email);
    });
  }, []);

  if (!session) return null;

  const resetForm = () => {
    setType('Bug Report');
    setDescription('');
    setEmail(session?.user?.email || '');
    setDescError('');
    setSubmitError('');
    setSuccess(false);
  };

  const handleClose = () => {
    setIsOpen(false);
    resetForm();
  };

  const handleSubmit = async () => {
    if (!description.trim()) {
      setDescError('Description is required.');
      return;
    }
    setDescError('');
    setSubmitError('');
    setSubmitting(true);

    try {
      const pageUrl = window.location.href;

      const { error: dbError } = await supabase.from('feedback').insert({
        user_id: session.user.id,
        email,
        type,
        description,
        page_url: pageUrl,
      });
      if (dbError) throw new Error(dbError.message);

      const res = await fetch(
        `${process.env.NEXT_PUBLIC_SUPABASE_URL}/functions/v1/send-feedback-notification`,
        {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${session.access_token}`,
          },
          body: JSON.stringify({
            type,
            description,
            email,
            page_url: pageUrl,
            user_id: session.user.id,
          }),
        }
      );
      if (!res.ok) throw new Error('Email send failed');

      setSuccess(true);
      setTimeout(() => {
        setIsOpen(false);
        resetForm();
      }, 2000);
    } catch (err: any) {
      setSubmitError('Something went wrong. Please try again.');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <>
      {/* Floating button — hidden while modal is open */}
      {!isOpen && (
        <button
          onClick={() => setIsOpen(true)}
          style={{
            position: 'fixed' as const,
            bottom: 24,
            right: 24,
            zIndex: 1000,
            width: 48,
            height: 48,
            borderRadius: '50%',
            backgroundColor: '#E8834A',
            border: 'none',
            cursor: 'pointer',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            boxShadow: '0 4px 12px rgba(0,0,0,0.2)',
          }}
          aria-label="Share feedback"
        >
          <MessageSquare size={20} color="#fff" />
        </button>
      )}

      {/* Modal */}
      {isOpen && (
        <div
          onClick={handleClose}
          style={{
            position: 'fixed' as const,
            inset: 0,
            backgroundColor: 'rgba(0,0,0,0.4)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            zIndex: 1001,
          }}
        >
          <div
            onClick={e => e.stopPropagation()}
            style={{
              backgroundColor: '#fff',
              borderRadius: 12,
              padding: 24,
              maxWidth: 480,
              width: '90%',
              boxShadow: '0 8px 32px rgba(0,0,0,0.15)',
            }}
          >
            {success ? (
              <p style={{ textAlign: 'center' as const, fontSize: '1rem', color: '#2D241E', fontWeight: 600, margin: '16px 0' }}>
                Thanks — feedback received.
              </p>
            ) : (
              <>
                {/* Header */}
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 20 }}>
                  <span style={{ fontWeight: 700, fontSize: '1rem', color: '#2D241E' }}>Share Feedback</span>
                  <button onClick={handleClose} style={{ background: 'none', border: 'none', cursor: 'pointer', color: '#888', display: 'flex', alignItems: 'center' }}>
                    <X size={18} />
                  </button>
                </div>

                {/* Type */}
                <div style={{ marginBottom: 14 }}>
                  <label style={labelStyle}>Type</label>
                  <select
                    value={type}
                    onChange={e => setType(e.target.value)}
                    style={fieldStyle}
                  >
                    <option>Bug Report</option>
                    <option>Feature Request</option>
                    <option>Other</option>
                  </select>
                </div>

                {/* Description */}
                <div style={{ marginBottom: 4 }}>
                  <label style={labelStyle}>Description</label>
                  <textarea
                    rows={4}
                    value={description}
                    onChange={e => { setDescription(e.target.value); if (descError) setDescError(''); }}
                    placeholder="Describe the bug or feature..."
                    style={{ ...fieldStyle, resize: 'vertical' as const }}
                  />
                </div>
                {descError && <p style={inlineErrorStyle}>{descError}</p>}

                {/* Email */}
                <div style={{ marginBottom: 20, marginTop: descError ? 8 : 14 }}>
                  <label style={labelStyle}>Email</label>
                  <input
                    type="email"
                    value={email}
                    onChange={e => setEmail(e.target.value)}
                    style={fieldStyle}
                  />
                </div>

                {submitError && <p style={{ ...inlineErrorStyle, marginBottom: 10 }}>{submitError}</p>}

                {/* Submit */}
                <button
                  onClick={handleSubmit}
                  disabled={submitting}
                  style={{
                    width: '100%',
                    padding: 10,
                    backgroundColor: '#E8834A',
                    color: '#000',
                    border: 'none',
                    borderRadius: 8,
                    fontWeight: 700,
                    fontSize: '0.95rem',
                    cursor: submitting ? 'default' as const : 'pointer',
                    opacity: submitting ? 0.6 : 1,
                  }}
                >
                  {submitting ? 'Sending...' : 'Send Feedback'}
                </button>
              </>
            )}
          </div>
        </div>
      )}
    </>
  );
}

const labelStyle: React.CSSProperties = {
  display: 'block',
  fontSize: '0.78rem',
  fontWeight: 700,
  color: '#888',
  textTransform: 'uppercase' as const,
  letterSpacing: '0.05em',
  marginBottom: 5,
};

const fieldStyle: React.CSSProperties = {
  width: '100%',
  padding: '9px 12px',
  border: '1px solid #ddd',
  borderRadius: 6,
  fontSize: '0.9rem',
  color: '#2D241E',
  backgroundColor: '#fff',
  boxSizing: 'border-box' as const,
  fontFamily: 'inherit',
};

const inlineErrorStyle: React.CSSProperties = {
  color: '#dc2626',
  fontSize: '0.82rem',
  margin: '4px 0 0',
};
