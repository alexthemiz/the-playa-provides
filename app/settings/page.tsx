'use client';

import { useState, useEffect } from 'react';
import { supabase } from '@/lib/supabaseClient';
import Link from 'next/link';

export default function SettingsPage() {
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [profile, setProfile] = useState({
    full_name: '',
    burner_name: '',
    city: '',
    state: '',
    zip_code: '',
    street_address: '',
    bio: ''
  });

  // 1. Load the data as soon as the page opens
  useEffect(() => {
    fetchProfile();
  }, []);

  async function fetchProfile() {
    const { data: { user } } = await supabase.auth.getUser();
    
    if (user) {
      const { data, error } = await supabase
        .from('profiles')
        .select('*')
        .eq('id', user.id)
        .single();

      if (data) setProfile(data);
    }
    setLoading(false);
  }

  // 2. Save the data
  async function handleSave() {
    setSaving(true);
    const { data: { user } } = await supabase.auth.getUser();

    if (!user) {
      alert("You must be logged in to save settings.");
      setSaving(false);
      return;
    }

    const { error } = await supabase.from('profiles').upsert({
      id: user.id, // Links the profile to the logged-in user
      ...profile,
      updated_at: new Date(),
    });

    if (error) {
      alert("Error: " + error.message);
    } else {
      alert("Profile updated successfully! ✨");
    }
    setSaving(false);
  }

  if (loading) return <div style={{color: 'white', textAlign: 'center', padding: '50px'}}>Loading your profile...</div>;

  return (
    <div style={{ padding: '40px', maxWidth: '600px', margin: '0 auto', color: 'white', fontFamily: 'sans-serif' }}>
      <Link href="/inventory" style={{ color: '#aaa', textDecoration: 'none' }}>← Back to Inventory</Link>
      
      <h1 style={{ margin: '20px 0' }}>Account Settings</h1>
      
      <div style={{ display: 'grid', gap: '20px' }}>
        {/* PUBLIC INFO */}
        <section style={{ border: '1px solid #333', padding: '20px', borderRadius: '8px' }}>
          <h3 style={{ color: '#888', marginTop: 0 }}>Public Info (Visible on Listings)</h3>
          
          <label style={labelStyle}>Preferred Name or Burner Name</label>
          <input 
            style={inputStyle} 
            value={profile.burner_name || ''} 
            onChange={e => setProfile({...profile, burner_name: e.target.value})} 
          />
          
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '10px', marginTop: '10px' }}>
            <div>
              <label style={labelStyle}>City</label>
              <input style={inputStyle} value={profile.city || ''} onChange={e => setProfile({...profile, city: e.target.value})} />
            </div>
            <div>
              <label style={labelStyle}>State</label>
              <input style={inputStyle} value={profile.state || ''} onChange={e => setProfile({...profile, state: e.target.value})} />
            </div>
          </div>
        </section>

        {/* PRIVATE INFO */}
        <section style={{ border: '1px solid #331111', padding: '20px', borderRadius: '8px', backgroundColor: '#110505' }}>
          <h3 style={{ color: '#ff6666', marginTop: 0 }}>Private Info (Internal Use)</h3>
          
          <label style={labelStyle}>Full Legal Name</label>
          <input style={inputStyle} value={profile.full_name || ''} onChange={e => setProfile({...profile, full_name: e.target.value})} />
          
          <label style={{ ...labelStyle, marginTop: '10px' }}>Street Address</label>
          <input style={inputStyle} value={profile.street_address || ''} onChange={e => setProfile({...profile, street_address: e.target.value})} />
          
          <label style={{ ...labelStyle, marginTop: '10px' }}>Zip Code</label>
          <input style={inputStyle} value={profile.zip_code || ''} onChange={e => setProfile({...profile, zip_code: e.target.value})} />
        </section>

        <button 
          onClick={handleSave} 
          disabled={saving}
          style={{ 
            padding: '15px', 
            background: saving ? '#444' : 'white', 
            color: 'black', 
            fontWeight: 'bold', 
            border: 'none', 
            borderRadius: '4px', 
            cursor: saving ? 'not-allowed' : 'pointer' 
          }}
        >
          {saving ? 'Saving...' : 'Save All Changes'}
        </button>
      </div>
    </div>
  );
}

const labelStyle = { display: 'block', fontSize: '0.8rem', color: '#888', marginBottom: '5px' };
const inputStyle = { width: '100%', padding: '10px', backgroundColor: '#000', border: '1px solid #333', color: 'white', borderRadius: '4px', boxSizing: 'border-box' as 'border-box' };