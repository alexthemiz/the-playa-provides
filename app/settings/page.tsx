'use client';

import { useState, useEffect } from 'react';
import { supabase } from '@/lib/supabaseClient';
import Link from 'next/link';

const US_STATES = ["", "AL", "AK", "AZ", "AR", "CA", "CO", "CT", "DE", "FL", "GA", "HI", "ID", "IL", "IN", "IA", "KS", "KY", "LA", "ME", "MD", "MA", "MI", "MN", "MS", "MO", "MT", "NE", "NV", "NH", "NJ", "NM", "NY", "NC", "ND", "OH", "OK", "OR", "PA", "RI", "SC", "SD", "TN", "TX", "UT", "VT", "VA", "WA", "WV", "WI", "WY"];

export default function SettingsPage() {
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [user, setUser] = useState<any>(null);
  
  const [profile, setProfile] = useState<any>({
    full_name: '',
    preferred_name: '',
    username: '',
    contact_email: '',
    phone_number: '',
    bio: '',
    burning_man_years: [],
    burning_man_camp: ''
  });

  const [locations, setLocations] = useState<any[]>([]);

  useEffect(() => {
    async function loadAllData() {
      const { data: { user: activeUser } } = await supabase.auth.getUser();
      
      if (activeUser) {
        setUser(activeUser);
        
        // 1. Fetch Profile
        const { data: pData } = await supabase.from('profiles').select('*').eq('id', activeUser.id).maybeSingle();
        if (pData) setProfile({ ...pData });

        // 2. Fetch Locations
        const { data: lData } = await supabase.from('locations').select('*').eq('user_id', activeUser.id).order('created_at', { ascending: true });
        if (lData) setLocations(lData);
      }
      setLoading(false);
    }
    loadAllData();
  }, []);

  const addLocation = () => {
    setLocations([...locations, { id: crypto.randomUUID(), label: '', location_type: 'Home', address_line_1: '', city: '', state: '', zip_code: '' }]);
  };

  const updateLocation = (index: number, field: string, value: string) => {
    const newLocs = [...locations];
    newLocs[index][field] = value;
    setLocations(newLocs);
  };

  async function handleSave() {
    setSaving(true);
    if (!user) return;

    // Save Profile
    const { error: pErr } = await supabase.from('profiles').upsert({ id: user.id, ...profile, updated_at: new Date() });
    
    // Save Locations (Filter out temporary IDs before sending to Supabase)
    const locationsToSave = locations.map(l => ({
      ...l,
      user_id: user.id,
      id: l.id?.includes('-') && l.id.length > 30 ? undefined : l.id
    }));
    const { error: lErr } = await supabase.from('locations').upsert(locationsToSave);

    if (pErr || lErr) alert("Error saving: " + (pErr?.message || lErr?.message));
    else alert("Settings saved! ✨");
    
    setSaving(false);
  }

  if (loading) return <div style={{padding: '100px', textAlign: 'center', backgroundColor: 'white', minHeight: '100vh'}}>Syncing...</div>;

  return (
    <div style={{ backgroundColor: 'white', minHeight: '100vh', width: '100%', color: '#111' }}>
      <div style={{ padding: '40px 20px', maxWidth: '600px', margin: '0 auto', fontFamily: 'sans-serif' }}>
        
        <Link href="/inventory" style={{ color: '#00ccff', textDecoration: 'none', fontWeight: 'bold' }}>← Back to Inventory</Link>
        <h1 style={{ margin: '24px 0', fontSize: '28px' }}>Account Settings</h1>
        
        <div style={{ display: 'grid', gap: '30px' }}>
          
          {/* IDENTITY SECTION */}
          <section style={sectionStyle}>
            <h3 style={sectionHeaderStyle}>Identity</h3>
            <div style={{ display: 'grid', gap: '15px' }}>
              <div>
                <label style={labelStyle}>Full Name</label>
                <input style={inputStyle} value={profile.full_name || ''} onChange={e => setProfile({...profile, full_name: e.target.value})} />
              </div>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '10px' }}>
                <div>
                  <label style={labelStyle}>Preferred Name</label>
                  <input style={inputStyle} value={profile.preferred_name || ''} onChange={e => setProfile({...profile, preferred_name: e.target.value})} />
                </div>
                <div>
                  <label style={labelStyle}>Username</label>
                  <input style={inputStyle} value={profile.username || ''} onChange={e => setProfile({...profile, username: e.target.value})} />
                </div>
              </div>
              <div>
                <label style={labelStyle}>Phone Number</label>
                <input style={inputStyle} value={profile.phone_number || ''} onChange={e => setProfile({...profile, phone_number: e.target.value})} />
              </div>
            </div>
          </section>

          {/* PRIVACY / CONTACT */}
          <section style={sectionStyle}>
            <h3 style={sectionHeaderStyle}>Privacy & Contact</h3>
            <label style={labelStyle}>Gear Request Email (Optional)</label>
            <input style={inputStyle} value={profile.contact_email || ''} onChange={e => setProfile({...profile, contact_email: e.target.value})} placeholder="e.g. gear-requests@email.com" />
            <p style={{ color: '#666', fontSize: '11px', marginTop: '8px', lineHeight: '1.4' }}>
              Borrow requests will be sent here instead of your primary account email. This stays hidden until you reply.
            </p>
          </section>

          {/* LOCATIONS SECTION */}
          <section style={sectionStyle}>
            <h3 style={sectionHeaderStyle}>My Locations</h3>
            {locations.map((loc, index) => (
              <div key={loc.id || index} style={{ borderBottom: '1px solid #eee', paddingBottom: '20px', marginBottom: '20px' }}>
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '10px', marginBottom: '10px' }}>
                  <input style={inputStyle} placeholder="Label (e.g. Home)" value={loc.label || ''} onChange={e => updateLocation(index, 'label', e.target.value)} />
                  <select style={inputStyle} value={loc.location_type || 'Home'} onChange={e => updateLocation(index, 'location_type', e.target.value)}>
                    <option>Home</option><option>Business</option><option>Storage Unit</option><option>Other</option>
                  </select>
                </div>
                <input style={inputStyle} placeholder="Street Address" value={loc.address_line_1 || ''} onChange={e => updateLocation(index, 'address_line_1', e.target.value)} />
                <div style={{ display: 'grid', gridTemplateColumns: '2fr 1fr 1fr', gap: '10px', marginTop: '10px' }}>
                  <input style={inputStyle} placeholder="City" value={loc.city || ''} onChange={e => updateLocation(index, 'city', e.target.value)} />
                  <select style={inputStyle} value={loc.state || ''} onChange={e => updateLocation(index, 'state', e.target.value)}>
                    {US_STATES.map(s => <option key={s} value={s}>{s || 'State'}</option>)}
                  </select>
                  <input style={inputStyle} placeholder="Zip" value={loc.zip_code || ''} onChange={e => updateLocation(index, 'zip_code', e.target.value)} />
                </div>
              </div>
            ))}
            <button onClick={addLocation} style={smallButtonStyle}>+ Add Another Location</button>
          </section>

          <button onClick={handleSave} disabled={saving} style={buttonStyle}>
            {saving ? 'Saving...' : 'Save All Changes'}
          </button>
        </div>
      </div>
    </div>
  );
}

const sectionStyle = { border: '1px solid #eee', padding: '24px', borderRadius: '12px', backgroundColor: '#fcfcfc' };
const sectionHeaderStyle = { margin: '0 0 20px 0', fontSize: '18px', fontWeight: 'bold' };
const labelStyle = { display: 'block', fontSize: '13px', color: '#333', fontWeight: '600', marginBottom: '6px' };
const inputStyle = { width: '100%', padding: '12px', backgroundColor: '#fff', border: '1px solid #ddd', borderRadius: '8px', color: '#111', outline: 'none' };
const buttonStyle = { padding: '16px', backgroundColor: '#00ccff', color: 'black', fontWeight: 'bold' as 'bold', border: 'none', borderRadius: '8px', cursor: 'pointer' };
const smallButtonStyle = { width: '100%', padding: '12px', backgroundColor: '#eee', color: '#333', border: '1px solid #ccc', borderRadius: '6px', cursor: 'pointer' };