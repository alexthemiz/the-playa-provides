'use client';

import { useState, useEffect } from 'react';
import { supabase } from '@/lib/supabaseClient';
import Link from 'next/link';

// FIX #1: Move this OUTSIDE the main component so you don't lose focus
const AddressSection = ({ title, type, values, onAddrChange }: any) => (
  <section style={sectionStyle}>
    <h3 style={{ color: '#ff6666', marginTop: 0 }}>{title}</h3>
    <input 
      style={inputStyle} 
      placeholder="Street Address" 
      value={values.street} 
      onChange={e => onAddrChange(type, 'street', e.target.value)} 
    />
    <div style={{ display: 'grid', gridTemplateColumns: '2fr 1fr 1fr', gap: '10px' }}>
      <input style={inputStyle} placeholder="City" value={values.city} onChange={e => onAddrChange(type, 'city', e.target.value)} />
      <input style={inputStyle} placeholder="State" value={values.state} onChange={e => onAddrChange(type, 'state', e.target.value)} />
      <input style={inputStyle} placeholder="Zip" value={values.zip} onChange={e => onAddrChange(type, 'zip', e.target.value)} />
    </div>
  </section>
);

export default function SettingsPage() {
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  
  const [profile, setProfile] = useState({ full_name: '', preferred_name: '', bio: '' });
  const [home, setHome] = useState({ street: '', city: '', state: '', zip: '' });
  const [storage, setStorage] = useState({ street: '', city: '', state: '', zip: '' });
  const [business, setBusiness] = useState({ street: '', city: '', state: '', zip: '' });

  useEffect(() => { fetchData(); }, []);

  async function fetchData() {
    const { data: { user } } = await supabase.auth.getUser();
    if (user) {
      const { data: profileData } = await supabase.from('profiles').select('*').eq('id', user.id).single();
      if (profileData) setProfile(profileData);

      const { data: locs } = await supabase.from('locations').select('*').eq('user_id', user.id);
      if (locs) {
        locs.forEach(loc => {
          const addr = { 
            street: loc.street_address || loc.address_line_1 || '', // Check both columns
            city: loc.city || '', 
            state: loc.state || '', 
            zip: loc.zip_code || '' 
          };
          if (loc.location_type === 'home') setHome(addr);
          if (loc.location_type === 'storage') setStorage(addr);
          if (loc.location_type === 'business') setBusiness(addr);
        });
      }
    }
    setLoading(false);
  }

  const handleAddrChange = (type: string, field: string, value: string) => {
    if (type === 'home') setHome(prev => ({ ...prev, [field]: value }));
    if (type === 'storage') setStorage(prev => ({ ...prev, [field]: value }));
    if (type === 'business') setBusiness(prev => ({ ...prev, [field]: value }));
  };

  async function handleSave() {
    setSaving(true);
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return;

    // FIX #2: Explicitly map street to address_line_1 for backward compatibility
    const locEntries = [
      { user_id: user.id, location_type: 'home', label: 'Home', street_address: home.street, address_line_1: home.street, city: home.city, state: home.state, zip_code: home.zip },
      { user_id: user.id, location_type: 'storage', label: 'Storage Unit', street_address: storage.street, address_line_1: storage.street, city: storage.city, state: storage.state, zip_code: storage.zip },
      { user_id: user.id, location_type: 'business', label: 'Business', street_address: business.street, address_line_1: business.street, city: business.city, state: business.state, zip_code: business.zip },
    ];

    const { error: pErr } = await supabase.from('profiles').upsert({ id: user.id, ...profile, updated_at: new Date() });
    const { error: lErr } = await supabase.from('locations').upsert(locEntries, { onConflict: 'user_id,location_type' });

    if (pErr || lErr) alert("Error saving settings.");
    else alert("Settings updated! ✨");
    setSaving(false);
  }

  if (loading) return <div style={{color: 'white', textAlign: 'center', padding: '50px'}}>Loading...</div>;

  return (
    <div style={{ padding: '40px', maxWidth: '700px', margin: '0 auto', color: 'white', fontFamily: 'sans-serif' }}>
      <Link href="/inventory" style={{ color: '#aaa', textDecoration: 'none' }}>← Back to Inventory</Link>
      <h1 style={{ margin: '20px 0' }}>Account Settings</h1>
      
      <div style={{ display: 'grid', gap: '20px' }}>
        <section style={sectionStyle}>
          <h3 style={{ color: '#888', marginTop: 0 }}>Public Profile</h3>
          <label style={labelStyle}>Preferred Name</label>
          <input style={inputStyle} value={profile.preferred_name} onChange={e => setProfile({...profile, preferred_name: e.target.value})} />
        </section>

        <AddressSection title="Home Address" type="home" values={home} onAddrChange={handleAddrChange} />
        <AddressSection title="Storage Unit" type="storage" values={storage} onAddrChange={handleAddrChange} />
        <AddressSection title="Business / Hub" type="business" values={business} onAddrChange={handleAddrChange} />

        <button onClick={handleSave} disabled={saving} style={buttonStyle}>{saving ? 'Saving...' : 'Save All Changes'}</button>
      </div>
    </div>
  );
}

// Styles (unchanged)
const sectionStyle = { border: '1px solid #333', padding: '20px', borderRadius: '8px', backgroundColor: '#111' };
const labelStyle = { display: 'block', fontSize: '0.8rem', color: '#888', marginBottom: '5px' };
const inputStyle = { width: '100%', padding: '10px', backgroundColor: '#000', border: '1px solid #333', color: 'white', borderRadius: '4px', marginBottom: '10px' };
const buttonStyle = { padding: '15px', background: 'white', color: 'black', fontWeight: 'bold' as 'bold', border: 'none', borderRadius: '4px', cursor: 'pointer' };