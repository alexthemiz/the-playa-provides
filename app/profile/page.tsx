'use client';

import { useEffect, useState } from 'react';
import { supabase } from '@/lib/supabaseClient';
import Link from 'next/link';

export default function ProfilePage() {
  const [items, setItems] = useState<any[]>([]);
  const [userName, setUserName] = useState('');
  const [loading, setLoading] = useState(false);

  // 1. On Page Load: Check memory for a saved name
  useEffect(() => {
    const savedName = localStorage.getItem('burner_user_name');
    if (savedName) {
      setUserName(savedName);
      fetchMyItems(savedName); // Auto-fetch if name exists
    }
  }, []);

  // 2. Modified Fetch: Accepts a name directly to handle the auto-load
  async function fetchMyItems(nameToSearch?: string) {
    const targetName = nameToSearch || userName;
    if (!targetName) return;

    // Save to memory for next time
    localStorage.setItem('burner_user_name', targetName);

    setLoading(true);
    const { data, error } = await supabase
      .from('gear_items')
      .select('*')
      .ilike('full_name', `%${targetName}%`)
      .order('created_at', { ascending: false });

    if (!error) setItems(data || []);
    setLoading(false);
  }

  // 3. Clear Memory (Logout-lite)
  function handleSignOut() {
    localStorage.removeItem('burner_user_name');
    setUserName('');
    setItems([]);
  }

  async function cycleStatus(id: number, currentStatus: string) {
    const status = currentStatus || 'Not available';
    let nextStatus = 'You can borrow it';
    if (status === 'You can borrow it') nextStatus = 'You can keep it';
    else if (status === 'You can keep it') nextStatus = 'Not available';
    
    const { error } = await supabase
      .from('gear_items')
      .update({ availability_status: nextStatus })
      .eq('id', id)
      .select();

    if (error) {
      alert("Permission Error: Check Supabase RLS!");
    } else {
      setItems(prev => prev.map(item => item.id === id ? { ...item, availability_status: nextStatus } : item));
    }
  }

  // ... (Keep transferOwnership and deleteItem functions same as before)
  async function transferOwnership(id: number, currentOwner: string) {
    const newOwner = prompt(`Current Owner: ${currentOwner}\n\nTransfer to which Full Name?`);
    if (!newOwner || newOwner === currentOwner) return;
    const { error } = await supabase.from('gear_items').update({ full_name: newOwner, availability_status: 'Not available' }).eq('id', id);
    if (!error) {
      alert(`Gear transferred to ${newOwner}!`);
      setItems(items.filter(item => item.id !== id));
    }
  }

  async function deleteItem(id: number) {
    if (!confirm("Delete this listing permanently?")) return;
    const { error } = await supabase.from('gear_items').delete().eq('id', id);
    if (!error) setItems(items.filter(item => item.id !== id));
  }

  return (
    <div style={{ padding: '20px', maxWidth: '800px', margin: '0 auto', color: 'white', fontFamily: 'sans-serif' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <Link href="/inventory" style={{ color: '#aaa', textDecoration: 'none' }}>← Back to Inventory</Link>
        {userName && (
          <button onClick={handleSignOut} style={{ background: 'none', border: 'none', color: '#ff6666', cursor: 'pointer', fontSize: '0.8rem' }}>
            Switch User / Sign Out
          </button>
        )}
      </div>
      
      <h1 style={{ margin: '20px 0' }}>My Gear Manager</h1>

      <div style={{ marginBottom: '30px', display: 'flex', gap: '10px' }}>
        <input 
          placeholder="Enter your Full Name..."
          style={{ flex: 1, padding: '12px', borderRadius: '4px', border: '1px solid #444', backgroundColor: '#111', color: 'white' }}
          value={userName}
          onChange={(e) => setUserName(e.target.value)}
        />
        <button onClick={() => fetchMyItems()} style={{ padding: '10px 20px', backgroundColor: 'white', color: 'black', border: 'none', borderRadius: '4px', fontWeight: 'bold', cursor: 'pointer' }}>
          Find My Gear
        </button>
      </div>

      {loading && <p style={{ color: '#888' }}>Loading your gear...</p>}

      <div style={{ display: 'grid', gap: '15px' }}>
        {items.map(item => (
          <div key={item.id} style={{ padding: '20px', borderRadius: '8px', border: '1px solid #333', backgroundColor: '#111' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '15px' }}>
              <div>
                <h3 style={{ margin: '0 0 5px 0' }}>{item.item_name}</h3>
                <p style={{ margin: 0, fontSize: '0.8rem', color: '#666' }}>
                  Listed: {item.created_at ? new Date(item.created_at).toLocaleDateString() : 'Unknown'}
                </p>
              </div>
              <button onClick={() => deleteItem(item.id)} style={{ background: 'transparent', border: '1px solid #633', color: '#ff6666', padding: '5px 10px', borderRadius: '4px', cursor: 'pointer', fontSize: '0.75rem' }}>
                Delete
              </button>
            </div>

            <div style={{ display: 'flex', gap: '10px', alignItems: 'center' }}>
              <button 
                onClick={() => cycleStatus(item.id, item.availability_status)} 
                style={{ 
                    flex: 2, padding: '12px', cursor: 'pointer', 
                    background: item.availability_status === 'Not available' ? '#331a1a' : '#1a331a', 
                    color: item.availability_status === 'Not available' ? '#ff9999' : '#99ff99', 
                    border: '1px solid rgba(255,255,255,0.1)', borderRadius: '4px', fontWeight: 'bold', textAlign: 'left'
                }}
              >
                🔄 Status: {item.availability_status || 'NOT SET'}
              </button>

              <button onClick={() => alert(`Info for ${item.item_name}`)} style={{ flex: 1, padding: '12px', cursor: 'pointer', background: '#333', color: 'white', border: 'none', borderRadius: '4px' }}>📜 Info</button>
              <button onClick={() => transferOwnership(item.id, item.full_name)} style={{ padding: '12px', cursor: 'pointer', background: 'transparent', color: '#5588aa', border: '1px solid #224466', borderRadius: '4px', fontSize: '0.85rem' }}>🤝 Transfer</button>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}