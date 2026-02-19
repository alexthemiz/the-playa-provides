'use client';

import { useEffect, useState } from 'react';
import { supabase } from '@/lib/supabaseClient';
import Link from 'next/link';
// We'll create this component in the next step
import AddItemModal from '@/components/AddItemModal'; 

export default function InventoryPage() {
  const [items, setItems] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [isModalOpen, setIsModalOpen] = useState(false);
  
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedCategory, setSelectedCategory] = useState('All');
  const [selectedLocation, setSelectedLocation] = useState('All');
  const [selectedStatus, setSelectedStatus] = useState('All');

  useEffect(() => {
    fetchMyInventory();
  }, []);

  async function fetchMyInventory() {
    setLoading(true);
    const { data: { user } } = await supabase.auth.getUser();

    if (user) {
      const { data, error } = await supabase
        .from('gear_items')
        .select(`*, locations (label)`)
        .eq('user_id', user.id)
        .order('created_at', { ascending: false });

      if (error) console.error("Supabase Error:", error);
      else setItems(data || []);
    }
    setLoading(false);
  }

  const uniqueLocations = Array.from(new Set(items.map(item => item.locations?.label || item.location_type).filter(Boolean)));

  const filteredItems = items.filter(item => {
    const itemLabel = item.locations?.label || item.location_type || 'Unset';
    const matchesSearch = item.item_name?.toLowerCase().includes(searchTerm.toLowerCase());
    const matchesCategory = selectedCategory === 'All' || item.category === selectedCategory;
    const matchesLocation = selectedLocation === 'All' || itemLabel === selectedLocation;
    const matchesStatus = selectedStatus === 'All' || item.availability_status === selectedStatus;

    return matchesSearch && matchesCategory && matchesLocation && matchesStatus;
  });

  return (
    <div style={{ padding: '20px', maxWidth: '1400px', margin: '0 auto', color: 'white', fontFamily: 'sans-serif' }}>
      
      {/* HEADER */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '30px' }}>
        <div>
          <h1 style={{ marginBottom: '5px' }}>My Inventory Hub</h1>
          <p style={{ color: '#888', margin: 0 }}>The master list of your playa gear.</p>
        </div>
        <button 
          onClick={() => setIsModalOpen(true)} 
          style={{ backgroundColor: '#00ccff', color: 'black', padding: '10px 20px', borderRadius: '6px', border: 'none', fontWeight: 'bold', cursor: 'pointer' }}
        >
          + Add New Item
        </button>
      </div>

      {/* SEARCH/FILTER BAR (Your existing code) */}
      <div style={filterBarStyle}>
        <div style={{ flex: 2 }}>
          <label style={labelStyle}>Search Gear</label>
          <input placeholder="Search..." style={inputStyle} onChange={(e) => setSearchTerm(e.target.value)} />
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
          </select>
        </div>
        <div>
          <label style={labelStyle}>Location</label>
          <select style={inputStyle} onChange={(e) => setSelectedLocation(e.target.value)}>
            <option>All</option>
            {uniqueLocations.map(loc => <option key={loc as string} value={loc as string}>{loc as string}</option>)}
          </select>
        </div>
      </div>

      {/* THE TABLE */}
      {loading ? (
        <p style={{ textAlign: 'center', color: '#666' }}>Loading...</p>
      ) : (
        <div style={{ overflowX: 'auto', backgroundColor: '#0a0a0a', borderRadius: '12px', border: '1px solid #222' }}>
          <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left' }}>
            <thead>
              <tr style={{ borderBottom: '1px solid #333', color: '#888', fontSize: '0.85rem' }}>
                <th style={thStyle}>Item Name</th>
                <th style={thStyle}>Category</th>
                <th style={thStyle}>Location</th>
                <th style={thStyle}>Status</th>
                <th style={thStyle}>Actions</th>
              </tr>
            </thead>
            <tbody>
              {filteredItems.map(item => (
                <tr key={item.id} style={{ borderBottom: '1px solid #111' }}>
                  <td style={tdStyle}><strong>{item.item_name}</strong></td>
                  <td style={tdStyle}>{item.category}</td>
                  <td style={tdStyle}>{item.locations?.label || item.location_type || 'Unset'}</td>
                  <td style={tdStyle}>
                    <span style={statusBadgeStyle(item.availability_status)}>{item.availability_status}</span>
                  </td>
                  <td style={tdStyle}>
                    <div style={{ display: 'flex', gap: '8px' }}>
                      <button style={{ ...actionButtonStyle, borderColor: '#ff6600', color: '#ff6600' }}>Transfer</button>
                      <button style={{ ...actionButtonStyle, borderColor: '#00ccff', color: '#00ccff' }}>Lend</button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {/* THE MODAL COMPONENT */}
      {isModalOpen && (
        <AddItemModal 
          onClose={() => setIsModalOpen(false)} 
          onSuccess={() => {
            setIsModalOpen(false);
            fetchMyInventory(); // Refresh list after adding
          }} 
        />
      )}
    </div>
  );
}

// Styles (Condensed for brevity)
const thStyle = { padding: '15px' };
const tdStyle = { padding: '15px' };
const labelStyle = { display: 'block', fontSize: '0.75rem', color: '#555', marginBottom: '5px' };
const inputStyle = { width: '100%', padding: '10px', backgroundColor: '#000', border: '1px solid #333', color: 'white', borderRadius: '6px' };
const filterBarStyle = { display: 'flex', gap: '15px', marginBottom: '30px', background: '#111', padding: '20px', borderRadius: '12px' };
const actionButtonStyle = { padding: '4px 12px', fontSize: '0.7rem', background: 'transparent', borderRadius: '4px', cursor: 'pointer', border: '1px solid' };
const statusBadgeStyle = (status: string) => ({ fontSize: '0.7rem', padding: '4px 8px', borderRadius: '4px', border: `1px solid #aaa`, color: '#aaa' });