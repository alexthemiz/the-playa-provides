'use client';

import { useEffect, useState } from 'react';
import { useParams } from 'next/navigation';
import { supabase } from '@/lib/supabaseClient';
import Link from 'next/link';
import type React from 'react';
import PolaroidPhoto from '@/components/PolaroidPhoto';
import RequestModal from '@/components/RequestModal';
import { LayoutGrid, List, MapPin, User, Package, X } from 'lucide-react';

export default function CampPage() {
  const params = useParams();
  const slug = params.slug as string;

  const [camp, setCamp] = useState<any>(null);
  const [pageOwner, setPageOwner] = useState<any>(null);
  const [members, setMembers] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  // Claim form state
  const [currentUserId, setCurrentUserId] = useState<string | null>(null);
  const [showClaimForm, setShowClaimForm] = useState(false);
  const [existingClaim, setExistingClaim] = useState<string | null>(null); // 'pending' | 'approved' | 'denied' | null
  const [claimRole, setClaimRole] = useState('');
  const [claimYears, setClaimYears] = useState('');
  const [claimSubmitting, setClaimSubmitting] = useState(false);
  const [claimError, setClaimError] = useState('');
  const [claimSuccess, setClaimSuccess] = useState(false);

  // Camp items state
  const [campItems, setCampItems] = useState<any[]>([]);
  const [campItemsLoading, setCampItemsLoading] = useState(false);
  const [campViewMode, setCampViewMode] = useState<'grid' | 'list'>('list');
  const [selectedCampItem, setSelectedCampItem] = useState<any>(null);
  const [showCampRequestForm, setShowCampRequestForm] = useState(false);

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

        // Fetch page owner profile if claimed
        if (campData.is_claimed && campData.page_owner_id) {
          const { data: ownerData } = await supabase
            .from('profiles')
            .select('username, preferred_name')
            .eq('id', campData.page_owner_id)
            .maybeSingle();
          setPageOwner(ownerData);
        }

        // Fetch affiliations with member profiles
        const { data: affData } = await supabase
          .from('user_camp_affiliations')
          .select('year, profiles(id, username, preferred_name, avatar_url)')
          .eq('camp_id', campData.id)
          .order('year', { ascending: false });

        // Group by user, aggregate years
        const memberMap = new Map<string, any>();
        for (const aff of affData || []) {
          const profile = aff.profiles as any;
          if (!profile) continue;
          if (!memberMap.has(profile.id)) {
            memberMap.set(profile.id, { ...profile, years: [] });
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

  // Sync quick-view modal with URL (handles refresh + back/forward)
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

  const handleOpenCampItem = (item: any) => {
    setSelectedCampItem(item);
    window.history.pushState({ id: item.id }, '', `/camps/${slug}/${item.id}`);
  };

  const handleCloseCampModal = () => {
    setSelectedCampItem(null);
    setShowCampRequestForm(false);
    window.history.pushState(null, '', `/camps/${slug}`);
  };

  const handleClaimSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setClaimSubmitting(true);
    setClaimError('');
    try {
      const { error: insertError } = await supabase
        .from('camp_claim_requests')
        .insert({ camp_id: camp.id, user_id: currentUserId, role: claimRole || null, years: claimYears || null });
      if (insertError) throw new Error(insertError.message);

      // Fire-and-forget edge function to email support
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

  return (
    <div style={{ padding: '40px 20px', maxWidth: '900px', margin: '0 auto', color: '#2D241E' }}>
      <Link href="/find-items" style={{ color: '#888', textDecoration: 'none', fontSize: '0.9rem' }}>← Find Items</Link>

      <h1 style={{ fontSize: '28px', fontWeight: 'bold', color: '#2D241E', margin: '24px 0 0' }}>
        The Playa Provides<span style={{ textDecoration: 'underline' }}> {camp.display_name}{'\u00a0'}</span>
      </h1>

      {/* Unclaimed banner */}
      {!camp.is_claimed && (
        <div style={{
          backgroundColor: '#fdf3ec', border: '1px solid #f0d8c8', borderRadius: '10px',
          padding: '16px 20px', marginTop: '24px',
        }}>
          {/* Existing pending claim */}
          {existingClaim === 'pending' || claimSuccess ? (
            <p style={{ margin: 0, fontSize: '0.9rem', color: '#7a4a2a' }}>
              Your claim request for <strong>{camp.display_name}</strong> has been submitted and is under review. We'll notify you by email once it's approved.
            </p>
          ) : existingClaim === 'denied' ? (
            <p style={{ margin: 0, fontSize: '0.9rem', color: '#7a4a2a' }}>
              Your claim request for <strong>{camp.display_name}</strong> was not approved. Questions? Email <a href="mailto:support@theplayaprovides.com" style={{ color: '#C08261' }}>support@theplayaprovides.com</a>.
            </p>
          ) : showClaimForm ? (
            /* Inline claim form */
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
                    type="text"
                    value={claimRole}
                    onChange={e => setClaimRole(e.target.value)}
                    placeholder="e.g. Founder, Lead, Member…"
                    style={{
                      width: '100%', boxSizing: 'border-box' as const,
                      padding: '8px 12px', borderRadius: '6px',
                      border: '1px solid #e0c8b8', fontSize: '0.875rem', color: '#2D241E',
                      backgroundColor: '#fff', outline: 'none',
                    }}
                  />
                </div>
                <div>
                  <label style={{ fontSize: '0.8rem', color: '#7a4a2a', display: 'block', marginBottom: '4px' }}>
                    Years involved <span style={{ color: '#aaa', fontWeight: 400 }}>(optional)</span>
                  </label>
                  <input
                    type="text"
                    value={claimYears}
                    onChange={e => setClaimYears(e.target.value)}
                    placeholder="e.g. 2019–present"
                    style={{
                      width: '100%', boxSizing: 'border-box' as const,
                      padding: '8px 12px', borderRadius: '6px',
                      border: '1px solid #e0c8b8', fontSize: '0.875rem', color: '#2D241E',
                      backgroundColor: '#fff', outline: 'none',
                    }}
                  />
                </div>
                {claimError && (
                  <p style={{ margin: 0, fontSize: '0.8rem', color: '#cc0000' }}>{claimError}</p>
                )}
                <div style={{ display: 'flex', gap: '10px', alignItems: 'center' }}>
                  <button
                    type="submit"
                    disabled={claimSubmitting}
                    style={{
                      padding: '8px 20px', backgroundColor: '#C08261', color: '#fff',
                      border: 'none', borderRadius: '6px', fontWeight: 700,
                      fontSize: '0.875rem', cursor: claimSubmitting ? 'not-allowed' : 'pointer',
                      opacity: claimSubmitting ? 0.7 : 1,
                    }}
                  >
                    {claimSubmitting ? 'Submitting…' : 'Submit Claim'}
                  </button>
                  <button
                    type="button"
                    onClick={() => { setShowClaimForm(false); setClaimError(''); }}
                    style={{
                      padding: '8px 16px', backgroundColor: 'transparent', color: '#7a4a2a',
                      border: '1px solid #e0c8b8', borderRadius: '6px', fontWeight: 600,
                      fontSize: '0.875rem', cursor: 'pointer',
                    }}
                  >
                    Cancel
                  </button>
                </div>
              </div>
            </form>
          ) : (
            /* Default banner */
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: '16px', flexWrap: 'wrap' as const }}>
              <p style={{ margin: 0, fontSize: '0.9rem', color: '#7a4a2a' }}>
                This camp page hasn't been claimed yet. Are you a member of <strong>{camp.display_name}</strong>?
              </p>
              <button
                onClick={() => currentUserId ? setShowClaimForm(true) : window.location.href = '/login'}
                style={{
                  padding: '8px 18px', backgroundColor: '#C08261', color: '#fff',
                  border: 'none', borderRadius: '6px', fontWeight: 700,
                  fontSize: '0.875rem', flexShrink: 0, cursor: 'pointer',
                }}
              >
                Claim This Page
              </button>
            </div>
          )}
        </div>
      )}

      {/* Claimed: description, avatar/banner, founded year, page owner */}
      {camp.is_claimed && (
        <div style={{ marginTop: '24px' }}>
          {camp.banner_url && (
            <img
              src={camp.banner_url}
              alt=""
              style={{ width: '100%', height: '200px', objectFit: 'cover' as const, borderRadius: '10px', marginBottom: '20px' }}
            />
          )}
          <div style={{ display: 'flex', gap: '16px', alignItems: 'flex-start' }}>
            {camp.avatar_url && (
              <img
                src={camp.avatar_url}
                alt=""
                style={{ width: '72px', height: '72px', borderRadius: '50%', border: '3px solid #C08261', flexShrink: 0, objectFit: 'cover' as const }}
              />
            )}
            <div>
              {camp.description && (
                <p style={{ fontSize: '1rem', color: '#444', margin: '0 0 8px', lineHeight: 1.6 }}>{camp.description}</p>
              )}
              {camp.founded_year && (
                <p style={{ fontSize: '0.85rem', color: '#999', margin: 0 }}>Est. {camp.founded_year}</p>
              )}
            </div>
          </div>
        </div>
      )}

      {/* Member list */}
      <div style={{ marginTop: '36px' }}>
        <h2 style={sectionHeadStyle}>Members ({members.length})</h2>
        {members.length === 0 ? (
          <p style={{ color: '#aaa', fontSize: '0.9rem', fontStyle: 'italic' as const }}>No members listed yet.</p>
        ) : (
          <>
          <div style={{ display: 'flex', justifyContent: 'flex-end' as const, paddingRight: '12px', marginBottom: '4px' }}>
            <span style={{ fontSize: '11px', fontWeight: 700, color: '#bbb', textTransform: 'uppercase' as const, letterSpacing: '0.06em' }}>Years Attended</span>
          </div>
          <div style={{ display: 'flex', flexDirection: 'column' as const, gap: '2px' }}>
            {members.map(member => (
              <Link
                key={member.id}
                href={`/profile/${member.username}`}
                style={memberRowStyle}
              >
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
                    {camp.is_claimed && camp.page_owner_id === member.id && (
                      <span style={{ fontSize: '11px', color: '#bbb', fontWeight: 400 }}>(page owner)</span>
                    )}
                  </div>
                  <div style={{ fontSize: '12px', color: '#aaa' }}>@{member.username}</div>
                </div>
                <div style={{ display: 'flex', gap: '5px', flexWrap: 'wrap' as const, justifyContent: 'flex-end' as const }}>
                  {[...member.years].sort((a: number, b: number) => b - a).map((year: number) => (
                    <span key={year} style={yearPillStyle}>{year}</span>
                  ))}
                </div>
              </Link>
            ))}
          </div>
          </>
        )}
      </div>

      {/* Camp items section */}
      <div style={{ marginTop: '48px' }}>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '10px' }}>
          <h2 style={sectionHeadStyle}>Items from Camp Members</h2>
          <div style={campToggleGroupStyle}>
            <button onClick={() => setCampViewMode('grid')} style={{ ...campToggleButtonStyle, backgroundColor: campViewMode === 'grid' ? '#eee' : 'transparent' }}>
              <LayoutGrid size={18} color={campViewMode === 'grid' ? '#000' : '#666'} />
            </button>
            <button onClick={() => setCampViewMode('list')} style={{ ...campToggleButtonStyle, backgroundColor: campViewMode === 'list' ? '#eee' : 'transparent' }}>
              <List size={18} color={campViewMode === 'list' ? '#000' : '#666'} />
            </button>
          </div>
        </div>

        {campItemsLoading ? (
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

// --- Camp Items Sub-components ---

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
