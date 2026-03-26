'use client';

import { useState, useEffect } from 'react';
import { supabase } from '@/lib/supabaseClient';
import { Camera } from 'lucide-react';

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
  const [imageUrls, setImageUrls] = useState<string[]>([]);
  const [returnTerms, setReturnTerms] = useState('');
  const [confirmDelete, setConfirmDelete] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const [followingIds, setFollowingIds] = useState<string[]>([]);
  const [campMateIds, setCampMateIds] = useState<string[]>([]);

  useEffect(() => {
    async function fetchLocations() {
      const { data: { user } } = await supabase.auth.getUser();
      if (user) {
        const { data } = await supabase.from('locations').select('id, label, is_default').eq('user_id', user.id);
        if (data) {
          setLocations(data);
          if (!itemToEdit) {
            const defaultLoc = data.find((l: any) => l.is_default);
            if (defaultLoc) setSelectedLocationId(defaultLoc.id);
          }
        }
        const [followingRes, campRes] = await Promise.all([
          supabase.from('user_follows').select('following_id').eq('follower_id', user.id),
          supabase.from('user_camp_affiliations').select('camp_id').eq('user_id', user.id),
        ]);
        setFollowingIds((followingRes.data || []).map((r: any) => r.following_id));
        const myCampIds = (campRes.data || []).map((r: any) => r.camp_id);
        if (myCampIds.length > 0) {
          const { data: campMembers } = await supabase.from('user_camp_affiliations').select('user_id').in('camp_id', myCampIds).neq('user_id', user.id);
          setCampMateIds([...new Set((campMembers || []).map((r: any) => r.user_id))]);
        }
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
    if (files.length + imageUrls.length > 4) { alert("Max 4 photos total."); return; }

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

    const payload = {
      item_name: formData.get('item_name'),
      category: formData.get('category'),
      condition: formData.get('condition'),
      location_id: selectedLocationId || null,
      availability_status: availability,
      visibility: availability === 'Not Available' ? 'private' : visibility,
      description: formData.get('description'),
      pickup_by: formData.get('pickup_by') || null,
      return_by: formData.get('return_by') || null,
      damage_price: formData.get('damage_price') ? parseInt(formData.get('damage_price') as string, 10) : null,
      loss_price: formData.get('loss_price') ? parseInt(formData.get('loss_price') as string, 10) : null,
      image_urls: imageUrls,
      return_terms: returnTerms || null,
    };

    const { error } = itemToEdit
      ? await supabase.from('gear_items').update(payload).eq('id', itemToEdit.id)
      : await supabase.from('gear_items').insert([{ ...payload, user_id: user.id }]);

    if (error) alert("Error: " + error.message);
    else onSuccess();
    setLoading(false);
  }

  return (
    <div style={overlayStyle} onClick={onClose}>
      <div style={modalStyle} onClick={e => e.stopPropagation()}>

        {/* HEADER */}
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px' }}>
          <h2 style={{ margin: 0, fontSize: '20px', color: '#111' }}>
            {itemToEdit ? 'Edit Item' : 'Add New Gear'}
          </h2>
          <button onClick={onClose} style={closeBtnStyle}>✕</button>
        </div>

        <form onSubmit={handleSubmit} style={formStyle}>

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
                {["New / Like New", "Good", "Well-Used", "Rough but Works", "Fixer-Upper"].map(c => <option key={c}>{c}</option>)}
              </select>
            </div>
            <div style={sectionStyle}>
              <label style={labelStyle}>Stored At</label>
              <select value={selectedLocationId} onChange={e => setSelectedLocationId(e.target.value)} style={inputStyle} required>
                <option value="" disabled>— Location —</option>
                {locations.map(loc => <option key={loc.id} value={loc.id}>{loc.label}</option>)}
              </select>
            </div>
          </div>

          {/* DESCRIPTION */}
          <div style={sectionStyle}>
            <label style={labelStyle}>Description</label>
            <p style={hintStyle}>Share details and specs, existing damage, and any other useful information about the item.</p>
            <textarea name="description" defaultValue={itemToEdit?.description} placeholder="Describe your item" style={{ ...inputStyle, minHeight: '80px' }} />
          </div>

          {/* AVAILABILITY */}
          <div style={sectionStyle}>
            <label style={labelStyle}>Availability</label>
            <div style={radioGroupStyle}>
              {[
                { id: 'Available to Borrow', label: 'Offer to Borrow', sub: 'Must be returned.' },
                { id: 'Available to Keep',   label: 'Offer to Keep',   sub: 'Permanent gift.' },
                { id: 'Not Available',       label: 'Keep Private',    sub: 'Just add to my inventory' },
              ].map(status => (
                <label key={status.id} style={{
                  ...radioLabelStyle,
                  border: availability === status.id ? '2px solid #5ECFDF' : '1px solid #eee',
                  backgroundColor: availability === status.id ? '#f0fbff' : '#fff',
                }}>
                  <input type="radio" value={status.id} checked={availability === status.id} onChange={e => setAvailability(e.target.value)} style={{ display: 'none' }} />
                  <div>
                    <div style={{ fontWeight: 'bold', color: '#111', fontSize: '12px' }}>{status.label}</div>
                    <div style={{ fontSize: '11px', color: '#777' }}>{status.sub}</div>
                  </div>
                </label>
              ))}
            </div>

            {/* Pick up by — only for Keep */}
            {availability === 'Available to Keep' && (
              <div style={{ ...detailsBoxStyle, marginTop: '10px' }}>
                <label style={labelStyle}>Pick up by</label>
                <input type="date" name="pickup_by" defaultValue={itemToEdit?.pickup_by} style={{ ...inputStyle, marginTop: '5px' }} />
              </div>
            )}
          </div>

          {/* VISIBILITY — only shown when item is available */}
          {availability !== 'Not Available' && (
            <div style={sectionStyle}>
              <label style={labelStyle}>Who Can See This?</label>
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

          {/* TERMS FOR BORROW */}
          {availability === 'Available to Borrow' && (
            <div style={sectionStyle}>
              <label style={labelStyle}>Terms for Borrowing</label>
              <p style={{ ...hintStyle, fontStyle: 'italic' }}>The more you agree on now, the less chance of a headache later.</p>
              <div style={detailsBoxStyle}>
                <div style={{ display: 'flex', gap: '10px' }}>
                  <div style={{ flex: 1 }}>
                    <label style={labelStyle}>Pick up by</label>
                    <input type="date" name="pickup_by" defaultValue={itemToEdit?.pickup_by} style={{ ...inputStyle, marginTop: '5px' }} />
                  </div>
                  <div style={{ flex: 1 }}>
                    <label style={labelStyle}>Return by</label>
                    <input type="date" name="return_by" defaultValue={itemToEdit?.return_by} style={{ ...inputStyle, marginTop: '5px' }} />
                  </div>
                </div>
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '10px', marginTop: '10px' }}>
                  <div>
                    <label style={labelStyle}>Damage Fee ($)</label>
                    <input type="number" name="damage_price" defaultValue={itemToEdit?.damage_price} placeholder="0" style={{ ...inputStyle, marginTop: '5px' }} />
                  </div>
                  <div>
                    <label style={labelStyle}>Loss Fee ($)</label>
                    <input type="number" name="loss_price" defaultValue={itemToEdit?.loss_price} placeholder="0" style={{ ...inputStyle, marginTop: '5px' }} />
                  </div>
                </div>
                <div style={{ marginTop: '10px' }}>
                  <label style={labelStyle}>Specify Your Terms</label>
                  <textarea
                    name="return_terms"
                    placeholder="e.g. Please clean before returning, no modifications, return by the date agreed."
                    style={{ ...inputStyle, minHeight: '80px', marginTop: '5px' }}
                    value={returnTerms}
                    onChange={e => setReturnTerms(e.target.value)}
                  />
                </div>
              </div>
            </div>
          )}

          {/* PHOTOS */}
          <div style={sectionStyle}>
            <label style={labelStyle}>Photos (Max 4)</label>
            <div style={{ display: 'flex', gap: '10px', flexWrap: 'wrap' as const }}>
              <input type="file" accept="image/*" multiple onChange={handleFileUpload} disabled={uploading} style={{ display: 'none' }} id="modal-file-upload" />
              <label htmlFor="modal-file-upload" style={photoPlaceholderStyle}>
                <Camera size={20} />
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

          <button type="submit" disabled={loading || uploading} style={submitBtnStyle}>
            {uploading ? 'Uploading...' : loading ? 'Saving...' : itemToEdit ? 'Save Changes' : 'List Your Item'}
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

      {confirmDelete && (
        <div style={deleteOverlayStyle}>
          <div style={deleteModalStyle}>
            <p style={{ margin: '0 0 20px 0', fontSize: '15px', color: '#2D241E', lineHeight: 1.5 }}>
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
    </div>
  );
}

// --- STYLES ---
const overlayStyle: React.CSSProperties = { position: 'fixed', top: 0, left: 0, right: 0, bottom: 0, backgroundColor: 'rgba(0,0,0,0.5)', backdropFilter: 'blur(4px)', display: 'flex', justifyContent: 'center', alignItems: 'center', zIndex: 1000, padding: '20px' };
const modalStyle: React.CSSProperties = { backgroundColor: '#fff', padding: '24px', borderRadius: '16px', width: '100%', maxWidth: '580px', maxHeight: '90vh', overflowY: 'auto', boxShadow: '0 20px 60px rgba(0,0,0,0.15)' };
const closeBtnStyle: React.CSSProperties = { background: '#f5f5f5', border: 'none', borderRadius: '50%', width: '32px', height: '32px', cursor: 'pointer', fontSize: '14px', color: '#666', display: 'flex', alignItems: 'center', justifyContent: 'center' };
const formStyle: React.CSSProperties = { display: 'flex', flexDirection: 'column' as const, gap: '14px' };
const sectionStyle: React.CSSProperties = { display: 'flex', flexDirection: 'column' as const, gap: '5px' };
const labelStyle: React.CSSProperties = { fontSize: '12px', color: '#555', fontWeight: '600', textTransform: 'uppercase' as const, letterSpacing: '0.04em' };
const hintStyle: React.CSSProperties = { fontSize: '12px', color: '#888', margin: '0', lineHeight: '1.5' };
const inputStyle: React.CSSProperties = { padding: '9px 12px', borderRadius: '8px', border: '1px solid #ddd', backgroundColor: '#fff', color: '#111', fontSize: '14px', outline: 'none', width: '100%', boxSizing: 'border-box' as const };
const radioGroupStyle: React.CSSProperties = { display: 'flex', flexDirection: 'row' as const, gap: '8px' };
const radioLabelStyle: React.CSSProperties = { flex: 1, padding: '10px 12px', borderRadius: '10px', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '8px' };
const detailsBoxStyle: React.CSSProperties = { marginTop: '10px', padding: '14px', backgroundColor: '#f9f9f9', borderRadius: '10px', border: '1px solid #eee' };
const photoPlaceholderStyle: React.CSSProperties = { width: '80px', height: '80px', borderRadius: '10px', border: '2px dashed #ddd', display: 'flex', flexDirection: 'column' as const, alignItems: 'center', justifyContent: 'center', cursor: 'pointer', color: '#aaa', fontSize: '10px', textAlign: 'center' as const, gap: '4px' };
const photoPreviewStyle: React.CSSProperties = { width: '80px', height: '80px', objectFit: 'cover' as const, borderRadius: '10px', border: '1px solid #eee' };
const removePhotoBtnStyle: React.CSSProperties = { position: 'absolute' as const, top: '-5px', right: '-5px', backgroundColor: '#ff4444', color: 'white', border: 'none', borderRadius: '50%', width: '20px', height: '20px', fontSize: '10px', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center' };
const submitBtnStyle: React.CSSProperties = { padding: '13px', backgroundColor: '#5ECFDF', color: 'black', border: 'none', borderRadius: '10px', fontWeight: 'bold', cursor: 'pointer', fontSize: '15px', boxShadow: '0 4px 12px rgba(0,204,255,0.3)', marginTop: '4px' };
const deleteItemBtnStyle: React.CSSProperties = { padding: '8px 20px', backgroundColor: '#fff0f0', color: '#cc0000', border: '1px solid #ffaaaa', borderRadius: '8px', fontSize: '13px', cursor: 'pointer', fontWeight: '600' };
const deleteOverlayStyle: React.CSSProperties = { position: 'fixed', inset: 0, backgroundColor: 'rgba(0,0,0,0.5)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 1100, padding: '20px' };
const deleteModalStyle: React.CSSProperties = { backgroundColor: '#fff', padding: '24px', borderRadius: '16px', maxWidth: '400px', width: '100%', boxShadow: '0 20px 60px rgba(0,0,0,0.2)' };
const cancelBtnStyle: React.CSSProperties = { padding: '10px 20px', backgroundColor: '#f5f5f5', color: '#333', border: 'none', borderRadius: '8px', cursor: 'pointer', fontSize: '14px', fontWeight: '600' };
const confirmDeleteBtnStyle: React.CSSProperties = { padding: '10px 20px', backgroundColor: '#fff0f0', color: '#cc0000', border: '1px solid #ffaaaa', borderRadius: '8px', cursor: 'pointer', fontSize: '14px', fontWeight: '600' };
