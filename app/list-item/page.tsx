'use client';

import { useState, useEffect } from 'react';
import { supabase } from '@/lib/supabaseClient';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { Camera, X, CheckCircle2, ArrowLeft } from 'lucide-react';

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
        const { data } = await supabase
          .from('locations')
          .select('id, label')
          .eq('user_id', user.id);
        if (data) setLocations(data);
      }
    }
    fetchLocations();
  }, []);

  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(e.target.files || []);
    if (files.length === 0) return;
    if (files.length + imageUrls.length > 4) {
      alert("Max 4 photos total.");
      return;
    }

    setUploading(true);
    const currentPhotos = [...imageUrls];

    for (const file of files) {
      const fileExt = file.name.split('.').pop();
      const fileName = `${Math.random()}.${fileExt}`;
      const filePath = `items/${fileName}`;

      const { error: uploadError } = await supabase.storage
        .from('gear-photos')
        .upload(filePath, file);

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

    if (!user) {
      alert("You must be logged in!");
      setLoading(false);
      return;
    }

    const { error } = await supabase.from('gear_items').insert([
      {
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
      },
    ]);

    if (error) {
      alert(`Error: ${error.message}`);
    } else {
      setShowSuccessModal(true);
    }
    setLoading(false);
  }

  return (
    <div style={pageWrapperStyle}>
      <div style={containerStyle}>
        <Link href="/inventory" style={backLinkStyle}>
          <ArrowLeft size={18} /> Back to Inventory Hub
        </Link>
        
        <div style={{ marginTop: '24px' }}>
          <h1 style={{ fontSize: '28px', color: '#111', margin: '0 0 8px 0' }}>List New Gear</h1>
          <p style={{ color: '#666', fontSize: '15px' }}>Add something to the community pool or your private inventory.</p>
        </div>
        
        <form onSubmit={handleSubmit} style={formStyle}>
          
          <div style={sectionStyle}>
            <label style={labelStyle}>Item Name</label>
            <input name="item_name" required placeholder="e.g. Coleman 2-Burner Stove" style={inputStyle} />
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '15px' }}>
            <div style={sectionStyle}>
              <label style={labelStyle}>Category</label>
              <select name="category" style={inputStyle}>
                {CATEGORIES.map(cat => <option key={cat}>{cat}</option>)}
              </select>
            </div>
            <div style={sectionStyle}>
              <label style={labelStyle}>Condition</label>
              <select name="condition" style={inputStyle}>
                {["New", "Good (Dusty)", "Well Used", "Beaten Up but Works"].map(cond => <option key={cond}>{cond}</option>)}
              </select>
            </div>
          </div>

          <div style={sectionStyle}>
            <label style={labelStyle}>Description</label>
            <textarea name="description" placeholder="Any special instructions?" style={{ ...inputStyle, minHeight: '100px' }} />
          </div>

          <div style={sectionStyle}>
            <label style={labelStyle}>Stored At</label>
            <select name="location_id" style={inputStyle} required defaultValue="">
              <option value="" disabled>-- Select a Saved Location --</option>
              {locations.map((loc) => <option key={loc.id} value={loc.id}>{loc.label}</option>)}
            </select>
          </div>

          <div style={sectionStyle}>
            <label style={labelStyle}>Availability</label>
            <div style={radioGroupStyle}>
              {[
                { id: 'Available to borrow', label: 'Offer to Borrow', sub: 'Burners must return this.' },
                { id: 'Available to keep', label: 'Offer to Keep (Gift)', sub: 'A permanent gift.' },
                { id: 'Not Available', label: 'Private Inventory', sub: 'Just for me.' }
              ].map(status => (
                <label key={status.id} style={{
                  ...radioLabelStyle,
                  border: availability === status.id ? '2px solid #00ccff' : '1px solid #eee',
                  backgroundColor: availability === status.id ? '#f0fbff' : '#fff'
                }}>
                  <input type="radio" value={status.id} checked={availability === status.id} onChange={(e) => setAvailability(e.target.value)} style={{ display: 'none' }} />
                  <div>
                    <div style={{ fontWeight: 'bold', color: '#111' }}>{status.label}</div>
                    <div style={{ fontSize: '12px', color: '#777' }}>{status.sub}</div>
                  </div>
                </label>
              ))}
            </div>

            {availability !== 'Not Available' && (
              <div style={detailsBoxStyle}>
                <div style={{ display: 'flex', gap: '15px' }}>
                  <div style={{ flex: 1 }}>
                    <label style={labelStyle}>Pick up by</label>
                    <input type="date" name="pickup_by" style={inputStyle} />
                  </div>
                  {availability === 'Available to borrow' && (
                    <div style={{ flex: 1 }}>
                      <label style={labelStyle}>Return by</label>
                      <input type="date" name="return_by" style={inputStyle} />
                    </div>
                  )}
                </div>
                {availability === 'Available to borrow' && (
                  <div style={{ marginTop: '15px', display: 'flex', flexDirection: 'column', gap: '15px' }}>
                    <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '15px' }}>
                      <div>
                        <label style={labelStyle}>Damage Fee ($)</label>
                        <input type="number" name="damage_price" placeholder="0" style={inputStyle} />
                      </div>
                      <div>
                        <label style={labelStyle}>Loss Fee ($)</label>
                        <input type="number" name="loss_price" placeholder="0" style={inputStyle} />
                      </div>
                    </div>
                    <div>
                      <label style={labelStyle}>Return Terms</label>
                      <textarea 
                        name="return_terms"
                        placeholder="Cleaning instructions..." 
                        style={{...inputStyle, minHeight: '60px'}} 
                        value={returnTerms}
                        onChange={(e) => setReturnTerms(e.target.value)}
                      />
                    </div>
                  </div>
                )}
              </div>
            )}
          </div>

          <div style={sectionStyle}>
            <label style={labelStyle}>Photos (Max 4)</label>
            <div style={photoUploadContainer}>
              <input type="file" accept="image/*" multiple onChange={handleFileUpload} disabled={uploading} style={fileInputHidden} id="file-upload" />
              <label htmlFor="file-upload" style={photoPlaceholder}>
                <Camera size={24} />
                <span>{uploading ? 'Uploading...' : 'Add photos'}</span>
              </label>
              {imageUrls.map((url, i) => (
                <div key={url + i} style={photoPreviewWrapper}>
                  <img src={url} style={photoPreviewImg} alt="Preview" />
                  <button type="button" onClick={() => setImageUrls(imageUrls.filter((_, idx) => idx !== i))} style={removePhotoBtn}>✕</button>
                </div>
              ))}
            </div>
          </div>

          <button type="submit" disabled={loading || uploading} style={submitButtonStyle}>
            {loading ? 'Processing...' : 'List Gear Item'}
          </button>
        </form>

        {showSuccessModal && (
          <div style={modalOverlayStyle}>
            <div style={modalContentStyle}>
              <div style={checkCircleStyle}><CheckCircle2 size={40} color="#22c55e" /></div>
              <h2 style={{ fontSize: '24px', color: '#111', margin: '0 0 8px 0' }}>Item Listed!</h2>
              <p style={{ color: '#666', marginBottom: '24px' }}>Gear is now in the system.</p>
              <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
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

// STYLES - WITH TYPESCRIPT FIXES
const pageWrapperStyle: React.CSSProperties = {
  backgroundColor: '#fff',
  minHeight: '100vh',
  width: '100%',
};

const containerStyle: React.CSSProperties = { 
  padding: '40px 20px', 
  maxWidth: '640px', 
  margin: '0 auto',
};

const backLinkStyle: React.CSSProperties = { 
  display: 'flex', 
  alignItems: 'center', 
  gap: '8px', 
  color: '#00ccff', 
  textDecoration: 'none', 
  fontWeight: 'bold', 
  fontSize: '14px' 
};

const formStyle: React.CSSProperties = { 
  display: 'flex', 
  flexDirection: 'column' as const, 
  gap: '28px', 
  marginTop: '32px' 
};

const sectionStyle: React.CSSProperties = { 
  display: 'flex', 
  flexDirection: 'column' as const, 
  gap: '8px' 
};

const labelStyle: React.CSSProperties = { 
  fontSize: '13px', 
  color: '#333', 
  fontWeight: '600', 
  marginBottom: '4px' 
};

const inputStyle: React.CSSProperties = { 
  padding: '12px 16px', 
  borderRadius: '10px', 
  border: '1px solid #ddd', 
  backgroundColor: '#fff', 
  color: '#111', 
  fontSize: '15px', 
  outline: 'none' 
};

const radioGroupStyle: React.CSSProperties = { 
  display: 'flex', 
  flexDirection: 'column' as const, 
  gap: '10px' 
};

const radioLabelStyle: React.CSSProperties = { 
  padding: '16px', 
  borderRadius: '12px', 
  cursor: 'pointer', 
  display: 'flex', 
  alignItems: 'center', 
  gap: '15px', 
  transition: 'all 0.2s' 
};

const detailsBoxStyle: React.CSSProperties = { 
  marginTop: '15px', 
  padding: '20px', 
  backgroundColor: '#f9f9f9', 
  borderRadius: '12px', 
  border: '1px solid #eee' 
};

const submitButtonStyle: React.CSSProperties = { 
  padding: '16px', 
  backgroundColor: '#00ccff', 
  color: 'black', 
  border: 'none', 
  borderRadius: '12px', 
  fontWeight: 'bold', 
  cursor: 'pointer', 
  fontSize: '16px', 
  boxShadow: '0 4px 12px rgba(0,204,255,0.3)', 
  marginTop: '20px' 
};

const photoUploadContainer: React.CSSProperties = { 
  display: 'flex', 
  gap: '12px', 
  flexWrap: 'wrap' as const 
};

const fileInputHidden: React.CSSProperties = { display: 'none' };
const photoPlaceholder: React.CSSProperties = { width: '100px', height: '100px', borderRadius: '12px', border: '2px dashed #ddd', display: 'flex', flexDirection: 'column' as const, alignItems: 'center', justifyContent: 'center', cursor: 'pointer', color: '#aaa', fontSize: '10px', textAlign: 'center' as const, gap: '5px' };
const photoPreviewWrapper: React.CSSProperties = { position: 'relative' as const };
const photoPreviewImg: React.CSSProperties = { width: '100px', height: '100px', objectFit: 'cover' as const, borderRadius: '12px', border: '1px solid #eee' };
const removePhotoBtn: React.CSSProperties = { position: 'absolute', top: '-5px', right: '-5px', backgroundColor: '#ff4444', color: 'white', border: 'none', borderRadius: '50%', width: '22px', height: '22px', fontSize: '12px', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center' };
const modalOverlayStyle: React.CSSProperties = { position: 'fixed', top: 0, left: 0, width: '100%', height: '100%', backgroundColor: 'rgba(0,0,0,0.5)', backdropFilter: 'blur(4px)', display: 'flex', justifyContent: 'center', alignItems: 'center', zIndex: 1000 };
const modalContentStyle: React.CSSProperties = { backgroundColor: '#fff', padding: '40px', borderRadius: '24px', width: '90%', maxWidth: '400px', textAlign: 'center' as const, boxShadow: '0 20px 40px rgba(0,0,0,0.1)' };
const checkCircleStyle: React.CSSProperties = { width: '80px', height: '80px', backgroundColor: '#f0fdf4', borderRadius: '50%', display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto 20px auto' };
const primaryActionBtn: React.CSSProperties = { padding: '14px', backgroundColor: '#00ccff', color: 'black', border: 'none', borderRadius: '12px', fontWeight: 'bold', cursor: 'pointer', width: '100%' };
const secondaryActionBtn: React.CSSProperties = { padding: '14px', backgroundColor: '#f5f5f5', color: '#666', border: 'none', borderRadius: '12px', fontWeight: 'bold', cursor: 'pointer', width: '100%' };