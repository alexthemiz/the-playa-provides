'use client';

import { useState, useEffect } from 'react';
import dynamic from 'next/dynamic';
import { supabase } from '@/lib/supabaseClient';
import ImageSlider from '@/components/ImageSlider';
import { Search, MapPin, User, Package, X, LayoutGrid, List, Map } from 'lucide-react';
import Link from 'next/link';
import RequestModal from '@/components/RequestModal';
import ShareButton from '@/components/ShareButton';

const MapView = dynamic(() => import('@/components/MapView'), { ssr: false });

// ── Design tokens ────────────────────────────────────────────────────────────
const INK      = '#1C1610'
const INK_MID  = '#4A3828'
const INK_LITE = '#9A8878'
const PAPER    = '#F6F1E8'
const PAPER_DK = '#EDE5D0'
const PAPER_LT = '#FDFAF4'
const LIME     = '#B8CC2A'
const LIME_DK  = '#8A9A10'
const TEAL     = '#1E8A82'
const TEAL_LT  = '#D4EDEB'
const RUST     = '#C24820'
const RUST_LT  = '#F5E0D8'
const MUSTARD  = '#D4A020'
const MUSTARD_LT = '#F5F0D0'

const CATEGORY_EMOJI: Record<string, string> = {
  'Bikes & Transport':  '🚲',
  'Clothing & Fun':     '🧥',
  'Kitchen & Water':    '🥘',
  'Power & Lighting':   '🔆',
  'Safety & First Aid': '🩹',
  'Shelter & Shade':    '⛺',
  'Tools & Hardware':   '🔧',
  'Miscellaneous':      '📦',
}

// Slight rotation per card for polaroid feel
const CARD_ROTS = [0.6, -0.8, 0.3, -1.1, 0.7, -0.4, 1.0, -0.5, 0.9, -1.2, 0.4, -0.7]

export default function FindItemsPage() {
  const [items,               setItems]               = useState<any[]>([]);
  const [loading,             setLoading]             = useState(true);
  const [searchQuery,         setSearchQuery]         = useState('');
  const [zipQuery,            setZipQuery]            = useState('');

  const [categoryFilters,     setCategoryFilters]     = useState<string[]>(['All']);
  const [availabilityFilters, setAvailabilityFilters] = useState<string[]>(['Keep', 'Borrow']);
  const [relationshipFilters, setRelationshipFilters] = useState<string[]>(['Everyone']);

  const [userId,       setUserId]       = useState<string | null>(null);
  const [followingIds, setFollowingIds] = useState<string[]>([]);
  const [followerIds,  setFollowerIds]  = useState<string[]>([]);
  const [campMateIds,  setCampMateIds]  = useState<string[]>([]);

  const [selectedItem,     setSelectedItem]     = useState<any>(null);
  const [showRequestForm,  setShowRequestForm]  = useState(false);
  const [viewMode,         setViewMode]         = useState<'cards' | 'list' | 'map'>(
    () => (typeof window !== 'undefined' ? (localStorage.getItem('findItemsView') as 'cards' | 'list' | 'map') || 'cards' : 'cards')
  );

  const categories = [
    'All', 'Bikes & Transport', 'Clothing & Fun', 'Kitchen & Water',
    'Power & Lighting', 'Safety & First Aid', 'Shelter & Shade',
    'Tools & Hardware', 'Miscellaneous',
  ];

  useEffect(() => {
    fetchItems();
    fetchRelationships();
  }, []);

  useEffect(() => {
    localStorage.setItem('findItemsView', viewMode);
  }, [viewMode]);

  useEffect(() => {
    async function markBrowsed() {
      const { data: { session } } = await supabase.auth.getSession()
      if (!session?.user) return
      supabase
        .from('profiles')
        .update({ has_browsed: true })
        .eq('id', session.user.id)
        .eq('has_browsed', false)
        .then(() => {})
    }
    markBrowsed()
  }, [])

  useEffect(() => {
    const syncModalWithUrl = () => {
      const pathParts = window.location.pathname.split('/');
      const idFromUrl = pathParts[pathParts.length - 1];
      if (idFromUrl && idFromUrl !== 'find-items' && items.length > 0) {
        const item = items.find(i => String(i.id) === idFromUrl);
        if (item) setSelectedItem(item);
      } else {
        setSelectedItem(null);
        setShowRequestForm(false);
      }
    };
    if (!loading) {
      syncModalWithUrl();
      window.addEventListener('popstate', syncModalWithUrl);
    }
    return () => window.removeEventListener('popstate', syncModalWithUrl);
  }, [items, loading]);

  async function fetchRelationships() {
    try {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) return;
      setUserId(session.user.id);
      const [followingRes, followersRes] = await Promise.all([
        supabase.from('user_follows').select('following_id').eq('follower_id', session.user.id),
        supabase.from('user_follows').select('follower_id').eq('following_id', session.user.id),
      ]);
      setFollowingIds((followingRes.data || []).map((r: any) => r.following_id));
      setFollowerIds((followersRes.data || []).map((r: any) => r.follower_id));
      const { data: myAffiliations } = await supabase
        .from('user_camp_affiliations').select('camp_id')
        .eq('user_id', session.user.id).not('camp_id', 'is', null);
      const myCampIds = (myAffiliations || []).map((r: any) => r.camp_id).filter(Boolean);
      if (myCampIds.length === 0) {
        setCampMateIds([]);
      } else {
        const { data: campMembers } = await supabase
          .from('user_camp_affiliations').select('user_id')
          .in('camp_id', myCampIds).neq('user_id', session.user.id);
        setCampMateIds([...new Set((campMembers || []).map((r: any) => r.user_id))]);
      }
    } catch (err: any) { console.error('fetchRelationships error:', err.message); }
  }

  async function fetchItems() {
    setLoading(true);
    try {
      const { data: gear, error: gearError } = await supabase
        .from('gear_items').select('*').eq('owner_deleted', false);
      if (gearError) throw gearError;
      const userIds     = [...new Set(gear.map((i: any) => i.user_id))];
      const locationIds = [...new Set(gear.map((i: any) => i.location_id).filter((id: any) => id))];
      const [profilesRes, locationsRes] = await Promise.all([
        supabase.from('profiles').select('id, preferred_name, contact_email, username').in('id', userIds),
        supabase.from('locations').select('id, city, state, zip_code, latitude, longitude').in('id', locationIds),
      ]);
      setItems(gear.map((item: any) => ({
        ...item,
        profiles:  profilesRes.data?.find((p: any) => p.id === item.user_id),
        locations: locationsRes.data?.find((l: any) => l.id === item.location_id),
      })));
    } catch (err: any) { console.error('Fetch error:', err.message); }
    finally { setLoading(false); }
  }

  const handleOpenItem = (item: any) => {
    setSelectedItem(item);
    window.history.pushState({ id: item.id }, '', `/find-items/${item.id}`);
  };

  const handleCloseModal = () => {
    setSelectedItem(null);
    setShowRequestForm(false);
    window.history.pushState(null, '', '/find-items');
  };

  const toggleCategory = (cat: string) => {
    if (cat === 'All') { setCategoryFilters(['All']); return; }
    setCategoryFilters(prev => {
      const without = prev.filter(f => f !== 'All');
      if (without.includes(cat)) {
        const next = without.filter(f => f !== cat);
        return next.length === 0 ? ['All'] : next;
      }
      return [...without, cat];
    });
  };

  const toggleAvailability = (mode: string) => {
    setAvailabilityFilters(prev => {
      if (prev.includes(mode)) return prev.length === 1 ? prev : prev.filter(m => m !== mode);
      return [...prev, mode];
    });
  };

  const toggleRelationship = (option: string) => {
    if (option === 'Everyone') { setRelationshipFilters(['Everyone']); return; }
    setRelationshipFilters(prev => {
      const without = prev.filter(f => f !== 'Everyone');
      if (without.includes(option)) {
        const next = without.filter(f => f !== option);
        return next.length === 0 ? ['Everyone'] : next;
      }
      return [...without, option];
    });
  };

  const filteredItems = items.filter(item => {
    if (item.visibility === 'private') return false;
    if (item.availability_status === 'Not Available') return false;
    if (!item.item_name?.toLowerCase().includes(searchQuery.toLowerCase())) return false;
    if (zipQuery && !item.locations?.zip_code?.includes(zipQuery)) return false;
    if (!categoryFilters.includes('All') && !categoryFilters.includes(item.category)) return false;
    const itemStatus = item.availability_status === 'Available to Keep' ? 'Keep' : 'Borrow';
    if (!availabilityFilters.includes(itemStatus)) return false;
    if (!relationshipFilters.includes('Everyone')) {
      const inFollowing  = relationshipFilters.includes('Following')   && followingIds.includes(item.user_id);
      const inFollowers  = relationshipFilters.includes('Followers')   && followerIds.includes(item.user_id);
      const inCampmates  = relationshipFilters.includes('Campmates') && campMateIds.includes(item.user_id);
      if (!inFollowing && !inFollowers && !inCampmates) return false;
    }
    return true;
  });

  // ── Chip helpers ─────────────────────────────────────────────────────────
  function chipStyle(active: boolean, accent?: string): React.CSSProperties {
    if (active && accent) return {
      padding: '6px 14px', fontSize: '0.78rem', fontWeight: 600, whiteSpace: 'nowrap' as const,
      border: `1.5px solid ${accent}`, background: accent, color: '#fff', cursor: 'pointer',
      fontFamily: 'inherit', transition: 'all 0.12s',
    };
    if (active) return {
      padding: '6px 14px', fontSize: '0.78rem', fontWeight: 600, whiteSpace: 'nowrap' as const,
      border: `1.5px solid ${INK}`, background: INK, color: PAPER, cursor: 'pointer',
      fontFamily: 'inherit', transition: 'all 0.12s',
    };
    return {
      padding: '6px 14px', fontSize: '0.78rem', fontWeight: 500, whiteSpace: 'nowrap' as const,
      border: `1.5px solid rgba(28,22,16,0.2)`, background: PAPER_LT, color: INK_MID,
      cursor: 'pointer', fontFamily: 'inherit', transition: 'all 0.12s',
    };
  }

  const CAT_ACCENTS: Record<string, string> = {
    'Shelter & Shade':    TEAL,
    'Power & Lighting':   MUSTARD,
    'Clothing & Fun':     RUST,
    'Bikes & Transport':  LIME_DK,
    'Safety & First Aid': '#7B4FCF',
    'Kitchen & Water':    '#1E8A82',
    'Tools & Hardware':   INK_MID,
    'Miscellaneous':      INK_LITE,
  };

  return (
    <div style={{ backgroundColor: PAPER, minHeight: '100vh', color: INK }}>

      {/* ── PAGE HEADER BAND ───────────────────────────────────────────── */}
      <div style={{ backgroundColor: PAPER_LT, borderBottom: `2px solid ${INK}`, padding: '28px 0' }}>
        <div className="rsp-px" style={{ maxWidth: '1280px', margin: '0 auto' }}>
          <h1 style={{ fontFamily: "'Arvo', serif", fontSize: '1.9rem', fontWeight: 900, lineHeight: 1.05, color: INK, margin: '0 0 12px' }}>
            Find what you <em style={{ fontStyle: 'italic', color: TEAL }}>need.</em>
          </h1>
          <p style={{ fontSize: '0.9rem', color: '#4A3828', lineHeight: 1.65, maxWidth: '560px', margin: 0 }}>
            Browse gear available to borrow or keep from people in your community.
          </p>
        </div>
      </div>

      {/* ── FILTERS ────────────────────────────────────────────────────── */}
      <div style={{ backgroundColor: PAPER_LT, padding: '16px 0 0' }}>
        <div className="rsp-px" style={{ maxWidth: '1280px', margin: '0 auto' }}>

          {/* Search row */}
          <div className="fi-search-row" style={{ display: 'flex', gap: '10px', alignItems: 'stretch', marginBottom: '16px', flexWrap: 'wrap' as const }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '10px', flexShrink: 0 }}>
              <span style={{ fontFamily: "'Space Mono', monospace", fontSize: '0.6rem', fontWeight: 700, letterSpacing: '0.08em', textTransform: 'uppercase' as const, color: INK_LITE, whiteSpace: 'nowrap' as const }}>Search by Keyword:</span>
              <div style={{ display: 'flex', alignItems: 'center', border: `2px solid ${INK}`, background: PAPER_LT, padding: '0 14px', gap: '10px', width: '200px' }}>
                <Search size={16} color={INK_LITE} style={{ flexShrink: 0 }} />
                <input
                  type="text"
                  value={searchQuery}
                  onChange={e => setSearchQuery(e.target.value)}
                  style={{ flex: 1, border: 'none', background: 'transparent', outline: 'none', fontFamily: 'Outfit, sans-serif', fontSize: '0.92rem', color: INK, padding: '11px 0' }}
                />
              </div>
            </div>
            <div style={{ display: 'flex', alignItems: 'center', gap: '10px', flexShrink: 0 }}>
              <span style={{ fontFamily: "'Space Mono', monospace", fontSize: '0.6rem', fontWeight: 700, letterSpacing: '0.08em', textTransform: 'uppercase' as const, color: INK_LITE, whiteSpace: 'nowrap' as const }}>Search by Location:</span>
              <div style={{ display: 'flex', alignItems: 'center', border: `2px solid ${INK}`, background: PAPER_LT, padding: '0 14px', gap: '8px', width: '120px' }}>
                <MapPin size={14} color={INK_LITE} style={{ flexShrink: 0 }} />
                <input
                  type="text"
                  placeholder="ZIP"
                  value={zipQuery}
                  onChange={e => setZipQuery(e.target.value)}
                  style={{ width: '100%', border: 'none', background: 'transparent', outline: 'none', fontFamily: 'Outfit, sans-serif', fontSize: '0.92rem', color: INK, padding: '11px 0' }}
                />
              </div>
            </div>
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px', flexShrink: 0, marginLeft: 'auto' }}>
              <span style={{ fontFamily: "'Space Mono', monospace", fontSize: '0.55rem', fontWeight: 700, letterSpacing: '0.1em', textTransform: 'uppercase' as const, color: INK_LITE, whiteSpace: 'nowrap' as const }}>Show from:</span>
              {['Everyone', 'Following', 'Followers', 'Campmates'].map(opt => (
                <button key={opt} onClick={() => toggleRelationship(opt)}
                  style={chipStyle(relationshipFilters.includes(opt))}>
                  {opt}
                </button>
              ))}
            </div>
          </div>

          {/* Filter rows */}
          <style>{`
            .fi-filters { display: flex; align-items: center; gap: 8px; overflow-x: auto; scrollbar-width: none; padding-bottom: 12px; flex-wrap: wrap; }
            .fi-filters::-webkit-scrollbar { display: none; }
            .fi-filter-group { display: flex; align-items: center; gap: 8px; flex-wrap: wrap; }
            .fi-label { font-family: 'Space Mono', monospace; font-size: 0.55rem; font-weight: 700; letter-spacing: 0.1em; text-transform: uppercase; color: ${INK_LITE}; white-space: nowrap; flex-shrink: 0; }
            @media (max-width: 640px) {
              .fi-search-row { flex-direction: column !important; align-items: stretch !important; gap: 8px !important; }
              .fi-search-row > div { flex-shrink: 1 !important; width: 100%; }
            }
          `}</style>

          <div className="fi-filters" style={{ marginBottom: '4px' }}>
            <div className="fi-filter-group">
              <span className="fi-label">Category:</span>
              {categories.map(cat => (
                <button key={cat} onClick={() => toggleCategory(cat)}
                  style={chipStyle(categoryFilters.includes(cat), cat !== 'All' ? CAT_ACCENTS[cat] : undefined)}>
                  {cat}
                </button>
              ))}
            </div>
          </div>

          <div style={{ display: 'flex', alignItems: 'center', paddingBottom: '12px', flexWrap: 'wrap' as const, gap: '8px' }}>
            <div className="fi-filter-group">
              <span className="fi-label">Available to:</span>
              {['Borrow', 'Keep'].map(opt => (
                <button key={opt} onClick={() => toggleAvailability(opt)}
                  style={chipStyle(availabilityFilters.includes(opt), opt === 'Borrow' ? TEAL : RUST)}>
                  {opt}
                </button>
              ))}
            </div>
            <div className="fi-view-controls" style={{ display: 'flex', alignItems: 'center', gap: '16px', flexShrink: 0, marginLeft: 'auto' }}>
              <div style={{ fontFamily: "'Space Mono', monospace", fontSize: '0.68rem', color: INK_LITE, fontWeight: 700, letterSpacing: '0.06em' }}>
                {loading ? 'Loading…' : <><strong style={{ color: INK }}>{filteredItems.length}</strong> items available</>}
              </div>
              <div style={{ display: 'flex', border: `2px solid ${INK}`, overflow: 'hidden' }}>
                {([
                  { mode: 'cards', icon: <LayoutGrid size={15} />, label: 'Cards' },
                  { mode: 'list',  icon: <List size={15} />,        label: 'List'  },
                  { mode: 'map',   icon: <Map size={15} />,         label: 'Map'   },
                ] as const).map(({ mode, icon, label }) => (
                  <button
                    key={mode}
                    onClick={() => setViewMode(mode)}
                    title={label}
                    style={{
                      display: 'flex', alignItems: 'center', gap: '5px',
                      padding: '6px 12px',
                      border: 'none',
                      borderRight: mode !== 'map' ? `1px solid ${INK}` : 'none',
                      background: viewMode === mode ? INK : PAPER_LT,
                      color:      viewMode === mode ? PAPER : INK_LITE,
                      cursor: 'pointer',
                      fontFamily: "'Space Mono', monospace",
                      fontSize: '0.6rem',
                      fontWeight: 700,
                      letterSpacing: '0.06em',
                      textTransform: 'uppercase' as const,
                    }}
                  >
                    {icon}{label}
                  </button>
                ))}
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* ── MAP VIEW ───────────────────────────────────────────────────── */}

      {viewMode === 'map' && (
        <div className="rsp-px" style={{ maxWidth: '1280px', margin: '0 auto', paddingTop: '20px', paddingBottom: '64px' }}>
          <MapView items={filteredItems} onSelectItem={handleOpenItem} />
        </div>
      )}

      {/* ── LIST VIEW ──────────────────────────────────────────────────── */}
      {viewMode === 'list' && !loading && (
        <div className="rsp-px" style={{ maxWidth: '1280px', margin: '0 auto', paddingTop: '20px', paddingBottom: '64px' }}>
          {filteredItems.length === 0 ? (
            <div style={{ textAlign: 'center', padding: '80px 20px' }}>
              <div style={{ fontSize: '3.5rem', marginBottom: '16px' }}>🏜️</div>
              <h3 style={{ fontFamily: "'Arvo', serif", fontSize: '1.3rem', fontWeight: 700, fontStyle: 'italic', marginBottom: '8px', color: INK }}>Nothing out there right now.</h3>
              <p style={{ color: INK_MID, fontSize: '0.9rem' }}>Try adjusting your filters, or check back after someone lists something.</p>
            </div>
          ) : (
            <div>
              <style>{`
                .list-table { display: grid; grid-template-columns: 48px 1fr 130px 110px 220px 130px 140px 90px; align-items: center; gap: 0 14px; }
                .list-header { padding: 0 16px 6px; }
                .list-col-label { font-family: 'Space Mono', monospace; font-size: 0.52rem; font-weight: 700; letter-spacing: 0.1em; text-transform: uppercase; color: ${INK_LITE}; }
                .list-row-wrap { border: 1.5px solid rgba(28,22,16,0.12); margin-bottom: 2px; cursor: pointer; transition: box-shadow 0.12s; background: ${PAPER_LT}; }
                .list-row-wrap:hover { box-shadow: 3px 3px 0 ${INK}; }
                .list-row { padding: 8px 16px; }
                @media (max-width: 640px) {
                  .list-table { grid-template-columns: 48px 1fr 100px; }
                  .list-col-loc, .list-col-terms, .list-col-cat, .list-col-type, .list-col-desc { display: none; }
                }
              `}</style>

              {/* Header */}
              <div className="list-header">
                <div className="list-table">
                  <div />
                  <div className="list-col-label">Item</div>
                  <div className="list-col-label list-col-cat">Category</div>
                  <div className="list-col-label list-col-loc">Location</div>
                  <div className="list-col-label list-col-desc">Description</div>
                  <div className="list-col-label">Owner</div>
                  <div className="list-col-label list-col-terms">Terms</div>
                  <div className="list-col-label list-col-type">Available To</div>
                </div>
              </div>

              {filteredItems.map((item) => {
                const emoji       = CATEGORY_EMOJI[item.category] || '📦';
                const hasImg      = Array.isArray(item.image_urls) && item.image_urls.length > 0;
                const isKeep      = item.availability_status === 'Available to Keep';
                const owner       = item.profiles?.preferred_name || item.profiles?.username || 'Member';
                const location    = item.locations ? [item.locations.city, item.locations.state].filter(Boolean).join(', ') : null;
                const description = item.description?.trim() || null;
                const terms       = !isKeep && item.return_terms?.trim() ? item.return_terms.trim() : null;
                return (
                  <div
                    key={item.id}
                    className="list-row-wrap"
                    onClick={() => handleOpenItem(item)}
                  >
                    <div className="list-table list-row">
                      {/* Thumbnail */}
                      <div style={{ width: '48px', height: '48px', backgroundColor: PAPER_DK, display: 'flex', alignItems: 'center', justifyContent: 'center', overflow: 'hidden' }}>
                        {hasImg
                          ? <img src={item.image_urls[0]} alt={item.item_name} style={{ width: '100%', height: '100%', objectFit: 'contain' }} />
                          : <span style={{ fontSize: '1.4rem' }}>{emoji}</span>
                        }
                      </div>
                      {/* Item name */}
                      <div style={{ minWidth: 0, overflow: 'hidden', whiteSpace: 'nowrap' as const }}>
                        <span style={{ fontFamily: "'Arvo', serif", fontSize: '0.8rem', fontWeight: 700, color: INK }}>{item.item_name}</span>
                      </div>
                      {/* Category */}
                      <div className="list-col-cat">
                        {item.category && (
                          <span style={{ fontFamily: "'Space Mono', monospace", fontSize: '0.5rem', fontWeight: 700, letterSpacing: '0.06em', textTransform: 'uppercase' as const, padding: '2px 6px', border: `1px solid rgba(28,22,16,0.2)`, color: INK_LITE, background: PAPER_DK, whiteSpace: 'nowrap' as const }}>
                            {emoji} {item.category}
                          </span>
                        )}
                      </div>
                      {/* Location */}
                      <div className="list-col-loc" style={{ overflow: 'hidden', whiteSpace: 'nowrap' as const, textOverflow: 'ellipsis', fontSize: '0.75rem', color: INK_MID }}>
                        {location || '—'}
                      </div>
                      {/* Description */}
                      <div className="list-col-desc" style={{ overflow: 'hidden', whiteSpace: 'nowrap' as const, textOverflow: 'ellipsis', fontSize: '0.8rem', color: INK_MID }}>
                        {description || '—'}
                      </div>
                      {/* Owner */}
                      <div style={{ overflow: 'hidden', whiteSpace: 'nowrap' as const, textOverflow: 'ellipsis', fontSize: '0.75rem', color: INK_MID }}>
                        {owner}
                      </div>
                      {/* Terms */}
                      <div className="list-col-terms" style={{ overflow: 'hidden', whiteSpace: 'nowrap' as const, textOverflow: 'ellipsis', fontFamily: "'Space Mono', monospace", fontSize: '0.5rem', color: INK_MID, letterSpacing: '0.04em' }}>
                        {terms || '—'}
                      </div>
                      {/* Available To (Borrow / Keep) */}
                      <div className="list-col-type">
                        <span style={{ fontFamily: "'Space Mono', monospace", fontSize: '0.52rem', fontWeight: 700, letterSpacing: '0.06em', textTransform: 'uppercase' as const, padding: '3px 8px', border: `1px solid ${isKeep ? RUST : TEAL}`, color: isKeep ? RUST : TEAL, background: isKeep ? RUST_LT : TEAL_LT, whiteSpace: 'nowrap' as const }}>
                          {isKeep ? 'Keep' : 'Borrow'}
                        </span>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      )}

      {/* ── CARDS GRID ─────────────────────────────────────────────────── */}
      {(viewMode === 'cards' || loading) && (
      <div className="rsp-px" style={{ maxWidth: '1280px', margin: '0 auto', paddingTop: '20px', paddingBottom: '64px' }}>
        <style>{`
          .fi-grid {
            display: grid;
            grid-template-columns: repeat(auto-fill, minmax(200px, 1fr));
            gap: 24px;
          }
          @media (min-width: 1100px) { .fi-grid { grid-template-columns: repeat(5, 1fr); } }
          @media (min-width:  860px) and (max-width: 1099px) { .fi-grid { grid-template-columns: repeat(4, 1fr); } }
          @media (min-width:  600px) and (max-width:  859px) { .fi-grid { grid-template-columns: repeat(3, 1fr); } }
          @media (max-width: 599px)  { .fi-grid { grid-template-columns: repeat(2, 1fr); } }
          .item-card { transition: transform 0.12s, box-shadow 0.12s; cursor: pointer; }
          .item-card:hover { transform: translate(-2px, -2px); box-shadow: 5px 5px 0 ${INK} !important; }
        `}</style>

        {loading ? (
          <div className="fi-grid">
            {[...Array(10)].map((_, i) => (
              <div key={i} style={{ backgroundColor: PAPER_DK, aspectRatio: '3/4', border: `1.5px solid rgba(28,22,16,0.1)` }} />
            ))}
          </div>
        ) : filteredItems.length === 0 ? (
          <div style={{ textAlign: 'center', padding: '80px 20px' }}>
            <div style={{ fontSize: '3.5rem', marginBottom: '16px' }}>🏜️</div>
            <h3 style={{ fontFamily: "'Arvo', serif", fontSize: '1.3rem', fontWeight: 700, fontStyle: 'italic', marginBottom: '8px', color: INK }}>Nothing out there right now.</h3>
            <p style={{ color: INK_MID, fontSize: '0.9rem' }}>Try adjusting your filters, or check back after someone lists something.</p>
          </div>
        ) : (
          <div className="fi-grid">
            {filteredItems.map((item, i) => {
              const emoji    = CATEGORY_EMOJI[item.category] || '📦';
              const hasImg   = Array.isArray(item.image_urls) && item.image_urls.length > 0;
              const isKeep   = item.availability_status === 'Available to Keep';
              const owner    = item.profiles?.preferred_name || item.profiles?.username || 'Member';
              const location = item.locations ? [item.locations.city, item.locations.state].filter(Boolean).join(', ') : null;
              const rot      = CARD_ROTS[i % CARD_ROTS.length];

              return (
                <div
                  key={item.id}
                  className="item-card"
                  onClick={() => handleOpenItem(item)}
                  style={{
                    backgroundColor: PAPER_LT,
                    border: `1.5px solid rgba(28,22,16,0.15)`,
                    boxShadow: `3px 3px 0 rgba(28,22,16,0.12)`,
                  }}
                >
                  {/* Polaroid photo area */}
                  <div style={{ backgroundColor: PAPER_LT, padding: '8px 8px 28px', borderBottom: `1.5px solid rgba(28,22,16,0.1)`, position: 'relative', transform: `rotate(${rot}deg)` }}>
                    {/* Photo or emoji */}
                    <div style={{ width: '100%', aspectRatio: '1/1', backgroundColor: PAPER_DK, display: 'flex', alignItems: 'center', justifyContent: 'center', overflow: 'hidden' }}>
                      {hasImg
                        ? <img src={item.image_urls[0]} alt={item.item_name} style={{ width: '100%', height: '100%', objectFit: 'contain' }} />
                        : <span style={{ fontSize: '3rem' }}>{emoji}</span>
                      }
                    </div>

                    {/* Caption below photo */}
                    <span style={{ display: 'block', textAlign: 'center', fontFamily: "'Arvo', serif", fontSize: '0.65rem', fontStyle: 'italic', color: INK_MID, marginTop: '6px', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                      {item.item_name}
                    </span>
                  </div>

                  {/* Card body */}
                  <div style={{ padding: '12px 14px 14px' }}>
                    <div style={{ fontFamily: "'Arvo', serif", fontSize: '0.95rem', fontWeight: 700, color: INK, marginBottom: '4px', lineHeight: 1.2 }}>
                      {item.item_name}
                    </div>
                    <div style={{ fontSize: '0.75rem', color: INK_LITE, display: 'flex', alignItems: 'center', gap: '5px', marginBottom: '8px' }}>
                      <span style={{ width: '6px', height: '6px', borderRadius: '50%', backgroundColor: TEAL, display: 'inline-block', flexShrink: 0 }} />
                      <span>{owner}{location ? ` · ${location}` : ''}</span>
                    </div>
                    <div style={{ display: 'flex', gap: '4px', flexWrap: 'wrap' as const }}>
                      <span style={{ fontFamily: "'Space Mono', monospace", fontSize: '0.52rem', fontWeight: 700, letterSpacing: '0.06em', textTransform: 'uppercase' as const, padding: '2px 7px', border: `1px solid ${isKeep ? RUST : TEAL}`, color: isKeep ? RUST : TEAL, background: isKeep ? RUST_LT : TEAL_LT }}>
                        {isKeep ? 'Keep' : 'Borrow'}
                      </span>
                      {item.category && (
                        <span style={{ fontFamily: "'Space Mono', monospace", fontSize: '0.52rem', fontWeight: 700, letterSpacing: '0.06em', textTransform: 'uppercase' as const, padding: '2px 7px', border: `1px solid rgba(28,22,16,0.15)`, color: INK_LITE }}>
                          {item.category.split(' ')[0]}
                        </span>
                      )}
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>
      )}

      {/* ── ITEM DETAIL MODAL (centered) ───────────────────────────────── */}
      {selectedItem && (
        <div
          onClick={handleCloseModal}
          style={{
            position: 'fixed', inset: 0, backgroundColor: 'rgba(28,22,16,0.6)',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            zIndex: 1000, padding: '20px', backdropFilter: 'blur(3px)',
          }}
        >
          <div
            onClick={e => e.stopPropagation()}
            style={{
              backgroundColor: PAPER_LT, padding: '0',
              width: '100%', maxWidth: '520px', position: 'relative',
              border: `2px solid ${INK}`, boxShadow: `6px 6px 0 ${INK}`,
              maxHeight: '92vh', overflowY: 'auto' as const,
            }}
          >
            {/* Close */}
            <button
              onClick={handleCloseModal}
              style={{
                position: 'sticky', top: 0, float: 'right', zIndex: 10,
                background: PAPER_DK, border: 'none', cursor: 'pointer',
                padding: '10px 14px', color: INK_LITE,
                borderBottom: `1px solid rgba(28,22,16,0.12)`,
                borderLeft: `1px solid rgba(28,22,16,0.12)`,
                fontFamily: "'Space Mono', monospace", fontSize: '0.6rem',
                fontWeight: 700, letterSpacing: '0.06em',
                display: 'flex', alignItems: 'center', gap: '5px',
              }}
            >
              <X size={12} /> CLOSE
            </button>

            {/* Photo */}
            <div style={{ width: '100%', aspectRatio: '4/3', overflow: 'hidden', borderBottom: `1.5px solid rgba(28,22,16,0.12)` }}>
              {Array.isArray(selectedItem.image_urls) && selectedItem.image_urls.length > 0
                ? <ImageSlider images={selectedItem.image_urls} />
                : <div style={{ width: '100%', height: '100%', display: 'flex', alignItems: 'center', justifyContent: 'center', backgroundColor: PAPER_DK, fontSize: '5rem' }}>
                    {CATEGORY_EMOJI[selectedItem.category] || '📦'}
                  </div>
              }
            </div>

            <div style={{ padding: '24px 28px 28px' }}>
              {/* Title + meta */}
              <h2 style={{ fontFamily: "'Arvo', serif", fontSize: '1.5rem', fontWeight: 900, color: INK, margin: '0 0 6px', lineHeight: 1.1 }}>
                {selectedItem.item_name}
              </h2>
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '16px', fontSize: '0.82rem', color: INK_MID }}>
                <span style={{ width: '8px', height: '8px', borderRadius: '50%', backgroundColor: TEAL, display: 'inline-block' }} />
                {selectedItem.profiles?.username ? (
                  <Link href={`/profile/${selectedItem.profiles.username}`} onClick={e => e.stopPropagation()} style={{ color: TEAL, textDecoration: 'none', fontWeight: 600 }}>
                    {selectedItem.profiles?.preferred_name || selectedItem.profiles.username}
                  </Link>
                ) : (selectedItem.profiles?.preferred_name || 'Member')}
                {selectedItem.locations && (
                  <><span style={{ color: INK_LITE }}>·</span>
                  <span style={{ display: 'flex', alignItems: 'center', gap: '3px', color: INK_LITE }}>
                    <MapPin size={12} />
                    {[selectedItem.locations.city, selectedItem.locations.state].filter(Boolean).join(', ')}
                  </span></>
                )}
              </div>

              <hr style={{ border: 'none', borderTop: `1px solid rgba(28,22,16,0.1)`, margin: '0 0 16px' }} />

              {/* Description */}
              {selectedItem.description && (
                <div style={{ marginBottom: '16px' }}>
                  <div style={{ fontFamily: "'Space Mono', monospace", fontSize: '0.58rem', fontWeight: 700, letterSpacing: '0.1em', textTransform: 'uppercase' as const, color: INK_LITE, marginBottom: '6px' }}>Description</div>
                  <p style={{ fontSize: '0.88rem', color: INK_MID, lineHeight: 1.6, margin: 0 }}>{selectedItem.description}</p>
                </div>
              )}

              {/* Terms */}
              {selectedItem.availability_status !== 'Available to Keep' && (selectedItem.return_by || selectedItem.return_terms || selectedItem.damage_price || selectedItem.loss_price) && (
                <div style={{ marginBottom: '16px', padding: '14px', backgroundColor: PAPER_DK, border: `1px solid rgba(28,22,16,0.12)` }}>
                  <div style={{ fontFamily: "'Space Mono', monospace", fontSize: '0.58rem', fontWeight: 700, letterSpacing: '0.1em', textTransform: 'uppercase' as const, color: INK_LITE, marginBottom: '10px' }}>Borrowing Terms</div>
                  {selectedItem.return_by && (
                    <div style={{ fontSize: '0.84rem', color: INK_MID, marginBottom: '5px' }}>Return by: <strong style={{ color: INK }}>{new Date(selectedItem.return_by).toLocaleDateString()}</strong></div>
                  )}
                  {selectedItem.damage_price && (
                    <div style={{ fontSize: '0.84rem', color: INK_MID, marginBottom: '5px' }}>If damaged: <strong style={{ color: INK }}>${selectedItem.damage_price}</strong></div>
                  )}
                  {selectedItem.loss_price && (
                    <div style={{ fontSize: '0.84rem', color: INK_MID, marginBottom: '5px' }}>If not returned: <strong style={{ color: INK }}>${selectedItem.loss_price}</strong></div>
                  )}
                  {selectedItem.return_terms && (
                    <div style={{ fontSize: '0.84rem', color: INK_MID, fontStyle: 'italic', borderTop: `1px solid rgba(28,22,16,0.08)`, marginTop: '8px', paddingTop: '8px' }}>
                      "{selectedItem.return_terms}"
                    </div>
                  )}
                </div>
              )}

              {/* CTA */}
              {userId ? (
                <button
                  onClick={() => setShowRequestForm(true)}
                  style={{
                    width: '100%', padding: '14px',
                    backgroundColor: TEAL, color: '#fff',
                    border: `2px solid ${INK}`, boxShadow: `3px 3px 0 ${INK}`,
                    fontWeight: 700, fontSize: '0.95rem', cursor: 'pointer',
                    fontFamily: 'Outfit, sans-serif', transition: 'transform 0.1s, box-shadow 0.1s',
                  }}
                >
                  Request to {selectedItem.availability_status === 'Available to Keep' ? 'Keep' : 'Borrow'} →
                </button>
              ) : (
                <a
                  href="/login"
                  style={{
                    display: 'block', width: '100%', padding: '14px', textAlign: 'center' as const,
                    backgroundColor: TEAL, color: '#fff',
                    border: `2px solid ${INK}`, boxShadow: `3px 3px 0 ${INK}`,
                    fontWeight: 700, fontSize: '0.95rem', textDecoration: 'none',
                    fontFamily: 'Outfit, sans-serif',
                  }}
                >
                  Log In to Request →
                </a>
              )}

              <ShareButton itemId={selectedItem.id} itemName={selectedItem.item_name} />
            </div>
          </div>
        </div>
      )}

      {/* Request message form */}
      {showRequestForm && selectedItem && (
        <RequestModal item={selectedItem} onClose={() => setShowRequestForm(false)} />
      )}
    </div>
  );
}
