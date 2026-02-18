'use client';

import { useEffect, useState } from 'react';
import { supabase } from '@/lib/supabaseClient';
import Link from 'next/link';

export default function InventoryPage() {
  const [items, setItems] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  
  // Search States
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedCategory, setSelectedCategory] = useState('All');
  const [zipFilter, setZipFilter] = useState('');

  // 1. Fetch EVERYTHING on load
  useEffect(() => {
    fetchInventory();
  }, []);

  async function fetchInventory() {
    setLoading(true);
    
    // We fetch all items, but tell Supabase to ignore the 'Not available' ones
    const { data, error } = await supabase
      .from('gear_items')
      .select('*')
      .neq('availability_status', 'Not available') 
      .order('created_at', { ascending: false });

    if (error) {
      console.error("Supabase Error:", error);
    } else {
      setItems(data || []);
    }
    setLoading(false);
  }

  // 2. Client-side filtering (narrows down the 'Everything' list as you type)
  const filteredItems = items.filter(item => {
    const itemName = item.item_name?.toLowerCase() || '';
    const itemDesc = item.description?.toLowerCase() || '';
    const search = searchTerm.toLowerCase();

    const matchesSearch = itemName.includes(search) || itemDesc.includes(search);
    const matchesCategory = selectedCategory === 'All' || item.category === selectedCategory;
    const matchesZip = zipFilter === '' || item.zip_code?.includes(zipFilter);

    return matchesSearch && matchesCategory && matchesZip;
  });

  return (
    <div style={{ padding: '20px', maxWidth: '1200px', margin: '0 auto', color: 'white', fontFamily: 'sans-serif' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '20px' }}>
        <h1>Community Gear</h1>
        <div style={{ display: 'flex', gap: '15px' }}>
            <Link href="/profile" style={{ color: '#aaa', textDecoration: 'none' }}>My Profile</Link>
            <Link href="/list-item" style={{ color: '#00ccff', textDecoration: 'none', fontWeight: 'bold' }}>+ List Item</Link>
        </div>
      </div>

      {/* FILTER BAR */}
      <div style={{ 
        display: 'grid', 
        gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', 
        gap: '15px', 
        marginBottom: '40px', 
        background: '#111', 
        padding: '20px', 
        borderRadius: '12px',
        border: '1px solid #333'
      }}>
        <div>
            <label style={labelStyle}>Search</label>
            <input 
                placeholder="What do you need?" 
                style={inputStyle} 
                onChange={(e) => setSearchTerm(e.target.value)} 
            />
        </div>
        <div>
            <label style={labelStyle}>Category</label>
            <select style={inputStyle} onChange={(e) => setSelectedCategory(e.target.value)}>
                <option>All</option>
                <option>Bikes & Transport</option>
                <option>Kitchen & Cooking</option>
                <option>Lighting & Power</option>
                <option>Safety & First Aid</option>
                <option>Shelter & Shade</option>
                <option>Tools & Hardware</option>
                <option>Water & Graywater</option>
                <option>Other</option>
            </select>
        </div>
        <div>
            <label style={labelStyle}>Location (Zip)</label>
            <input 
                placeholder="Filter by Zip..." 
                style={inputStyle} 
                onChange={(e) => setZipFilter(e.target.value)} 
            />
        </div>
      </div>

      {/* DEFAULT VIEW: THE LIST */}
      {loading ? (
        <p style={{ textAlign: 'center', color: '#666' }}>Scanning the playa...</p>
      ) : (
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(300px, 1fr))', gap: '25px' }}>
          {filteredItems.map(item => (
            <div key={item.id} style={cardStyle}>
              <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '10px' }}>
                <span style={badgeStyle(item.availability_status)}>{item.availability_status}</span>
                <span style={{ fontSize: '0.8rem', color: '#555' }}>#{item.id}</span>
              </div>
              
              <h2 style={{ fontSize: '1.4rem', margin: '0 0 10px 0', color: '#fff' }}>{item.item_name}</h2>
              <p style={{ fontSize: '0.95rem', color: '#bbb', lineHeight: '1.4', marginBottom: '20px', flexGrow: 1 }}>
                {item.description || <em>No description.</em>}
              </p>

              <div style={{ borderTop: '1px solid #222', paddingTop: '15px', marginTop: 'auto' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '5px' }}>
                    <span style={{ fontSize: '1.2rem' }}>👤</span>
                    <span style={{ fontWeight: 'bold' }}>{item.preferred_name || item.full_name}</span>
                </div>
                <div style={{ display: 'flex', alignItems: 'center', gap: '8px', color: '#888', fontSize: '0.9rem' }}>
                    <span>📍</span>
                    <span>{item.city}, {item.state} ({item.zip_code})</span>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}

      {!loading && filteredItems.length === 0 && (
        <div style={{ textAlign: 'center', padding: '100px 0', color: '#666' }}>
            <h3>No gear found matching those filters.</h3>
            <p>Try broadening your search or checking another zip code.</p>
        </div>
      )}
    </div>
  );
}

// STYLES
const labelStyle = { display: 'block', fontSize: '0.8rem', color: '#888', marginBottom: '5px', fontWeight: 'bold' };
const inputStyle = { width: '100%', padding: '12px', borderRadius: '6px', border: '1px solid #333', backgroundColor: '#000', color: 'white', boxSizing: 'border-box' as 'border-box' };
const cardStyle = { backgroundColor: '#0a0a0a', padding: '25px', borderRadius: '15px', border: '1px solid #222', display: 'flex', flexDirection: 'column' as 'column', transition: 'transform 0.2s' };
const badgeStyle = (status: string) => ({
  fontSize: '0.7rem',
  padding: '4px 10px',
  borderRadius: '20px',
  backgroundColor: status === 'You can keep it' ? '#1a331a' : '#1a2633',
  color: status === 'You can keep it' ? '#99ff99' : '#99ccff',
  fontWeight: 'bold' as 'bold',
  border: '1px solid rgba(255,255,255,0.1)'
});