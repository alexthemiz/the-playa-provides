'use client';

import { useState, useEffect } from 'react';
import { supabase } from '@/lib/supabaseClient';
import { Leaf, Recycle, Droplets, Wrench, Plus } from 'lucide-react';
import SubmitCampModal from '../../components/SubmitCampModal';

export default function ResourcesPage() {
  const [resources, setResources] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [isModalOpen, setIsModalOpen] = useState(false);

  useEffect(() => {
    async function fetchResources() {
      // Logic Update: Filter for is_verified = true
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

  const getIcon = (category: string) => {
    switch (category) {
      case 'Compost': return <Leaf className="text-green-600 w-6 h-6" />;
      case 'Recycling': return <Recycle className="text-blue-600 w-6 h-6" />;
      case 'Water': return <Droplets className="text-[#00ccff] w-6 h-6" />;
      default: return <Wrench className="text-[#C08261] w-6 h-6" />;
    }
  };

  return (
    <div className="max-w-6xl mx-auto px-4 py-12 bg-white min-h-screen">
      <div className="flex flex-col md:flex-row justify-between items-start md:items-end mb-12 gap-6">
        <div>
          <h1 className="text-4xl font-bold text-[#2D241E] mb-2">On-Playa Resources</h1>
          <p className="text-stone-600 max-w-lg">
            A directory for camps offering community services like compost, can collection, or water.
          </p>
        </div>
        
        {/* Updated Button Label and Action */}
        <button 
          onClick={() => setIsModalOpen(true)}
          className="flex items-center gap-2 bg-[#C08261] text-white px-6 py-3 rounded-xl font-semibold hover:bg-[#A66D51] transition-colors shadow-lg shadow-stone-200"
        >
          <Plus className="w-5 h-5" />
          Submit Your Camp
        </button>
      </div>

      {loading ? (
        <div className="flex justify-center items-center py-20">
          <div className="animate-pulse text-stone-400 font-medium italic">Dusting off the records...</div>
        </div>
      ) : resources.length === 0 ? (
        <div className="bg-stone-50 border border-stone-100 rounded-3xl p-12 text-center">
          <h3 className="text-xl font-semibold text-[#2D241E] mb-2">No verified resources yet</h3>
          <p className="text-stone-600 mb-6">New submissions are being reviewed. Check back soon!</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {resources.map((res) => (
            <div key={res.id} className="bg-white border border-stone-100 rounded-2xl p-6 shadow-sm hover:shadow-md transition-all duration-300">
              <div className="flex items-start justify-between mb-4">
                <div className="p-3 bg-stone-50 rounded-xl">
                  {getIcon(res.offering_category)}
                </div>
                <span className="text-[10px] font-bold uppercase tracking-widest text-stone-400 bg-stone-100 px-3 py-1 rounded-full">
                  {res.location_address || 'TBD'}
                </span>
              </div>
              <h3 className="text-xl font-bold text-[#2D241E] mb-2">{res.camp_name}</h3>
              <p className="text-stone-600 text-sm leading-relaxed mb-4">{res.description}</p>
              <div className="pt-4 border-t border-stone-50 text-xs font-bold text-[#00ccff] uppercase tracking-wide">
                {res.offering_category}
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Modal Trigger */}
      {isModalOpen && (
        <SubmitCampModal onClose={() => setIsModalOpen(false)} />
      )}
    </div>
  );
}