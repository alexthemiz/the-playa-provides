'use client';

import { useEffect, useState } from 'react';
import { useParams } from 'next/navigation';
import { supabase } from '@/lib/supabaseClient';
import Link from 'next/link';
import type React from 'react';

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

  if (loading) return <div style={{ color: '#2D241E', padding: '40px' }}>Loading...</div>;
  if (!camp) return <div style={{ color: '#2D241E', padding: '40px' }}>Camp not found.</div>;

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
          {pageOwner && (
            <p style={{ fontSize: '0.75rem', color: '#bbb', marginTop: '12px' }}>
              Page managed by{' '}
              <Link href={`/profile/${pageOwner.username}`} style={{ color: '#bbb' }}>
                {pageOwner.preferred_name || pageOwner.username}
              </Link>
            </p>
          )}
        </div>
      )}

      {/* Member list */}
      <div style={{ marginTop: '36px' }}>
        <h2 style={sectionHeadStyle}>Members ({members.length})</h2>
        {members.length === 0 ? (
          <p style={{ color: '#aaa', fontSize: '0.9rem', fontStyle: 'italic' as const }}>No members listed yet.</p>
        ) : (
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
                  <div style={{ fontWeight: 600, fontSize: '14px', color: '#2D241E' }}>{member.preferred_name || member.username}</div>
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
        )}
      </div>
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
