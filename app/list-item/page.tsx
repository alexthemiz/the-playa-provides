'use client';

import { useState } from 'react';
import { supabase } from '@/lib/supabaseClient';

export default function ListItemPage() {
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState('');

  // Form State
  const [itemName, setItemName] = useState('');
  const [availabilityStatus, setAvailabilityStatus] = useState('You can borrow it');
  const [category, setCategory] = useState('');
  const [condition, setCondition] = useState('');
  const [locationType, setLocationType] = useState('');
  const [description, setDescription] = useState('');

  async function handleAddItem(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    setMessage('');

    const { error } = await supabase
      .from('gear_items')
      .insert([{ 
        item_name: itemName,
        availability_status: availabilityStatus,
        category: category,
        condition: condition,
        location_type: locationType,
        description: description
      }]);

    if (error) {
      setMessage(`❌ Error: ${error.message}`);
    } else {
      setMessage("✅ Item listed successfully!");
      setItemName('');
      setDescription('');
      setCategory('');
      setCondition('');
      setLocationType('');
    }
    setLoading(false);
  }

  return (
    <div style={containerStyle}>
      <div style={formCardStyle}>
        <h2 style={{ marginTop: 0, color: '#fff' }}>List New Gear</h2>
        
        <form onSubmit={handleAddItem} style={formStyle}>
          {/* Item Name */}
          <input 
            placeholder="Item Name" 
            value={itemName} 
            onChange={(e) => setItemName(e.target.value)} 
            required 
            style={inputStyle}
          />

          {/* Availability Radio Buttons */}
          <div style={radioGroupStyle}>
            <label style={labelStyle}>Availability</label>
            {['You can keep it', 'You can borrow it', 'Not available'].map((option) => (
              <label key={option} style={radioLabelStyle}>
                <input 
                  type="radio" 
                  name="availability" 
                  value={option} 
                  checked={availabilityStatus === option} 
                  onChange={(e) => setAvailabilityStatus(e.target.value)} 
                  style={{ marginRight: '10px' }}
                />
                {option}
              </label>
            ))}
          </div>

          <div style={gridStyle}>
            {/* Category - Restored Paired Options */}
            <select value={category} onChange={(e) => setCategory(e.target.value)} required style={inputStyle}>
              <option value="" disabled>Category</option>
              <option value="Shelter & Shade">Shelter & Shade</option>
              <option value="Kitchen & Water">Kitchen & Water</option>
              <option value="Power & Solar">Power & Solar</option>
              <option value="Tools & Hardware">Tools & Hardware</option>
              <option value="Lighting & Electronics">Lighting & Electronics</option>
              <option value="Storage & Coolers">Storage & Coolers</option>
              <option value="Other / Miscellaneous">Other / Miscellaneous</option>
            </select>

            {/* Condition */}
            <select value={condition} onChange={(e) => setCondition(e.target.value)} required style={inputStyle}>
              <option value="" disabled>Condition</option>
              <option value="New">New</option>
              <option value="Good">Good</option>
              <option value="Fair">Fair</option>
            </select>
          </div>

          {/* Location Type */}
          <select value={locationType} onChange={(e) => setLocationType(e.target.value)} required style={inputStyle}>
            <option value="" disabled>Located</option>
            <option value="Home">Home</option>
            <option value="Business">Business</option>
            <option value="Storage Unit">Storage Unit</option>
            <option value="Other">Other</option>
          </select>

          <textarea 
            placeholder="Description..." 
            value={description} 
            onChange={(e) => setDescription(e.target.value)} 
            style={{...inputStyle, height: '100px'}}
          />

          <button type="submit" disabled={loading} style={buttonStyle}>
            {loading ? 'Listing...' : 'Add to Inventory'}
          </button>

          {message && (
            <p style={{ 
              textAlign: 'center', 
              fontSize: '0.9rem', 
              color: message.includes('❌') ? '#ff6b6b' : '#51cf66' 
            }}>
              {message}
            </p>
          )}
        </form>
      </div>
    </div>
  );
}

// Styles
const containerStyle = { display: 'flex', justifyContent: 'center', alignItems: 'center', minHeight: '80vh', padding: '20px', color: 'white' };
const formCardStyle = { background: '#111', padding: '30px', borderRadius: '12px', border: '1px solid #222', width: '100%', maxWidth: '500px' };
const formStyle = { display: 'flex', flexDirection: 'column' as 'column', gap: '20px' };
const gridStyle = { display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '15px' };
const inputStyle = { padding: '12px', background: '#000', border: '1px solid #333', color: 'white', borderRadius: '6px', fontSize: '1rem' };
const labelStyle = { display: 'block', fontSize: '0.8rem', color: '#888', marginBottom: '10px', textTransform: 'uppercase' as 'uppercase' };
const radioGroupStyle = { display: 'flex', flexDirection: 'column' as 'column', gap: '10px', background: '#080808', padding: '15px', borderRadius: '8px', border: '1px solid #1a1a1a' };
const radioLabelStyle = { display: 'flex', alignItems: 'center', fontSize: '0.95rem', cursor: 'pointer' };
const buttonStyle = { padding: '15px', background: '#fff', color: '#000', fontWeight: 'bold' as 'bold', border: 'none', borderRadius: '6px', cursor: 'pointer', marginTop: '10px' };