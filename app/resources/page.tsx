'use client';

import { useState, useEffect } from 'react';
import { supabase } from '@/lib/supabaseClient';
import { Leaf, Recycle, Droplets, Wrench, Plus } from 'lucide-react';

export default function ResourcesPage() {
  const [resources, setResources] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function fetchResources() {
      const { data, error } = await supabase
        .from('playa_resources')
        .select('*')
        .order('camp_name', { ascending: true });
      
      if (!error && data) setResources(data);
      setLoading(false);
    }
    fetchResources();
  }, []);

  const getIcon = (category: string) => {
    switch (category) {
      case 'Compost': return <Leaf className="text-green-500 w-6 h-6" />;
      case 'Recycling': return <Recycle className="text-blue-500 w-6 h-6" />;
      case 'Water': return <Droplets className="text-cyan-500 w-6 h-6" />;
      default: return <Wrench className="text-orange-500 w-6 h-6" />;
    }
  };

  return (
    <div className="max-w-6xl mx-auto px-4 py-12">
      <div className="flex flex-col md:flex-row justify-between items-start md:items-end mb-12 gap-6">
        <div>
          <h1 className="text-4xl font-bold text-gray-900 mb-2">On-Playa Resources</h1>
          <p className="text-gray-600 max-w-lg">
            A directory for camps offering community services like compost, can collection, or gray water disposal.
          </p>
        </div>
        <button className="flex items-center gap-2 bg-orange-600 text-white px-6 py-3 rounded-xl font-semibold hover:bg-orange-700 transition-colors shadow-lg shadow-orange-600/20">
          <Plus className="w-5 h-5" />
          List Your Camp
        </button>
      </div>

      {loading ? (
        <div className="flex justify-center items-center py-20">
          <div className="animate-pulse text-gray-400 font-medium">Dusting off the records...</div>
        </div>
      ) : resources.length === 0 ? (
        <div className="bg-orange-50 border border-orange-100 rounded-3xl p-12 text-center">
          <h3 className="text-xl font-semibold text-orange-900 mb-2">No resources listed yet</h3>
          <p className="text-orange-700 mb-6">Be the first to share your camp's sustainability offering!</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {resources.map((res) => (
            <div key={res.id} className="bg-white border border-gray-100 rounded-2xl p-6 shadow-sm hover:shadow-xl transition-all duration-300">
              <div className="flex items-start justify-between mb-4">
                <div className="p-3 bg-gray-50 rounded-xl">
                  {getIcon(res.offering_category)}
                </div>
                <span className="text-xs font-bold uppercase tracking-widest text-gray-500 bg-gray-100 px-3 py-1 rounded-full">
                  {res.location_address || 'TBD'}
                </span>
              </div>
              <h3 className="text-xl font-bold text-gray-900 mb-2">{res.camp_name}</h3>
              <p className="text-gray-600 text-sm leading-relaxed mb-4">{res.description}</p>
              <div className="pt-4 border-t border-gray-50 text-xs font-semibold text-orange-600">
                {res.offering_category}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}