'use client';

import { useEffect, useState } from 'react';
// 1. Swap the import to the SSR-friendly browser client
import { createBrowserClient } from '@supabase/ssr'; 
import Link from 'next/link';
import AddItemModal from '@/components/AddItemModal'; 

export default function InventoryPage() {
  // 2. Initialize the client inside the component
  const supabase = createBrowserClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
  );

  const [items, setItems] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingItem, setEditingItem] = useState<any>(null);
  
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedCategory, setSelectedCategory] = useState('All');
  const [selectedLocation, setSelectedLocation] = useState('All');

  useEffect(() => {
    fetchMyInventory();
  }, []);

  async function fetchMyInventory() {
    setLoading(true);
    // This will now correctly use the cookie session
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

  // ... (Keep ALL your existing CSV, Filter, and Style code exactly as it is) ...

  // CSV Download Logic
  const downloadCSV = () => {
    const headers = ["Item Name", "Description", "Condition", "Category", "Location", "Status"];
    const rows = items.map(item => [
      item.item_name,
      item.description || "",
      item.condition,
      item.category,
      item.locations?.label || item.location_type || "Unset",
      item.availability_status
    ]);

    const csvContent = [headers, ...rows].map(e => e.join(",")).join("\n");
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const link = document.createElement("a");
    const url = URL.createObjectURL(blob);
    link.setAttribute("href", url);
    link.setAttribute("download", "my_playa_inventory.csv");
    link.style.visibility = 'hidden';
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  const filteredItems = items.filter(item => {
    const itemLabel = item.locations?.label || item.location_type || 'Unset';
    return item.item_name?.toLowerCase().includes(searchTerm.toLowerCase()) &&
           (selectedCategory === 'All' || item.category === selectedCategory) &&
           (selectedLocation === 'All' || itemLabel === selectedLocation);
  });

  return (
    <div style={{ padding: '20px', maxWidth: '1400px', margin: '0 auto', color: 'white', fontFamily: 'sans-serif' }}>
      
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '30px' }}>
        <div>
          <h1 style={{ marginBottom: '5px' }}>My Inventory Hub</h1>
          <p style={{ color: '#888', margin: 0 }}>The master list of your playa gear.</p>
        </div>
        <button 
          onClick={() => { setEditingItem(null); setIsModalOpen(true); }} 
          style={addButtonProps}
        >
          + Add New Item
        </button>
      </div>

      {/* FILTERS */}
      <div style={filterBarStyle}>
        <div style={{ flex: 2 }}>
          <label style={labelStyle}>Search Gear</label>
          <input placeholder="Search..." style={inputStyle} onChange={(e) => setSearchTerm(e.target.value)} />
        </div>
        <div>
          <label style={labelStyle}>Category</label>
          <select style={inputStyle} onChange={(e) => setSelectedCategory(e.target.value)}>
            <option>All</option>
            {/* ...categories here... */}
          </select>
        </div>
      </div>

      {/* TABLE */}
      <div style={tableContainerStyle}>
        <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left' }}>
          <thead>
            <tr style={headerRowStyle}>
              <th style={thStyle}>Item Name</th>
              <th style={thStyle}>Description</th>
              <th style={thStyle}>Category</th>
              <th style={thStyle}>Location</th>
              <th style={thStyle}>Status</th>
              <th style={thStyle}>Actions</th>
            </tr>
          </thead>
          <tbody>
            {filteredItems.map(item => (
              <tr key={item.id} style={{ borderBottom: '1px solid #111' }}>
              <td style={tdStyle}>
  <div style={{ display: 'flex', alignItems: 'center', gap: '15px' }}>
    {/* THUMBNAIL START */}
    <div style={{ width: '50px', height: '50px', backgroundColor: '#1a1a1a', borderRadius: '6px', overflow: 'hidden', flexShrink: 0, border: '1px solid #333' }}>
      {item.image_urls && item.image_urls.length > 0 ? (
        <img 
          src={item.image_urls[0]} 
          alt="" 
          style={{ width: '100%', height: '100%', objectFit: 'cover' }} 
        />
      ) : (
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', height: '100%', color: '#333', fontSize: '0.6rem' }}>
          NO PIX
        </div>
      )}
    </div>
    {/* THUMBNAIL END */}

    <div>
      <div style={{ fontWeight: 'bold', fontSize: '1.1rem' }}>{item.item_name}</div>
      <button 
        onClick={() => { setEditingItem(item); setIsModalOpen(true); }}
        style={editLinkStyle}
      >
        Edit Item Details
      </button>
    </div>
  </div>
</td>
                <td style={{ ...tdStyle, color: '#bbb', fontSize: '0.9rem', maxWidth: '300px' }}>
                  {item.description || "—"}
                </td>
                <td style={tdStyle}>{item.category}</td>
                <td style={tdStyle}>{item.locations?.label || item.location_type || 'Unset'}</td>
                <td style={tdStyle}>
                  <span style={statusBadgeStyle}>{item.availability_status}</span>
                </td>
                <td style={tdStyle}>
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
                    <button style={{ ...actionButtonStyle, borderColor: '#ff6600', color: '#ff6600' }}>Transfer</button>
                    <button style={{ ...actionButtonStyle, borderColor: '#00ccff', color: '#00ccff' }}>Lend To</button>
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {/* CSV DOWNLOAD OPTION */}
      <div style={{ marginTop: '20px', textAlign: 'right' }}>
        <button onClick={downloadCSV} style={csvButtonStyle}>
          📥 Download as .CSV
        </button>
      </div>

      {isModalOpen && (
        <AddItemModal 
          itemToEdit={editingItem} // Pass the item if we are editing
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

// STYLES
const thStyle = { padding: '15px', color: '#888', fontSize: '0.85rem' };
const tdStyle = { padding: '15px', verticalAlign: 'top' };
const filterBarStyle = { display: 'flex', gap: '15px', marginBottom: '30px', background: '#111', padding: '20px', borderRadius: '12px' };
const inputStyle = { width: '100%', padding: '10px', backgroundColor: '#000', border: '1px solid #333', color: 'white', borderRadius: '6px' };
const labelStyle = { display: 'block', fontSize: '0.75rem', color: '#555', marginBottom: '5px' };
const tableContainerStyle = { overflowX: 'auto' as 'auto', backgroundColor: '#0a0a0a', borderRadius: '12px', border: '1px solid #222' };
const headerRowStyle = { borderBottom: '1px solid #333' };
const editLinkStyle = { background: 'none', border: 'none', color: '#00ccff', fontSize: '0.75rem', padding: '0', cursor: 'pointer', textDecoration: 'underline', marginTop: '4px' };
const actionButtonStyle = { height: '28px', padding: '0 12px', fontSize: '0.7rem', backgroundColor: 'transparent', borderRadius: '4px', cursor: 'pointer', border: '1px solid' };
const csvButtonStyle = { background: 'none', border: 'none', color: '#888', cursor: 'pointer', fontSize: '0.9rem', textDecoration: 'underline' };
const addButtonProps = { backgroundColor: '#00ccff', color: 'black', padding: '10px 20px', borderRadius: '6px', border: 'none', fontWeight: 'bold' as 'bold', cursor: 'pointer' };
const statusBadgeStyle = { fontSize: '0.7rem', padding: '4px 8px', borderRadius: '4px', border: '1px solid #aaa', color: '#aaa' };