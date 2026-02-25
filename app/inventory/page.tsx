'use client';

import { useEffect, useState } from 'react';
import { supabase } from '@/lib/supabaseClient';
import AddItemModal from '@/components/AddItemModal';

export default function InventoryPage() {
  const [items, setItems] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingItem, setEditingItem] = useState<any>(null);
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedCategory, setSelectedCategory] = useState('All');

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
      if (error) console.error('Supabase Error:', error);
      else setItems(data || []);
    }
    setLoading(false);
  }

  const downloadCSV = () => {
    const headers = ['Item Name', 'Description', 'Condition', 'Category', 'Location', 'Status'];
    const rows = items.map(item => [
      item.item_name,
      item.description || '',
      item.condition,
      item.category,
      item.locations?.label || item.location_type || 'Unset',
      item.availability_status,
    ]);
    const csvContent = [headers, ...rows].map(e => e.join(',')).join('\n');
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const link = document.createElement('a');
    const url = URL.createObjectURL(blob);
    link.setAttribute('href', url);
    link.setAttribute('download', 'my_playa_inventory.csv');
    link.style.visibility = 'hidden';
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  const filteredItems = items.filter(item => {
    return (
      item.item_name?.toLowerCase().includes(searchTerm.toLowerCase()) &&
      (selectedCategory === 'All' || item.category === selectedCategory)
    );
  });

  function renderActionButton(item: any) {
    const status = item.availability_status;
    if (status === 'Available to Borrow') {
      return (
        <button style={lendButtonStyle}>
          Lend To
        </button>
      );
    }
    if (status === 'Available to Keep') {
      return (
        <button style={transferButtonStyle}>
          Transfer To
        </button>
      );
    }
    return (
      <button style={makeAvailableButtonStyle}>
        Make Available
      </button>
    );
  }

  return (
    <div style={{ padding: '20px', maxWidth: '1400px', margin: '0 auto', backgroundColor: '#fff', fontFamily: 'sans-serif' }}>

      {/* HEADER */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '30px' }}>
        <div>
          <h1 style={{ marginBottom: '5px', color: '#2D241E' }}>My Inventory Hub</h1>
          <p style={{ color: '#888', margin: 0 }}>The master list of your playa gear.</p>
        </div>
        <button
          onClick={() => { setEditingItem(null); setIsModalOpen(true); }}
          style={addButtonStyle}
        >
          + Add New Item
        </button>
      </div>

      {/* FILTERS */}
      <div style={filterBarStyle}>
        <div style={{ flex: 2 }}>
          <label style={labelStyle}>Search Gear</label>
          <input
            placeholder="Search..."
            style={inputStyle}
            onChange={(e) => setSearchTerm(e.target.value)}
          />
        </div>
        <div>
          <label style={labelStyle}>Category</label>
          <select style={inputStyle} onChange={(e) => setSelectedCategory(e.target.value)}>
            <option>All</option>
            <option>Environment</option>
            <option>Donations</option>
            <option>Community Service</option>
            <option>Art</option>
            <option>Transportation</option>
            <option>Other</option>
          </select>
        </div>
      </div>

      {/* TABLE */}
      {loading ? (
        <p style={{ color: '#888', textAlign: 'center', padding: '40px' }}>Loading your gear...</p>
      ) : (
        <div style={tableContainerStyle}>
          <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left' as const }}>
            <thead>
              <tr style={headerRowStyle}>
                <th style={thStyle}>Item Name</th>
                <th style={thStyle}>Description</th>
                <th style={thStyle}>Category</th>
                <th style={thStyle}>Location</th>
                <th style={thStyle}>Status</th>
                <th style={thStyle}>Action</th>
              </tr>
            </thead>
            <tbody>
              {filteredItems.length === 0 ? (
                <tr>
                  <td colSpan={6} style={{ padding: '40px', textAlign: 'center' as const, color: '#888' }}>
                    No items found. Add something to your inventory!
                  </td>
                </tr>
              ) : (
                filteredItems.map(item => (
                  <tr key={item.id} style={rowStyle}>
                    {/* ITEM NAME + THUMBNAIL */}
                    <td style={tdStyle}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '15px' }}>
                        <div style={thumbnailStyle}>
                          {item.image_urls && item.image_urls.length > 0 ? (
                            <img
                              src={item.image_urls[0]}
                              alt=""
                              style={{ width: '100%', height: '100%', objectFit: 'cover' as const }}
                            />
                          ) : (
                            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', height: '100%', color: '#ccc', fontSize: '0.6rem' }}>
                              NO PIX
                            </div>
                          )}
                        </div>
                        <div>
                          <div style={{ fontWeight: 'bold', fontSize: '1rem', color: '#2D241E' }}>{item.item_name}</div>
                          <button
                            onClick={() => { setEditingItem(item); setIsModalOpen(true); }}
                            style={editLinkStyle}
                          >
                            Edit Details
                          </button>
                        </div>
                      </div>
                    </td>

                    {/* DESCRIPTION */}
                    <td style={{ ...tdStyle, color: '#666', fontSize: '0.9rem', maxWidth: '300px' }}>
                      {item.description || '—'}
                    </td>

                    {/* CATEGORY */}
                    <td style={tdStyle}>{item.category}</td>

                    {/* LOCATION */}
                    <td style={tdStyle}>{item.locations?.label || item.location_type || 'Unset'}</td>

                    {/* STATUS BADGE */}
                    <td style={tdStyle}>
                      <span style={getStatusBadgeStyle(item.availability_status)}>
                        {item.availability_status}
                      </span>
                    </td>

                    {/* ACTION BUTTON */}
                    <td style={tdStyle}>
                      {renderActionButton(item)}
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      )}

      {/* CSV DOWNLOAD */}
      <div style={{ marginTop: '20px', textAlign: 'right' as const }}>
        <button onClick={downloadCSV} style={csvButtonStyle}>
          Download as .CSV
        </button>
      </div>

      {isModalOpen && (
        <AddItemModal
          itemToEdit={editingItem}
          onClose={() => setIsModalOpen(false)}
          onSuccess={() => {
            setIsModalOpen(false);
            fetchMyInventory();
          }}
        />
      )}
    </div>
  );
}

// --- STATUS BADGE (color-coded by status) ---
function getStatusBadgeStyle(status: string): React.CSSProperties {
  if (status === 'Available to Borrow') {
    return { fontSize: '0.7rem', padding: '4px 8px', borderRadius: '4px', border: '1px solid #00ccff', color: '#00aacc', backgroundColor: '#e6faff', whiteSpace: 'nowrap' as const };
  }
  if (status === 'Available to Keep') {
    return { fontSize: '0.7rem', padding: '4px 8px', borderRadius: '4px', border: '1px solid #C08261', color: '#a06040', backgroundColor: '#fdf3ec', whiteSpace: 'nowrap' as const };
  }
  return { fontSize: '0.7rem', padding: '4px 8px', borderRadius: '4px', border: '1px solid #ddd', color: '#999', backgroundColor: '#f5f5f5', whiteSpace: 'nowrap' as const };
}

// --- STYLES ---
const addButtonStyle: React.CSSProperties = { backgroundColor: '#00ccff', color: '#000', padding: '10px 20px', borderRadius: '6px', border: 'none', fontWeight: 'bold', cursor: 'pointer' };
const filterBarStyle: React.CSSProperties = { display: 'flex', gap: '15px', marginBottom: '30px', background: '#f7f7f7', padding: '20px', borderRadius: '12px', border: '1px solid #eee' };
const labelStyle: React.CSSProperties = { display: 'block', fontSize: '0.75rem', color: '#888', marginBottom: '5px' };
const inputStyle: React.CSSProperties = { width: '100%', padding: '10px', backgroundColor: '#fff', border: '1px solid #ddd', color: '#2D241E', borderRadius: '6px', boxSizing: 'border-box' };
const tableContainerStyle: React.CSSProperties = { overflowX: 'auto', backgroundColor: '#fff', borderRadius: '12px', border: '1px solid #e5e5e5' };
const headerRowStyle: React.CSSProperties = { borderBottom: '1px solid #e5e5e5', backgroundColor: '#fafafa' };
const thStyle: React.CSSProperties = { padding: '15px', color: '#999', fontSize: '0.8rem', fontWeight: 600, textTransform: 'uppercase' };
const tdStyle: React.CSSProperties = { padding: '15px', verticalAlign: 'middle', color: '#2D241E' };
const rowStyle: React.CSSProperties = { borderBottom: '1px solid #f0f0f0' };
const thumbnailStyle: React.CSSProperties = { width: '50px', height: '50px', backgroundColor: '#f0f0f0', borderRadius: '6px', overflow: 'hidden', flexShrink: 0, border: '1px solid #e5e5e5' };
const editLinkStyle: React.CSSProperties = { background: 'none', border: 'none', color: '#00aacc', fontSize: '0.75rem', padding: 0, cursor: 'pointer', textDecoration: 'underline', marginTop: '4px' };
const csvButtonStyle: React.CSSProperties = { background: 'none', border: 'none', color: '#aaa', cursor: 'pointer', fontSize: '0.85rem', textDecoration: 'underline' };

// Action buttons
const lendButtonStyle: React.CSSProperties = { height: '30px', padding: '0 14px', fontSize: '0.75rem', backgroundColor: '#00ccff', color: '#000', border: 'none', borderRadius: '5px', cursor: 'pointer', fontWeight: 'bold', whiteSpace: 'nowrap' };
const transferButtonStyle: React.CSSProperties = { height: '30px', padding: '0 14px', fontSize: '0.75rem', backgroundColor: 'transparent', color: '#00aacc', border: '1.5px solid #00ccff', borderRadius: '5px', cursor: 'pointer', fontWeight: 'bold', whiteSpace: 'nowrap' };
const makeAvailableButtonStyle: React.CSSProperties = { height: '30px', padding: '0 14px', fontSize: '0.75rem', backgroundColor: '#f0f0f0', color: '#666', border: '1px solid #ddd', borderRadius: '5px', cursor: 'pointer', fontWeight: 'normal', whiteSpace: 'nowrap' };
