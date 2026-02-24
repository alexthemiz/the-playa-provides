'use client';

import { useState } from 'react';
import { supabase } from '@/lib/supabaseClient';
import { X, Send, MapPin, Info } from 'lucide-react';

interface SubmitCampModalProps {
  onClose: () => void;
}

export default function SubmitCampModal({ onClose }: SubmitCampModalProps) {
  const [loading, setLoading] = useState(false);
  const [submitted, setSubmitted] = useState(false);
  
  const [formData, setFormData] = useState({
    camp_name: '',
    offering_category: 'Water',
    location_address: '',
    description: '',
  });

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);

    try {
      const { error } = await supabase
        .from('playa_resources')
        .insert([
          { 
            ...formData, 
            is_verified: false // Explicitly set to false for moderation
          }
        ]);

      if (error) throw error;
      
      setSubmitted(true);
      setTimeout(() => onClose(), 3000);
    } catch (err) {
      console.error('Submission error:', err);
      alert('Error submitting camp. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 bg-[#2D241E]/40 backdrop-blur-sm z-50 flex items-center justify-center p-4">
      <div className="bg-white rounded-3xl max-w-lg w-full overflow-hidden shadow-2xl border border-stone-100">
        <div className="p-8">
          <div className="flex justify-between items-center mb-6">
            <h2 className="text-2xl font-bold text-[#2D241E]">Submit Your Camp</h2>
            <button onClick={onClose} className="p-2 hover:bg-stone-100 rounded-full transition-colors">
              <X className="w-6 h-6 text-stone-400" />
            </button>
          </div>

          {submitted ? (
            <div className="py-12 text-center">
              <div className="bg-green-50 text-green-600 w-16 h-16 rounded-full flex items-center justify-center mx-auto mb-4">
                <Send className="w-8 h-8" />
              </div>
              <h3 className="text-xl font-bold text-[#2D241E]">Submission Received!</h3>
              <p className="text-stone-600 mt-2">
                Thank you! Your camp will appear in the directory once it has been reviewed.
              </p>
            </div>
          ) : (
            <form onSubmit={handleSubmit} className="space-y-4">
              <div>
                <label className="block text-xs font-bold uppercase text-stone-400 mb-2 ml-1">Camp Name</label>
                <input
                  required
                  className="w-full border border-stone-200 rounded-xl p-3 focus:ring-2 focus:ring-[#C08261] outline-none"
                  value={formData.camp_name}
                  onChange={(e) => setFormData({...formData, camp_name: e.target.value})}
                  placeholder="e.g. Camp Dust-Off"
                />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-bold uppercase text-stone-400 mb-2 ml-1">Category</label>
                  <select
                    className="w-full border border-stone-200 rounded-xl p-3 focus:ring-2 focus:ring-[#C08261] outline-none bg-white"
                    value={formData.offering_category}
                    onChange={(e) => setFormData({...formData, offering_category: e.target.value})}
                  >
                    <option value="Water">Water</option>
                    <option value="Compost">Compost</option>
                    <option value="Recycling">Recycling</option>
                    <option value="Tools/Repair">Tools/Repair</option>
                    <option value="Other">Other</option>
                  </select>
                </div>
                <div>
                  <label className="block text-xs font-bold uppercase text-stone-400 mb-2 ml-1">Location</label>
                  <input
                    className="w-full border border-stone-200 rounded-xl p-3 focus:ring-2 focus:ring-[#C08261] outline-none"
                    value={formData.location_address}
                    onChange={(e) => setFormData({...formData, location_address: e.target.value})}
                    placeholder="e.g. 6:15 & D"
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-bold uppercase text-stone-400 mb-2 ml-1">Description of Service</label>
                <textarea
                  required
                  className="w-full border border-stone-200 rounded-xl p-3 h-32 focus:ring-2 focus:ring-[#C08261] outline-none resize-none"
                  value={formData.description}
                  onChange={(e) => setFormData({...formData, description: e.target.value})}
                  placeholder="What are you offering and when? (e.g. Accepting aluminum cans daily from 2-4pm)"
                />
              </div>

              <div className="bg-blue-50 p-4 rounded-xl flex gap-3 items-start border border-blue-100">
                <Info className="w-5 h-5 text-blue-500 mt-0.5 shrink-0" />
                <p className="text-xs text-blue-800 leading-relaxed">
                  Submissions are reviewed manually to ensure accuracy. Please allow up to 24 hours for your camp to appear.
                </p>
              </div>

              <button
                type="submit"
                disabled={loading}
                className="w-full bg-[#C08261] text-white py-4 rounded-2xl font-bold hover:bg-[#A66D51] transition-all disabled:opacity-50 mt-4 shadow-lg shadow-[#C08261]/20"
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