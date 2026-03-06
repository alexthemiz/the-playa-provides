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
  const [currentUserId, setCurrentUserId] = useState<string | null>(null);
  const [isFollowing, setIsFollowing] = useState(false);
  const [followerCount, setFollowerCount] = useState(0);
  const [followLoading, setFollowLoading] = useState(false);
  const [followError, setFollowError] = useState<string | null>(null);
  const [followingCount, setFollowingCount] = useState(0);
  const [openList, setOpenList] = useState<'followers' | 'following' | null>(null);
  const [followersList, setFollowersList] = useState<any[]>([]);
  const [followingList, setFollowingList] = useState<any[]>([]);
  const [listLoading, setListLoading] = useState(false);

  const startYear = 1986;
  const currentYear = 2026;
  const YEAR_OPTIONS = Array.from({ length: currentYear - startYear + 1 }, (_, i) => (currentYear - i).toString());

  useEffect(() => {
    async function fetchProfileAndGear() {
      setLoading(true);
      try {
        // getSession reads the local cache — no network call, won't hang
        const { data: { session } } = await supabase.auth.getSession();
        const sessionUserId = session?.user?.id ?? null;

        const { data: profileData } = await supabase
          .from('profiles')
          .select('*')
          .eq('username', username)
          .single();

        if (profileData) {
          setProfile(profileData);
          if (sessionUserId && sessionUserId === profileData.id) setIsOwner(true);
          setCurrentUserId(sessionUserId);

          // Fetch follower count
          const { count, error: followerErr } = await supabase
            .from('user_follows')
            .select('*', { count: 'exact', head: true })
            .eq('following_id', profileData.id);
          if (followerErr) console.error('follower count error:', followerErr.message);
          setFollowerCount(count ?? 0);

          // Fetch following count
          const { count: followingCnt, error: followingErr } = await supabase
            .from('user_follows')
            .select('*', { count: 'exact', head: true })
            .eq('follower_id', profileData.id);
          if (followingErr) console.error('following count error:', followingErr.message);
          setFollowingCount(followingCnt ?? 0);

          // Check if current user follows this profile
          if (sessionUserId && sessionUserId !== profileData.id) {
            const { data: followRow } = await supabase
              .from('user_follows')
              .select('follower_id')
              .eq('follower_id', sessionUserId)
              .eq('following_id', profileData.id)
              .maybeSingle();
            setIsFollowing(!!followRow);
          }

          const { data: gearData } = await supabase
            .from('gear_items')
            .select('*, locations(city, state)')
            .eq('user_id', profileData.id)
            .in('availability_status', ['Available to Keep', 'Available to Borrow']);

          setItems(gearData || []);
        }
      } catch (err) {
        console.error('Profile fetch error:', err);
      } finally {
        setLoading(false);
      }
    }
    if (username) fetchProfileAndGear();
  }, [username]);

  const handleFollowToggle = async () => {
    if (!currentUserId || !profile) return;
    setFollowLoading(true);
    setFollowError(null);
    try {
      if (isFollowing) {
        const { error: delErr } = await supabase
          .from('user_follows')
          .delete()
          .eq('follower_id', currentUserId)
          .eq('following_id', profile.id);
        if (delErr) throw new Error(delErr.message);
        setIsFollowing(false);
        setFollowerCount(c => c - 1);
      } else {
        const { error: insErr } = await supabase
          .from('user_follows')
          .insert({ follower_id: currentUserId, following_id: profile.id });
        if (insErr) throw new Error(insErr.message);
        setIsFollowing(true);
        setFollowerCount(c => c + 1);
      }
    } catch (err) {
      console.error('Follow toggle error:', err);
      setFollowError('Could not update. Please try again.');
    } finally {
      setFollowLoading(false);
    }
  };

  const fetchList = async (type: 'followers' | 'following') => {
    // Skip if already loaded
    if (type === 'followers' && followersList.length > 0) return;
    if (type === 'following' && followingList.length > 0) return;

    setListLoading(true);
    try {
      let profiles: any[] = [];

      if (type === 'followers') {
        const { data, error } = await supabase
          .from('user_follows')
          .select('follower:profiles!follower_id(id, username, preferred_name, avatar_url)')
          .eq('following_id', profile.id);
        if (error) console.error('fetchList followers error:', error.message);
        profiles = (data || []).map((r: any) => r.follower).filter(Boolean);
      } else {
        const { data, error } = await supabase
          .from('user_follows')
          .select('following:profiles!following_id(id, username, preferred_name, avatar_url)')
          .eq('follower_id', profile.id);
        if (error) console.error('fetchList following error:', error.message);
        profiles = (data || []).map((r: any) => r.following).filter(Boolean);
      }

      const userIds = profiles.map((p: any) => p.id);

      if (userIds.length === 0) {
        if (type === 'followers') setFollowersList([]);
        else setFollowingList([]);
        return;
      }

      // Batch-fetch gear counts
      const { data: gearRows, error: gearErr } = await supabase
        .from('gear_items')
        .select('user_id, availability_status')
        .in('user_id', userIds)
        .in('availability_status', ['Available to Borrow', 'Available to Keep']);
      if (gearErr) console.error('fetchList gear error:', gearErr.message);

      const borrowCounts: Record<string, number> = {};
      const keepCounts: Record<string, number> = {};
      for (const row of gearRows || []) {
        if (row.availability_status === 'Available to Borrow') {
          borrowCounts[row.user_id] = (borrowCounts[row.user_id] || 0) + 1;
        } else {
          keepCounts[row.user_id] = (keepCounts[row.user_id] || 0) + 1;
        }
      }

      // Check which ones the owner follows
      let followingSet = new Set<string>();
      if (type === 'followers' && currentUserId) {
        const { data: followRows, error: followErr } = await supabase
          .from('user_follows')
          .select('following_id')
          .eq('follower_id', currentUserId)
          .in('following_id', userIds);
        if (followErr) console.error('fetchList follow check error:', followErr.message);
        followingSet = new Set((followRows || []).map((r: any) => r.following_id));
      } else if (type === 'following') {
        followingSet = new Set(userIds); // owner follows all of them by definition
      }

      const entries = profiles.map((p: any) => ({
        id: p.id,
        username: p.username,
        preferred_name: p.preferred_name,
        avatar_url: p.avatar_url,
        borrowCount: borrowCounts[p.id] || 0,
        keepCount: keepCounts[p.id] || 0,
        isFollowing: followingSet.has(p.id),
      }));

      if (type === 'followers') setFollowersList(entries);
      else setFollowingList(entries);

    } catch (err: any) {
      console.error('fetchList unexpected error:', err.message);
    } finally {
      setListLoading(false);
    }
  };

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

      {/* NAV ROW + error */}
      <div>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <Link href="/find-items" style={{ color: '#888', textDecoration: 'none' }}>← Find Items</Link>
          <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
            {isOwner ? (
              <div style={{ display: 'flex', alignItems: 'center', gap: '6px', fontSize: '0.85rem' }}>
                <button
                  onClick={() => {
                    const next = openList === 'followers' ? null : 'followers' as const;
                    setOpenList(next);
                    if (next === 'followers') fetchList('followers');
                  }}
                  style={{
                    background: 'none', border: 'none', cursor: 'pointer', padding: 0,
                    color: openList === 'followers' ? '#00aacc' : '#888',
                    fontWeight: openList === 'followers' ? 600 : 400,
                    fontSize: '0.85rem',
                  }}
                >
                  {followerCount} {followerCount === 1 ? 'follower' : 'followers'}
                </button>
                <span style={{ color: '#ccc' }}>·</span>
                <button
                  onClick={() => {
                    const next = openList === 'following' ? null : 'following' as const;
                    setOpenList(next);
                    if (next === 'following') fetchList('following');
                  }}
                  style={{
                    background: 'none', border: 'none', cursor: 'pointer', padding: 0,
                    color: openList === 'following' ? '#00aacc' : '#888',
                    fontWeight: openList === 'following' ? 600 : 400,
                    fontSize: '0.85rem',
                  }}
                >
                  {followingCount} following
                </button>
              </div>
            ) : (
              followerCount > 0 && (
                <span style={{ fontSize: '0.85rem', color: '#888' }}>
                  {followerCount} {followerCount === 1 ? 'follower' : 'followers'}
                </span>
              )
            )}
            {isOwner ? (
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
            ) : currentUserId ? (
              <button
                onClick={handleFollowToggle}
                disabled={followLoading}
                style={{
                  padding: '8px 20px',
                  backgroundColor: isFollowing ? '#f0f0f0' : '#00ccff',
                  color: isFollowing ? '#666' : '#000',
                  border: isFollowing ? '1px solid #ddd' : 'none',
                  borderRadius: '6px', cursor: followLoading ? 'default' : 'pointer',
                  fontWeight: 'bold', opacity: followLoading ? 0.6 : 1,
                }}
              >
                {followLoading ? '...' : isFollowing ? 'Following' : 'Follow'}
              </button>
            ) : null}
          </div>
        </div>
        {followError && (
          <p style={{ fontSize: '0.8rem', color: '#dc2626', margin: '6px 0 0', textAlign: 'right' as const }}>
            {followError}
          </p>
        )}
      </div>

      {/* FOLLOWERS / FOLLOWING EXPANDABLE LIST */}
      {isOwner && openList && (
        <div style={{ marginTop: '12px', border: '1px solid #e5e5e5', borderRadius: '10px', overflow: 'hidden' as const }}>
          {/* Column headers */}
          <div style={{
            display: 'grid',
            gridTemplateColumns: '40px 1fr 110px 90px 80px',
            gap: '12px', alignItems: 'center',
            padding: '8px 16px',
            fontSize: '10px', fontWeight: 700, color: '#aaa',
            textTransform: 'uppercase' as const, letterSpacing: '0.06em',
            borderBottom: '1px solid #f0f0f0',
          }}>
            <div />
            <div>{openList === 'followers' ? 'Follower' : 'Following'}</div>
            <div />
            <div>To Borrow</div>
            <div>To Keep</div>
          </div>

          {listLoading ? (
            <div style={{ padding: '20px 16px', color: '#aaa', fontSize: '0.875rem' }}>Loading...</div>
          ) : (openList === 'followers' ? followersList : followingList).length === 0 ? (
            <div style={{ padding: '20px 16px', color: '#aaa', fontSize: '0.875rem', fontStyle: 'italic' as const }}>
              {openList === 'followers' ? 'No followers yet.' : 'Not following anyone yet.'}
            </div>
          ) : (
            (openList === 'followers' ? followersList : followingList).map((entry) => (
              <div key={entry.id} style={{
                display: 'grid',
                gridTemplateColumns: '40px 1fr 110px 90px 80px',
                gap: '12px', alignItems: 'center',
                padding: '10px 16px',
                borderBottom: '1px solid #f9f9f9',
              }}>
                {/* Avatar */}
                <div style={{
                  width: '40px', height: '40px', borderRadius: '50%',
                  backgroundColor: '#f0f0f0',
                  backgroundImage: entry.avatar_url ? `url(${entry.avatar_url})` : 'none' as const,
                  backgroundSize: 'cover' as const, backgroundPosition: 'center' as const,
                  border: '2px solid #e5e5e5',
                  display: 'flex', alignItems: 'center', justifyContent: 'center',
                  fontSize: '1rem', color: '#C08261', fontWeight: 'bold' as const,
                  flexShrink: 0,
                }}>
                  {!entry.avatar_url && (entry.preferred_name?.charAt(0) || entry.username?.charAt(0) || '?')}
                </div>

                {/* Name + username */}
                <a href={`/profile/${entry.username}`} style={{ textDecoration: 'none' as const, color: 'inherit' as const }}>
                  <div style={{ fontWeight: 600, fontSize: '14px', color: '#2D241E' }}>
                    {entry.preferred_name || entry.username}
                  </div>
                  <div style={{ fontSize: '12px', color: '#aaa' }}>@{entry.username}</div>
                </a>

                {/* Follow button — placeholder, wired in Task 5 */}
                <button
                  onClick={() => {}}
                  style={{
                    padding: '5px 14px',
                    backgroundColor: entry.isFollowing ? '#f0f0f0' : '#00ccff',
                    color: entry.isFollowing ? '#666' : '#000',
                    border: entry.isFollowing ? '1px solid #ddd' : 'none',
                    borderRadius: '6px', cursor: 'pointer',
                    fontWeight: 600, fontSize: '12px',
                  }}
                >
                  {entry.isFollowing ? 'Following' : 'Follow'}
                </button>

                {/* Gear counts */}
                <div style={{ fontSize: '13px', color: '#444', textAlign: 'center' as const }}>
                  {entry.borrowCount > 0 ? entry.borrowCount : <span style={{ color: '#ccc' }}>—</span>}
                </div>
                <div style={{ fontSize: '13px', color: '#444', textAlign: 'center' as const }}>
                  {entry.keepCount > 0 ? entry.keepCount : <span style={{ color: '#ccc' }}>—</span>}
                </div>
              </div>
            ))
          )}
        </div>
      )}

      <h1 style={{ fontSize: '28px', fontWeight: 'bold', color: '#2D241E', margin: '24px 0 0 0' }}>The Playa Provides: a Profile</h1>

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
                    <a href={`/find-items/${item.id}`} style={{ color: '#00ccff', textDecoration: 'none', fontWeight: 'bold', fontSize: '12px' }}>View →</a>
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
