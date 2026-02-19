'use client';

import { useState, useEffect } from 'react';
import { supabase } from '@/lib/supabaseClient';

const CATEGORIES = ["Bikes & Transport", "Kitchen & Cooking", "Lighting & Power", "Safety & First Aid", "Shelter & Shade", "Tools & Hardware", "Water & Graywater"];
const CONDITIONS = ["New", "Good", "Used (Playa Dust Included)", "Needs Repair"];

export default function AddItemModal({ onClose, onSuccess }: { onClose: () => void, onSuccess: () => void }) {
  const [loading, setLoading] = useState(false);
  const [locations, setLocations] = useState<any[]>([]);
  
  const [formData, setFormData] = useState({
    item_name: '',
    description: '',
    category: CATEGORIES[0],
    condition: CONDITIONS[0],
    location_id: '',
    availability_status: 'Available to borrow'
  });

  useEffect(() => {
    async function fetchLocations() {
      const { data: { user } } = await supabase.auth.getUser();
      if (user) {
        const { data } = await supabase.from('locations').select('*').eq('user_id', user.id);
        if (data && data.length > 0) {
          setLocations(data);
          setFormData(prev => ({ ...prev, location_id: data[0].id }));
        }
      }
    }
    fetchLocations();
  }, []);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);

    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return;

    const { error } = await supabase.from('gear_items').insert([{
      ...formData,
      user_id: user.id
    }]);

    if (error) {
      alert(error.message);
    } else {
      onSuccess(); // This closes the modal and refreshes the list
    }
    setLoading(false);
  }

  return (
    <div style={overlayStyle}>
      <div style={modalStyle}>
        <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '20px' }}>
          <h2 style={{ margin: 0 }}>Add New Gear</h2>
          <button onClick={onClose} style={closeButtonStyle}>✕</button>
        </div>

        <form onSubmit={handleSubmit} style={{ display: 'grid', gap: '15px' }}>
          <div>
            <label style={labelStyle}>Item Name</label>
            <input required style={inputStyle} value={formData.item_name} onChange={e => setFormData({...formData, item_name: e.target.value})} placeholder="e.g. Coleman 2-Burner Stove" />
          </div>

          <div>
            <label style={labelStyle}>Description (Optional)</label>
            <textarea style={{...inputStyle, height: '60px'}} value={formData.description} onChange={e => setFormData({...formData, description: e.target.value})} placeholder="Any specific details..." />
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '10px' }}>
            <div>
              <label style={labelStyle}>Category</label>
              <select style={inputStyle} value={formData.category} onChange={e => setFormData({...formData, category: e.target.value})}>
                {CATEGORIES.map(c => <option key={c} value={c}>{c}</option>)}
              </select>
            </div>
            <div>
              <label style={labelStyle}>Condition</label>
              <select style={inputStyle} value={formData.condition} onChange={e => setFormData({...formData, condition: e.target.value})}>
                {CONDITIONS.map(c => <option key={c} value={c}>{c}</option>)}
              </select>
            </div>
          </div>

          <div>
            <label style={labelStyle}>Stored At</label>
            <select required style={inputStyle} value={formData.location_id} onChange={e => setFormData({...formData, location_id: e.target.value})}>
              {locations.length === 0 && <option value="">No locations found - check Settings</option>}
              {locations.map(loc => (
                <option key={loc.id} value={loc.id}>{loc.label} ({loc.location_type})</option>
              ))}
            </select>
          </div>

          <button type="submit" disabled={loading} style={submitButtonStyle}>
            {loading ? 'Adding...' : 'Add to Inventory'}
          </button>
        </form>
      </div>
    </div>
  );
}

// Styles
const overlayStyle: React.CSSProperties = { position: 'fixed', top: 0, left: 0, right: 0, bottom: 0, backgroundColor: 'rgba(0,0,0,0.85)', display: 'flex', justifyContent: 'center', alignItems: 'center', zIndex: 1000 };
const modalStyle: React.CSSProperties = { backgroundColor: '#111', padding: '30px', borderRadius: '12px', width: '100%', maxWidth: '500px', border: '1px solid #333', color: 'white' };
const inputStyle = { width: '100%', padding: '10px', backgroundColor: '#000', border: '1px solid #333', color: 'white', borderRadius: '6px' };
const labelStyle = { display: 'block', fontSize: '0.8rem', color: '#888', marginBottom: '5px' };
const submitButtonStyle = { padding: '12px', background: '#00ccff', color: 'black', fontWeight: 'bold', border: 'none', borderRadius: '6px', cursor: 'pointer', marginTop: '10px' };
const closeButtonStyle = { background: 'none', border: 'none', color: '#888', fontSize: '1.2rem', cursor: 'pointer' };