'use client';

import { useState, useEffect } from 'react';
import { supabase } from '@/lib/supabaseClient';
import Link from 'next/link';
import ImageSlider from '@/components/ImageSlider';
import { Search, LayoutGrid, List, Map, MapPin, User, Package } from 'lucide-react';

export default function FindItemsPage() {
  const [items, setItems] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [viewMode, setViewMode] = useState<'grid' | 'list' | 'map'>('grid');
  const [category, setCategory] = useState('All');
  const [zipCode, setZipCode] = useState('');

  const categories = ['All', 'Tents', 'Sleep System', 'Kitchen', 'Backpacks', 'Climbing', 'Tools'];

  useEffect(() => {
    fetchItems();
  }, []);

  async function fetchItems() {
    setLoading(true);
    const { data, error } = await supabase.from('gear_items').select('*');
    if (error) console.error('Error:', error);
    else setItems(data || []);
    setLoading(false);
  }

  const filteredItems = items.filter(item => {
    const matchesSearch = item.item_name?.toLowerCase().includes(searchQuery.toLowerCase());
    const matchesCategory = category === 'All' || item.category === category;
    return matchesSearch && matchesCategory;
  });

  return (
    <div style={containerStyle}>
      {/* HEADER / SEARCH */}
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
        <div style={toggleGroupStyle}>
          <button onClick={() => setViewMode('grid')} style={{...toggleButtonStyle, backgroundColor: viewMode === 'grid' ? '#222' : 'transparent'}}>
            <LayoutGrid size={20} color={viewMode === 'grid' ? '#00ccff' : '#666'} />
          </button>
          <button onClick={() => setViewMode('list')} style={{...toggleButtonStyle, backgroundColor: viewMode === 'list' ? '#222' : 'transparent'}}>
            <List size={20} color={viewMode === 'list' ? '#00ccff' : '#666'} />
          </button>
        </div>
      </div>

      {/* FILTERS */}
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
        <div style={zipWrapperStyle}>
          <MapPin size={14} color="#666" />
          <input 
            type="text" 
            placeholder="Zip" 
            value={zipCode}
            onChange={(e) => setZipCode(e.target.value)}
            style={zipInputStyle} 
          />
        </div>
      </div>

      {/* GRID/LIST */}
      {loading ? (
        <div style={gridStyle}>{[...Array(6)].map((_, i) => <div key={i} style={skeletonStyle} />)}</div>
      ) : (
        <div style={viewMode === 'grid' ? gridStyle : listContainerStyle}>
          {filteredItems.map(item => (
            <Link key={item.id} href={`/find-items/${item.id}`} scroll={false} style={{ textDecoration: 'none' }}>
              {viewMode === 'grid' ? <CardView item={item} /> : <ListView item={item} />}
            </Link>
          ))}
        </div>
      )}
    </div>
  );
}

// --- COMPONENTS ---

function CardView({ item }: { item: any }) {
  return (
    <div style={cardStyle}>
      <div style={imageWrapperStyle}>
        <ImageSlider images={item.image_urls} />
        <div style={badgeStyle}>{item.is_available !== false ? 'Available' : 'Rented'}</div>
      </div>
      <div style={cardContentStyle}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '8px' }}>
          <h3 style={itemTitleStyle}>{item.item_name}</h3>
          <span style={priceStyle}>${item.price_per_day || '0'}<small style={{fontSize: '10px'}}>/day</small></span>
        </div>
        <div style={metaRowStyle}>
          <span style={metaItemStyle}><MapPin size={12} /> {item.city || 'Local'}</span>
          <span style={metaItemStyle}><User size={12} /> {item.owner_name || 'Member'}</span>
        </div>
      </div>
    </div>
  );
}

function ListView({ item }: { item: any }) {
  return (
    <div style={listStyle}>
      <div style={listImageStyle}>
        {item.image_urls?.[0] ? <img src={item.image_urls[0]} alt="" style={imgCover} /> : <div style={noImgSmall}><Package size={16} /></div>}
      </div>
      <div style={{ flex: 1 }}>
        <h3 style={{ margin: 0, color: '#fff', fontSize: '16px' }}>{item.item_name}</h3>
        <p style={{ margin: '4px 0 0', color: '#666', fontSize: '12px' }}>{item.city} • ${item.price_per_day}/day</p>
      </div>
    </div>
  );
}

// --- STYLES ---
const containerStyle: React.CSSProperties = { padding: '20px', maxWidth: '1200px', margin: '0 auto' };
const topBarStyle: React.CSSProperties = { display: 'flex', gap: '15px', marginBottom: '20px' };
const searchWrapperStyle: React.CSSProperties = { position: 'relative', flex: 1 };
const searchIconStyle: React.CSSProperties = { position: 'absolute', left: '12px', top: '50%', transform: 'translateY(-50%)', color: '#666' };
const searchInputStyle: React.CSSProperties = { width: '100%', padding: '12px 40px', backgroundColor: '#111', border: '1px solid #222', borderRadius: '10px', color: '#fff', outline: 'none' };
const toggleGroupStyle: React.CSSProperties = { display: 'flex', backgroundColor: '#111', borderRadius: '10px', padding: '4px', border: '1px solid #222' };
const toggleButtonStyle: React.CSSProperties = { border: 'none', padding: '8px', borderRadius: '6px', cursor: 'pointer' };
const filterRowStyle: React.CSSProperties = { display: 'flex', justifyContent: 'space-between', marginBottom: '30px', gap: '20px', flexWrap: 'wrap' };
const chipContainerStyle: React.CSSProperties = { display: 'flex', gap: '8px', flexWrap: 'wrap' };
const chipStyle: React.CSSProperties = { padding: '8px 16px', borderRadius: '20px', border: '1px solid', fontSize: '13px', cursor: 'pointer', fontWeight: '500' };
const zipWrapperStyle: React.CSSProperties = { display: 'flex', alignItems: 'center', gap: '8px', backgroundColor: '#111', padding: '8px 15px', borderRadius: '20px', border: '1px solid #222' };
const zipInputStyle: React.CSSProperties = { background: 'none', border: 'none', color: '#fff', width: '60px', fontSize: '14px', outline: 'none' };
const gridStyle: React.CSSProperties = { display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(280px, 1fr))', gap: '20px' };
const listContainerStyle: React.CSSProperties = { display: 'flex', flexDirection: 'column', gap: '12px' };
const cardStyle: React.CSSProperties = { backgroundColor: '#0a0a0a', border: '1px solid #222', borderRadius: '12px', overflow: 'hidden' };
const imageWrapperStyle: React.CSSProperties = { height: '200px', position: 'relative' }; // Added relative
const badgeStyle: React.CSSProperties = { position: 'absolute', top: '10px', left: '10px', backgroundColor: '#00ccff', color: '#000', padding: '4px 10px', borderRadius: '12px', fontSize: '10px', fontWeight: 'bold', zIndex: 5 };
const cardContentStyle: React.CSSProperties = { padding: '15px' };
const itemTitleStyle: React.CSSProperties = { margin: 0, color: '#fff', fontSize: '16px', fontWeight: '600' };
const priceStyle: React.CSSProperties = { color: '#00ccff', fontWeight: 'bold', fontSize: '16px' };
const metaRowStyle: React.CSSProperties = { display: 'flex', justifyContent: 'space-between', color: '#666', fontSize: '12px' };
const metaItemStyle: React.CSSProperties = { display: 'flex', alignItems: 'center', gap: '4px' };
const listStyle: React.CSSProperties = { display: 'flex', alignItems: 'center', gap: '15px', padding: '10px', backgroundColor: '#111', border: '1px solid #222', borderRadius: '10px' };
const listImageStyle: React.CSSProperties = { width: '60px', height: '60px', borderRadius: '6px', overflow: 'hidden' };
const imgCover: React.CSSProperties = { width: '100%', height: '100%', objectFit: 'cover' };
const noImgSmall: React.CSSProperties = { display: 'flex', alignItems: 'center', justifyContent: 'center', height: '100%', color: '#333' };
const skeletonStyle: React.CSSProperties = { height: '300px', backgroundColor: '#111', borderRadius: '12px' };