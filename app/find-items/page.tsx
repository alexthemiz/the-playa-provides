'use client';

import { useState, useEffect } from 'react';
import { supabase } from '@/lib/supabaseClient';
import Link from 'next/link';
import ImageSlider from '@/components/ImageSlider';
import { Search, LayoutGrid, List, MapPin, User, Package, Map as MapIcon } from 'lucide-react';

export default function FindItemsPage() {
  const [items, setItems] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [zipQuery, setZipQuery] = useState('');
  const [viewMode, setViewMode] = useState<'grid' | 'list' | 'map'>('grid');
  const [category, setCategory] = useState('All');

  // Updated to match /list-item options
// Update this list at the top of your component
  const categories = [
    'All', 
    'Bikes & Transport', 
    'Kitchen & Cooking', 
    'Lighting & Power', 
    'Safety & First Aid', 
    'Shelter & Shade', 
    'Tools & Hardware', 
    'Water & Graywater'
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
        supabase.from('profiles').select('id, preferred_name').in('id', userIds),
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

  const filteredItems = items.filter(item => {
    const isAvailable = item.availability_status !== 'Not Available';
    const matchesSearch = item.item_name?.toLowerCase().includes(searchQuery.toLowerCase());
    const matchesCategory = category === 'All' || item.category === category;
    const matchesZip = !zipQuery || item.locations?.zip_code?.includes(zipQuery);
    return isAvailable && matchesSearch && matchesCategory && matchesZip;
  });

  return (
    <div style={containerStyle}>
      {/* HEADER / SEARCH & DISTANCE */}
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
        
        <div style={{ ...searchWrapperStyle, maxWidth: '150px' }}>
          <MapPin size={18} style={searchIconStyle} />
          <input
            type="text"
            placeholder="Zip Code"
            style={searchInputStyle}
            value={zipQuery}
            onChange={(e) => setZipQuery(e.target.value)}
          />
        </div>

        <div style={toggleGroupStyle}>
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

      {/* CATEGORY FILTERS */}
      <div style={filterRowStyle}>
        <div style={chipContainerStyle}>
          {categories.map((cat) => (
            <button
              key={cat}
              onClick={() => setCategory(cat)}
              style={{
                ...chipStyle,
                backgroundColor: category === cat ? '#00ccff' : '#111',
                color: category === cat ? '#000' : '#fff',
                borderColor: category === cat ? '#00ccff' : '#333'
              }}
            >
              {cat}
            </button>
          ))}
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
                <Link key={item.id} href={`/find-items/${item.id}`} scroll={false} style={{ textDecoration: 'none' }}>
                  {viewMode === 'grid' ? <CardView item={item} /> : <ListView item={item} />}
                </Link>
              ))}
            </div>
          )}
        </>
      )}
    </div>
  );
}

function CardView({ item }: { item: any }) {
  const ownerName = item.profiles?.preferred_name || 'Member';
  const city = item.locations?.city;
  const zip = item.locations?.zip_code;
  const locationDisplay = city ? (zip ? `${city} (${zip})` : city) : 'Location N/A';

  return (
    <div style={cardStyle}>
      <div style={imageWrapperStyle}>
        <ImageSlider images={item.image_urls} />
        <div style={badgeStyle}>{item.availability_status || 'Available'}</div>
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
  const city = item.locations?.city;
  const zip = item.locations?.zip_code;
  const locationDisplay = city ? (zip ? `${city} (${zip})` : city) : 'Location N/A';

  return (
    <div style={listStyle}>
      <div style={listImageStyle}>
        {item.image_urls?.[0] ? <img src={item.image_urls[0]} alt="" style={imgCover} /> : <div style={noImgSmall}><Package size={16} /></div>}
      </div>
      <div style={{ flex: 1 }}>
        <h3 style={{ margin: 0, color: '#fff', fontSize: '16px' }}>{item.item_name}</h3>
        <p style={{ margin: '4px 0 0', color: '#fff', fontSize: '12px' }}>
          {item.category} • {locationDisplay} • Owned by {ownerName}
        </p>
      </div>
      <div style={{ color: '#00ccff', fontSize: '12px', fontWeight: 'bold' }}>{item.availability_status}</div>
    </div>
  );
}

// --- STYLES ---
const containerStyle: React.CSSProperties = { padding: '20px', maxWidth: '1200px', margin: '0 auto' };
const topBarStyle: React.CSSProperties = { display: 'flex', gap: '15px', marginBottom: '20px', flexWrap: 'wrap' };
const searchWrapperStyle: React.CSSProperties = { position: 'relative', flex: 1, minWidth: '200px' };
const searchIconStyle: React.CSSProperties = { position: 'absolute', left: '12px', top: '50%', transform: 'translateY(-50%)', color: '#666' };
const searchInputStyle: React.CSSProperties = { width: '100%', padding: '12px 40px', backgroundColor: '#111', border: '1px solid #222', borderRadius: '10px', color: '#fff', outline: 'none' };
const toggleGroupStyle: React.CSSProperties = { display: 'flex', backgroundColor: '#111', borderRadius: '10px', padding: '4px', border: '1px solid #222' };
const toggleButtonStyle: React.CSSProperties = { border: 'none', padding: '8px', borderRadius: '6px', cursor: 'pointer', display: 'flex', alignItems: 'center' };
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