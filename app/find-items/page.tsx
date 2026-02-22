'use client';

import { useState, useEffect } from 'react';
import { supabase } from '@/lib/supabaseClient';
import Link from 'next/link';
import ImageSlider from '@/components/ImageSlider';
import { Search, LayoutGrid, List, MapPin, User, Package, Map as MapIcon, X } from 'lucide-react';
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
  
  // Modal State
  const [selectedItem, setSelectedItem] = useState<any>(null);

  const categories = [
    'All', 'Bikes & Transport', 'Clothing & Fun', 'Kitchen & Water', 
    'Power & Lighting', 'Safety & First Aid', 'Shelter & Shade', 
    'Tools & Hardware', 'Miscellaneous'
  ];

  useEffect(() => {
    fetchItems();
  }, []);

  async function fetchItems() {
    setLoading(true);
    try {
      const { data: gear, error: gearError } = await supabase.from('gear_items').select('*');
      if (gearError) throw gearError;

      const userIds = [...new Set(gear.map(i => i.user_id))];
      const locationIds = [...new Set(gear.map(i => i.location_id).filter(id => id))];

      const [profilesRes, locationsRes] = await Promise.all([
        supabase.from('profiles').select('id, preferred_name, contact_email, username').in('id', userIds),
        supabase.from('locations').select('id, city, zip_code').in('id', locationIds)
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

  // Multi-select Toggle Handlers
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

  const filteredItems = items.filter(item => {
    const isAvailable = item.availability_status !== 'Not Available';
    const matchesSearch = item.item_name?.toLowerCase().includes(searchQuery.toLowerCase());
    const matchesZip = !zipQuery || item.locations?.zip_code?.includes(zipQuery);
    
    // Multi-Category Filter
    const matchesCategory = categoryFilters.includes('All') || categoryFilters.includes(item.category);
    
    // Multi-Availability Filter
    const itemStatus = item.availability_status === 'Available to keep' ? 'Keep' : 'Borrow';
    const matchesAvailability = availabilityFilters.includes(itemStatus);

    return isAvailable && matchesSearch && matchesZip && matchesCategory && matchesAvailability;
  });

  return (
    <div style={containerStyle}>
      {/* HEADER / SEARCH & FILTERS */}
      <div style={topBarStyle}>
        <div style={{ ...searchWrapperStyle, flex: '0 1 300px' }}>
          <Search size={18} style={searchIconStyle} />
          <input
            type="text"
            placeholder="Search gear..."
            style={searchInputStyle}
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
          />
        </div>
        
        <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
          <span style={{ fontSize: '0.9rem', color: '#888', whiteSpace: 'nowrap' }}>Search by distance:</span>
          <div style={{ ...searchWrapperStyle, maxWidth: '130px' }}>
            <MapPin size={18} style={searchIconStyle} />
            <input
              type="text"
              placeholder="Zip Code"
              style={searchInputStyle}
              value={zipQuery}
              onChange={(e) => setZipQuery(e.target.value)}
            />
          </div>
        </div>

        <div style={{ display: 'flex', alignItems: 'center', gap: '12px', marginLeft: '10px' }}>
          <span style={{ fontSize: '0.8rem', color: '#666', textTransform: 'uppercase' }}>Available to:</span>
          <div style={toggleGroupStyle}>
            {['Keep', 'Borrow'].map((mode) => {
              const isActive = availabilityFilters.includes(mode);
              return (
                <button
                  key={mode}
                  onClick={() => toggleAvailability(mode)}
                  style={{
                    ...toggleButtonStyle,
                    padding: '8px 16px',
                    color: isActive ? '#00ccff' : '#666',
                    backgroundColor: isActive ? '#222' : 'transparent',
                    border: isActive ? '1px solid #00ccff22' : 'none'
                  }}
                >
                  {mode}
                </button>
              );
            })}
          </div>
        </div>

        <div style={{ ...toggleGroupStyle, marginLeft: 'auto' }}>
          <button onClick={() => setViewMode('grid')} style={{...toggleButtonStyle, backgroundColor: viewMode === 'grid' ? '#222' : 'transparent'}}>
            <LayoutGrid size={20} color={viewMode === 'grid' ? '#00ccff' : '#666'} />
          </button>
          <button onClick={() => setViewMode('list')} style={{...toggleButtonStyle, backgroundColor: viewMode === 'list' ? '#222' : 'transparent'}}>
            <List size={20} color={viewMode === 'list' ? '#00ccff' : '#666'} />
          </button>
          <button onClick={() => setViewMode('map')} style={{...toggleButtonStyle, backgroundColor: viewMode === 'map' ? '#222' : 'transparent'}}>
            <MapIcon size={20} color={viewMode === 'map' ? '#00ccff' : '#666'} />
          </button>
        </div>
      </div>

      {/* MULTI-SELECT CATEGORY FILTERS */}
      <div style={filterRowStyle}>
        <div style={chipContainerStyle}>
          {categories.map((cat) => {
            const isActive = categoryFilters.includes(cat);
            return (
              <button
                key={cat}
                onClick={() => toggleCategory(cat)}
                style={{
                  ...chipStyle,
                  backgroundColor: isActive ? '#00ccff' : '#111',
                  color: isActive ? '#000' : '#fff',
                  borderColor: isActive ? '#00ccff' : '#333',
                  display: 'flex',
                  alignItems: 'center',
                  gap: '6px'
                }}
              >
                {cat}
                {isActive && cat !== 'All' && <X size={12} />}
              </button>
            );
          })}
        </div>
      </div>

      {/* CONTENT */}
      {loading ? (
        <div style={gridStyle}>{[...Array(6)].map((_, i) => <div key={i} style={skeletonStyle} />)}</div>
      ) : (
        <>
          {viewMode === 'map' ? (
            <div style={mapPlaceholderStyle}>Map View Integration Coming Soon</div>
          ) : (
            <div style={viewMode === 'grid' ? gridStyle : listContainerStyle}>
              {filteredItems.map(item => (
                <div key={item.id} style={{ position: 'relative' }}>
                   <Link href={`/find-items/${item.id}`} scroll={false} style={{ textDecoration: 'none' }}>
                    {viewMode === 'grid' ? 
                      <CardView item={item} onOpenRequest={() => setSelectedItem(item)} /> : 
                      <ListView item={item} onOpenRequest={() => setSelectedItem(item)} />
                    }
                  </Link>
                </div>
              ))}
            </div>
          )}
        </>
      )}

      {/* REQUEST MODAL */}
      {selectedItem && (
        <RequestModal 
          item={selectedItem} 
          onClose={() => setSelectedItem(null)} 
        />
      )}
    </div>
  );
}

function CardView({ item, onOpenRequest }: { item: any, onOpenRequest: () => void }) {
  const ownerName = item.profiles?.preferred_name || 'Member';
  const locationDisplay = item.locations ? `${item.locations.city} (${item.locations.zip_code})` : 'Location N/A';

  return (
    <div style={cardStyle}>
      <div style={imageWrapperStyle}>
        <ImageSlider images={item.image_urls} />
        <div style={badgeStyle}>{item.availability_status}</div>
      </div>
      <div style={cardContentStyle}>
        <h3 style={itemTitleStyle}>{item.item_name}</h3>
        <p style={categoryLabelStyle}>{item.category} • {item.condition}</p>
        <div style={metaRowStyle}>
          <span style={metaItemStyle}><MapPin size={12} /> {locationDisplay}</span>
          <span style={metaItemStyle}><User size={12} /> {ownerName}</span>
        </div>
        <button 
          onClick={(e) => { e.preventDefault(); onOpenRequest(); }} 
          style={smallRequestButtonStyle}
        >
          Request
        </button>
      </div>
    </div>
  );
}

function ListView({ item, onOpenRequest }: { item: any, onOpenRequest: () => void }) {
  const ownerName = item.profiles?.preferred_name || 'Member';
  const locationDisplay = item.locations ? `${item.locations.city} (${item.locations.zip_code})` : 'Location N/A';

  return (
    <div style={listStyle}>
      <div style={listImageStyle}>
        {item.image_urls?.[0] ? <img src={item.image_urls[0]} alt="" style={imgCover} /> : <div style={noImgSmall}><Package size={16} /></div>}
      </div>
      <div style={{ flex: 1 }}>
        <h3 style={{ margin: 0, color: '#fff', fontSize: '16px' }}>{item.item_name}</h3>
        <p style={{ margin: '4px 0 0', color: '#aaa', fontSize: '12px' }}>
          {item.category} • {locationDisplay} • Owned by {ownerName}
        </p>
      </div>
      <button 
        onClick={(e) => { e.preventDefault(); onOpenRequest(); }} 
        style={{ ...smallRequestButtonStyle, width: 'auto', padding: '6px 15px', marginTop: 0 }}
      >
        Request
      </button>
    </div>
  );
}

// --- STYLES ---
const containerStyle: React.CSSProperties = { padding: '20px', maxWidth: '1200px', margin: '0 auto' };
const topBarStyle: React.CSSProperties = { display: 'flex', gap: '15px', marginBottom: '20px', flexWrap: 'wrap', alignItems: 'center' };
const searchWrapperStyle: React.CSSProperties = { position: 'relative', flex: 1, minWidth: '200px' };
const searchIconStyle: React.CSSProperties = { position: 'absolute', left: '12px', top: '50%', transform: 'translateY(-50%)', color: '#666' };
const searchInputStyle: React.CSSProperties = { width: '100%', padding: '12px 40px', backgroundColor: '#111', border: '1px solid #222', borderRadius: '10px', color: '#fff', outline: 'none' };
const toggleGroupStyle: React.CSSProperties = { display: 'flex', backgroundColor: '#111', borderRadius: '10px', padding: '4px', border: '1px solid #222' };
const toggleButtonStyle: React.CSSProperties = { border: 'none', padding: '8px', borderRadius: '6px', cursor: 'pointer', display: 'flex', alignItems: 'center', fontSize: '0.8rem', fontWeight: 'bold' };
const filterRowStyle: React.CSSProperties = { display: 'flex', justifyContent: 'space-between', marginBottom: '30px' };
const chipContainerStyle: React.CSSProperties = { display: 'flex', gap: '8px', flexWrap: 'wrap' };
const chipStyle: React.CSSProperties = { padding: '8px 16px', borderRadius: '20px', border: '1px solid', fontSize: '13px', cursor: 'pointer', fontWeight: '500' };
const gridStyle: React.CSSProperties = { display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(280px, 1fr))', gap: '20px' };
const listContainerStyle: React.CSSProperties = { display: 'flex', flexDirection: 'column', gap: '12px' };
const cardStyle: React.CSSProperties = { backgroundColor: '#0a0a0a', border: '1px solid #222', borderRadius: '12px', overflow: 'hidden' };
const imageWrapperStyle: React.CSSProperties = { height: '200px', position: 'relative' };
const badgeStyle: React.CSSProperties = { position: 'absolute', top: '10px', left: '10px', backgroundColor: '#00ccff', color: '#000', padding: '4px 10px', borderRadius: '12px', fontSize: '10px', fontWeight: 'bold', zIndex: 5 };
const cardContentStyle: React.CSSProperties = { padding: '15px' };
const itemTitleStyle: React.CSSProperties = { margin: 0, color: '#fff', fontSize: '16px', fontWeight: '600' };
const categoryLabelStyle: React.CSSProperties = { color: '#00ccff', fontSize: '12px', margin: '4px 0 12px 0', textTransform: 'uppercase' };
const metaRowStyle: React.CSSProperties = { display: 'flex', justifyContent: 'space-between', color: '#fff', fontSize: '12px', borderTop: '1px solid #1a1a1a', paddingTop: '12px' };
const metaItemStyle: React.CSSProperties = { display: 'flex', alignItems: 'center', gap: '4px' };
const listStyle: React.CSSProperties = { display: 'flex', alignItems: 'center', gap: '15px', padding: '12px', backgroundColor: '#111', border: '1px solid #222', borderRadius: '10px' };
const listImageStyle: React.CSSProperties = { width: '50px', height: '50px', borderRadius: '6px', overflow: 'hidden' };
const imgCover: React.CSSProperties = { width: '100%', height: '100%', objectFit: 'cover' };
const noImgSmall: React.CSSProperties = { display: 'flex', alignItems: 'center', justifyContent: 'center', height: '100%', backgroundColor: '#222', color: '#444' };
const skeletonStyle: React.CSSProperties = { height: '300px', backgroundColor: '#111', borderRadius: '12px' };
const mapPlaceholderStyle: React.CSSProperties = { height: '400px', backgroundColor: '#111', borderRadius: '12px', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#666', border: '1px dashed #333' };

// Modal Styles
const modalOverlayStyle: React.CSSProperties = { position: 'fixed', top: 0, left: 0, width: '100%', height: '100%', backgroundColor: 'rgba(0,0,0,0.85)', display: 'flex', justifyContent: 'center', alignItems: 'center', zIndex: 1000 };
const modalContentStyle: React.CSSProperties = { backgroundColor: '#111', padding: '30px', borderRadius: '20px', width: '450px', border: '1px solid #333', color: 'white' };
const modalInputStyle: React.CSSProperties = { width: '100%', height: '120px', backgroundColor: '#000', color: '#fff', border: '1px solid #333', borderRadius: '10px', padding: '15px', marginTop: '10px', fontSize: '1rem', outline: 'none' };
const cancelButtonStyle = { flex: 1, padding: '12px', background: '#222', color: '#fff', border: 'none', borderRadius: '10px', cursor: 'pointer', fontWeight: 'bold' };
const submitButtonStyle = { flex: 2, padding: '12px', background: '#00ccff', color: '#000', border: 'none', borderRadius: '10px', cursor: 'pointer', fontWeight: 'bold' };
const smallRequestButtonStyle = { width: '100%', marginTop: '15px', padding: '10px', background: '#00ccff', color: '#000', border: 'none', borderRadius: '8px', fontWeight: 'bold', cursor: 'pointer' };