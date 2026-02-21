'use client';
import { useState } from 'react';
import { supabase } from '@/lib/supabaseClient';

export default function AvatarUpload({ url, onUpload }: { url: string; onUpload: (url: string) => void }) {
  const [uploading, setUploading] = useState(false);

  async function uploadAvatar(event: any) {
    try {
      setUploading(true);
      if (!event.target.files || event.target.files.length === 0) throw new Error('Select an image.');

      const file = event.target.files[0];
      const fileExt = file.name.split('.').pop();
      const fileName = `${Math.random()}.${fileExt}`;
      const filePath = `avatars/${fileName}`;

      const { error: uploadError } = await supabase.storage.from('avatars').upload(filePath, file);
      if (uploadError) throw uploadError;

      const { data } = supabase.storage.from('avatars').getPublicUrl(filePath);
      onUpload(data.publicUrl);
    } catch (error: any) {
      alert(error.message);
    } finally {
      setUploading(false);
    }
  }

  return (
    <div style={{ display: 'flex', alignItems: 'center', gap: '20px' }}>
      <div style={{ width: '80px', height: '80px', borderRadius: '50%', backgroundColor: '#222', backgroundImage: `url(${url})`, backgroundSize: 'cover', backgroundPosition: 'center', border: '2px solid #333' }} />
      <input type="file" accept="image/*" onChange={uploadAvatar} disabled={uploading} style={{ fontSize: '0.8rem' }} />
    </div>
  );
}