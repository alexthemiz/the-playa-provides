'use client';

import { useEffect, useState } from 'react';
import { useParams } from 'next/navigation';
import { supabase } from '@/lib/supabaseClient';
import Link from 'next/link';
import AvatarUpload from '@/components/AvatarUpload';

export default function PublicProfilePage() {
  const params = useParams();
  const username = params.username as string;
  
  const [profile, setProfile] = useState<any>(null);
  const [items, setItems] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [isEditing, setIsEditing] = useState(false);
  const [isOwner, setIsOwner] = useState(false);

  // Year Options for the edit grid
  const startYear = 1986;
  const currentYear = 2026;
  const YEAR_OPTIONS = Array.from({ length: currentYear - startYear + 1 }, (_, i) => (currentYear - i).toString());

  useEffect(() => {
    async function fetchProfileAndGear() {
      setLoading(true);
      const { data: { user } } = await supabase.auth.getUser();

      const { data: profileData } = await supabase
        .from('profiles')
        .select('*')
        .eq('username', username)
        .single();

      if (profileData) {
        setProfile(profileData);
        // Check if the logged-in person owns this profile
        if (user && user.id === profileData.id) {
          setIsOwner(true);
        }

        const { data: gearData } = await supabase
          .from('gear_items')
          .select('*')
          .eq('user_id', profileData.id)
          .in('availability_status', ['You can keep it', 'You can borrow it']);

        setItems(gearData || []);
      }
      setLoading(false);
    }
    if (username) fetchProfileAndGear();
  }, [username]);

  const handleSave = async () => {
    const { error } = await supabase.from('profiles').update({
      bio: profile.bio,
      preferred_name: profile.preferred_name,
      burning_man_years: profile.burning_man_years,
      burning_man_camp: profile.burning_man_camp,
      avatar_url: profile.avatar_url
    }).eq('id', profile.id);

    if (error) alert("Error updating profile");
    else setIsEditing(false);
  };

  const toggleYear = (year: string) => {
    const years = profile.burning_man_years || [];
    const newYears = years.includes(year) 
      ? years.filter((y: string) => y !== year) 
      : [...years, year];
    setProfile({...profile, burning_man_years: newYears});
  };

  if (loading) return <div style={{ color: 'white', padding: '40px' }}>Loading...</div>;
  if (!profile) return <div style={{ color: 'white', padding: '40px' }}>User not found.</div>;

  return (
    <div style={{ padding: '40px 20px', maxWidth: '850px', margin: '0 auto', color: 'white' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <Link href="/find-items" style={{ color: '#aaa', textDecoration: 'none' }}>← Find Items</Link>
        {isOwner && (
          <button 
            onClick={() => isEditing ? handleSave() : setIsEditing(true)}
            style={{ padding: '8px 20px', backgroundColor: isEditing ? '#4CAF50' : '#333', color: 'white', border: 'none', borderRadius: '5px', cursor: 'pointer' }}
          >
            {isEditing ? 'Save Profile' : 'Edit Profile'}
          </button>
        )}
      </div>

      <header style={{ marginTop: '30px', borderBottom: '1px solid #333', paddingBottom: '30px' }}>
        <div style={{ display: 'flex', gap: '25px' }}>
          {isEditing ? (
            <AvatarUpload url={profile.avatar_url} onUpload={(url) => setProfile({...profile, avatar_url: url})} />
          ) : (
            <div style={{ width: '90px', height: '90px', borderRadius: '50%', backgroundColor: '#222', backgroundImage: `url(${profile.avatar_url})`, backgroundSize: 'cover', backgroundPosition: 'center', border: '4px solid #d4a373' }}>
               {!profile.avatar_url && <span style={{display: 'flex', justifyContent: 'center', alignItems: 'center', height: '100%', fontSize: '2rem'}}>{profile.preferred_name?.charAt(0)}</span>}
            </div>
          )}
          
          <div style={{ flex: 1 }}>
            {isEditing ? (
              <input 
                style={{ background: '#000', color: 'white', border: '1px solid #444', fontSize: '2rem', width: '100%', padding: '5px' }}
                value={profile.preferred_name} 
                onChange={e => setProfile({...profile, preferred_name: e.target.value})} 
              />
            ) : (
              <h1 style={{ fontSize: '2.8rem', margin: 0 }}>{profile.preferred_name || username}</h1>
            )}
            <p style={{ color: '#888' }}>@{username}</p>
          </div>
        </div>

        <div style={{ marginTop: '25px' }}>
          <h4 style={{ color: '#555', textTransform: 'uppercase', fontSize: '0.8rem' }}>Bio</h4>
          {isEditing ? (
            <textarea 
              style={{ width: '100%', background: '#000', color: 'white', border: '1px solid #444', padding: '10px', height: '80px' }}
              value={profile.bio}
              onChange={e => setProfile({...profile, bio: e.target.value})}
            />
          ) : (
            <p style={{ fontSize: '1.1rem', color: '#ddd' }}>{profile.bio || "No bio yet."}</p>
          )}
        </div>

        <div style={{ marginTop: '25px' }}>
          <h4 style={{ color: '#555', textTransform: 'uppercase', fontSize: '0.8rem' }}>Playa History</h4>
          {isEditing ? (
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(70px, 1fr))', gap: '5px', maxHeight: '150px', overflowY: 'auto', border: '1px solid #333', padding: '10px' }}>
              {YEAR_OPTIONS.map(year => (
                <label key={year} style={{ fontSize: '0.7rem' }}>
                  <input type="checkbox" checked={profile.burning_man_years?.includes(year)} onChange={() => toggleYear(year)} />
                  {year}
                </label>
              ))}
            </div>
          ) : (
            <div style={{ display: 'flex', flexWrap: 'wrap', gap: '8px' }}>
              {profile.burning_man_years?.map((year: string) => (
                <span key={year} style={{ backgroundColor: '#2a2a2a', padding: '5px 12px', borderRadius: '20px', color: '#d4a373' }}>{year}</span>
              ))}
            </div>
          )}
        </div>
      </header>

      {/* Gear Grid (remains same as before) */}
      <section style={{ marginTop: '40px' }}>
        <h2>Available Gear</h2>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(250px, 1fr))', gap: '20px' }}>
          {items.map(item => (
            <div key={item.id} style={{ padding: '20px', backgroundColor: '#111', border: '1px solid #222', borderRadius: '10px' }}>
              <h3>{item.item_name}</h3>
              <p style={{ color: '#888' }}>{item.category}</p>
            </div>
          ))}
        </div>
      </section>
    </div>
  );
}