'use client';

import { useEffect, useState } from 'react';
import { supabase } from '@/lib/supabaseClient';
import Link from 'next/link';

export default function InventoryPage() {
  const [items, setItems] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  
  // Search & Filter States
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedCategory, setSelectedCategory] = useState('All');
  const [selectedLocation, setSelectedLocation] = useState('All');
  const [selectedStatus, setSelectedStatus] = useState('All');

  useEffect(() => {
    async function fetchMyInventory() {
      setLoading(true);
      const { data: { user } } = await supabase.auth.getUser();

      if (user) {
        const { data, error } = await supabase
          .from('gear_items')
          .select('*')
          .eq('user_id', user.id)
          .order('created_at', { ascending: false });

        if (error) console.error("Supabase Error:", error);
        else setItems(data || []);
      }
      setLoading(false);
    }
    fetchMyInventory();
  }, []);

  // Filter Logic
  const filteredItems = items.filter(item => {
    // We handle "legacy" statuses here just in case they are still in your DB
    const currentStatus = item.availability_status === 'You can keep it' ? 'Available to keep' : 
                         item.availability_status === 'You can borrow it' ? 'Available to borrow' : 
                         item.availability_status;

    const matchesSearch = item.item_name?.toLowerCase().includes(searchTerm.toLowerCase()) || 
                          item.description?.toLowerCase().includes(searchTerm.toLowerCase());
    const matchesCategory = selectedCategory === 'All' || item.category === selectedCategory;
    const matchesLocation = selectedLocation === 'All' || item.location_type === selectedLocation;
    const matchesStatus = selectedStatus === 'All' || currentStatus === selectedStatus;

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
        <div style={{ display: 'flex', gap: '15px' }}>
            <Link href="/" style={{ color: '#aaa', textDecoration: 'none' }}>← Back to Feed</Link>
            <Link href="/list-item" style={{ color: '#00ccff', textDecoration: 'none', fontWeight: 'bold' }}>+ Add New Item</Link>
        </div>
      </div>

      {/* FILTER BAR */}
      <div style={filterBarStyle}>
        <div style={{ flex: 2 }}>
          <label style={labelStyle}>Search Gear</label>
          <input 
            placeholder="Search by name or description..." 
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
          </select>
        </div>
        <div>
          <label style={labelStyle}>Location</label>
          <select style={inputStyle} onChange={(e) => setSelectedLocation(e.target.value)}>
            <option>All</option>
            <option>Home</option>
            <option>Storage</option>
            <option>Business</option>
            <option>Other</option>
          </select>
        </div>
        <div>
          <label style={labelStyle}>Status</label>
          <select style={inputStyle} onChange={(e) => setSelectedStatus(e.target.value)}>
            <option>All</option>
            <option>Available to borrow</option>
            <option>Available to keep</option>
            <option>Lent Out</option>
            <option>Not Available</option>
          </select>
        </div>
      </div>

      {/* TABLE */}
      {loading ? (
        <p style={{ textAlign: 'center', color: '#666' }}>Loading your inventory...</p>
      ) : (
        <div style={{ overflowX: 'auto', backgroundColor: '#0a0a0a', borderRadius: '12px', border: '1px solid #222' }}>
          <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left' }}>
            <thead>
              <tr style={{ borderBottom: '1px solid #333', color: '#888', fontSize: '0.85rem' }}>
                <th style={thStyle}>Item Name</th>
                <th style={thStyle}>Description</th>
                <th style={thStyle}>Condition</th>
                <th style={thStyle}>Category</th>
                <th style={thStyle}>Location</th>
                <th style={thStyle}>Status</th>
                <th style={thStyle}>Transfer / Lend</th>
              </tr>
            </thead>
            <tbody>
              {filteredItems.map(item => {
                // Transform legacy names for the UI display
                const displayStatus = item.availability_status === 'You can keep it' ? 'Available to keep' : 
                                    item.availability_status === 'You can borrow it' ? 'Available to borrow' : 
                                    item.availability_status;

                return (
                  <tr key={item.id} style={{ borderBottom: '1px solid #111' }}>
                    <td style={tdStyle}>
                      <div style={{ fontWeight: 'bold', fontSize: '1.1rem' }}>{item.item_name}</div>
                      <button style={editLinkStyle}>Edit Item Details</button>
                    </td>
                    <td style={{ ...tdStyle, maxWidth: '250px', fontSize: '0.9rem', color: '#bbb' }}>
                      <div style={{ overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                        {item.description || "—"}
                      </div>
                    </td>
                    <td style={{ ...tdStyle, fontSize: '0.9rem' }}>{item.condition || "—"}</td>
                    <td style={tdStyle}>{item.category}</td>
                    <td style={tdStyle}>{item.location_type || 'Unset'}</td>
                    <td style={tdStyle}>
                      <span style={statusBadgeStyle(displayStatus)}>{displayStatus}</span>
                    </td>
                    <td style={tdStyle}>
                      <div style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
                        <button style={{ ...actionButtonStyle, borderColor: '#ff6600', color: '#ff6600' }}>Transfer</button>
                        <button style={{ ...actionButtonStyle, borderColor: '#00ccff', color: '#00ccff' }}>Lend To</button>
                      </div>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}

// STYLES
const thStyle = { padding: '15px', fontWeight: 'bold' as 'bold' };
const tdStyle = { padding: '15px', verticalAlign: 'top' };
const labelStyle = { display: 'block', fontSize: '0.75rem', color: '#555', marginBottom: '5px', fontWeight: 'bold' };
const inputStyle = { width: '100%', padding: '10px', borderRadius: '6px', border: '1px solid #333', backgroundColor: '#000', color: 'white' };
const filterBarStyle = { display: 'flex', gap: '15px', marginBottom: '30px', background: '#111', padding: '20px', borderRadius: '12px', border: '1px solid #222' };
const actionButtonStyle = { height: '28px', padding: '0 12px', fontSize: '0.7rem', backgroundColor: 'transparent', borderRadius: '4px', cursor: 'pointer', border: '1px solid' };
const editLinkStyle = { background: 'none', border: 'none', color: '#00ccff', fontSize: '0.75rem', padding: '0', cursor: 'pointer', textDecoration: 'underline', marginTop: '4px' };

const statusBadgeStyle = (status: string) => {
  let color = '#aaa';
  let bgColor = 'rgba(255, 255, 255, 0.05)';
  
  if (status === 'Available to borrow') { color = '#99ccff'; bgColor = 'rgba(0, 204, 255, 0.1)'; }
  if (status === 'Available to keep') { color = '#99ff99'; bgColor = 'rgba(0, 255, 0, 0.1)'; }
  if (status === 'Lent Out') { color = '#ffcc99'; bgColor = 'rgba(255, 204, 153, 0.1)'; }
  if (status === 'Not Available') { color = '#ff9999'; bgColor = 'rgba(255, 0, 0, 0.1)'; }

  return {
    fontSize: '0.7rem',
    padding: '4px 8px',
    borderRadius: '4px',
    border: `1px solid ${color}`,
    backgroundColor: bgColor,
    color: color,
    whiteSpace: 'nowrap' as 'nowrap'
  };
};