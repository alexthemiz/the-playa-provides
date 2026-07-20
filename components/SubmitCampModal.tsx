'use client';

import { useState } from 'react';
import { supabase } from '@/lib/supabaseClient';
import { X, Send, ChevronDown } from 'lucide-react';

const INK   = '#1C1610';
const TEAL  = '#1E8A82';

interface SubmitCampModalProps {
  onClose: () => void;
}

export default function SubmitCampModal({ onClose }: SubmitCampModalProps) {
  const [loading, setLoading] = useState(false);
  const [submitted, setSubmitted] = useState(false);
  const [submitError, setSubmitError] = useState('');
  const [hovered, setHovered] = useState<string | null>(null);

  const [formData, setFormData] = useState({
    camp_name: '',
    submitter_name: '',
    contact_email: '',
    offering_category: 'Compost',
    location_address: 'TBD',
    description: '',
    homebase_city: '',
    homebase_state: '',
    homebase_zip: '',
    website: '',
    instagram: '',
    public_email: '',
    about_camp: '',
    accepting_campers: false
  });

  const states = ["AL", "AK", "AZ", "AR", "CA", "CO", "CT", "DC", "DE", "FL", "GA", "HI", "ID", "IL", "IN", "IA", "KS", "KY", "LA", "ME", "MD", "MA", "MI", "MN", "MS", "MO", "MT", "NE", "NV", "NH", "NJ", "NM", "NY", "NC", "ND", "OH", "OK", "OR", "PA", "RI", "SC", "SD", "TN", "TX", "UT", "VT", "VA", "WA", "WV", "WI", "WY"];

  const categories = ["Compost", "Donations", "Mental Health", "Recycling", "Tools/Repair", "Other"].sort((a, b) => (a === "Other" ? 1 : b === "Other" ? -1 : a.localeCompare(b)));

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setSubmitError('');
    try {
      const { error } = await supabase.from('playa_resources').insert([{ ...formData, is_verified: false }]);
      if (error) throw error;

      // Fire notification email — non-blocking, ignore errors so the user still gets success
      supabase.functions.invoke('send-camp-submission', { body: formData }).catch(() => {});

      setSubmitted(true);
    } catch (err) {
      console.error(err);
      setSubmitError('Error submitting camp. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  const field = (key: keyof typeof formData) => (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>) =>
    setFormData({ ...formData, [key]: e.target.value });

  return (
    <div onClick={onClose} style={overlayStyle}>
      <div onClick={(e) => e.stopPropagation()} style={modalStyle}>
        <div style={{ padding: '24px' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '12px' }}>
            <h2 style={{ fontSize: '1.25rem', fontWeight: 700, color: INK, margin: 0 }}>Submit Your Camp</h2>
            <button
              onClick={onClose}
              onMouseEnter={() => setHovered('close')}
              onMouseLeave={() => setHovered(null)}
              style={{ padding: '4px', background: hovered === 'close' ? '#f5f5f4' : 'transparent', border: 'none', borderRadius: '999px', cursor: 'pointer', display: 'flex', transition: 'background-color 0.15s' }}
            >
              <X style={{ width: '20px', height: '20px', color: '#78716c' }} />
            </button>
          </div>

          {submitted ? (
            <div style={{ padding: '32px 0', textAlign: 'center' as const }}>
              <div style={{ width: '56px', height: '56px', backgroundColor: '#dcfce7', borderRadius: '999px', display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto 16px' }}>
                <Send style={{ width: '28px', height: '28px', color: '#16a34a' }} />
              </div>
              <h3 style={{ fontSize: '1.25rem', fontWeight: 700, color: INK, marginBottom: '8px' }}>Submission Received!</h3>
              <p style={{ color: '#78716c', fontSize: '0.875rem', marginBottom: '24px' }}>We&apos;ll review your camp and add it to the directory once approved.</p>
              <div style={{ backgroundColor: '#fdf3ec', border: '1px solid #f0d8c8', borderRadius: '16px', padding: '16px' }}>
                <p style={{ fontSize: '0.875rem', fontWeight: 600, color: INK, marginBottom: '4px' }}>Want to list your gear too?</p>
                <p style={{ fontSize: '0.75rem', color: '#78716c', marginBottom: '12px' }}>Create an account to share and borrow gear with the community.</p>
                <div style={{ display: 'flex', gap: '8px', justifyContent: 'center' }}>
                  <a
                    href="/signup"
                    onMouseEnter={() => setHovered('signup')}
                    onMouseLeave={() => setHovered(null)}
                    style={{ padding: '8px 16px', backgroundColor: hovered === 'signup' ? '#166f68' : TEAL, color: '#fff', fontSize: '0.75rem', fontWeight: 700, borderRadius: '12px', textDecoration: 'none', transition: 'background-color 0.15s' }}
                  >
                    Sign Up
                  </a>
                  <a
                    href="/login"
                    onMouseEnter={() => setHovered('login')}
                    onMouseLeave={() => setHovered(null)}
                    style={{ padding: '8px 16px', backgroundColor: hovered === 'login' ? '#fafaf9' : '#fff', border: '1px solid #e7e5e4', color: INK, fontSize: '0.75rem', fontWeight: 700, borderRadius: '12px', textDecoration: 'none', transition: 'background-color 0.15s' }}
                  >
                    Log In
                  </a>
                </div>
              </div>
            </div>
          ) : (
            <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column' as const, gap: '12px' }}>
              <div>
                <label style={labelStyle}>Camp Name *</label>
                <input required style={inputStyle} value={formData.camp_name} onChange={field('camp_name')} placeholder="e.g. Camp Dust-Off" />
              </div>

              <div style={twoColStyle}>
                <div>
                  <label style={labelStyle}>Submitter&apos;s Name *</label>
                  <input required style={inputStyle} value={formData.submitter_name} onChange={field('submitter_name')} placeholder="Your name" />
                </div>
                <div>
                  <label style={labelStyle}>Submitter&apos;s Email *</label>
                  <input required type="email" style={inputStyle} value={formData.contact_email} onChange={field('contact_email')} placeholder="you@email.com" />
                </div>
              </div>
              <p style={{ fontSize: '0.75rem', color: '#a8a29e', marginTop: '-8px', marginLeft: '4px' }}>Not displayed publicly — used for verification only.</p>

              <div style={twoColStyle}>
                <div>
                  <label style={labelStyle}>Category *</label>
                  <div style={{ position: 'relative' as const }}>
                    <select style={{ ...inputStyle, backgroundColor: '#fff', appearance: 'none' as const }} value={formData.offering_category} onChange={field('offering_category')}>
                      {categories.map(cat => <option key={cat} value={cat}>{cat}</option>)}
                    </select>
                    <ChevronDown style={{ position: 'absolute' as const, right: '12px', top: '12px', width: '16px', height: '16px', color: '#a8a29e', pointerEvents: 'none' as const }} />
                  </div>
                </div>
                <div>
                  <label style={labelStyle}>2026 Playa Address</label>
                  <input disabled style={{ ...inputStyle, backgroundColor: '#fafaf9', borderColor: '#f5f5f4', color: '#a8a29e', cursor: 'not-allowed' }} value="TBD" readOnly />
                </div>
              </div>

              <div>
                <label style={labelStyle}>Description of Service *</label>
                <textarea required style={{ ...inputStyle, height: '64px', resize: 'none' as const, fontSize: '0.875rem' }} value={formData.description} onChange={field('description')} placeholder="e.g. Accepting aluminum cans daily from 2-4pm" />
              </div>

              <div style={{ display: 'flex', flexDirection: 'column' as const, gap: '12px' }}>
                <div style={homebaseRowStyle}>
                  <div style={{ flex: '2 1 160px' }}>
                    <label style={labelStyle}>Homebase City</label>
                    <input style={smallInputStyle} value={formData.homebase_city} onChange={field('homebase_city')} placeholder="San Francisco" />
                  </div>
                  <div style={{ flex: '1 1 80px' }}>
                    <label style={labelStyle}>State</label>
                    <select style={{ ...smallInputStyle, backgroundColor: '#fff' }} value={formData.homebase_state} onChange={field('homebase_state')}>
                      <option value="">--</option>
                      {states.map(s => <option key={s} value={s}>{s}</option>)}
                    </select>
                  </div>
                  <div style={{ flex: '1 1 80px' }}>
                    <label style={labelStyle}>Zip</label>
                    <input style={smallInputStyle} value={formData.homebase_zip} onChange={field('homebase_zip')} placeholder="94110" />
                  </div>
                </div>

                <div style={twoColStyleSm}>
                  <div>
                    <label style={labelStyle}>Website</label>
                    <div style={prefixInputWrapStyle}>
                      <span style={{ paddingLeft: '8px', paddingRight: '4px', color: '#a8a29e', fontSize: '0.875rem', userSelect: 'none' as const }}>https://</span>
                      <input type="text" style={prefixInputStyle} value={formData.website} onChange={(e) => setFormData({ ...formData, website: e.target.value.replace(/^https?:\/\//, '') })} placeholder="yourcampwebsite.com" />
                    </div>
                  </div>
                  <div>
                    <label style={labelStyle}>Instagram</label>
                    <div style={prefixInputWrapStyle}>
                      <span style={{ paddingLeft: '8px', paddingRight: '4px', color: '#a8a29e', fontSize: '0.875rem', fontWeight: 700, userSelect: 'none' as const }}>@</span>
                      <input type="text" style={prefixInputStyle} value={formData.instagram} onChange={(e) => setFormData({ ...formData, instagram: e.target.value.replace(/^@/, '') })} placeholder="yourcamphandle" />
                    </div>
                  </div>
                </div>

                <div style={{ ...twoColStyleSm, alignItems: 'end' as const }}>
                  <div>
                    <label style={labelStyle}>Contact Email (Visible)</label>
                    <input type="email" style={smallInputStyle} value={formData.public_email} onChange={field('public_email')} placeholder="hello@camp.com" />
                  </div>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '8px', paddingBottom: '8px' }}>
                    <input type="checkbox" id="new_campers" checked={formData.accepting_campers} onChange={(e) => setFormData({ ...formData, accepting_campers: e.target.checked })} style={{ width: '14px', height: '14px', accentColor: TEAL }} />
                    <label htmlFor="new_campers" style={{ fontSize: '0.6875rem', fontWeight: 700, color: INK, textTransform: 'uppercase' as const }}>Accepting new campers?</label>
                  </div>
                </div>

                <div>
                  <label style={labelStyle}>About the Camp</label>
                  <textarea style={{ ...smallInputStyle, height: '64px', resize: 'none' as const }} value={formData.about_camp} onChange={field('about_camp')} placeholder="Brief history or camp mission..." />
                </div>
              </div>

              {submitError && <p style={{ color: '#dc2626', fontSize: '0.875rem', textAlign: 'center' as const, margin: 0 }}>{submitError}</p>}

              <button
                type="submit"
                disabled={loading}
                onMouseEnter={() => setHovered('submit')}
                onMouseLeave={() => setHovered(null)}
                style={{
                  width: '100%', padding: '12px', backgroundColor: hovered === 'submit' && !loading ? '#166f68' : TEAL, color: '#fff',
                  border: 'none', borderRadius: '16px', fontWeight: 700, fontSize: '0.875rem', textTransform: 'uppercase' as const,
                  cursor: loading ? 'default' : 'pointer', boxShadow: '0 4px 14px rgba(0,0,0,0.12)', transition: 'background-color 0.15s',
                }}
              >
                {loading ? 'Submitting...' : 'Submit for Review'}
              </button>
            </form>
          )}
        </div>
      </div>
    </div>
  );
}

const overlayStyle: React.CSSProperties = {
  position: 'fixed', inset: 0, backgroundColor: 'rgba(28,22,16,0.3)', backdropFilter: 'blur(4px)',
  zIndex: 50, display: 'flex', justifyContent: 'center', alignItems: 'flex-start',
  overflowY: 'auto' as const, padding: '16px 16px 24px', cursor: 'pointer',
};
const modalStyle: React.CSSProperties = {
  backgroundColor: '#fff', borderRadius: '24px', maxWidth: '576px', width: '100%',
  boxShadow: '0 25px 50px rgba(0,0,0,0.25)', border: '1px solid #f5f5f4', position: 'relative' as const,
  marginBottom: '24px', cursor: 'default',
};
const labelStyle: React.CSSProperties = { display: 'block', fontSize: '0.75rem', fontWeight: 700, color: INK, marginBottom: '4px', marginLeft: '4px', textTransform: 'uppercase' as const, letterSpacing: '-0.01em' };
const inputStyle: React.CSSProperties = { width: '100%', border: '2px solid #e7e5e4', borderRadius: '12px', padding: '8px', color: '#000', outline: 'none', boxSizing: 'border-box' as const };
const smallInputStyle: React.CSSProperties = { width: '100%', border: '2px solid #e7e5e4', borderRadius: '8px', padding: '6px', color: '#000', outline: 'none', fontSize: '0.875rem', boxSizing: 'border-box' as const };
const twoColStyle: React.CSSProperties = { display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))', gap: '12px' };
const twoColStyleSm: React.CSSProperties = { display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(160px, 1fr))', gap: '8px' };
const homebaseRowStyle: React.CSSProperties = { display: 'flex', flexWrap: 'wrap' as const, gap: '8px' };
const prefixInputWrapStyle: React.CSSProperties = { display: 'flex', alignItems: 'center', border: '2px solid #e7e5e4', borderRadius: '8px' };
const prefixInputStyle: React.CSSProperties = { flex: 1, padding: '6px', color: '#000', outline: 'none', fontSize: '0.875rem', backgroundColor: 'transparent', border: 'none', minWidth: 0 };
