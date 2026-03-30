'use client';

import { useState, useEffect } from 'react';
import { supabase } from '@/lib/supabaseClient';
import ImageSlider from '@/components/ImageSlider';
import { Search, LayoutGrid, List, MapPin, User, Package, Map as MapIcon, X } from 'lucide-react';
import Link from 'next/link';
import RequestModal from '@/components/RequestModal';

export default function FindItemsPage() {
  const [items, setItems] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [zipQuery, setZipQuery] = useState('');
  const [viewMode, setViewMode] = useState<'grid' | 'list' | 'map'>('grid');
  
  // Multi-select states
  const [categoryFilters, setCategoryFilters] = useState<string[]>(['All']);
  const [availabilityFilters, setAvailabilityFilters] = useState<string[]>(['Keep', 'Borrow']);

  // Relationship filter states
  const [userId, setUserId] = useState<string | null>(null);
  const [relationshipFilters, setRelationshipFilters] = useState<string[]>(['Everyone']);
  const [followingIds, setFollowingIds] = useState<string[]>([]);
  const [followerIds, setFollowerIds] = useState<string[]>([]);
  const [campMateIds, setCampMateIds] = useState<string[]>([]);
  
  // Modal States
  const [selectedItem, setSelectedItem] = useState<any>(null);
  const [showRequestForm, setShowRequestForm] = useState(false);

  const categories = [
    'All', 'Bikes & Transport', 'Clothing & Fun', 'Kitchen & Water', 
    'Power & Lighting', 'Safety & First Aid', 'Shelter & Shade', 
    'Tools & Hardware', 'Miscellaneous'
  ];

  useEffect(() => {
    fetchItems();
    fetchRelationships();
  }, []);

  // URL Sync Logic: Handles refresh and browser back/forward buttons
  useEffect(() => {
    const syncModalWithUrl = () => {
      const pathParts = window.location.pathname.split('/');
      const idFromUrl = pathParts[pathParts.length - 1];
      
      if (idFromUrl && idFromUrl !== 'find-items' && items.length > 0) {
        const item = items.find(i => i.id === idFromUrl);
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
      const { data: { session } } = await supabase.auth.getSession()
      if (!session) return
      setUserId(session.user.id)

      const [followingRes, followersRes] = await Promise.all([
        supabase.from('user_follows').select('following_id').eq('follower_id', session.user.id),
        supabase.from('user_follows').select('follower_id').eq('following_id', session.user.id),
      ])

      setFollowingIds((followingRes.data || []).map((r: any) => r.following_id))
      setFollowerIds((followersRes.data || []).map((r: any) => r.follower_id))

      const { data: myAffiliations } = await supabase
        .from('user_camp_affiliations')
        .select('camp_id')
        .eq('user_id', session.user.id)
      const myCampIds = (myAffiliations || []).map((r: any) => r.camp_id).filter(Boolean)
      if (myCampIds.length === 0) {
        setCampMateIds([])
      } else {
        const { data: campMembers } = await supabase
          .from('user_camp_affiliations')
          .select('user_id')
          .in('camp_id', myCampIds)
          .neq('user_id', session.user.id)
        const unique = [...new Set((campMembers || []).map((r: any) => r.user_id))]
        setCampMateIds(unique)
      }
    } catch (err: any) {
      console.error('fetchRelationships error:', err.message)
    }
  }

  async function fetchItems() {
    setLoading(true);
    try {
      const { data: gear, error: gearError } = await supabase.from('gear_items').select('*').eq('owner_deleted', false);
      if (gearError) throw gearError;

      const userIds = [...new Set(gear.map(i => i.user_id))];
      const locationIds = [...new Set(gear.map(i => i.location_id).filter(id => id))];

      const [profilesRes, locationsRes] = await Promise.all([
        supabase.from('profiles').select('id, preferred_name, contact_email, username').in('id', userIds),
        supabase.from('locations').select('id, city, state, zip_code').in('id', locationIds)
      ]);

      const enrichedItems = gear.map(item => ({
        ...item,
        profiles: profilesRes.data?.find(p => p.id === item.user_id),
        locations: locationsRes.data?.find(l => l.id === item.location_id)
      }));

      setItems(enrichedItems);
    } catch (err: any) {
      console.error('Fetch error:', err.message);
    } finally {
      setLoading(false);
    }
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
    if (cat === 'All') {
      setCategoryFilters(['All']);
    } else {
      setCategoryFilters(prev => {
        const newFilters = prev.filter(f => f !== 'All');
        if (newFilters.includes(cat)) {
          const filtered = newFilters.filter(f => f !== cat);
          return filtered.length === 0 ? ['All'] : filtered;
        }
        return [...newFilters, cat];
      });
    }
  };

  const toggleAvailability = (mode: string) => {
    setAvailabilityFilters(prev => {
      if (prev.includes(mode)) {
        return prev.length === 1 ? prev : prev.filter(m => m !== mode);
      }
      return [...prev, mode];
    });
  };

  const toggleRelationship = (option: string) => {
    if (option === 'Everyone') {
      setRelationshipFilters(['Everyone']);
    } else {
      setRelationshipFilters(prev => {
        const without = prev.filter(f => f !== 'Everyone');
        if (without.includes(option)) {
          const filtered = without.filter(f => f !== option);
          return filtered.length === 0 ? ['Everyone'] : filtered;
        }
        return [...without, option];
      });
    }
  };

  const filteredItems = items.filter(item => {
    const isAvailable = item.availability_status !== 'Not Available';
    const matchesSearch = item.item_name?.toLowerCase().includes(searchQuery.toLowerCase());
    const matchesZip = !zipQuery || item.locations?.zip_code?.includes(zipQuery);
    const matchesCategory = categoryFilters.includes('All') || categoryFilters.includes(item.category);
    const itemStatus = item.availability_status === 'Available to Keep' ? 'Keep' : 'Borrow';
    const matchesAvailability = availabilityFilters.includes(itemStatus);
    const matchesRelationship = (() => {
      if (relationshipFilters.includes('Everyone')) return true;
      if (relationshipFilters.includes('Following') && followingIds.includes(item.user_id)) return true;
      if (relationshipFilters.includes('Followers') && followerIds.includes(item.user_id)) return true;
      if (relationshipFilters.includes('My Campmates') && campMateIds.includes(item.user_id)) return true;
      return false;
    })();
    return isAvailable && matchesSearch && matchesZip && matchesCategory && matchesAvailability && matchesRelationship;
  });

  return (
    <div style={containerStyle}>
      <style>{`
        .fi-row { border-bottom: 1px solid #eee; padding-bottom: 12px; margin-bottom: 12px; }
        .fi-searches { display: flex; align-items: center; gap: 12px; }
        .fi-kw { display: flex; align-items: center; gap: 8px; }
        .fi-loc { display: flex; align-items: center; gap: 8px; }
        .fi-rel { display: flex; align-items: center; gap: 8px; flex-wrap: wrap; flex: 1; }
        .fi-kw-input { position: relative; flex: 0 1 200px; }
        .fi-loc-input { position: relative; flex: 0 0 120px; min-width: 120px; }
        .fi-cat-row { display: flex; flex-wrap: wrap; gap: 8px; align-items: center; }
        .fi-cat-label { display: none; }
        .fi-bottom-row { display: flex; align-items: center; justify-content: space-between; margin-bottom: 30px; }
        .fi-avail { display: flex; align-items: center; gap: 8px; flex-wrap: wrap; }
        .fi-grid { display: grid; gap: 20px; grid-template-columns: repeat(auto-fill, minmax(260px, 1fr)); }
        .title-break { display: none; }
        @media (min-width: 430px) and (max-width: 1023px) {
          .fi-searches { flex-wrap: wrap; column-gap: 12px; row-gap: 0; }
          .fi-kw { flex: 1; }
          .fi-loc { flex: 1; }
          .fi-kw-input { flex: 1; }
          .fi-loc-input { flex: 1; min-width: 0; }
          .fi-grid { grid-template-columns: repeat(3, 1fr); overflow: hidden; }
          .fi-grid > * { min-width: 0; box-sizing: border-box; }
        }
        @media (min-width: 768px) and (max-width: 1023px) {
          .fi-rel { flex: 0 0 100%; border-top: 1px solid #eee; padding-top: 10px; margin-top: 8px; }
        }
        @media (max-width: 767px) {
          .fi-rel { flex: none; width: 100%; }
          .fi-kw-input { flex: 1; }
          .fi-loc-input { flex: 1; min-width: 0; }
          .fi-row { margin-bottom: 8px; padding-bottom: 8px; }
        }
        @media (max-width: 429px) {
          .fi-searches { flex-direction: column; gap: 0; align-items: stretch; }
          .fi-kw { flex: none; width: 100%; border-bottom: 1px solid #eee; padding-bottom: 8px; margin-bottom: 8px; }
          .fi-loc { flex: none; width: 100%; border-bottom: 1px solid #eee; padding-bottom: 8px; margin-bottom: 8px; }
          .fi-avail { flex-wrap: nowrap; }
          .fi-avail button { padding: 4px 10px; font-size: 11px; }
          .fi-cat-row button { padding: 4px 10px; font-size: 11px; }
          .fi-cat-label { display: block; }
          .fi-grid { grid-template-columns: repeat(2, 1fr); overflow: hidden; }
          .fi-grid > * { min-width: 0; box-sizing: border-box; }
          .title-break { display: block; }
        }
        @media (min-width: 1024px) { .fi-grid { grid-template-columns: repeat(auto-fill, minmax(260px, 1fr)); } }
      `}</style>

      <h1 style={{ fontSize: '28px', fontWeight: 'bold', color: '#2D241E', margin: '0 0 20px 0' }}>
        The Playa Provides<span className="title-break" /><span style={{ textDecoration: 'underline' }}> Items to Borrow or Keep{'\u00a0'}</span>
      </h1>

      {/* ROW 1 (desktop): Keyword | Location | Relationship chips */}
      {/* ROW 1+2 (landscape): Keyword+Location / Relationship chips */}
      {/* ROW 1+2+3 (portrait): Keyword / Location / Relationship chips */}
      <div className="fi-row fi-searches">
        <div className="fi-kw">
          <span style={filterLabelStyle}>Search by Keyword:</span>
          <div className="fi-kw-input">
            <Search size={18} style={searchIconStyle} />
            <input
              type="text"
              placeholder="Item name or type..."
              style={searchInputStyle}
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
            />
          </div>
        </div>
        <div className="fi-loc">
          <span style={filterLabelStyle}>Search by Location:</span>
          <div className="fi-loc-input">
            <MapPin size={18} style={searchIconStyle} />
            <input
              type="text"
              placeholder="Zip"
              style={searchInputStyle}
              value={zipQuery}
              onChange={(e) => setZipQuery(e.target.value)}
            />
          </div>
        </div>
        <div className="fi-rel">
          <span style={filterLabelStyle}>Show items from:</span>
          {['Everyone', 'Following', 'Followers', 'My Campmates'].map((option) => {
            const isActive = relationshipFilters.includes(option);
            return (
              <button
                key={option}
                onClick={() => toggleRelationship(option)}
                style={{
                  ...chipStyle,
                  backgroundColor: isActive ? '#3ABFD4' : '#fff',
                  color: isActive ? '#000' : '#555',
                  borderColor: isActive ? '#3ABFD4' : '#ccc',
                }}
              >
                {option}
              </button>
            );
          })}
        </div>
      </div>

      {/* ROW 2 (desktop) / ROW 4 (landscape+portrait): Category chips */}
      <div className="fi-row fi-cat-row">
        <span className="fi-cat-label" style={filterLabelStyle}>Categories:</span>
        {categories.map((cat) => {
          const isActive = categoryFilters.includes(cat);
          return (
            <button
              key={cat}
              onClick={() => toggleCategory(cat)}
              style={{
                ...chipStyle,
                backgroundColor: isActive ? '#3ABFD4' : '#f5f5f5',
                color: isActive ? '#000' : '#333',
                borderColor: isActive ? '#3ABFD4' : '#ddd',
              }}
            >
              {cat}
              {isActive && cat !== 'All' && <X size={12} style={{ marginLeft: '6px' }} />}
            </button>
          );
        })}
      </div>

      {/* ROW 3 (desktop) / ROW 5 (portrait) / ROW 4 (landscape): Available to: chips | GLM toggle */}
      <div className="fi-bottom-row">
        <div className="fi-avail">
          <span style={filterLabelStyle}>Available to:</span>
          {[{ value: 'Borrow', label: 'Borrow' }, { value: 'Keep', label: 'Keep' }].map(({ value, label }) => {
            const isActive = availabilityFilters.includes(value);
            return (
              <button
                key={value}
                onClick={() => toggleAvailability(value)}
                style={{
                  ...chipStyle,
                  backgroundColor: isActive ? '#3ABFD4' : '#fff',
                  color: isActive ? '#000' : '#555',
                  borderColor: isActive ? '#3ABFD4' : '#ccc',
                }}
              >
                {label}
              </button>
            );
          })}
        </div>
        <div style={{ ...toggleGroupStyle, minWidth: '108px' }}>
          <button onClick={() => setViewMode('grid')} style={{ ...toggleButtonStyle, backgroundColor: viewMode === 'grid' ? '#eee' : 'transparent' }}>
            <LayoutGrid size={20} color={viewMode === 'grid' ? '#000' : '#666'} />
          </button>
          <button onClick={() => setViewMode('list')} style={{ ...toggleButtonStyle, backgroundColor: viewMode === 'list' ? '#eee' : 'transparent' }}>
            <List size={20} color={viewMode === 'list' ? '#000' : '#666'} />
          </button>
          <button onClick={() => setViewMode('map')} style={{ ...toggleButtonStyle, backgroundColor: viewMode === 'map' ? '#eee' : 'transparent' }}>
            <MapIcon size={20} color={viewMode === 'map' ? '#000' : '#666'} />
          </button>
        </div>
      </div>

      {/* CONTENT GRID */}
      {loading ? (
        <div className="fi-grid" style={gridStyle}>{[...Array(6)].map((_, i) => <div key={i} style={skeletonStyle} />)}</div>
      ) : viewMode === 'map' ? (
        <div style={{ padding: '60px', textAlign: 'center' as const, backgroundColor: '#f9f9f9', borderRadius: '12px', color: '#aaa' }}>
          <MapIcon size={40} style={{ marginBottom: '12px', opacity: 0.3 }} />
          <p style={{ margin: 0, fontWeight: 'bold' }}>Map view coming soon</p>
        </div>
      ) : (
        <div className={viewMode === 'grid' ? 'fi-grid' : ''} style={viewMode === 'grid' ? undefined : listContainerStyle}>
          {viewMode === 'list' && filteredItems.length > 0 && (
            <div style={listHeaderStyle}>
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
          {filteredItems.map(item => (
            <div key={item.id} onClick={() => handleOpenItem(item)} style={{ cursor: 'pointer' }}>
              {viewMode === 'grid' ? <CardView item={item} /> : <ListView item={item} />}
            </div>
          ))}
        </div>
      )}

      {/* 1. THE ITEM DETAIL POPUP (Stage 1) */}
      {selectedItem && (
        <div style={modalOverlayStyle} onClick={handleCloseModal}>
          <div style={modalContentStyle} onClick={e => e.stopPropagation()}>
            <button onClick={handleCloseModal} style={closeButtonStyle}><X size={24} /></button>
            
            <div style={{ marginBottom: '20px', borderRadius: '12px', overflow: 'hidden', width: '100%', aspectRatio: '1 / 1' }}>
              <ImageSlider images={selectedItem.image_urls} />
            </div>

            <h2 style={{ margin: '0 0 5px 0', color: '#111', fontSize: '24px' }}>{selectedItem.item_name}</h2>
            <p style={categoryLabelStyle}>{selectedItem.category} • {selectedItem.condition}</p>
            
            <div style={{ margin: '20px 0', padding: '15px', backgroundColor: '#f9f9f9', borderRadius: '10px', fontSize: '15px', color: '#444', lineHeight: '1.6' }}>
              {selectedItem.description || "No description provided by the owner."}
            </div>

            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px', padding: '0 5px' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px', color: '#777', fontSize: '14px' }}>
                <MapPin size={16} />
                {[selectedItem.locations?.city, selectedItem.locations?.state].filter(Boolean).join(', ') || 'Location N/A'}
              </div>
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px', color: '#777', fontSize: '14px' }}>
                <User size={16} />
                {selectedItem.profiles?.username ? (
                  <Link href={`/profile/${selectedItem.profiles.username}`} onClick={e => e.stopPropagation()} style={{ color: '#00aacc', textDecoration: 'none', fontWeight: '500' }}>
                    {selectedItem.profiles?.preferred_name || 'Member'}
                  </Link>
                ) : (selectedItem.profiles?.preferred_name || 'Member')}
              </div>
            </div>

            {(selectedItem.pickup_by || selectedItem.return_by || selectedItem.return_terms || selectedItem.damage_price || selectedItem.loss_price) && (
              <div style={{ marginBottom: '20px', padding: '14px', backgroundColor: '#fdf3ec', borderRadius: '12px', fontSize: '13px', border: '1px solid #f0d8c8' }}>
                <div style={{ fontWeight: '700', color: '#C08261', marginBottom: '8px', fontSize: '10px', textTransform: 'uppercase' as const, letterSpacing: '0.08em' }}>Borrowing Terms</div>
                {(selectedItem.pickup_by || selectedItem.return_by) && (
                  <div style={{ display: 'flex', gap: '20px', marginBottom: '6px', color: '#555' }}>
                    {selectedItem.pickup_by && <span>Pick up by: <strong>{new Date(selectedItem.pickup_by).toLocaleDateString()}</strong></span>}
                    {selectedItem.return_by && <span>Return by: <strong>{new Date(selectedItem.return_by).toLocaleDateString()}</strong></span>}
                  </div>
                )}
                {(selectedItem.damage_price || selectedItem.loss_price) && (
                  <div style={{ display: 'flex', gap: '20px', marginBottom: '6px', color: '#555' }}>
                    {selectedItem.damage_price && <span>Damage agreement: <strong>${selectedItem.damage_price}</strong></span>}
                    {selectedItem.loss_price && <span>Loss agreement: <strong>${selectedItem.loss_price}</strong></span>}
                  </div>
                )}
                {selectedItem.return_terms && (
                  <div style={{ color: '#666', fontStyle: 'italic' }}>"{selectedItem.return_terms}"</div>
                )}
              </div>
            )}

            {userId ? (
              <button onClick={() => setShowRequestForm(true)} style={primaryButtonStyle}>
                Request to {selectedItem.availability_status === 'Available to Keep' ? 'Keep' : 'Borrow'}
              </button>
            ) : (
              <a href="/login" style={{ ...primaryButtonStyle, display: 'block', textAlign: 'center' as const, textDecoration: 'none' }}>
                Log In to Request
              </a>
            )}
          </div>
        </div>
      )}

      {/* 2. THE REQUEST MESSAGE FORM (Stage 2) */}
      {showRequestForm && selectedItem && (
        <RequestModal 
          item={selectedItem} 
          onClose={() => setShowRequestForm(false)} 
        />
      )}
    </div>
  );
}

// --- SUB-COMPONENTS ---

function CardView({ item }: { item: any }) {
  const ownerName = item.profiles?.preferred_name || 'Member';
  const locationDisplay = item.locations
    ? [item.locations.city, item.locations.state].filter(Boolean).join(', ')
    : 'N/A';
  const hasTerms = item.return_by || item.return_terms;

  return (
    <div style={cardStyle}>
      <div style={imageWrapperStyle}>
        <div style={{ borderRadius: '8px', overflow: 'hidden', width: '100%', aspectRatio: '1 / 1' }}>
          <ImageSlider images={item.image_urls} />
        </div>
        <div style={badgeStyle}>{item.availability_status === 'Available to Keep' ? 'Keep' : 'Borrow'}</div>
      </div>
      <div style={cardContentStyle}>
        <h3 style={itemTitleStyle}>{item.item_name}</h3>
        <p style={categoryLabelStyle}>{item.category} • {item.condition}</p>
        <div style={metaRowStyle}>
          <span style={metaItemStyle}><MapPin size={12} /> {locationDisplay}</span>
          {item.profiles?.username ? (
            <Link href={`/profile/${item.profiles.username}`} onClick={e => e.stopPropagation()} style={{ ...metaItemStyle, color: '#00aacc', textDecoration: 'none' }}>
              <User size={12} /> {ownerName}
            </Link>
          ) : (
            <span style={metaItemStyle}><User size={12} /> {ownerName}</span>
          )}
        </div>
        {hasTerms && (
          <div style={{ fontSize: '12px', color: '#888', borderTop: '1px solid #f5f5f5', paddingTop: '8px', marginTop: '6px', display: 'flex', gap: '8px', flexWrap: 'wrap' as const }}>
            {item.return_by && <span>Return by {new Date(item.return_by).toLocaleDateString()}</span>}
            {item.return_terms && !item.return_by && <span>Has terms</span>}
          </div>
        )}
      </div>
    </div>
  );
}

function ListView({ item }: { item: any }) {
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
    <div style={listStyle}>
      <div style={listImageStyle}>
        {item.image_urls?.[0]
          ? <img src={item.image_urls[0]} alt="" style={imgCover} />
          : <div style={noImgSmall}><Package size={16} /></div>}
      </div>
      <div style={listColName}>
        <div style={{ fontWeight: '600', color: '#111', fontSize: '14px' }}>{item.item_name}</div>
        <div style={{ fontSize: '10px', color: '#3ABFD4', fontWeight: 'bold', textTransform: 'uppercase' as const, marginTop: '2px' }}>
          {item.availability_status === 'Available to Keep' ? 'Keep' : 'Borrow'}
        </div>
      </div>
      <div style={listColDesc}>{item.description || '—'}</div>
      <div style={listColMeta}>{item.category}</div>
      <div style={listColMeta}><MapPin size={11} style={{ marginRight: '3px', flexShrink: 0 }} />{locationDisplay}</div>
      <div style={listColMeta}>
        {item.profiles?.username ? (
          <Link href={`/profile/${item.profiles.username}`} onClick={e => e.stopPropagation()} style={{ color: '#00aacc', textDecoration: 'none' }}>
            {ownerName}
          </Link>
        ) : ownerName}
      </div>
      <div style={{ ...listColMeta, fontSize: '11px', color: '#888' }}>{termsSummary || '—'}</div>
      <div style={{ color: '#3ABFD4', fontWeight: 'bold', fontSize: '12px', flexShrink: 0 }}>View →</div>
    </div>
  );
}

// --- STYLES ---

const containerStyle: React.CSSProperties = { padding: '20px', maxWidth: '1200px', margin: '0 auto', backgroundColor: '#fff', minHeight: '100vh' };
const topBarStyle: React.CSSProperties = { display: 'flex', gap: '15px', marginBottom: '20px', flexWrap: 'wrap', alignItems: 'center' };
const searchWrapperStyle: React.CSSProperties = { position: 'relative', flex: '0 1 200px' };
const filterLabelStyle: React.CSSProperties = { fontSize: '0.78rem', fontWeight: '600', color: '#555', whiteSpace: 'nowrap' as const };
const searchIconStyle: React.CSSProperties = { position: 'absolute', left: '12px', top: '50%', transform: 'translateY(-50%)', color: '#999' };
const searchInputStyle: React.CSSProperties = { width: '100%', padding: '8px 10px 8px 40px', backgroundColor: '#f9f9f9', border: '1px solid #eee', borderRadius: '8px', color: '#111', outline: 'none', fontSize: '0.82rem', lineHeight: '1.4' };
const toggleGroupStyle: React.CSSProperties = { display: 'flex', backgroundColor: '#f5f5f5', borderRadius: '8px', padding: '4px', border: '1px solid #eee' };
const toggleButtonStyle: React.CSSProperties = { border: 'none', padding: '6px 12px', borderRadius: '6px', cursor: 'pointer', fontSize: '0.8rem', fontWeight: 'bold' };
const filterRowStyle: React.CSSProperties = { marginBottom: '30px' };
const chipContainerStyle: React.CSSProperties = { display: 'flex', gap: '8px', flexWrap: 'wrap' };
const chipStyle: React.CSSProperties = { padding: '6px 14px', borderRadius: '20px', border: '1px solid', fontSize: '13px', cursor: 'pointer', fontWeight: '500', display: 'flex', alignItems: 'center' };
const gridStyle: React.CSSProperties = { display: 'grid', gap: '20px' };
const listContainerStyle: React.CSSProperties = { display: 'flex', flexDirection: 'column', gap: '2px' };
const cardStyle: React.CSSProperties = { backgroundColor: '#fff', border: '1px solid #eee', borderRadius: '12px', boxShadow: '0 2px 8px rgba(0,0,0,0.05)', overflow: 'hidden' };
const imageWrapperStyle: React.CSSProperties = { position: 'relative' as const, width: '100%' };
const badgeStyle: React.CSSProperties = { position: 'absolute', top: '10px', left: '10px', backgroundColor: '#3ABFD4', color: '#000', padding: '3px 8px', borderRadius: '6px', fontSize: '10px', fontWeight: 'bold', zIndex: 5 };
const cardContentStyle: React.CSSProperties = { padding: '15px' };
const itemTitleStyle: React.CSSProperties = { margin: 0, color: '#111', fontSize: '16px', fontWeight: '600' };
const categoryLabelStyle: React.CSSProperties = { color: '#3ABFD4', fontSize: '11px', margin: '4px 0 12px 0', textTransform: 'uppercase', fontWeight: 'bold' };
const metaRowStyle: React.CSSProperties = { display: 'flex', justifyContent: 'space-between', color: '#777', fontSize: '12px', borderTop: '1px solid #f5f5f5', paddingTop: '10px' };
const metaItemStyle: React.CSSProperties = { display: 'flex', alignItems: 'center', gap: '4px' };
const LIST_COLS = '50px 160px 1fr 140px 120px 110px 1fr 70px';
const listHeaderStyle: React.CSSProperties = { display: 'grid', gridTemplateColumns: LIST_COLS, gap: '10px', padding: '8px 12px', fontSize: '10px', fontWeight: '700', color: '#aaa', textTransform: 'uppercase' as const, letterSpacing: '0.06em', borderBottom: '2px solid #eee' };
const listStyle: React.CSSProperties = { display: 'grid', gridTemplateColumns: LIST_COLS, gap: '10px', alignItems: 'center', padding: '10px 12px', backgroundColor: '#fff', borderBottom: '1px solid #f5f5f5' };
const listColName: React.CSSProperties = { overflow: 'hidden' };
const listColDesc: React.CSSProperties = { fontSize: '12px', color: '#666', overflow: 'hidden', display: '-webkit-box', WebkitLineClamp: 2, WebkitBoxOrient: 'vertical' as const };
const listColMeta: React.CSSProperties = { fontSize: '12px', color: '#666', display: 'flex', alignItems: 'center', overflow: 'hidden', whiteSpace: 'nowrap' as const };
const listImageStyle: React.CSSProperties = { width: '50px', height: '50px', borderRadius: '6px', overflow: 'hidden', backgroundColor: '#000', flexShrink: 0 };
const imgCover: React.CSSProperties = { width: '100%', height: '100%', objectFit: 'contain' as const };
const noImgSmall: React.CSSProperties = { display: 'flex', alignItems: 'center', justifyContent: 'center', height: '100%', color: '#ccc' };
const skeletonStyle: React.CSSProperties = { height: '280px', backgroundColor: '#f5f5f5', borderRadius: '12px' };

const modalOverlayStyle: React.CSSProperties = { 
  position: 'fixed', top: 0, left: 0, width: '100%', height: '100%', 
  backgroundColor: 'rgba(0,0,0,0.4)', display: 'flex', justifyContent: 'center', 
  alignItems: 'center', zIndex: 1000, padding: '20px', backdropFilter: 'blur(4px)'
};

const modalContentStyle: React.CSSProperties = { 
  backgroundColor: '#fff', padding: '30px', borderRadius: '24px', 
  width: '100%', maxWidth: '500px', position: 'relative', 
  boxShadow: '0 20px 60px rgba(0,0,0,0.15)', maxHeight: '95vh', overflowY: 'auto' 
};

const closeButtonStyle: React.CSSProperties = {
  position: 'absolute', top: '20px', right: '20px', background: '#f5f5f5',
  border: 'none', cursor: 'pointer', color: '#666', borderRadius: '50%',
  width: '36px', height: '36px', display: 'flex', alignItems: 'center', justifyContent: 'center',
  zIndex: 10,
};

const primaryButtonStyle: React.CSSProperties = {
  width: '100%', padding: '18px', backgroundColor: '#5ECFDF', color: '#000', 
  border: 'none', borderRadius: '14px', fontWeight: 'bold', fontSize: '16px', 
  cursor: 'pointer', boxShadow: 'none'
};