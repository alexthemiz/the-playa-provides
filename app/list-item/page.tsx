'use client';

import { useState, useEffect } from 'react';
import { supabase } from '@/lib/supabaseClient';
import Link from 'next/link';
import { useRouter } from 'next/navigation';

// The Master List
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
  const router = useRouter(); // This fixes "Cannot find name 'router'"
  const [message, setMessage] = useState(''); // This fixes "Cannot find name 'setMessage'"
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
       damage_price: formData.get('damage_price') 
  ? parseInt(formData.get('damage_price') as string, 10) 
  : null,
loss_price: formData.get('loss_price') 
  ? parseInt(formData.get('loss_price') as string, 10) 
  : null,
  image_urls: imageUrls, 
 return_terms: formData.get('return_terms'),
  },
]);

if (error) {
  setMessage(`Error: ${error.message}`);
} else {
  // Instead of router.push, we show the modal
  setShowSuccessModal(true);
}
setLoading(false);
  }

  return (
    <div style={{ padding: '20px', maxWidth: '600px', margin: '0 auto', color: 'white' }}>
      <Link href="/inventory" style={{ color: '#00ccff', textDecoration: 'none' }}>← Back to Inventory Hub</Link>
      <h1 style={{ marginTop: '20px' }}>List New Gear</h1>
      
      <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '20px', marginTop: '30px' }}>
        
        <div style={sectionStyle}>
          <label style={labelStyle}>Item</label>
          <input name="item_name" required placeholder="e.g. Coleman 2-Burner Stove" style={inputStyle} />
        </div>

        <div style={sectionStyle}>
          <label style={labelStyle}>Category</label>
          <select name="category" style={inputStyle}>
            {CATEGORIES.map(cat => (
               <option key={cat}>{cat}</option>
            ))}
          </select>
        </div>

        <div style={sectionStyle}>
          <label style={labelStyle}>Condition</label>
          <select name="condition" style={inputStyle}>
            {["New", "Good (Dusty)", "Well Used", "Beaten Up but Works"].map(cond => (
              <option key={cond}>{cond}</option>
            ))}
          </select>
        </div>

        <div style={sectionStyle}>
          <label style={labelStyle}>Description</label>
          <textarea name="description" placeholder="Any special instructions?" style={{ ...inputStyle, minHeight: '80px' }} />
        </div>

        <div style={sectionStyle}>
          <label style={labelStyle}>Located At</label>
          <select name="location_id" style={inputStyle} required defaultValue="">
            <option value="" disabled>-- Select a Saved Location --</option>
            {locations.map((loc) => (
              <option key={loc.id} value={loc.id}>{loc.label}</option>
            ))}
          </select>
        </div>

        <div style={sectionStyle}>
          <label style={labelStyle}>Availability</label>
          <div style={radioContainerStyle}>
            {['Available to keep', 'Available to borrow', 'Not Available'].map(status => (
              <label key={status} style={radioLabelStyle}>
                <input type="radio" value={status} checked={availability === status} onChange={(e) => setAvailability(e.target.value)} />
                {status === 'Available to keep' ? 'You can keep it (Gift)' : status === 'Available to borrow' ? 'You can borrow it' : 'Not available - just add to inventory'}
              </label>
            ))}
          </div>

          {availability !== 'Not Available' && (
            <div style={{ marginTop: '15px', display: 'flex', flexDirection: 'column', gap: '15px' }}>
              <div style={{ display: 'flex', gap: '10px' }}>
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
                <>
                  <div>
                    <label style={labelStyle}>If returned damaged, you agree to pay me ($)</label>
                    <input type="number" name="damage_price" placeholder="0.00" step="1" style={inputStyle} />
                  </div>
                  <div>
                    <label style={labelStyle}>If not returned, you agree to pay me ($)</label>
                    <input type="number" name="loss_price" placeholder="0.00" step="1" style={inputStyle} />
                  </div>
                </>
              )}
            </div>
          )}

        </div>
<div>
  <label style={labelStyle}>Return Terms & Condition</label>
  <textarea 
    placeholder="e.g. Must be returned vinegar-washed and air-dried. Please shake out all dust before returning."
    style={inputStyle} 
    rows={3}
    value={returnTerms}
    onChange={(e) => setReturnTerms(e.target.value)}
  />
  <p style={{ color: '#555', fontSize: '12px', marginTop: '5px' }}>
    Help the borrower understand exactly how this item should be cleaned or packed when they bring it back.
  </p>
</div>
        <div style={sectionStyle}>
          <label style={labelStyle}>Photos (Max 4)</label>
          <input type="file" accept="image/*" multiple onChange={handleFileUpload} disabled={uploading} style={{...inputStyle, padding: '5px'}} />
          <div style={{ display: 'flex', gap: '10px', marginTop: '10px', flexWrap: 'wrap' }}>
            {imageUrls.map((url, i) => (
              <div key={url + i} style={{ position: 'relative' }}>
                <img src={url} style={{ width: '80px', height: '80px', objectFit: 'cover', borderRadius: '8px', border: '2px solid #00ccff' }} alt="Preview" />
                <button
                  type="button"
                  onClick={() => setImageUrls(imageUrls.filter((_, idx) => idx !== i))}
                  style={removeButtonStyle}
                >✕</button>
              </div>
            ))}
          </div>
        </div>

        <button 
          type="submit" 
          disabled={loading || uploading}
          style={submitButtonStyle}
        >
          {uploading ? 'Uploading...' : loading ? 'Listing Item...' : 'List Gear Item'}
        </button>
      </form>

                {showSuccessModal && (
  <div className="fixed inset-0 bg-black/90 backdrop-blur-sm z-[100] flex items-center justify-center p-4">
    <div className="bg-zinc-900 border border-zinc-800 w-full max-w-sm rounded-2xl p-8 text-center shadow-2xl">
      <div className="w-16 h-16 bg-green-500/10 border border-green-500/20 rounded-full flex items-center justify-center mx-auto mb-6">
        <svg className="w-8 h-8 text-green-500" fill="none" viewBox="0 0 24 24" stroke="currentColor">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M5 13l4 4L19 7" />
        </svg>
      </div>
      
      <h2 className="text-2xl font-bold text-white mb-2">Item Listed!</h2>
      <p className="text-zinc-400 mb-8 text-sm">Your gear is now visible to the community.</p>

      <div className="flex flex-col gap-3">
        <button 
          onClick={() => {
            setShowSuccessModal(false);
            // Reset the form here if you want to add another
            window.location.reload(); 
          }}
          className="w-full bg-blue-600 hover:bg-blue-500 text-white font-bold py-3 rounded-xl transition-all"
        >
          Add Another Item
        </button>
        
        <button 
          onClick={() => router.push('/inventory')}
          className="w-full bg-zinc-800 hover:bg-zinc-700 text-white font-bold py-3 rounded-xl transition-all"
        >
          Go to My Inventory
        </button>
      </div>
    </div>
  </div>
)}
    </div>
  );
}

// STYLES
const sectionStyle = { display: 'flex', flexDirection: 'column' as 'column', gap: '8px' };
const labelStyle = { fontSize: '0.9rem', color: '#888', fontWeight: 'bold' };
const inputStyle = { padding: '12px', borderRadius: '8px', border: '1px solid #333', backgroundColor: '#111', color: 'white' };
const radioContainerStyle = { display: 'flex', flexDirection: 'column' as 'column', gap: '10px', background: '#111', padding: '15px', borderRadius: '8px', border: '1px solid #222' };
const radioLabelStyle = { display: 'flex', alignItems: 'center', gap: '10px', cursor: 'pointer', fontSize: '1rem' };
const removeButtonStyle: React.CSSProperties = { position: 'absolute', top: '-5px', right: '-5px', background: 'red', color: 'white', border: 'none', borderRadius: '50%', width: '20px', height: '20px', fontSize: '12px', cursor: 'pointer', fontWeight: 'bold' };
const submitButtonStyle = { padding: '15px', backgroundColor: '#00ccff', color: 'black', border: 'none', borderRadius: '8px', fontWeight: 'bold', cursor: 'pointer', fontSize: '1rem' };