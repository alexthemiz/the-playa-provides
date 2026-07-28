'use client';

import { useState, useEffect } from 'react';
import { supabase } from '@/lib/supabaseClient';
import { geocodeZip } from '@/lib/geocodeZip';
import { Camera, X } from 'lucide-react';

const INK      = '#1C1610';
const INK_MID  = '#4A3828';
const INK_LITE = '#9A8878';
const PAPER_DK = '#EDE5D0';
const PAPER_LT = '#FDFAF4';
const TEAL     = '#1E8A82';

const US_STATES = ["", "AL", "AK", "AZ", "AR", "CA", "CO", "CT", "DC", "DE", "FL", "GA", "HI", "ID", "IL", "IN", "IA", "KS", "KY", "LA", "ME", "MD", "MA", "MI", "MN", "MS", "MO", "MT", "NE", "NV", "NH", "NJ", "NM", "NY", "NC", "ND", "OH", "OK", "OR", "PA", "RI", "SC", "SD", "TN", "TX", "UT", "VT", "VA", "WA", "WV", "WI", "WY"];

const CATEGORIES = [
  "Bikes & Transport",
  "Clothing & Fun",
  "Kitchen & Water",
  "Power & Lighting",
  "Safety & First Aid",
  "Shelter & Shade",
  "Tools & Hardware",
  "Miscellaneous"
];

const CONDITIONS = ["New / Like New", "Good", "Well-Used", "Rough but Works", "Fixer-Upper"];

interface Location { id: string; label: string; }

export default function AddItemModal({
  onClose,
  onSuccess,
  itemToEdit
}: {
  onClose: () => void;
  onSuccess: () => void;
  itemToEdit?: any;
}) {
  const [loading, setLoading] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [availability, setAvailability] = useState('Available to Borrow');
  const [visibility, setVisibility] = useState('public');
  const [locations, setLocations] = useState<Location[]>([]);
  const [selectedLocationId, setSelectedLocationId] = useState('');
  const [newLocData, setNewLocData] = useState({ label: '', address_line_1: '', city: '', state: '', zip_code: '' });
  const [imageUrls, setImageUrls] = useState<string[]>([]);
  const [returnTerms, setReturnTerms] = useState('');
  const [confirmDelete, setConfirmDelete] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const [followingIds, setFollowingIds] = useState<string[]>([]);
  const [campMateIds, setCampMateIds] = useState<string[]>([]);
  const [campDataLoaded, setCampDataLoaded] = useState(false);
  const [toast, setToast] = useState<{ message: string; isError?: boolean } | null>(null);

  function showToast(message: string, isError = false) {
    setToast({ message, isError });
    setTimeout(() => setToast(null), 3000);
  }

  useEffect(() => {
    async function fetchLocations() {
      const { data: { user } } = await supabase.auth.getUser();
      if (user) {
        const { data } = await supabase.from('locations').select('id, label, is_default').eq('user_id', user.id);
        if (data) {
          setLocations(data);
          if (!itemToEdit) {
            if (data.length === 0) {
              setSelectedLocationId('__new__');
            } else {
              const defaultLoc = data.find((l: any) => l.is_default);
              if (defaultLoc) setSelectedLocationId(defaultLoc.id);
            }
          }
        }
        const [followingRes, campRes] = await Promise.all([
          supabase.from('user_follows').select('following_id').eq('follower_id', user.id),
          supabase.from('user_camp_affiliations').select('camp_id').eq('user_id', user.id).not('camp_id', 'is', null),
        ]);
        setFollowingIds((followingRes.data || []).map((r: any) => r.following_id));
        const myCampIds = (campRes.data || []).map((r: any) => r.camp_id).filter(Boolean);
        if (myCampIds.length > 0) {
          const { data: campMembers } = await supabase.from('user_camp_affiliations').select('user_id').in('camp_id', myCampIds).neq('user_id', user.id);
          setCampMateIds([...new Set((campMembers || []).map((r: any) => r.user_id))]);
        }
        setCampDataLoaded(true);
      }
    }
    fetchLocations();

    if (itemToEdit) {
      setAvailability(itemToEdit.availability_status || 'Available to Borrow');
      setVisibility(itemToEdit.visibility || 'public');
      setSelectedLocationId(itemToEdit.location_id || '');
      setImageUrls(itemToEdit.image_urls || []);
      setReturnTerms(itemToEdit.return_terms || '');
    }
  }, [itemToEdit]);

  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(e.target.files || []);
    if (files.length === 0) return;
    if (files.length + imageUrls.length > 4) { showToast("Max 4 photos total.", true); return; }

    setUploading(true);
    const currentPhotos = [...imageUrls];
    try {
      for (const file of files) {
        const fileExt = file.name.split('.').pop();
        const filePath = `items/${Math.random()}.${fileExt}`;
        const { error: uploadError } = await supabase.storage.from('gear-photos').upload(filePath, file);
        if (uploadError) { console.error("Upload error:", uploadError); continue; }
        const { data } = supabase.storage.from('gear-photos').getPublicUrl(filePath);
        currentPhotos.push(data.publicUrl);
      }
      setImageUrls(currentPhotos);
    } finally {
      setUploading(false);
      e.target.value = "";
    }
  };

  async function handleDeleteItem() {
    if (!itemToEdit) return;
    setDeleting(true);
    try {
      if (itemToEdit.image_urls?.length) {
        const paths = itemToEdit.image_urls.map((url: string) => {
          const parts = url.split('/gear-photos/');
          return parts.length > 1 ? parts[1] : null;
        }).filter(Boolean);
        if (paths.length) await supabase.storage.from('gear-photos').remove(paths);
      }
      const { error } = await supabase.from('gear_items').delete().eq('id', itemToEdit.id);
      if (error) throw error;
      onSuccess();
    } catch (err: any) {
      console.error('Delete error:', err.message);
    } finally {
      setDeleting(false);
    }
  }

  async function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setLoading(true);
    const formData = new FormData(e.currentTarget);
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) { setLoading(false); return; }

    // If user is adding a new location inline, insert it first
    let resolvedLocationId: string | null = selectedLocationId || null;
    if (selectedLocationId === '__new__') {
      if (!newLocData.label) { showToast("Please give your new location a label (e.g. Home).", true); setLoading(false); return; }
      const coords = await geocodeZip(newLocData.zip_code);
      const { data: newLoc, error: locErr } = await supabase
        .from('locations')
        .insert({ ...newLocData, user_id: user.id, ...(coords ?? {}) })
        .select('id')
        .single();
      if (locErr || !newLoc) { showToast(`Error saving location: ${locErr?.message}`, true); setLoading(false); return; }
      resolvedLocationId = newLoc.id;
      setLocations(prev => [...prev, { id: newLoc.id, label: newLocData.label }]);
    }

    const payload = {
      item_name: formData.get('item_name'),
      category: formData.get('category'),
      condition: formData.get('condition'),
      location_id: resolvedLocationId,
      availability_status: availability,
      visibility: availability === 'Not Available' ? 'private' : visibility,
      description: formData.get('description'),
      return_by: formData.get('return_by') || null,
      damage_price: formData.get('damage_price') ? parseInt(formData.get('damage_price') as string, 10) : null,
      loss_price: formData.get('loss_price') ? parseInt(formData.get('loss_price') as string, 10) : null,
      image_urls: imageUrls,
      return_terms: returnTerms || null,
    };

    const { error } = itemToEdit
      ? await supabase.from('gear_items').update(payload).eq('id', itemToEdit.id)
      : await supabase.from('gear_items').insert([{ ...payload, user_id: user.id }]);

    if (error) showToast("Error: " + error.message, true);
    else onSuccess();
    setLoading(false);
  }

  return (
    <div style={overlayStyle} onClick={onClose}>
      <div style={modalStyle} onClick={e => e.stopPropagation()}>

        {/* HEADER BAND */}
        <div style={headerBandStyle}>
          <h2 style={headerTitleStyle}>
            {itemToEdit ? <>Edit <em style={{ fontStyle: 'italic', color: TEAL }}>Item.</em></> : <>Add New <em style={{ fontStyle: 'italic', color: TEAL }}>Gear.</em></>}
          </h2>
          <button onClick={onClose} aria-label="Close" style={closeBtnStyle}>
            <X style={{ width: '16px', height: '16px' }} />
          </button>
        </div>

        <div style={{ padding: '20px' }}>
          <form onSubmit={handleSubmit} style={formStyle}>

            {/* BOX 1: Item details + photos */}
            <div style={formBoxStyle}>

              {/* ITEM NAME */}
              <div style={sectionStyle}>
                <label style={labelStyle}>Item Name</label>
                <input name="item_name" defaultValue={itemToEdit?.item_name} required placeholder="e.g. Coleman 2-Burner Stove" style={inputStyle} />
              </div>

              {/* CATEGORY + CONDITION + STORED AT */}
              <div style={{ display: 'grid', gridTemplateColumns: '3fr 2fr 2fr', gap: '10px' }}>
                <div style={sectionStyle}>
                  <label style={labelStyle}>Category</label>
                  <select name="category" defaultValue={itemToEdit?.category} style={inputStyle}>
                    {CATEGORIES.map(cat => <option key={cat}>{cat}</option>)}
                  </select>
                </div>
                <div style={sectionStyle}>
                  <label style={labelStyle}>Condition</label>
                  <select name="condition" defaultValue={itemToEdit?.condition} style={inputStyle}>
                    {CONDITIONS.map(c => <option key={c}>{c}</option>)}
                  </select>
                </div>
                <div style={sectionStyle}>
                  <label style={labelStyle}>Stored At</label>
                  <select value={selectedLocationId} onChange={e => setSelectedLocationId(e.target.value)} style={inputStyle} required>
                    <option value="" disabled>— Location —</option>
                    {locations.map(loc => <option key={loc.id} value={loc.id}>{loc.label}</option>)}
                    <option value="__new__">+ Add new location</option>
                  </select>
                </div>
              </div>

              {selectedLocationId === '__new__' && (
                <div style={newLocBoxStyle}>
                  <p style={newLocHeadingStyle}>New Location — saved to your settings</p>
                  <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '8px' }}>
                    <input style={inputStyle} placeholder="Label (e.g. Home)" value={newLocData.label} onChange={e => setNewLocData({ ...newLocData, label: e.target.value })} />
                    <input style={inputStyle} placeholder="Street Address" value={newLocData.address_line_1} onChange={e => setNewLocData({ ...newLocData, address_line_1: e.target.value })} />
                  </div>
                  <div style={{ display: 'grid', gridTemplateColumns: '2fr 1fr 1fr', gap: '8px' }}>
                    <input style={inputStyle} placeholder="City" value={newLocData.city} onChange={e => setNewLocData({ ...newLocData, city: e.target.value })} />
                    <select style={inputStyle} value={newLocData.state} onChange={e => setNewLocData({ ...newLocData, state: e.target.value })}>
                      {US_STATES.map(s => <option key={s} value={s}>{s || 'State'}</option>)}
                    </select>
                    <input style={inputStyle} placeholder="Zip" value={newLocData.zip_code} onChange={e => setNewLocData({ ...newLocData, zip_code: e.target.value })} />
                  </div>
                </div>
              )}

              {/* DESCRIPTION */}
              <div style={sectionStyle}>
                <label style={labelStyle}>Description</label>
                <textarea name="description" defaultValue={itemToEdit?.description} placeholder="Details and specs, existing damage, any other useful information" style={{ ...inputStyle, minHeight: '80px' }} />
              </div>

              {/* PHOTOS */}
              <div style={sectionStyle}>
                <label style={labelStyle}>Photos (Max 4)</label>
                <div style={{ display: 'flex', gap: '10px', flexWrap: 'wrap' as const }}>
                  <input type="file" accept="image/*" multiple onChange={handleFileUpload} disabled={uploading} style={{ display: 'none' }} id="modal-file-upload" />
                  <label htmlFor="modal-file-upload" style={photoPlaceholderStyle}>
                    <Camera size={22} />
                    <span>{uploading ? 'Uploading...' : 'Add photos'}</span>
                  </label>
                  {imageUrls.map((url, i) => (
                    <div key={url + i} style={{ position: 'relative' as const }}>
                      <img src={url} alt="Preview" style={photoPreviewStyle} />
                      <button type="button" onClick={() => setImageUrls(imageUrls.filter((_, idx) => idx !== i))} style={removePhotoBtnStyle}>✕</button>
                    </div>
                  ))}
                </div>
              </div>

            </div>

            {/* BOX 2: Availability + visibility + lending terms */}
            <div style={formBoxStyle}>

              {/* AVAILABILITY */}
              <div style={sectionStyle}>
                <label style={labelStyle}>Availability</label>
                <div style={radioGroupStyle}>
                  {[
                    { id: 'Available to Borrow', label: 'Lend It',      sub: 'Set your terms below' },
                    { id: 'Available to Keep',   label: 'Gift It',      sub: 'Give the item away' },
                    { id: 'Not Available',       label: 'Keep Private', sub: 'Add to your inventory' },
                  ].map(status => (
                    <label key={status.id} style={{
                      ...radioLabelStyle,
                      border: availability === status.id ? '2px solid #1E8A82' : '1px solid #eee',
                      backgroundColor: availability === status.id ? '#f0fbff' : '#fff',
                    }}>
                      <input type="radio" value={status.id} checked={availability === status.id} onChange={e => setAvailability(e.target.value)} style={{ display: 'none' }} />
                      <div>
                        <div style={{ fontWeight: 'bold', color: INK, fontSize: '13px' }}>{status.label}</div>
                        <div style={{ fontSize: '11px', color: INK_LITE }}>{status.sub}</div>
                      </div>
                    </label>
                  ))}
                </div>
              </div>

              {/* VISIBILITY — only shown when item is available */}
              {availability !== 'Not Available' && (
                <div style={sectionStyle}>
                  <label style={labelStyle}>Who can view this item</label>
                  {campDataLoaded && campMateIds.length === 0 && (
                    <p style={hintStyle}>Add your camp history <a href="/settings" target="_blank" rel="noreferrer" style={{ color: TEAL, fontWeight: 600, textDecoration: 'none' }}>to your profile</a> to unlock campmates-only sharing</p>
                  )}
                  <select
                    value={visibility}
                    onChange={e => setVisibility(e.target.value)}
                    style={inputStyle}
                  >
                    <option value="public">Everyone</option>
                    <option
                      value="followers"
                      disabled={followingIds.length === 0}
                      style={{ color: followingIds.length === 0 ? '#bbb' : 'inherit' }}
                      title={followingIds.length === 0 ? 'Follow users to unlock this' : undefined}
                    >People you follow</option>
                    <option
                      value="campmates"
                      disabled={campMateIds.length === 0}
                      style={{ color: campMateIds.length === 0 ? '#bbb' : 'inherit' }}
                      title={campMateIds.length === 0 ? 'Add a camp to your profile to unlock this' : undefined}
                    >Campmates only</option>
                    <option
                      value="followers_and_campmates"
                      disabled={followingIds.length === 0 || campMateIds.length === 0}
                      style={{ color: followingIds.length === 0 || campMateIds.length === 0 ? '#bbb' : 'inherit' }}
                      title={followingIds.length === 0 || campMateIds.length === 0 ? 'Follow users or join a camp to unlock this' : undefined}
                    >Following &amp; Campmates</option>
                  </select>
                </div>
              )}

              {/* LENDING TERMS */}
              {availability === 'Available to Borrow' && (
                <div style={sectionStyle}>
                  <label style={labelStyle}>Lending Terms</label>
                  <p style={hintStyle}>Optional but encouraged — set expectations upfront to avoid issues later.</p>
                  <div style={unifiedBoxStyle}>
                    <style>{`
                      .terms-tray { display: flex; gap: 10px; }
                      .tray-money { display: flex; gap: 10px; flex: 2; min-width: 0; }
                      .tray-money > div { flex: 1; min-width: 0; }
                      .lbl-mobile { display: none; }
                      @media (max-width: 940px) {
                        .terms-tray { flex-direction: column; gap: 14px; }
                        .lbl-desktop { display: none; }
                        .lbl-mobile { display: inline; }
                        .tray-return-labelrow { display: flex; align-items: baseline; gap: 8px; }
                      }
                    `}</style>
                    <div style={{ ...trayLabelStyle, padding: '12px 14px 0' }}>Return Instructions</div>
                    <textarea
                      placeholder="Please remove dust, no modifications, etc."
                      style={{ ...unifiedTextareaStyle, paddingTop: '6px' }}
                      value={returnTerms}
                      onChange={e => setReturnTerms(e.target.value)}
                    />
                    <div style={trayStyle} className="terms-tray">
                      <div style={trayItemStyle}>
                        <div className="tray-return-labelrow">
                          <div style={trayLabelStyle}>
                            <span className="lbl-desktop">Return by</span>
                            <span className="lbl-mobile">Return Date</span>
                          </div>
                          <div style={trayHintStyle}>Gear must be back by:</div>
                        </div>
                        <input type="date" name="return_by" defaultValue={itemToEdit?.return_by} style={trayInputStyle} />
                      </div>
                      <div className="tray-money">
                        <div>
                          <div style={trayLabelStyle}>If Damaged</div>
                          <div style={trayHintStyle}>Borrower pays:</div>
                          <div style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
                            <span style={{ fontSize: '13px', color: INK_LITE, fontWeight: 600 }}>$</span>
                            <input type="number" name="damage_price" defaultValue={itemToEdit?.damage_price} placeholder="0" style={{ ...trayInputStyle, flex: 1, width: 0 }} />
                          </div>
                        </div>
                        <div>
                          <div style={trayLabelStyle}>If Not Returned</div>
                          <div style={trayHintStyle}>Borrower pays:</div>
                          <div style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
                            <span style={{ fontSize: '13px', color: INK_LITE, fontWeight: 600 }}>$</span>
                            <input type="number" name="loss_price" defaultValue={itemToEdit?.loss_price} placeholder="0" style={{ ...trayInputStyle, flex: 1, width: 0 }} />
                          </div>
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
              )}

            </div>

            <button type="submit" disabled={loading || uploading} style={submitBtnStyle}>
              {uploading ? 'Uploading...' : loading ? 'Saving...' : itemToEdit ? 'Save Changes' : 'Add Your Item'}
            </button>

            {itemToEdit && (
              <div style={{ display: 'flex', justifyContent: 'center', marginTop: '8px' }}>
                <button type="button" onClick={() => setConfirmDelete(true)} style={deleteItemBtnStyle}>
                  Delete this item
                </button>
              </div>
            )}
          </form>
        </div>
      </div>

      {confirmDelete && (
        <div style={deleteOverlayStyle}>
          <div style={deleteModalStyle}>
            <p style={{ margin: '0 0 20px 0', fontSize: '15px', color: '#1C1610', lineHeight: 1.5 }}>
              Are you sure you want to delete this item? This cannot be undone.
            </p>
            <div style={{ display: 'flex', gap: '10px', justifyContent: 'flex-end' }}>
              <button onClick={() => setConfirmDelete(false)} style={cancelBtnStyle}>Cancel</button>
              <button onClick={handleDeleteItem} disabled={deleting} style={confirmDeleteBtnStyle}>
                {deleting ? 'Deleting...' : 'Delete Item'}
              </button>
            </div>
          </div>
        </div>
      )}

      {toast && (
        <div style={{
          position: 'fixed' as const,
          bottom: '24px',
          left: '50%',
          transform: 'translateX(-50%)',
          backgroundColor: toast.isError ? '#dc2626' : '#1C1610',
          color: '#fff',
          padding: '12px 24px',
          borderRadius: '8px',
          fontSize: '0.9rem',
          fontWeight: 600,
          zIndex: 9999,
          boxShadow: '0 4px 12px rgba(0,0,0,0.2)',
          whiteSpace: 'nowrap' as const,
        }}>
          {toast.message}
        </div>
      )}
    </div>
  );
}

// --- STYLES ---
const overlayStyle: React.CSSProperties = {
  position: 'fixed', inset: 0, backgroundColor: 'rgba(28,22,16,0.6)', backdropFilter: 'blur(3px)',
  zIndex: 1000, display: 'flex', justifyContent: 'center', alignItems: 'flex-start',
  overflowY: 'auto' as const, padding: '20px 16px', cursor: 'pointer',
};
const modalStyle: React.CSSProperties = {
  backgroundColor: PAPER_LT, maxWidth: '580px', width: '100%',
  border: `2px solid ${INK}`, boxShadow: `6px 6px 0 ${INK}`,
  marginBottom: '24px', cursor: 'default',
};
const headerBandStyle: React.CSSProperties = {
  display: 'flex', justifyContent: 'space-between', alignItems: 'center',
  padding: '18px 20px', backgroundColor: PAPER_DK, borderBottom: `2px solid ${INK}`,
};
const headerTitleStyle: React.CSSProperties = { fontFamily: "'Arvo', serif", fontSize: '1.3rem', fontWeight: 900, color: INK, margin: 0, lineHeight: 1.1 };
const closeBtnStyle: React.CSSProperties = {
  padding: '6px', background: PAPER_LT, border: `1.5px solid rgba(28,22,16,0.2)`,
  cursor: 'pointer', display: 'flex', color: INK_MID, flexShrink: 0,
};
const formStyle: React.CSSProperties = { display: 'flex', flexDirection: 'column' as const, gap: '12px' };
const formBoxStyle: React.CSSProperties = { backgroundColor: PAPER_DK, padding: '12px 20px 20px', display: 'flex', flexDirection: 'column' as const, gap: '14px', border: '1.5px solid rgba(28,22,16,0.1)' };
const sectionStyle: React.CSSProperties = { display: 'flex', flexDirection: 'column' as const, gap: '3px' };
const labelStyle: React.CSSProperties = { fontFamily: "'Space Mono', monospace", fontSize: '0.58rem', fontWeight: 700, letterSpacing: '0.1em', textTransform: 'uppercase' as const, color: INK_MID };
const hintStyle: React.CSSProperties = { fontSize: '12px', color: INK_LITE, margin: '0', lineHeight: '1.5' };
const inputStyle: React.CSSProperties = { padding: '9px 12px', border: '1.5px solid rgba(28,22,16,0.25)', backgroundColor: PAPER_LT, color: INK, fontSize: '14px', outline: 'none', width: '100%', boxSizing: 'border-box' as const };
const radioGroupStyle: React.CSSProperties = { display: 'flex', flexDirection: 'row' as const, gap: '8px' };
const radioLabelStyle: React.CSSProperties = { flex: 1, padding: '10px 12px', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '8px' };
const newLocBoxStyle: React.CSSProperties = { padding: '12px', backgroundColor: '#f9f9f9', borderRadius: '10px', border: '1px solid #eee', display: 'flex', flexDirection: 'column' as const, gap: '8px' };
const newLocHeadingStyle: React.CSSProperties = { margin: '0 0 4px', fontSize: '11px', color: '#888', fontWeight: 600, textTransform: 'uppercase' as const };
const unifiedBoxStyle: React.CSSProperties = { marginTop: '6px', backgroundColor: PAPER_LT, border: '1.5px solid rgba(28,22,16,0.2)', overflow: 'hidden' };
const unifiedTextareaStyle: React.CSSProperties = { display: 'block', width: '100%', minHeight: '80px', padding: '12px 14px', border: 'none', background: 'transparent', fontSize: '14px', color: INK, resize: 'vertical' as const, outline: 'none', boxSizing: 'border-box' as const, fontFamily: 'inherit' };
const trayStyle: React.CSSProperties = { padding: '12px 14px', borderTop: '1px solid rgba(28,22,16,0.1)' };
const trayItemStyle: React.CSSProperties = { flex: 1, minWidth: 0 };
const trayLabelStyle: React.CSSProperties = { fontFamily: "'Space Mono', monospace", fontSize: '0.55rem', color: INK_LITE, fontWeight: 700, textTransform: 'uppercase' as const, letterSpacing: '0.04em' };
const trayHintStyle: React.CSSProperties = { fontSize: '11px', color: INK_LITE, margin: '2px 0 4px', fontStyle: 'italic' as const };
const trayInputStyle: React.CSSProperties = { padding: '7px 10px', border: '1.5px solid rgba(28,22,16,0.25)', backgroundColor: PAPER_LT, color: INK, fontSize: '13px', outline: 'none', width: '100%', boxSizing: 'border-box' as const };
const photoPlaceholderStyle: React.CSSProperties = { width: '80px', height: '80px', border: '2px dashed rgba(28,22,16,0.2)', display: 'flex', flexDirection: 'column' as const, alignItems: 'center', justifyContent: 'center', cursor: 'pointer', color: INK_LITE, fontSize: '10px', textAlign: 'center' as const, gap: '4px' };
const photoPreviewStyle: React.CSSProperties = { width: '80px', height: '80px', objectFit: 'cover' as const, border: '1px solid rgba(28,22,16,0.12)' };
const removePhotoBtnStyle: React.CSSProperties = { position: 'absolute' as const, top: '-5px', right: '-5px', backgroundColor: '#ff4444', color: 'white', border: 'none', borderRadius: '50%', width: '20px', height: '20px', fontSize: '10px', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center' };
const submitBtnStyle: React.CSSProperties = { padding: '14px 48px', backgroundColor: TEAL, color: '#fff', border: `2px solid ${INK}`, boxShadow: `3px 3px 0 ${INK}`, fontWeight: 'bold', cursor: 'pointer', fontSize: '15px', marginTop: '4px', alignSelf: 'center' as const };
const deleteItemBtnStyle: React.CSSProperties = { padding: '8px 20px', backgroundColor: '#fff0f0', color: '#cc0000', border: '1px solid #ffaaaa', borderRadius: '8px', fontSize: '13px', cursor: 'pointer', fontWeight: '600' };
const deleteOverlayStyle: React.CSSProperties = { position: 'fixed', inset: 0, backgroundColor: 'rgba(0,0,0,0.5)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 1100, padding: '20px' };
const deleteModalStyle: React.CSSProperties = { backgroundColor: '#fff', padding: '24px', borderRadius: '16px', maxWidth: '400px', width: '100%', boxShadow: '0 20px 60px rgba(0,0,0,0.2)' };
const cancelBtnStyle: React.CSSProperties = { padding: '10px 20px', backgroundColor: '#f5f5f5', color: '#333', border: 'none', borderRadius: '8px', cursor: 'pointer', fontSize: '14px', fontWeight: '600' };
const confirmDeleteBtnStyle: React.CSSProperties = { padding: '10px 20px', backgroundColor: '#fff0f0', color: '#cc0000', border: '1px solid #ffaaaa', borderRadius: '8px', cursor: 'pointer', fontSize: '14px', fontWeight: '600' };
