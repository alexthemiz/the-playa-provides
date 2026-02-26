'use client';

import { useEffect, useState } from 'react';
import { useParams } from 'next/navigation';
import { supabase } from '@/lib/supabaseClient';
import Link from 'next/link';
import AvatarUpload from '@/components/AvatarUpload';
import { MapPin, Package } from 'lucide-react';

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
          .select('*, locations(city, state)')
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
      wish_list: profile.wish_list,
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

  const locationStr = [profile.city, profile.state].filter(Boolean).join(', ');

  return (
    <div style={{ padding: '40px 20px', maxWidth: '960px', margin: '0 auto', color: '#2D241E' }}>

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
              backgroundImage: profile.avatar_url ? `url(${profile.avatar_url})` : 'none',
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
                value={profile.preferred_name || ''}
                onChange={e => setProfile({ ...profile, preferred_name: e.target.value })}
              />
            ) : (
              <h1 style={{ fontSize: '2.8rem', margin: 0, color: '#2D241E' }}>{profile.preferred_name || username}</h1>
            )}
            <p style={{ color: '#888', margin: '4px 0 0' }}>@{username}</p>
            {locationStr && (
              <p style={{ display: 'flex', alignItems: 'center', gap: '4px', color: '#999', fontSize: '0.85rem', margin: '4px 0 0' }}>
                <MapPin size={13} />{locationStr}
              </p>
            )}
          </div>
        </div>

        {/* BIO + WISH LIST side by side */}
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '24px', marginTop: '25px' }}>
          <div>
            <h4 style={subheadStyle}>Bio</h4>
            {isEditing ? (
              <textarea
                style={editTextareaStyle}
                value={profile.bio || ''}
                onChange={e => setProfile({ ...profile, bio: e.target.value })}
              />
            ) : (
              <p style={{ fontSize: '1rem', color: '#444', margin: 0, lineHeight: '1.6' }}>
                {profile.bio || <span style={{ color: '#aaa', fontStyle: 'italic' as const }}>No bio yet.</span>}
              </p>
            )}
          </div>
          <div>
            <h4 style={subheadStyle}>Wish List</h4>
            {isEditing ? (
              <textarea
                placeholder="Items I'm on the lookout for"
                style={editTextareaStyle}
                value={profile.wish_list || ''}
                onChange={e => setProfile({ ...profile, wish_list: e.target.value })}
              />
            ) : (
              <p style={{ fontSize: '1rem', color: profile.wish_list ? '#444' : '#aaa', fontStyle: profile.wish_list ? 'normal' as const : 'italic' as const, margin: 0, lineHeight: '1.6' }}>
                {profile.wish_list || 'Items I\'m on the lookout for'}
              </p>
            )}
          </div>
        </div>

        {/* PLAYA HISTORY */}
        <div style={{ marginTop: '25px' }}>
          <h4 style={subheadStyle}>Playa History</h4>
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
              {(profile.burning_man_years || []).map((year: string) => (
                <span key={year} style={{ backgroundColor: '#fdf3ec', padding: '5px 12px', borderRadius: '20px', color: '#C08261', border: '1px solid #f0d8c8', fontSize: '0.85rem', fontWeight: 'bold' }}>
                  {year}
                </span>
              ))}
              {(!profile.burning_man_years || profile.burning_man_years.length === 0) && (
                <span style={{ color: '#aaa', fontStyle: 'italic' as const, fontSize: '0.9rem' }}>No years listed yet.</span>
              )}
            </div>
          )}
        </div>
      </header>

      {/* AVAILABLE ITEMS */}
      <section style={{ marginTop: '40px' }}>
        <h2 style={{ color: '#2D241E', marginBottom: '16px', fontSize: '20px' }}>Available Items</h2>
        {items.length === 0 ? (
          <p style={{ color: '#aaa', fontSize: '0.9rem' }}>No items listed yet.</p>
        ) : (
          <div style={{ display: 'flex', flexDirection: 'column' as const, gap: '2px' }}>
            <div style={listHeaderStyle}>
              <div />
              <div>Item</div>
              <div>Description</div>
              <div>Category</div>
              <div>Location</div>
              <div>Terms</div>
              <div />
            </div>
            {items.map(item => {
              const loc = item.locations
                ? [item.locations.city, item.locations.state].filter(Boolean).join(', ')
                : '—';
              const termsSummary = [
                item.return_by ? `Return by ${new Date(item.return_by).toLocaleDateString()}` : null,
                item.damage_price ? `Damage agr. $${item.damage_price}` : null,
                item.loss_price ? `Loss agr. $${item.loss_price}` : null,
                item.return_terms ? 'Custom terms' : null,
              ].filter(Boolean).join(' · ');

              return (
                <div key={item.id} style={listRowStyle}>
                  <div style={listImgStyle}>
                    {item.image_urls?.[0]
                      ? <img src={item.image_urls[0]} alt="" style={{ width: '100%', height: '100%', objectFit: 'contain' as const }} />
                      : <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', height: '100%', color: '#ccc' }}><Package size={16} /></div>
                    }
                  </div>
                  <div style={{ overflow: 'hidden' }}>
                    <div style={{ fontWeight: '600', color: '#111', fontSize: '14px' }}>{item.item_name}</div>
                    <div style={{ fontSize: '10px', color: '#00ccff', fontWeight: 'bold', textTransform: 'uppercase' as const, marginTop: '2px' }}>
                      {item.availability_status === 'Available to Keep' ? 'Keep' : 'Borrow'}
                    </div>
                  </div>
                  <div style={listColStyle}>{item.description || '—'}</div>
                  <div style={listColStyle}>{item.category}</div>
                  <div style={{ ...listColStyle, display: 'flex', alignItems: 'center', gap: '3px' }}>
                    <MapPin size={11} style={{ flexShrink: 0 }} />{loc}
                  </div>
                  <div style={{ ...listColStyle, fontSize: '11px', color: '#888' }}>{termsSummary || '—'}</div>
                  <div style={{ flexShrink: 0 }}>
                    <Link href={`/find-items/${item.id}`} style={{ color: '#00ccff', textDecoration: 'none', fontWeight: 'bold', fontSize: '12px' }}>View →</Link>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </section>
    </div>
  );
}

// --- STYLES ---
const LIST_COLS = '50px 160px 1fr 140px 120px 1fr 60px';

const subheadStyle: React.CSSProperties = { color: '#888', textTransform: 'uppercase', fontSize: '0.8rem', marginBottom: '8px', marginTop: 0 };
const editTextareaStyle: React.CSSProperties = { width: '100%', backgroundColor: '#fff', color: '#2D241E', border: '1px solid #ddd', padding: '10px', height: '80px', borderRadius: '6px', boxSizing: 'border-box', outline: 'none' };
const listHeaderStyle: React.CSSProperties = { display: 'grid', gridTemplateColumns: LIST_COLS, gap: '10px', padding: '8px 12px', fontSize: '10px', fontWeight: '700', color: '#aaa', textTransform: 'uppercase', letterSpacing: '0.06em', borderBottom: '2px solid #eee' };
const listRowStyle: React.CSSProperties = { display: 'grid', gridTemplateColumns: LIST_COLS, gap: '10px', alignItems: 'center', padding: '10px 12px', backgroundColor: '#fff', borderBottom: '1px solid #f5f5f5' };
const listImgStyle: React.CSSProperties = { width: '50px', height: '50px', borderRadius: '6px', overflow: 'hidden', backgroundColor: '#000', flexShrink: 0 };
const listColStyle: React.CSSProperties = { fontSize: '12px', color: '#666', overflow: 'hidden', whiteSpace: 'nowrap' };
