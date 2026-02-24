'use client';

import { useState, useEffect } from 'react';
import { supabase } from '@/lib/supabaseClient';
import { Leaf, Recycle, Droplets, Wrench, Plus, Beer, Heart, Box } from 'lucide-react'; // Added icons
import SubmitCampModal from '../../components/SubmitCampModal';

export default function ResourcesPage() {
  const [resources, setResources] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [isModalOpen, setIsModalOpen] = useState(false);

  useEffect(() => {
    async function fetchResources() {
      const { data, error } = await supabase
        .from('playa_resources')
        .select('*')
        .eq('is_verified', true) 
        .order('camp_name', { ascending: true });
      
      if (!error && data) setResources(data);
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
          A directory for camps offering community services, from bike repair to greywater disposal.
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
      ) : resources.length === 0 ? (
        <div className="bg-stone-50 border border-stone-100 rounded-3xl p-12 text-center max-w-2xl mx-auto">
          <h3 className="text-xl font-semibold text-[#2D241E] mb-2">No verified resources yet</h3>
          <p className="text-stone-600 mb-6">New submissions are being reviewed. Check back soon!</p>
        </div>
      ) : (
        /* The Grid */
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
          {resources.map((res) => (
            <div key={res.id} className="bg-white border border-stone-100 rounded-3xl p-8 shadow-sm hover:shadow-xl hover:-translate-y-1 transition-all duration-300">
              <div className="flex items-start justify-between mb-6">
                <div className="p-4 bg-stone-50 rounded-2xl">
                  {getIcon(res.offering_category)}
                </div>
                <span className="text-[10px] font-black uppercase tracking-[0.2em] text-stone-400 bg-stone-100 px-4 py-1.5 rounded-full">
                  {res.location_address || 'TBD'}
                </span>
              </div>
              
              <h3 className="text-2xl font-bold text-[#2D241E] mb-1">{res.camp_name}</h3>
              
              {(res.homebase_city || res.homebase_state) && (
                <p className="text-[11px] font-bold text-[#C08261] uppercase tracking-wider mb-4">
                  {res.homebase_city}{res.homebase_city && res.homebase_state ? ', ' : ''}{res.homebase_state}
                </p>
              )}

              <p className="text-stone-600 text-sm leading-relaxed mb-6">{res.description}</p>
              
              <div className="pt-6 border-t border-stone-50 flex justify-between items-center">
                 <span className="text-xs font-black text-[#2D241E] uppercase tracking-widest">
                  {res.offering_category}
                </span>
                {res.accepting_campers && (
                  <span className="text-[10px] font-bold text-white bg-green-600 px-3 py-1 rounded-lg shadow-sm shadow-green-100">
                    RECRUITING
                  </span>
                )}
              </div>
            </div>
          ))}
        </div>
      )}

      {isModalOpen && (
        <SubmitCampModal onClose={() => setIsModalOpen(false)} />
      )}
    </div>
  </div>
);
}