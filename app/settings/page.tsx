'use client';

import { useState, useEffect } from 'react';
import { supabase } from '@/lib/supabaseClient';
import Link from 'next/link';

const US_STATES = ["", "AL", "AK", "AZ", "AR", "CA", "CO", "CT", "DE", "FL", "GA", "HI", "ID", "IL", "IN", "IA", "KS", "KY", "LA", "ME", "MD", "MA", "MI", "MN", "MS", "MO", "MT", "NE", "NV", "NH", "NJ", "NM", "NY", "NC", "ND", "OH", "OK", "OR", "PA", "RI", "SC", "SD", "TN", "TX", "UT", "VT", "VA", "WA", "WV", "WI", "WY"];

export default function SettingsPage() {
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [user, setUser] = useState<any>(null);
  const [fieldErrors, setFieldErrors] = useState<Record<string, string>>({});

  const [profile, setProfile] = useState<any>({
    full_name: '',
    preferred_name: '',
    username: '',
    pronouns: '',
    contact_email: '',
    bio: '',
    burning_man_years: [],
    burning_man_camp: '',
    city: '',
    state: ''
  });

  const [locations, setLocations] = useState<any[]>([]);

  useEffect(() => {
    async function loadAllData() {
      try {
        const { data: { user: activeUser } } = await supabase.auth.getUser();
        if (activeUser) {
          setUser(activeUser);
          const { data: pData } = await supabase.from('profiles').select('*').eq('id', activeUser.id).maybeSingle();
          if (pData) setProfile({ ...pData });
          const { data: lData } = await supabase.from('locations').select('*').eq('user_id', activeUser.id).order('created_at', { ascending: true });
          if (lData) setLocations(lData);
        }
      } catch (err) {
        console.error('Settings load error:', err);
      } finally {
        setLoading(false);
      }
    }
    loadAllData();
  }, []);

  const addLocation = () => {
    setLocations([...locations, { _isNew: true, label: '', is_default: false, address_line_1: '', city: '', state: '', zip_code: '' }]);
  };

  const updateLocation = (index: number, field: string, value: any) => {
    const newLocs = [...locations];
    newLocs[index][field] = value;
    setLocations(newLocs);
  };

  const setDefaultLocation = (index: number) => {
    setLocations(prev => prev.map((loc, i) => ({ ...loc, is_default: i === index })));
  };

  async function handleSave() {
    const errors: Record<string, string> = {};
    if (!profile.preferred_name?.trim()) errors.preferred_name = 'This field is required.';
    if (!profile.username?.trim()) errors.username = 'This field is required.';
    if (!profile.full_name?.trim()) errors.full_name = 'This field is required.';
    if (Object.keys(errors).length > 0) {
      setFieldErrors(errors);
      return;
    }
    setFieldErrors({});
    setSaving(true);
    if (!user) return;

    const { data: existingUser } = await supabase
      .from('profiles')
      .select('id')
      .eq('username', profile.username.trim())
      .neq('id', user.id)
      .maybeSingle();
    if (existingUser) {
      setFieldErrors({ username: 'This username is already taken.' });
      setSaving(false);
      return;
    }

    const { error: pErr } = await supabase.from('profiles').upsert({ id: user.id, ...profile, updated_at: new Date() });

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

  if (loading) return <div style={{ padding: '100px', textAlign: 'center', backgroundColor: 'white', minHeight: '100vh' }}>Syncing...</div>;

  return (
    <div style={{ backgroundColor: 'white', minHeight: '100vh', width: '100%', color: '#111' }}>
      <div style={{ padding: '20px', maxWidth: '480px', margin: '0 auto', fontFamily: 'sans-serif' }}>

        <Link href="/inventory" style={{ color: '#00ccff', textDecoration: 'none', fontWeight: 'bold' }}>← Back to Inventory</Link>
        <h1 style={{ margin: '12px 0 16px', fontSize: '24px' }}>The Playa Provides<span style={{ textDecoration: 'underline' }}> Account Settings{'\u00a0'}</span></h1>

        <div style={{ display: 'grid', gap: '14px' }}>

          {/* IDENTITY & CONTACT */}
          <section style={sectionStyle}>
            <h3 style={sectionHeaderStyle}>Identity & Contact</h3>
            <div style={{ display: 'grid', gap: '8px' }}>

              {/* Row 1: Preferred Name + Username */}
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '8px' }}>
                <div>
                  <label style={labelStyle}>Preferred Name <span style={{ color: '#999' }}>*</span></label>
                  <p style={fieldNoteStyle}>Burner name, nickname, up to you</p>
                  <input
                    style={inputStyle}
                    value={profile.preferred_name || ''}
                    onChange={e => { setProfile({ ...profile, preferred_name: e.target.value }); setFieldErrors(p => ({ ...p, preferred_name: '' })); }}
                  />
                  {fieldErrors.preferred_name && <span style={errorStyle}>{fieldErrors.preferred_name}</span>}
                </div>
                <div>
                  <label style={labelStyle}>Username <span style={{ color: '#999' }}>*</span></label>
                  <input
                    style={inputStyle}
                    value={profile.username || ''}
                    onChange={e => { setProfile({ ...profile, username: e.target.value }); setFieldErrors(p => ({ ...p, username: '' })); }}
                  />
                  {fieldErrors.username && <span style={errorStyle}>{fieldErrors.username}</span>}
                </div>
              </div>

              {/* Row 2: Full Name (2/3) + Pronouns (1/3) */}
              <div style={{ display: 'grid', gridTemplateColumns: '2fr 1fr', gap: '8px' }}>
                <div>
                  <label style={labelStyle}>Full Name <span style={{ color: '#999' }}>*</span></label>
                  <p style={fieldNoteStyle}>Kept private and never displayed publicly</p>
                  <input
                    style={inputStyle}
                    value={profile.full_name || ''}
                    onChange={e => { setProfile({ ...profile, full_name: e.target.value }); setFieldErrors(p => ({ ...p, full_name: '' })); }}
                  />
                  {fieldErrors.full_name && <span style={errorStyle}>{fieldErrors.full_name}</span>}
                </div>
                <div>
                  <label style={labelStyle}>Pronouns</label>
                  <input
                    style={inputStyle}
                    value={profile.pronouns || ''}
                    onChange={e => setProfile({ ...profile, pronouns: e.target.value })}
                    placeholder="e.g. she/her"
                  />
                </div>
              </div>

              {/* Row 3: Item Request Email */}
              <div>
                <label style={labelStyle}>Item Request Email</label>
                <p style={fieldNoteStyle}>
                  Borrow requests will be sent here instead of your primary account email. This stays hidden until you reply.
                </p>
                <input
                  style={inputStyle}
                  value={profile.contact_email || ''}
                  onChange={e => setProfile({ ...profile, contact_email: e.target.value })}
                  placeholder="e.g. gear-requests@email.com"
                />
              </div>

              {/* Row 4: City + State */}
              <div style={{ display: 'grid', gridTemplateColumns: '2fr 1fr', gap: '8px' }}>
                <div>
                  <label style={labelStyle}>City</label>
                  <input style={inputStyle} value={profile.city || ''} onChange={e => setProfile({ ...profile, city: e.target.value })} placeholder="e.g. San Francisco" />
                </div>
                <div>
                  <label style={labelStyle}>State</label>
                  <select style={inputStyle} value={profile.state || ''} onChange={e => setProfile({ ...profile, state: e.target.value })}>
                    {US_STATES.map(s => <option key={s} value={s}>{s || '—'}</option>)}
                  </select>
                </div>
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
              <div key={index} style={addressCardStyle}>
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '8px', marginBottom: '8px' }}>
                  <input
                    style={inputStyle}
                    placeholder="Label (e.g. Home)"
                    value={loc.label || ''}
                    onChange={e => updateLocation(index, 'label', e.target.value)}
                  />
                  <label style={{ display: 'flex', alignItems: 'center', gap: '6px', fontSize: '0.85rem', color: '#555', cursor: 'pointer' }}>
                    <input
                      type="checkbox"
                      checked={loc.is_default || false}
                      onChange={() => setDefaultLocation(index)}
                      style={{ accentColor: '#00ccff', cursor: 'pointer' }}
                    />
                    Set as default
                  </label>
                </div>
                <input
                  style={{ ...inputStyle, marginBottom: '8px' }}
                  placeholder="Street Address"
                  value={loc.address_line_1 || ''}
                  onChange={e => updateLocation(index, 'address_line_1', e.target.value)}
                />
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

          {/* NOTIFICATIONS */}
          <section style={sectionStyle}>
            <h3 style={sectionHeaderStyle}>Notifications</h3>
            <label style={{ display: 'flex', alignItems: 'flex-start', gap: '10px', cursor: 'pointer' }}>
              <input
                type="checkbox"
                checked={profile.notify_new_items_email || false}
                onChange={e => setProfile({ ...profile, notify_new_items_email: e.target.checked })}
                style={{ marginTop: '2px', accentColor: '#00ccff', cursor: 'pointer', width: '16px', height: '16px' }}
              />
              <div>
                <div style={{ fontSize: '0.9rem', fontWeight: 600, color: '#111' }}>
                  Email me when someone I follow posts a new item
                </div>
                <div style={{ fontSize: '0.8rem', color: '#888', marginTop: '3px', lineHeight: 1.4 }}>
                  Off by default. You can always check the bell icon in the header for in-app notifications.
                </div>
              </div>
            </label>
          </section>

          <button onClick={handleSave} disabled={saving} style={{ ...buttonStyle, marginBottom: '40px' }}>
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
const fieldNoteStyle = { color: '#999', fontSize: '11px', margin: '0 0 4px', lineHeight: '1.4' as const };
const errorStyle = { display: 'block', color: '#dc2626', fontSize: '11px', marginTop: '3px' } as const;
const inputStyle = { width: '100%', padding: '8px 10px', backgroundColor: '#fff', border: '1px solid #ddd', borderRadius: '8px', color: '#111', outline: 'none', boxSizing: 'border-box' as const, fontSize: '0.9rem' };
const buttonStyle = { padding: '14px', backgroundColor: '#00ccff', color: 'black', fontWeight: 'bold' as const, border: 'none', borderRadius: '8px', cursor: 'pointer', width: '100%' };
const smallButtonStyle = { width: '100%', padding: '10px', backgroundColor: '#eee', color: '#333', border: '1px solid #ccc', borderRadius: '6px', cursor: 'pointer', fontSize: '0.85rem' };
const addressCardStyle = { backgroundColor: '#f8f8f8', border: '1px solid #e0e0e0', borderRadius: '10px', padding: '12px', marginBottom: '10px' };
