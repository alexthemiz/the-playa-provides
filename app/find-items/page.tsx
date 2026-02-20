'use client';

import { useState, useEffect } from 'react';
import { supabase } from '@/lib/supabaseClient';

const CATEGORIES = ["Shelter & Shade", "Kitchen & Water", "Power & Solar", "Tools & Hardware", "Lighting & Electronics", "Storage & Coolers"];
const STATUSES = ["You can borrow it", "You can keep it"];

export default function FindItemsPage() {
  const [items, setItems] = useState<any[]>([]);
  const [filteredItems, setFilteredItems] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [viewMode, setViewMode] = useState<'grid' | 'list' | 'map'>('grid');

  // Filter States
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedCats, setSelectedCats] = useState<string[]>([]);
  const [selectedStatus, setSelectedStatus] = useState<string[]>([]);
  const [searchZip, setSearchZip] = useState('');
  const [showZipInput, setShowZipInput] = useState(false);

  useEffect(() => {
    fetchGear();
  }, []);

  useEffect(() => {
    let list = [...items];

    if (searchTerm) {
      list = list.filter(i => 
        i.item_name.toLowerCase().includes(searchTerm.toLowerCase()) || 
        i.description?.toLowerCase().includes(searchTerm.toLowerCase())
      );
    }
    if (selectedCats.length > 0) {
      list = list.filter(i => selectedCats.includes(i.category));
    }
    if (selectedStatus.length > 0) {
      list = list.filter(i => selectedStatus.includes(i.availability_status));
    }
    if (searchZip.length === 5) {
      const userZip = parseInt(searchZip);
      list.sort((a, b) => {
        const zipA = parseInt(a.locations?.zip_code || '99999');
        const zipB = parseInt(b.locations?.zip_code || '99999');
        return Math.abs(zipA - userZip) - Math.abs(zipB - userZip);
      });
    } else {
      list.sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime());
    }

    setFilteredItems(list);
  }, [searchTerm, selectedCats, selectedStatus, searchZip, items]);

  async function fetchGear() {
    setLoading(true);
    const { data: gearData, error: gearError } = await supabase.from('gear_items').select('*');
    if (gearError) {
      console.error(gearError);
      setLoading(false);
      return;
    }
    const { data: profiles } = await supabase.from('profiles').select('id, preferred_name');
    const { data: locations } = await supabase.from('locations').select('id, city, state, zip_code');

    const hydratedData = gearData.map(item => ({
      ...item,
      profiles: profiles?.find(p => p.id === item.user_id),
      locations: locations?.find(l => l.id === item.location_id)
    }));

    setItems(hydratedData);
    setLoading(false);
  }

  const toggleFilter = (val: string, list: string[], setList: (v: string[]) => void) => {
    if (list.includes(val)) setList(list.filter(i => i !== val));
    else setList([...list, val]);
  };

  return (
    <div style={{ padding: '40px', maxWidth: '1400px', margin: '0 auto', color: 'white' }}>
      
      {/* --- TOP BAR: SEARCH & VIEW TOGGLE --- */}
      <div style={topBarStyle}>
        <div style={{ flex: 1, display: 'flex', gap: '10px' }}>
          <input 
            placeholder="Search items..." 
            style={topInputStyle} 
            onChange={(e) => setSearchTerm(e.target.value)} 
          />
          <button 
            onClick={() => setShowZipInput(!showZipInput)} 
            style={secondaryButtonStyle}
          >
            📍 {searchZip ? `Near ${searchZip}` : 'Search by Distance'}
          </button>
          {showZipInput && (
            <input 
              placeholder="Zip Code" 
              style={{ ...topInputStyle, width: '100px' }} 
              maxLength={5}
              onChange={(e) => setSearchZip(e.target.value)}
            />
          )}
        </div>

        <div style={viewToggleStyle}>
          <button onClick={() => setViewMode('grid')} style={viewBtn(viewMode === 'grid')}>Grid</button>
          <button onClick={() => setViewMode('list')} style={viewBtn(viewMode === 'list')}>List</button>
          <button onClick={() => setViewMode('map')} style={viewBtn(viewMode === 'map')}>Map</button>
        </div>
      </div>

      {/* --- FILTER CHIPS --- */}
      <div style={{ display: 'flex', gap: '10px', flexWrap: 'wrap', marginBottom: '30px' }}>
        {CATEGORIES.map(cat => (
          <button 
            key={cat} 
            onClick={() => toggleFilter(cat, selectedCats, setSelectedCats)}
            style={chipStyle(selectedCats.includes(cat))}
          >
            {cat}
          </button>
        ))}
      </div>

      {/* --- CONTENT AREA --- */}
      {loading ? <p>Gathering gear...</p> : (
        <>
          {viewMode === 'grid' && (
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(280px, 1fr))', gap: '25px' }}>
              {filteredItems.map(item => <CardView key={item.id} item={item} />)}
            </div>
          )}

          {viewMode === 'list' && (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
              {filteredItems.map(item => <ListView key={item.id} item={item} />)}
            </div>
          )}

          {viewMode === 'map' && (
            <div style={placeholderBox}>🗺️ Map View coming soon (integrating Leaflet/Google Maps...)</div>
          )}
        </>
      )}
    </div>
  );
}

// --- SUB-COMPONENTS ---
function CardView({ item }: { item: any }) {
  return (
    <div style={cardStyle}>
      <div style={imgContainer}>
        {item.image_urls?.[0] ? <img src={item.image_urls[0]} style={imgStyle} /> : <div style={noImg}>No Photo</div>}
        <div style={badgeStyle}>{item.availability_status}</div>
      </div>
      <div style={{ padding: '15px' }}>
        <h3 style={{ margin: '0 0 5px 0' }}>{item.item_name}</h3>
        <p style={{ color: '#00ccff', fontSize: '0.8rem', fontWeight: 'bold' }}>{item.category}</p>
        <p style={{ fontSize: '0.85rem', color: '#888', height: '40px', overflow: 'hidden' }}>{item.description}</p>
        <div style={footerStyle}>📍 {item.locations?.zip_code || '---'}</div>
      </div>
    </div>
  );
}

function ListView({ item }: { item: any }) {
  return (
    <div style={{ ...cardStyle, flexDirection: 'row', alignItems: 'center', padding: '10px' }}>
      {/* We only render the img tag if the URL actually exists */}
      {item.image_urls?.[0] ? (
        <img 
          src={item.image_urls[0]} 
          style={{ width: '50px', height: '50px', objectFit: 'cover', borderRadius: '4px', marginRight: '15px' }} 
        />
      ) : (
        <div style={{ width: '50px', height: '50px', backgroundColor: '#1a1a1a', borderRadius: '4px', marginRight: '15px', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '0.6rem', color: '#333' }}>
          NO PIX
        </div>
      )}
      
      <div style={{ flex: 1 }}>
        <h4 style={{ margin: 0 }}>{item.item_name}</h4>
        <p style={{ margin: 0, fontSize: '0.7rem', color: '#555' }}>{item.category}</p>
      </div>
      <div style={{ fontSize: '0.8rem', color: '#888', marginRight: '20px' }}>{item.availability_status}</div>
      <button style={{ padding: '5px 15px', backgroundColor: '#333', color: 'white', border: 'none', borderRadius: '4px', cursor: 'pointer' }}>View</button>
    </div>
  );
}

// --- STYLES ---
const topBarStyle = { display: 'flex', gap: '20px', marginBottom: '20px', alignItems: 'center' };
const topInputStyle = { padding: '12px', borderRadius: '8px', border: '1px solid #222', backgroundColor: '#111', color: 'white', fontSize: '1rem' };
const secondaryButtonStyle = { padding: '12px 20px', borderRadius: '8px', border: '1px solid #333', backgroundColor: 'transparent', color: '#aaa', cursor: 'pointer' };
const viewToggleStyle = { display: 'flex', background: '#111', padding: '4px', borderRadius: '10px', border: '1px solid #222' };
const viewBtn = (active: boolean) => ({ padding: '8px 16px', border: 'none', borderRadius: '8px', cursor: 'pointer', backgroundColor: active ? '#00ccff' : 'transparent', color: active ? 'black' : '#888', fontWeight: 'bold' as 'bold' });
const chipStyle = (active: boolean) => ({ padding: '8px 16px', borderRadius: '20px', border: '1px solid', borderColor: active ? '#00ccff' : '#222', backgroundColor: active ? '#00ccff' : 'transparent', color: active ? 'black' : '#888', cursor: 'pointer', fontSize: '0.8rem' });
const cardStyle: React.CSSProperties = { backgroundColor: '#0a0a0a', borderRadius: '12px', border: '1px solid #222', overflow: 'hidden', display: 'flex', flexDirection: 'column' };
const imgContainer: React.CSSProperties = { position: 'relative', height: '180px', backgroundColor: '#111' };
const imgStyle: React.CSSProperties = { width: '100%', height: '100%', objectFit: 'cover' };
const noImg = { display: 'flex', alignItems: 'center', justifyContent: 'center', height: '100%', color: '#333' };
const badgeStyle: React.CSSProperties = { position: 'absolute', top: '10px', left: '10px', backgroundColor: 'rgba(0,0,0,0.8)', color: '#00ccff', padding: '4px 8px', borderRadius: '5px', fontSize: '0.6rem', border: '1px solid #00ccff' };
const footerStyle = { marginTop: '10px', fontSize: '0.75rem', color: '#555' };
const placeholderBox = { height: '400px', border: '2px dashed #222', borderRadius: '20px', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#444' };