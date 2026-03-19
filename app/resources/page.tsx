'use client';

import React, { useState, useEffect } from 'react';
import { supabase } from '@/lib/supabaseClient';
import { Leaf, Recycle, Droplets, Wrench, Plus, Beer, Heart, Box } from 'lucide-react'; // Added icons
import SubmitCampModal from '../../components/SubmitCampModal';

export default function ResourcesPage() {
  const [resources, setResources] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [fetchError, setFetchError] = useState(false);
  const [isModalOpen, setIsModalOpen] = useState(false);

  useEffect(() => {
    async function fetchResources() {
      try {
        const { data, error } = await supabase
          .from('playa_resources')
          .select('*')
          .eq('is_verified', true)
          .order('camp_name', { ascending: true });

        if (error) {
          console.error('Resources fetch error:', error);
          // Stale/invalid session — sign out locally and retry as anon
          if (error.code === 'PGRST301' || error.message?.includes('JWT') || error.message?.includes('token')) {
            await supabase.auth.signOut({ scope: 'local' }); // local only, no network call
            const { data: retryData, error: retryError } = await supabase
              .from('playa_resources')
              .select('*')
              .eq('is_verified', true)
              .order('camp_name', { ascending: true });
            if (!retryError && retryData) {
              setResources(retryData);
            } else {
              setFetchError(true);
            }
          } else {
            setFetchError(true);
          }
        } else if (data) {
          setResources(data);
        }
      } catch (err) {
        console.error('Resources fetch error (caught):', err);
        setFetchError(true);
      } finally {
        setLoading(false);
      }
    }
    fetchResources();
  }, []);

  // Updated to handle your new alphabetical categories
  const getIcon = (category: string) => {
    switch (category) {
      case 'Donations': return <Box className="text-amber-600 w-6 h-6" />;
      case 'Food/Drink': return <Beer className="text-orange-500 w-6 h-6" />;
      case 'Health/Wellness': return <Heart className="text-red-500 w-6 h-6" />;
      case 'Water': return <Droplets className="text-[#00ccff] w-6 h-6" />;
      case 'Bike Repair': return <Wrench className="text-slate-500 w-6 h-6" />;
      default: return <Wrench className="text-[#C08261] w-6 h-6" />;
    }
  };

return (
  /* Wrap in a full-width white div to hide the black background on the sides */
  <div className="w-full bg-white min-h-screen"> 
    <div className="max-w-6xl mx-auto px-4 py-16">
      
      {/* Header Section */}
      <div className="flex flex-col mb-16">
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '16px' }}>
          <h1 className="text-5xl font-bold text-[#2D241E]">The Playa Provides<span style={{ textDecoration: 'underline' }}> Resources{'\u00a0'}</span></h1>
          <button
            onClick={() => setIsModalOpen(true)}
            style={{ backgroundColor: '#00ccff', color: '#000', padding: '10px 20px', borderRadius: '6px', border: 'none', fontWeight: 'bold', cursor: 'pointer', whiteSpace: 'nowrap' as const, fontSize: '0.9rem' }}
          >
            Submit Your Camp
          </button>
        </div>

        <p className="text-stone-600 max-w-4xl text-lg leading-relaxed mb-8">
          A directory of camps offering sustainability and community services at the 2026 Burn, from composting and can crushing to bike repair and donation accepting.
        </p>
      </div>

      {loading ? (
        <div className="flex justify-center items-center py-20">
          <div className="animate-pulse text-stone-400 font-medium italic">Dusting off the records...</div>
        </div>
      ) : fetchError ? (
        <div className="bg-stone-50 border border-stone-100 rounded-3xl p-12 text-center max-w-2xl mx-auto">
          <h3 className="text-xl font-semibold text-[#2D241E] mb-2">Couldn&apos;t load resources</h3>
          <p className="text-stone-600 mb-6">Something went wrong fetching the directory. Try refreshing the page.</p>
        </div>
      ) : resources.length === 0 ? (
        <div className="bg-stone-50 border border-stone-100 rounded-3xl p-12 text-center max-w-2xl mx-auto">
          <h3 className="text-xl font-semibold text-[#2D241E] mb-2">No verified resources yet</h3>
          <p className="text-stone-600 mb-6">New submissions are being reviewed. Check back soon!</p>
        </div>
      ) : (
        <div style={cardGridStyle}>
          {resources.map((res) => {
            const homebase = [res.homebase_city, res.homebase_state].filter(Boolean).join(', ');
            return (
              <div key={res.id} style={cardStyle}>
                {/* Card header: icon + category pill */}
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '10px' }}>
                  <span style={categoryPillStyle}>{res.offering_category}</span>
                  {getIcon(res.offering_category)}
                </div>

                {/* Camp name */}
                <div style={{ fontWeight: '700', color: '#2D241E', fontSize: '16px', marginBottom: '6px', lineHeight: 1.3 }}>
                  {res.camp_name}
                </div>

                {/* Service description */}
                {res.description && (
                  <div style={{ fontSize: '13px', color: '#666', lineHeight: 1.5, marginBottom: '12px' }}>
                    {res.description}
                  </div>
                )}

                {/* Footer meta */}
                <div style={{ marginTop: 'auto', borderTop: '1px solid #f0f0f0', paddingTop: '10px', display: 'flex', flexDirection: 'column' as const, gap: '4px' }}>
                  {res.location_address && (
                    <div style={metaRowStyle}>
                      <span style={metaLabelStyle}>Playa</span>
                      <span style={metaValueStyle}>{res.location_address}</span>
                    </div>
                  )}
                  {homebase && (
                    <div style={metaRowStyle}>
                      <span style={metaLabelStyle}>Home base</span>
                      <span style={metaValueStyle}>{homebase}</span>
                    </div>
                  )}
                  {res.website && (
                    <div style={metaRowStyle}>
                      <span style={metaLabelStyle}>Web</span>
                      <a href={res.website} target="_blank" rel="noreferrer" style={{ fontSize: '12px', color: '#00aacc', textDecoration: 'none', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' as const }}>
                        {res.website.replace(/^https?:\/\//, '')}
                      </a>
                    </div>
                  )}
                  {res.accepting_campers && (
                    <div style={{ marginTop: '6px' }}>
                      <span style={acceptingBadgeStyle}>Accepting new campers</span>
                    </div>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      )}

      {isModalOpen && (
        <SubmitCampModal onClose={() => setIsModalOpen(false)} />
      )}
    </div>
  </div>
);
}

const cardGridStyle: React.CSSProperties = {
  display: 'grid',
  gridTemplateColumns: 'repeat(auto-fill, minmax(260px, 1fr))',
  gap: '20px',
};

const cardStyle: React.CSSProperties = {
  backgroundColor: '#fff',
  border: '1px solid #eee',
  borderRadius: '16px',
  padding: '18px',
  display: 'flex',
  flexDirection: 'column' as const,
  boxShadow: '0 2px 8px rgba(0,0,0,0.05)',
};

const categoryPillStyle: React.CSSProperties = {
  fontSize: '10px',
  fontWeight: '700',
  color: '#C08261',
  textTransform: 'uppercase' as const,
  letterSpacing: '0.07em',
  backgroundColor: '#fdf3ec',
  borderRadius: '99px',
  padding: '3px 10px',
};

const metaRowStyle: React.CSSProperties = {
  display: 'flex',
  gap: '8px',
  alignItems: 'baseline',
};

const metaLabelStyle: React.CSSProperties = {
  fontSize: '10px',
  fontWeight: '700',
  color: '#bbb',
  textTransform: 'uppercase' as const,
  letterSpacing: '0.05em',
  flexShrink: 0,
  width: '58px',
};

const metaValueStyle: React.CSSProperties = {
  fontSize: '12px',
  color: '#555',
};

const acceptingBadgeStyle: React.CSSProperties = {
  display: 'inline-block',
  fontSize: '11px',
  fontWeight: '600',
  color: '#16a34a',
  backgroundColor: '#f0fdf4',
  border: '1px solid #bbf7d0',
  borderRadius: '99px',
  padding: '2px 10px',
};