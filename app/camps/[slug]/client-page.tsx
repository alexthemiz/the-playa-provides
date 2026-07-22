'use client';

import { useEffect, useState, useRef } from 'react';
import { useParams } from 'next/navigation';
import { supabase } from '@/lib/supabaseClient';
import Link from 'next/link';
import type React from 'react';
import PolaroidPhoto from '@/components/PolaroidPhoto';
import { LayoutGrid, List, MapPin, User, Package, Pencil } from 'lucide-react';

export default function CampPage() {
  const params = useParams();
  const slug = params.slug as string;

  const [camp, setCamp] = useState<any>(null);
  const [pageOwner, setPageOwner] = useState<any>(null);
  const [members, setMembers] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  // Session / auth
  const [currentUserId, setCurrentUserId] = useState<string | null>(null);
  const [isMember, setIsMember] = useState(false); // is the logged-in user a member of this camp?

  // Claim form state
  const [showClaimForm, setShowClaimForm] = useState(false);
  const [existingClaim, setExistingClaim] = useState<string | null>(null);
  const [claimRole, setClaimRole] = useState('');
  const [claimYears, setClaimYears] = useState('');
  const [claimSubmitting, setClaimSubmitting] = useState(false);
  const [claimError, setClaimError] = useState('');
  const [claimSuccess, setClaimSuccess] = useState(false);

  // Edit mode
  const [editMode, setEditMode] = useState(false);
  const [editDisplayName, setEditDisplayName] = useState('');
  const [editDescription, setEditDescription] = useState('');
  const [editFoundedYear, setEditFoundedYear] = useState('');
  const [editHomebase, setEditHomebase] = useState('');
  const [editSocialLinks, setEditSocialLinks] = useState<Record<string, string>>({});
  const [editReturning2026, setEditReturning2026] = useState<boolean | null>(null);
  const [editSaving, setEditSaving] = useState(false);
  const [editError, setEditError] = useState('');
  const [bannerUploading, setBannerUploading] = useState(false);
  const [bannerDeleteConfirming, setBannerDeleteConfirming] = useState(false);
  const [bannerDeleting, setBannerDeleting] = useState(false);
  const bannerInputRef = useRef<HTMLInputElement>(null);

  // Camp items state
  const [campItems, setCampItems] = useState<any[]>([]);
  const [campItemsLoading, setCampItemsLoading] = useState(false);
  const [campViewMode, setCampViewMode] = useState<'grid' | 'list'>('list');

  // Member management
  const [memberActionError, setMemberActionError] = useState('');
  // userId → 'yes'|'maybe'|'no'|'other' (different camp / open camping) | undefined (no 2026 row)
  const [returning2026Map, setReturning2026Map] = useState<Record<string, string>>({});

  useEffect(() => {
    supabase.auth.getSession().then(({ data: { session } }) => {
      setCurrentUserId(session?.user?.id ?? null);
    });
  }, []);

  useEffect(() => {
    async function fetchCamp() {
      setLoading(true);
      try {
        const { data: campData } = await supabase
          .from('camps')
          .select('*')
          .eq('slug', slug)
          .single();

        if (!campData) { setLoading(false); return; }
        setCamp(campData);

        // Check for existing claim request from current user
        const { data: { session } } = await supabase.auth.getSession();
        if (session && !campData.is_claimed) {
          const { data: existingReq } = await supabase
            .from('camp_claim_requests')
            .select('status')
            .eq('camp_id', campData.id)
            .eq('user_id', session.user.id)
            .maybeSingle();
          setExistingClaim(existingReq?.status ?? null);
        }

        // Check membership for the logged-in user
        if (session) {
          const { data: affRow } = await supabase
            .from('user_camp_affiliations')
            .select('id')
            .eq('camp_id', campData.id)
            .eq('user_id', session.user.id)
            .maybeSingle();
          setIsMember(!!affRow);
        }

        // Fetch page owner profile if claimed
        if (campData.is_claimed && campData.page_owner_id) {
          const { data: ownerData } = await supabase
            .from('profiles')
            .select('username, preferred_name')
            .eq('id', campData.page_owner_id)
            .maybeSingle();
          setPageOwner(ownerData);
        }

        // Fetch affiliations with member profiles (including role and wish_list)
        const { data: affData } = await supabase
          .from('user_camp_affiliations')
          .select('year, role, profiles(id, username, preferred_name, avatar_url, wish_list, city, state)')
          .eq('camp_id', campData.id)
          .order('year', { ascending: false });

        // Group by user, aggregate years; take 'admin' role if any row has it
        const memberMap = new Map<string, any>();
        for (const aff of affData || []) {
          const profile = aff.profiles as any;
          if (!profile) continue;
          if (!memberMap.has(profile.id)) {
            memberMap.set(profile.id, { ...profile, years: [], role: aff.role });
          } else {
            // Promote to admin if any row says admin
            if (aff.role === 'admin') memberMap.get(profile.id)!.role = 'admin';
          }
          memberMap.get(profile.id)!.years.push(aff.year);
        }
        const memberList = Array.from(memberMap.values())
          .sort((a, b) => Math.max(...b.years) - Math.max(...a.years));
        setMembers(memberList);

        // Fetch each member's 2026 returning status for this specific camp
        if (memberList.length > 0) {
          const memberIds = memberList.map((m: any) => m.id);
          const { data: ret2026 } = await supabase
            .from('user_camp_affiliations')
            .select('user_id, returning_status, camp_id, is_open_camping')
            .in('user_id', memberIds)
            .eq('year', 2026);
          const rmap: Record<string, string> = {};
          for (const row of ret2026 || []) {
            if (row.camp_id === campData.id) {
              // Affiliation is for THIS camp — use returning_status directly
              rmap[row.user_id] = row.returning_status || 'none';
            } else if (!rmap[row.user_id]) {
              // Has a 2026 row but for a different camp / open camping → show ✗
              rmap[row.user_id] = 'other';
            }
          }
          setReturning2026Map(rmap);
        }
      } catch (err) {
        console.error('fetchCamp error:', err);
      } finally {
        setLoading(false);
      }
    }
    if (slug) fetchCamp();
  }, [slug]);

  // Fetch items from camp members whenever the member list resolves
  useEffect(() => {
    if (members.length === 0) { setCampItems([]); return; }
    async function fetchCampItems() {
      setCampItemsLoading(true);
      try {
        const memberIds = members.map((m: any) => m.id);
        const { data: gear, error } = await supabase
          .from('gear_items')
          .select('*')
          .in('user_id', memberIds)
          .in('availability_status', ['Available to Borrow', 'Available to Keep'])
          .in('visibility', ['public', 'campmates'])
          .eq('owner_deleted', false);
        if (error) throw error;

        const userIds = [...new Set((gear || []).map((i: any) => i.user_id))];
        const locationIds = [...new Set((gear || []).map((i: any) => i.location_id).filter(Boolean))];

        const [profilesRes, locationsRes] = await Promise.all([
          supabase.from('profiles').select('id, preferred_name, username').in('id', userIds),
          locationIds.length
            ? supabase.from('locations').select('id, city, state, zip_code').in('id', locationIds)
            : Promise.resolve({ data: [] as any[] }),
        ]);

        setCampItems((gear || []).map((item: any) => ({
          ...item,
          profiles: profilesRes.data?.find((p: any) => p.id === item.user_id),
          locations: (locationsRes.data || []).find((l: any) => l.id === item.location_id),
        })));
      } catch (err: any) {
        console.error('fetchCampItems error:', err.message);
      } finally {
        setCampItemsLoading(false);
      }
    }
    fetchCampItems();
  }, [members]);


  if (loading) return <div style={{ padding: '40px', backgroundColor: '#F6F1E8', minHeight: '100vh' }}>Loading...</div>;
  if (!camp) return <div style={{ padding: '40px', backgroundColor: '#F6F1E8', minHeight: '100vh' }}>Camp not found.</div>;

  const isPageOwner = !!(currentUserId && camp.is_claimed && camp.page_owner_id === currentUserId);

  // Determine logged-in user's role in the camp
  const myMemberRow = members.find(m => m.id === currentUserId);
  const myRole = myMemberRow?.role ?? null; // 'admin' | 'member' | null

  // ── Claim form handler ──
  const handleClaimSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setClaimSubmitting(true);
    setClaimError('');
    try {
      const { error: insertError } = await supabase
        .from('camp_claim_requests')
        .insert({ camp_id: camp.id, user_id: currentUserId, role: claimRole || null, years: claimYears || null });
      if (insertError) throw new Error(insertError.message);

      supabase.functions.invoke('send-camp-claim-notification', {
        body: { camp_id: camp.id, user_id: currentUserId, role: claimRole || null, years: claimYears || null },
      });

      setClaimSuccess(true);
      setExistingClaim('pending');
      setShowClaimForm(false);
    } catch (err: any) {
      setClaimError(err.message || 'Something went wrong. Please try again.');
    } finally {
      setClaimSubmitting(false);
    }
  };

  // ── Edit mode ──
  const enterEditMode = () => {
    setEditDisplayName(camp.display_name || '');
    setEditDescription(camp.description || '');
    setEditFoundedYear(camp.founded_year ? String(camp.founded_year) : '');
    setEditHomebase(camp.homebase || '');
    setEditSocialLinks(camp.social_links || {});
    setEditReturning2026(camp.returning_2026 ?? null);
    setEditError('');
    setEditMode(true);
  };

  const cancelEdit = () => {
    setEditMode(false);
    setEditError('');
  };

  const handleBannerDelete = async () => {
    setBannerDeleting(true);
    try {
      const url = camp.banner_url.split('?')[0];
      const marker = '/camp-banners/';
      const idx = url.indexOf(marker);
      if (idx !== -1) {
        const storagePath = url.slice(idx + marker.length);
        await supabase.storage.from('camp-banners').remove([storagePath]);
      }
      await supabase.from('camps').update({ banner_url: null }).eq('id', camp.id);
      setCamp((prev: any) => ({ ...prev, banner_url: null }));
      setBannerDeleteConfirming(false);
    } catch (err: any) {
      setEditError(err.message || 'Delete failed.');
    } finally {
      setBannerDeleting(false);
    }
  };

  const handleBannerUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setBannerUploading(true);
    try {
      const ext = file.name.split('.').pop();
      const path = `${camp.id}/banner.${ext}`;
      const { error: upErr } = await supabase.storage
        .from('camp-banners')
        .upload(path, file, { upsert: true });
      if (upErr) throw upErr;
      const { data: urlData } = supabase.storage.from('camp-banners').getPublicUrl(path);
      const bannerUrl = `${urlData.publicUrl}?t=${Date.now()}`;
      await supabase.from('camps').update({ banner_url: bannerUrl }).eq('id', camp.id);
      setCamp((prev: any) => ({ ...prev, banner_url: bannerUrl }));
    } catch (err: any) {
      setEditError(err.message || 'Banner upload failed.');
    } finally {
      setBannerUploading(false);
    }
  };

  const handleSaveEdit = async () => {
    setEditSaving(true);
    setEditError('');
    try {
      const updates: Record<string, any> = {
        display_name: editDisplayName.trim() || camp.display_name,
        description: editDescription.trim() || null,
        founded_year: editFoundedYear ? parseInt(editFoundedYear, 10) : null,
        homebase: editHomebase.trim() || null,
        returning_2026: editReturning2026,
        social_links: editSocialLinks,
        updated_at: new Date().toISOString(),
      };
      const { error } = await supabase.from('camps').update(updates).eq('id', camp.id);
      if (error) throw error;
      setCamp((prev: any) => ({ ...prev, ...updates }));
      setEditMode(false);
    } catch (err: any) {
      setEditError(err.message || 'Save failed.');
    } finally {
      setEditSaving(false);
    }
  };

  // ── Member management ──
  const handleSetRole = async (member: any, newRole: 'admin' | 'member') => {
    setMemberActionError('');
    const { error } = await supabase
      .from('user_camp_affiliations')
      .update({ role: newRole })
      .eq('camp_id', camp.id)
      .eq('user_id', member.id);
    if (error) { setMemberActionError(error.message); return; }
    setMembers(prev => prev.map(m => m.id === member.id ? { ...m, role: newRole } : m));
  };

  const handleMakeOwner = async (member: any) => {
    setMemberActionError('');
    // Transfer ownership: update camps.page_owner_id
    const { error: campErr } = await supabase
      .from('camps')
      .update({ page_owner_id: member.id })
      .eq('id', camp.id);
    if (campErr) { setMemberActionError(campErr.message); return; }

    // Demote the previous owner to 'member' in affiliations
    const prevOwnerId = camp.page_owner_id;
    if (prevOwnerId) {
      const { data: existing } = await supabase
        .from('user_camp_affiliations')
        .select('id')
        .eq('camp_id', camp.id)
        .eq('user_id', prevOwnerId)
        .maybeSingle();
      if (existing) {
        await supabase
          .from('user_camp_affiliations')
          .update({ role: 'member' })
          .eq('camp_id', camp.id)
          .eq('user_id', prevOwnerId);
      } else {
        // Insert affiliation row for previous owner if missing
        await supabase
          .from('user_camp_affiliations')
          .insert({ camp_id: camp.id, user_id: prevOwnerId, year: new Date().getFullYear(), role: 'member' });
      }
    }

    setCamp((prev: any) => ({ ...prev, page_owner_id: member.id }));
    setMembers(prev => prev.map(m => {
      if (m.id === member.id) return { ...m, role: 'admin' };
      if (m.id === prevOwnerId) return { ...m, role: 'member' };
      return m;
    }));
  };

  const handleRemoveMember = async (member: any) => {
    setMemberActionError('');
    const { error } = await supabase
      .from('user_camp_affiliations')
      .delete()
      .eq('camp_id', camp.id)
      .eq('user_id', member.id);
    if (error) { setMemberActionError(error.message); return; }

    // Notification to removed user
    supabase.from('notifications').insert({
      type: 'camp_member_removed',
      recipient_id: member.id,
      actor_id: currentUserId,
      camp_id: camp.id,
    });

    setMembers(prev => prev.filter(m => m.id !== member.id));
  };

  // Social link platform config — edit mode shows only these three
  const socialPlatforms = [
    { key: 'facebook',  label: 'Facebook' },
    { key: 'instagram', label: 'Instagram' },
    { key: 'website',   label: 'Camp Website' },
  ];
  // Label map used for view-mode pills (covers legacy keys too)
  const socialLabelMap: Record<string, string> = {
    facebook: 'Facebook', instagram: 'Instagram', website: 'Camp Website',
    bluesky: 'Bluesky', linkedin: 'LinkedIn', eplaya: 'ePlaya',
  };

  // Title split for header band
  const nameParts = (camp.display_name || '').split(' ');
  const titleFirst = nameParts.length > 1 ? nameParts.slice(0, -1).join(' ') : '';
  const titleLast  = nameParts.length > 1 ? nameParts[nameParts.length - 1] : camp.display_name;

  return (
    <div style={{ backgroundColor: '#F6F1E8', minHeight: '100vh', color: '#1C1610' }}>
      <style>{`
        @media (max-width: 640px) {
          .camp-title-row { flex-direction: column !important; gap: 12px !important; }
          .camp-content-row { flex-direction: column !important; }
          .camp-content-row > div:last-child { width: 100% !important; max-width: 100% !important; }
        }
      `}</style>

      {/* PAGE HEADER BAND */}
      <div style={{ backgroundColor: '#FDFAF4', borderBottom: '2px solid #1C1610', padding: '28px 0 52px' }}>
        <div className="rsp-px" style={{ maxWidth: '1280px', margin: '0 auto' }}>
          <div className="camp-title-row" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: '16px' }}>
            <div>
              <h1 style={{ fontFamily: "'Arvo', serif", fontSize: '1.9rem', fontWeight: 900, color: '#1C1610', margin: 0, lineHeight: 1.05 }}>
                {titleFirst && <>{titleFirst}{' '}</>}
                <em style={{ fontStyle: 'italic', color: '#B8CC2A' }}>{titleLast}</em>
              </h1>
            </div>

            {/* Right side: Edit Camp (owners) or Claim (unclaimed) */}
            <div style={{ flexShrink: 0, display: 'flex', flexDirection: 'column' as const, alignItems: 'flex-end', gap: '8px' }}>
              {isPageOwner && (
                <div style={{ display: 'flex', gap: '8px', alignItems: 'center' }}>
                  {editMode && (
                    <button onClick={cancelEdit} style={{ padding: '6px 16px', background: 'none', border: '2px solid #1C1610', fontWeight: 600, fontSize: '0.8rem', cursor: 'pointer', fontFamily: 'inherit', color: '#1C1610' }}>
                      Cancel
                    </button>
                  )}
                  <button
                    onClick={editMode ? handleSaveEdit : enterEditMode}
                    disabled={editMode && editSaving}
                    style={{ padding: '6px 16px', backgroundColor: editMode ? '#1E8A82' : 'transparent', color: editMode ? '#fff' : '#1C1610', border: '2px solid #1C1610', boxShadow: editMode ? 'none' : '2px 2px 0 #1C1610', cursor: 'pointer', fontWeight: 600, fontSize: '0.8rem', fontFamily: 'inherit' }}
                  >
                    {editMode ? (editSaving ? 'Saving…' : 'Save Changes') : 'Edit Camp'}
                  </button>
                </div>
              )}

              {!camp.is_claimed && !isPageOwner && (
                existingClaim === 'pending' || claimSuccess ? (
                  <p style={{ margin: 0, fontSize: '0.78rem', color: '#9A8878', fontStyle: 'italic' as const }}>Claim request pending review.</p>
                ) : existingClaim === 'denied' ? (
                  <p style={{ margin: 0, fontSize: '0.78rem', color: '#9A8878' }}>Claim denied. <a href="mailto:support@theplayaprovides.com" style={{ color: '#1E8A82' }}>Contact us</a>.</p>
                ) : !showClaimForm ? (
                  <div style={{ display: 'flex', alignItems: 'center', gap: '12px', backgroundColor: '#F5F0D0', border: '1.5px solid rgba(212,160,32,0.4)', padding: '8px 14px' }}>
                    <span style={{ fontSize: '0.8rem', color: '#7a4a2a', whiteSpace: 'nowrap' as const }}>Member of this camp?</span>
                    <button
                      onClick={() => currentUserId ? setShowClaimForm(true) : window.location.href = '/login'}
                      style={{ padding: '6px 14px', backgroundColor: '#1E8A82', color: '#fff', border: '2px solid #1C1610', boxShadow: '2px 2px 0 #1C1610', fontWeight: 700, fontSize: '0.8rem', cursor: 'pointer', whiteSpace: 'nowrap' as const, fontFamily: 'inherit' }}
                    >
                      Claim This Page
                    </button>
                  </div>
                ) : null
              )}
            </div>
          </div>

          {/* Claim form — inline in header band */}
          {!camp.is_claimed && showClaimForm && (
            <div style={{ marginTop: '16px', backgroundColor: '#F5F0D0', border: '1.5px solid rgba(212,160,32,0.4)', padding: '16px 20px' }}>
              <form onSubmit={handleClaimSubmit}>
                <p style={{ margin: '0 0 12px', fontSize: '0.9rem', color: '#7a4a2a', fontWeight: 600 }}>Claim {camp.display_name}</p>
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '10px', marginBottom: '10px' }}>
                  <div>
                    <label style={claimLabelStyle}>Your role <span style={{ color: '#9A8878', fontWeight: 400 }}>(optional)</span></label>
                    <input type="text" value={claimRole} onChange={e => setClaimRole(e.target.value)} placeholder="e.g. Founder, Lead, Member…" style={claimInputStyle} />
                  </div>
                  <div>
                    <label style={claimLabelStyle}>Years involved <span style={{ color: '#9A8878', fontWeight: 400 }}>(optional)</span></label>
                    <input type="text" value={claimYears} onChange={e => setClaimYears(e.target.value)} placeholder="e.g. 2019–present" style={claimInputStyle} />
                  </div>
                </div>
                {claimError && <p style={{ margin: '0 0 8px', fontSize: '0.8rem', color: '#cc0000' }}>{claimError}</p>}
                <div style={{ display: 'flex', gap: '10px', alignItems: 'center' }}>
                  <button type="submit" disabled={claimSubmitting} style={claimSubmitBtnStyle}>{claimSubmitting ? 'Submitting…' : 'Submit Claim'}</button>
                  <button type="button" onClick={() => { setShowClaimForm(false); setClaimError(''); }} style={claimCancelBtnStyle}>Cancel</button>
                </div>
              </form>
            </div>
          )}
        </div>
      </div>

      {/* PAGE CONTENT */}
      <div className="rsp-px" style={{ maxWidth: '1280px', margin: '0 auto', paddingTop: '28px', paddingBottom: '64px' }}>

      {/* Banner image for unclaimed camps */}
      {!camp.is_claimed && camp.banner_url && (
        <div style={{ marginBottom: '24px' }}>
          <img src={camp.banner_url} alt={`${camp.display_name} banner`} style={{ width: '100%', aspectRatio: '16/9', objectFit: 'cover' as const }} />
        </div>
      )}

      {/* BM data for unclaimed stubs — show whenever non-null */}
      {!camp.is_claimed && (camp.description || camp.homebase || camp.bm_homepage_url) && (
        <div style={{ marginTop: '16px' }}>
          {camp.description && (
            <p style={{ fontSize: '1rem', color: '#4A3828', margin: '0 0 8px', lineHeight: 1.6, whiteSpace: 'pre-wrap' as const, wordBreak: 'break-word' as const, maxWidth: '720px' }}>
              {camp.description}
            </p>
          )}
          {camp.homebase && (
            <p style={{ fontSize: '0.85rem', color: '#9A8878', margin: '0 0 6px' }}>Homebase: {camp.homebase}</p>
          )}
          {camp.bm_homepage_url && (
            <a href={camp.bm_homepage_url} target="_blank" rel="noopener noreferrer" style={socialPillStyle}>
              Website
            </a>
          )}
        </div>
      )}

      {/* Claimed: view mode */}
      {camp.is_claimed && !editMode && (
        <div style={{ marginTop: '24px' }}>
          <div className="camp-content-row" style={{ display: 'flex', gap: '24px', alignItems: 'flex-start' }}>
            {/* Meta info column — flex:1 so description extends to full available width */}
            <div style={{ flex: 1, minWidth: 0 }}>
              <div style={{ display: 'flex', gap: '12px', alignItems: 'flex-start', marginBottom: '12px' }}>
                {camp.avatar_url && (
                  <img src={camp.avatar_url} alt={`${camp.display_name} logo`} style={{ width: '56px', height: '56px', border: '2px solid #1E8A82', flexShrink: 0, objectFit: 'cover' as const }} />
                )}
                <div>
                  {camp.description && (
                    <p style={{ fontSize: '1rem', color: '#4A3828', margin: '0 0 8px', lineHeight: 1.6, whiteSpace: 'pre-wrap' as const, wordBreak: 'break-word' as const }}>{camp.description}</p>
                  )}
                </div>
              </div>
              {camp.founded_year && (
                <p style={{ fontSize: '0.85rem', color: '#9A8878', margin: '0 0 6px' }}>Est. {camp.founded_year}</p>
              )}
              {camp.homebase && (
                <p style={{ fontSize: '0.85rem', color: '#9A8878', margin: '0 0 6px' }}>Homebase: {camp.homebase}</p>
              )}
              {camp.returning_2026 === true && (
                <p style={{ fontSize: '0.85rem', color: '#9A8878', margin: '0 0 10px', lineHeight: 1.5 }}>
                  2026 Playa Address:<br /><strong>{camp.playa_location || 'To Be Announced'}</strong>
                </p>
              )}
              {camp.returning_2026 === false && (
                <p style={{ fontSize: '0.85rem', color: '#9A8878', margin: '0 0 10px', lineHeight: 1.5 }}>
                  2026 Playa Address:<br /><strong>Not Returning</strong>
                </p>
              )}
              {/* Social links pills — includes bm_homepage_url fallback for Website */}
              {((camp.social_links && Object.keys(camp.social_links).some(k => camp.social_links[k])) || (!camp.social_links?.website && camp.bm_homepage_url)) && (
                <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap' as const, marginTop: '8px' }}>
                  {camp.social_links && Object.entries(camp.social_links as Record<string, string>)
                    .filter(([, url]) => !!url)
                    .map(([key, url]) => (
                      <a key={key} href={url} target="_blank" rel="noopener noreferrer" style={socialPillStyle}>
                        {socialLabelMap[key] || key}
                      </a>
                    ))}
                  {!camp.social_links?.website && camp.bm_homepage_url && (
                    <a href={camp.bm_homepage_url} target="_blank" rel="noopener noreferrer" style={socialPillStyle}>
                      Website
                    </a>
                  )}
                </div>
              )}
            </div>

            {/* Banner — always in right column when present; max 500px with description, 400px without */}
            {camp.banner_url && (
              <div style={{ flexShrink: 0, width: '35%', maxWidth: camp.description ? '380px' : '400px' }}>
                <img src={camp.banner_url} alt={`${camp.display_name} banner`} style={{ width: '100%', maxHeight: '260px', objectFit: 'cover' as const }} />
              </div>
            )}
          </div>
        </div>
      )}

      {/* Edit mode panel */}
      {camp.is_claimed && editMode && (
        <div style={{ marginTop: '24px', backgroundColor: '#EDE5D0', border: '1.5px solid rgba(28,22,16,0.15)', padding: '24px' }}>
          <h3 style={{ margin: '0 0 20px', fontSize: '1rem', fontWeight: 700, color: '#1C1610', fontFamily: "'Arvo', serif" }}>Edit Camp Page</h3>

          {/* Banner upload */}
          <div style={{ marginBottom: '16px' }}>
            <label style={editLabelStyle}>Cover Photo</label>
            {camp.banner_url && (
              <img src={camp.banner_url} alt={`${camp.display_name} banner`} style={{ width: '380px', maxWidth: '100%', maxHeight: '260px', objectFit: 'cover' as const, marginBottom: '8px', display: 'block' }} />
            )}
            <input type="file" accept="image/*" ref={bannerInputRef} onChange={handleBannerUpload} style={{ display: 'none' }} />
            <div style={{ display: 'flex', gap: '8px', alignItems: 'center', flexWrap: 'wrap' as const }}>
              <button onClick={() => bannerInputRef.current?.click()} disabled={bannerUploading} style={uploadBtnStyle}>
                {bannerUploading ? 'Uploading…' : camp.banner_url ? 'Replace Photo' : 'Upload Photo'}
              </button>
              {camp.banner_url && !bannerDeleteConfirming && (
                <button onClick={() => setBannerDeleteConfirming(true)} style={{ ...uploadBtnStyle, backgroundColor: '#FDFAF4', color: '#C24820', border: '1.5px solid rgba(194,72,32,0.4)' }}>
                  Delete Photo
                </button>
              )}
              {bannerDeleteConfirming && (
                <span style={{ display: 'flex', gap: '8px', alignItems: 'center', fontSize: '0.85rem', color: '#C24820' }}>
                  Are you sure?
                  <button onClick={handleBannerDelete} disabled={bannerDeleting} style={{ ...uploadBtnStyle, backgroundColor: '#C24820', color: '#fff', border: '1.5px solid #C24820' }}>
                    {bannerDeleting ? 'Deleting…' : 'Yes, delete'}
                  </button>
                  <button onClick={() => setBannerDeleteConfirming(false)} style={{ ...uploadBtnStyle, backgroundColor: '#FDFAF4', color: '#4A3828' }}>
                    Cancel
                  </button>
                </span>
              )}
            </div>
          </div>

          <div style={{ marginBottom: '14px' }}>
            <label style={editLabelStyle}>Display Name</label>
            <input type="text" value={editDisplayName} onChange={e => setEditDisplayName(e.target.value)} style={editInputStyle} />
          </div>

          <div style={{ marginBottom: '14px' }}>
            <label style={editLabelStyle}>Description</label>
            <textarea value={editDescription} onChange={e => setEditDescription(e.target.value)} rows={4} style={{ ...editInputStyle, resize: 'vertical' as const }} />
          </div>

          <div style={{ marginBottom: '14px' }}>
            <label style={editLabelStyle}>Founded Year</label>
            <input type="number" value={editFoundedYear} onChange={e => setEditFoundedYear(e.target.value)} placeholder="e.g. 2010" style={editInputStyle} />
          </div>

          <div style={{ marginBottom: '14px' }}>
            <label style={editLabelStyle}>Homebase</label>
            <input type="text" value={editHomebase} onChange={e => setEditHomebase(e.target.value)} placeholder="e.g. New York, NY / San Francisco, CA" style={editInputStyle} />
          </div>

          <div style={{ marginBottom: '14px' }}>
            <label style={editLabelStyle}>Returning in 2026?</label>
            <select
              value={editReturning2026 === null ? '' : String(editReturning2026)}
              onChange={e => {
                const v = e.target.value;
                setEditReturning2026(v === '' ? null : v === 'true');
              }}
              style={{ ...editInputStyle, marginBottom: 0 }}
            >
              <option value="">Not set</option>
              <option value="true">Yes, returning in 2026</option>
              <option value="false">No, not returning in 2026</option>
            </select>
          </div>

          {editReturning2026 === true && (
            <div style={{ marginBottom: '14px' }}>
              <label style={editLabelStyle}>2026 Playa Address</label>
              <p style={{ margin: 0, fontSize: '0.85rem', color: '#9A8878', fontStyle: 'italic' as const }}>
                {camp.playa_location || 'To be announced — populated by Burning Man API'}
              </p>
            </div>
          )}

          {/* Social links */}
          <div style={{ marginBottom: '14px' }}>
            <label style={editLabelStyle}>Social Links</label>
            <div style={{ display: 'flex', flexDirection: 'column' as const, gap: '8px' }}>
              {socialPlatforms.map(p => (
                <div key={p.key} style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                  <span style={{ width: '120px', fontSize: '0.8rem', color: '#4A3828', flexShrink: 0 }}>{p.label}</span>
                  <input
                    type="url"
                    value={editSocialLinks[p.key] || ''}
                    onChange={e => setEditSocialLinks(prev => ({ ...prev, [p.key]: e.target.value }))}
                    placeholder={`https://`}
                    style={{ ...editInputStyle, marginBottom: 0, flex: 1 }}
                  />
                </div>
              ))}
            </div>
          </div>

          {editError && <p style={{ color: '#cc0000', fontSize: '0.85rem', margin: 0 }}>{editError}</p>}
        </div>
      )}

      {/* Member list */}
      <div style={{ marginTop: '36px' }}>
        <h2 style={sectionHeadStyle}>Members ({members.length})</h2>
        {memberActionError && (
          <p style={{ color: '#cc0000', fontSize: '0.85rem', marginBottom: '8px' }}>{memberActionError}</p>
        )}
        {members.length === 0 ? (
          <p style={{ color: '#9A8878', fontSize: '0.9rem', fontStyle: 'italic' as const }}>No members listed yet.</p>
        ) : (
          <div style={{ overflowX: 'auto' as const, backgroundColor: '#FDFAF4', border: '1.5px solid rgba(28,22,16,0.12)' }}>
            {/* Header row */}
            <div style={{ ...memberGridStyle(editMode), padding: '12px 15px', fontSize: '0.6rem', fontWeight: 700, color: '#4A3828', textTransform: 'uppercase' as const, letterSpacing: '0.08em', fontFamily: "'Space Mono', monospace", borderBottom: '1.5px solid rgba(28,22,16,0.12)', backgroundColor: '#EDE5D0' }}>
              <div>Name</div>
              <div>Location</div>
              <div>Camp Years</div>
              <div style={{ textAlign: 'center' as const, whiteSpace: 'nowrap' as const }}>2026 Camp?</div>
              <div>Wish List</div>
              {editMode && <div>Actions</div>}
            </div>

            {members.map(member => {
              const isOwner = camp.page_owner_id === member.id;
              const isCurrentUser = member.id === currentUserId;
              const wishList: string[] = Array.isArray(member.wish_list) ? member.wish_list : [];
              const ret2026 = returning2026Map[member.id]; // 'yes'|'maybe'|'no'|'other'|undefined

              // Returning box config
              const retCfg: Record<string, { symbol: string; bg: string; color: string; border: string }> = {
                yes:   { symbol: '✓', bg: '#dcfce7', color: '#16a34a', border: '#86efac' },
                maybe: { symbol: '?', bg: '#fef9c3', color: '#92400e', border: '#fde68a' },
                no:    { symbol: '✗', bg: '#fee2e2', color: '#dc2626', border: '#fca5a5' },
                other: { symbol: '✗', bg: '#fee2e2', color: '#dc2626', border: '#fca5a5' },
              };
              const rc = ret2026 ? retCfg[ret2026] : null;

              return (
                <div key={member.id} style={{ ...memberGridStyle(editMode), padding: '10px 15px', backgroundColor: '#FDFAF4', borderBottom: '1px solid rgba(28,22,16,0.06)', alignItems: 'center' }}>

                  {/* Name column */}
                  <Link href={`/profile/${member.username}`} style={{ display: 'flex', alignItems: 'center', gap: '10px', textDecoration: 'none', minWidth: 0 }}>
                    <div style={{ width: '36px', height: '36px', flexShrink: 0, backgroundColor: '#EDE5D0', border: '2px solid rgba(28,22,16,0.15)', backgroundImage: member.avatar_url ? `url(${member.avatar_url})` : 'none', backgroundSize: 'cover' as const, backgroundPosition: 'center' as const, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '0.9rem', color: '#1E8A82', fontWeight: 'bold' as const }}>
                      {!member.avatar_url && (member.preferred_name?.charAt(0) || member.username?.charAt(0) || '?')}
                    </div>
                    <div style={{ minWidth: 0 }}>
                      <div style={{ fontWeight: 600, fontSize: '13px', color: '#1C1610', display: 'flex', alignItems: 'center', gap: '5px', flexWrap: 'wrap' as const }}>
                        {member.preferred_name || member.username}
                        {isOwner && <span style={{ fontSize: '10px', color: '#9A8878', fontWeight: 400 }}>(page owner)</span>}
                        {!isOwner && member.role === 'admin' && <span style={{ fontSize: '10px', color: '#D4A020', fontWeight: 600 }}>Admin</span>}
                      </div>
                      <div style={{ fontSize: '11px', color: '#9A8878' }}>@{member.username}</div>
                    </div>
                  </Link>

                  {/* Location column */}
                  <div style={{ fontSize: '12px', color: '#4A3828' }}>
                    {[member.city, member.state].filter(Boolean).join(', ') || <span style={{ color: '#9A8878' }}>—</span>}
                  </div>

                  {/* Years Attended column */}
                  <div style={{ display: 'flex', gap: '4px', flexWrap: 'wrap' as const }}>
                    {[...member.years].sort((a: number, b: number) => b - a).map((year: number) => (
                      <span key={year} style={yearPillStyle}>{year}</span>
                    ))}
                  </div>

                  {/* Returning in 2026? column */}
                  <div style={{ display: 'flex', justifyContent: 'center' as const }}>
                    <div style={{ width: '26px', height: '26px', border: `1px solid ${rc ? rc.border : 'rgba(28,22,16,0.15)'}`, backgroundColor: rc ? rc.bg : '#FDFAF4', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '13px', fontWeight: 700, color: rc ? rc.color : 'transparent' }}>
                      {rc?.symbol || ''}
                    </div>
                  </div>

                  {/* Wish List column — capped to 2 rows of tags; the column's
                      300px min-width (memberGridStyle) is what keeps 2 rows
                      comfortably fittable instead of squeezing to 1-per-line
                      as the window narrows — the table scrolls horizontally
                      before that width shrinks further. */}
                  <div style={{ display: 'flex', flexWrap: 'wrap' as const, gap: '4px', alignItems: 'center', maxHeight: '56px', overflow: 'hidden' }}>
                    {wishList.length > 0
                      ? wishList.map(tag => <span key={tag} style={wishTagStyle}>{tag}</span>)
                      : <span style={{ fontSize: '12px', color: '#9A8878' }}>—</span>
                    }
                  </div>

                  {/* Actions column — only in edit mode, never for self */}
                  {editMode && (
                    <div style={{ display: 'flex', gap: '5px', flexWrap: 'wrap' as const }}>
                      {!isCurrentUser && isPageOwner && !isOwner && (
                        <>
                          {member.role === 'member' && (
                            <button onClick={() => handleSetRole(member, 'admin')} style={mgmtBtnStyle}>Make Admin</button>
                          )}
                          {member.role === 'admin' && (
                            <button onClick={() => handleSetRole(member, 'member')} style={mgmtBtnStyle}>Remove Admin</button>
                          )}
                          <button onClick={() => handleMakeOwner(member)} style={mgmtBtnStyle}>Make Owner</button>
                          <button onClick={() => handleRemoveMember(member)} style={{ ...mgmtBtnStyle, color: '#C24820', borderColor: 'rgba(194,72,32,0.4)' }}>Remove</button>
                        </>
                      )}
                      {!isCurrentUser && !isPageOwner && myRole === 'admin' && !isOwner && member.role === 'member' && (
                        <button onClick={() => handleRemoveMember(member)} style={{ ...mgmtBtnStyle, color: '#C24820', borderColor: 'rgba(194,72,32,0.4)' }}>Remove</button>
                      )}
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* Camp items section */}
      <div style={{ marginTop: '48px' }}>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '10px' }}>
          <h2 style={sectionHeadStyle}>Items from Camp Members</h2>
          {isMember && (
            <div style={campToggleGroupStyle}>
              <button onClick={() => setCampViewMode('grid')} style={{ ...campToggleButtonStyle, backgroundColor: campViewMode === 'grid' ? '#1C1610' : 'transparent' }}>
                <LayoutGrid size={18} color={campViewMode === 'grid' ? '#fff' : '#4A3828'} />
              </button>
              <button onClick={() => setCampViewMode('list')} style={{ ...campToggleButtonStyle, backgroundColor: campViewMode === 'list' ? '#1C1610' : 'transparent' }}>
                <List size={18} color={campViewMode === 'list' ? '#fff' : '#4A3828'} />
              </button>
            </div>
          )}
        </div>

        {/* Non-member gate */}
        {!isMember ? (
          <p style={{ color: '#9A8878', fontSize: '0.9rem', fontStyle: 'italic' as const }}>
            Only members of this camp can view this list.
          </p>
        ) : campItemsLoading ? (
          <>
            <style>{campGridResponsiveCss}</style>
            <div className="camp-grid">{[...Array(3)].map((_, i) => <div key={i} style={campSkeletonStyle} />)}</div>
          </>
        ) : campItems.length === 0 ? (
          <p style={{ color: '#9A8878', fontSize: '0.9rem', fontStyle: 'italic' as const }}>No items have been shared by camp members yet.</p>
        ) : (
          <div style={{ overflowX: 'auto' as const, maxWidth: '100%', width: '100%' }}>
          {campViewMode === 'grid' && <style>{campGridResponsiveCss}</style>}
          <div className={campViewMode === 'grid' ? 'camp-grid' : undefined} style={campViewMode === 'grid' ? undefined : campListContainerStyle}>
            {campViewMode === 'list' && (
              <div style={campListHeaderStyle}>
                <div style={{ width: '50px' }} />
                <div>Item</div>
                <div>Owner</div>
                <div>Category</div>
                <div>Location</div>
                <div>Description</div>
                <div>Terms</div>
              </div>
            )}
            {campItems.map(item => (
              <Link key={item.id} href={`/find-items/${item.id}`} style={{ textDecoration: 'none', display: 'block' }}>
                {campViewMode === 'grid' ? <CampCardView item={item} /> : <CampListView item={item} />}
              </Link>
            ))}
          </div>
          </div>
        )}
      </div>

      </div>{/* end PAGE CONTENT */}
    </div>
  );
}

// ── Styles ──

const sectionHeadStyle: React.CSSProperties = {
  fontFamily: "'Space Mono', monospace",
  fontSize: '0.65rem', fontWeight: 700, color: '#4A3828',
  textTransform: 'uppercase' as const, letterSpacing: '0.08em', marginBottom: '12px',
};

// Returns a grid template for the members table; edit mode adds an Actions column
function memberGridStyle(editMode: boolean): React.CSSProperties {
  return {
    display: 'grid',
    // Fixed-width columns first, wish list last so it absorbs all remaining space.
    // Wish list's 300px floor forces horizontal scroll on phones instead of
    // squeezing chips into a one-per-line stack.
    // Header row and member rows are separate grid containers — they only stay
    // aligned because every column except the last is a fixed width. Don't use
    // auto/fit-content here or the header drifts from the rows.
    gridTemplateColumns: editMode
      ? 'minmax(140px, 180px) 110px 90px 80px minmax(300px, 1fr) auto'
      : 'minmax(140px, 180px) 110px 90px 80px minmax(300px, 1fr)',
    gap: '10px',
    alignItems: 'center',
  };
}

const yearPillStyle: React.CSSProperties = {
  backgroundColor: '#D4A020', padding: '2px 8px',
  color: '#fff', fontFamily: "'Space Mono', monospace",
  fontSize: '0.6rem', fontWeight: 700,
};

const wishTagStyle: React.CSSProperties = {
  display: 'inline-flex', alignItems: 'center', gap: '6px',
  padding: '4px 12px', border: '1.5px solid #1E8A82',
  backgroundColor: '#D4EDEB', color: '#1E8A82',
  fontSize: '0.78rem', fontWeight: 600,
  fontFamily: "'Space Mono', monospace",
};

const mgmtBtnStyle: React.CSSProperties = {
  padding: '3px 10px', fontSize: '0.7rem', fontWeight: 600,
  border: '1.5px solid rgba(28,22,16,0.2)', backgroundColor: '#FDFAF4',
  color: '#4A3828', cursor: 'pointer',
};

const editLabelStyle: React.CSSProperties = {
  display: 'block', fontFamily: "'Space Mono', monospace",
  fontSize: '0.58rem', fontWeight: 700, color: '#4A3828',
  textTransform: 'uppercase' as const, letterSpacing: '0.08em', marginBottom: '5px',
};

const editInputStyle: React.CSSProperties = {
  width: '100%', boxSizing: 'border-box' as const, padding: '9px 12px',
  border: '1.5px solid rgba(28,22,16,0.25)', backgroundColor: '#FDFAF4',
  color: '#1C1610', fontSize: '0.9rem', outline: 'none', marginBottom: '0',
};

const uploadBtnStyle: React.CSSProperties = {
  padding: '7px 16px', backgroundColor: '#FDFAF4', color: '#1C1610',
  border: '1.5px solid rgba(28,22,16,0.25)', fontWeight: 600, fontSize: '0.8rem', cursor: 'pointer',
};

const socialPillStyle: React.CSSProperties = {
  border: '1.5px solid rgba(28,22,16,0.2)', color: '#4A3828', backgroundColor: '#FDFAF4',
  padding: '4px 10px', textDecoration: 'none',
  fontFamily: "'Space Mono', monospace", fontSize: '0.6rem', fontWeight: 700,
};

const claimLabelStyle: React.CSSProperties = {
  display: 'block', fontFamily: "'Space Mono', monospace",
  fontSize: '0.58rem', fontWeight: 700, color: '#4A3828',
  textTransform: 'uppercase' as const, letterSpacing: '0.08em', marginBottom: '5px',
};

const claimInputStyle: React.CSSProperties = {
  width: '100%', boxSizing: 'border-box' as const,
  padding: '8px 12px',
  border: '1.5px solid rgba(28,22,16,0.25)', fontSize: '0.875rem', color: '#1C1610',
  backgroundColor: '#FDFAF4', outline: 'none',
};

const claimSubmitBtnStyle: React.CSSProperties = {
  padding: '8px 20px', backgroundColor: '#1E8A82', color: '#fff',
  border: '2px solid #1C1610', boxShadow: '2px 2px 0 #1C1610', fontWeight: 700,
  fontSize: '0.875rem', cursor: 'pointer',
};

const claimCancelBtnStyle: React.CSSProperties = {
  padding: '8px 16px', backgroundColor: 'transparent', color: '#1C1610',
  border: '2px solid #1C1610', fontWeight: 600,
  fontSize: '0.875rem', cursor: 'pointer',
};

// ── Camp Items Sub-components ──

function CampCardView({ item }: { item: any }) {
  const ownerName = item.profiles?.preferred_name || 'Member';
  const locationDisplay = item.locations
    ? [item.locations.city, item.locations.state].filter(Boolean).join(', ')
    : 'N/A';
  const isKeep = item.availability_status === 'Available to Keep';
  const hasTerms = !isKeep && (item.return_by || item.return_terms);
  return (
    <div style={{ backgroundColor: '#FDFAF4', border: '1.5px solid rgba(28,22,16,0.15)', boxShadow: '3px 3px 0 rgba(28,22,16,0.1)' }}>
      <div style={{ position: 'relative' as const, backgroundColor: 'transparent', padding: '8px 8px 0 8px', width: '100%', overflow: 'hidden', boxSizing: 'border-box' as const }}>
        <PolaroidPhoto src={item.image_urls?.[0]} alt={item.item_name} itemId={item.id} noRotate />
        <div style={{ position: 'absolute', top: '6px', left: '6px', backgroundColor: isKeep ? '#C24820' : '#1E8A82', color: '#fff', padding: '2px 6px', border: 'none', fontFamily: "'Space Mono', monospace", fontSize: '0.5rem', fontWeight: 700, zIndex: 5 }}>
          {isKeep ? 'Keep' : 'Borrow'}
        </div>
      </div>
      <div style={{ padding: '10px 12px 12px' }}>
        <h3 style={{ margin: 0, color: '#1C1610', fontSize: '0.9rem', fontWeight: 700, lineHeight: 1.2, fontFamily: "'Arvo', serif" }}>{item.item_name}</h3>
        <p style={{ color: '#9A8878', fontSize: '0.65rem', margin: '4px 0 8px', textTransform: 'uppercase' as const, fontWeight: 'bold' }}>{item.category} • {item.condition}</p>
        <div style={{ display: 'flex', justifyContent: 'space-between', color: '#4A3828', fontSize: '0.7rem', borderTop: '1px solid rgba(28,22,16,0.08)', paddingTop: '8px', gap: '6px' }}>
          <span style={{ display: 'flex', alignItems: 'center', gap: '3px', overflow: 'hidden', whiteSpace: 'nowrap' as const, textOverflow: 'ellipsis' as const }}><MapPin size={10} style={{ flexShrink: 0 }} />{locationDisplay}</span>
          {item.profiles?.username ? (
            <Link href={`/profile/${item.profiles.username}`} onClick={e => e.stopPropagation()} style={{ display: 'flex', alignItems: 'center', gap: '3px', color: '#1E8A82', textDecoration: 'none', overflow: 'hidden', whiteSpace: 'nowrap' as const, textOverflow: 'ellipsis' as const }}>
              <User size={10} style={{ flexShrink: 0 }} />{ownerName}
            </Link>
          ) : (
            <span style={{ display: 'flex', alignItems: 'center', gap: '3px', overflow: 'hidden', whiteSpace: 'nowrap' as const, textOverflow: 'ellipsis' as const }}><User size={10} style={{ flexShrink: 0 }} />{ownerName}</span>
          )}
        </div>
        {hasTerms && (
          <div style={{ fontSize: '0.65rem', color: '#9A8878', borderTop: '1px solid rgba(28,22,16,0.08)', paddingTop: '6px', marginTop: '6px' }}>
            {item.return_by && <span>Return by {new Date(item.return_by).toLocaleDateString()}</span>}
            {item.return_terms && !item.return_by && <span>Has terms</span>}
          </div>
        )}
      </div>
    </div>
  );
}

const CAMP_LIST_COLS = '50px 160px 90px 100px 110px 1.5fr 1fr';

function CampListView({ item }: { item: any }) {
  const ownerName = item.profiles?.preferred_name || 'Member';
  const locationDisplay = item.locations
    ? [item.locations.city, item.locations.state].filter(Boolean).join(', ')
    : '—';
  const isKeep = item.availability_status === 'Available to Keep';
  const termsSummary = isKeep ? '' : [
    item.return_by ? `Return by ${new Date(item.return_by).toLocaleDateString()}` : null,
    item.damage_price ? `Damage agr. $${item.damage_price}` : null,
    item.loss_price ? `Loss agr. $${item.loss_price}` : null,
    item.return_terms ? 'Custom terms' : null,
  ].filter(Boolean).join(' · ');
  return (
    <div style={{ display: 'grid', gridTemplateColumns: CAMP_LIST_COLS, gap: '10px', alignItems: 'center', padding: '10px 12px', backgroundColor: '#FDFAF4', borderBottom: '1px solid rgba(28,22,16,0.08)' }}>
      <div style={{ width: '50px', height: '50px', overflow: 'hidden', backgroundColor: '#EDE5D0', flexShrink: 0 }}>
        {item.image_urls?.[0]
          ? <img src={item.image_urls[0]} alt={item.item_name} style={{ width: '100%', height: '100%', objectFit: 'contain' as const }} />
          : <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', height: '100%', color: '#9A8878' }}><Package size={16} /></div>}
      </div>
      <div style={{ overflow: 'hidden' }}>
        <div style={{ fontWeight: 600, color: '#1C1610', fontSize: '14px' }}>{item.item_name}</div>
        <div style={{ fontSize: '0.5rem', backgroundColor: isKeep ? '#C24820' : '#1E8A82', color: '#fff', fontFamily: "'Space Mono', monospace", fontWeight: 700, textTransform: 'uppercase' as const, marginTop: '2px', display: 'inline-block', padding: '2px 6px' }}>
          {isKeep ? 'Keep' : 'Borrow'}
        </div>
      </div>
      <div style={{ fontSize: '12px', color: '#4A3828', overflow: 'hidden', whiteSpace: 'nowrap' as const }}>
        {item.profiles?.username ? (
          <Link href={`/profile/${item.profiles.username}`} onClick={e => e.stopPropagation()} style={{ color: '#1E8A82', textDecoration: 'none' }}>{ownerName}</Link>
        ) : ownerName}
      </div>
      <div style={{ fontSize: '12px', color: '#4A3828', overflow: 'hidden', whiteSpace: 'nowrap' as const }}>{item.category}</div>
      <div style={{ fontSize: '12px', color: '#4A3828', display: 'flex', alignItems: 'center', overflow: 'hidden', whiteSpace: 'nowrap' as const }}><MapPin size={11} style={{ marginRight: '3px', flexShrink: 0 }} />{locationDisplay}</div>
      <div style={{ fontSize: '12px', color: '#4A3828', overflow: 'hidden', display: '-webkit-box', WebkitLineClamp: 2, WebkitBoxOrient: 'vertical' as const }}>{item.description || '—'}</div>
      <div style={{ fontSize: '11px', color: '#9A8878', overflow: 'hidden', whiteSpace: 'nowrap' as const }}>{termsSummary || '—'}</div>
    </div>
  );
}

// Camp items styles
const campToggleGroupStyle: React.CSSProperties = { display: 'flex', border: '2px solid #1C1610', overflow: 'hidden' };
const campToggleButtonStyle: React.CSSProperties = { border: 'none', padding: '6px 10px', cursor: 'pointer' };
// Mirrors .fi-grid on /find-items so camp item cards match the browse-items
// layout: 3 per row on mobile (portrait and landscape), same breakpoints.
const campGridResponsiveCss = `
  .camp-grid {
    display: grid;
    grid-template-columns: repeat(auto-fill, minmax(260px, 1fr));
    gap: 20px;
  }
  @media (min-width: 1100px) { .camp-grid { grid-template-columns: repeat(5, 1fr); } }
  @media (min-width:  860px) and (max-width: 1099px) { .camp-grid { grid-template-columns: repeat(4, 1fr); } }
  @media (max-width: 859px) { .camp-grid { grid-template-columns: repeat(3, 1fr); gap: 12px; } }
  @media (max-width: 480px) { .camp-grid { gap: 8px; } }
`;
const campListContainerStyle: React.CSSProperties = { display: 'flex', flexDirection: 'column' as const, backgroundColor: '#FDFAF4', border: '1.5px solid rgba(28,22,16,0.12)', overflowX: 'auto' as const };
const campListHeaderStyle: React.CSSProperties = { display: 'grid', gridTemplateColumns: CAMP_LIST_COLS, gap: '10px', padding: '12px 15px', fontSize: '0.6rem', fontWeight: 700, color: '#4A3828', fontFamily: "'Space Mono', monospace", textTransform: 'uppercase' as const, letterSpacing: '0.08em', borderBottom: '1.5px solid rgba(28,22,16,0.12)', backgroundColor: '#EDE5D0' };
const campSkeletonStyle: React.CSSProperties = { height: '280px', backgroundColor: '#EDE5D0' };
