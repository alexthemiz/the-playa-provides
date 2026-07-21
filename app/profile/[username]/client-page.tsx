'use client';

import { useEffect, useState } from 'react';
import { useParams } from 'next/navigation';
import { supabase } from '@/lib/supabaseClient';
import Link from 'next/link';
import AvatarUpload from '@/components/AvatarUpload';
import WishListMatchModal from '@/components/WishListMatchModal';
import WelcomeModal from '@/components/WelcomeModal';
import AddItemModal from '@/components/AddItemModal';
import { MapPin, Package, Globe, Linkedin, Instagram, Facebook } from 'lucide-react';

export default function PublicProfilePage() {
  const params = useParams();
  const username = params.username as string;

  const [profile, setProfile] = useState<any>(null);
  const [items, setItems] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [isEditing, setIsEditing] = useState(false);
  const [saveError, setSaveError] = useState<string | null>(null);
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
  const [showAddItem, setShowAddItem] = useState(false);
  const [showWelcome, setShowWelcome] = useState(false);
  const [checklistState,     setChecklistState]     = useState<null | { playaHistory: boolean; wishList: boolean; locations: boolean; listedItem: boolean; browsed: boolean }>(null)
  const [checklistDismissed, setChecklistDismissed] = useState(false)
  const [checklistExpanded,  setChecklistExpanded]  = useState(false)

  // 2026 returning status — managed separately from regular year drafts
  const [draft2026, setDraft2026] = useState<{
    status: 'yes' | 'maybe' | 'no' | null;
    campInput: string;
    campId: string | null;
    isOpenCamping: boolean;
    isTBD: boolean;
    searchResults: any[];
    showDropdown: boolean;
  }>({ status: null, campInput: '', campId: null, isOpenCamping: false, isTBD: false, searchResults: [], showDropdown: false });

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
          .eq('username', username.toLowerCase())
          .single();

        if (profileData) {
          setProfile(profileData);
          setWishTags(Array.isArray(profileData.wish_list) ? profileData.wish_list : []);
          if (sessionUserId && sessionUserId === profileData.id) {
            setIsOwner(true);
            if (profileData.has_seen_welcome === false) setShowWelcome(true);
            setChecklistDismissed(profileData.checklist_dismissed ?? false)

            const [clCampsRes, clLocsRes, clGearRes] = await Promise.all([
              supabase.from('user_camp_affiliations').select('id', { count: 'exact', head: true }).eq('user_id', sessionUserId),
              supabase.from('locations').select('id', { count: 'exact', head: true }).eq('user_id', sessionUserId),
              supabase.from('gear_items').select('id', { count: 'exact', head: true }).eq('user_id', sessionUserId),
            ])
            setChecklistState({
              playaHistory: (clCampsRes.count ?? 0) > 0,
              wishList:     Array.isArray(profileData.wish_list) && profileData.wish_list.length > 0,
              locations:    (clLocsRes.count ?? 0) > 0,
              listedItem:   (clGearRes.count ?? 0) > 0,
              browsed:      profileData.has_browsed ?? false,
            })
          }
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

          if (sessionUserId && sessionUserId !== profileData.id) {
            // Non-owner logged in: fetch gear and relationship data in parallel
            const [gearRes, followsRes, viewerCampsRes, ownerCampsRes] = await Promise.all([
              supabase.from('gear_items').select('*, locations(city, state)').eq('user_id', profileData.id).in('availability_status', ['Available to Keep', 'Available to Borrow']),
              supabase.from('user_follows').select('follower_id').eq('follower_id', sessionUserId).eq('following_id', profileData.id).maybeSingle(),
              supabase.from('user_camp_affiliations').select('camp_id').eq('user_id', sessionUserId),
              supabase.from('user_camp_affiliations').select('camp_id').eq('user_id', profileData.id),
            ]);
            const allGear = gearRes.data || [];
            const viewerFollowsOwner = !!followsRes.data;
            const viewerCampIds = new Set((viewerCampsRes.data || []).map((r: any) => r.camp_id).filter(Boolean));
            const ownerCampIds = (ownerCampsRes.data || []).map((r: any) => r.camp_id).filter(Boolean);
            const sharesCamp = ownerCampIds.some((id: string) => viewerCampIds.has(id));
            setItems(allGear.filter((item: any) => {
              const v = item.visibility;
              if (!v || v === 'public') return true;
              if (v === 'followers') return viewerFollowsOwner;
              if (v === 'campmates') return sharesCamp;
              if (v === 'followers_campmates') return viewerFollowsOwner || sharesCamp;
              if (v === 'private') return false;
              return false;
            }));
          } else {
            // Owner sees all; logged-out viewer sees only public items
            const { data: gearData } = await supabase
              .from('gear_items')
              .select('*, locations(city, state)')
              .eq('user_id', profileData.id)
              .in('availability_status', ['Available to Keep', 'Available to Borrow']);
            const allGear = gearData || [];
            if (!sessionUserId) {
              setItems(allGear.filter((item: any) => !item.visibility || item.visibility === 'public'));
            } else {
              setItems(allGear);
            }
          }

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
    const rawLinks = profile.social_links || {};
    const normalizedLinks = { ...rawLinks };
    if (normalizedLinks.website && !/^https?:\/\//i.test(normalizedLinks.website)) {
      normalizedLinks.website = `https://${normalizedLinks.website}`;
    }
    const { error } = await supabase.from('profiles').update({
      bio: profile.bio,
      preferred_name: profile.preferred_name,
      avatar_url: profile.avatar_url,
      social_links: normalizedLinks,
      playa_story: profile.playa_story || null,
    }).eq('id', profile.id);

    if (error) { setSaveError('Error saving profile. Please try again.'); return; }
    setSaveError(null);

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

    // 2026 returning row â€" handled separately
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
    const defaultYear = draftAffiliations.length > 0
      ? Math.min(...draftAffiliations.map((d: any) => Number(d.year))) - 1
      : maxHistoryYear;
    setDraftAffiliations(prev => [...prev, {
      tempId: Math.random().toString(36).slice(2),
      year: defaultYear,
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

  async function refetchOwnerGear() {
    if (!profile) return;
    const { data: gearData } = await supabase
      .from('gear_items')
      .select('*, locations(city, state)')
      .eq('user_id', profile.id)
      .in('availability_status', ['Available to Keep', 'Available to Borrow']);
    setItems(gearData || []);
  }

  if (loading) return <div style={{ color: '#1C1610', padding: '40px' }}>Loading...</div>;
  if (!profile) return <div style={{ color: '#1C1610', padding: '40px' }}>User not found.</div>;

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

  const attending2026Badge = (status: string | null) => {
    if (!status) return null;
    const cfg = {
      yes:   { label: 'Attending',       bg: '#dcfce7', color: '#16a34a', border: '#86efac' },
      maybe: { label: 'Maybe Attending', bg: '#fef9c3', color: '#92400e', border: '#fde68a' },
      no:    { label: 'Not Attending',   bg: '#fee2e2', color: '#dc2626', border: '#fca5a5' },
    }[status as 'yes' | 'maybe' | 'no'];
    if (!cfg) return null;
    return (
      <span style={{ fontSize: '0.85rem', fontWeight: 700, padding: '4px 12px', backgroundColor: cfg.bg, color: cfg.color, border: `1.5px solid ${cfg.border}`, flexShrink: 0 }}>
        {cfg.label}
      </span>
    );
  };

  return (
    <div style={{ backgroundColor: '#F6F1E8', minHeight: '100vh' }}>
      <style>{`
        @media (max-width: 640px) {
          .profile-header-row { gap: 12px !important; }
          .profile-username-row { flex-direction: column !important; align-items: flex-start !important; gap: 6px !important; }
          .profile-username-row > div:last-child { width: 100%; justify-content: space-between !important; }
          .profile-follower-row { gap: 16px !important; }
        }
      `}</style>

      {/* Page header band — contains the full profile identity block */}
      <div style={{ backgroundColor: '#FDFAF4', borderBottom: '2px solid #1C1610', padding: '28px 0' }}>
        <div className="rsp-px" style={{ maxWidth: '1200px', margin: '0 auto' }}>
          {/* Avatar + name row */}
          <div className="profile-header-row" style={{ display: 'flex', gap: '20px', alignItems: 'flex-start' }}>
            {/* Avatar */}
            {isEditing ? (
              <AvatarUpload url={profile.avatar_url} onUpload={(url) => setProfile({ ...profile, avatar_url: url })} onError={setSaveError} />
            ) : (
              <div style={{ width: '80px', height: '80px', borderRadius: '50%', backgroundColor: '#f0f0f0', backgroundImage: profile.avatar_url ? `url(${profile.avatar_url})` : 'none', backgroundSize: 'cover', backgroundPosition: 'center', border: '3px solid #D4A020', flexShrink: 0 }}>
                {!profile.avatar_url && (
                  <span style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', height: '100%', fontSize: '1.8rem', color: '#D4A020' }}>
                    {profile.preferred_name?.charAt(0)}
                  </span>
                )}
              </div>
            )}

            {/* Identity */}
            <div style={{ flex: 1, minWidth: 0 }}>
              {isEditing ? (
                <input
                  style={{ backgroundColor: '#fff', color: '#1C1610', border: '1px solid #ddd', fontSize: '1.5rem', width: '100%', padding: '5px' }}
                  value={profile.preferred_name || ''}
                  onChange={e => setProfile({ ...profile, preferred_name: e.target.value })}
                />
              ) : (
                <h1 style={{ fontFamily: "'Arvo', serif", fontSize: '1.9rem', fontWeight: 900, color: '#1C1610', margin: '0 0 4px', lineHeight: 1.05 }}>
                  {profile.preferred_name || profile.username || username}
                </h1>
              )}

              {/* @username / pronouns / location + followers + action button — one row */}
              <div className="profile-username-row" style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap' as const, gap: '8px', fontSize: '0.82rem', color: '#9A8878', marginBottom: '8px' }}>
                {/* Left: identity meta */}
                <div style={{ display: 'flex', alignItems: 'center', flexWrap: 'wrap' as const, gap: '6px' }}>
                  <span style={{ fontFamily: "'Space Mono', monospace", fontSize: '0.7rem' }}>@{profile?.username || username}</span>
                  {profile.pronouns && <><span style={{ color: '#ccc' }}>·</span><span>{profile.pronouns}</span></>}
                  {locationStr && <><span style={{ color: '#ccc' }}>·</span><span style={{ display: 'flex', alignItems: 'center', gap: '3px' }}><MapPin size={12} />{locationStr}</span></>}
                </div>
                {/* Right: counts + action button */}
                <div style={{ display: 'flex', alignItems: 'center', gap: '12px', flexWrap: 'wrap' as const }}>
                  <div className="profile-follower-row" style={{ display: 'flex', gap: '12px' }}>
                    <span
                      onClick={isOwner ? () => { setOpenList('followers'); fetchList('followers'); } : undefined}
                      style={{ fontSize: '0.8rem', color: '#4A3828', cursor: isOwner ? 'pointer' : 'default' }}>
                      <strong style={{ fontFamily: "'Arvo', serif" }}>{followerCount}</strong> <span style={{ color: '#9A8878' }}>followers</span>
                    </span>
                    <span
                      onClick={isOwner ? () => { setOpenList('following'); fetchList('following'); } : undefined}
                      style={{ fontSize: '0.8rem', color: '#4A3828', cursor: isOwner ? 'pointer' : 'default' }}>
                      <strong style={{ fontFamily: "'Arvo', serif" }}>{followingCount}</strong> <span style={{ color: '#9A8878' }}>following</span>
                    </span>
                  </div>
                  {isOwner ? (
                    <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap' as const }}>
                      {isEditing ? (
                        <>
                          <button onClick={handleSave}
                            style={{ padding: '6px 16px', backgroundColor: '#1E8A82', color: '#fff', border: '2px solid #1C1610', boxShadow: '2px 2px 0 #1C1610', fontWeight: 700, fontSize: '0.8rem', cursor: 'pointer', fontFamily: 'inherit' }}>
                            Save Profile
                          </button>
                          <button onClick={() => setIsEditing(false)}
                            style={{ padding: '6px 14px', background: 'none', border: '2px solid #1C1610', fontWeight: 600, fontSize: '0.8rem', cursor: 'pointer', fontFamily: 'inherit', color: '#1C1610' }}>
                            Cancel
                          </button>
                          {saveError && <span style={{ color: '#C24820', fontSize: '0.75rem', alignSelf: 'center' }}>{saveError}</span>}
                        </>
                      ) : (
                        <button
                          onClick={() => {
                            const aff2026 = affiliations.find((a: any) => a.year === 2026);
                            const aff2026HasCamp = !!aff2026?.camp_id || !!aff2026?.is_open_camping;
                            setDraft2026({
                              status: aff2026?.returning_status ?? null,
                              campInput: (aff2026?.camps as any)?.display_name || '',
                              campId: aff2026?.camp_id || null,
                              isOpenCamping: aff2026?.is_open_camping || false,
                              isTBD: (aff2026?.returning_status === 'yes' || aff2026?.returning_status === 'maybe') && !aff2026HasCamp,
                              searchResults: [],
                              showDropdown: false,
                            });
                            setDraftAffiliations(
                              affiliations
                                .filter((a: any) => a.year !== 2026)
                                .map((a: any) => ({
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
                          }}
                          className="profile-action-btn"
                          style={{ padding: '6px 16px', background: 'none', border: '2px solid #1C1610', fontWeight: 600, fontSize: '0.8rem', cursor: 'pointer', fontFamily: 'inherit', color: '#1C1610' }}>
                          Edit Profile
                        </button>
                      )}
                    </div>
                  ) : currentUserId ? (
                    <button
                      onClick={handleFollowToggle}
                      disabled={followLoading}
                      className="profile-action-btn"
                      style={{ padding: '6px 16px', backgroundColor: isFollowing ? '#EDE5D0' : '#1E8A82', color: isFollowing ? '#4A3828' : '#fff', border: '2px solid #1C1610', boxShadow: isFollowing ? 'none' : '2px 2px 0 #1C1610', fontWeight: 700, fontSize: '0.8rem', cursor: followLoading ? 'default' as const : 'pointer', fontFamily: 'inherit', opacity: followLoading ? 0.6 : 1 }}
                    >
                      {followLoading ? '...' : isFollowing ? 'Following' : 'Follow'}
                    </button>
                  ) : null}
                  {followError && <span style={{ color: '#C24820', fontSize: '0.78rem' }}>{followError}</span>}
                </div>
              </div>

              {/* Social links */}
              {isEditing ? (
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '8px', marginTop: '8px', maxWidth: '480px' }}>
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
                        style={{ width: '100%', backgroundColor: '#fff', color: '#1C1610', border: '1px solid #ddd', padding: '6px 8px', fontSize: '12px', boxSizing: 'border-box' as const, outline: 'none' }}
                      />
                    </div>
                  ))}
                </div>
              ) : (() => {
                const links = profile.social_links || {};
                const SOCIAL = [
                  { key: 'facebook',  label: 'Facebook',  icon: <Facebook size={13} />,  color: '#1877F2' },
                  { key: 'instagram', label: 'Instagram', icon: <Instagram size={13} />, color: '#E4405F' },
                  { key: 'bluesky',   label: 'Bluesky',   icon: null,                    color: '#0085FF' },
                  { key: 'linkedin',  label: 'LinkedIn',  icon: <Linkedin size={13} />,  color: '#0A66C2' },
                  { key: 'eplaya',    label: 'ePlaya',    icon: null,                    color: '#8B4513' },
                  { key: 'website',   label: 'Website',   icon: <Globe size={13} />,     color: '#1E8A82' },
                ].filter(s => (links as any)[s.key]);
                if (SOCIAL.length === 0) return null;
                return (
                  <div className="profile-social-links" style={{ display: 'flex', flexWrap: 'wrap' as const, gap: '6px', marginBottom: '10px' }}>
                    {SOCIAL.map(s => (
                      <a key={s.key} href={/^https?:\/\//i.test((links as any)[s.key]) ? (links as any)[s.key] : `https://${(links as any)[s.key]}`} target="_blank" rel="noopener noreferrer"
                        style={{ display: 'inline-flex', alignItems: 'center', gap: '5px', padding: '3px 10px', backgroundColor: '#f5f5f5', border: '1px solid #e5e5e5', textDecoration: 'none', fontSize: '11px', fontWeight: 600, color: s.color }}>
                        {s.icon}{s.label}
                      </a>
                    ))}
                  </div>
                );
              })()}

            </div>
          </div>
        </div>
      </div>

      <div className="rsp-px" style={{ maxWidth: '1200px', margin: '0 auto', paddingTop: '20px', paddingBottom: '20px', color: '#1C1610' }}>
      <style>{`
        @media (max-width: 640px) {
          .profile-header-row {
            flex-direction: column !important;
            align-items: center !important;
          }
          .profile-info-col {
            width: 100%;
          }
          .profile-info-col h1 {
            text-align: center;
          }
          .profile-username-row {
            justify-content: center;
          }
          .profile-social-links {
            justify-content: center;
          }
          .profile-right-col {
            width: 100%;
            align-items: stretch !important;
            flex-shrink: unset !important;
          }
          .profile-follower-row {
            justify-content: center;
          }
          .profile-action-btn {
            width: 100%;
          }
          .profile-bio-grid {
            grid-template-columns: 1fr !important;
          }
          .profile-bio-story {
            grid-template-columns: 1fr !important;
          }
          .profile-wishlist {
            order: -1;
          }
        }
        .profile-items-scroll {
          overflow-x: auto;
          -webkit-overflow-scrolling: touch;
        }
        .profile-items-table {
          min-width: 750px;
        }
        .title-break { display: none; }
        @media (max-width: 430px) { .title-break { display: block; } }
      `}</style>

      {isOwner && checklistState && checklistDismissed && (() => {
        const completed = Object.values(checklistState).filter(Boolean).length
        const total = 5
        if (completed === total) return null
        return (
          <div
            onClick={() => setChecklistExpanded(e => !e)}
            style={{
              display: 'flex', alignItems: 'center', gap: '14px',
              padding: '12px 20px', marginBottom: '20px',
              background: '#FDFAF4', border: '2px solid #1C1610',
              boxShadow: '4px 4px 0 #1C1610', cursor: 'pointer',
            }}
          >
            <span style={{ fontFamily: "'Arvo', serif", fontSize: '0.88rem', fontWeight: 700, color: '#1C1610', flexShrink: 0 }}>
              Getting Started
            </span>
            <div style={{ flex: 1, height: '6px', background: '#EDE5D0', border: '1px solid rgba(28,22,16,0.15)' }}>
              <div style={{ height: '100%', background: '#1E8A82', width: `${(completed / total) * 100}%` }} />
            </div>
            <span style={{ fontFamily: "'Space Mono', monospace", fontSize: '0.55rem', fontWeight: 700, color: '#9A8878', letterSpacing: '0.06em', whiteSpace: 'nowrap' as const, flexShrink: 0 }}>
              {completed} of {total} complete
            </span>
            <span style={{ color: '#9A8878', fontSize: '0.75rem', flexShrink: 0 }}>{checklistExpanded ? '▴' : '▾'}</span>
          </div>
        )
      })()}

      {/* FOLLOWERS / FOLLOWING MODAL */}
      {isOwner && openList && (
          <>
            {/* Backdrop */}
            <div
              style={{ position: 'fixed', inset: 0, zIndex: 200 }}
              onClick={() => setOpenList(null)}
            />
            {/* Modal */}
            <div style={{ position: 'fixed', top: '50%', left: '50%', transform: 'translate(-50%, -50%)', zIndex: 201, backgroundColor: '#fff', border: '2px solid #1C1610', boxShadow: '4px 4px 0 #1C1610', minWidth: '460px', maxWidth: '560px', overflow: 'hidden' as const }}>
              {/* Modal header */}
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '12px 16px', borderBottom: '1px solid #f0f0f0' }}>
                <span style={{ fontWeight: 700, fontSize: '14px', color: '#1C1610', textTransform: 'capitalize' as const }}>{openList}</span>
                <button onClick={() => setOpenList(null)} style={{ background: 'none', border: 'none', cursor: 'pointer', color: '#aaa', fontSize: '18px', lineHeight: 1, padding: '2px 6px' }}>{'×'}</button>
              </div>

              {/* Column headers */}
              <div style={{ padding: '6px 16px 0' }}>
                {/* Super-label row */}
                <div style={{ display: 'grid', gridTemplateColumns: '40px minmax(100px, 180px) 100px 85px 75px', gap: '12px', alignItems: 'end', paddingBottom: '2px' }}>
                  <div /><div /><div />
                  <div style={{ fontSize: '8px', fontWeight: 400, color: '#bbb', textTransform: 'uppercase' as const, letterSpacing: '0.06em', gridColumn: '4 / 6' }}>
                    Items Available...
                  </div>
                </div>
                {/* Sub-label row */}
                <div style={{ display: 'grid', gridTemplateColumns: '40px minmax(100px, 180px) 100px 85px 75px', gap: '12px', alignItems: 'center', paddingBottom: '6px', fontSize: '10px', fontWeight: 700, color: '#aaa', textTransform: 'uppercase' as const, letterSpacing: '0.06em', borderBottom: '1px solid #f0f0f0' }}>
                  <div />
                  <div>{openList === 'followers' ? 'Follower' : 'Following'}</div>
                  <div />
                  <div>To Borrow</div>
                  <div>To Keep</div>
                </div>
              </div>

              {/* Rows */}
              <div style={{ maxHeight: '380px', overflowY: 'auto' as const }}>
                {listLoading ? (
                  <div style={{ padding: '20px 16px', color: '#aaa', fontSize: '0.875rem' }}>Loading...</div>
                ) : (openList === 'followers' ? followersList : followingList).length === 0 ? (
                  <div style={{ padding: '20px 16px', color: '#aaa', fontSize: '0.875rem', fontStyle: 'italic' as const }}>
                    {openList === 'followers' ? 'No followers yet.' : 'Not following anyone yet.'}
                  </div>
                ) : (
                  (openList === 'followers' ? followersList : followingList).map((entry) => (
                    <div key={entry.id} style={{ display: 'grid', gridTemplateColumns: '40px minmax(100px, 180px) 100px 85px 75px', gap: '12px', alignItems: 'center', padding: '10px 16px', borderBottom: '1px solid #f9f9f9' }}>
                      <div style={{ width: '40px', height: '40px', borderRadius: '50%', backgroundColor: '#f0f0f0', backgroundImage: entry.avatar_url ? `url(${entry.avatar_url})` : 'none' as const, backgroundSize: 'cover' as const, backgroundPosition: 'center' as const, border: '2px solid #e5e5e5', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '1rem', color: '#D4A020', fontWeight: 'bold' as const, flexShrink: 0 }}>
                        {!entry.avatar_url && (entry.preferred_name?.charAt(0) || entry.username?.charAt(0) || '?')}
                      </div>
                      <a href={`/profile/${entry.username}`} style={{ textDecoration: 'none' as const, color: 'inherit' as const }}>
                        <div style={{ fontWeight: 600, fontSize: '14px', color: '#1C1610' }}>{entry.preferred_name || entry.username}</div>
                        <div style={{ fontSize: '12px', color: '#aaa' }}>@{entry.username}</div>
                      </a>
                      <button
                        onClick={() => handleListFollowToggle(entry.id, openList!)}
                        style={{ padding: '5px 14px', backgroundColor: entry.isFollowing ? '#EDE5D0' : '#1E8A82', color: entry.isFollowing ? '#4A3828' : '#fff', border: entry.isFollowing ? '1px solid rgba(28,22,16,0.2)' : '1.5px solid #1C1610', cursor: 'pointer', fontWeight: 600, fontSize: '12px' }}
                      >
                        {entry.isFollowing ? 'Following' : 'Follow'}
                      </button>
                      <div style={{ fontSize: '13px', color: '#444', textAlign: 'center' as const }}>{entry.borrowCount}</div>
                      <div style={{ fontSize: '13px', color: '#444', textAlign: 'center' as const }}>{entry.keepCount}</div>
                    </div>
                  ))
                )}
              </div>
            </div>
          </>
        )}

      {/* Playa History | Wish List */}
      <div style={{ paddingTop: '20px' }}>
        <div className="profile-bio-grid" style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '24px' }}>
          <div className="profile-bio">
            <h4 style={subheadStyle}>Playa History</h4>
            <p style={{ fontSize: '0.78rem', color: '#9A8878', margin: '0 0 12px', lineHeight: 1.5 }}>Find and connect with campmates past and present and see what they have or need.</p>
            {isEditing ? (
              <div style={{ marginBottom: '20px' }}>
                <p style={{ ...subheadStyle, marginBottom: '8px' }}>Attending In 2026?</p>
                {(draft2026.status === 'yes' || draft2026.status === 'maybe') && !draft2026.isOpenCamping && !draft2026.isTBD && (
                  <div style={{ position: 'relative' as const, marginBottom: '8px' }}>
                    <input
                      type="text"
                      placeholder="Camp name..."
                      value={draft2026.campInput}
                      onChange={e => handle2026CampInputChange(e.target.value)}
                      onFocus={() => { if (draft2026.campInput.trim()) setDraft2026(prev => ({ ...prev, showDropdown: true })); }}
                      onBlur={() => setTimeout(() => setDraft2026(prev => ({ ...prev, showDropdown: false })), 150)}
                      style={{ width: '100%', padding: '6px 8px', border: '1px solid #ddd', borderRadius: '6px', fontSize: '13px', backgroundColor: '#fff', color: '#1C1610', boxSizing: 'border-box' as const, outline: 'none' }}
                    />
                    {draft2026.showDropdown && (draft2026.searchResults.length > 0 || draft2026.campInput.trim()) && (
                      <div style={{ position: 'absolute' as const, top: '100%', left: 0, right: 0, backgroundColor: '#fff', border: '1px solid #ddd', borderRadius: '6px', zIndex: 10, boxShadow: '0 4px 12px rgba(0,0,0,0.12)', overflow: 'hidden' as const }}>
                        {draft2026.searchResults.map((camp: any) => (
                          <div key={camp.id} onMouseDown={() => setDraft2026(prev => ({ ...prev, campInput: camp.display_name, campId: camp.id, searchResults: [], showDropdown: false }))} style={{ padding: '8px 12px', cursor: 'pointer', fontSize: '0.875rem', color: '#1C1610' }}>
                            {camp.display_name}
                          </div>
                        ))}
                        {draft2026.campInput.trim() && !draft2026.searchResults.some((c: any) => c.display_name.toLowerCase() === draft2026.campInput.trim().toLowerCase()) && (
                          <div onMouseDown={() => setDraft2026(prev => ({ ...prev, showDropdown: false }))} style={{ padding: '8px 12px', cursor: 'pointer', fontSize: '0.875rem', color: '#1E8A82', borderTop: draft2026.searchResults.length > 0 ? '1px solid #f0f0f0' : undefined }}>
                            Add &quot;{draft2026.campInput}&quot; as a new camp
                          </div>
                        )}
                      </div>
                    )}
                  </div>
                )}
                <div style={{ display: 'flex', gap: '8px', alignItems: 'center', flexWrap: 'wrap' as const }}>
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
                  {(draft2026.status === 'yes' || draft2026.status === 'maybe') && (
                    <>
                      <label style={{ display: 'flex', alignItems: 'center', gap: '5px', fontSize: '0.8rem', color: '#555', cursor: 'pointer' }}>
                        <input
                          type="checkbox"
                          checked={draft2026.isOpenCamping}
                          onChange={e => setDraft2026(prev => ({ ...prev, isOpenCamping: e.target.checked, isTBD: false, campInput: '', campId: null }))}
                        />
                        Open Camping
                      </label>
                      <label style={{ display: 'flex', alignItems: 'center', gap: '5px', fontSize: '0.8rem', color: '#555', cursor: 'pointer' }}>
                        <input
                          type="checkbox"
                          checked={draft2026.isTBD}
                          onChange={e => setDraft2026(prev => ({ ...prev, isTBD: e.target.checked, isOpenCamping: false, campInput: '', campId: null }))}
                        />
                        TBD
                      </label>
                    </>
                  )}
                  {draft2026.status === 'no' && (
                    <>
                      <span style={yearBadgeLabelStyle}>Camp:</span>
                      <span style={{ ...camp2026ChipStyle, opacity: 0.6 }}>N/A</span>
                    </>
                  )}
                </div>
              </div>
            ) : (() => {
              const aff2026 = affiliations.find((a: any) => a.year === 2026);
              if (!aff2026?.returning_status) return null;
              const campName2026 = (aff2026.camps as any)?.display_name ?? null;
              const campSlug2026 = (aff2026.camps as any)?.slug ?? null;
              return (
                <div style={{ marginBottom: '20px', display: 'flex', alignItems: 'center', gap: '8px', flexWrap: 'wrap' as const }}>
                  <span style={yearBadgeLabelStyle}>2026:</span>
                  {attending2026Badge(aff2026.returning_status)}
                  <span style={yearBadgeLabelStyle}>Camp:</span>
                  {aff2026.returning_status === 'no' ? (
                    <span style={camp2026ChipStyle}>N/A</span>
                  ) : aff2026.is_open_camping ? (
                    <span style={camp2026ChipStyle}>Open Camping</span>
                  ) : campSlug2026 ? (
                    <a href={`/camps/${campSlug2026}`} style={{ ...camp2026ChipStyle, color: '#1E8A82', textDecoration: 'none' }}>{campName2026}</a>
                  ) : campName2026 ? (
                    <span style={camp2026ChipStyle}>{campName2026}</span>
                  ) : (
                    <span style={camp2026ChipStyle}>TBD</span>
                  )}
                </div>
              );
            })()}
            {isEditing ? (
              <div>
                <p style={{ fontSize: '0.8rem', color: '#999', margin: '0 0 10px' }}>
                  Add each year you attended with your camp, or tick Open Camping.
                </p>
                {draftAffiliations.map(draft => (
                  <div key={draft.tempId} style={{ display: 'flex', gap: '8px', alignItems: 'flex-start', marginBottom: '8px' }}>
                    <select
                      value={draft.year}
                      onChange={e => updateDraft(draft.tempId, { year: parseInt(e.target.value) })}
                      style={{ padding: '6px 8px', border: '1px solid #ddd', borderRadius: '6px', fontSize: '13px', backgroundColor: '#fff', color: '#1C1610', flexShrink: 0, width: '90px' }}
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
                          style={{ width: '100%', padding: '6px 8px', border: '1px solid #ddd', borderRadius: '6px', fontSize: '13px', backgroundColor: '#fff', color: '#1C1610', boxSizing: 'border-box' as const, outline: 'none' }}
                        />
                        {draft.showDropdown && (draft.searchResults.length > 0 || draft.campInput.trim()) && (
                          <div style={{ position: 'absolute' as const, top: '100%', left: 0, right: 0, backgroundColor: '#fff', border: '1px solid #ddd', borderRadius: '6px', zIndex: 10, boxShadow: '0 4px 12px rgba(0,0,0,0.12)', overflow: 'hidden' as const }}>
                            {draft.searchResults.map((camp: any) => (
                              <div key={camp.id} onMouseDown={() => selectCamp(draft.tempId, camp)} style={{ padding: '8px 12px', cursor: 'pointer', fontSize: '0.875rem', color: '#1C1610' }}>
                                {camp.display_name}
                              </div>
                            ))}
                            {draft.campInput.trim() && !draft.searchResults.some((c: any) => c.display_name.toLowerCase() === draft.campInput.trim().toLowerCase()) && (
                              <div onMouseDown={() => updateDraft(draft.tempId, { showDropdown: false })} style={{ padding: '8px 12px', cursor: 'pointer', fontSize: '0.875rem', color: '#1E8A82', borderTop: draft.searchResults.length > 0 ? '1px solid #f0f0f0' : undefined }}>
                                Add &quot;{draft.campInput}&quot; as a new camp
                              </div>
                            )}
                          </div>
                        )}
                      </div>
                    )}
                    <button onClick={() => removeDraftEntry(draft.tempId)} style={{ background: 'none', border: 'none', cursor: 'pointer', color: '#ccc', fontSize: '1.2rem', lineHeight: 1, flexShrink: 0, padding: '4px', paddingTop: '6px' }} aria-label="Remove">{'×'}</button>
                  </div>
                ))}
                <button onClick={addDraftEntry} style={{ marginTop: '4px', fontSize: '0.8rem', color: '#1E8A82', background: 'none', border: '1px dashed #1E8A82', borderRadius: '6px', padding: '5px 14px', cursor: 'pointer' }}>
                  Add Year
                </button>
              </div>
            ) : affiliations.filter((a: any) => a.year !== 2026).length > 0 ? (
              <div style={{ display: 'flex', flexWrap: 'wrap' as const, gap: '6px' }}>
                {affiliations.filter((aff: any) => aff.year !== 2026).map((aff: any) => {
                  const campName = (aff.camps as any)?.display_name ?? null;
                  const campSlug = (aff.camps as any)?.slug ?? null;
                  return (
                    <div key={aff.id} style={{ display: 'inline-flex', alignItems: 'center', gap: '6px', backgroundColor: '#EDE5D0', border: '1.5px solid rgba(28,22,16,0.2)', padding: '3px 10px 3px 4px' }}>
                      <span style={{ backgroundColor: '#D4A020', padding: '2px 8px', color: '#fff', fontSize: '0.72rem', fontWeight: 700, fontFamily: "'Space Mono', monospace", flexShrink: 0, letterSpacing: '0.04em' }}>
                        {aff.year}
                      </span>
                      {aff.is_open_camping ? (
                        <span style={{ fontSize: '0.8rem', color: '#9A8878', fontStyle: 'italic' as const }}>Open Camping</span>
                      ) : campSlug ? (
                        <a href={`/camps/${campSlug}`} style={{ fontSize: '0.8rem', color: '#1E8A82', textDecoration: 'none', fontWeight: 600 }}>{campName}</a>
                      ) : campName ? (
                        <span style={{ fontSize: '0.8rem', color: '#4A3828' }}>{campName}</span>
                      ) : null}
                      {aff.returning_status && returningBadge(aff.returning_status)}
                    </div>
                  );
                })}
              </div>
            ) : (
              <span style={{ color: '#aaa', fontStyle: 'italic' as const, fontSize: '0.9rem' }}>No years listed yet.</span>
            )}
          </div>

          <div className="profile-wishlist">
            <h4 style={subheadStyle}>Wish List</h4>
            <p style={{ fontSize: '0.78rem', color: '#9A8878', margin: '0 0 12px', lineHeight: 1.5 }}>Add items you&apos;re looking for — others can reach out if they have them.</p>
            <div style={{ display: 'flex', flexWrap: 'wrap' as const, gap: '8px', marginBottom: wishTags.length > 0 ? '12px' : '0' }}>
              {wishTags.length === 0 && !isOwner && (
                <span style={{ color: '#aaa', fontStyle: 'italic' as const, fontSize: '0.9rem' }}>No wishlist yet.</span>
              )}
              {wishTags.map(tag => (
                <span key={tag} style={{ display: 'inline-flex', alignItems: 'center', gap: '6px', padding: '4px 12px', border: '1.5px solid #1E8A82', backgroundColor: '#D4EDEB', color: '#1E8A82', fontSize: '0.82rem', fontWeight: 600, fontFamily: "'Space Mono', monospace" }}>
                  {tag}
                  {isOwner && (
                    <button onClick={() => removeTag(tag)} style={{ background: 'transparent', border: 'none', cursor: 'pointer', padding: '0', lineHeight: 1, color: '#005566', fontSize: '14px', fontWeight: 'bold' }} aria-label={`Remove ${tag}`}>{'×'}</button>
                  )}
                </span>
              ))}
            </div>
            {isOwner && (
              <div style={{ display: 'flex', gap: '8px' }}>
                <input type="text" value={tagInput} placeholder="Add an item..." onChange={e => setTagInput(e.target.value)} onKeyDown={e => { if (e.key === 'Enter') { e.preventDefault(); addTag(); } }} disabled={tagSaving} style={{ flex: 1, backgroundColor: '#FDFAF4', color: '#1C1610', border: '2px solid #1C1610', padding: '7px 10px', fontSize: '0.85rem', outline: 'none', fontFamily: 'inherit', opacity: tagSaving ? 0.5 : 1 }} />
                <button onClick={addTag} disabled={tagSaving} style={{ backgroundColor: '#1E8A82', color: '#fff', border: '2px solid #1C1610', boxShadow: '2px 2px 0 #1C1610', padding: '7px 16px', fontWeight: 700, fontSize: '0.82rem', cursor: tagSaving ? 'default' as const : 'pointer' as const, fontFamily: 'inherit', opacity: tagSaving ? 0.5 : 1 }}>Add</button>
              </div>
            )}
            {!isOwner && currentUserId && wishTags.length > 0 && (
              <div style={{ marginTop: '14px' }}>
                <p style={{ margin: '0 0 6px', fontSize: '0.78rem', color: '#aaa' }}>Got something they're looking for?</p>
                <button
                  onClick={() => setShowWishMatchModal(true)}
                  style={{ padding: '7px 14px', backgroundColor: '#FDFAF4', color: '#1C1610', border: '2px solid #1C1610', boxShadow: '2px 2px 0 #1C1610', fontSize: '0.82rem', fontWeight: 700, cursor: 'pointer', fontFamily: 'inherit' }}
                >
                  I have one of these
                </button>
              </div>
            )}
          </div>
        </div>

        {/* BIO + PLAYA STORY */}
        <div className="profile-bio-story" style={{ marginTop: '24px', display: 'grid', gridTemplateColumns: '3fr 1fr', gap: '24px' }}>
          <div style={{ border: '1.5px solid rgba(28,22,16,0.15)', backgroundColor: '#FDFAF4', padding: '16px' }}>
            <h4 style={subheadStyle}>Bio</h4>
            {isEditing ? (
              <textarea style={editTextareaStyle} value={profile.bio || ''} onChange={e => setProfile({ ...profile, bio: e.target.value })} />
            ) : (
              <p style={{ fontSize: '1rem', color: '#444', margin: 0, lineHeight: '1.6' }}>
                {profile.bio || <span style={{ color: '#aaa', fontStyle: 'italic' as const }}>No bio yet.</span>}
              </p>
            )}
          </div>
          <div style={{ border: '1.5px solid rgba(28,22,16,0.15)', backgroundColor: '#FDFAF4', padding: '16px' }}>
            <h4 style={subheadStyle}>Got a good &quot;playa provides&quot; story?</h4>
            {isEditing ? (
              <textarea style={editTextareaStyle} value={profile.playa_story || ''} onChange={e => setProfile({ ...profile, playa_story: e.target.value })} placeholder="Share a time the playa provided..." />
            ) : (
              <p style={{ fontSize: '1rem', color: '#444', margin: 0, lineHeight: '1.6' }}>
                {profile.playa_story || <span style={{ color: '#aaa', fontStyle: 'italic' as const }}>No story yet.</span>}
              </p>
            )}
          </div>
        </div>

      </div>{/* end bio/wishlist/playa section */}

      {/* AVAILABLE ITEMS */}
      <section style={{ marginTop: '40px' }}>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '16px' }}>
          <div>
            <h2 style={{ fontFamily: "'Arvo', serif", fontSize: '1.3rem', fontWeight: 700, color: '#1C1610', margin: '0 0 2px' }}>Available Items</h2>
            {isOwner && (
              <p style={{ fontSize: '0.78rem', color: '#9A8878', margin: 0, lineHeight: 1.5 }}>
                <Link href="/inventory" style={{ color: '#1E8A82', fontWeight: 600, textDecoration: 'underline' }}>Visit your inventory</Link> to see your full list, including private items.
              </p>
            )}
          </div>
          {isOwner && (
            <div style={{ display: 'flex', gap: '8px' }}>
              <Link href="/inventory" style={{ backgroundColor: 'transparent', color: '#1C1610', padding: '6px 14px', fontSize: '0.8rem', fontWeight: 600, border: '2px solid #1C1610', textDecoration: 'none', display: 'inline-block', fontFamily: 'inherit' }}>
                Manage Inventory
              </Link>
              <button
                onClick={() => setShowAddItem(true)}
                style={{ backgroundColor: '#1E8A82', color: '#fff', padding: '6px 14px', fontSize: '0.8rem', fontWeight: 700, border: '2px solid #1C1610', boxShadow: '2px 2px 0 #1C1610', cursor: 'pointer', fontFamily: 'inherit' }}
              >
                Add Item
              </button>
            </div>
          )}
        </div>
        {items.length === 0 ? (
          <p style={{ color: '#aaa', fontSize: '0.9rem' }}>No items listed yet.</p>
        ) : (
          <div className="profile-items-scroll">
          <div className="profile-items-table" style={{ display: 'flex', flexDirection: 'column' as const, gap: '2px' }}>
            <div style={{ ...listHeaderStyle, gridTemplateColumns: isOwner ? '50px 160px 1fr 140px 120px 1fr 80px' : '50px 160px 1fr 140px 120px 1fr' }}>
              <div />
              <div>Item</div>
              <div>Description</div>
              <div>Category</div>
              <div>Location</div>
              <div>Terms</div>
              {isOwner && <div>Visible To</div>}
            </div>
            {items.map(item => {
              const loc = item.locations
                ? [item.locations.city, item.locations.state].filter(Boolean).join(', ')
                : '—';
              const isKeep = item.availability_status === 'Available to Keep';
              const termsSummary = isKeep ? '' : [
                item.return_by ? `Return by ${new Date(item.return_by).toLocaleDateString()}` : null,
                item.damage_price ? `Damage agr. $${item.damage_price}` : null,
                item.loss_price ? `Loss agr. $${item.loss_price}` : null,
                item.return_terms ? item.return_terms : null,
              ].filter(Boolean).join(' · ');
              const visPills = (() => {
                const v = item.visibility;
                if (v === 'followers') return [{ label: 'Followers', bg: '#f0effe', color: '#6D28D9', border: '#ddd6fe' }];
                if (v === 'campmates') return [{ label: 'Campmates', bg: '#f0fdf4', color: '#15803D', border: '#bbf7d0' }];
                if (v === 'followers_and_campmates') return [
                  { label: 'Followers', bg: '#f0effe', color: '#6D28D9', border: '#ddd6fe' },
                  { label: 'Campmates', bg: '#f0fdf4', color: '#15803D', border: '#bbf7d0' },
                ];
                if (v === 'private') return [{ label: 'Just Me', bg: '#F5F0D0', color: '#92400e', border: '#e8dcae' }];
                return [{ label: 'Everyone', bg: '#F5F0D0', color: '#92400e', border: '#e8dcae' }];
              })();

              return (
                <a key={item.id} href={`/find-items/${item.id}`} target="_blank" style={{ display: 'block', textDecoration: 'none', color: 'inherit', cursor: 'pointer' }}>
                  <div style={{ ...listRowStyle, gridTemplateColumns: isOwner ? '50px 160px 1fr 140px 120px 1fr 80px' : '50px 160px 1fr 140px 120px 1fr' }}>
                    <div style={listImgStyle}>
                      {item.image_urls?.[0]
                        ? <img src={item.image_urls[0]} alt="" style={{ width: '100%', height: '100%', objectFit: 'contain' as const }} />
                        : <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', height: '100%', color: '#ccc' }}><Package size={16} /></div>
                      }
                    </div>
                    <div style={{ overflow: 'hidden' }}>
                      <div style={{ fontWeight: '600', color: '#111', fontSize: '14px' }}>{item.item_name}</div>
                      <div style={{ fontSize: '10px', color: '#1E8A82', fontWeight: 'bold', textTransform: 'uppercase' as const, marginTop: '2px' }}>
                        {item.availability_status === 'Available to Keep' ? 'Keep' : 'Borrow'}
                      </div>
                    </div>
                    <div style={{ ...listColStyle, whiteSpace: 'normal', display: '-webkit-box', WebkitLineClamp: 2, WebkitBoxOrient: 'vertical' as const }}>{item.description || 'â€"'}</div>
                    <div style={listColStyle}>{item.category}</div>
                    <div style={{ ...listColStyle, display: 'flex', alignItems: 'center', gap: '3px' }}>
                      <MapPin size={11} style={{ flexShrink: 0 }} />{loc}
                    </div>
                    <div style={{ ...listColStyle, fontSize: '11px', color: '#888', whiteSpace: 'normal', display: '-webkit-box', WebkitLineClamp: 2, WebkitBoxOrient: 'vertical' as const }}>{termsSummary || 'â€"'}</div>
                    {isOwner && (
                      <div style={{ display: 'flex', flexDirection: 'column' as const, gap: '3px', alignSelf: 'center' }}>
                        {visPills.map(p => (
                          <div key={p.label} style={{ fontSize: '9px', fontWeight: 700, padding: '2px 6px', borderRadius: 10, backgroundColor: p.bg, color: p.color, border: `1px solid ${p.border}`, width: 'fit-content' as const }}>
                            {p.label}
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                </a>
              );
            })}
          </div>
          </div>
        )}
      </section>

      {showAddItem && (
        <AddItemModal
          itemToEdit={null}
          onClose={() => setShowAddItem(false)}
          onSuccess={() => { setShowAddItem(false); refetchOwnerGear(); }}
        />
      )}

      {showWishMatchModal && profile && currentUserId && (
        <WishListMatchModal
          profile={profile}
          wishTags={wishTags}
          currentUserId={currentUserId}
          isFollowing={isFollowing}
          onClose={() => setShowWishMatchModal(false)}
        />
      )}

      {showWelcome && profile && (
        <WelcomeModal userId={profile.id} onClose={() => setShowWelcome(false)} />
      )}
    </div>
    </div>
  );
}

// --- STYLES ---
const LIST_COLS = '50px 160px 1fr 140px 120px 1fr 60px';

const subheadStyle: React.CSSProperties = { fontFamily: "'Space Mono', monospace", color: '#4A3828', textTransform: 'uppercase' as const, fontSize: '0.68rem', fontWeight: 700, marginBottom: '6px', marginTop: 0, letterSpacing: '0.08em' };
const camp2026ChipStyle: React.CSSProperties = { fontSize: '0.85rem', fontWeight: 700, padding: '4px 12px', backgroundColor: '#EDE5D0', color: '#4A3828', border: '1.5px solid rgba(28,22,16,0.2)', flexShrink: 0 };
// Matches the year badge on Playa History year chips (backgroundColor: '#D4A020')
const yearBadgeLabelStyle: React.CSSProperties = { backgroundColor: '#D4A020', padding: '2px 8px', color: '#fff', fontSize: '0.72rem', fontWeight: 700, fontFamily: "'Space Mono', monospace", flexShrink: 0, letterSpacing: '0.04em' };
const editTextareaStyle: React.CSSProperties = { width: '100%', backgroundColor: '#FDFAF4', color: '#1C1610', border: '1.5px solid rgba(28,22,16,0.25)', padding: '10px', height: '80px', boxSizing: 'border-box' as const, outline: 'none' };
const listHeaderStyle: React.CSSProperties = { display: 'grid', gridTemplateColumns: LIST_COLS, gap: '10px', padding: '8px 12px', fontFamily: "'Space Mono', monospace", fontSize: '0.55rem', fontWeight: 700, color: '#9A8878', textTransform: 'uppercase' as const, letterSpacing: '0.06em', borderBottom: '1.5px solid rgba(28,22,16,0.12)' };
const listRowStyle: React.CSSProperties = { display: 'grid', gridTemplateColumns: LIST_COLS, gap: '10px', alignItems: 'center', padding: '10px 12px', backgroundColor: '#FDFAF4', borderBottom: '1px solid rgba(28,22,16,0.06)' };
const listImgStyle: React.CSSProperties = { width: '50px', height: '50px', overflow: 'hidden', backgroundColor: '#EDE5D0', flexShrink: 0 };
const listColStyle: React.CSSProperties = { fontSize: '12px', color: '#4A3828', overflow: 'hidden', whiteSpace: 'nowrap' as const };
