'use client';

import { useState, useEffect } from 'react';
import { createBrowserClient } from '@supabase/ssr'; // The SSR-friendly import

interface Location {
  id: string;
  label: string;
}

export default function AddItemModal({ 
  onClose, 
  onSuccess, 
  itemToEdit 
}: { 
  onClose: () => void; 
  onSuccess: () => void; 
  itemToEdit?: any; 
}) {
  // Initialize the Supabase client inside the component
  const supabase = createBrowserClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
  );

  const [loading, setLoading] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [availability, setAvailability] = useState('Available to borrow');
  const [locations, setLocations] = useState<Location[]>([]);
  const [imageUrls, setImageUrls] = useState<string[]>([]);

  useEffect(() => {
    async function fetchLocations() {
      const { data: { user } } = await supabase.auth.getUser();
      if (user) {
        const { data } = await supabase.from('locations').select('id, label').eq('user_id', user.id);
        if (data) setLocations(data);
      }
    }
    fetchLocations();
    
    if (itemToEdit) {
      setAvailability(itemToEdit.availability_status || 'Available to borrow');
      setImageUrls(itemToEdit.image_urls || []);
    }
  }, [itemToEdit, supabase]);

  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(e.target.files || []);
    if (files.length === 0) return;
    
    if (files.length + imageUrls.length > 4) {
      alert("Max 4 photos total.");
      return;
    }

    setUploading(true);
    const currentPhotos = [...imageUrls];

    try {
      for (const file of files) {
        const fileExt = file.name.split('.').pop();
        const fileName = `${Math.random()}.${fileExt}`;
        const filePath = `items/${fileName}`;

        const { error: uploadError } = await supabase.storage
          .from('gear-photos')
          .upload(filePath, file);

        if (uploadError) {
          console.error("Upload error:", uploadError);
          alert("Upload failed: " + uploadError.message);
          continue;
        }

        const { data } = supabase.storage.from('gear-photos').getPublicUrl(filePath);
        currentPhotos.push(data.publicUrl);
      }
      setImageUrls(currentPhotos);
    } catch (err) {
      console.error("File processing error:", err);
    } finally {
      setUploading(false);
      e.target.value = ""; 
    }
  };

  async function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setLoading(true);
    const formData = new FormData(e.currentTarget);
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return;

    const payload = {
      item_name: formData.get('item_name'),
      category: formData.get('category'),
      condition: formData.get('condition'),
      location_id: formData.get('location_id'),
      availability_status: availability, 
      description: formData.get('description'),
      pickup_by: formData.get('pickup_by') || null,
      return_by: formData.get('return_by') || null,
      damage_price: formData.get('damage_price') ? parseFloat(formData.get('damage_price') as string) : null,
      loss_price: formData.get('loss_price') ? parseFloat(formData.get('loss_price') as string) : null,
      image_urls: imageUrls, 
    };

    const { error } = itemToEdit 
      ? await supabase.from('gear_items').update(payload).eq('id', itemToEdit.id)
      : await supabase.from('gear_items').insert([{ ...payload, user_id: user.id }]);

    if (error) alert("Error: " + error.message);
    else onSuccess();
    setLoading(false);
  }

  // Styles
  const overlayStyle: React.CSSProperties = { position: 'fixed', top: 0, left: 0, right: 0, bottom: 0, backgroundColor: 'rgba(0,0,0,0.85)', display: 'flex', justifyContent: 'center', alignItems: 'center', zIndex: 1000 };
  const modalStyle: React.CSSProperties = { backgroundColor: '#000', padding: '30px', borderRadius: '12px', width: '100%', maxWidth: '550px', border: '1px solid #333', color: 'white', maxHeight: '90vh', overflowY: 'auto' };
  const sectionStyle: React.CSSProperties = { display: 'flex', flexDirection: 'column', gap: '8px' };
  const labelStyle: React.CSSProperties = { fontSize: '0.8rem', color: '#888', fontWeight: 'bold' };
  const inputStyle: React.CSSProperties = { padding: '10px', borderRadius: '8px', border: '1px solid #333', backgroundColor: '#111', color: 'white' };
  const radioContainerStyle: React.CSSProperties = { display: 'flex', flexDirection: 'column', gap: '10px', background: '#111', padding: '15px', borderRadius: '8px', border: '1px solid #222' };
  const radioLabelStyle: React.CSSProperties = { display: 'flex', alignItems: 'center', gap: '10px', cursor: 'pointer', fontSize: '1rem' };

  return (
    <div style={overlayStyle}>
      <div style={modalStyle}>
        <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '20px' }}>
          <h2 style={{ margin: 0 }}>{itemToEdit ? 'Edit Item' : 'List New Gear'}</h2>
          <button onClick={onClose} style={{ background: 'none', border: 'none', color: '#888', fontSize: '1.5rem', cursor: 'pointer' }}>✕</button>
        </div>

        <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
          <div style={sectionStyle}>
            <label style={labelStyle}>Item</label>
            <input name="item_name" defaultValue={itemToEdit?.item_name} required placeholder="e.g. Coleman Stove" style={inputStyle} />
          </div>

          <div style={{ display: 'flex', gap: '10px' }}>
            <div style={{...sectionStyle, flex: 1}}>
              <label style={labelStyle}>Category</label>
              <select name="category" defaultValue={itemToEdit?.category} style={inputStyle}>
                {["Bikes & Transport", "Kitchen & Cooking", "Lighting & Power", "Safety & First Aid", "Shelter & Shade", "Tools & Hardware", "Water & Graywater"].map(cat => <option key={cat}>{cat}</option>)}
              </select>
            </div>
            <div style={{...sectionStyle, flex: 1}}>
              <label style={labelStyle}>Condition</label>
              <select name="condition" defaultValue={itemToEdit?.condition} style={inputStyle}>
                {["New", "Good (Dusty)", "Well Used", "Beaten Up but Works"].map(cond => <option key={cond}>{cond}</option>)}
              </select>
            </div>
          </div>

          <div style={sectionStyle}>
            <label style={labelStyle}>Description</label>
            <textarea name="description" defaultValue={itemToEdit?.description} placeholder="Instructions?" style={{ ...inputStyle, minHeight: '60px' }} />
          </div>

          <div style={sectionStyle}>
            <label style={labelStyle}>Located At</label>
            <select name="location_id" defaultValue={itemToEdit?.location_id || ""} style={inputStyle} required>
              <option value="" disabled>-- Select Location --</option>
              {locations.map((loc) => <option key={loc.id} value={loc.id}>{loc.label}</option>)}
            </select>
          </div>

          <div style={sectionStyle}>
            <label style={labelStyle}>Availability</label>
            <div style={radioContainerStyle}>
              <label style={radioLabelStyle}>
                <input type="radio" value="Available to keep" checked={availability === 'Available to keep'} onChange={(e) => setAvailability(e.target.value)} />
                You can keep it (Gift)
              </label>
              <label style={radioLabelStyle}>
                <input type="radio" value="Available to borrow" checked={availability === 'Available to borrow'} onChange={(e) => setAvailability(e.target.value)} />
                You can borrow it
              </label>
              <label style={radioLabelStyle}>
                <input type="radio" value="Not Available" checked={availability === 'Not Available'} onChange={(e) => setAvailability(e.target.value)} />
                Not available
              </label>
            </div>

            {(availability === 'Available to borrow' || availability === 'Available to keep') && (
              <div style={{ marginTop: '15px', display: 'flex', flexDirection: 'column', gap: '15px' }}>
                <div style={{ display: 'flex', gap: '10px' }}>
                  <div style={{ flex: 1 }}>
                    <label style={labelStyle}>Pick up by</label>
                    <input type="date" name="pickup_by" defaultValue={itemToEdit?.pickup_by} style={inputStyle} />
                  </div>
                  {availability === 'Available to borrow' && (
                    <div style={{ flex: 1 }}>
                      <label style={labelStyle}>Return by</label>
                      <input type="date" name="return_by" defaultValue={itemToEdit?.return_by} style={inputStyle} />
                    </div>
                  )}
                </div>
                {availability === 'Available to borrow' && (
                  <>
                    <div>
                      <label style={labelStyle}>If returned damaged, you agree to pay me ($)</label>
                      <input type="number" name="damage_price" defaultValue={itemToEdit?.damage_price} placeholder="0.00" step="0.01" style={inputStyle} />
                    </div>
                    <div>
                      <label style={labelStyle}>If not returned, you agree to pay me ($)</label>
                      <input type="number" name="loss_price" defaultValue={itemToEdit?.loss_price} placeholder="0.00" step="0.01" style={inputStyle} />
                    </div>
                  </>
                )}
              </div>
            )}
          </div>

          <div style={sectionStyle}>
            <label style={labelStyle}>Photos (Max 4)</label>
            <input 
              type="file" 
              accept="image/*" 
              multiple 
              onChange={handleFileUpload} 
              disabled={uploading} 
              style={{...inputStyle, padding: '5px'}} 
            />
            
            <div style={{ display: 'flex', gap: '10px', marginTop: '10px', flexWrap: 'wrap' }}>
              {imageUrls.map((url, i) => (
                <div key={url + i} style={{ position: 'relative' }}>
                  <img 
                    src={url} 
                    alt="Preview"
                    style={{ width: '80px', height: '80px', objectFit: 'cover', borderRadius: '8px', border: '2px solid #00ccff' }} 
                  />
                  <button
                    type="button"
                    onClick={() => setImageUrls(imageUrls.filter((_, index) => index !== i))}
                    style={deleteButtonStyle}
                  >
                    ✕
                  </button>
                </div>
              ))}
            </div>
          </div>

          <button type="submit" disabled={loading || uploading} style={submitButtonStyle}>
            {uploading ? 'Uploading...' : loading ? 'Saving...' : itemToEdit ? 'Save Changes' : 'List Gear Item'}
          </button>
        </form>
      </div>
    </div>
  );
}

const deleteButtonStyle: React.CSSProperties = {
  position: 'absolute',
  top: '-5px',
  right: '-5px',
  background: 'red',
  color: 'white',
  border: 'none',
  borderRadius: '50%',
  width: '20px',
  height: '20px',
  fontSize: '12px',
  cursor: 'pointer',
  display: 'flex',
  alignItems: 'center',
  justifyContent: 'center',
  fontWeight: 'bold'
};

const submitButtonStyle: React.CSSProperties = {
  padding: '15px',
  backgroundColor: '#00ccff',
  color: 'black',
  border: 'none',
  borderRadius: '8px',
  fontWeight: 'bold',
  cursor: 'pointer'
};