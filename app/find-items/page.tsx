'use client';

import { useState, useEffect } from 'react';
import { supabase } from '@/lib/supabaseClient';
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

  const filteredItems = items.filter(item => {
    const isAvailable = item.availability_status !== 'Not Available';
    const matchesSearch = item.item_name?.toLowerCase().includes(searchQuery.toLowerCase());
    const matchesZip = !zipQuery || item.locations?.zip_code?.includes(zipQuery);
    const matchesCategory = categoryFilters.includes('All') || categoryFilters.includes(item.category);
    const itemStatus = item.availability_status === 'Available to keep' ? 'Keep' : 'Borrow';
    const matchesAvailability = availabilityFilters.includes(itemStatus);
    return isAvailable && matchesSearch && matchesZip && matchesCategory && matchesAvailability;
  });

  return (
    <div style={containerStyle}>
      {/* HEADER / SEARCH & FILTERS */}
      <div style={topBarStyle}>
        <div style={searchWrapperStyle}>
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
          <div style={searchWrapperStyle}>
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

        <div style={toggleGroupStyle}>
          {['Keep', 'Borrow'].map((mode) => {
            const isActive = availabilityFilters.includes(mode);
            return (
              <button
                key={mode}
                onClick={() => toggleAvailability(mode)}
                style={{
                  ...toggleButtonStyle,
                  backgroundColor: isActive ? '#00ccff' : 'transparent',
                  color: isActive ? '#000' : '#666',
                }}
              >
                {mode}
              </button>
            );
          })}
        </div>

        <div style={{ ...toggleGroupStyle, marginLeft: 'auto' }}>
          <button onClick={() => setViewMode('grid')} style={{...toggleButtonStyle, backgroundColor: viewMode === 'grid' ? '#eee' : 'transparent'}}>
            <LayoutGrid size={20} color={viewMode === 'grid' ? '#000' : '#666'} />
          </button>
          <button onClick={() => setViewMode('list')} style={{...toggleButtonStyle, backgroundColor: viewMode === 'list' ? '#eee' : 'transparent'}}>
            <List size={20} color={viewMode === 'list' ? '#000' : '#666'} />
          </button>
        </div>
      </div>

      {/* CATEGORY FILTERS */}
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
                  backgroundColor: isActive ? '#00ccff' : '#f5f5f5',
                  color: isActive ? '#000' : '#333',
                  borderColor: isActive ? '#00ccff' : '#ddd',
                }}
              >
                {cat}
                {isActive && cat !== 'All' && <X size={12} style={{marginLeft: '6px'}}/>}
              </button>
            );
          })}
        </div>
      </div>

      {/* CONTENT GRID */}
      {loading ? (
        <div style={gridStyle}>{[...Array(6)].map((_, i) => <div key={i} style={skeletonStyle} />)}</div>
      ) : (
        <div style={viewMode === 'grid' ? gridStyle : listContainerStyle}>
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
            
            <div style={{ height: '280px', borderRadius: '12px', overflow: 'hidden', marginBottom: '20px', backgroundColor: '#f0f0f0' }}>
              <ImageSlider images={selectedItem.image_urls} />
            </div>

            <h2 style={{ margin: '0 0 5px 0', color: '#111', fontSize: '24px' }}>{selectedItem.item_name}</h2>
            <p style={categoryLabelStyle}>{selectedItem.category} • {selectedItem.condition}</p>
            
            <div style={{ margin: '20px 0', padding: '15px', backgroundColor: '#f9f9f9', borderRadius: '10px', fontSize: '15px', color: '#444', lineHeight: '1.6' }}>
              {selectedItem.description || "No description provided by the owner."}
            </div>

            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '30px', padding: '0 5px' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px', color: '#777', fontSize: '14px' }}>
                <MapPin size={16} /> {selectedItem.locations?.city || 'City N/A'}
              </div>
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px', color: '#777', fontSize: '14px' }}>
                <User size={16} /> {selectedItem.profiles?.preferred_name || 'Member'}
              </div>
            </div>

            <button 
              onClick={() => setShowRequestForm(true)} 
              style={primaryButtonStyle}
            >
              Request to {selectedItem.availability_status === 'Available to keep' ? 'Keep' : 'Borrow'}
            </button>
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
  const locationDisplay = item.locations ? `${item.locations.city}` : 'N/A';

  return (
    <div style={cardStyle}>
      <div style={imageWrapperStyle}>
        <ImageSlider images={item.image_urls} />
        <div style={badgeStyle}>{item.availability_status === 'Available to keep' ? 'Keep' : 'Borrow'}</div>
      </div>
      <div style={cardContentStyle}>
        <h3 style={itemTitleStyle}>{item.item_name}</h3>
        <p style={categoryLabelStyle}>{item.category} • {item.condition}</p>
        <div style={metaRowStyle}>
          <span style={metaItemStyle}><MapPin size={12} /> {locationDisplay}</span>
          <span style={metaItemStyle}><User size={12} /> {ownerName}</span>
        </div>
      </div>
    </div>
  );
}

function ListView({ item }: { item: any }) {
  const ownerName = item.profiles?.preferred_name || 'Member';
  return (
    <div style={listStyle}>
      <div style={listImageStyle}>
        {item.image_urls?.[0] ? <img src={item.image_urls[0]} alt="" style={imgCover} /> : <div style={noImgSmall}><Package size={16} /></div>}
      </div>
      <div style={{ flex: 1 }}>
        <h3 style={{ margin: 0, color: '#111', fontSize: '16px' }}>{item.item_name}</h3>
        <p style={{ margin: '4px 0 0', color: '#666', fontSize: '12px' }}>
          {item.category} • {ownerName}
        </p>
      </div>
      <div style={{ color: '#00ccff', fontWeight: 'bold', fontSize: '12px' }}>View Details</div>
    </div>
  );
}

// --- STYLES ---

const containerStyle: React.CSSProperties = { padding: '20px', maxWidth: '1200px', margin: '0 auto', backgroundColor: '#fff', minHeight: '100vh' };
const topBarStyle: React.CSSProperties = { display: 'flex', gap: '15px', marginBottom: '20px', flexWrap: 'wrap', alignItems: 'center' };
const searchWrapperStyle: React.CSSProperties = { position: 'relative', flex: '0 1 250px' };
const searchIconStyle: React.CSSProperties = { position: 'absolute', left: '12px', top: '50%', transform: 'translateY(-50%)', color: '#999' };
const searchInputStyle: React.CSSProperties = { width: '100%', padding: '10px 10px 10px 40px', backgroundColor: '#f9f9f9', border: '1px solid #eee', borderRadius: '8px', color: '#111', outline: 'none' };
const toggleGroupStyle: React.CSSProperties = { display: 'flex', backgroundColor: '#f5f5f5', borderRadius: '8px', padding: '4px', border: '1px solid #eee' };
const toggleButtonStyle: React.CSSProperties = { border: 'none', padding: '6px 12px', borderRadius: '6px', cursor: 'pointer', fontSize: '0.8rem', fontWeight: 'bold' };
const filterRowStyle: React.CSSProperties = { marginBottom: '30px' };
const chipContainerStyle: React.CSSProperties = { display: 'flex', gap: '8px', flexWrap: 'wrap' };
const chipStyle: React.CSSProperties = { padding: '6px 14px', borderRadius: '20px', border: '1px solid', fontSize: '13px', cursor: 'pointer', fontWeight: '500', display: 'flex', alignItems: 'center' };
const gridStyle: React.CSSProperties = { display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(260px, 1fr))', gap: '20px' };
const listContainerStyle: React.CSSProperties = { display: 'flex', flexDirection: 'column', gap: '12px' };
const cardStyle: React.CSSProperties = { backgroundColor: '#fff', border: '1px solid #eee', borderRadius: '12px', overflow: 'hidden', boxShadow: '0 2px 8px rgba(0,0,0,0.05)' };
const imageWrapperStyle: React.CSSProperties = { height: '180px', position: 'relative', backgroundColor: '#f0f0f0' };
const badgeStyle: React.CSSProperties = { position: 'absolute', top: '10px', left: '10px', backgroundColor: '#00ccff', color: '#000', padding: '3px 8px', borderRadius: '6px', fontSize: '10px', fontWeight: 'bold', zIndex: 5 };
const cardContentStyle: React.CSSProperties = { padding: '15px' };
const itemTitleStyle: React.CSSProperties = { margin: 0, color: '#111', fontSize: '16px', fontWeight: '600' };
const categoryLabelStyle: React.CSSProperties = { color: '#00ccff', fontSize: '11px', margin: '4px 0 12px 0', textTransform: 'uppercase', fontWeight: 'bold' };
const metaRowStyle: React.CSSProperties = { display: 'flex', justifyContent: 'space-between', color: '#777', fontSize: '12px', borderTop: '1px solid #f5f5f5', paddingTop: '10px' };
const metaItemStyle: React.CSSProperties = { display: 'flex', alignItems: 'center', gap: '4px' };
const listStyle: React.CSSProperties = { display: 'flex', alignItems: 'center', gap: '15px', padding: '12px', backgroundColor: '#fff', border: '1px solid #eee', borderRadius: '10px' };
const listImageStyle: React.CSSProperties = { width: '50px', height: '50px', borderRadius: '6px', overflow: 'hidden', backgroundColor: '#f0f0f0' };
const imgCover: React.CSSProperties = { width: '100%', height: '100%', objectFit: 'cover' };
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
  width: '36px', height: '36px', display: 'flex', alignItems: 'center', justifyContent: 'center'
};

const primaryButtonStyle: React.CSSProperties = {
  width: '100%', padding: '18px', backgroundColor: '#00ccff', color: '#000', 
  border: 'none', borderRadius: '14px', fontWeight: 'bold', fontSize: '16px', 
  cursor: 'pointer', boxShadow: '0 4px 14px rgba(0,204,255,0.4)'
};