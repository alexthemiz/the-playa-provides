'use client';

import { useEffect, useState, useRef } from 'react';
import { supabase } from '@/lib/supabaseClient';
import AddItemModal from '@/components/AddItemModal';
import WelcomeModal from '@/components/WelcomeModal';
import ImportSpreadsheetModal from '@/components/ImportSpreadsheetModal';
import TransferModal from '@/components/TransferModal';
import LendModal from '@/components/LendModal';

export default function InventoryPage() {
  const [items, setItems] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingItem, setEditingItem] = useState<any>(null);
  const [userId, setUserId] = useState<string | null>(null);
  const [showWelcome, setShowWelcome] = useState(false);
  const [showImport, setShowImport] = useState(false);
  const [displayName, setDisplayName] = useState<string | null>(null);
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedCategory, setSelectedCategory] = useState('All');
  const [selectedLocations, setSelectedLocations] = useState<string[]>([]);
  const [locationDropdownOpen, setLocationDropdownOpen] = useState(false);
  const locationDropdownRef = useRef<HTMLDivElement>(null);

  // Transfer & Loan state
  const [activeTransfers, setActiveTransfers] = useState<any[]>([]);
  const [activeLoans, setActiveLoans] = useState<any[]>([]);
  const [inboundTransfers, setInboundTransfers] = useState<any[]>([]);
  const [inboundLoans, setInboundLoans] = useState<any[]>([]);
  const [transferItem, setTransferItem] = useState<any>(null);
  const [lendItem, setLendItem] = useState<any>(null);

  useEffect(() => {
    fetchMyInventory();
  }, []);

  // Close location dropdown on outside click
  useEffect(() => {
    function handleClickOutside(e: MouseEvent) {
      if (locationDropdownRef.current && !locationDropdownRef.current.contains(e.target as Node)) {
        setLocationDropdownOpen(false);
      }
    }
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  async function fetchMyInventory() {
    setLoading(true);
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (user) {
        setUserId(user.id);
        const { data: profileData } = await supabase.from('profiles').select('preferred_name').eq('id', user.id).maybeSingle();
        if (profileData?.preferred_name) setDisplayName(profileData.preferred_name);

        const welcomeKey = `tpp_welcomed_${user.id}`;
        if (!localStorage.getItem(welcomeKey)) setShowWelcome(true);

        const { data, error } = await supabase
          .from('gear_items')
          .select(`*, locations (label)`)
          .eq('user_id', user.id)
          .order('created_at', { ascending: false });
        if (error) console.error('Supabase Error:', error);
        else setItems(data || []);

        // Fetch active transfers (owner side)
        const { data: transferData } = await supabase
          .from('item_transfers')
          .select('id, item_id, status, owner_confirmed, recipient_confirmed, recipient:profiles!item_transfers_recipient_id_fkey(preferred_name, username)')
          .eq('owner_id', user.id)
          .in('status', ['pending_handover']);
        setActiveTransfers(transferData || []);

        // Fetch active loans (owner side)
        const { data: loanData } = await supabase
          .from('item_loans')
          .select('id, item_id, status, owner_confirmed_pickup, borrower_confirmed_pickup, return_by, borrower:profiles!item_loans_borrower_id_fkey(preferred_name, username)')
          .eq('owner_id', user.id)
          .in('status', ['pending_handover', 'active', 'return_pending']);
        setActiveLoans(loanData || []);

        // Inbound transfers (recipient side)
        const { data: inboundTransferData } = await supabase
          .from('item_transfers')
          .select('id, item_id, status, owner_confirmed, recipient_confirmed, owner:profiles!item_transfers_owner_id_fkey(preferred_name, username), gear_items(item_name)')
          .eq('recipient_id', user.id)
          .in('status', ['pending_handover']);
        setInboundTransfers(inboundTransferData || []);

        // Inbound loans (borrower side)
        const { data: inboundLoanData } = await supabase
          .from('item_loans')
          .select('id, item_id, status, owner_confirmed_pickup, borrower_confirmed_pickup, borrower_confirmed_return, return_by, owner:profiles!item_loans_owner_id_fkey(preferred_name, username), gear_items(item_name)')
          .eq('borrower_id', user.id)
          .in('status', ['pending_handover', 'active']);
        setInboundLoans(inboundLoanData || []);
      }
    } catch (err) {
      console.error('fetchMyInventory error:', err);
    } finally {
      setLoading(false);
    }
  }

  async function updateStatus(itemId: number, newStatus: string) {
    const { error } = await supabase
      .from('gear_items')
      .update({
        availability_status: newStatus,
        visibility: newStatus === 'Not Available' ? 'private' : 'public',
      })
      .eq('id', itemId);
    if (!error) {
      setItems(prev => prev.map(i => i.id === itemId ? {
        ...i,
        availability_status: newStatus,
        visibility: newStatus === 'Not Available' ? 'private' : 'public',
      } : i));
    }
  }

  async function updateVisibility(itemId: number, newVisibility: string) {
    const { error } = await supabase
      .from('gear_items')
      .update({ visibility: newVisibility })
      .eq('id', itemId);
    if (!error) {
      setItems(prev => prev.map(i => i.id === itemId ? { ...i, visibility: newVisibility } : i));
    }
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

  // --- Transfer & Loan action handlers ---

  async function handleOwnerConfirmTransfer(transfer: any) {
    const { error } = await supabase
      .from('item_transfers')
      .update({ owner_confirmed: true })
      .eq('id', transfer.id);
    if (!error) {
      await supabase.functions.invoke('send-transfer-notification', {
        body: { type: 'owner_confirmed', transfer_id: transfer.id },
      });
      fetchMyInventory();
    }
  }

  async function handleCancelTransfer(transfer: any) {
    const { error } = await supabase
      .from('item_transfers')
      .update({ status: 'cancelled' })
      .eq('id', transfer.id);
    if (!error) fetchMyInventory();
  }

  async function handleSendTransferReminder(transfer: any) {
    await supabase.functions.invoke('send-transfer-notification', {
      body: { type: 'owner_confirmed', transfer_id: transfer.id },
    });
  }

  async function handleOwnerConfirmPickup(loan: any) {
    const { error } = await supabase
      .from('item_loans')
      .update({ owner_confirmed_pickup: true })
      .eq('id', loan.id);
    if (!error) {
      await supabase.functions.invoke('send-loan-notification', {
        body: { type: 'owner_confirmed_pickup', loan_id: loan.id },
      });
      fetchMyInventory();
    }
  }

  async function handleCancelLoan(loan: any) {
    const { error } = await supabase
      .from('item_loans')
      .update({ status: 'cancelled' })
      .eq('id', loan.id);
    if (!error) fetchMyInventory();
  }

  async function handleSendLoanReminder(loan: any) {
    await supabase.functions.invoke('send-loan-notification', {
      body: { type: 'owner_confirmed_pickup', loan_id: loan.id },
    });
  }

  async function handleDisputeReturn(loan: any) {
    await supabase
      .from('item_loans')
      .update({ status: 'disputed' })
      .eq('id', loan.id);
    fetchMyInventory();
  }

  async function handleOwnerConfirmReturn(loan: any) {
    await supabase
      .from('item_loans')
      .update({ owner_confirmed_return: true, status: 'complete' })
      .eq('id', loan.id);
    fetchMyInventory();
  }

  async function handleRecipientConfirmTransfer(transfer: any) {
    // Use a SECURITY DEFINER RPC to atomically transfer ownership + mark complete.
    // Direct client-side UPDATE on gear_items is blocked by RLS (recipient doesn't
    // own the row yet), so we delegate to a DB function that runs with elevated privileges
    // after verifying the caller is the actual recipient.
    const { error } = await supabase.rpc('confirm_transfer_receipt', { p_transfer_id: transfer.id });
    if (!error) {
      const { data: newItem } = await supabase
        .from('gear_items')
        .select('*, locations(label)')
        .eq('id', transfer.item_id)
        .single();
      if (newItem) setItems(prev => [newItem, ...prev]);
      setInboundTransfers(prev => prev.filter(t => t.id !== transfer.id));
    } else {
      console.error('confirm_transfer_receipt error:', error.message);
    }
  }

  async function handleBorrowerConfirmPickup(loan: any) {
    const { error } = await supabase
      .from('item_loans')
      .update({ borrower_confirmed_pickup: true, status: 'active' })
      .eq('id', loan.id);
    if (!error) fetchMyInventory();
  }

  async function handleBorrowerConfirmReturn(loan: any) {
    const { error } = await supabase
      .from('item_loans')
      .update({ borrower_confirmed_return: true, status: 'return_pending' })
      .eq('id', loan.id);
    if (!error) {
      await supabase.functions.invoke('send-loan-notification', {
        body: { type: 'borrower_confirmed_return', loan_id: loan.id },
      });
      fetchMyInventory();
    }
  }

  // --- Filters ---

  const uniqueLocations = Array.from(new Set(
    items.map(item => item.locations?.label || item.location_type || 'Unset')
  )).sort();

  const toggleLocation = (loc: string) => {
    setSelectedLocations(prev =>
      prev.includes(loc) ? prev.filter(l => l !== loc) : [...prev, loc]
    );
  };

  const filteredItems = items.filter(item => {
    const itemLocation = item.locations?.label || item.location_type || 'Unset';
    const matchesSearch = item.item_name?.toLowerCase().includes(searchTerm.toLowerCase());
    const matchesCategory = selectedCategory === 'All' || item.category === selectedCategory;
    const matchesLocation = selectedLocations.length === 0 || selectedLocations.includes(itemLocation);
    return matchesSearch && matchesCategory && matchesLocation;
  });

  function renderActionButton(item: any) {
    const status = item.availability_status;

    // Check for active transfer on this item
    const transfer = activeTransfers.find(t => t.item_id === item.id);
    if (transfer) {
      const recipientName = transfer.recipient?.preferred_name || transfer.recipient?.username || 'recipient';
      if (transfer.owner_confirmed) {
        return (
          <div style={{ display: 'flex', flexDirection: 'column' as const, gap: '4px' }}>
            <span style={pendingBadgeStyle}>Pending Handover</span>
            <span style={{ fontSize: '0.75rem', color: '#888' }}>Waiting for {recipientName}…</span>
            <button onClick={() => handleSendTransferReminder(transfer)} style={reminderButtonStyle}>Send Reminder</button>
          </div>
        );
      }
      return (
        <div style={{ display: 'flex', flexDirection: 'column' as const, gap: '4px' }}>
          <span style={pendingBadgeStyle}>Pending Handover</span>
          <button onClick={() => handleOwnerConfirmTransfer(transfer)} style={handsOverButtonStyle}>I've Handed It Over</button>
          <button onClick={() => handleCancelTransfer(transfer)} style={cancelActionButtonStyle}>Cancel</button>
        </div>
      );
    }

    // Check for active loan on this item (pending_handover only — active/return_pending show in the section below)
    const loan = activeLoans.find(l => l.item_id === item.id && l.status === 'pending_handover');
    if (loan) {
      const borrowerName = loan.borrower?.preferred_name || loan.borrower?.username || 'borrower';
      if (loan.owner_confirmed_pickup) {
        return (
          <div style={{ display: 'flex', flexDirection: 'column' as const, gap: '4px' }}>
            <span style={pendingBadgeStyle}>Pending Handover</span>
            <span style={{ fontSize: '0.75rem', color: '#888' }}>Waiting for {borrowerName}…</span>
            <button onClick={() => handleSendLoanReminder(loan)} style={reminderButtonStyle}>Send Reminder</button>
          </div>
        );
      }
      return (
        <div style={{ display: 'flex', flexDirection: 'column' as const, gap: '4px' }}>
          <span style={pendingBadgeStyle}>Pending Handover</span>
          <button onClick={() => handleOwnerConfirmPickup(loan)} style={handsOverButtonStyle}>I've Handed It Over</button>
          <button onClick={() => handleCancelLoan(loan)} style={cancelActionButtonStyle}>Cancel</button>
        </div>
      );
    }

    if (status === 'Available to Borrow') return <button onClick={() => setLendItem(item)} style={lendButtonStyle}>Lend To</button>;
    if (status === 'Available to Keep') return <button onClick={() => setTransferItem(item)} style={transferButtonStyle}>Transfer To</button>;
    return <span style={{ color: '#bbb', fontSize: '0.8rem' }}>N/A</span>;
  }

  const locationButtonLabel = selectedLocations.length === 0
    ? 'All Locations'
    : selectedLocations.length === 1
    ? selectedLocations[0]
    : `${selectedLocations.length} Locations`;

  return (
    <div style={{ padding: '20px', maxWidth: '1400px', margin: '0 auto', backgroundColor: '#fff', fontFamily: 'sans-serif' }}>

      {/* HEADER */}
      <div style={{ marginBottom: '16px' }}>
        <h1 style={{ margin: 0, color: '#2D241E', fontWeight: 'bold' }}>{displayName ? `${displayName} Could Provide: these Items` : 'My Inventory'}</h1>
      </div>

      {/* FILTERS + ADD BUTTON */}
      <div style={filterBarStyle}>
        {/* Search */}
        <div style={{ flex: 3 }}>
          <label style={labelStyle}>Search Your List</label>
          <input
            placeholder="Search..."
            style={inputStyle}
            onChange={(e) => setSearchTerm(e.target.value)}
          />
        </div>

        {/* Category */}
        <div style={{ flex: 1, minWidth: '120px' }}>
          <label style={labelStyle}>Category</label>
          <select style={inputStyle} onChange={(e) => setSelectedCategory(e.target.value)}>
            <option>All</option>
            <option>Bikes &amp; Transport</option>
            <option>Clothing &amp; Fun</option>
            <option>Kitchen &amp; Water</option>
            <option>Power &amp; Lighting</option>
            <option>Safety &amp; First Aid</option>
            <option>Shelter &amp; Shade</option>
            <option>Tools &amp; Hardware</option>
            <option>Miscellaneous</option>
          </select>
        </div>

        {/* Location multi-select */}
        <div style={{ flex: 1, minWidth: '140px', position: 'relative' as const }} ref={locationDropdownRef}>
          <label style={labelStyle}>Filter by Location</label>
          <button
            onClick={() => setLocationDropdownOpen(o => !o)}
            style={{ ...inputStyle, textAlign: 'left' as const, cursor: 'pointer', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}
          >
            <span style={{ color: selectedLocations.length > 0 ? '#2D241E' : '#aaa' }}>{locationButtonLabel}</span>
            <span style={{ fontSize: '0.6rem', color: '#aaa' }}>▼</span>
          </button>
          {locationDropdownOpen && (
            <div style={locationDropdownStyle}>
              {uniqueLocations.length === 0 ? (
                <p style={{ padding: '10px', color: '#aaa', fontSize: '0.8rem', margin: 0 }}>No locations yet</p>
              ) : (
                uniqueLocations.map(loc => (
                  <label key={loc} style={locationOptionStyle}>
                    <input
                      type="checkbox"
                      checked={selectedLocations.includes(loc)}
                      onChange={() => toggleLocation(loc)}
                      style={{ cursor: 'pointer' }}
                    />
                    <span style={{ fontSize: '0.85rem', color: '#2D241E' }}>{loc}</span>
                  </label>
                ))
              )}
              {selectedLocations.length > 0 && (
                <button
                  onClick={() => setSelectedLocations([])}
                  style={{ width: '100%', padding: '6px', marginTop: '4px', fontSize: '0.75rem', color: '#00aacc', background: 'none', border: 'none', cursor: 'pointer', textAlign: 'left' as const }}
                >
                  Clear filter
                </button>
              )}
            </div>
          )}
        </div>

        {/* Add + Import buttons */}
        <div style={{ display: 'flex', alignItems: 'flex-end', gap: '8px' }}>
          <button
            onClick={() => setShowImport(true)}
            style={importButtonStyle}
          >
            Import Inventory
          </button>
          <button
            onClick={() => { setEditingItem(null); setIsModalOpen(true); }}
            style={addButtonStyle}
          >
            + Add New Item
          </button>
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
                <th style={thStyle}>Category</th>
                <th style={thStyle}>Location</th>
                <th style={thStyle}>Description</th>
                <th style={{ ...thStyle, width: '160px' }}>Status</th>
                <th style={thStyle}>Action</th>
              </tr>
            </thead>
            <tbody>
              {filteredItems.length === 0 ? (
                <tr>
                  <td colSpan={6} style={{ padding: '40px', textAlign: 'center' as const, color: '#888', fontSize: '0.9rem' }}>
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
                          <div style={{ fontWeight: 'bold', color: '#2D241E' }}>{item.item_name}</div>
                          <button
                            onClick={() => { setEditingItem(item); setIsModalOpen(true); }}
                            style={editLinkStyle}
                          >
                            Edit Details
                          </button>
                        </div>
                      </div>
                    </td>

                    {/* CATEGORY */}
                    <td style={tdStyle}>{item.category}</td>

                    {/* LOCATION */}
                    <td style={tdStyle}>{item.locations?.label || item.location_type || 'Unset'}</td>

                    {/* DESCRIPTION */}
                    <td style={{ ...tdStyle, maxWidth: '280px', fontSize: '0.8rem' }}>
                      {item.description || '—'}
                    </td>

                    {/* STATUS TOGGLE */}
                    <td style={{ ...tdStyle, width: '160px' }}>
                      <div style={{ display: 'flex', gap: '4px' }}>
                        {[
                          { value: 'Available to Borrow', label: 'Borrow' },
                          { value: 'Available to Keep', label: 'Keep' },
                          { value: 'Not Available', label: 'Private' },
                        ].map(opt => (
                          <button
                            key={opt.value}
                            onClick={() => updateStatus(item.id, opt.value)}
                            style={getStatusToggleStyle(opt.value, item.availability_status)}
                          >
                            {opt.label}
                          </button>
                        ))}
                      </div>
                      {item.availability_status !== 'Not Available' && (
                        <select
                          value={item.visibility || 'public'}
                          onChange={e => updateVisibility(item.id, e.target.value)}
                          style={visibilitySelectStyle}
                        >
                          <option value="public">Everyone</option>
                          <option value="followers">People you follow</option>
                          <option value="campmates">Campmates only</option>
                          <option value="followers_and_campmates">Followers &amp; campmates</option>
                        </select>
                      )}
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

      {/* ITEMS OUT ON LOAN */}
      {activeLoans.filter(l => ['active', 'return_pending'].includes(l.status)).length > 0 && (
        <div style={{ marginTop: '40px' }}>
          <h2 style={{ color: '#2D241E', fontSize: '1.1rem', fontWeight: 700, marginBottom: '16px' }}>
            Items Out on Loan
          </h2>
          <div style={tableContainerStyle}>
            <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left' as const }}>
              <thead>
                <tr style={headerRowStyle}>
                  <th style={thStyle}>Item</th>
                  <th style={thStyle}>Borrower</th>
                  <th style={thStyle}>Return By</th>
                  <th style={thStyle}>Status</th>
                  <th style={thStyle}>Action</th>
                </tr>
              </thead>
              <tbody>
                {activeLoans
                  .filter(l => ['active', 'return_pending'].includes(l.status))
                  .map(loan => {
                    const borrowerName = loan.borrower?.preferred_name || loan.borrower?.username || '—';
                    const returnBy = loan.return_by ? new Date(loan.return_by).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' }) : '—';
                    const itemName = items.find(i => i.id === loan.item_id)?.item_name || '—';
                    return (
                      <tr key={loan.id} style={rowStyle}>
                        <td style={{ ...tdStyle, fontWeight: 600, color: '#2D241E' }}>{itemName}</td>
                        <td style={tdStyle}>{borrowerName}</td>
                        <td style={tdStyle}>{returnBy}</td>
                        <td style={tdStyle}>
                          <span style={{ fontSize: '0.8rem', color: loan.status === 'return_pending' ? '#92400e' : '#555' }}>
                            {loan.status === 'return_pending' ? 'Return Pending' : 'Out on Loan'}
                          </span>
                        </td>
                        <td style={tdStyle}>
                          {loan.status === 'return_pending' && (
                            <div style={{ display: 'flex', gap: '6px' }}>
                              <button onClick={() => handleOwnerConfirmReturn(loan)} style={handsOverButtonStyle}>Got It Back</button>
                              <button onClick={() => handleDisputeReturn(loan)} style={cancelActionButtonStyle}>Dispute</button>
                            </div>
                          )}
                        </td>
                      </tr>
                    );
                  })}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* ITEMS BEING TRANSFERRED TO ME */}
      {inboundTransfers.length > 0 && (
        <div style={{ marginTop: '40px' }}>
          <h2 style={{ color: '#2D241E', fontSize: '1.1rem', fontWeight: 700, marginBottom: '16px' }}>
            Items Being Transferred to Me
          </h2>
          <div style={tableContainerStyle}>
            <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left' as const }}>
              <thead>
                <tr style={headerRowStyle}>
                  <th style={thStyle}>Item</th>
                  <th style={thStyle}>From</th>
                  <th style={thStyle}>Status</th>
                  <th style={thStyle}>Action</th>
                </tr>
              </thead>
              <tbody>
                {inboundTransfers.map(transfer => {
                  const ownerName = transfer.owner?.preferred_name || transfer.owner?.username || '—';
                  const itemName = transfer.gear_items?.item_name || '—';
                  return (
                    <tr key={transfer.id} style={rowStyle}>
                      <td style={{ ...tdStyle, fontWeight: 600, color: '#2D241E' }}>{itemName}</td>
                      <td style={tdStyle}>{ownerName}</td>
                      <td style={tdStyle}>
                        <span style={{ fontSize: '0.8rem', color: '#555' }}>
                          {transfer.owner_confirmed ? 'Handed over — confirm receipt' : 'Pending handover'}
                        </span>
                      </td>
                      <td style={tdStyle}>
                        {transfer.owner_confirmed && (
                          <button onClick={() => handleRecipientConfirmTransfer(transfer)} style={handsOverButtonStyle}>
                            Got It
                          </button>
                        )}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* ITEMS I'M BORROWING */}
      {inboundLoans.length > 0 && (
        <div style={{ marginTop: '40px' }}>
          <h2 style={{ color: '#2D241E', fontSize: '1.1rem', fontWeight: 700, marginBottom: '16px' }}>
            Items I'm Borrowing
          </h2>
          <div style={tableContainerStyle}>
            <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left' as const }}>
              <thead>
                <tr style={headerRowStyle}>
                  <th style={thStyle}>Item</th>
                  <th style={thStyle}>From</th>
                  <th style={thStyle}>Return By</th>
                  <th style={thStyle}>Status</th>
                  <th style={thStyle}>Action</th>
                </tr>
              </thead>
              <tbody>
                {inboundLoans.map(loan => {
                  const ownerName = loan.owner?.preferred_name || loan.owner?.username || '—';
                  const itemName = loan.gear_items?.item_name || '—';
                  const returnBy = loan.return_by ? new Date(loan.return_by).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' }) : '—';
                  return (
                    <tr key={loan.id} style={rowStyle}>
                      <td style={{ ...tdStyle, fontWeight: 600, color: '#2D241E' }}>{itemName}</td>
                      <td style={tdStyle}>{ownerName}</td>
                      <td style={tdStyle}>{returnBy}</td>
                      <td style={tdStyle}>
                        <span style={{ fontSize: '0.8rem', color: '#555' }}>
                          {loan.status === 'pending_handover'
                            ? loan.owner_confirmed_pickup ? 'Confirm you have it' : 'Waiting for handover'
                            : 'Active loan'}
                        </span>
                      </td>
                      <td style={tdStyle}>
                        {loan.status === 'pending_handover' && loan.owner_confirmed_pickup && (
                          <button onClick={() => handleBorrowerConfirmPickup(loan)} style={handsOverButtonStyle}>Got It</button>
                        )}
                        {loan.status === 'active' && (
                          <button onClick={() => handleBorrowerConfirmReturn(loan)} style={cancelActionButtonStyle}>I've Returned It</button>
                        )}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
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

      {showWelcome && userId && (
        <WelcomeModal userId={userId} onClose={() => setShowWelcome(false)} />
      )}

      {showImport && (
        <ImportSpreadsheetModal
          existingItemNames={items.map(i => i.item_name)}
          onClose={() => setShowImport(false)}
          onSuccess={() => {
            setShowImport(false);
            fetchMyInventory();
          }}
        />
      )}

      {transferItem && (
        <TransferModal
          item={transferItem}
          ownerId={userId ?? ''}
          onClose={() => setTransferItem(null)}
          onSuccess={() => { setTransferItem(null); fetchMyInventory(); }}
        />
      )}

      {lendItem && (
        <LendModal
          item={lendItem}
          ownerId={userId ?? ''}
          onClose={() => setLendItem(null)}
          onSuccess={() => { setLendItem(null); fetchMyInventory(); }}
        />
      )}
    </div>
  );
}

// --- STATUS TOGGLE STYLE ---
function getStatusToggleStyle(optionValue: string, currentStatus: string): React.CSSProperties {
  const isActive = optionValue === currentStatus;
  if (optionValue === 'Available to Borrow') {
    return { padding: '3px 8px', fontSize: '0.7rem', borderRadius: '4px', cursor: 'pointer', fontWeight: isActive ? 'bold' : 'normal', border: '1px solid #00ccff', backgroundColor: isActive ? '#00ccff' : '#fff', color: isActive ? '#000' : '#00aacc', whiteSpace: 'nowrap' as const };
  }
  if (optionValue === 'Available to Keep') {
    return { padding: '3px 8px', fontSize: '0.7rem', borderRadius: '4px', cursor: 'pointer', fontWeight: isActive ? 'bold' : 'normal', border: '1px solid #C08261', backgroundColor: isActive ? '#C08261' : '#fff', color: isActive ? '#fff' : '#a06040', whiteSpace: 'nowrap' as const };
  }
  return { padding: '3px 8px', fontSize: '0.7rem', borderRadius: '4px', cursor: 'pointer', fontWeight: isActive ? 'bold' : 'normal', border: '1px solid #ddd', backgroundColor: isActive ? '#e0e0e0' : '#fff', color: isActive ? '#444' : '#999', whiteSpace: 'nowrap' as const };
}

// --- STYLES ---
const addButtonStyle: React.CSSProperties = { backgroundColor: '#00ccff', color: '#000', padding: '10px 20px', borderRadius: '6px', border: 'none', fontWeight: 'bold', cursor: 'pointer', whiteSpace: 'nowrap' as const, fontSize: '0.9rem' };
const importButtonStyle: React.CSSProperties = { backgroundColor: '#fff', color: '#2D241E', padding: '10px 16px', borderRadius: '6px', border: '1px solid #ddd', fontWeight: 600, cursor: 'pointer', whiteSpace: 'nowrap' as const, fontSize: '0.9rem' };
const filterBarStyle: React.CSSProperties = { display: 'flex', gap: '12px', marginBottom: '24px', background: '#f7f7f7', padding: '16px', borderRadius: '12px', border: '1px solid #eee', alignItems: 'flex-end' };
const labelStyle: React.CSSProperties = { display: 'block', fontSize: '0.75rem', color: '#888', marginBottom: '5px' };
const inputStyle: React.CSSProperties = { width: '100%', padding: '10px', backgroundColor: '#fff', border: '1px solid #ddd', color: '#2D241E', borderRadius: '6px', boxSizing: 'border-box' as const, fontSize: '0.9rem' };
const tableContainerStyle: React.CSSProperties = { overflowX: 'auto', backgroundColor: '#fff', borderRadius: '12px', border: '1px solid #e5e5e5' };
const headerRowStyle: React.CSSProperties = { borderBottom: '1px solid #e5e5e5', backgroundColor: '#fafafa' };
const thStyle: React.CSSProperties = { padding: '15px', color: '#555', fontSize: '0.75rem', fontWeight: 600, textTransform: 'uppercase' as const };
const tdStyle: React.CSSProperties = { padding: '10px 15px', verticalAlign: 'middle', color: '#666', fontSize: '0.9rem' };
const rowStyle: React.CSSProperties = { borderBottom: '1px solid #f0f0f0' };
const thumbnailStyle: React.CSSProperties = { width: '50px', height: '50px', backgroundColor: '#f0f0f0', borderRadius: '6px', overflow: 'hidden', flexShrink: 0, border: '1px solid #e5e5e5' };
const editLinkStyle: React.CSSProperties = { background: 'none', border: 'none', color: '#00aacc', fontSize: '0.75rem', padding: 0, cursor: 'pointer', textDecoration: 'underline', marginTop: '4px', display: 'block' };
const csvButtonStyle: React.CSSProperties = { background: 'none', border: 'none', color: '#aaa', cursor: 'pointer', fontSize: '0.85rem', textDecoration: 'underline' };
const locationDropdownStyle: React.CSSProperties = { position: 'absolute' as const, top: '100%', left: 0, right: 0, backgroundColor: '#fff', border: '1px solid #ddd', borderRadius: '8px', boxShadow: '0 4px 12px rgba(0,0,0,0.1)', zIndex: 100, marginTop: '4px', padding: '8px' };
const locationOptionStyle: React.CSSProperties = { display: 'flex', alignItems: 'center', gap: '8px', padding: '6px 4px', cursor: 'pointer', borderRadius: '4px' };

// Action buttons
const lendButtonStyle: React.CSSProperties = { height: '30px', padding: '0 14px', fontSize: '0.75rem', backgroundColor: '#00ccff', color: '#000', border: 'none', borderRadius: '5px', cursor: 'pointer', fontWeight: 'bold', whiteSpace: 'nowrap' as const };
const transferButtonStyle: React.CSSProperties = { height: '30px', padding: '0 14px', fontSize: '0.75rem', backgroundColor: '#C08261', color: '#fff', border: 'none', borderRadius: '5px', cursor: 'pointer', fontWeight: 'bold', whiteSpace: 'nowrap' as const };
const makeAvailableButtonStyle: React.CSSProperties = { height: '30px', padding: '0 14px', fontSize: '0.75rem', backgroundColor: '#f0f0f0', color: '#666', border: '1px solid #ddd', borderRadius: '5px', cursor: 'pointer', fontWeight: 'normal', whiteSpace: 'nowrap' as const };
const pendingBadgeStyle: React.CSSProperties = { display: 'inline-block', padding: '2px 8px', backgroundColor: '#fef3c7', color: '#92400e', borderRadius: '10px', fontSize: '0.7rem', fontWeight: 700 };
const handsOverButtonStyle: React.CSSProperties = { height: '28px', padding: '0 10px', fontSize: '0.7rem', backgroundColor: '#16a34a', color: '#fff', border: 'none', borderRadius: '5px', cursor: 'pointer', fontWeight: 'bold', whiteSpace: 'nowrap' as const };
const reminderButtonStyle: React.CSSProperties = { height: '24px', padding: '0 8px', fontSize: '0.7rem', backgroundColor: '#f0f0f0', color: '#666', border: '1px solid #ddd', borderRadius: '4px', cursor: 'pointer', whiteSpace: 'nowrap' as const };
const cancelActionButtonStyle: React.CSSProperties = { height: '24px', padding: '0 8px', fontSize: '0.7rem', backgroundColor: '#fff', color: '#dc2626', border: '1px solid #fca5a5', borderRadius: '4px', cursor: 'pointer', whiteSpace: 'nowrap' as const };
const visibilitySelectStyle: React.CSSProperties = { marginTop: '6px', width: '100%', padding: '3px 6px', fontSize: '0.7rem', border: '1px solid #ddd', borderRadius: '4px', backgroundColor: '#fff', color: '#555', cursor: 'pointer' };
