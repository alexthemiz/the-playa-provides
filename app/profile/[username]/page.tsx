'use client';

import { useEffect, useState } from 'react';
import { useParams } from 'next/navigation';
import { supabase } from '@/lib/supabaseClient';
import AvatarUpload from '@/components/AvatarUpload';
import WishListMatchModal from '@/components/WishListMatchModal';
import { MapPin, Package, Globe, Linkedin, Instagram, Facebook } from 'lucide-react';

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
  const [wishTags, setWishTags] = useState<string[]>([]);
  const [tagInput, setTagInput] = useState('');
  const [tagSaving, setTagSaving] = useState(false);
  const [affiliations, setAffiliations] = useState<any[]>([]);
  const [draftAffiliations, setDraftAffiliations] = useState<any[]>([]);
  const [showWishMatchModal, setShowWishMatchModal] = useState(false);

  // 2026 returning status — managed separately from regular year drafts
  const [draft2026, setDraft2026] = useState<{
    status: 'yes' | 'maybe' | 'no' | null;
    campInput: string;
    campId: string | null;
    isOpenCamping: boolean;
    searchResults: any[];
    showDropdown: boolean;
  }>({ status: null, campInput: '', campId: null, isOpenCamping: false, searchResults: [], showDropdown: false });

  const startYear = 1986;
  const maxHistoryYear = 2025; // year dropdown capped at 2025; 2026 handled via "Returning in 2026?" UI
  const YEAR_OPTIONS = Array.from({ length: maxHistoryYear - startYear + 1 }, (_, i) => (maxHistoryYear - i).toString());

  useEffect(() => {
    async function fetchProfileAndGear() {
      setLoading(true);
      try {
        const { data: { session } } = await supabase.auth.getSession();
        const sessionUserId = session?.user?.id ?? null;

        const { data: profileData } = await supabase
          .from('profiles')
          .select('*')
          .eq('username', username)
          .single();

        if (profileData) {
          setProfile(profileData);
          setWishTags(Array.isArray(profileData.wish_list) ? profileData.wish_list : []);
          if (sessionUserId && sessionUserId === profileData.id) setIsOwner(true);
          setCurrentUserId(sessionUserId);

          const { count, error: followerErr } = await supabase
            .from('user_follows')
            .select('*', { count: 'exact', head: true })
            .eq('following_id', profileData.id);
          if (followerErr) console.error('follower count error:', followerErr.message);
          setFollowerCount(count ?? 0);

          const { count: followingCnt, error: followingErr } = await supabase
            .from('user_follows')
            .select('*', { count: 'exact', head: true })
            .eq('follower_id', profileData.id);
          if (followingErr) console.error('following count error:', followingErr.message);
          setFollowingCount(followingCnt ?? 0);

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

          const { data: affData } = await supabase
            .from('user_camp_affiliations')
            .select('id, year, is_open_camping, camp_id, returning_status, camps(display_name, slug)')
            .eq('user_id', profileData.id)
            .order('year', { ascending: false });
          setAffiliations(affData || []);
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
        followingSet = new Set(userIds);
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

  const handleListFollowToggle = async (targetId: string, listType: 'followers' | 'following') => {
    if (!currentUserId) return;

    const list = listType === 'followers' ? followersList : followingList;
    const setList = listType === 'followers' ? setFollowersList : setFollowingList;
    const entry = list.find((e: any) => e.id === targetId);
    if (!entry) return;

    try {
      if (entry.isFollowing) {
        const { error } = await supabase
          .from('user_follows')
          .delete()
          .eq('follower_id', currentUserId)
          .eq('following_id', targetId);
        if (error) throw new Error(error.message);
        setList((prev: any[]) => prev.map((e: any) => e.id === targetId ? { ...e, isFollowing: false } : e));
      } else {
        const { error } = await supabase
          .from('user_follows')
          .insert({ follower_id: currentUserId, following_id: targetId });
        if (error) throw new Error(error.message);
        setList((prev: any[]) => prev.map((e: any) => e.id === targetId ? { ...e, isFollowing: true } : e));
      }
    } catch (err: any) {
      console.error('List follow toggle error:', err.message);
    }
  };

  const handleSave = async () => {
    const { error } = await supabase.from('profiles').update({
      bio: profile.bio,
      preferred_name: profile.preferred_name,
      avatar_url: profile.avatar_url,
      social_links: profile.social_links || {},
      playa_story: profile.playa_story || null,
    }).eq('id', profile.id);

    if (error) { alert('Error updating profile'); return; }

    // Delete and reinsert all affiliations
    await supabase.from('user_camp_affiliations').delete().eq('user_id', profile.id);

    // Regular year entries (capped at 2025)
    for (const draft of draftAffiliations) {
      if (draft.is_open_camping) {
        await supabase.from('user_camp_affiliations').insert({
          user_id: profile.id, camp_id: null, year: draft.year, is_open_camping: true,
        });
        continue;
      }
      if (!draft.campInput.trim()) continue;
      let campId = draft.campId;
      if (!campId) campId = await findOrCreateCamp(draft.campInput);
      if (!campId) continue;
      await supabase.from('user_camp_affiliations').insert({
        user_id: profile.id, camp_id: campId, year: draft.year, is_open_camping: false,
      });
    }

    // 2026 returning row — handled separately
    if (draft2026.status) {
      const row: Record<string, any> = {
        user_id: profile.id,
        year: 2026,
        returning_status: draft2026.status,
      };
      if (draft2026.status === 'no') {
        row.camp_id = null;
        row.is_open_camping = false;
      } else if (draft2026.isOpenCamping) {
        row.camp_id = null;
        row.is_open_camping = true;
      } else {
        let campId = draft2026.campId;
        if (!campId && draft2026.campInput.trim()) {
          campId = await findOrCreateCamp(draft2026.campInput);
        }
        row.camp_id = campId || null;
        row.is_open_camping = false;
      }
      await supabase.from('user_camp_affiliations').insert(row);
    }

    const { data: affData } = await supabase
      .from('user_camp_affiliations')
      .select('id, year, is_open_camping, camp_id, returning_status, camps(display_name, slug)')
      .eq('user_id', profile.id)
      .order('year', { ascending: false });
    setAffiliations(affData || []);

    setIsEditing(false);
  };

  const addTag = async () => {
    const tag = tagInput.trim().toLowerCase();
    if (!tag || wishTags.includes(tag)) {
      setTagInput('');
      return;
    }
    const updated = [...wishTags, tag];
    setWishTags(updated);
    setTagInput('');
    setTagSaving(true);
    await supabase.from('profiles').update({ wish_list: updated }).eq('id', profile.id);
    setTagSaving(false);
  };

  const removeTag = async (tag: string) => {
    const updated = wishTags.filter(t => t !== tag);
    setWishTags(updated);
    setTagSaving(true);
    await supabase.from('profiles').update({ wish_list: updated }).eq('id', profile.id);
    setTagSaving(false);
  };

  function toSlug(name: string): string {
    return name.toLowerCase().replace(/&/g, 'and').replace(/[^a-z0-9\s-]/g, '').replace(/\s+/g, '-').replace(/-+/g, '-').trim();
  }

  async function findOrCreateCamp(name: string): Promise<string | null> {
    const { data: exact } = await supabase.from('camps').select('id').ilike('display_name', name.trim()).maybeSingle();
    if (exact) return exact.id;
    let slug = toSlug(name);
    const { data: slugRows } = await supabase.from('camps').select('slug').ilike('slug', `${slug}%`);
    const slugSet = new Set((slugRows || []).map((c: any) => c.slug));
    if (slugSet.has(slug)) { let i = 2; while (slugSet.has(`${slug}-${i}`)) i++; slug = `${slug}-${i}`; }
    const { data: newCamp, error } = await supabase.from('camps').insert({ display_name: name.trim(), slug, is_claimed: false }).select('id').single();
    if (error) { console.error('findOrCreateCamp:', error.message); return null; }
    return newCamp.id;
  }

  async function searchCampsDB(query: string): Promise<any[]> {
    if (!query.trim()) return [];
    const { data } = await supabase.from('camps').select('id, display_name, slug').ilike('display_name', `%${query.trim()}%`).limit(8);
    return data || [];
  }

  const updateDraft = (tempId: string, changes: Record<string, any>) => {
    setDraftAffiliations(prev => prev.map(d => d.tempId === tempId ? { ...d, ...changes } : d));
  };

  const addDraftEntry = () => {
    setDraftAffiliations(prev => [...prev, {
      tempId: Math.random().toString(36).slice(2),
      year: maxHistoryYear,
      is_open_camping: false, campInput: '', campId: null, searchResults: [], showDropdown: false,
    }]);
  };

  const removeDraftEntry = (tempId: string) => {
    setDraftAffiliations(prev => prev.filter(d => d.tempId !== tempId));
  };

  const handleCampInputChange = async (tempId: string, value: string) => {
    updateDraft(tempId, { campInput: value, campId: null, showDropdown: !!value.trim() });
    if (value.trim()) {
      const results = await searchCampsDB(value);
      setDraftAffiliations(prev => prev.map(d => d.tempId === tempId ? { ...d, searchResults: results, showDropdown: true } : d));
    } else {
      updateDraft(tempId, { searchResults: [], showDropdown: false });
    }
  };

  const selectCamp = (tempId: string, camp: any) => {
    updateDraft(tempId, { campInput: camp.display_name, campId: camp.id, searchResults: [], showDropdown: false });
  };

  const handle2026CampInputChange = async (value: string) => {
    setDraft2026(prev => ({ ...prev, campInput: value, campId: null, showDropdown: !!value.trim() }));
    if (value.trim()) {
      const results = await searchCampsDB(value);
      setDraft2026(prev => ({ ...prev, searchResults: results, showDropdown: true }));
    } else {
      setDraft2026(prev => ({ ...prev, searchResults: [], showDropdown: false }));
    }
  };

  if (loading) return <div style={{ color: '#2D241E', padding: '40px' }}>Loading...</div>;
  if (!profile) return <div style={{ color: '#2D241E', padding: '40px' }}>User not found.</div>;

  const locationStr = [profile.city, profile.state].filter(Boolean).join(', ');

  // Helper for returning status badge display
  const returningBadge = (status: string | null) => {
    if (!status) return null;
    const cfg = {
      yes:   { label: '✓ Returning',     bg: '#dcfce7', color: '#16a34a', border: '#86efac' },
      maybe: { label: '? Maybe',          bg: '#fef9c3', color: '#92400e', border: '#fde68a' },
      no:    { label: '✗ Not returning',  bg: '#fee2e2', color: '#dc2626', border: '#fca5a5' },
    }[status as 'yes' | 'maybe' | 'no'];
    if (!cfg) return null;
    return (
      <span style={{ fontSize: '11px', fontWeight: 600, padding: '2px 8px', borderRadius: '20px', backgroundColor: cfg.bg, color: cfg.color, border: `1px solid ${cfg.border}`, flexShrink: 0 }}>
        {cfg.label}
      </span>
    );
  };

  return (
    <div style={{ maxWidth: '1200px', margin: '0 auto', padding: '20px', color: '#2D241E' }}>

      <h1 style={{ fontSize: '28px', fontWeight: 'bold', color: '#2D241E', margin: '0 0 20px 0' }}>The Playa Provides<span style={{ textDecoration: 'underline' }}>{isOwner ? ' Your Profile' : ' A Profile'}{'\u00a0'}</span></h1>

      {/* PROFILE HEADER */}
      <header style={{ borderBottom: '1px solid #e5e5e5', paddingBottom: '30px' }}>

        {/* ROW 1: Avatar + Name / @username / Location / Social Links + Followers/Edit (right) */}
        <div style={{ display: 'flex', gap: '25px', alignItems: 'flex-start' }}>
          {isEditing ? (
            <AvatarUpload url={profile.avatar_url} onUpload={(url) => setProfile({ ...profile, avatar_url: url })} />
          ) : (
            <div style={{ width: '90px', height: '90px', borderRadius: '50%', backgroundColor: '#f0f0f0', backgroundImage: profile.avatar_url ? `url(${profile.avatar_url})` : 'none', backgroundSize: 'cover', backgroundPosition: 'center', border: '4px solid #C08261', flexShrink: 0 }}>
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
                style={{ backgroundColor: '#fff', color: '#2D241E', border: '1px solid #ddd', fontSize: '1.5rem', width: '100%', padding: '5px', borderRadius: '6px' }}
                value={profile.preferred_name || ''}
                onChange={e => setProfile({ ...profile, preferred_name: e.target.value })}
              />
            ) : (
              <h1 style={{ fontSize: '2.2rem', margin: 0, color: '#2D241E' }}>{profile.preferred_name || username}</h1>
            )}
            {(() => {
              const items: React.ReactNode[] = [
                <span key="username" style={{ color: '#888', fontSize: '0.9rem' }}>@{username}</span>,
                ...(profile.pronouns ? [<span key="pronouns" style={{ color: '#888', fontSize: '0.9rem' }}>{profile.pronouns}</span>] : []),
                ...(locationStr ? [<span key="location" style={{ display: 'flex', alignItems: 'center', gap: '3px', color: '#999', fontSize: '0.85rem' }}><MapPin size={13} />{locationStr}</span>] : []),
              ];
              return (
                <div style={{ display: 'flex', justifyContent: items.length > 1 ? 'space-between' as const : 'flex-start' as const, alignItems: 'center', marginTop: '4px', gap: '8px', maxWidth: 'calc(50% - 70px)' }}>
                  {items}
                </div>
              );
            })()}

            {/* Social links */}
            {isEditing ? (
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '8px', marginTop: '12px' }}>
                {[
                  { key: 'facebook',  label: 'Facebook' },
                  { key: 'instagram', label: 'Instagram' },
                  { key: 'bluesky',   label: 'Bluesky' },
                  { key: 'linkedin',  label: 'LinkedIn' },
                  { key: 'eplaya',    label: 'ePlaya Profile' },
                  { key: 'website',   label: 'Personal Website' },
                ].map(({ key, label }) => (
                  <div key={key}>
                    <label style={{ fontSize: '10px', color: '#aaa', display: 'block', marginBottom: '2px', textTransform: 'uppercase' as const, letterSpacing: '0.05em' }}>{label}</label>
                    <input
                      type="url"
                      placeholder="https://..."
                      value={(profile.social_links || {})[key] || ''}
                      onChange={e => setProfile({ ...profile, social_links: { ...(profile.social_links || {}), [key]: e.target.value } })}
                      style={{ width: '100%', backgroundColor: '#fff', color: '#2D241E', border: '1px solid #ddd', padding: '6px 8px', borderRadius: '6px', fontSize: '12px', boxSizing: 'border-box' as const, outline: 'none' }}
                    />
                  </div>
                ))}
              </div>
            ) : (() => {
              const links = profile.social_links || {};
              const SOCIAL = [
                { key: 'facebook',  label: 'Facebook',  icon: <Facebook size={14} />,  color: '#1877F2' },
                { key: 'instagram', label: 'Instagram', icon: <Instagram size={14} />, color: '#E4405F' },
                { key: 'bluesky',   label: 'Bluesky',   icon: null,                    color: '#0085FF' },
                { key: 'linkedin',  label: 'LinkedIn',  icon: <Linkedin size={14} />,  color: '#0A66C2' },
                { key: 'eplaya',    label: 'ePlaya',    icon: null,                    color: '#8B4513' },
                { key: 'website',   label: 'Website',   icon: <Globe size={14} />,     color: '#00aacc' },
              ].filter(s => links[s.key]);
              if (SOCIAL.length === 0) return null;
              return (
                <div style={{ display: 'flex', flexWrap: 'wrap' as const, gap: '6px', marginTop: '10px' }}>
                  {SOCIAL.map(s => (
                    <a key={s.key} href={links[s.key]} target="_blank" rel="noopener noreferrer" style={{ display: 'inline-flex', alignItems: 'center', gap: '5px', padding: '4px 11px', borderRadius: '99px', backgroundColor: '#f5f5f5', border: '1px solid #e5e5e5', textDecoration: 'none', fontSize: '12px', fontWeight: 600, color: s.color }}>
                      {s.icon}{s.label}
                    </a>
                  ))}
                </div>
              );
            })()}
          </div>

          {/* Right: Followers/Following + Edit/Follow button */}
          <div style={{ display: 'flex', flexDirection: 'column' as const, alignItems: 'flex-end', gap: '10px', flexShrink: 0 }}>
            {isOwner ? (
              <div style={{ display: 'flex', alignItems: 'center', gap: '6px', fontSize: '0.85rem' }}>
                <button
                  onClick={() => {
                    const next = openList === 'followers' ? null : 'followers' as const;
                    setOpenList(next);
                    if (next === 'followers') fetchList('followers');
                  }}
                  style={{ background: 'none', border: 'none', cursor: 'pointer', padding: 0, color: openList === 'followers' ? '#00aacc' : '#888', fontWeight: openList === 'followers' ? 600 : 400, fontSize: '0.85rem' }}
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
                  style={{ background: 'none', border: 'none', cursor: 'pointer', padding: 0, color: openList === 'following' ? '#00aacc' : '#888', fontWeight: openList === 'following' ? 600 : 400, fontSize: '0.85rem' }}
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
                onClick={() => {
                  if (isEditing) {
                    handleSave();
                  } else {
                    const aff2026 = affiliations.find(a => a.year === 2026);
                    setDraft2026({
                      status: aff2026?.returning_status ?? null,
                      campInput: (aff2026?.camps as any)?.display_name || '',
                      campId: aff2026?.camp_id || null,
                      isOpenCamping: aff2026?.is_open_camping || false,
                      searchResults: [],
                      showDropdown: false,
                    });
                    setDraftAffiliations(
                      affiliations
                        .filter(a => a.year !== 2026)
                        .map(a => ({
                          tempId: a.id,
                          year: a.year,
                          is_open_camping: a.is_open_camping,
                          campInput: (a.camps as any)?.display_name || '',
                          campId: a.camp_id || null,
                          searchResults: [],
                          showDropdown: false,
                        }))
                    );
                    setIsEditing(true);
                  }
                }}
                style={{ padding: '8px 20px', backgroundColor: isEditing ? '#4CAF50' : '#00ccff', color: isEditing ? '#fff' : '#000', border: 'none', borderRadius: '6px', cursor: 'pointer', fontWeight: 'bold' }}
              >
                {isEditing ? 'Save Profile' : 'Edit Profile'}
              </button>
            ) : currentUserId ? (
              <button
                onClick={handleFollowToggle}
                disabled={followLoading}
                style={{ padding: '8px 20px', backgroundColor: isFollowing ? '#f0f0f0' : '#00ccff', color: isFollowing ? '#666' : '#000', border: isFollowing ? '1px solid #ddd' : 'none', borderRadius: '6px', cursor: followLoading ? 'default' : 'pointer', fontWeight: 'bold', opacity: followLoading ? 0.6 : 1 }}
              >
                {followLoading ? '...' : isFollowing ? 'Following' : 'Follow'}
              </button>
            ) : null}
            {followError && (
              <p style={{ fontSize: '0.8rem', color: '#dc2626', margin: 0 }}>{followError}</p>
            )}
          </div>
        </div>

        {/* FOLLOWERS / FOLLOWING EXPANDABLE LIST */}
        {isOwner && openList && (
          <div style={{ marginTop: '12px', border: '1px solid #e5e5e5', borderRadius: '10px', overflow: 'hidden' as const }}>
            <div style={{ display: 'grid', gridTemplateColumns: '40px minmax(100px, 200px) 110px 90px 80px', gap: '12px', alignItems: 'center', padding: '8px 16px', fontSize: '10px', fontWeight: 700, color: '#aaa', textTransform: 'uppercase' as const, letterSpacing: '0.06em', borderBottom: '1px solid #f0f0f0' }}>
              <div />
              <div>{openList === 'followers' ? 'Follower' : 'Following'}</div>
              <div />
              <div>
                <div style={{ fontSize: '8px', fontWeight: 400, color: '#bbb', textTransform: 'uppercase' as const, letterSpacing: '0.06em', marginBottom: '2px' }}>Items Available</div>
                To Borrow
              </div>
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
                <div key={entry.id} style={{ display: 'grid', gridTemplateColumns: '40px minmax(100px, 200px) 110px 90px 80px', gap: '12px', alignItems: 'center', padding: '10px 16px', borderBottom: '1px solid #f9f9f9' }}>
                  <div style={{ width: '40px', height: '40px', borderRadius: '50%', backgroundColor: '#f0f0f0', backgroundImage: entry.avatar_url ? `url(${entry.avatar_url})` : 'none' as const, backgroundSize: 'cover' as const, backgroundPosition: 'center' as const, border: '2px solid #e5e5e5', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '1rem', color: '#C08261', fontWeight: 'bold' as const, flexShrink: 0 }}>
                    {!entry.avatar_url && (entry.preferred_name?.charAt(0) || entry.username?.charAt(0) || '?')}
                  </div>
                  <a href={`/profile/${entry.username}`} style={{ textDecoration: 'none' as const, color: 'inherit' as const }}>
                    <div style={{ fontWeight: 600, fontSize: '14px', color: '#2D241E' }}>{entry.preferred_name || entry.username}</div>
                    <div style={{ fontSize: '12px', color: '#aaa' }}>@{entry.username}</div>
                  </a>
                  <button
                    onClick={() => handleListFollowToggle(entry.id, openList!)}
                    style={{ padding: '5px 14px', backgroundColor: entry.isFollowing ? '#f0f0f0' : '#00ccff', color: entry.isFollowing ? '#666' : '#000', border: entry.isFollowing ? '1px solid #ddd' : 'none', borderRadius: '6px', cursor: 'pointer', fontWeight: 600, fontSize: '12px' }}
                  >
                    {entry.isFollowing ? 'Following' : 'Follow'}
                  </button>
                  <div style={{ fontSize: '13px', color: '#444', textAlign: 'center' as const }}>{entry.borrowCount}</div>
                  <div style={{ fontSize: '13px', color: '#444', textAlign: 'center' as const }}>{entry.keepCount}</div>
                </div>
              ))
            )}
          </div>
        )}

        {/* ROW 2: Bio | Wish List */}
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '24px', marginTop: '25px' }}>
          <div>
            <h4 style={subheadStyle}>Bio</h4>
            {isEditing ? (
              <textarea style={editTextareaStyle} value={profile.bio || ''} onChange={e => setProfile({ ...profile, bio: e.target.value })} />
            ) : (
              <p style={{ fontSize: '1rem', color: '#444', margin: 0, lineHeight: '1.6' }}>
                {profile.bio || <span style={{ color: '#aaa', fontStyle: 'italic' as const }}>No bio yet.</span>}
              </p>
            )}
          </div>

          <div>
            <h4 style={subheadStyle}>Wish List</h4>
            <div style={{ display: 'flex', flexWrap: 'wrap' as const, gap: '8px', marginBottom: wishTags.length > 0 ? '12px' : '0' }}>
              {wishTags.length === 0 && !isOwner && (
                <span style={{ color: '#aaa', fontStyle: 'italic' as const, fontSize: '0.9rem' }}>No wishlist yet.</span>
              )}
              {wishTags.map(tag => (
                <span key={tag} style={{ display: 'inline-flex', alignItems: 'center', gap: '6px', backgroundColor: '#00ccff', color: '#000', borderRadius: '20px', padding: '4px 12px', fontSize: '13px', fontWeight: 600 }}>
                  {tag}
                  {isOwner && (
                    <button onClick={() => removeTag(tag)} style={{ background: 'transparent', border: 'none', cursor: 'pointer', padding: '0', lineHeight: 1, color: '#005566', fontSize: '14px', fontWeight: 'bold' }} aria-label={`Remove ${tag}`}>×</button>
                  )}
                </span>
              ))}
            </div>
            {isOwner && (
              <div style={{ display: 'flex', gap: '8px' }}>
                <input type="text" value={tagInput} placeholder="Add an item..." onChange={e => setTagInput(e.target.value)} onKeyDown={e => { if (e.key === 'Enter') { e.preventDefault(); addTag(); } }} disabled={tagSaving} style={{ flex: 1, backgroundColor: '#fff', color: '#2D241E', border: '1px solid #ddd', padding: '6px 10px', borderRadius: '6px', fontSize: '13px', outline: 'none', opacity: tagSaving ? 0.5 : 1 }} />
                <button onClick={addTag} disabled={tagSaving} style={{ backgroundColor: '#00ccff', color: '#000', border: 'none', borderRadius: '6px', padding: '6px 14px', fontWeight: 600, fontSize: '13px', cursor: tagSaving ? 'default' as const : 'pointer' as const, opacity: tagSaving ? 0.5 : 1 }}>Add</button>
              </div>
            )}
            {!isOwner && currentUserId && wishTags.length > 0 && (
              <div style={{ marginTop: '14px' }}>
                <p style={{ margin: '0 0 6px', fontSize: '0.78rem', color: '#aaa' }}>Got something they're looking for?</p>
                <button
                  onClick={() => setShowWishMatchModal(true)}
                  style={{ padding: '7px 14px', backgroundColor: '#f5f5f5', color: '#2D241E', border: '1px solid #ddd', borderRadius: '8px', fontSize: '0.85rem', fontWeight: 600, cursor: 'pointer' }}
                >
                  I have one of these
                </button>
              </div>
            )}
          </div>
        </div>

        {/* PLAYA HISTORY + PLAYA STORY — two-column grid */}
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '40px', marginTop: '25px' }}>

        {/* PLAYA HISTORY */}
        <div>
          <h4 style={subheadStyle}>Playa History</h4>
          {isEditing ? (
            <div>
              {/* 2026 Returning section */}
              <div style={{ marginBottom: '16px', padding: '12px 14px', backgroundColor: '#f8f8f8', borderRadius: '8px', border: '1px solid #eee' }}>
                <p style={{ margin: '0 0 8px', fontSize: '0.8rem', fontWeight: 700, color: '#555', textTransform: 'uppercase' as const, letterSpacing: '0.04em' }}>Returning in 2026?</p>
                <div style={{ display: 'flex', gap: '8px', marginBottom: '10px' }}>
                  {(['yes', 'maybe', 'no'] as const).map(s => {
                    const cfg = { yes: { label: 'Yes', bg: '#dcfce7', col: '#16a34a', brd: '#86efac' }, maybe: { label: 'Maybe', bg: '#fef9c3', col: '#92400e', brd: '#fde68a' }, no: { label: 'No', bg: '#fee2e2', col: '#dc2626', brd: '#fca5a5' } }[s];
                    const active = draft2026.status === s;
                    return (
                      <button
                        key={s}
                        onClick={() => setDraft2026(prev => ({ ...prev, status: prev.status === s ? null : s }))}
                        style={{ padding: '5px 18px', borderRadius: '20px', border: `1px solid ${active ? cfg.brd : '#ddd'}`, fontSize: '0.85rem', fontWeight: 600, cursor: 'pointer', backgroundColor: active ? cfg.bg : '#fff', color: active ? cfg.col : '#888' }}
                      >
                        {cfg.label}
                      </button>
                    );
                  })}
                </div>
                {/* Camp field — shown when Yes or Maybe */}
                {(draft2026.status === 'yes' || draft2026.status === 'maybe') && (
                  <div>
                    <label style={{ display: 'flex', alignItems: 'center', gap: '5px', fontSize: '0.8rem', color: '#555', marginBottom: '6px', cursor: 'pointer', width: 'fit-content' as const }}>
                      <input
                        type="checkbox"
                        checked={draft2026.isOpenCamping}
                        onChange={e => setDraft2026(prev => ({ ...prev, isOpenCamping: e.target.checked, campInput: '', campId: null }))}
                      />
                      Open Camping
                    </label>
                    {!draft2026.isOpenCamping && (
                      <div style={{ position: 'relative' as const }}>
                        <input
                          type="text"
                          placeholder="Camp name..."
                          value={draft2026.campInput}
                          onChange={e => handle2026CampInputChange(e.target.value)}
                          onFocus={() => { if (draft2026.campInput.trim()) setDraft2026(prev => ({ ...prev, showDropdown: true })); }}
                          onBlur={() => setTimeout(() => setDraft2026(prev => ({ ...prev, showDropdown: false })), 150)}
                          style={{ width: '100%', padding: '6px 8px', border: '1px solid #ddd', borderRadius: '6px', fontSize: '13px', backgroundColor: '#fff', color: '#2D241E', boxSizing: 'border-box' as const, outline: 'none' }}
                        />
                        {draft2026.showDropdown && (draft2026.searchResults.length > 0 || draft2026.campInput.trim()) && (
                          <div style={{ position: 'absolute' as const, top: '100%', left: 0, right: 0, backgroundColor: '#fff', border: '1px solid #ddd', borderRadius: '6px', zIndex: 10, boxShadow: '0 4px 12px rgba(0,0,0,0.12)', overflow: 'hidden' as const }}>
                            {draft2026.searchResults.map((camp: any) => (
                              <div key={camp.id} onMouseDown={() => setDraft2026(prev => ({ ...prev, campInput: camp.display_name, campId: camp.id, searchResults: [], showDropdown: false }))} style={{ padding: '8px 12px', cursor: 'pointer', fontSize: '0.875rem', color: '#2D241E' }}>
                                {camp.display_name}
                              </div>
                            ))}
                            {draft2026.campInput.trim() && !draft2026.searchResults.some((c: any) => c.display_name.toLowerCase() === draft2026.campInput.trim().toLowerCase()) && (
                              <div onMouseDown={() => setDraft2026(prev => ({ ...prev, showDropdown: false }))} style={{ padding: '8px 12px', cursor: 'pointer', fontSize: '0.875rem', color: '#00aacc', borderTop: draft2026.searchResults.length > 0 ? '1px solid #f0f0f0' : undefined }}>
                                Add "{draft2026.campInput}" as a new camp
                              </div>
                            )}
                          </div>
                        )}
                      </div>
                    )}
                  </div>
                )}
                {/* Grayed out when No */}
                {draft2026.status === 'no' && (
                  <input disabled value="" placeholder="Camp name..." style={{ width: '100%', padding: '6px 8px', border: '1px solid #eee', borderRadius: '6px', fontSize: '13px', backgroundColor: '#f5f5f5', color: '#ccc', boxSizing: 'border-box' as const }} />
                )}
              </div>

              {/* Regular year entries (capped at 2025) */}
              <p style={{ fontSize: '0.8rem', color: '#999', margin: '0 0 10px' }}>
                Add each year you attended with your camp, or tick Open Camping.
              </p>
              {draftAffiliations.map(draft => (
                <div key={draft.tempId} style={{ display: 'flex', gap: '8px', alignItems: 'flex-start', marginBottom: '8px' }}>
                  <select
                    value={draft.year}
                    onChange={e => updateDraft(draft.tempId, { year: parseInt(e.target.value) })}
                    style={{ padding: '6px 8px', border: '1px solid #ddd', borderRadius: '6px', fontSize: '13px', backgroundColor: '#fff', color: '#2D241E', flexShrink: 0, width: '90px' }}
                  >
                    {YEAR_OPTIONS.map(y => <option key={y} value={y}>{y}</option>)}
                  </select>
                  <label style={{ display: 'flex', alignItems: 'center', gap: '4px', fontSize: '0.8rem', color: '#555', whiteSpace: 'nowrap' as const, flexShrink: 0, paddingTop: '7px' }}>
                    <input
                      type="checkbox"
                      checked={draft.is_open_camping}
                      onChange={e => updateDraft(draft.tempId, { is_open_camping: e.target.checked, campInput: '', campId: null })}
                    />
                    Open Camping
                  </label>
                  {!draft.is_open_camping && (
                    <div style={{ flex: 1, position: 'relative' as const }}>
                      <input
                        type="text"
                        placeholder="Camp name..."
                        value={draft.campInput}
                        onChange={e => handleCampInputChange(draft.tempId, e.target.value)}
                        onFocus={() => { if (draft.campInput.trim()) updateDraft(draft.tempId, { showDropdown: true }); }}
                        onBlur={() => setTimeout(() => updateDraft(draft.tempId, { showDropdown: false }), 150)}
                        style={{ width: '100%', padding: '6px 8px', border: '1px solid #ddd', borderRadius: '6px', fontSize: '13px', backgroundColor: '#fff', color: '#2D241E', boxSizing: 'border-box' as const, outline: 'none' }}
                      />
                      {draft.showDropdown && (draft.searchResults.length > 0 || draft.campInput.trim()) && (
                        <div style={{ position: 'absolute' as const, top: '100%', left: 0, right: 0, backgroundColor: '#fff', border: '1px solid #ddd', borderRadius: '6px', zIndex: 10, boxShadow: '0 4px 12px rgba(0,0,0,0.12)', overflow: 'hidden' as const }}>
                          {draft.searchResults.map((camp: any) => (
                            <div key={camp.id} onMouseDown={() => selectCamp(draft.tempId, camp)} style={{ padding: '8px 12px', cursor: 'pointer', fontSize: '0.875rem', color: '#2D241E' }}>
                              {camp.display_name}
                            </div>
                          ))}
                          {draft.campInput.trim() && !draft.searchResults.some((c: any) => c.display_name.toLowerCase() === draft.campInput.trim().toLowerCase()) && (
                            <div onMouseDown={() => updateDraft(draft.tempId, { showDropdown: false })} style={{ padding: '8px 12px', cursor: 'pointer', fontSize: '0.875rem', color: '#00aacc', borderTop: draft.searchResults.length > 0 ? '1px solid #f0f0f0' : undefined }}>
                              Add "{draft.campInput}" as a new camp
                            </div>
                          )}
                        </div>
                      )}
                    </div>
                  )}
                  <button onClick={() => removeDraftEntry(draft.tempId)} style={{ background: 'none', border: 'none', cursor: 'pointer', color: '#ccc', fontSize: '1.2rem', lineHeight: 1, flexShrink: 0, padding: '4px', paddingTop: '6px' }} aria-label="Remove">×</button>
                </div>
              ))}
              <button onClick={addDraftEntry} style={{ marginTop: '4px', fontSize: '0.8rem', color: '#00aacc', background: 'none', border: '1px dashed #00aacc', borderRadius: '6px', padding: '5px 14px', cursor: 'pointer' }}>
                + Add year
              </button>

            </div>
          ) : affiliations.length > 0 ? (
            <div style={{ display: 'flex', flexDirection: 'column' as const, gap: '6px' }}>
              {affiliations.map((aff: any) => {
                const campName = (aff.camps as any)?.display_name ?? null;
                const campSlug = (aff.camps as any)?.slug ?? null;
                return (
                  <div key={aff.id} style={{ display: 'flex', alignItems: 'center', gap: '10px', flexWrap: 'wrap' as const }}>
                    <span style={{ backgroundColor: '#fdf3ec', padding: '3px 10px', borderRadius: '20px', color: '#C08261', border: '1px solid #f0d8c8', fontSize: '0.85rem', fontWeight: 'bold', flexShrink: 0 }}>
                      {aff.year}
                    </span>
                    {aff.is_open_camping ? (
                      <span style={{ fontSize: '0.875rem', color: '#aaa', fontStyle: 'italic' as const }}>Open Camping</span>
                    ) : campSlug ? (
                      <a href={`/camps/${campSlug}`} style={{ fontSize: '0.875rem', color: '#00aacc', textDecoration: 'none', fontWeight: 500 }}>{campName}</a>
                    ) : campName ? (
                      <span style={{ fontSize: '0.875rem', color: '#555' }}>{campName}</span>
                    ) : null}
                    {aff.returning_status && returningBadge(aff.returning_status)}
                  </div>
                );
              })}
            </div>
          ) : (
            <>
              {affiliations.length === 0 && !draft2026.status && (
                <span style={{ color: '#aaa', fontStyle: 'italic' as const, fontSize: '0.9rem' }}>No years listed yet.</span>
              )}
            </>
          )}
        </div>

        {/* PLAYA STORY */}
        <div>
          <h4 style={subheadStyle}>Got a good &quot;playa provides&quot; story?</h4>
          {isEditing ? (
            <textarea style={editTextareaStyle} value={profile.playa_story || ''} onChange={e => setProfile({ ...profile, playa_story: e.target.value })} placeholder="Share a time the playa provided..." />
          ) : (
            <p style={{ fontSize: '1rem', color: '#444', margin: 0, lineHeight: '1.6' }}>
              {profile.playa_story || <span style={{ color: '#aaa', fontStyle: 'italic' as const }}>No story yet.</span>}
            </p>
          )}
        </div>

        </div>{/* end two-column grid */}

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
                    {isOwner && item.visibility && item.visibility !== 'public' && (
                      <div style={{ display: 'inline-block', marginTop: '3px', fontSize: '9px', fontWeight: 700, textTransform: 'uppercase' as const, letterSpacing: '0.04em', padding: '1px 6px', borderRadius: '10px', backgroundColor: '#fdf3ec', color: '#C08261', border: '1px solid #f0d8c8' }}>
                        {{
                          followers: 'Followers',
                          campmates: 'Campmates',
                          followers_and_campmates: 'Following + Campmates',
                        }[item.visibility as string] ?? item.visibility}
                      </div>
                    )}
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

      {showWishMatchModal && profile && currentUserId && (
        <WishListMatchModal
          profile={profile}
          wishTags={wishTags}
          currentUserId={currentUserId}
          onClose={() => setShowWishMatchModal(false)}
        />
      )}
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
