'use client';

import { useState, useEffect } from 'react';
import { supabase } from '@/lib/supabaseClient';
import Link from 'next/link';

export default function ListItemPage() {
  const [loading, setLoading] = useState(false);
  const [availability, setAvailability] = useState('Available to borrow');
  const [locations, setLocations] = useState<{id: string, label: string}[]>([]);

  // Fetch saved locations from Supabase on load
  useEffect(() => {
    async function fetchLocations() {
      const { data: { user } } = await supabase.auth.getUser();
      if (user) {
        const { data, error } = await supabase
          .from('locations')
          .select('id, label')
          .eq('user_id', user.id);
        
        if (data) setLocations(data);
        if (error) console.error("Error fetching locations:", error);
      }
    }
    fetchLocations();
  }, []);

  async function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setLoading(true);

    const formData = new FormData(e.currentTarget);
    const { data: { user } } = await supabase.auth.getUser();

    if (!user) {
      alert("You must be logged in!");
      setLoading(false);
      return;
    }

    const { error } = await supabase.from('gear_items').insert([
      {
        user_id: user.id,
        item_name: formData.get('item_name'),
        category: formData.get('category'),
        condition: formData.get('condition'),
        location_id: formData.get('location_id'), // The UUID from the dropdown
        availability_status: availability, 
        description: formData.get('description'),
        pickup_by: formData.get('pickup_by') || null,
        return_by: formData.get('return_by') || null,
        damage_price: formData.get('damage_price') ? parseFloat(formData.get('damage_price') as string) : null,
        loss_price: formData.get('loss_price') ? parseFloat(formData.get('loss_price') as string) : null,
      },
    ]);

    if (error) {
      console.error(error);
      alert("Error saving item: " + error.message);
    } else {
      alert("Item listed successfully!");
      window.location.href = '/inventory';
    }
    setLoading(false);
  }

  return (
    <div style={{ padding: '20px', maxWidth: '600px', margin: '0 auto', color: 'white' }}>
      <Link href="/inventory" style={{ color: '#aaa', textDecoration: 'none' }}>← Back to Inventory Hub</Link>
      <h1 style={{ marginTop: '20px' }}>List New Gear</h1>
      
      <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '20px', marginTop: '30px' }}>
        
        <div style={sectionStyle}>
          <label style={labelStyle}>Item</label>
          <input name="item_name" required placeholder="e.g. Coleman 2-Burner Stove" style={inputStyle} />
        </div>

        <div style={sectionStyle}>
          <label style={labelStyle}>Category</label>
          <select name="category" style={inputStyle}>
            <option>Bikes & Transport</option>
            <option>Kitchen & Cooking</option>
            <option>Lighting & Power</option>
            <option>Safety & First Aid</option>
            <option>Shelter & Shade</option>
            <option>Tools & Hardware</option>
            <option>Water & Graywater</option>
          </select>
        </div>

        <div style={sectionStyle}>
          <label style={labelStyle}>Condition</label>
          <select name="condition" style={inputStyle}>
            <option>New</option>
            <option>Good (Dusty)</option>
            <option>Well Used</option>
            <option>Beaten Up but Works</option>
          </select>
        </div>

        <div style={sectionStyle}>
          <label style={labelStyle}>Description</label>
          <textarea name="description" placeholder="Any special instructions?" style={{ ...inputStyle, minHeight: '80px' }} />
        </div>

        <div style={sectionStyle}>
          <label style={labelStyle}>Located At</label>
          <select name="location_id" style={inputStyle} required>
            <option value="">-- Select a Saved Location --</option>
            {locations.map((loc) => (
              <option key={loc.id} value={loc.id}>
                {loc.label}
              </option>
            ))}
          </select>
          {locations.length === 0 && (
            <p style={{ fontSize: '0.8rem', color: '#ffcc00', marginTop: '5px' }}>
              No locations found. Please add one in Settings first.
            </p>
          )}
        </div>

        <div style={sectionStyle}>
          <label style={labelStyle}>Availability</label>
          <div style={radioContainerStyle}>
            <label style={radioLabelStyle}>
              <input 
                type="radio" 
                value="Available to keep" 
                checked={availability === 'Available to keep'} 
                onChange={(e) => setAvailability(e.target.value)} 
              />
              You can keep it (Gift)
            </label>
            <label style={radioLabelStyle}>
              <input 
                type="radio" 
                value="Available to borrow" 
                checked={availability === 'Available to borrow'} 
                onChange={(e) => setAvailability(e.target.value)} 
              />
              You can borrow it
            </label>
            <label style={radioLabelStyle}>
              <input 
                type="radio" 
                value="Not Available" 
                checked={availability === 'Not Available'} 
                onChange={(e) => setAvailability(e.target.value)} 
              />
              Not available - just add to inventory
            </label>
          </div>

          {availability === 'Available to keep' && (
            <div style={{ marginTop: '15px' }}>
              <label style={labelStyle}>Pick up by</label>
              <input type="date" name="pickup_by" max="2030-12-31" style={inputStyle} />
            </div>
          )}

          {availability === 'Available to borrow' && (
            <div style={{ marginTop: '15px', display: 'flex', flexDirection: 'column', gap: '15px' }}>
              <div style={{ display: 'flex', gap: '10px' }}>
                <div style={{ flex: 1 }}>
                  <label style={labelStyle}>Pick up by</label>
                  <input type="date" name="pickup_by" max="2030-12-31" style={inputStyle} />
                </div>
                <div style={{ flex: 1 }}>
                  <label style={labelStyle}>Return by</label>
                  <input type="date" name="return_by" max="2030-12-31" style={inputStyle} />
                </div>
              </div>
              <div>
                <label style={labelStyle}>If returned damaged, you agree to pay me ($)</label>
                <input type="number" name="damage_price" placeholder="0.00" step="0.01" style={inputStyle} />
              </div>
              <div>
                <label style={labelStyle}>If not returned, you agree to pay me ($)</label>
                <input type="number" name="loss_price" placeholder="0.00" step="0.01" style={inputStyle} />
              </div>
            </div>
          )}
        </div>

        <button 
          type="submit" 
          disabled={loading}
          style={{
            padding: '15px',
            backgroundColor: '#00ccff',
            color: 'black',
            border: 'none',
            borderRadius: '8px',
            fontWeight: 'bold',
            cursor: loading ? 'not-allowed' : 'pointer',
            fontSize: '1rem'
          }}
        >
          {loading ? 'Listing Item...' : 'List Gear Item'}
        </button>
      </form>
    </div>
  );
}

// STYLES
const sectionStyle = { display: 'flex', flexDirection: 'column' as 'column', gap: '8px' };
const labelStyle = { fontSize: '0.9rem', color: '#888', fontWeight: 'bold' };
const inputStyle = { padding: '12px', borderRadius: '8px', border: '1px solid #333', backgroundColor: '#111', color: 'white' };
const radioContainerStyle = { display: 'flex', flexDirection: 'column' as 'column', gap: '10px', background: '#111', padding: '15px', borderRadius: '8px', border: '1px solid #222' };
const radioLabelStyle = { display: 'flex', alignItems: 'center', gap: '10px', cursor: 'pointer', fontSize: '1rem' };