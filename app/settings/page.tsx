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
    burning_man_camp: '',
    city: '',
    state: ''
  });

  const [locations, setLocations] = useState<any[]>([]);

  useEffect(() => {
    async function loadAllData() {
      const { data: { user: activeUser } } = await supabase.auth.getUser();

      if (activeUser) {
        setUser(activeUser);

        const { data: pData } = await supabase.from('profiles').select('*').eq('id', activeUser.id).maybeSingle();
        if (pData) setProfile({ ...pData });

        const { data: lData } = await supabase.from('locations').select('*').eq('user_id', activeUser.id).order('created_at', { ascending: true });
        if (lData) setLocations(lData);
      }
      setLoading(false);
    }
    loadAllData();
  }, []);

  const addLocation = () => {
    // _isNew flag lets handleSave know to omit the id (let DB generate it)
    setLocations([...locations, { _isNew: true, label: '', location_type: 'Home', address_line_1: '', city: '', state: '', zip_code: '' }]);
  };

  const updateLocation = (index: number, field: string, value: string) => {
    const newLocs = [...locations];
    newLocs[index][field] = value;
    setLocations(newLocs);
  };

  async function handleSave() {
    setSaving(true);
    if (!user) return;

    const { error: pErr } = await supabase.from('profiles').upsert({ id: user.id, ...profile, updated_at: new Date() });

    // New locations get insert (no id), existing get upsert (with id)
    const newLocs = locations
      .filter(l => l._isNew)
      .map(({ _isNew, id, ...rest }) => ({ ...rest, user_id: user.id }));
    const existingLocs = locations
      .filter(l => !l._isNew)
      .map(({ _isNew, ...rest }) => ({ ...rest, user_id: user.id }));

    const { error: iErr } = newLocs.length > 0
      ? await supabase.from('locations').insert(newLocs)
      : { error: null };
    const { error: uErr } = existingLocs.length > 0
      ? await supabase.from('locations').upsert(existingLocs)
      : { error: null };
    const lErr = iErr || uErr;

    if (pErr || lErr) alert("Error saving: " + (pErr?.message || lErr?.message));
    else alert("Settings saved!");

    setSaving(false);
  }

  if (loading) return <div style={{padding: '100px', textAlign: 'center', backgroundColor: 'white', minHeight: '100vh'}}>Syncing...</div>;

  return (
    <div style={{ backgroundColor: 'white', minHeight: '100vh', width: '100%', color: '#111' }}>
      <div style={{ padding: '20px', maxWidth: '480px', margin: '0 auto', fontFamily: 'sans-serif' }}>

        <Link href="/inventory" style={{ color: '#00ccff', textDecoration: 'none', fontWeight: 'bold' }}>← Back to Inventory</Link>
        <h1 style={{ margin: '12px 0 16px', fontSize: '24px' }}>Account Settings</h1>

        <div style={{ display: 'grid', gap: '14px' }}>

          {/* IDENTITY */}
          <section style={sectionStyle}>
            <h3 style={sectionHeaderStyle}>Identity</h3>
            <div style={{ display: 'grid', gap: '8px' }}>
              <div>
                <label style={labelStyle}>Full Name</label>
                <input style={inputStyle} value={profile.full_name || ''} onChange={e => setProfile({...profile, full_name: e.target.value})} />
              </div>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '8px' }}>
                <div>
                  <label style={labelStyle}>Preferred Name</label>
                  <input style={inputStyle} value={profile.preferred_name || ''} onChange={e => setProfile({...profile, preferred_name: e.target.value})} />
                </div>
                <div>
                  <label style={labelStyle}>Username</label>
                  <input style={inputStyle} value={profile.username || ''} onChange={e => setProfile({...profile, username: e.target.value})} />
                </div>
              </div>
              <div style={{ display: 'grid', gridTemplateColumns: '2fr 1fr', gap: '8px' }}>
                <div>
                  <label style={labelStyle}>City <span style={{ fontWeight: 'normal', color: '#999' }}>(optional)</span></label>
                  <input style={inputStyle} value={profile.city || ''} onChange={e => setProfile({...profile, city: e.target.value})} placeholder="e.g. San Francisco" />
                </div>
                <div>
                  <label style={labelStyle}>State</label>
                  <select style={inputStyle} value={profile.state || ''} onChange={e => setProfile({...profile, state: e.target.value})}>
                    {US_STATES.map(s => <option key={s} value={s}>{s || '—'}</option>)}
                  </select>
                </div>
              </div>
            </div>
          </section>

          {/* PRIVACY / CONTACT */}
          <section style={sectionStyle}>
            <h3 style={sectionHeaderStyle}>Privacy & Contact</h3>
            <div style={{ display: 'grid', gap: '8px' }}>
              <div>
                <label style={labelStyle}>Phone <span style={{ fontWeight: 'normal', color: '#999' }}>(optional)</span></label>
                <input style={inputStyle} value={profile.phone_number || ''} onChange={e => setProfile({...profile, phone_number: e.target.value})} />
              </div>
              <div>
                <label style={labelStyle}>Gear Request Email <span style={{ fontWeight: 'normal', color: '#999' }}>(optional)</span></label>
                <p style={{ color: '#666', fontSize: '11px', margin: '2px 0 6px', lineHeight: '1.4' }}>
                  Borrow requests will be sent here instead of your primary account email. This stays hidden until you reply.
                </p>
                <input style={inputStyle} value={profile.contact_email || ''} onChange={e => setProfile({...profile, contact_email: e.target.value})} placeholder="e.g. gear-requests@email.com" />
              </div>
            </div>
          </section>

          {/* LOCATIONS */}
          <section style={sectionStyle}>
            <h3 style={sectionHeaderStyle}>Locations of Your Items</h3>
            <p style={{ color: '#666', fontSize: '12px', marginBottom: '12px', lineHeight: '1.5' }}>
              These addresses will appear as options to select when adding items to your inventory.
            </p>
            {locations.map((loc, index) => (
              <div key={index} style={{ borderBottom: '1px solid #bbb', paddingBottom: '12px', marginBottom: '12px' }}>
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '8px', marginBottom: '8px' }}>
                  <input style={inputStyle} placeholder="Label (e.g. Home)" value={loc.label || ''} onChange={e => updateLocation(index, 'label', e.target.value)} />
                  <select style={inputStyle} value={loc.location_type || 'Home'} onChange={e => updateLocation(index, 'location_type', e.target.value)}>
                    <option>Home</option><option>Business</option><option>Storage Unit</option><option>Other</option>
                  </select>
                </div>
                <input style={{ ...inputStyle, marginBottom: '8px' }} placeholder="Street Address" value={loc.address_line_1 || ''} onChange={e => updateLocation(index, 'address_line_1', e.target.value)} />
                <div style={{ display: 'grid', gridTemplateColumns: '2fr 1fr 1fr', gap: '8px' }}>
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

const sectionStyle = { border: '1px solid #eee', padding: '14px', borderRadius: '12px', backgroundColor: '#fcfcfc' };
const sectionHeaderStyle = { margin: '0 0 12px 0', fontSize: '16px', fontWeight: 'bold' as const };
const labelStyle = { display: 'block', fontSize: '12px', color: '#333', fontWeight: '600' as const, marginBottom: '3px' };
const inputStyle = { width: '100%', padding: '8px 10px', backgroundColor: '#fff', border: '1px solid #ddd', borderRadius: '8px', color: '#111', outline: 'none', boxSizing: 'border-box' as const, fontSize: '0.9rem' };
const buttonStyle = { padding: '14px', backgroundColor: '#00ccff', color: 'black', fontWeight: 'bold' as const, border: 'none', borderRadius: '8px', cursor: 'pointer', width: '100%' };
const smallButtonStyle = { width: '100%', padding: '10px', backgroundColor: '#eee', color: '#333', border: '1px solid #ccc', borderRadius: '6px', cursor: 'pointer', fontSize: '0.85rem' };
