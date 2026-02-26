'use client';

import { useState } from 'react';
import { supabase } from '@/lib/supabaseClient';
import { X, Send, ChevronDown } from 'lucide-react';

interface SubmitCampModalProps {
  onClose: () => void;
}

export default function SubmitCampModal({ onClose }: SubmitCampModalProps) {
  const [loading, setLoading] = useState(false);
  const [submitted, setSubmitted] = useState(false);
  
  const [formData, setFormData] = useState({
    camp_name: '',
    offering_category: 'Compost',
    location_address: 'TBD',
    description: '',
    homebase_city: '',
    homebase_state: '',
    homebase_zip: '',
    website: '',
    public_email: '',
    about_camp: '',
    accepting_campers: false
  });

  const states = ["AL", "AK", "AZ", "AR", "CA", "CO", "CT", "DE", "FL", "GA", "HI", "ID", "IL", "IN", "IA", "KS", "KY", "LA", "ME", "MD", "MA", "MI", "MN", "MS", "MO", "MT", "NE", "NV", "NH", "NJ", "NM", "NY", "NC", "ND", "OH", "OK", "OR", "PA", "RI", "SC", "SD", "TN", "TX", "UT", "VT", "VA", "WA", "WV", "WI", "WY"];

  const categories = ["Compost", "Recycling", "Tools/Repair", "Donations", "Other"].sort((a, b) => (a === "Other" ? 1 : b === "Other" ? -1 : a.localeCompare(b)));

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    try {
      const { error } = await supabase.from('playa_resources').insert([{ ...formData, is_verified: false }]);
      if (error) throw error;

      // Fire notification email — non-blocking, ignore errors so the user still gets success
      supabase.functions.invoke('send-camp-submission', { body: formData }).catch(() => {});

      setSubmitted(true);
    } catch (err) {
      console.error(err);
      alert('Error submitting camp.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div onClick={onClose} className="fixed inset-0 bg-[#2D241E]/30 backdrop-blur-sm z-50 flex justify-center items-start overflow-y-auto p-4 py-6 cursor-pointer">
      <div onClick={(e) => e.stopPropagation()} className="bg-white rounded-3xl max-w-xl w-full shadow-2xl border border-stone-100 relative mb-6 cursor-default">
        <div className="p-6">
          <div className="flex justify-between items-center mb-3">
            <h2 className="text-xl font-bold text-[#2D241E]">Submit Your Camp</h2>
            <button onClick={onClose} className="p-1 hover:bg-stone-100 rounded-full transition-colors">
              <X className="w-5 h-5 text-stone-500" />
            </button>
          </div>

          {submitted ? (
            <div className="py-8 text-center">
              <div className="w-14 h-14 bg-green-100 rounded-full flex items-center justify-center mx-auto mb-4">
                <Send className="w-7 h-7 text-green-600" />
              </div>
              <h3 className="text-xl font-bold text-[#2D241E] mb-2">Submission Received!</h3>
              <p className="text-stone-500 text-sm mb-6">We'll review your camp and add it to the directory once approved.</p>
              <div className="bg-[#fdf3ec] border border-[#f0d8c8] rounded-2xl p-4">
                <p className="text-sm font-semibold text-[#2D241E] mb-1">Want to list your gear too?</p>
                <p className="text-xs text-stone-500 mb-3">Create an account to share and borrow gear with the community.</p>
                <div className="flex gap-2 justify-center">
                  <a href="/signup" className="px-4 py-2 bg-[#C08261] text-white text-xs font-bold rounded-xl hover:bg-[#A66D51] transition-colors">Sign Up</a>
                  <a href="/login" className="px-4 py-2 bg-white border border-stone-200 text-[#2D241E] text-xs font-bold rounded-xl hover:bg-stone-50 transition-colors">Log In</a>
                </div>
              </div>
            </div>
          ) : (
            <form onSubmit={handleSubmit} className="space-y-3">
              <div>
                <label className="block text-xs font-bold text-[#2D241E] mb-1 ml-1 uppercase tracking-tight">Camp Name</label>
                <input required className="w-full border-2 border-stone-200 rounded-xl p-2 text-black focus:border-[#C08261] outline-none" value={formData.camp_name} onChange={(e) => setFormData({...formData, camp_name: e.target.value})} placeholder="e.g. Camp Dust-Off" />
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-bold text-[#2D241E] mb-1 ml-1 uppercase tracking-tight">Category</label>
                  <div className="relative">
                    <select className="w-full border-2 border-stone-200 rounded-xl p-2 text-black focus:border-[#C08261] outline-none bg-white appearance-none" value={formData.offering_category} onChange={(e) => setFormData({...formData, offering_category: e.target.value})}>
                      {categories.map(cat => <option key={cat} value={cat}>{cat}</option>)}
                    </select>
                    <ChevronDown className="absolute right-3 top-3 w-4 h-4 text-stone-400 pointer-events-none" />
                  </div>
                </div>
                <div>
                  <label className="block text-xs font-bold text-[#2D241E] mb-1 ml-1 uppercase tracking-tight">2026 Playa Address</label>
                  <input disabled className="w-full border-2 border-stone-100 bg-stone-50 rounded-xl p-2 text-stone-500 cursor-not-allowed" value="TBD" />
                </div>
              </div>

              <div>
                <label className="block text-xs font-bold text-[#2D241E] mb-1 ml-1 uppercase tracking-tight">Description of Service</label>
                <textarea required className="w-full border-2 border-stone-200 rounded-xl p-2 h-16 text-black focus:border-[#C08261] outline-none resize-none text-sm" value={formData.description} onChange={(e) => setFormData({...formData, description: e.target.value})} placeholder="e.g. Accepting aluminum cans daily from 2-4pm" />
              </div>

              {/* Optional Details - Left Aligned & Style Matched */}
              <div className="pt-3 border-t border-stone-100 space-y-3">
             <h4 className="text-xs font-bold text-[#2D241E] uppercase tracking-tight text-left ml-1">Optional Details</h4>
                <div className="grid grid-cols-12 gap-2">
                  <div className="col-span-12 md:col-span-6">
                    <label className="block text-xs font-bold text-[#2D241E] mb-1 ml-1 uppercase tracking-tight">Homebase City</label>
                    <input className="w-full border-2 border-stone-200 rounded-lg p-1.5 text-black focus:border-[#C08261] outline-none text-sm" value={formData.homebase_city} onChange={(e) => setFormData({...formData, homebase_city: e.target.value})} placeholder="San Francisco" />
                  </div>
                  <div className="col-span-6 md:col-span-3">
                    <label className="block text-xs font-bold text-[#2D241E] mb-1 ml-1 uppercase tracking-tight">State</label>
                    <select className="w-full border-2 border-stone-200 rounded-lg p-1.5 text-black focus:border-[#C08261] outline-none bg-white text-sm" value={formData.homebase_state} onChange={(e) => setFormData({...formData, homebase_state: e.target.value})}>
                      <option value="">--</option>
                      {states.map(s => <option key={s} value={s}>{s}</option>)}
                    </select>
                  </div>
                  <div className="col-span-6 md:col-span-3">
                    <label className="block text-xs font-bold text-[#2D241E] mb-1 ml-1 uppercase tracking-tight">Zip</label>
                    <input className="w-full border-2 border-stone-200 rounded-lg p-1.5 text-black focus:border-[#C08261] outline-none text-sm" value={formData.homebase_zip} onChange={(e) => setFormData({...formData, homebase_zip: e.target.value})} placeholder="94110" />
                  </div>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-2">
                  <div>
                    <label className="block text-xs font-bold text-[#2D241E] mb-1 ml-1 uppercase tracking-tight">Website</label>
                    <input type="url" className="w-full border-2 border-stone-200 rounded-lg p-1.5 text-black focus:border-[#C08261] outline-none text-sm" value={formData.website} onChange={(e) => setFormData({...formData, website: e.target.value})} placeholder="https://..." />
                  </div>
                  <div>
                    <label className="block text-xs font-bold text-[#2D241E] mb-1 ml-1 uppercase tracking-tight">Contact Email (Public)</label>
                    <input type="email" className="w-full border-2 border-stone-200 rounded-lg p-1.5 text-black focus:border-[#C08261] outline-none text-sm" value={formData.public_email} onChange={(e) => setFormData({...formData, public_email: e.target.value})} placeholder="hello@camp.com" />
                  </div>
                </div>

                <div className="space-y-2">
                  <div>
                    <label className="block text-xs font-bold text-[#2D241E] mb-1 ml-1 uppercase tracking-tight">About the Camp</label>
                    <textarea className="w-full border-2 border-stone-200 rounded-lg p-1.5 h-16 text-black focus:border-[#C08261] outline-none resize-none text-sm" value={formData.about_camp} onChange={(e) => setFormData({...formData, about_camp: e.target.value})} placeholder="Brief history or camp mission..." />
                  </div>

                  <div className="flex items-center gap-2 pb-1">
                    <input type="checkbox" id="new_campers" checked={formData.accepting_campers} onChange={(e) => setFormData({...formData, accepting_campers: e.target.checked})} className="w-3.5 h-3.5 accent-[#C08261]" />
                    <label htmlFor="new_campers" className="text-[11px] font-bold text-[#2D241E] uppercase">Accepting new campers?</label>
                  </div>
                </div>
              </div>

<button type="submit" disabled={loading} className="w-full bg-[#C08261] text-white py-3 rounded-2xl font-bold hover:bg-[#A66D51] transition-all text-sm uppercase tracking-normal shadow-lg active:scale-95">
  {loading ? 'Submitting...' : 'Submit for Review'}
</button>
            </form>
          )}
        </div>
      </div>
    </div>
  );
}