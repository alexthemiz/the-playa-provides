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
        if (user && user.id === profileData.id) setIsOwner(true);

        const { data: gearData } = await supabase
          .from('gear_items')
          .select('*')
          .eq('user_id', profileData.id)
          .in('availability_status', ['Available to Keep', 'Available to Borrow']);

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
      avatar_url: profile.avatar_url,
    }).eq('id', profile.id);

    if (error) alert('Error updating profile');
    else setIsEditing(false);
  };

  const toggleYear = (year: string) => {
    const years = profile.burning_man_years || [];
    const newYears = years.includes(year)
      ? years.filter((y: string) => y !== year)
      : [...years, year];
    setProfile({ ...profile, burning_man_years: newYears });
  };

  if (loading) return <div style={{ color: '#2D241E', padding: '40px' }}>Loading...</div>;
  if (!profile) return <div style={{ color: '#2D241E', padding: '40px' }}>User not found.</div>;

  return (
    <div style={{ padding: '40px 20px', maxWidth: '850px', margin: '0 auto', color: '#2D241E' }}>

      {/* NAV ROW */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <Link href="/find-items" style={{ color: '#888', textDecoration: 'none' }}>← Find Items</Link>
        {isOwner && (
          <button
            onClick={() => isEditing ? handleSave() : setIsEditing(true)}
            style={{
              padding: '8px 20px',
              backgroundColor: isEditing ? '#4CAF50' : '#00ccff',
              color: isEditing ? '#fff' : '#000',
              border: 'none', borderRadius: '6px', cursor: 'pointer', fontWeight: 'bold',
            }}
          >
            {isEditing ? 'Save Profile' : 'Edit Profile'}
          </button>
        )}
      </div>

      {/* PROFILE HEADER */}
      <header style={{ marginTop: '30px', borderBottom: '1px solid #e5e5e5', paddingBottom: '30px' }}>
        <div style={{ display: 'flex', gap: '25px' }}>
          {isEditing ? (
            <AvatarUpload url={profile.avatar_url} onUpload={(url) => setProfile({ ...profile, avatar_url: url })} />
          ) : (
            <div style={{
              width: '90px', height: '90px', borderRadius: '50%',
              backgroundColor: '#f0f0f0',
              backgroundImage: `url(${profile.avatar_url})`,
              backgroundSize: 'cover', backgroundPosition: 'center',
              border: '4px solid #C08261', flexShrink: 0,
            }}>
              {!profile.avatar_url && (
                <span style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', height: '100%', fontSize: '2rem', color: '#C08261' }}>
                  {profile.preferred_name?.charAt(0)}
                </span>
              )}
            </div>
          )}

          <div style={{ flex: 1 }}>
            {isEditing ? (
              <input
                style={{ backgroundColor: '#fff', color: '#2D241E', border: '1px solid #ddd', fontSize: '2rem', width: '100%', padding: '5px', borderRadius: '6px' }}
                value={profile.preferred_name}
                onChange={e => setProfile({ ...profile, preferred_name: e.target.value })}
              />
            ) : (
              <h1 style={{ fontSize: '2.8rem', margin: 0, color: '#2D241E' }}>{profile.preferred_name || username}</h1>
            )}
            <p style={{ color: '#888', margin: '4px 0 0' }}>@{username}</p>
          </div>
        </div>

        {/* BIO */}
        <div style={{ marginTop: '25px' }}>
          <h4 style={{ color: '#888', textTransform: 'uppercase' as const, fontSize: '0.8rem', marginBottom: '8px' }}>Bio</h4>
          {isEditing ? (
            <textarea
              style={{ width: '100%', backgroundColor: '#fff', color: '#2D241E', border: '1px solid #ddd', padding: '10px', height: '80px', borderRadius: '6px', boxSizing: 'border-box' as const }}
              value={profile.bio}
              onChange={e => setProfile({ ...profile, bio: e.target.value })}
            />
          ) : (
            <p style={{ fontSize: '1.1rem', color: '#444' }}>{profile.bio || 'No bio yet.'}</p>
          )}
        </div>

        {/* PLAYA HISTORY */}
        <div style={{ marginTop: '25px' }}>
          <h4 style={{ color: '#888', textTransform: 'uppercase' as const, fontSize: '0.8rem', marginBottom: '8px' }}>Playa History</h4>
          {isEditing ? (
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(70px, 1fr))', gap: '5px', maxHeight: '150px', overflowY: 'auto' as const, border: '1px solid #e5e5e5', padding: '10px', borderRadius: '6px' }}>
              {YEAR_OPTIONS.map(year => (
                <label key={year} style={{ fontSize: '0.75rem', color: '#2D241E', cursor: 'pointer' }}>
                  <input type="checkbox" checked={profile.burning_man_years?.includes(year)} onChange={() => toggleYear(year)} style={{ marginRight: '4px' }} />
                  {year}
                </label>
              ))}
            </div>
          ) : (
            <div style={{ display: 'flex', flexWrap: 'wrap' as const, gap: '8px' }}>
              {profile.burning_man_years?.map((year: string) => (
                <span key={year} style={{ backgroundColor: '#fdf3ec', padding: '5px 12px', borderRadius: '20px', color: '#C08261', border: '1px solid #f0d8c8', fontSize: '0.85rem', fontWeight: 'bold' }}>
                  {year}
                </span>
              ))}
            </div>
          )}
        </div>
      </header>

      {/* AVAILABLE GEAR */}
      <section style={{ marginTop: '40px' }}>
        <h2 style={{ color: '#2D241E', marginBottom: '20px' }}>Available Gear</h2>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(250px, 1fr))', gap: '20px' }}>
          {items.map(item => (
            <div key={item.id} style={{ padding: '20px', backgroundColor: '#f9f9f9', border: '1px solid #eee', borderRadius: '10px' }}>
              <h3 style={{ margin: '0 0 6px', color: '#2D241E' }}>{item.item_name}</h3>
              <p style={{ color: '#888', margin: 0, fontSize: '0.9rem' }}>{item.category}</p>
            </div>
          ))}
          {items.length === 0 && (
            <p style={{ color: '#aaa', fontSize: '0.9rem' }}>No gear listed yet.</p>
          )}
        </div>
      </section>
    </div>
  );
}
