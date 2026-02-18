'use client';

import { useState, useEffect } from 'react';
import { supabase } from '@/lib/supabaseClient';

const CATEGORIES = ["Shelter & Shade", "Kitchen & Water", "Power & Solar", "Tools & Hardware", "Lighting & Electronics", "Storage & Coolers"];
const STATUSES = ["You can borrow it", "You can keep it"];

export default function GearFeed() {
  const [items, setItems] = useState<any[]>([]);
  const [filteredItems, setFilteredItems] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  // Filter States
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedCats, setSelectedCats] = useState<string[]>([]);
  const [selectedStatus, setSelectedStatus] = useState<string[]>([]);
  const [searchZip, setSearchZip] = useState('');

  useEffect(() => {
    fetchGear();
  }, []);

  useEffect(() => {
    let list = [...items];

    // 1. Search Logic
    if (searchTerm) {
      list = list.filter(i => 
        i.item_name.toLowerCase().includes(searchTerm.toLowerCase()) || 
        i.description?.toLowerCase().includes(searchTerm.toLowerCase())
      );
    }

    // 2. Multi-Category Filter
    if (selectedCats.length > 0) {
      list = list.filter(i => selectedCats.includes(i.category));
    }

    // 3. Multi-Status Filter
    if (selectedStatus.length > 0) {
      list = list.filter(i => selectedStatus.includes(i.availability_status));
    }

    // 4. Sorting Logic (Zip Proximity)
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
    
    // STEP 1: Fetch the gear items (No joins, just the raw table)
    const { data: gearData, error: gearError } = await supabase
      .from('gear_items')
      .select('*');

    if (gearError) {
      console.error("Error fetching gear:", gearError.message);
      setLoading(false);
      return;
    }

    // STEP 2: Fetch supporting tables separately (Avoids "Schema Cache" errors)
    const { data: profiles } = await supabase.from('profiles').select('id, preferred_name');
    const { data: locations } = await supabase.from('locations').select('id, city, state, zip_code');

    // STEP 3: Manually Link (Hydrate) the data
    const hydratedData = gearData.map(item => ({
      ...item,
      profiles: profiles?.find(p => p.id === item.user_id),
      locations: locations?.find(l => l.id === item.location_id)
    }));

    setItems(hydratedData);
    setFilteredItems(hydratedData);
    setLoading(false);
  }

  const toggleFilter = (val: string, list: string[], setList: (v: string[]) => void) => {
    if (list.includes(val)) setList(list.filter(i => i !== val));
    else setList([...list, val]);
  };

  return (
    <div style={containerStyle}>
      <header style={{ marginBottom: '40px' }}>
        <h1 style={{ fontSize: '2.5rem', marginBottom: '10px' }}>Community Gear</h1>
        <p style={{ color: '#888' }}>Find what you need, share what you can.</p>
      </header>

      <div style={{ display: 'flex', gap: '40px', alignItems: 'flex-start' }}>
        
        {/* SIDEBAR */}
        <aside style={{ width: '260px', position: 'sticky', top: '20px' }}>
          <div style={filterSectionStyle}>
            <label style={labelStyle}>Search</label>
            <input 
              type="text" 
              placeholder="Keywords..." 
              value={searchTerm} 
              onChange={(e) => setSearchTerm(e.target.value)} 
              style={searchInputStyle} 
            />
          </div>

          <div style={filterSectionStyle}>
            <label style={labelStyle}>Search Near Zip</label>
            <input 
              type="number" 
              placeholder="e.g. 89501" 
              value={searchZip} 
              onChange={(e) => setSearchZip(e.target.value)} 
              style={searchInputStyle} 
            />
          </div>

          <div style={filterSectionStyle}>
            <label style={labelStyle}>Availability</label>
            {STATUSES.map(s => (
              <label key={s} style={checkboxLabelStyle}>
                <input 
                  type="checkbox" 
                  checked={selectedStatus.includes(s)} 
                  onChange={() => toggleFilter(s, selectedStatus, setSelectedStatus)} 
                />
                {s}
              </label>
            ))}
          </div>

          <div style={filterSectionStyle}>
            <label style={labelStyle}>Categories</label>
            {CATEGORIES.map(cat => (
              <label key={cat} style={checkboxLabelStyle}>
                <input 
                  type="checkbox" 
                  checked={selectedCats.includes(cat)} 
                  onChange={() => toggleFilter(cat, selectedCats, setSelectedCats)} 
                />
                {cat}
              </label>
            ))}
          </div>
        </aside>

        {/* FEED GRID */}
        <main style={{ flex: 1 }}>
          {loading ? (
            <p>Gathering gear...</p>
          ) : (
            <div style={gridStyle}>
              {filteredItems.length > 0 ? (
                filteredItems.map((item) => (
                  <div key={item.id} style={cardStyle}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '15px' }}>
                      <span style={badgeStyle(item.availability_status)}>{item.availability_status}</span>
                      <span style={{ fontSize: '0.7rem', color: '#444' }}>{item.condition}</span>
                    </div>
                    
                    <h3 style={{ margin: '0 0 5px 0', fontSize: '1.2rem' }}>{item.item_name}</h3>
                    <p style={{ color: '#ff6666', fontSize: '0.75rem', fontWeight: 'bold', marginBottom: '12px' }}>
                      {item.category?.toUpperCase()}
                    </p>
                    <p style={{ fontSize: '0.9rem', color: '#bbb', flexGrow: 1 }}>
                      {item.description}
                    </p>

                    <div style={footerStyle}>
                      <div style={{ color: '#fff', fontSize: '0.85rem' }}>
                        👤 {item.profiles?.preferred_name || 'Anonymous Burner'}
                      </div>
                      <div style={{ color: '#666', fontSize: '0.75rem', marginTop: '4px' }}>
                        📍 {item.locations ? `${item.locations.city}, ${item.locations.state} ${item.locations.zip_code}` : 'Location unknown'}
                      </div>
                    </div>
                  </div>
                ))
              ) : (
                <div style={{ gridColumn: '1/-1', textAlign: 'center', padding: '100px', border: '1px dashed #222' }}>
                  <h3>No gear found</h3>
                </div>
              )}
            </div>
          )}
        </main>
      </div>
    </div>
  );
}

// --- STYLING (Unchanged) ---
const containerStyle = { padding: '60px 40px', maxWidth: '1400px', margin: '0 auto', color: 'white', backgroundColor: '#000', minHeight: '100vh' };
const filterSectionStyle = { marginBottom: '35px', paddingBottom: '20px', borderBottom: '1px solid #111' };
const labelStyle = { display: 'block', fontWeight: 'bold' as 'bold', marginBottom: '12px', color: '#444', textTransform: 'uppercase' as 'uppercase', fontSize: '0.7rem' };
const checkboxLabelStyle = { display: 'flex', alignItems: 'center', gap: '10px', marginBottom: '10px', fontSize: '0.85rem', cursor: 'pointer', color: '#aaa' };
const searchInputStyle = { width: '100%', padding: '12px', borderRadius: '6px', border: '1px solid #222', background: '#0a0a0a', color: 'white' };
const gridStyle = { display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(300px, 1fr))', gap: '25px' };
const cardStyle = { background: '#0a0a0a', padding: '25px', borderRadius: '12px', border: '1px solid #1a1a1a', display: 'flex', flexDirection: 'column' as 'column' };
const footerStyle = { marginTop: '20px', paddingTop: '15px', borderTop: '1px solid #111' };
const badgeStyle = (status: string) => ({
  padding: '4px 10px', borderRadius: '4px', fontSize: '0.65rem', fontWeight: 'bold' as 'bold',
  background: status === 'You can keep it' ? '#2b5aed' : '#10b981', color: 'white'
});