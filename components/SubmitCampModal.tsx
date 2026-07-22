'use client';

import { useState } from 'react';
import { supabase } from '@/lib/supabaseClient';
import { X, Send, ChevronDown } from 'lucide-react';

const INK      = '#1C1610';
const INK_MID  = '#4A3828';
const INK_LITE = '#9A8878';
const PAPER_DK = '#EDE5D0';
const PAPER_LT = '#FDFAF4';
const TEAL     = '#1E8A82';

interface SubmitCampModalProps {
  onClose: () => void;
}

export default function SubmitCampModal({ onClose }: SubmitCampModalProps) {
  const [loading, setLoading] = useState(false);
  const [submitted, setSubmitted] = useState(false);
  const [submitError, setSubmitError] = useState('');

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
        {/* Header band */}
        <div style={headerBandStyle}>
          <h2 style={{ fontFamily: "'Arvo', serif", fontSize: '1.3rem', fontWeight: 900, color: INK, margin: 0, lineHeight: 1.1 }}>
            Submit Your <em style={{ fontStyle: 'italic', color: TEAL }}>Camp.</em>
          </h2>
          <button onClick={onClose} aria-label="Close" style={closeBtnStyle}>
            <X style={{ width: '16px', height: '16px' }} />
          </button>
        </div>

        <div style={{ padding: '20px' }}>
          {submitted ? (
            <div style={{ padding: '20px 0', textAlign: 'center' as const }}>
              <div style={{ width: '56px', height: '56px', backgroundColor: '#dcfce7', border: `2px solid #16a34a`, borderRadius: '999px', display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto 16px' }}>
                <Send style={{ width: '26px', height: '26px', color: '#16a34a' }} />
              </div>
              <h3 style={{ fontFamily: "'Arvo', serif", fontSize: '1.15rem', fontWeight: 700, color: INK, marginBottom: '8px' }}>Submission Received!</h3>
              <p style={{ color: INK_MID, fontSize: '0.9rem', marginBottom: '24px', lineHeight: 1.5 }}>We&apos;ll review your camp and add it to the directory once approved.</p>

              <div style={{ backgroundColor: PAPER_DK, border: `2px solid ${INK}`, boxShadow: `3px 3px 0 ${INK}`, padding: '16px', textAlign: 'left' as const }}>
                <p style={{ fontFamily: "'Arvo', serif", fontSize: '0.95rem', fontWeight: 700, color: INK, margin: '0 0 4px' }}>Want to list your gear too?</p>
                <p style={{ fontSize: '0.8rem', color: INK_MID, margin: '0 0 14px', lineHeight: 1.5 }}>Create an account to share and borrow gear with the community.</p>
                <div style={{ display: 'flex', gap: '10px' }}>
                  <a href="/signup" style={primaryLinkStyle}>Sign Up</a>
                  <a href="/login" style={secondaryLinkStyle}>Log In</a>
                </div>
              </div>
            </div>
          ) : (
            <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column' as const, gap: '14px' }}>
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
              <p style={{ ...fieldNoteStyle, marginTop: '-10px' }}>Not displayed publicly — used for verification only.</p>

              <div style={twoColStyle}>
                <div>
                  <label style={labelStyle}>Category *</label>
                  <div style={{ position: 'relative' as const }}>
                    <select style={{ ...inputStyle, appearance: 'none' as const, paddingRight: '32px', cursor: 'pointer' }} value={formData.offering_category} onChange={field('offering_category')}>
                      {categories.map(cat => <option key={cat} value={cat}>{cat}</option>)}
                    </select>
                    <ChevronDown style={{ position: 'absolute' as const, right: '10px', top: '50%', transform: 'translateY(-50%)', width: '16px', height: '16px', color: INK_LITE, pointerEvents: 'none' as const }} />
                  </div>
                </div>
                <div>
                  <label style={labelStyle}>2026 Playa Address</label>
                  <input disabled style={{ ...inputStyle, backgroundColor: PAPER_DK, borderColor: 'rgba(28,22,16,0.12)', color: INK_LITE, cursor: 'not-allowed' }} value="TBD — set by BM Placement" readOnly />
                </div>
              </div>

              <div>
                <label style={labelStyle}>Description of Service *</label>
                <textarea required style={{ ...inputStyle, height: '64px', resize: 'vertical' as const }} value={formData.description} onChange={field('description')} placeholder="e.g. Accepting aluminum cans daily from 2-4pm" />
              </div>

              <div style={homebaseRowStyle}>
                <div style={{ flex: '2 1 160px' }}>
                  <label style={labelStyle}>Homebase City</label>
                  <input style={inputStyle} value={formData.homebase_city} onChange={field('homebase_city')} placeholder="San Francisco" />
                </div>
                <div style={{ flex: '1 1 70px' }}>
                  <label style={labelStyle}>State</label>
                  <select style={{ ...inputStyle, cursor: 'pointer' }} value={formData.homebase_state} onChange={field('homebase_state')}>
                    <option value="">--</option>
                    {states.map(s => <option key={s} value={s}>{s}</option>)}
                  </select>
                </div>
                <div style={{ flex: '1 1 80px' }}>
                  <label style={labelStyle}>Zip</label>
                  <input style={inputStyle} value={formData.homebase_zip} onChange={field('homebase_zip')} placeholder="94110" />
                </div>
              </div>

              <div style={twoColStyle}>
                <div>
                  <label style={labelStyle}>Website</label>
                  <div style={prefixInputWrapStyle}>
                    <span style={prefixLabelStyle}>https://</span>
                    <input type="text" style={prefixInputStyle} value={formData.website} onChange={(e) => setFormData({ ...formData, website: e.target.value.replace(/^https?:\/\//, '') })} placeholder="yourcampwebsite.com" />
                  </div>
                </div>
                <div>
                  <label style={labelStyle}>Instagram</label>
                  <div style={prefixInputWrapStyle}>
                    <span style={{ ...prefixLabelStyle, fontWeight: 700 }}>@</span>
                    <input type="text" style={prefixInputStyle} value={formData.instagram} onChange={(e) => setFormData({ ...formData, instagram: e.target.value.replace(/^@/, '') })} placeholder="yourcamphandle" />
                  </div>
                </div>
              </div>

              <div style={{ ...twoColStyle, alignItems: 'end' as const }}>
                <div>
                  <label style={labelStyle}>Contact Email (Visible)</label>
                  <input type="email" style={inputStyle} value={formData.public_email} onChange={field('public_email')} placeholder="hello@camp.com" />
                </div>
                <label htmlFor="new_campers" style={{ display: 'flex', alignItems: 'center', gap: '8px', paddingBottom: '10px', cursor: 'pointer' }}>
                  <input type="checkbox" id="new_campers" checked={formData.accepting_campers} onChange={(e) => setFormData({ ...formData, accepting_campers: e.target.checked })} style={{ width: '15px', height: '15px', accentColor: TEAL, flexShrink: 0 }} />
                  <span style={labelStyle}>Accepting new campers?</span>
                </label>
              </div>

              {submitError && <p style={{ color: '#dc2626', fontSize: '0.85rem', textAlign: 'center' as const, margin: 0 }}>{submitError}</p>}

              <button type="submit" disabled={loading} style={{ ...submitButtonStyle, opacity: loading ? 0.6 : 1, cursor: loading ? 'default' as const : 'pointer' }}>
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
  position: 'fixed', inset: 0, backgroundColor: 'rgba(28,22,16,0.6)', backdropFilter: 'blur(3px)',
  zIndex: 1000, display: 'flex', justifyContent: 'center', alignItems: 'flex-start',
  overflowY: 'auto' as const, padding: '20px 16px', cursor: 'pointer',
};
const modalStyle: React.CSSProperties = {
  backgroundColor: PAPER_LT, maxWidth: '560px', width: '100%',
  border: `2px solid ${INK}`, boxShadow: `6px 6px 0 ${INK}`,
  marginBottom: '24px', cursor: 'default',
};
const headerBandStyle: React.CSSProperties = {
  display: 'flex', justifyContent: 'space-between', alignItems: 'center',
  padding: '18px 20px', backgroundColor: PAPER_DK, borderBottom: `2px solid ${INK}`,
};
const closeBtnStyle: React.CSSProperties = {
  padding: '6px', background: PAPER_LT, border: `1.5px solid rgba(28,22,16,0.2)`,
  cursor: 'pointer', display: 'flex', color: INK_MID, flexShrink: 0,
};
const labelStyle: React.CSSProperties = { display: 'block', fontFamily: "'Space Mono', monospace", fontSize: '0.58rem', fontWeight: 700, letterSpacing: '0.1em', textTransform: 'uppercase' as const, color: INK_MID, marginBottom: '5px' };
const fieldNoteStyle: React.CSSProperties = { color: INK_LITE, fontSize: '0.68rem', margin: '0 0 0 1px', lineHeight: 1.4 };
const inputStyle: React.CSSProperties = { width: '100%', padding: '9px 11px', backgroundColor: PAPER_LT, border: '1.5px solid rgba(28,22,16,0.25)', color: INK, outline: 'none', boxSizing: 'border-box' as const, fontSize: '0.9rem', fontFamily: 'inherit' };
const twoColStyle: React.CSSProperties = { display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))', gap: '12px' };
const homebaseRowStyle: React.CSSProperties = { display: 'flex', flexWrap: 'wrap' as const, gap: '10px' };
const prefixInputWrapStyle: React.CSSProperties = { display: 'flex', alignItems: 'center', border: '1.5px solid rgba(28,22,16,0.25)', backgroundColor: PAPER_LT };
const prefixLabelStyle: React.CSSProperties = { paddingLeft: '10px', paddingRight: '2px', color: INK_LITE, fontSize: '0.9rem', userSelect: 'none' as const };
const prefixInputStyle: React.CSSProperties = { flex: 1, padding: '9px 8px 9px 2px', color: INK, outline: 'none', fontSize: '0.9rem', backgroundColor: 'transparent', border: 'none', minWidth: 0, fontFamily: 'inherit' };
const submitButtonStyle: React.CSSProperties = { alignSelf: 'center' as const, padding: '14px 48px', backgroundColor: TEAL, color: '#fff', border: `2px solid ${INK}`, boxShadow: `3px 3px 0 ${INK}`, fontWeight: 700, fontSize: '0.9rem', fontFamily: 'inherit', marginTop: '4px' };
const primaryLinkStyle: React.CSSProperties = { padding: '8px 18px', backgroundColor: TEAL, color: '#fff', fontSize: '0.82rem', fontWeight: 700, textDecoration: 'none', border: `2px solid ${INK}`, boxShadow: `2px 2px 0 ${INK}`, fontFamily: 'inherit' };
const secondaryLinkStyle: React.CSSProperties = { padding: '8px 18px', backgroundColor: 'transparent', color: INK, fontSize: '0.82rem', fontWeight: 700, textDecoration: 'none', border: `2px solid ${INK}`, fontFamily: 'inherit' };
