'use client';

import { useState, useEffect } from 'react';
import { supabase } from '@/lib/supabaseClient';
import Link from 'next/link';

const US_STATES = ["", "AL", "AK", "AZ", "AR", "CA", "CO", "CT", "DE", "FL", "GA", "HI", "ID", "IL", "IN", "IA", "KS", "KY", "LA", "ME", "MD", "MA", "MI", "MN", "MS", "MO", "MT", "NE", "NV", "NH", "NJ", "NM", "NY", "NC", "ND", "OH", "OK", "OR", "PA", "RI", "SC", "SD", "TN", "TX", "UT", "VT", "VA", "WA", "WV", "WI", "WY"];

export default function SettingsPage() {
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [userEmail, setUserEmail] = useState(''); 
  
  // Updated state to include "silent" fields from the profile page
  const [profile, setProfile] = useState({ 
    full_name: '', 
    preferred_name: '', 
    username: '',
    contact_email: '',
    bio: '',
    avatar_url: '',
    burning_man_years: [] as string[],
    burning_man_camp: ''
  });
  const [locations, setLocations] = useState<any[]>([]);

  useEffect(() => { fetchData(); }, []);

async function fetchData() {
  try {
    setLoading(true);
    const { data: { user } } = await supabase.auth.getUser();

    if (user) {
      setUserEmail(user.email || '');

      // Fetch Profile
      const { data: profileData } = await supabase
        .from('profiles')
        .select('*')
        .eq('id', user.id)
        .maybeSingle();

      if (profileData) {
        setProfile({
          full_name: profileData.full_name || '',
          preferred_name: profileData.preferred_name || '',
          username: profileData.username || '',
          contact_email: profileData.contact_email || '',
          bio: profileData.bio || '',
          avatar_url: profileData.avatar_url || '',
          burning_man_years: profileData.burning_man_years || [],
          burning_man_camp: profileData.burning_man_camp || ''
        });
      }

      // Fetch Locations
      const { data: locs, error: locError } = await supabase
        .from('locations')
        .select('*')
        .eq('user_id', user.id);
      
      if (locError) console.error("Location fetch error:", locError);
      if (locs) setLocations(locs);
    }
  } catch (err) {
    console.error("Critical error in fetchData:", err);
  } finally {
    // THIS IS THE KEY: It runs even if the code above fails
    setLoading(false); 
  }
}

  const addLocation = () => {
    setLocations([...locations, { 
      id: crypto.randomUUID(), 
      created_at: new Date().toISOString(),
      label: '', 
      location_type: 'Home', 
      address_line_1: '', 
      city: '', 
      state: '', 
      zip_code: '' 
    }]);
  };

  const updateLocation = (index: number, field: string, value: string) => {
    const newLocs = [...locations];
    newLocs[index][field] = value;
    setLocations(newLocs);
  };

  const removeLocation = async (index: number) => {
    const locToDelete = locations[index];
    if (locToDelete.id) {
       const confirmDelete = confirm("Delete this location? This might affect items listed here.");
       if (!confirmDelete) return;
       await supabase.from('locations').delete().eq('id', locToDelete.id);
    }
    setLocations(locations.filter((_, i) => i !== index));
  };

  async function handleSave() {
    setSaving(true);
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return;

    // By spreading ...profile here, we ensure bio/avatar are preserved
    const { error: pErr } = await supabase.from('profiles').upsert({ 
      id: user.id, 
      ...profile, 
      updated_at: new Date() 
    });

    if (pErr) {
      if (pErr.code === '23505') alert("Username is taken!");
      else alert("Error: " + pErr.message);
      setSaving(false);
      return;
    }

    const locationsToSave = locations.map(loc => ({
      ...loc,
      user_id: user.id
    }));

    const { error: lErr } = await supabase.from('locations').upsert(locationsToSave);

    if (lErr) alert("Error saving locations: " + lErr.message);
    else alert("Settings updated! ✨");
    
    setSaving(false);
    fetchData();
  }

  if (loading) return <div style={{color: 'white', textAlign: 'center', padding: '50px'}}>Loading...</div>;

  return (
    <div style={{ padding: '40px', maxWidth: '700px', margin: '0 auto', color: 'white', fontFamily: 'sans-serif' }}>
      <Link href="/inventory" style={{ color: '#aaa', textDecoration: 'none' }}>← Back to Inventory</Link>
      <h1 style={{ margin: '20px 0' }}>Account Settings</h1>
      
      <div style={{ display: 'grid', gap: '30px' }}>
        
        {/* IDENTITY SECTION */}
        <section style={sectionStyle}>
          <h3 style={sectionHeaderStyle}>Identity</h3>
          <div style={{ display: 'grid', gap: '15px' }}>
            <div>
              <label style={labelStyle}>Primary Account Email (Read-only)</label>
              <input style={{...inputStyle, color: '#666', cursor: 'not-allowed'}} value={userEmail} readOnly />
            </div>
            <div>
              <label style={labelStyle}>Full Name (Private)</label>
              <input style={inputStyle} value={profile.full_name} onChange={e => setProfile({...profile, full_name: e.target.value})} placeholder="First Last" />
            </div>
            <div>
              <label style={labelStyle}>Preferred Name (Public)</label>
              <input style={inputStyle} value={profile.preferred_name} onChange={e => setProfile({...profile, preferred_name: e.target.value})} placeholder="e.g. Dusty Star" />
            </div>
            <div>
              <label style={labelStyle}>Username</label>
              <input style={inputStyle} value={profile.username} onChange={e => setProfile({...profile, username: e.target.value.toLowerCase().replace(/\s/g, '')})} placeholder="unique_handle" />
            </div>
          </div>
        </section>

        {/* PRIVACY & CONTACT SECTION */}
        <section style={sectionStyle}>
          <h3 style={sectionHeaderStyle}>Privacy & Contact</h3>
          <div>
            <label style={labelStyle}>Gear Request Email (Optional)</label>
            <input 
              style={inputStyle} 
              type="email"
              value={profile.contact_email} 
              onChange={e => setProfile({...profile, contact_email: e.target.value})} 
              placeholder="e.g. gear-requests@email.com" 
            />
            <p style={{ color: '#666', fontSize: '11px', marginTop: '8px', lineHeight: '1.4' }}>
              If provided, borrow requests will be sent here instead of your primary account email. 
              This email remains hidden from other users until you choose to reply.
            </p>
          </div>
        </section>

        {/* ADDRESS MANAGER */}
        <section style={sectionStyle}>
          <h3 style={sectionHeaderStyle}>My Locations</h3>

          {locations.map((loc, index) => (
            <div key={loc.id || index} style={{ borderBottom: '1px solid #222', paddingBottom: '20px', marginBottom: '20px' }}>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr auto', gap: '10px', marginBottom: '10px' }}>
                <input style={inputStyle} placeholder="Label (e.g. Home)" value={loc.label} onChange={e => updateLocation(index, 'label', e.target.value)} />
                <select style={inputStyle} value={loc.location_type} onChange={e => updateLocation(index, 'location_type', e.target.value)}>
                  <option>Home</option>
                  <option>Business</option>
                  <option>Storage Unit</option>
                  <option>Other</option>
                </select>
                <button onClick={() => removeLocation(index)} style={{ ...smallButtonStyle, backgroundColor: '#ff4444' }}>Delete</button>
              </div>
              <input style={inputStyle} placeholder="Street Address" value={loc.address_line_1} onChange={e => updateLocation(index, 'address_line_1', e.target.value)} />
              <div style={{ display: 'grid', gridTemplateColumns: '2fr 1fr 1fr', gap: '10px', marginTop: '10px' }}>
                <input style={inputStyle} placeholder="City" value={loc.city} onChange={e => updateLocation(index, 'city', e.target.value)} />
                <select style={inputStyle} value={loc.state} onChange={e => updateLocation(index, 'state', e.target.value)}>
                  {US_STATES.map(s => <option key={s} value={s}>{s === '' ? 'State' : s}</option>)}
                </select>
                <input style={inputStyle} placeholder="Zip" value={loc.zip_code} onChange={e => updateLocation(index, 'zip_code', e.target.value)} />
              </div>
            </div>
          ))}

          <button 
            onClick={addLocation} 
            style={{ ...smallButtonStyle, width: '100%', padding: '12px', marginTop: '10px', fontSize: '0.9rem', backgroundColor: '#222' }}
          >
            + Add Another Location
          </button>
        </section>

        <button onClick={handleSave} disabled={saving} style={buttonStyle}>{saving ? 'Saving...' : 'Save All Changes'}</button>
      </div>
    </div>
  );
}

// Styles
const sectionStyle = { border: '1px solid #333', padding: '20px', borderRadius: '8px', backgroundColor: '#111' };
const sectionHeaderStyle = { color: 'white', marginTop: 0, marginBottom: '15px' };
const labelStyle = { display: 'block', fontSize: '0.8rem', color: '#888', marginBottom: '5px' };
const inputStyle = { width: '100%', padding: '10px', backgroundColor: '#000', border: '1px solid #333', color: 'white', borderRadius: '4px', outline: 'none' };
const buttonStyle = { padding: '15px', background: '#00ccff', color: 'black', fontWeight: 'bold' as 'bold', border: 'none', borderRadius: '4px', cursor: 'pointer' };
const smallButtonStyle = { padding: '5px 10px', background: '#333', color: 'white', fontSize: '0.7rem', border: 'none', borderRadius: '4px', cursor: 'pointer' };