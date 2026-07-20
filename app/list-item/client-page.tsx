'use client';

import { useState, useEffect, Suspense } from 'react';
import { supabase } from '@/lib/supabaseClient';
import { geocodeZip } from '@/lib/geocodeZip';
import { useRouter, useSearchParams } from 'next/navigation';
import { Camera, CheckCircle2 } from 'lucide-react';

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

function ListItemPageInner() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const editId = searchParams.get('edit');

  const [loading, setLoading] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [displayName, setDisplayName] = useState<string | null>(null);
  const [availability, setAvailability] = useState('Available to Borrow');
  const [visibility, setVisibility] = useState('public');
  const [locations, setLocations] = useState<{id: string, label: string}[]>([]);
  const [selectedLocationId, setSelectedLocationId] = useState('');
  const [newLocData, setNewLocData] = useState({ label: '', address_line_1: '', city: '', state: '', zip_code: '' });
  const [imageUrls, setImageUrls] = useState<string[]>([]);
  const [returnTerms, setReturnTerms] = useState('');
  const [showSuccessModal, setShowSuccessModal] = useState(false);
  const [followingIds, setFollowingIds] = useState<string[]>([]);
  const [campMateIds, setCampMateIds] = useState<string[]>([]);
  const [campDataLoaded, setCampDataLoaded] = useState(false);
  const [toast, setToast] = useState<{ message: string; isError?: boolean } | null>(null);

  function showToast(message: string, isError = false) {
    setToast({ message, isError });
    setTimeout(() => setToast(null), 3000);
  }

  // Controlled text-field state (replaces uncontrolled name= inputs)
  const [itemName, setItemName] = useState('');
  const [category, setCategory] = useState(CATEGORIES[0]);
  const [condition, setCondition] = useState(CONDITIONS[0]);
  const [description, setDescription] = useState('');
  const [returnBy, setReturnBy] = useState('');
  const [damagePrice, setDamagePrice] = useState('');
  const [lossPrice, setLossPrice] = useState('');

  useEffect(() => {
    async function fetchLocations() {
      try {
        const { data: { session } } = await supabase.auth.getSession();
        const user = session?.user ?? null;
        if (user) {
          const { data: profileData } = await supabase.from('profiles').select('preferred_name').eq('id', user.id).maybeSingle();
          if (profileData?.preferred_name) setDisplayName(profileData.preferred_name);

          const [followingRes, campRes] = await Promise.all([
            supabase.from('user_follows').select('following_id').eq('follower_id', user.id),
            supabase.from('user_camp_affiliations').select('camp_id').eq('user_id', user.id).not('camp_id', 'is', null),
          ]);
          setFollowingIds((followingRes.data || []).map((r: any) => r.following_id));
          const myCampIds = (campRes.data || []).map((r: any) => r.camp_id).filter(Boolean);
          if (myCampIds.length > 0) {
            const { data: campMembers, error: campMatesErr } = await supabase.from('user_camp_affiliations').select('user_id').in('camp_id', myCampIds).neq('user_id', user.id);
            if (campMatesErr) console.error('campMates error:', campMatesErr);
            setCampMateIds([...new Set((campMembers || []).map((r: any) => r.user_id))]);
          }
          setCampDataLoaded(true);

          const { data, error } = await supabase.from('locations').select('id, label, is_default').eq('user_id', user.id);
          if (error) console.error('fetchLocations error:', error);
          else if (data) {
            setLocations(data);
            if (data.length === 0) {
              setSelectedLocationId('__new__');
            } else {
              const defaultLoc = data.find((l: any) => l.is_default);
              if (defaultLoc) setSelectedLocationId(defaultLoc.id);
            }
          }

          // Edit mode: fetch existing item and pre-populate all fields
          if (editId) {
            const { data: existingItem, error: itemErr } = await supabase
              .from('gear_items')
              .select('*')
              .eq('id', editId)
              .single();
            if (itemErr || !existingItem) {
              console.error('Edit fetch error:', itemErr?.message);
            } else {
              setAvailability(existingItem.availability_status || 'Available to Borrow');
              setVisibility(existingItem.visibility || 'public');
              setSelectedLocationId(existingItem.location_id || '');
              setImageUrls(existingItem.image_urls || []);
              setReturnTerms(existingItem.return_terms || '');
              setItemName(existingItem.item_name || '');
              setCategory(existingItem.category || CATEGORIES[0]);
              setCondition(existingItem.condition || CONDITIONS[0]);
              setDescription(existingItem.description || '');
              // Dates come back as ISO strings — strip to YYYY-MM-DD for <input type="date">
              setReturnBy(existingItem.return_by ? existingItem.return_by.split('T')[0] : '');
              setDamagePrice(existingItem.damage_price != null ? String(existingItem.damage_price) : '');
              setLossPrice(existingItem.loss_price != null ? String(existingItem.loss_price) : '');
            }
          }
        }
      } catch (err) {
        console.error('fetchLocations exception:', err);
      }
    }
    fetchLocations();
  }, [editId]);

  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(e.target.files || []);
    if (files.length === 0) return;
    if (files.length + imageUrls.length > 4) { showToast("Max 4 photos total.", true); return; }

    setUploading(true);
    try {
      const currentPhotos = [...imageUrls];
      for (const file of files) {
        const fileExt = file.name.split('.').pop();
        const filePath = `items/${Math.random()}.${fileExt}`;
        const { error: uploadError } = await supabase.storage.from('gear-photos').upload(filePath, file);
        if (uploadError) {
          console.error('Photo upload error:', uploadError);
        } else {
          const { data } = supabase.storage.from('gear-photos').getPublicUrl(filePath);
          currentPhotos.push(data.publicUrl);
        }
      }
      setImageUrls(currentPhotos);
      e.target.value = "";
    } catch (err) {
      console.error('Photo upload exception:', err);
      showToast('Photo upload failed. Please try again.', true);
    } finally {
      setUploading(false);
    }
  };

  async function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setLoading(true);
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) { showToast("You must be logged in!", true); return; }

      // If user is adding a new location inline, insert it first
      let resolvedLocationId: string | null = selectedLocationId || null;
      if (selectedLocationId === '__new__') {
        if (!newLocData.label) { showToast("Please give your new location a label (e.g. Home).", true); return; }
        const coords = await geocodeZip(newLocData.zip_code);
        const { data: newLoc, error: locErr } = await supabase
          .from('locations')
          .insert({ ...newLocData, user_id: user.id, ...(coords ?? {}) })
          .select('id')
          .single();
        if (locErr || !newLoc) { showToast(`Error saving location: ${locErr?.message}`, true); return; }
        resolvedLocationId = newLoc.id;
        setLocations(prev => [...prev, { id: newLoc.id, label: newLocData.label }]);
      }

      const itemPayload = {
        item_name: itemName,
        category,
        condition,
        location_id: resolvedLocationId,
        availability_status: availability,
        visibility: availability === 'Not Available' ? 'private' : visibility,
        description,
        return_by: returnBy || null,
        damage_price: damagePrice ? parseInt(damagePrice, 10) : null,
        loss_price: lossPrice ? parseInt(lossPrice, 10) : null,
        image_urls: imageUrls,
        return_terms: returnTerms,
      };

      if (editId) {
        // Edit mode: update existing record
        const { error } = await supabase.from('gear_items').update(itemPayload).eq('id', editId);
        if (error) {
          showToast(`Error: ${error.message}`, true);
        } else {
          setShowSuccessModal(true);
        }
      } else {
        // Create mode: insert new record + notify followers
        const { data: newItem, error } = await supabase.from('gear_items').insert([{
          user_id: user.id,
          ...itemPayload,
        }]).select('id').single();

        if (error || !newItem) {
          showToast(`Error: ${error?.message ?? 'Item was not saved. Please try again.'}`, true);
        } else {
          // Fire-and-forget: notify followers who have email opt-in
          supabase.functions.invoke('send-follow-notification', {
            body: { item_id: newItem.id, poster_id: user.id },
          });
          setShowSuccessModal(true);
        }
      }
    } catch (err) {
      console.error('handleSubmit exception:', err);
      showToast('Something went wrong. Please try again.', true);
    } finally {
      setLoading(false);
    }
  }

  return (
    <div style={pageWrapperStyle}>

      {/* Page header band */}
      <div style={{ backgroundColor: '#FDFAF4', borderBottom: '2px solid #1C1610', padding: '28px 0' }}>
        <div className="rsp-px" style={{ maxWidth: '1280px', margin: '0 auto' }}>
          <h1 style={{ fontFamily: "'Arvo', serif", fontSize: '1.9rem', fontWeight: 900, color: '#1C1610', margin: '0 0 12px', lineHeight: 1.05 }}>
            List <em style={{ fontStyle: 'italic', color: '#1E8A82' }}>an Item.</em>
          </h1>
          <p style={{ fontSize: '0.9rem', color: '#4A3828', lineHeight: 1.65, maxWidth: '560px', margin: 0 }}>
            Make it available to borrow, give it away, or keep it hidden on your private inventory.
          </p>
        </div>
      </div>

      <div style={containerStyle}>

        <form onSubmit={handleSubmit} style={formStyle}>

          {/* BOX 1: Item details + photos */}
          <div style={formBoxStyle}>

            <div style={sectionStyle}>
              <label style={labelStyle}>Item Name</label>
              <input
                required
                placeholder="e.g. Coleman 2-Burner Stove"
                style={inputStyle}
                value={itemName}
                onChange={e => setItemName(e.target.value)}
              />
            </div>

            <div style={{ display: 'grid', gridTemplateColumns: '3fr 2fr 2fr', gap: '10px' }}>
              <div style={sectionStyle}>
                <label style={labelStyle}>Category</label>
                <select style={inputStyle} value={category} onChange={e => setCategory(e.target.value)}>
                  {CATEGORIES.map(cat => <option key={cat}>{cat}</option>)}
                </select>
              </div>
              <div style={sectionStyle}>
                <label style={labelStyle}>Condition</label>
                <select style={inputStyle} value={condition} onChange={e => setCondition(e.target.value)}>
                  {CONDITIONS.map(c => <option key={c}>{c}</option>)}
                </select>
              </div>
              <div style={sectionStyle}>
                <label style={labelStyle}>Stored At</label>
                <select
                  style={inputStyle}
                  value={selectedLocationId}
                  onChange={e => setSelectedLocationId(e.target.value)}
                  required
                >
                  <option value="" disabled>— Location —</option>
                  {locations.map(loc => <option key={loc.id} value={loc.id}>{loc.label}</option>)}
                  <option value="__new__">+ Add new location</option>
                </select>
              </div>
            </div>

            {selectedLocationId === '__new__' && (
              <div style={{ padding: '12px', backgroundColor: '#f9f9f9', borderRadius: '10px', border: '1px solid #eee', display: 'flex', flexDirection: 'column' as const, gap: '8px' }}>
                <p style={{ margin: '0 0 4px', fontSize: '11px', color: '#888', fontWeight: 600, textTransform: 'uppercase' as const }}>New Location — saved to your settings</p>
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

            <div style={sectionStyle}>
              <label style={labelStyle}>Description</label>
              <p style={hintStyle}>Share details and specs, existing damage, and any other useful information.</p>
              <textarea
                placeholder="Describe your item"
                style={{ ...inputStyle, minHeight: '80px' }}
                value={description}
                onChange={e => setDescription(e.target.value)}
              />
            </div>

            <div style={sectionStyle}>
              <label style={labelStyle}>Photos (Max 4)</label>
              <div style={photoUploadContainer}>
                <input type="file" accept="image/*" multiple onChange={handleFileUpload} disabled={uploading} style={{ display: 'none' }} id="file-upload" />
                <label htmlFor="file-upload" style={photoPlaceholder}>
                  <Camera size={22} />
                  <span>{uploading ? 'Uploading...' : 'Add photos'}</span>
                </label>
                {imageUrls.map((url, i) => (
                  <div key={url + i} style={{ position: 'relative' as const }}>
                    <img src={url} style={photoPreviewImg} alt="Preview" />
                    <button type="button" onClick={() => setImageUrls(imageUrls.filter((_, idx) => idx !== i))} style={removePhotoBtn}>✕</button>
                  </div>
                ))}
              </div>
            </div>

          </div>

          {/* BOX 2: Availability + visibility + lending terms */}
          <div style={formBoxStyle}>

            <div style={sectionStyle}>
              <label style={labelStyle}>Availability</label>
              <div style={radioGroupStyle}>
                {[
                  { id: 'Available to Borrow', label: 'Lend It',        sub: 'Set your terms below' },
                  { id: 'Available to Keep',   label: 'Gift It',         sub: 'Give the item away' },
                  { id: 'Not Available',       label: 'Keep it Private', sub: 'Add to your inventory' },
                ].map(status => (
                  <label key={status.id} style={{
                    ...radioLabelStyle,
                    border: availability === status.id ? '2px solid #1E8A82' : '1px solid #eee',
                    backgroundColor: availability === status.id ? '#f0fbff' : '#fff',
                  }}>
                    <input type="radio" value={status.id} checked={availability === status.id} onChange={e => setAvailability(e.target.value)} style={{ display: 'none' }} />
                    <div>
                      <div style={{ fontWeight: 'bold', color: '#111', fontSize: '13px' }}>{status.label}</div>
                      <div style={{ fontSize: '11px', color: '#777' }}>{status.sub}</div>
                    </div>
                  </label>
                ))}
              </div>
            </div>

            {availability !== 'Not Available' && (
              <div style={sectionStyle}>
                <label style={labelStyle}>Who can view this item</label>
                {campDataLoaded && campMateIds.length === 0 && (
                  <p style={hintStyle}>Add your camp history <a href="/settings" target="_blank" rel="noreferrer" style={{ color: '#1E8A82', fontWeight: 600, textDecoration: 'none' }}>to your profile</a> to unlock campmates-only sharing</p>
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

            {availability === 'Available to Borrow' && (
              <div style={sectionStyle}>
                <label style={labelStyle}>Lending Terms <span style={{ fontSize: '11px', color: '#aaa', fontWeight: '500', textTransform: 'none' as const, letterSpacing: '0' }}>— all optional but encouraged</span></label>
                <p style={hintStyle}>Borrowers see this before they request. Set expectations upfront to avoid issues later.</p>
                <div style={unifiedBoxStyle}>
                  <textarea
                    placeholder="e.g. Please clean before returning, no modifications."
                    style={unifiedTextareaStyle}
                    value={returnTerms}
                    onChange={e => setReturnTerms(e.target.value)}
                  />
                  <div style={trayStyle}>
                    <div style={trayItemStyle}>
                      <div style={trayLabelStyle}>Return by</div>
                      <div style={trayHintStyle}>Gear must be back by:</div>
                      <input type="date" style={trayInputStyle} value={returnBy} onChange={e => setReturnBy(e.target.value)} />
                    </div>
                    <div style={trayItemStyle}>
                      <div style={trayLabelStyle}>If Damaged</div>
                      <div style={trayHintStyle}>Borrower pays:</div>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
                        <span style={{ fontSize: '13px', color: '#777', fontWeight: 600 }}>$</span>
                        <input type="number" placeholder="0" style={{ ...trayInputStyle, flex: 1, width: 0 }} value={damagePrice} onChange={e => setDamagePrice(e.target.value)} />
                      </div>
                    </div>
                    <div style={trayItemStyle}>
                      <div style={trayLabelStyle}>If Not Returned</div>
                      <div style={trayHintStyle}>Borrower pays:</div>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
                        <span style={{ fontSize: '13px', color: '#777', fontWeight: 600 }}>$</span>
                        <input type="number" placeholder="0" style={{ ...trayInputStyle, flex: 1, width: 0 }} value={lossPrice} onChange={e => setLossPrice(e.target.value)} />
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            )}

          </div>

          <button type="submit" disabled={loading || uploading} style={submitButtonStyle}>
            {loading ? 'Processing...' : editId ? 'Save Changes' : 'List Your Item'}
          </button>
        </form>

        {showSuccessModal && (
          <div style={modalOverlayStyle}>
            <div style={modalContentStyle}>
              <div style={checkCircleStyle}><CheckCircle2 size={40} color="#22c55e" /></div>
              <h2 style={{ fontSize: '24px', color: '#111', margin: '0 0 8px 0' }}>
                {editId ? 'Item Updated!' : 'Item Listed!'}
              </h2>
              <p style={{ color: '#666', marginBottom: '24px' }}>
                {editId ? 'Your changes have been saved.' : 'Gear is now in the system.'}
              </p>
              <div style={{ display: 'flex', flexDirection: 'column' as const, gap: '12px' }}>
                {editId ? (
                  <button onClick={() => router.push(`/find-items/${editId}`)} style={primaryActionBtn}>
                    Back to Item
                  </button>
                ) : (
                  <button onClick={() => window.location.reload()} style={primaryActionBtn}>
                    Add Another Item
                  </button>
                )}
                <button onClick={() => router.push('/inventory')} style={secondaryActionBtn}>Go to Inventory</button>
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
    </div>
  );
}

export default function ListItemPage() {
  return (
    <Suspense fallback={null}>
      <ListItemPageInner />
    </Suspense>
  );
}

// --- STYLES ---
const pageWrapperStyle: React.CSSProperties = { backgroundColor: '#F6F1E8', minHeight: '100vh', width: '100%' };
const containerStyle: React.CSSProperties = { padding: '20px 20px 60px', maxWidth: '520px', margin: '0 auto' };
const formStyle: React.CSSProperties = { display: 'flex', flexDirection: 'column' as const, gap: '12px', marginTop: '16px' };
const formBoxStyle: React.CSSProperties = { backgroundColor: '#EDE5D0', padding: '12px 20px 20px', display: 'flex', flexDirection: 'column' as const, gap: '14px', border: '1.5px solid rgba(28,22,16,0.1)' };
const sectionStyle: React.CSSProperties = { display: 'flex', flexDirection: 'column' as const, gap: '3px' };
const labelStyle: React.CSSProperties = { fontFamily: "'Space Mono', monospace", fontSize: '0.58rem', fontWeight: 700, letterSpacing: '0.1em', textTransform: 'uppercase' as const, color: '#4A3828' };
const hintStyle: React.CSSProperties = { fontSize: '12px', color: '#9A8878', margin: '0', lineHeight: '1.5' };
const inputStyle: React.CSSProperties = { padding: '9px 12px', border: '1.5px solid rgba(28,22,16,0.25)', backgroundColor: '#FDFAF4', color: '#1C1610', fontSize: '14px', outline: 'none', width: '100%', boxSizing: 'border-box' as const };
const radioGroupStyle: React.CSSProperties = { display: 'flex', flexDirection: 'row' as const, gap: '8px' };
const radioLabelStyle: React.CSSProperties = { flex: 1, padding: '10px 12px', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '8px' };
const detailsBoxStyle: React.CSSProperties = { marginTop: '10px', padding: '14px', backgroundColor: '#FDFAF4', border: '1.5px solid rgba(28,22,16,0.12)' };
const unifiedBoxStyle: React.CSSProperties = { marginTop: '6px', backgroundColor: '#FDFAF4', border: '1.5px solid rgba(28,22,16,0.2)', overflow: 'hidden' };
const unifiedTextareaStyle: React.CSSProperties = { display: 'block', width: '100%', minHeight: '80px', padding: '12px 14px', border: 'none', background: 'transparent', fontSize: '14px', color: '#1C1610', resize: 'vertical' as const, outline: 'none', boxSizing: 'border-box' as const, fontFamily: 'inherit' };
const trayStyle: React.CSSProperties = { padding: '12px 14px', display: 'flex', gap: '10px', borderTop: '1px solid rgba(28,22,16,0.1)' };
const trayItemStyle: React.CSSProperties = { flex: 1, minWidth: 0 };
const trayLabelStyle: React.CSSProperties = { fontFamily: "'Space Mono', monospace", fontSize: '0.55rem', color: '#9A8878', fontWeight: 700, textTransform: 'uppercase' as const, letterSpacing: '0.04em' };
const trayHintStyle: React.CSSProperties = { fontSize: '11px', color: '#9A8878', margin: '2px 0 4px', fontStyle: 'italic' as const };
const trayInputStyle: React.CSSProperties = { padding: '7px 10px', border: '1.5px solid rgba(28,22,16,0.25)', backgroundColor: '#FDFAF4', color: '#1C1610', fontSize: '13px', outline: 'none', width: '100%', boxSizing: 'border-box' as const };
const submitButtonStyle: React.CSSProperties = { padding: '14px', backgroundColor: '#1E8A82', color: '#fff', border: '2px solid #1C1610', boxShadow: '3px 3px 0 #1C1610', fontWeight: 'bold', cursor: 'pointer', fontSize: '15px', marginTop: '8px' };
const photoUploadContainer: React.CSSProperties = { display: 'flex', gap: '10px', flexWrap: 'wrap' as const };
const photoPlaceholder: React.CSSProperties = { width: '80px', height: '80px', border: '2px dashed rgba(28,22,16,0.2)', display: 'flex', flexDirection: 'column' as const, alignItems: 'center', justifyContent: 'center', cursor: 'pointer', color: '#9A8878', fontSize: '10px', textAlign: 'center' as const, gap: '4px' };
const photoPreviewImg: React.CSSProperties = { width: '80px', height: '80px', objectFit: 'cover' as const, border: '1px solid rgba(28,22,16,0.12)' };
const removePhotoBtn: React.CSSProperties = { position: 'absolute' as const, top: '-5px', right: '-5px', backgroundColor: '#ff4444', color: 'white', border: 'none', borderRadius: '50%', width: '20px', height: '20px', fontSize: '10px', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center' };
const modalOverlayStyle: React.CSSProperties = { position: 'fixed' as const, top: 0, left: 0, width: '100%', height: '100%', backgroundColor: 'rgba(0,0,0,0.5)', backdropFilter: 'blur(4px)', display: 'flex', justifyContent: 'center', alignItems: 'center', zIndex: 1000 };
const modalContentStyle: React.CSSProperties = { backgroundColor: '#FDFAF4', padding: '40px', width: '90%', maxWidth: '400px', textAlign: 'center' as const, border: '2px solid #1C1610', boxShadow: '6px 6px 0 #1C1610' };
const checkCircleStyle: React.CSSProperties = { width: '70px', height: '70px', backgroundColor: '#f0fdf4', borderRadius: '50%', display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto 16px auto' };
const primaryActionBtn: React.CSSProperties = { padding: '13px', backgroundColor: '#1E8A82', color: '#fff', border: '2px solid #1C1610', boxShadow: '3px 3px 0 #1C1610', fontWeight: 'bold', cursor: 'pointer', width: '100%' };
const secondaryActionBtn: React.CSSProperties = { padding: '13px', backgroundColor: '#EDE5D0', color: '#4A3828', border: '1.5px solid rgba(28,22,16,0.2)', fontWeight: 'bold', cursor: 'pointer', width: '100%' };
