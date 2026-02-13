'use client';

import { useState, useEffect } from 'react';
import { supabase } from '@/lib/supabaseClient';

export default function GearFeed() {
  const [items, setItems] = useState<any[]>([]);
  const [filteredItems, setFilteredItems] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  // Search/Filter State
  const [searchTerm, setSearchTerm] = useState('');
  const [filterCategory, setFilterCategory] = useState('');
  const [filterAvailability, setFilterAvailability] = useState('');

  useEffect(() => {
    fetchGear();
  }, []);

  // Update filtered list whenever search or filters change
  useEffect(() => {
    let list = items;

    if (searchTerm) {
      list = list.filter(i => 
        i.item_name.toLowerCase().includes(searchTerm.toLowerCase()) || 
        i.description?.toLowerCase().includes(searchTerm.toLowerCase())
      );
    }

    if (filterCategory) {
      list = list.filter(i => i.category === filterCategory);
    }

    if (filterAvailability) {
      list = list.filter(i => i.availability_status === filterAvailability);
    }

    setFilteredItems(list);
  }, [searchTerm, filterCategory, filterAvailability, items]);

  async function fetchGear() {
    setLoading(true);
    const { data } = await supabase
      .from('gear_items')
      .select(`*, profiles (burner_name, city)`)
      .order('created_at', { ascending: false });

    if (data) {
      setItems(data);
      setFilteredItems(data);
    }
    setLoading(false);
  }

  return (
    <div style={containerStyle}>
      <header style={{ marginBottom: '40px' }}>
        <h1 style={{ fontSize: '2.5rem', marginBottom: '10px' }}>Community Gear</h1>
        <p style={{ color: '#666' }}>Find what you need, share what you can.</p>
      </header>

      {/* SEARCH & FILTER BAR */}
      <section style={filterBarStyle}>
        <input 
          type="text"
          placeholder="Search items (e.g. 'Stakes' or 'Cooler')..."
          value={searchTerm}
          onChange={(e) => setSearchTerm(e.target.value)}
          style={searchInputStyle}
        />
        
        <select 
          value={filterCategory} 
          onChange={(e) => setFilterCategory(e.target.value)} 
          style={selectStyle}
        >
          <option value="">All Categories</option>
          <option value="Shelter & Shade">Shelter & Shade</option>
          <option value="Kitchen & Water">Kitchen & Water</option>
          <option value="Power & Solar">Power & Solar</option>
          <option value="Tools & Hardware">Tools & Hardware</option>
          <option value="Lighting & Electronics">Lighting & Electronics</option>
          <option value="Storage & Coolers">Storage & Coolers</option>
        </select>

        <select 
          value={filterAvailability} 
          onChange={(e) => setFilterAvailability(e.target.value)} 
          style={selectStyle}
        >
          <option value="">Any Status</option>
          <option value="You can borrow it">To Borrow</option>
          <option value="You can keep it">To Keep</option>
          <option value="Not available">Unavailable</option>
        </select>
      </section>

      {/* RESULTS */}
      {loading ? (
        <p>Loading the gear...</p>
      ) : (
        <div style={gridStyle}>
          {filteredItems.length > 0 ? (
            filteredItems.map((item) => (
              <div key={item.id} style={cardStyle}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                  <span style={badgeStyle(item.availability_status)}>{item.availability_status}</span>
                  <span style={{ fontSize: '0.7rem', color: '#555' }}>{item.condition}</span>
                </div>
                
                <h3 style={{ margin: '15px 0 5px 0' }}>{item.item_name}</h3>
                <p style={{ color: '#888', fontSize: '0.8rem', marginBottom: '12px' }}>{item.category}</p>
                <p style={{ fontSize: '0.9rem', color: '#ccc', flexGrow: 1 }}>{item.description}</p>

                <div style={footerStyle}>
                  <div style={{ color: '#fff', fontWeight: 'bold' }}>👤 {item.profiles?.burner_name || 'Anonymous'}</div>
                  <div style={{ color: '#666' }}>📍 {item.profiles?.city || 'Unknown Location'}</div>
                </div>
              </div>
            ))
          ) : (
            <p style={{ gridColumn: '1/-1', textAlign: 'center', padding: '50px', color: '#555' }}>
              No items match your search. Try broadening your filters!
            </p>
          )}
        </div>
      )}
    </div>
  );
}

// STYLING
const containerStyle = { padding: '40px', maxWidth: '1200px', margin: '0 auto', color: 'white', minHeight: '100vh' };
const filterBarStyle = { display: 'flex', gap: '15px', marginBottom: '40px', flexWrap: 'wrap' as 'wrap' };
const searchInputStyle = { flex: 2, minWidth: '250px', padding: '12px', borderRadius: '8px', border: '1px solid #333', background: '#111', color: 'white' };
const selectStyle = { flex: 1, minWidth: '150px', padding: '12px', borderRadius: '8px', border: '1px solid #333', background: '#111', color: 'white' };
const gridStyle = { display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(280px, 1fr))', gap: '20px' };
const cardStyle = { background: '#0a0a0a', padding: '20px', borderRadius: '12px', border: '1px solid #222', display: 'flex', flexDirection: 'column' as 'column' };
const footerStyle = { marginTop: '20px', paddingTop: '15px', borderTop: '1px solid #1a1a1a', fontSize: '0.8rem' };
const badgeStyle = (status: string) => ({
  padding: '4px 8px', borderRadius: '4px', fontSize: '0.7rem', fontWeight: 'bold' as 'bold',
  background: status === 'You can keep it' ? '#2b5aed' : status === 'You can borrow it' ? '#10b981' : '#333',
  color: 'white'
});