'use client';

import { useEffect, useState } from 'react';
import { supabase } from '@/lib/supabaseClient';

export default function ListItemPage() {
  const [locations, setLocations] = useState<any[]>([]);
  const [selectedLocation, setSelectedLocation] = useState('');
  const [availability, setAvailability] = useState('keep'); 
  const [loading, setLoading] = useState(true);
  
  // FORM FIELDS
  const [itemName, setItemName] = useState('');
  const [category, setCategory] = useState('');
  const [description, setDescription] = useState('');
  const [condition, setCondition] = useState('good');
  const [pickupBy, setPickupBy] = useState('');
  const [returnBy, setReturnBy] = useState('');
  const [terms, setTerms] = useState('');
const [manualAddress, setManualAddress] = useState('');
  useEffect(() => {
    const fetchLocations = async () => {
      const { data: { user } } = await supabase.auth.getUser();
      if (user) {
        const { data } = await supabase
          .from('locations')
          .select('id, label')
          .eq('user_id', user.id);
        if (data) setLocations(data);
      }
      setLoading(false);
    };
    fetchLocations();
  }, []);

const handleSubmit = async (e: React.FormEvent) => {
  e.preventDefault();

  // 1. Get the authenticated user
  const { data: { user } } = await supabase.auth.getUser();

  if (!user) {
    alert("Please log in first!");
    return;
  }

  // 2. Insert into gear_items
const { error } = await supabase
  .from('gear_items')
  .insert([
    { 
      item_name: itemName, 
      description: description, 
      condition: condition,
      category: category, // Add this line!
      pickup_by: pickupBy || null, 
      return_by: returnBy || null,
      terms: terms,
      location_type: selectedLocation, 
      manual_address: selectedLocation === 'other' ? manualAddress : null,
      user_id: user.id 
    },
  ]);

  if (error) {
    console.error("Supabase Error:", error.message);
    alert("Error: " + error.message);
  } else {
    alert("Success! Your gear is now listed.");
    // Clear the form fields
    setItemName('');
    setDescription('');
    setManualAddress('');
    setTerms('');
    setPickupBy('');
    setReturnBy('');
  }
};

  return (
    <div style={containerStyle}>
      <h1 style={titleStyle}>Offer New Gear</h1>
      
      <form onSubmit={handleSubmit} style={formStyle}>
        {/* ITEM NAME */}
        <div style={sectionStyle}>
          <label style={labelStyle}>Item Name</label>
          <input type="text" value={itemName} onChange={(e) => setItemName(e.target.value)} style={inputStyle} placeholder="e.g. Heavy Duty Tarp" required />
        </div>

{/* CATEGORY DROPDOWN */}
<div style={sectionStyle}>
  <label style={labelStyle}>Category</label>
  <select 
    value={category} 
    onChange={(e) => setCategory(e.target.value)} 
    style={inputStyle} 
    required
  >
    <option value="">-- Select Category --</option>
    <option value="camping">Camping</option>
    <option value="tools">Tools</option>
    <option value="sports">Sports</option>
    <option value="electronics">Electronics</option>
    {/* Add more as needed */}
  </select>
</div>
        {/* CONDITION */}
        <div style={sectionStyle}>
          <label style={labelStyle}>Condition</label>
          <select value={condition} onChange={(e) => setCondition(e.target.value)} style={inputStyle}>
            <option value="new">New / Never Used</option>
            <option value="good">Good (Clean & Functional)</option>
            <option value="fair">Fair (Shows Wear)</option>
            <option value="rough">Rough (Still works, but barely)</option>
          </select>
        </div>

        {/* DESCRIPTION */}
        <div style={sectionStyle}>
          <label style={labelStyle}>Description</label>
          <textarea 
            value={description} 
            onChange={(e) => setDescription(e.target.value)} 
            placeholder="Tell us more about the item..." 
            style={{ ...inputStyle, height: '80px', resize: 'vertical' }} 
          />
        </div>

        {/* AVAILABILITY RADIO BUTTONS */}
        <div style={sectionStyle}>
          <label style={labelStyle}>Availability</label>
          <div style={radioContainerStyle}>
            <label style={radioLabelStyle}>
              <input type="radio" value="keep" checked={availability === 'keep'} onChange={(e) => setAvailability(e.target.value)} />
              You can keep it
            </label>
            <label style={radioLabelStyle}>
              <input type="radio" value="borrow" checked={availability === 'borrow'} onChange={(e) => setAvailability(e.target.value)} />
              You can borrow it
            </label>
            <label style={radioLabelStyle}>
              <input type="radio" value="unavailable" checked={availability === 'unavailable'} onChange={(e) => setAvailability(e.target.value)} />
              Not available - just adding to inventory
          </label>
          </div>
        </div>

        {/* CONDITIONAL: KEEP IT */}
        {availability === 'keep' && (
          <div style={dropdownSectionStyle}>
            <label style={labelStyle}>Must pick up by</label>
            <input type="date" value={pickupBy} onChange={(e) => setPickupBy(e.target.value)} style={inputStyle} required />
          </div>
        )}

        {/* CONDITIONAL: BORROW IT */}
        {availability === 'borrow' && (
          <div style={dropdownSectionStyle}>
            <div style={{ display: 'flex', gap: '10px' }}>
              <div style={{ flex: 1 }}>
                <label style={labelStyle}>Pick up by</label>
                <input type="date" value={pickupBy} onChange={(e) => setPickupBy(e.target.value)} style={inputStyle} required />
              </div>
              <div style={{ flex: 1 }}>
                <label style={labelStyle}>Return by</label>
                <input type="date" value={returnBy} onChange={(e) => setReturnBy(e.target.value)} style={inputStyle} required />
              </div>
            </div>
            <label style={labelStyle}>Loan Terms</label>
            <textarea value={terms} onChange={(e) => setTerms(e.target.value)} placeholder="Terms (e.g. Return it clean!)" style={{ ...inputStyle, height: '60px' }} />
          </div>
        )}

        {/* LOCATION DROPDOWN */}
        <div style={sectionStyle}>
          <label style={labelStyle}>Located At:</label>
          <select value={selectedLocation} onChange={(e) => setSelectedLocation(e.target.value)} style={inputStyle} required>
            <option value="">-- Select a Location --</option>
            {locations.map((loc) => (
              <option key={loc.id} value={loc.id}>{loc.label}</option>
            ))}
            <option value="other">Other (Manual Entry)</option>
          </select>
        </div>

     {selectedLocation === 'other' && (
  <div style={sectionStyle}>
    <input 
      type="text" 
      placeholder="Specify City/State" 
      style={inputStyle} 
      required 
      /* Add these two lines */
      value={manualAddress} 
      onChange={(e) => setManualAddress(e.target.value)} 
    />
  </div>
)}

        <button type="submit" style={buttonStyle}>
          {loading ? 'Loading...' : 'Post Gear'}
        </button>
      </form>
    </div>
  );
}

// --- STYLES ---
const containerStyle = { padding: '40px', maxWidth: '500px', margin: '0 auto', color: '#fff', fontFamily: 'sans-serif' };
const titleStyle = { marginBottom: '20px' };
const formStyle = { display: 'flex', flexDirection: 'column' as const, gap: '20px' };
const sectionStyle = { display: 'flex', flexDirection: 'column' as const, gap: '8px' };
const labelStyle = { fontWeight: 'bold' as const, fontSize: '0.8rem', color: '#aaa' };
const inputStyle = { padding: '12px', borderRadius: '4px', border: '1px solid #333', background: '#111', color: '#fff', width: '100%', boxSizing: 'border-box' as const };
const radioContainerStyle = { display: 'flex', flexDirection: 'column' as const, gap: '10px' };
const radioLabelStyle = { display: 'flex', alignItems: 'center', gap: '8px', cursor: 'pointer' };
const buttonStyle = { padding: '15px', background: '#fff', color: '#000', fontWeight: 'bold' as const, border: 'none', borderRadius: '4px', cursor: 'pointer', marginTop: '10px' };
const dropdownSectionStyle = { backgroundColor: '#1a1a1a', padding: '15px', borderRadius: '8px', borderLeft: '4px solid #fff', display: 'flex', flexDirection: 'column' as const, gap: '10px' };