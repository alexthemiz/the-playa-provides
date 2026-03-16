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
    state: '',
    zip_code: '',
  });

  const [locations, setLocations] = useState<any[]>([]);

  // Account & Security state
  const [newEmail, setNewEmail] = useState('');
  const [emailMsg, setEmailMsg] = useState('');
  const [currentPassword, setCurrentPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [passwordMsg, setPasswordMsg] = useState('');
  const [passwordError, setPasswordError] = useState('');
  const [showDeleteModal, setShowDeleteModal] = useState(false);
  const [deleteStep, setDeleteStep] = useState<'confirm1' | 'deleting' | 'error'>('confirm1');
  const [deleteError, setDeleteError] = useState('');

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

  async function handleUpdateEmail() {
    const { error } = await supabase.auth.updateUser({ email: newEmail });
    if (error) setEmailMsg('Error: ' + error.message);
    else setEmailMsg(`A confirmation link has been sent to ${newEmail}. Click it to complete the change.`);
  }

  async function handleUpdatePassword() {
    if (newPassword !== confirmPassword) {
      setPasswordError('Passwords do not match.');
      return;
    }
    setPasswordError('');
    const { error } = await supabase.auth.updateUser({ password: newPassword });
    if (error) {
      setPasswordMsg('Error: ' + error.message);
    } else {
      setPasswordMsg('Password updated successfully.');
      setCurrentPassword('');
      setNewPassword('');
      setConfirmPassword('');
    }
  }

  async function handleDeleteAccount() {
    setDeleteStep('deleting');
    try {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) throw new Error('No active session');
      const { error } = await supabase.functions.invoke('delete-account', {
        body: { user_id: session.user.id },
      });
      if (error) throw new Error(error.message);
      await supabase.auth.signOut();
      window.location.href = '/?deleted=true';
    } catch (err: any) {
      setDeleteError(err.message || 'Something went wrong.');
      setDeleteStep('error');
    }
  }

  if (loading) return <div style={{ padding: '100px', textAlign: 'center', backgroundColor: 'white', minHeight: '100vh' }}>Syncing...</div>;

  const isOAuthUser = user?.app_metadata?.provider === 'google';

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
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '8px', alignItems: 'start' as const }}>
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
                  <p style={{ ...fieldNoteStyle, visibility: 'hidden' as const }}>placeholder</p>
                  <input
                    style={inputStyle}
                    value={profile.username || ''}
                    onChange={e => { setProfile({ ...profile, username: e.target.value }); setFieldErrors(p => ({ ...p, username: '' })); }}
                  />
                  {fieldErrors.username && <span style={errorStyle}>{fieldErrors.username}</span>}
                </div>
              </div>

              {/* Row 2: Full Name (2/3) + Pronouns (1/3) */}
              <div style={{ display: 'grid', gridTemplateColumns: '2fr 1fr', gap: '8px', alignItems: 'start' as const }}>
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
                  <p style={{ ...fieldNoteStyle, visibility: 'hidden' as const }}>placeholder</p>
                  <input
                    style={inputStyle}
                    value={profile.pronouns || ''}
                    onChange={e => setProfile({ ...profile, pronouns: e.target.value })}
                    placeholder="e.g. she/her"
                  />
                </div>
              </div>

              {/* Row 3: City + State + Zip */}
              <div style={{ display: 'grid', gridTemplateColumns: '3fr 1fr 1fr', gap: '8px' }}>
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
                <div>
                  <label style={labelStyle}>Zip</label>
                  <input style={inputStyle} value={profile.zip_code || ''} onChange={e => setProfile({ ...profile, zip_code: e.target.value })} placeholder="94105" />
                </div>
              </div>

              {/* Row 4: Item Request Email */}
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

          {/* ACCOUNT & SECURITY */}
          {user && (
            <section style={sectionStyle}>
              <h3 style={sectionHeaderStyle}>Account & Security</h3>

              {/* Change Email */}
              <div style={{ paddingBottom: '16px', marginBottom: '16px', borderBottom: '1px solid #eee' }}>
                <h4 style={subHeaderStyle}>Change Email</h4>
                {isOAuthUser ? (
                  <p style={oauthNoteStyle}>You signed in with Google. To change your email, visit your Google account settings.</p>
                ) : (
                  <>
                    <label style={labelStyle}>New Email Address</label>
                    <input style={{ ...inputStyle, marginBottom: '8px' }} type="email" value={newEmail} onChange={e => setNewEmail(e.target.value)} placeholder="new@email.com" />
                    <button onClick={handleUpdateEmail} style={smallButtonStyle}>Update Email</button>
                    {emailMsg && <p style={successMsgStyle}>{emailMsg}</p>}
                  </>
                )}
              </div>

              {/* Change Password */}
              <div style={{ paddingBottom: '16px', marginBottom: '16px', borderBottom: '1px solid #eee' }}>
                <h4 style={subHeaderStyle}>Change Password</h4>
                {isOAuthUser ? (
                  <p style={oauthNoteStyle}>You signed in with Google. Password changes are managed through your Google account settings.</p>
                ) : (
                  <>
                    <div style={{ display: 'grid', gap: '8px', marginBottom: '8px' }}>
                      <div>
                        <label style={labelStyle}>Current Password</label>
                        <input style={inputStyle} type="password" value={currentPassword} onChange={e => setCurrentPassword(e.target.value)} />
                      </div>
                      <div>
                        <label style={labelStyle}>New Password</label>
                        <input style={inputStyle} type="password" value={newPassword} onChange={e => setNewPassword(e.target.value)} />
                      </div>
                      <div>
                        <label style={labelStyle}>Confirm New Password</label>
                        <input style={inputStyle} type="password" value={confirmPassword} onChange={e => setConfirmPassword(e.target.value)} />
                        {passwordError && <span style={errorStyle}>{passwordError}</span>}
                      </div>
                    </div>
                    <button onClick={handleUpdatePassword} style={smallButtonStyle}>Update Password</button>
                    {passwordMsg && <p style={successMsgStyle}>{passwordMsg}</p>}
                  </>
                )}
              </div>

              {/* Delete Account */}
              <div>
                <h4 style={subHeaderStyle}>Delete Account</h4>
                <button onClick={() => setShowDeleteModal(true)} style={deleteButtonStyle}>Delete My Account</button>
              </div>
            </section>
          )}

        </div>
      </div>

      {/* Delete account modal */}
      {showDeleteModal && (
        <div style={{ position: 'fixed' as const, inset: 0, backgroundColor: 'rgba(0,0,0,0.5)', zIndex: 100, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
          <div style={{ backgroundColor: '#fff', padding: '28px 24px', borderRadius: '12px', maxWidth: '360px', width: '90%' }}>

            {deleteStep === 'confirm1' && (
              <>
                <h3 style={{ margin: '0 0 12px', fontSize: '1.1rem', color: '#111' }}>Delete Your Account</h3>
                <p style={{ margin: '0 0 20px', fontSize: '0.9rem', color: '#555', lineHeight: 1.5 }}>
                  Are you sure you want to delete your account? This cannot be undone. All your personal information will be permanently removed.
                </p>
                <div style={{ display: 'flex', gap: '10px' }}>
                  <button
                    onClick={() => { setShowDeleteModal(false); setDeleteStep('confirm1'); }}
                    style={{ flex: 1, padding: '10px', backgroundColor: '#eee', border: 'none', borderRadius: '8px', cursor: 'pointer', fontWeight: 600, fontSize: '0.9rem' }}
                  >
                    Cancel
                  </button>
                  <button
                    onClick={handleDeleteAccount}
                    style={{ flex: 1, padding: '10px', backgroundColor: '#dc2626', color: '#fff', border: 'none', borderRadius: '8px', cursor: 'pointer', fontWeight: 600, fontSize: '0.9rem' }}
                  >
                    Yes, Delete My Account
                  </button>
                </div>
              </>
            )}

            {deleteStep === 'deleting' && (
              <div style={{ textAlign: 'center' as const, padding: '12px 0' }}>
                <p style={{ margin: '0', fontSize: '0.95rem', color: '#555' }}>Deleting your account...</p>
              </div>
            )}

            {deleteStep === 'error' && (
              <>
                <p style={{ margin: '0 0 16px', fontSize: '0.9rem', color: '#dc2626' }}>{deleteError}</p>
                <button
                  onClick={() => { setShowDeleteModal(false); setDeleteStep('confirm1'); setDeleteError(''); }}
                  style={{ width: '100%', padding: '10px', backgroundColor: '#eee', border: 'none', borderRadius: '8px', cursor: 'pointer', fontWeight: 600, fontSize: '0.9rem' }}
                >
                  Close
                </button>
              </>
            )}

          </div>
        </div>
      )}
    </div>
  );
}

const sectionStyle = { border: '1px solid #eee', padding: '14px', borderRadius: '12px', backgroundColor: '#fcfcfc' };
const sectionHeaderStyle = { margin: '0 0 12px 0', fontSize: '16px', fontWeight: 'bold' as const };
const subHeaderStyle = { margin: '0 0 8px', fontSize: '14px', fontWeight: '600' as const, color: '#333' };
const labelStyle = { display: 'block', fontSize: '12px', color: '#333', fontWeight: '600' as const, marginBottom: '3px' };
const fieldNoteStyle = { color: '#999', fontSize: '11px', margin: '0 0 4px', lineHeight: '1.4' as const };
const errorStyle = { display: 'block', color: '#dc2626', fontSize: '11px', marginTop: '3px' } as const;
const oauthNoteStyle = { color: '#888', fontSize: '13px', margin: '0' };
const successMsgStyle = { color: '#16a34a', fontSize: '12px', marginTop: '8px', marginBottom: '0' };
const inputStyle = { width: '100%', padding: '8px 10px', backgroundColor: '#fff', border: '1px solid #ddd', borderRadius: '8px', color: '#111', outline: 'none', boxSizing: 'border-box' as const, fontSize: '0.9rem' };
const buttonStyle = { padding: '14px', backgroundColor: '#00ccff', color: 'black', fontWeight: 'bold' as const, border: 'none', borderRadius: '8px', cursor: 'pointer', width: '100%' };
const smallButtonStyle = { width: '100%', padding: '10px', backgroundColor: '#eee', color: '#333', border: '1px solid #ccc', borderRadius: '6px', cursor: 'pointer', fontSize: '0.85rem' };
const addressCardStyle = { backgroundColor: '#f8f8f8', border: '1px solid #e0e0e0', borderRadius: '10px', padding: '12px', marginBottom: '10px' };
const deleteButtonStyle = { padding: '10px 16px', backgroundColor: '#fff', color: '#dc2626', border: '1px solid #dc2626', borderRadius: '8px', cursor: 'pointer', fontWeight: '600' as const, fontSize: '0.9rem' };
