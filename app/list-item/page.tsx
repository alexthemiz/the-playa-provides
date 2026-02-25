'use client';

import { useState, useEffect } from 'react';
import { supabase } from '@/lib/supabaseClient';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { Camera, CheckCircle2, ArrowLeft } from 'lucide-react';

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

export default function ListItemPage() {
  const router = useRouter();
  const [loading, setLoading] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [availability, setAvailability] = useState('Available to borrow');
  const [locations, setLocations] = useState<{id: string, label: string}[]>([]);
  const [imageUrls, setImageUrls] = useState<string[]>([]);
  const [returnTerms, setReturnTerms] = useState('');
  const [showSuccessModal, setShowSuccessModal] = useState(false);

  useEffect(() => {
    async function fetchLocations() {
      const { data: { user } } = await supabase.auth.getUser();
      if (user) {
        const { data } = await supabase.from('locations').select('id, label').eq('user_id', user.id);
        if (data) setLocations(data);
      }
    }
    fetchLocations();
  }, []);

  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(e.target.files || []);
    if (files.length === 0) return;
    if (files.length + imageUrls.length > 4) { alert("Max 4 photos total."); return; }

    setUploading(true);
    const currentPhotos = [...imageUrls];
    for (const file of files) {
      const fileExt = file.name.split('.').pop();
      const filePath = `items/${Math.random()}.${fileExt}`;
      const { error: uploadError } = await supabase.storage.from('gear-photos').upload(filePath, file);
      if (!uploadError) {
        const { data } = supabase.storage.from('gear-photos').getPublicUrl(filePath);
        currentPhotos.push(data.publicUrl);
      }
    }
    setImageUrls(currentPhotos);
    setUploading(false);
    e.target.value = "";
  };

  async function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setLoading(true);
    const formData = new FormData(e.currentTarget);
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) { alert("You must be logged in!"); setLoading(false); return; }

    const { error } = await supabase.from('gear_items').insert([{
      user_id: user.id,
      item_name: formData.get('item_name'),
      category: formData.get('category'),
      condition: formData.get('condition'),
      location_id: formData.get('location_id'),
      availability_status: availability,
      description: formData.get('description'),
      pickup_by: formData.get('pickup_by') || null,
      return_by: formData.get('return_by') || null,
      damage_price: formData.get('damage_price') ? parseInt(formData.get('damage_price') as string, 10) : null,
      loss_price: formData.get('loss_price') ? parseInt(formData.get('loss_price') as string, 10) : null,
      image_urls: imageUrls,
      return_terms: formData.get('return_terms'),
    }]);

    if (error) { alert(`Error: ${error.message}`); } else { setShowSuccessModal(true); }
    setLoading(false);
  }

  return (
    <div style={pageWrapperStyle}>
      <div style={containerStyle}>
        <Link href="/inventory" style={backLinkStyle}>
          <ArrowLeft size={16} /> Back to Inventory Hub
        </Link>

        <div style={{ marginTop: '16px', marginBottom: '4px' }}>
          <h1 style={{ fontSize: '24px', color: '#111', margin: '0 0 4px 0' }}>List New Gear</h1>
          <p style={{ color: '#666', fontSize: '14px', margin: 0 }}>Add something to the community pool or your private inventory.</p>
        </div>

        <form onSubmit={handleSubmit} style={formStyle}>

          {/* ITEM NAME */}
          <div style={sectionStyle}>
            <label style={labelStyle}>Item Name</label>
            <input name="item_name" required placeholder="e.g. Coleman 2-Burner Stove" style={inputStyle} />
          </div>

          {/* CATEGORY + CONDITION + STORED AT — one row */}
          <div style={{ display: 'grid', gridTemplateColumns: '3fr 2fr 2fr', gap: '10px' }}>
            <div style={sectionStyle}>
              <label style={labelStyle}>Category</label>
              <select name="category" style={inputStyle}>
                {CATEGORIES.map(cat => <option key={cat}>{cat}</option>)}
              </select>
            </div>
            <div style={sectionStyle}>
              <label style={labelStyle}>Condition</label>
              <select name="condition" style={inputStyle}>
                {["New / Like New", "Good", "Well-Used", "Rough but Works", "Fixer-Upper"].map(c => <option key={c}>{c}</option>)}
              </select>
            </div>
            <div style={sectionStyle}>
              <label style={labelStyle}>Stored At</label>
              <select name="location_id" style={inputStyle} required defaultValue="">
                <option value="" disabled>— Location —</option>
                {locations.map(loc => <option key={loc.id} value={loc.id}>{loc.label}</option>)}
              </select>
            </div>
          </div>

          {/* DESCRIPTION */}
          <div style={sectionStyle}>
            <label style={labelStyle}>Description</label>
            <p style={hintStyle}>Share details and specs, existing damage, and any other useful information about the item.</p>
            <textarea name="description" placeholder="Describe your item" style={{ ...inputStyle, minHeight: '80px' }} />
          </div>

          {/* AVAILABILITY */}
          <div style={sectionStyle}>
            <label style={labelStyle}>Availability</label>
            <div style={radioGroupStyle}>
              {[
                { id: 'Available to borrow', label: 'Offer to Borrow', sub: 'Must be returned.' },
                { id: 'Available to keep',   label: 'Offer to Keep',   sub: 'Permanent gift.' },
                { id: 'Not Available',       label: 'Keep Private',    sub: 'Just add to my inventory' },
              ].map(status => (
                <label key={status.id} style={{
                  ...radioLabelStyle,
                  border: availability === status.id ? '2px solid #00ccff' : '1px solid #eee',
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

            {/* Pick up by — only for Keep */}
            {availability === 'Available to keep' && (
              <div style={{ ...detailsBoxStyle, marginTop: '10px' }}>
                <label style={labelStyle}>Pick up by</label>
                <input type="date" name="pickup_by" style={{ ...inputStyle, marginTop: '5px' }} />
              </div>
            )}
          </div>

          {/* TERMS FOR BORROW */}
          {availability === 'Available to borrow' && (
            <div style={sectionStyle}>
              <label style={labelStyle}>Terms for Borrowing</label>
              <p style={{ ...hintStyle, fontStyle: 'italic' }}>The more you agree on now, the less chance of a headache later.</p>
              <div style={detailsBoxStyle}>
                <div style={{ display: 'flex', gap: '10px' }}>
                  <div style={{ flex: 1 }}>
                    <label style={labelStyle}>Pick up by</label>
                    <input type="date" name="pickup_by" style={{ ...inputStyle, marginTop: '5px' }} />
                  </div>
                  <div style={{ flex: 1 }}>
                    <label style={labelStyle}>Return by</label>
                    <input type="date" name="return_by" style={{ ...inputStyle, marginTop: '5px' }} />
                  </div>
                </div>
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '10px', marginTop: '10px' }}>
                  <div>
                    <label style={labelStyle}>Damage Fee ($)</label>
                    <input type="number" name="damage_price" placeholder="0" style={{ ...inputStyle, marginTop: '5px' }} />
                  </div>
                  <div>
                    <label style={labelStyle}>Loss Fee ($)</label>
                    <input type="number" name="loss_price" placeholder="0" style={{ ...inputStyle, marginTop: '5px' }} />
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

          <button type="submit" disabled={loading || uploading} style={submitButtonStyle}>
            {loading ? 'Processing...' : 'List Your Item'}
          </button>
        </form>

        {showSuccessModal && (
          <div style={modalOverlayStyle}>
            <div style={modalContentStyle}>
              <div style={checkCircleStyle}><CheckCircle2 size={40} color="#22c55e" /></div>
              <h2 style={{ fontSize: '24px', color: '#111', margin: '0 0 8px 0' }}>Item Listed!</h2>
              <p style={{ color: '#666', marginBottom: '24px' }}>Gear is now in the system.</p>
              <div style={{ display: 'flex', flexDirection: 'column' as const, gap: '12px' }}>
                <button onClick={() => window.location.reload()} style={primaryActionBtn}>Add Another Item</button>
                <button onClick={() => router.push('/inventory')} style={secondaryActionBtn}>Go to Inventory</button>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

// --- STYLES ---
const pageWrapperStyle: React.CSSProperties = { backgroundColor: '#fff', minHeight: '100vh', width: '100%' };
const containerStyle: React.CSSProperties = { padding: '20px 20px 60px', maxWidth: '520px', margin: '0 auto' };
const backLinkStyle: React.CSSProperties = { display: 'flex', alignItems: 'center', gap: '6px', color: '#00ccff', textDecoration: 'none', fontWeight: 'bold', fontSize: '13px' };
const formStyle: React.CSSProperties = { display: 'flex', flexDirection: 'column' as const, gap: '14px', marginTop: '16px' };
const sectionStyle: React.CSSProperties = { display: 'flex', flexDirection: 'column' as const, gap: '5px' };
const labelStyle: React.CSSProperties = { fontSize: '12px', color: '#555', fontWeight: '600', textTransform: 'uppercase' as const, letterSpacing: '0.04em' };
const hintStyle: React.CSSProperties = { fontSize: '12px', color: '#888', margin: '0', lineHeight: '1.5' };
const inputStyle: React.CSSProperties = { padding: '9px 12px', borderRadius: '8px', border: '1px solid #ddd', backgroundColor: '#fff', color: '#111', fontSize: '14px', outline: 'none', width: '100%', boxSizing: 'border-box' as const };
const radioGroupStyle: React.CSSProperties = { display: 'flex', flexDirection: 'row' as const, gap: '8px' };
const radioLabelStyle: React.CSSProperties = { flex: 1, padding: '10px 12px', borderRadius: '10px', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '8px' };
const detailsBoxStyle: React.CSSProperties = { marginTop: '10px', padding: '14px', backgroundColor: '#f9f9f9', borderRadius: '10px', border: '1px solid #eee' };
const submitButtonStyle: React.CSSProperties = { padding: '14px', backgroundColor: '#00ccff', color: 'black', border: 'none', borderRadius: '10px', fontWeight: 'bold', cursor: 'pointer', fontSize: '15px', boxShadow: '0 4px 12px rgba(0,204,255,0.3)', marginTop: '8px' };
const photoUploadContainer: React.CSSProperties = { display: 'flex', gap: '10px', flexWrap: 'wrap' as const };
const photoPlaceholder: React.CSSProperties = { width: '80px', height: '80px', borderRadius: '10px', border: '2px dashed #ddd', display: 'flex', flexDirection: 'column' as const, alignItems: 'center', justifyContent: 'center', cursor: 'pointer', color: '#aaa', fontSize: '10px', textAlign: 'center' as const, gap: '4px' };
const photoPreviewImg: React.CSSProperties = { width: '80px', height: '80px', objectFit: 'cover' as const, borderRadius: '10px', border: '1px solid #eee' };
const removePhotoBtn: React.CSSProperties = { position: 'absolute' as const, top: '-5px', right: '-5px', backgroundColor: '#ff4444', color: 'white', border: 'none', borderRadius: '50%', width: '20px', height: '20px', fontSize: '10px', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center' };
const modalOverlayStyle: React.CSSProperties = { position: 'fixed' as const, top: 0, left: 0, width: '100%', height: '100%', backgroundColor: 'rgba(0,0,0,0.5)', backdropFilter: 'blur(4px)', display: 'flex', justifyContent: 'center', alignItems: 'center', zIndex: 1000 };
const modalContentStyle: React.CSSProperties = { backgroundColor: '#fff', padding: '40px', borderRadius: '24px', width: '90%', maxWidth: '400px', textAlign: 'center' as const, boxShadow: '0 20px 40px rgba(0,0,0,0.1)' };
const checkCircleStyle: React.CSSProperties = { width: '70px', height: '70px', backgroundColor: '#f0fdf4', borderRadius: '50%', display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto 16px auto' };
const primaryActionBtn: React.CSSProperties = { padding: '13px', backgroundColor: '#00ccff', color: 'black', border: 'none', borderRadius: '10px', fontWeight: 'bold', cursor: 'pointer', width: '100%' };
const secondaryActionBtn: React.CSSProperties = { padding: '13px', backgroundColor: '#f5f5f5', color: '#666', border: 'none', borderRadius: '10px', fontWeight: 'bold', cursor: 'pointer', width: '100%' };
