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
      const { data, error } = await supabase
        .from('playa_resources')
        .select('*')
        .eq('is_verified', true)
        .order('camp_name', { ascending: true });

      if (error) {
        console.error('Resources fetch error:', error);
        // Stale/invalid session — sign out silently and retry as anon
        if (error.code === 'PGRST301' || error.message?.includes('JWT') || error.message?.includes('token')) {
          await supabase.auth.signOut();
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
      setLoading(false);
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
      
      {/* Header Section: Centered & Widened */}
      <div className="flex flex-col items-center text-center mb-16">
        <h1 className="text-5xl font-bold text-[#2D241E] mb-4">On-Playa Resources</h1>
        
        {/* Increased max-width to 4xl to keep everything on one line */}
        <p className="text-stone-600 max-w-4xl text-lg leading-relaxed mb-8">
          A directory of camps offering community services, from bike repair to greywater disposal.
        </p>
        
        <button 
          onClick={() => setIsModalOpen(true)}
          className="bg-[#C08261] text-white px-10 py-4 rounded-2xl font-bold hover:bg-[#A66D51] transition-all shadow-lg shadow-stone-200 active:scale-95"
        >
          Submit Your Camp
        </button>
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
        <div style={{ display: 'flex', flexDirection: 'column' as const }}>
          {/* List header */}
          <div style={listHeaderStyle}>
            <div />
            <div>Camp</div>
            <div>Category</div>
            <div>Service</div>
            <div>2026 Playa<br />Address</div>
            <div>Home Base</div>
            <div>Website</div>
            <div>Accepting New<br />Campers?</div>
          </div>
          {resources.map((res) => {
            const homebase = [res.homebase_city, res.homebase_state].filter(Boolean).join(', ');
            return (
              <div key={res.id} style={listRowStyle}>
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                  {getIcon(res.offering_category)}
                </div>
                <div style={{ fontWeight: '600', color: '#111', fontSize: '14px' }}>{res.camp_name}</div>
                <div style={{ ...listColStyle, fontWeight: '700', color: '#C08261', textTransform: 'uppercase' as const, fontSize: '11px' }}>{res.offering_category}</div>
                <div style={listColStyle}>{res.description || '—'}</div>
                <div style={{ ...listColStyle, color: '#999' }}>{res.location_address || 'TBD'}</div>
                <div style={listColStyle}>{homebase || '—'}</div>
                <div style={listColStyle}>
                  {res.website ? <a href={res.website} target="_blank" rel="noreferrer" style={{ color: '#00ccff', textDecoration: 'none' }}>{res.website.replace(/^https?:\/\//, '')}</a> : '—'}
                </div>
                <div style={{ textAlign: 'center' as const }}>
                  {res.accepting_campers ? <span style={{ color: '#16a34a', fontSize: '16px' }}>✓</span> : ''}
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

const LIST_COLS = '40px 160px 120px 1fr 120px 120px 140px 120px';
const listHeaderStyle: React.CSSProperties = { display: 'grid', gridTemplateColumns: LIST_COLS, gap: '10px', padding: '8px 12px', fontSize: '10px', fontWeight: '700', color: '#aaa', textTransform: 'uppercase', letterSpacing: '0.06em', borderBottom: '2px solid #eee' };
const listRowStyle: React.CSSProperties = { display: 'grid', gridTemplateColumns: LIST_COLS, gap: '10px', alignItems: 'center', padding: '12px 12px', backgroundColor: '#fff', borderBottom: '1px solid #f5f5f5' };
const listColStyle: React.CSSProperties = { fontSize: '13px', color: '#555', overflow: 'hidden', whiteSpace: 'nowrap' as const, textOverflow: 'ellipsis' };