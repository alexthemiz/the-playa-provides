'use client';

import { useEffect, useState, useRef } from 'react';
import { useParams } from 'next/navigation';
import { supabase } from '@/lib/supabaseClient';
import Link from 'next/link';
import type React from 'react';
import PolaroidPhoto from '@/components/PolaroidPhoto';
import RequestModal from '@/components/RequestModal';
import { LayoutGrid, List, MapPin, User, Package, X, Pencil } from 'lucide-react';

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
  const [editSaving, setEditSaving] = useState(false);
  const [editError, setEditError] = useState('');
  const [bannerUploading, setBannerUploading] = useState(false);
  const bannerInputRef = useRef<HTMLInputElement>(null);

  // Camp items state
  const [campItems, setCampItems] = useState<any[]>([]);
  const [campItemsLoading, setCampItemsLoading] = useState(false);
  const [campViewMode, setCampViewMode] = useState<'grid' | 'list'>('list');
  const [selectedCampItem, setSelectedCampItem] = useState<any>(null);
  const [showCampRequestForm, setShowCampRequestForm] = useState(false);

  // Member management
  const [memberActionError, setMemberActionError] = useState('');

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
          .select('year, role, profiles(id, username, preferred_name, avatar_url, wish_list)')
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

  // Sync quick-view modal with URL
  useEffect(() => {
    const syncCampModal = () => {
      const parts = window.location.pathname.split('/');
      const itemId = parts.length >= 4 ? parts[3] : null;
      if (itemId && campItems.length > 0) {
        const item = campItems.find((i: any) => String(i.id) === itemId);
        if (item) setSelectedCampItem(item);
      } else if (!itemId) {
        setSelectedCampItem(null);
        setShowCampRequestForm(false);
      }
    };
    if (!campItemsLoading) {
      syncCampModal();
      window.addEventListener('popstate', syncCampModal);
    }
    return () => window.removeEventListener('popstate', syncCampModal);
  }, [campItems, campItemsLoading]);

  if (loading) return <div style={{ color: '#2D241E', padding: '40px' }}>Loading...</div>;
  if (!camp) return <div style={{ color: '#2D241E', padding: '40px' }}>Camp not found.</div>;

  const isPageOwner = !!(currentUserId && camp.is_claimed && camp.page_owner_id === currentUserId);

  // Determine logged-in user's role in the camp
  const myMemberRow = members.find(m => m.id === currentUserId);
  const myRole = myMemberRow?.role ?? null; // 'admin' | 'member' | null

  // ── Modal / quick-view handlers ──
  const handleOpenCampItem = (item: any) => {
    setSelectedCampItem(item);
    window.history.pushState({ id: item.id }, '', `/camps/${slug}/${item.id}`);
  };

  const handleCloseCampModal = () => {
    setSelectedCampItem(null);
    setShowCampRequestForm(false);
    window.history.pushState(null, '', `/camps/${slug}`);
  };

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
    setEditError('');
    setEditMode(true);
  };

  const cancelEdit = () => {
    setEditMode(false);
    setEditError('');
  };

  const handleBannerUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setBannerUploading(true);
    try {
      const ext = file.name.split('.').pop();
      const path = `${camp.id}/banner.${ext}`;
      const { error: upErr } = await supabase.storage
        .from('camp-photos')
        .upload(path, file, { upsert: true });
      if (upErr) throw upErr;
      const { data: urlData } = supabase.storage.from('camp-photos').getPublicUrl(path);
      const bannerUrl = urlData.publicUrl;
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

  // Social link platform config
  const socialPlatforms = [
    { key: 'facebook', label: 'Facebook' },
    { key: 'instagram', label: 'Instagram' },
    { key: 'bluesky', label: 'Bluesky' },
    { key: 'linkedin', label: 'LinkedIn' },
    { key: 'eplaya', label: 'ePlaya' },
    { key: 'website', label: 'Personal Website' },
  ];

  return (
    <div style={{ padding: '40px 20px', maxWidth: '900px', margin: '0 auto', color: '#2D241E' }}>
      <Link href="/find-items" style={{ color: '#888', textDecoration: 'none', fontSize: '0.9rem' }}>← Find Items</Link>

      {/* Title row with edit button */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginTop: '24px' }}>
        <h1 style={{ fontSize: '28px', fontWeight: 'bold', color: '#2D241E', margin: 0 }}>
          The Playa Provides<span style={{ textDecoration: 'underline' }}> {camp.display_name}{'\u00a0'}</span>
        </h1>
        {isPageOwner && !editMode && (
          <button onClick={enterEditMode} style={editButtonStyle}>
            <Pencil size={14} style={{ marginRight: '6px' }} />
            Edit Camp
          </button>
        )}
      </div>

      {/* Unclaimed banner */}
      {!camp.is_claimed && (
        <div style={{
          backgroundColor: '#fdf3ec', border: '1px solid #f0d8c8', borderRadius: '10px',
          padding: '16px 20px', marginTop: '24px',
        }}>
          {existingClaim === 'pending' || claimSuccess ? (
            <p style={{ margin: 0, fontSize: '0.9rem', color: '#7a4a2a' }}>
              Your claim request for <strong>{camp.display_name}</strong> has been submitted and is under review. We'll notify you by email once it's approved.
            </p>
          ) : existingClaim === 'denied' ? (
            <p style={{ margin: 0, fontSize: '0.9rem', color: '#7a4a2a' }}>
              Your claim request for <strong>{camp.display_name}</strong> was not approved. Questions? Email <a href="mailto:support@theplayaprovides.com" style={{ color: '#C08261' }}>support@theplayaprovides.com</a>.
            </p>
          ) : showClaimForm ? (
            <form onSubmit={handleClaimSubmit}>
              <p style={{ margin: '0 0 12px', fontSize: '0.9rem', color: '#7a4a2a', fontWeight: 600 }}>
                Claim {camp.display_name}
              </p>
              <div style={{ display: 'flex', flexDirection: 'column' as const, gap: '10px' }}>
                <div>
                  <label style={{ fontSize: '0.8rem', color: '#7a4a2a', display: 'block', marginBottom: '4px' }}>
                    Your role in the camp <span style={{ color: '#aaa', fontWeight: 400 }}>(optional)</span>
                  </label>
                  <input
                    type="text" value={claimRole} onChange={e => setClaimRole(e.target.value)}
                    placeholder="e.g. Founder, Lead, Member…"
                    style={claimInputStyle}
                  />
                </div>
                <div>
                  <label style={{ fontSize: '0.8rem', color: '#7a4a2a', display: 'block', marginBottom: '4px' }}>
                    Years involved <span style={{ color: '#aaa', fontWeight: 400 }}>(optional)</span>
                  </label>
                  <input
                    type="text" value={claimYears} onChange={e => setClaimYears(e.target.value)}
                    placeholder="e.g. 2019–present"
                    style={claimInputStyle}
                  />
                </div>
                {claimError && <p style={{ margin: 0, fontSize: '0.8rem', color: '#cc0000' }}>{claimError}</p>}
                <div style={{ display: 'flex', gap: '10px', alignItems: 'center' }}>
                  <button type="submit" disabled={claimSubmitting} style={claimSubmitBtnStyle}>
                    {claimSubmitting ? 'Submitting…' : 'Submit Claim'}
                  </button>
                  <button type="button" onClick={() => { setShowClaimForm(false); setClaimError(''); }} style={claimCancelBtnStyle}>
                    Cancel
                  </button>
                </div>
              </div>
            </form>
          ) : (
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: '16px', flexWrap: 'wrap' as const }}>
              <p style={{ margin: 0, fontSize: '0.9rem', color: '#7a4a2a' }}>
                This camp page hasn't been claimed yet. Are you a member of <strong>{camp.display_name}</strong>?
              </p>
              <button
                onClick={() => currentUserId ? setShowClaimForm(true) : window.location.href = '/login'}
                style={{ padding: '8px 18px', backgroundColor: '#C08261', color: '#fff', border: 'none', borderRadius: '6px', fontWeight: 700, fontSize: '0.875rem', flexShrink: 0, cursor: 'pointer' }}
              >
                Claim This Page
              </button>
            </div>
          )}
        </div>
      )}

      {/* Claimed: view mode */}
      {camp.is_claimed && !editMode && (
        <div style={{ marginTop: '24px' }}>
          {camp.banner_url && (
            <img src={camp.banner_url} alt="" style={{ width: '100%', height: '200px', objectFit: 'cover' as const, borderRadius: '10px', marginBottom: '20px' }} />
          )}
          <div style={{ display: 'flex', gap: '16px', alignItems: 'flex-start' }}>
            {camp.avatar_url && (
              <img src={camp.avatar_url} alt="" style={{ width: '72px', height: '72px', borderRadius: '50%', border: '3px solid #C08261', flexShrink: 0, objectFit: 'cover' as const }} />
            )}
            <div style={{ flex: 1 }}>
              {camp.description && (
                <p style={{ fontSize: '1rem', color: '#444', margin: '0 0 8px', lineHeight: 1.6 }}>{camp.description}</p>
              )}
              {camp.founded_year && (
                <p style={{ fontSize: '0.85rem', color: '#999', margin: '0 0 6px' }}>Est. {camp.founded_year}</p>
              )}
              {camp.homebase && (
                <p style={{ fontSize: '0.85rem', color: '#999', margin: '0 0 6px' }}>
                  <MapPin size={13} style={{ display: 'inline', verticalAlign: 'middle', marginRight: '4px' }} />
                  {camp.homebase}
                </p>
              )}
              <p style={{ fontSize: '0.85rem', color: '#aaa', margin: '0 0 10px' }}>
                Playa Location: <strong>{camp.playa_location || 'To Be Announced'}</strong>
              </p>
              {/* Social links pills */}
              {camp.social_links && Object.keys(camp.social_links).some(k => camp.social_links[k]) && (
                <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap' as const, marginTop: '8px' }}>
                  {socialPlatforms.filter(p => camp.social_links[p.key]).map(p => (
                    <a key={p.key} href={camp.social_links[p.key]} target="_blank" rel="noopener noreferrer" style={socialPillStyle}>
                      {p.label}
                    </a>
                  ))}
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      {/* Edit mode panel */}
      {camp.is_claimed && editMode && (
        <div style={{ marginTop: '24px', backgroundColor: '#fafafa', border: '1px solid #eee', borderRadius: '12px', padding: '24px' }}>
          <h3 style={{ margin: '0 0 20px', fontSize: '1rem', fontWeight: 700, color: '#2D241E' }}>Edit Camp Page</h3>

          {/* Banner upload */}
          <div style={{ marginBottom: '16px' }}>
            <label style={editLabelStyle}>Banner Image</label>
            {camp.banner_url && (
              <img src={camp.banner_url} alt="" style={{ width: '100%', height: '140px', objectFit: 'cover' as const, borderRadius: '8px', marginBottom: '8px' }} />
            )}
            <input type="file" accept="image/*" ref={bannerInputRef} onChange={handleBannerUpload} style={{ display: 'none' }} />
            <button onClick={() => bannerInputRef.current?.click()} disabled={bannerUploading} style={uploadBtnStyle}>
              {bannerUploading ? 'Uploading…' : camp.banner_url ? 'Replace Banner' : 'Upload Banner'}
            </button>
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

          {/* Social links */}
          <div style={{ marginBottom: '14px' }}>
            <label style={editLabelStyle}>Social Links</label>
            <div style={{ display: 'flex', flexDirection: 'column' as const, gap: '8px' }}>
              {socialPlatforms.map(p => (
                <div key={p.key} style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                  <span style={{ width: '120px', fontSize: '0.8rem', color: '#777', flexShrink: 0 }}>{p.label}</span>
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

          {editError && <p style={{ color: '#cc0000', fontSize: '0.85rem', margin: '0 0 12px' }}>{editError}</p>}

          <div style={{ display: 'flex', gap: '10px' }}>
            <button onClick={handleSaveEdit} disabled={editSaving} style={saveBtnStyle}>
              {editSaving ? 'Saving…' : 'Save Changes'}
            </button>
            <button onClick={cancelEdit} style={cancelBtnStyle}>Cancel</button>
          </div>
        </div>
      )}

      {/* Member list */}
      <div style={{ marginTop: '36px' }}>
        <h2 style={sectionHeadStyle}>Members ({members.length})</h2>
        {memberActionError && (
          <p style={{ color: '#cc0000', fontSize: '0.85rem', marginBottom: '8px' }}>{memberActionError}</p>
        )}
        {members.length === 0 ? (
          <p style={{ color: '#aaa', fontSize: '0.9rem', fontStyle: 'italic' as const }}>No members listed yet.</p>
        ) : (
          <>
            <div style={{ display: 'flex', justifyContent: 'flex-end' as const, paddingRight: '12px', marginBottom: '4px' }}>
              <span style={{ fontSize: '11px', fontWeight: 700, color: '#bbb', textTransform: 'uppercase' as const, letterSpacing: '0.06em' }}>Years Attended</span>
            </div>
            <div style={{ display: 'flex', flexDirection: 'column' as const, gap: '2px' }}>
              {members.map(member => {
                const isOwner = camp.page_owner_id === member.id;
                const isCurrentUser = member.id === currentUserId;
                const wishList: string[] = Array.isArray(member.wish_list) ? member.wish_list : [];

                return (
                  <div key={member.id} style={{ ...memberRowStyle, flexDirection: 'column' as const, gap: '8px', alignItems: 'stretch' }}>
                    {/* Top row: avatar, name, years, management controls */}
                    <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                      <Link href={`/profile/${member.username}`} style={{ display: 'flex', alignItems: 'center', gap: '12px', flex: 1, textDecoration: 'none' }}>
                        <div style={{
                          width: '38px', height: '38px', borderRadius: '50%', flexShrink: 0,
                          backgroundColor: '#f0f0f0', border: '2px solid #e5e5e5',
                          backgroundImage: member.avatar_url ? `url(${member.avatar_url})` : 'none',
                          backgroundSize: 'cover' as const, backgroundPosition: 'center' as const,
                          display: 'flex', alignItems: 'center', justifyContent: 'center',
                          fontSize: '1rem', color: '#C08261', fontWeight: 'bold' as const,
                        }}>
                          {!member.avatar_url && (member.preferred_name?.charAt(0) || member.username?.charAt(0) || '?')}
                        </div>
                        <div style={{ flex: 1 }}>
                          <div style={{ fontWeight: 600, fontSize: '14px', color: '#2D241E', display: 'flex', alignItems: 'center', gap: '6px' }}>
                            {member.preferred_name || member.username}
                            {isOwner && <span style={{ fontSize: '11px', color: '#bbb', fontWeight: 400 }}>(page owner)</span>}
                            {!isOwner && member.role === 'admin' && <span style={{ fontSize: '11px', color: '#C08261', fontWeight: 600 }}>Admin</span>}
                          </div>
                          <div style={{ fontSize: '12px', color: '#aaa' }}>@{member.username}</div>
                        </div>
                      </Link>
                      {/* Years */}
                      <div style={{ display: 'flex', gap: '5px', flexWrap: 'wrap' as const, justifyContent: 'flex-end' as const }}>
                        {[...member.years].sort((a: number, b: number) => b - a).map((year: number) => (
                          <span key={year} style={yearPillStyle}>{year}</span>
                        ))}
                      </div>
                      {/* Management controls — never show next to self */}
                      {!isCurrentUser && (
                        <div style={{ display: 'flex', gap: '6px', flexShrink: 0 }}>
                          {isPageOwner && !isOwner && (
                            <>
                              {member.role === 'member' && (
                                <button onClick={() => handleSetRole(member, 'admin')} style={mgmtBtnStyle}>Make Admin</button>
                              )}
                              {member.role === 'admin' && (
                                <button onClick={() => handleSetRole(member, 'member')} style={mgmtBtnStyle}>Remove Admin</button>
                              )}
                              <button onClick={() => handleMakeOwner(member)} style={mgmtBtnStyle}>Make Owner</button>
                              <button onClick={() => handleRemoveMember(member)} style={{ ...mgmtBtnStyle, color: '#cc0000', borderColor: '#fca5a5' }}>Remove</button>
                            </>
                          )}
                          {/* Admins can remove members (not other admins, not owner) */}
                          {!isPageOwner && myRole === 'admin' && !isOwner && member.role === 'member' && (
                            <button onClick={() => handleRemoveMember(member)} style={{ ...mgmtBtnStyle, color: '#cc0000', borderColor: '#fca5a5' }}>Remove</button>
                          )}
                        </div>
                      )}
                    </div>
                    {/* Wishlist row */}
                    {wishList.length > 0 && (
                      <div style={{ display: 'flex', gap: '5px', flexWrap: 'wrap' as const, paddingLeft: '50px' }}>
                        {wishList.map(tag => (
                          <span key={tag} style={wishTagStyle}>{tag}</span>
                        ))}
                      </div>
                    )}
                    {wishList.length === 0 && isMember && (
                      <div style={{ paddingLeft: '50px', fontSize: '12px', color: '#ccc' }}>—</div>
                    )}
                  </div>
                );
              })}
            </div>
          </>
        )}
      </div>

      {/* Camp items section */}
      <div style={{ marginTop: '48px' }}>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '10px' }}>
          <h2 style={sectionHeadStyle}>Items from Camp Members</h2>
          {isMember && (
            <div style={campToggleGroupStyle}>
              <button onClick={() => setCampViewMode('grid')} style={{ ...campToggleButtonStyle, backgroundColor: campViewMode === 'grid' ? '#eee' : 'transparent' }}>
                <LayoutGrid size={18} color={campViewMode === 'grid' ? '#000' : '#666'} />
              </button>
              <button onClick={() => setCampViewMode('list')} style={{ ...campToggleButtonStyle, backgroundColor: campViewMode === 'list' ? '#eee' : 'transparent' }}>
                <List size={18} color={campViewMode === 'list' ? '#000' : '#666'} />
              </button>
            </div>
          )}
        </div>

        {/* Non-member gate */}
        {!isMember ? (
          <p style={{ color: '#aaa', fontSize: '0.9rem', fontStyle: 'italic' as const }}>
            Only members of this camp can view this list.
          </p>
        ) : campItemsLoading ? (
          <div style={campGridStyle}>{[...Array(3)].map((_, i) => <div key={i} style={campSkeletonStyle} />)}</div>
        ) : campItems.length === 0 ? (
          <p style={{ color: '#aaa', fontSize: '0.9rem', fontStyle: 'italic' as const }}>No items have been shared by camp members yet.</p>
        ) : (
          <div style={campViewMode === 'grid' ? campGridStyle : campListContainerStyle}>
            {campViewMode === 'list' && (
              <div style={campListHeaderStyle}>
                <div style={{ width: '50px' }} />
                <div>Item</div>
                <div>Description</div>
                <div>Category</div>
                <div>Location</div>
                <div>Owner</div>
                <div>Terms</div>
                <div />
              </div>
            )}
            {campItems.map(item => (
              <div key={item.id} onClick={() => handleOpenCampItem(item)} style={{ cursor: 'pointer' }}>
                {campViewMode === 'grid' ? <CampCardView item={item} /> : <CampListView item={item} />}
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Camp item quick-view modal */}
      {selectedCampItem && (
        <div style={campModalOverlayStyle} onClick={handleCloseCampModal}>
          <div style={campModalContentStyle} onClick={e => e.stopPropagation()}>
            <button onClick={handleCloseCampModal} style={campCloseButtonStyle}><X size={24} /></button>

            <div style={{ marginBottom: '20px' }}>
              <PolaroidPhoto src={selectedCampItem.image_urls?.[0]} alt={selectedCampItem.item_name} itemId={selectedCampItem.id} noRotate />
            </div>

            <h2 style={{ margin: '0 0 5px 0', color: '#111', fontSize: '24px' }}>{selectedCampItem.item_name}</h2>
            <p style={campCategoryLabelStyle}>{selectedCampItem.category} • {selectedCampItem.condition}</p>

            <div style={{ margin: '20px 0', padding: '15px', backgroundColor: '#f9f9f9', borderRadius: '10px', fontSize: '15px', color: '#444', lineHeight: '1.6' }}>
              {selectedCampItem.description || 'No description provided by the owner.'}
            </div>

            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px', padding: '0 5px' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px', color: '#777', fontSize: '14px' }}>
                <MapPin size={16} />
                {[selectedCampItem.locations?.city, selectedCampItem.locations?.state].filter(Boolean).join(', ') || 'Location N/A'}
              </div>
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px', color: '#777', fontSize: '14px' }}>
                <User size={16} />
                {selectedCampItem.profiles?.username ? (
                  <Link href={`/profile/${selectedCampItem.profiles.username}`} onClick={e => e.stopPropagation()} style={{ color: '#00aacc', textDecoration: 'none', fontWeight: '500' }}>
                    {selectedCampItem.profiles?.preferred_name || 'Member'}
                  </Link>
                ) : (selectedCampItem.profiles?.preferred_name || 'Member')}
              </div>
            </div>

            {(selectedCampItem.pickup_by || selectedCampItem.return_by || selectedCampItem.return_terms || selectedCampItem.damage_price || selectedCampItem.loss_price) && (
              <div style={{ marginBottom: '20px', padding: '14px', backgroundColor: '#fdf3ec', borderRadius: '12px', fontSize: '13px', border: '1px solid #f0d8c8' }}>
                <div style={{ fontWeight: 700, color: '#C08261', marginBottom: '8px', fontSize: '10px', textTransform: 'uppercase' as const, letterSpacing: '0.08em' }}>Borrowing Terms</div>
                {(selectedCampItem.pickup_by || selectedCampItem.return_by) && (
                  <div style={{ display: 'flex', gap: '20px', marginBottom: '6px', color: '#555' }}>
                    {selectedCampItem.pickup_by && <span>Pick up by: <strong>{new Date(selectedCampItem.pickup_by).toLocaleDateString()}</strong></span>}
                    {selectedCampItem.return_by && <span>Return by: <strong>{new Date(selectedCampItem.return_by).toLocaleDateString()}</strong></span>}
                  </div>
                )}
                {(selectedCampItem.damage_price || selectedCampItem.loss_price) && (
                  <div style={{ display: 'flex', gap: '20px', marginBottom: '6px', color: '#555' }}>
                    {selectedCampItem.damage_price && <span>Damage agreement: <strong>${selectedCampItem.damage_price}</strong></span>}
                    {selectedCampItem.loss_price && <span>Loss agreement: <strong>${selectedCampItem.loss_price}</strong></span>}
                  </div>
                )}
                {selectedCampItem.return_terms && (
                  <div style={{ color: '#666', fontStyle: 'italic' }}>"{selectedCampItem.return_terms}"</div>
                )}
              </div>
            )}

            {currentUserId ? (
              <button onClick={() => setShowCampRequestForm(true)} style={campPrimaryButtonStyle}>
                Request to {selectedCampItem.availability_status === 'Available to Keep' ? 'Keep' : 'Borrow'}
              </button>
            ) : (
              <a href="/login" style={{ ...campPrimaryButtonStyle, display: 'block', textAlign: 'center' as const, textDecoration: 'none' }}>
                Log In to Request
              </a>
            )}
          </div>
        </div>
      )}

      {showCampRequestForm && selectedCampItem && (
        <RequestModal item={selectedCampItem} onClose={() => setShowCampRequestForm(false)} />
      )}
    </div>
  );
}

// ── Styles ──

const sectionHeadStyle: React.CSSProperties = {
  fontSize: '13px', fontWeight: 700, color: '#aaa',
  textTransform: 'uppercase', letterSpacing: '0.06em', marginBottom: '10px',
};

const memberRowStyle: React.CSSProperties = {
  display: 'flex', alignItems: 'center', gap: '12px',
  padding: '10px 12px', borderRadius: '8px',
  textDecoration: 'none', backgroundColor: '#fff',
  border: '1px solid #f0f0f0',
};

const yearPillStyle: React.CSSProperties = {
  backgroundColor: '#fdf3ec', padding: '2px 8px', borderRadius: '20px',
  color: '#C08261', border: '1px solid #f0d8c8', fontSize: '11px', fontWeight: 'bold',
};

const wishTagStyle: React.CSSProperties = {
  backgroundColor: '#e0faff', padding: '2px 8px', borderRadius: '20px',
  color: '#007799', border: '1px solid #b0eaf8', fontSize: '11px', fontWeight: 600,
};

const mgmtBtnStyle: React.CSSProperties = {
  padding: '3px 10px', fontSize: '11px', fontWeight: 600,
  border: '1px solid #ddd', borderRadius: '6px', backgroundColor: '#fff',
  color: '#555', cursor: 'pointer',
};

const editButtonStyle: React.CSSProperties = {
  display: 'flex', alignItems: 'center', padding: '8px 16px',
  backgroundColor: '#fff', border: '1px solid #ddd', borderRadius: '8px',
  fontWeight: 600, fontSize: '0.85rem', color: '#2D241E', cursor: 'pointer',
  flexShrink: 0,
};

const editLabelStyle: React.CSSProperties = {
  display: 'block', fontSize: '0.75rem', fontWeight: 700, color: '#777',
  textTransform: 'uppercase', letterSpacing: '0.05em', marginBottom: '5px',
};

const editInputStyle: React.CSSProperties = {
  width: '100%', boxSizing: 'border-box', padding: '9px 12px',
  border: '1px solid #ddd', borderRadius: '8px', fontSize: '0.9rem',
  color: '#2D241E', backgroundColor: '#fff', outline: 'none', marginBottom: '0',
};

const saveBtnStyle: React.CSSProperties = {
  padding: '9px 22px', backgroundColor: '#C08261', color: '#fff',
  border: 'none', borderRadius: '8px', fontWeight: 700, fontSize: '0.875rem', cursor: 'pointer',
};

const cancelBtnStyle: React.CSSProperties = {
  padding: '9px 18px', backgroundColor: 'transparent', color: '#7a4a2a',
  border: '1px solid #e0c8b8', borderRadius: '8px', fontWeight: 600, fontSize: '0.875rem', cursor: 'pointer',
};

const uploadBtnStyle: React.CSSProperties = {
  padding: '7px 16px', backgroundColor: '#fff', color: '#555',
  border: '1px solid #ddd', borderRadius: '8px', fontWeight: 600, fontSize: '0.8rem', cursor: 'pointer',
};

const socialPillStyle: React.CSSProperties = {
  padding: '4px 12px', backgroundColor: '#f5f5f5', border: '1px solid #e0e0e0',
  borderRadius: '20px', fontSize: '12px', color: '#444', fontWeight: 600,
  textDecoration: 'none',
};

const claimInputStyle: React.CSSProperties = {
  width: '100%', boxSizing: 'border-box' as const,
  padding: '8px 12px', borderRadius: '6px',
  border: '1px solid #e0c8b8', fontSize: '0.875rem', color: '#2D241E',
  backgroundColor: '#fff', outline: 'none',
};

const claimSubmitBtnStyle: React.CSSProperties = {
  padding: '8px 20px', backgroundColor: '#C08261', color: '#fff',
  border: 'none', borderRadius: '6px', fontWeight: 700,
  fontSize: '0.875rem', cursor: 'pointer',
};

const claimCancelBtnStyle: React.CSSProperties = {
  padding: '8px 16px', backgroundColor: 'transparent', color: '#7a4a2a',
  border: '1px solid #e0c8b8', borderRadius: '6px', fontWeight: 600,
  fontSize: '0.875rem', cursor: 'pointer',
};

// ── Camp Items Sub-components ──

function CampCardView({ item }: { item: any }) {
  const ownerName = item.profiles?.preferred_name || 'Member';
  const locationDisplay = item.locations
    ? [item.locations.city, item.locations.state].filter(Boolean).join(', ')
    : 'N/A';
  const hasTerms = item.return_by || item.return_terms;
  return (
    <div style={{ backgroundColor: '#fff', border: '1px solid #eee', borderRadius: '12px', boxShadow: '0 2px 8px rgba(0,0,0,0.05)' }}>
      <div style={{ position: 'relative' as const, backgroundColor: 'transparent', padding: '12px 12px 0 12px', width: '100%', overflow: 'hidden', boxSizing: 'border-box' as const }}>
        <PolaroidPhoto src={item.image_urls?.[0]} alt={item.item_name} itemId={item.id} noRotate />
        <div style={{ position: 'absolute', top: '10px', left: '10px', backgroundColor: '#00ccff', color: '#000', padding: '3px 8px', borderRadius: '6px', fontSize: '10px', fontWeight: 'bold', zIndex: 5 }}>
          {item.availability_status === 'Available to Keep' ? 'Keep' : 'Borrow'}
        </div>
      </div>
      <div style={{ padding: '15px' }}>
        <h3 style={{ margin: 0, color: '#111', fontSize: '16px', fontWeight: 600 }}>{item.item_name}</h3>
        <p style={{ color: '#00ccff', fontSize: '11px', margin: '4px 0 12px', textTransform: 'uppercase' as const, fontWeight: 'bold' }}>{item.category} • {item.condition}</p>
        <div style={{ display: 'flex', justifyContent: 'space-between', color: '#777', fontSize: '12px', borderTop: '1px solid #f5f5f5', paddingTop: '10px' }}>
          <span style={{ display: 'flex', alignItems: 'center', gap: '4px' }}><MapPin size={12} />{locationDisplay}</span>
          {item.profiles?.username ? (
            <Link href={`/profile/${item.profiles.username}`} onClick={e => e.stopPropagation()} style={{ display: 'flex', alignItems: 'center', gap: '4px', color: '#00aacc', textDecoration: 'none' }}>
              <User size={12} />{ownerName}
            </Link>
          ) : (
            <span style={{ display: 'flex', alignItems: 'center', gap: '4px' }}><User size={12} />{ownerName}</span>
          )}
        </div>
        {hasTerms && (
          <div style={{ fontSize: '12px', color: '#888', borderTop: '1px solid #f5f5f5', paddingTop: '8px', marginTop: '6px' }}>
            {item.return_by && <span>Return by {new Date(item.return_by).toLocaleDateString()}</span>}
            {item.return_terms && !item.return_by && <span>Has terms</span>}
          </div>
        )}
      </div>
    </div>
  );
}

const CAMP_LIST_COLS = '50px 160px 1fr 140px 120px 110px 1fr 70px';

function CampListView({ item }: { item: any }) {
  const ownerName = item.profiles?.preferred_name || 'Member';
  const locationDisplay = item.locations
    ? [item.locations.city, item.locations.state].filter(Boolean).join(', ')
    : '—';
  const termsSummary = [
    item.return_by ? `Return by ${new Date(item.return_by).toLocaleDateString()}` : null,
    item.damage_price ? `Damage agr. $${item.damage_price}` : null,
    item.loss_price ? `Loss agr. $${item.loss_price}` : null,
    item.return_terms ? 'Custom terms' : null,
  ].filter(Boolean).join(' · ');
  return (
    <div style={{ display: 'grid', gridTemplateColumns: CAMP_LIST_COLS, gap: '10px', alignItems: 'center', padding: '10px 12px', backgroundColor: '#fff', borderBottom: '1px solid #f5f5f5' }}>
      <div style={{ width: '50px', height: '50px', borderRadius: '6px', overflow: 'hidden', backgroundColor: '#000', flexShrink: 0 }}>
        {item.image_urls?.[0]
          ? <img src={item.image_urls[0]} alt="" style={{ width: '100%', height: '100%', objectFit: 'contain' as const }} />
          : <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', height: '100%', color: '#ccc' }}><Package size={16} /></div>}
      </div>
      <div style={{ overflow: 'hidden' }}>
        <div style={{ fontWeight: 600, color: '#111', fontSize: '14px' }}>{item.item_name}</div>
        <div style={{ fontSize: '10px', color: '#00ccff', fontWeight: 'bold', textTransform: 'uppercase' as const, marginTop: '2px' }}>
          {item.availability_status === 'Available to Keep' ? 'Keep' : 'Borrow'}
        </div>
      </div>
      <div style={{ fontSize: '12px', color: '#666', overflow: 'hidden', display: '-webkit-box', WebkitLineClamp: 2, WebkitBoxOrient: 'vertical' as const }}>{item.description || '—'}</div>
      <div style={{ fontSize: '12px', color: '#666', overflow: 'hidden', whiteSpace: 'nowrap' as const }}>{item.category}</div>
      <div style={{ fontSize: '12px', color: '#666', display: 'flex', alignItems: 'center', overflow: 'hidden', whiteSpace: 'nowrap' as const }}><MapPin size={11} style={{ marginRight: '3px', flexShrink: 0 }} />{locationDisplay}</div>
      <div style={{ fontSize: '12px', color: '#666', overflow: 'hidden', whiteSpace: 'nowrap' as const }}>
        {item.profiles?.username ? (
          <Link href={`/profile/${item.profiles.username}`} onClick={e => e.stopPropagation()} style={{ color: '#00aacc', textDecoration: 'none' }}>{ownerName}</Link>
        ) : ownerName}
      </div>
      <div style={{ fontSize: '11px', color: '#888', overflow: 'hidden', whiteSpace: 'nowrap' as const }}>{termsSummary || '—'}</div>
      <div style={{ color: '#00ccff', fontWeight: 'bold', fontSize: '12px', flexShrink: 0 }}>View →</div>
    </div>
  );
}

// Camp items styles
const campToggleGroupStyle: React.CSSProperties = { display: 'flex', backgroundColor: '#f5f5f5', borderRadius: '8px', padding: '4px', border: '1px solid #eee' };
const campToggleButtonStyle: React.CSSProperties = { border: 'none', padding: '6px 10px', borderRadius: '6px', cursor: 'pointer' };
const campGridStyle: React.CSSProperties = { display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(260px, 1fr))', gap: '20px' };
const campListContainerStyle: React.CSSProperties = { display: 'flex', flexDirection: 'column' as const };
const campListHeaderStyle: React.CSSProperties = { display: 'grid', gridTemplateColumns: CAMP_LIST_COLS, gap: '10px', padding: '8px 12px', fontSize: '10px', fontWeight: 700, color: '#aaa', textTransform: 'uppercase' as const, letterSpacing: '0.06em', borderBottom: '2px solid #eee' };
const campSkeletonStyle: React.CSSProperties = { height: '280px', backgroundColor: '#f5f5f5', borderRadius: '12px' };

const campModalOverlayStyle: React.CSSProperties = {
  position: 'fixed', top: 0, left: 0, width: '100%', height: '100%',
  backgroundColor: 'rgba(0,0,0,0.4)', display: 'flex', justifyContent: 'center',
  alignItems: 'center', zIndex: 1000, padding: '20px', backdropFilter: 'blur(4px)',
};
const campModalContentStyle: React.CSSProperties = {
  backgroundColor: '#fff', padding: '30px', borderRadius: '24px',
  width: '100%', maxWidth: '500px', position: 'relative',
  boxShadow: '0 20px 60px rgba(0,0,0,0.15)', maxHeight: '95vh', overflowY: 'auto',
};
const campCloseButtonStyle: React.CSSProperties = {
  position: 'absolute', top: '20px', right: '20px', background: '#f5f5f5',
  border: 'none', cursor: 'pointer', color: '#666', borderRadius: '50%',
  width: '36px', height: '36px', display: 'flex', alignItems: 'center', justifyContent: 'center',
  zIndex: 10,
};
const campCategoryLabelStyle: React.CSSProperties = { color: '#00ccff', fontSize: '11px', margin: '4px 0 12px', textTransform: 'uppercase', fontWeight: 'bold' };
const campPrimaryButtonStyle: React.CSSProperties = {
  width: '100%', padding: '18px', backgroundColor: '#00ccff', color: '#000',
  border: 'none', borderRadius: '14px', fontWeight: 'bold', fontSize: '16px',
  cursor: 'pointer', boxShadow: '0 4px 14px rgba(0,204,255,0.4)',
};
