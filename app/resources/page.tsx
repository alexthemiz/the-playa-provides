'use client';

import React, { useState, useEffect } from 'react';
import { supabase } from '@/lib/supabaseClient';
import { Droplets, Wrench, Beer, Heart, Box } from 'lucide-react';
import SubmitCampModal from '../../components/SubmitCampModal';

const INK      = '#1C1610'
const INK_MID  = '#4A3828'
const INK_LITE = '#9A8878'
const PAPER    = '#F6F1E8'
const PAPER_LT = '#FDFAF4'
const PAPER_DK = '#EDE5D0'
const LIME     = '#B8CC2A'
const LIME_DK  = '#8A9A10'
const TEAL     = '#1E8A82'
const TEAL_LT  = '#D4EDEB'
const RUST     = '#C24820'
const RUST_LT  = '#F5E0D8'
const MUSTARD  = '#D4A020'
const MUSTARD_LT = '#F5F0D0'

const CATEGORY_STYLES: Record<string, { bg: string; border: string; color: string; icon: React.ReactNode }> = {
  'Donations':       { bg: MUSTARD_LT, border: MUSTARD, color: MUSTARD,  icon: <Box size={16} /> },
  'Food/Drink':      { bg: RUST_LT,    border: RUST,    color: RUST,     icon: <Beer size={16} /> },
  'Health/Wellness': { bg: '#EDE4FA',  border: '#7B4FCF', color: '#7B4FCF', icon: <Heart size={16} /> },
  'Water':           { bg: TEAL_LT,   border: TEAL,    color: TEAL,     icon: <Droplets size={16} /> },
  'Bike Repair':     { bg: PAPER_DK,  border: INK_MID, color: INK_MID,  icon: <Wrench size={16} /> },
}
const DEFAULT_CAT = { bg: PAPER_DK, border: INK_LITE, color: INK_LITE, icon: <Wrench size={16} /> }

export default function ResourcesPage() {
  const [resources,   setResources]   = useState<any[]>([]);
  const [loading,     setLoading]     = useState(true);
  const [fetchError,  setFetchError]  = useState(false);
  const [isModalOpen, setIsModalOpen] = useState(false);

  useEffect(() => {
    async function fetchResources() {
      try {
        const { data, error } = await supabase.from('playa_resources').select('*').eq('is_verified', true).order('camp_name', { ascending: true });
        if (error) {
          if (error.code === 'PGRST301' || error.message?.includes('JWT') || error.message?.includes('token')) {
            await supabase.auth.signOut({ scope: 'local' });
            const { data: retryData, error: retryError } = await supabase.from('playa_resources').select('*').eq('is_verified', true).order('camp_name', { ascending: true });
            if (!retryError && retryData) setResources(retryData);
            else setFetchError(true);
          } else { setFetchError(true); }
        } else if (data) { setResources(data); }
      } catch { setFetchError(true); }
      finally { setLoading(false); }
    }
    fetchResources();
  }, []);

  return (
    <div style={{ backgroundColor: PAPER, minHeight: '100vh' }}>

      {/* Page header band */}
      <div style={{ backgroundColor: PAPER_LT, borderBottom: `2px solid ${INK}`, padding: '28px 40px' }}>
        <div style={{ maxWidth: '1280px', margin: '0 auto', display: 'flex', alignItems: 'flex-end', justifyContent: 'space-between', gap: '24px', flexWrap: 'wrap' }}>
          <div>
            <div style={{ fontFamily: "'Space Mono', monospace", fontSize: '0.58rem', fontWeight: 700, letterSpacing: '0.14em', textTransform: 'uppercase' as const, color: INK_LITE, marginBottom: '8px' }}>Directory</div>
            <h1 style={{ fontFamily: "'Arvo', serif", fontSize: '1.9rem', fontWeight: 900, color: INK, margin: '0 0 12px', lineHeight: 1.05 }}>
              On-Playa <em style={{ fontStyle: 'italic', color: TEAL }}>Resources.</em>
            </h1>
            <p style={{ fontSize: '0.9rem', color: INK_MID, lineHeight: 1.65, maxWidth: '560px', margin: 0 }}>
              Camps offering sustainability and community services at the 2026 Burn — composting, bike repair, mental health support, and more. BRC addresses added when available.
            </p>
            <p style={{ fontSize: '0.85rem', color: INK_LITE, lineHeight: 1.6, maxWidth: '560px', margin: '8px 0 0' }}>
              Part of a camp that should be listed? No site registration necessary to submit.
            </p>
          </div>
          <button
            onClick={() => setIsModalOpen(true)}
            style={{ padding: '12px 24px', backgroundColor: TEAL, color: '#fff', fontWeight: 700, fontSize: '0.88rem', border: `2px solid ${INK}`, boxShadow: `3px 3px 0 ${INK}`, cursor: 'pointer', whiteSpace: 'nowrap' as const, fontFamily: 'inherit' }}
          >
            Submit Your Camp →
          </button>
        </div>
      </div>

      {/* Content */}
      <div style={{ maxWidth: '1280px', margin: '0 auto', padding: '32px 40px 64px' }}>
        {loading ? (
          <div style={{ textAlign: 'center', padding: '80px 20px', fontFamily: "'Arvo', serif", fontSize: '1rem', fontStyle: 'italic', color: INK_LITE }}>
            Dusting off the records…
          </div>
        ) : fetchError ? (
          <div style={{ textAlign: 'center', padding: '60px 20px', border: `1.5px solid rgba(28,22,16,0.12)`, backgroundColor: PAPER_LT }}>
            <h3 style={{ fontFamily: "'Arvo', serif", fontSize: '1.2rem', fontWeight: 700, color: INK, marginBottom: '8px' }}>Couldn't load resources</h3>
            <p style={{ color: INK_MID, fontSize: '0.9rem' }}>Something went wrong. Try refreshing the page.</p>
          </div>
        ) : resources.length === 0 ? (
          <div style={{ textAlign: 'center', padding: '60px 20px', border: `1.5px solid rgba(28,22,16,0.12)`, backgroundColor: PAPER_LT }}>
            <h3 style={{ fontFamily: "'Arvo', serif", fontSize: '1.2rem', fontWeight: 700, color: INK, marginBottom: '8px' }}>No verified resources yet</h3>
            <p style={{ color: INK_MID, fontSize: '0.9rem' }}>New submissions are being reviewed. Check back soon!</p>
          </div>
        ) : (
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(260px, 1fr))', gap: '20px' }}>
            {resources.map(res => {
              const homebase = [res.homebase_city, res.homebase_state].filter(Boolean).join(', ');
              const catStyle = CATEGORY_STYLES[res.offering_category] || DEFAULT_CAT;
              return (
                <div key={res.id} style={{ backgroundColor: PAPER_LT, border: `1.5px solid rgba(28,22,16,0.12)`, boxShadow: `3px 3px 0 rgba(28,22,16,0.08)`, padding: '18px', display: 'flex', flexDirection: 'column' as const }}>

                  {/* Category pill + icon */}
                  <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '12px' }}>
                    <span style={{ fontFamily: "'Space Mono', monospace", fontSize: '0.55rem', fontWeight: 700, letterSpacing: '0.08em', textTransform: 'uppercase' as const, padding: '3px 10px', backgroundColor: catStyle.bg, border: `1px solid ${catStyle.border}`, color: catStyle.color }}>
                      {res.offering_category}
                    </span>
                    <span style={{ color: catStyle.color }}>{catStyle.icon}</span>
                  </div>

                  {/* Camp name */}
                  <div style={{ fontFamily: "'Arvo', serif", fontWeight: 700, color: INK, fontSize: '1rem', marginBottom: '8px', lineHeight: 1.25 }}>
                    {res.camp_name}
                  </div>

                  {/* Description */}
                  {res.description && (
                    <div style={{ fontSize: '0.82rem', color: INK_MID, lineHeight: 1.6, marginBottom: '14px' }}>
                      {res.description}
                    </div>
                  )}

                  {/* Footer meta */}
                  <div style={{ marginTop: 'auto', borderTop: `1px solid rgba(28,22,16,0.08)`, paddingTop: '12px', display: 'flex', flexDirection: 'column' as const, gap: '5px' }}>
                    {res.location_address && (
                      <div style={{ display: 'flex', gap: '8px', alignItems: 'baseline' }}>
                        <span style={metaLabel}>Playa</span>
                        <span style={metaValue}>{res.location_address}</span>
                      </div>
                    )}
                    {homebase && (
                      <div style={{ display: 'flex', gap: '8px', alignItems: 'baseline' }}>
                        <span style={metaLabel}>Home base</span>
                        <span style={metaValue}>{homebase}</span>
                      </div>
                    )}
                    {res.website && (
                      <div style={{ display: 'flex', gap: '8px', alignItems: 'baseline' }}>
                        <span style={metaLabel}>Web</span>
                        <a href={`https://${res.website.replace(/^https?:\/\//i, '')}`} target="_blank" rel="noreferrer" style={{ fontSize: '0.78rem', color: TEAL, textDecoration: 'none', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' as const }}>
                          {res.website.replace(/^https?:\/\//, '')}
                        </a>
                      </div>
                    )}
                    {res.instagram && (
                      <div style={{ display: 'flex', gap: '8px', alignItems: 'baseline' }}>
                        <span style={metaLabel}>Instagram</span>
                        <a href={`https://instagram.com/${res.instagram}`} target="_blank" rel="noreferrer" style={{ fontSize: '0.78rem', color: TEAL, textDecoration: 'none' }}>
                          @{res.instagram}
                        </a>
                      </div>
                    )}
                    {res.accepting_campers && (
                      <div style={{ marginTop: '8px' }}>
                        <span style={{ fontFamily: "'Space Mono', monospace", fontSize: '0.55rem', fontWeight: 700, letterSpacing: '0.06em', textTransform: 'uppercase' as const, padding: '3px 9px', backgroundColor: '#f0fdf4', border: '1px solid #86efac', color: '#16a34a' }}>
                          Accepting new campers
                        </span>
                      </div>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>

      {isModalOpen && <SubmitCampModal onClose={() => setIsModalOpen(false)} />}
    </div>
  );
}

const metaLabel: React.CSSProperties = { fontFamily: "'Space Mono', monospace", fontSize: '0.55rem', fontWeight: 700, color: INK_LITE, textTransform: 'uppercase' as const, letterSpacing: '0.05em', flexShrink: 0, width: '62px' }
const metaValue: React.CSSProperties = { fontSize: '0.78rem', color: INK_MID }
