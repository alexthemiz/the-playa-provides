'use client';

import { useEffect, useState, useRef } from 'react';
import { supabase } from '@/lib/supabaseClient';
import { geocodeZip } from '@/lib/geocodeZip';
import Link from 'next/link';

const US_STATES = ["", "AL", "AK", "AZ", "AR", "CA", "CO", "CT", "DE", "FL", "GA", "HI", "ID", "IL", "IN", "IA", "KS", "KY", "LA", "ME", "MD", "MA", "MI", "MN", "MS", "MO", "MT", "NE", "NV", "NH", "NJ", "NM", "NY", "NC", "ND", "OH", "OK", "OR", "PA", "RI", "SC", "SD", "TN", "TX", "UT", "VT", "VA", "WA", "WV", "WI", "WY"];
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
  const [disputeLoan, setDisputeLoan] = useState<any>(null);
  const [disputeMessage, setDisputeMessage] = useState('');
  const [disputeSubmitting, setDisputeSubmitting] = useState(false);
  const [disputeSuccess, setDisputeSuccess] = useState(false);
  const [followingIds, setFollowingIds] = useState<string[]>([]);
  const [campMateIds, setCampMateIds] = useState<string[]>([]);
  const [userLocations, setUserLocations] = useState<{ id: string; label: string }[]>([]);
  const [borrowerLocationIds, setBorrowerLocationIds] = useState<Record<string, string>>({});
  const [newLoanLocData, setNewLoanLocData] = useState<{ loanId: string | null; label: string; address_line_1: string; city: string; state: string; zip_code: string }>({ loanId: null, label: '', address_line_1: '', city: '', state: '', zip_code: '' });

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
      const { data: { session } } = await supabase.auth.getSession();
      const user = session?.user ?? null;
      if (user) {
        setUserId(user.id);
        const { data: profileData } = await supabase.from('profiles').select('preferred_name, has_seen_welcome').eq('id', user.id).maybeSingle();
        if (profileData?.preferred_name) setDisplayName(profileData.preferred_name);

        const [followingRes, campRes] = await Promise.all([
          supabase.from('user_follows').select('following_id').eq('follower_id', user.id),
          supabase.from('user_camp_affiliations').select('camp_id').eq('user_id', user.id).not('camp_id', 'is', null),
        ]);
        setFollowingIds((followingRes.data || []).map((r: any) => r.following_id));
        const myCampIds = (campRes.data || []).map((r: any) => r.camp_id).filter(Boolean);
        if (myCampIds.length > 0) {
          const { data: campMembers } = await supabase.from('user_camp_affiliations').select('user_id').in('camp_id', myCampIds).neq('user_id', user.id);
          setCampMateIds([...new Set((campMembers || []).map((r: any) => r.user_id))]);
        } else {
          setCampMateIds([]);
        }

        if (!profileData?.has_seen_welcome) setShowWelcome(true);

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
          .select('id, item_id, borrower_id, status, owner_confirmed_pickup, borrower_confirmed_pickup, return_by, picked_up_at, borrower:profiles!item_loans_borrower_id_fkey(preferred_name, username), gear_items(item_name)')
          .eq('owner_id', user.id)
          .in('status', ['pending_handover', 'active', 'return_pending']);
        setActiveLoans(loanData || []);

        // Inbound transfers (recipient side)
        const { data: inboundTransferData } = await supabase
          .from('item_transfers')
          .select('id, item_id, status, owner_id, owner_confirmed, recipient_confirmed, owner:profiles!item_transfers_owner_id_fkey(preferred_name, username), gear_items(item_name)')
          .eq('recipient_id', user.id)
          .in('status', ['pending_handover']);
        setInboundTransfers(inboundTransferData || []);

        // Inbound loans (borrower side)
        const { data: inboundLoanData } = await supabase
          .from('item_loans')
          .select('id, item_id, status, owner_confirmed_pickup, borrower_confirmed_pickup, borrower_confirmed_return, return_by, picked_up_at, borrower_location_id, owner:profiles!item_loans_owner_id_fkey(preferred_name, username), gear_items(item_name, category)')
          .eq('borrower_id', user.id)
          .in('status', ['pending_handover', 'active', 'return_pending']);
        setInboundLoans(inboundLoanData || []);

        // User's saved locations (for borrower location dropdown)
        const { data: locData } = await supabase
          .from('locations')
          .select('id, label')
          .eq('user_id', user.id);
        setUserLocations(locData || []);

        // Initialise borrowerLocationIds from fetched loan data
        const initialLoanLocs: Record<string, string> = {};
        (inboundLoanData || []).forEach((l: any) => {
          if (l.borrower_location_id) initialLoanLocs[l.id] = l.borrower_location_id;
        });
        setBorrowerLocationIds(initialLoanLocs);
      }
    } catch (err) {
      console.error('fetchMyInventory error:', err);
    } finally {
      setLoading(false);
    }
  }

  async function updateStatus(itemId: number, newStatus: string) {
    const update: any = { availability_status: newStatus };
    if (newStatus === 'Not Available') update.visibility = 'private';
    const { error } = await supabase
      .from('gear_items')
      .update(update)
      .eq('id', itemId);
    if (!error) {
      setItems(prev => prev.map(i => i.id === itemId ? {
        ...i,
        availability_status: newStatus,
        ...(newStatus === 'Not Available' ? { visibility: 'private' } : {}),
      } : i));
    }
  }

  async function updateVisibility(itemId: number, newVisibility: string) {
    // Optimistic update first so the controlled <select> reflects the change immediately.
    // Without this, the async DB call causes React to re-render with the old value
    // and the browser resets the dropdown before the await resolves.
    setItems(prev => prev.map(i => i.id === itemId ? { ...i, visibility: newVisibility } : i));
    const { error } = await supabase
      .from('gear_items')
      .update({ visibility: newVisibility })
      .eq('id', itemId);
    if (error) console.error('updateVisibility error:', error);
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

  async function handleSubmitDispute() {
    if (!disputeLoan || !disputeMessage.trim()) return;
    setDisputeSubmitting(true);
    await supabase.functions.invoke('send-dispute-notification', {
      body: { loan_id: disputeLoan.id, dispute_message: disputeMessage.trim() },
    });
    setDisputeSubmitting(false);
    setDisputeSuccess(true);
  }

  async function handleOwnerConfirmReturn(loan: any) {
    // 1. Complete the loan
    await supabase
      .from('item_loans')
      .update({ owner_confirmed_return: true, status: 'complete' })
      .eq('id', loan.id);

    // 2. Mark item unavailable and private
    await supabase
      .from('gear_items')
      .update({ availability_status: 'Not Available', visibility: 'private' })
      .eq('id', loan.item_id);

    // 3. Notify borrower
    await supabase.from('notifications').insert({
      type: 'loan_return_confirmed',
      recipient_id: loan.borrower_id,
      actor_id: userId,
      item_id: loan.item_id,
    });

    // 4. Optimistic local updates — no full refetch
    setActiveLoans(prev => prev.filter(l => l.id !== loan.id));
    setItems(prev => prev.map(i =>
      i.id === loan.item_id
        ? { ...i, availability_status: 'Not Available', visibility: 'private' }
        : i
    ));
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
      supabase.from('notifications').insert({
        type: 'transfer_accepted',
        recipient_id: transfer.owner_id,
        actor_id: userId,
        item_id: transfer.item_id,
      });
    } else {
      console.error('confirm_transfer_receipt error:', error.message);
    }
  }

  async function handleBorrowerConfirmPickup(loan: any) {
    const { error } = await supabase
      .from('item_loans')
      .update({ borrower_confirmed_pickup: true, status: 'active', picked_up_at: new Date().toISOString() })
      .eq('id', loan.id);
    if (!error) fetchMyInventory();
  }

  async function handleLoanLocationChange(loanId: string, locationId: string) {
    setBorrowerLocationIds(prev => ({ ...prev, [loanId]: locationId }));
    if (locationId === '__new__') {
      setNewLoanLocData({ loanId, label: '', address_line_1: '', city: '', state: '', zip_code: '' });
    } else {
      await supabase.from('item_loans').update({ borrower_location_id: locationId || null }).eq('id', loanId);
    }
  }

  async function handleSaveNewLoanLocation() {
    if (!newLoanLocData.loanId || !newLoanLocData.label) return;
    const { data: { session } } = await supabase.auth.getSession();
    const uid = session?.user?.id;
    if (!uid) return;
    const coords = await geocodeZip(newLoanLocData.zip_code);
    const { data: newLoc, error } = await supabase
      .from('locations')
      .insert({ label: newLoanLocData.label, address_line_1: newLoanLocData.address_line_1, city: newLoanLocData.city, state: newLoanLocData.state, zip_code: newLoanLocData.zip_code, user_id: uid, ...(coords ?? {}) })
      .select('id')
      .single();
    if (newLoc && !error) {
      setUserLocations(prev => [...prev, { id: newLoc.id, label: newLoanLocData.label }]);
      setBorrowerLocationIds(prev => ({ ...prev, [newLoanLocData.loanId!]: newLoc.id }));
      await supabase.from('item_loans').update({ borrower_location_id: newLoc.id }).eq('id', newLoanLocData.loanId!);
      setNewLoanLocData({ loanId: null, label: '', address_line_1: '', city: '', state: '', zip_code: '' });
    }
  }

  async function handleBorrowerConfirmReturn(loan: any) {
    const { error } = await supabase
      .from('item_loans')
      .update({ borrower_confirmed_return: true, status: 'return_pending' })
      .eq('id', loan.id);
    if (!error) {
      setInboundLoans(prev => prev.map(l => l.id === loan.id ? { ...l, status: 'return_pending', borrower_confirmed_return: true } : l));
      await supabase.functions.invoke('send-loan-notification', {
        body: { type: 'borrower_confirmed_return', loan_id: loan.id },
      });
    }
  }

  async function handleRecipientDeclineTransfer(transfer: any) {
    const { error } = await supabase
      .from('item_transfers')
      .update({ status: 'cancelled' })
      .eq('id', transfer.id);
    if (!error) {
      supabase.from('notifications').insert({
        type: 'transfer_declined',
        recipient_id: transfer.owner_id,
        actor_id: userId,
        item_id: transfer.item_id,
      });
      setInboundTransfers(prev => prev.filter(t => t.id !== transfer.id));
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
    <div style={{ backgroundColor: '#F6F1E8', minHeight: '100vh' }}>

      {/* Page header band */}
      <div style={{ backgroundColor: '#FDFAF4', borderBottom: '2px solid #1C1610', padding: '28px 0' }}>
        <div className="rsp-px" style={{ maxWidth: '1400px', margin: '0 auto' }}>
          <h1 style={{ fontFamily: "'Arvo', serif", fontSize: '1.9rem', fontWeight: 900, color: '#1C1610', margin: '0 0 12px', lineHeight: 1.05 }}>
            Your <em style={{ fontStyle: 'italic', color: '#1E8A82' }}>Inventory.</em>
          </h1>
          <p style={{ fontSize: '0.9rem', color: '#4A3828', lineHeight: 1.65, margin: 0 }}>
            Add or edit items, adjust availability, and track loans and transfers. Click <strong>Import Inventory</strong> to add multiple items via spreadsheet.
          </p>
        </div>
      </div>

      <div className="rsp-px" style={{ maxWidth: '1400px', margin: '0 auto', paddingTop: '24px' }}>
        <style>{`
          .title-break { display: none; }
          @media (max-width: 430px) { .title-break { display: block; } }
          @media (max-width: 640px) {
            .inv-filter-bar { flex-direction: column !important; }
            .inv-filter-bar > div { width: 100% !important; min-width: unset !important; flex: unset !important; }
            .inv-btn-group { justify-content: stretch !important; }
            .inv-btn-group > button { flex: 1 !important; }
          }
        `}</style>

        {/* FILTERS + ADD BUTTON */}
        <div className="inv-filter-bar" style={filterBarStyle}>
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
                  style={{ width: '100%', padding: '6px', marginTop: '4px', fontSize: '0.75rem', color: '#1E8A82', background: 'none', border: 'none', cursor: 'pointer', textAlign: 'left' as const }}
                >
                  Clear filter
                </button>
              )}
            </div>
          )}
        </div>

        {/* Add + Import buttons */}
        <div className="inv-btn-group" style={{ display: 'flex', alignItems: 'flex-end', gap: '8px' }}>
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
            Add New Item
          </button>
        </div>
        </div>
      </div>
    <div className="rsp-px" style={{ maxWidth: '1400px', margin: '0 auto', paddingBottom: '64px' }}>

      {/* TABLE */}
      {loading ? (
        <p style={{ color: '#888', textAlign: 'center', padding: '40px' }}>Loading your gear...</p>
      ) : (
        <div style={tableContainerStyle}>
          <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left' as const, tableLayout: 'fixed' as const }}>
            <colgroup>
              <col style={{ width: '200px' }} />
              <col style={{ width: '110px' }} />
              <col style={{ width: '110px' }} />
              <col style={{ width: '290px' }} />
              <col style={{ width: '170px' }} />
              <col style={{ width: '140px' }} />
            </colgroup>
            <thead>
              <tr style={headerRowStyle}>
                <th style={thStyle}>Item Name</th>
                <th style={thStyle}>Category</th>
                <th style={thStyle}>Location</th>
                <th style={thStyle}>Description</th>
                <th style={thStyle}>Availability</th>
                <th style={thActionStyle}>Action</th>
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
                    <td style={{ ...tdStyle, fontSize: '0.8rem' }}>
                      {item.description || '—'}
                    </td>

                    {/* STATUS TOGGLE */}
                    <td style={tdStyle}>
                      <div style={{ display: 'flex', gap: '4px' }}>
                        {[
                          { value: 'Available to Borrow', label: 'To Borrow' },
                          { value: 'Available to Keep', label: 'To Keep' },
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
                          <option
                            value="followers"
                            disabled={followingIds.length === 0}
                            style={{ color: followingIds.length === 0 ? '#bbb' : 'inherit' }}
                            title={followingIds.length === 0 ? 'Follow users to unlock this' : undefined}
                          >People you follow</option>
                          <option
                            value="campmates"
                            disabled={campMateIds.length === 0}
                            style={{ color: campMateIds.length === 0 ? '#bbb' : 'inherit' }}
                            title={campMateIds.length === 0 ? 'Add a camp to your profile to unlock this' : undefined}
                          >Campmates only</option>
                          <option
                            value="followers_and_campmates"
                            disabled={followingIds.length === 0 || campMateIds.length === 0}
                            style={{ color: followingIds.length === 0 || campMateIds.length === 0 ? '#bbb' : 'inherit' }}
                            title={followingIds.length === 0 || campMateIds.length === 0 ? 'Follow users or join a camp to unlock this' : undefined}
                          >Following &amp; Campmates</option>
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
                <th style={thStyle}>Picked Up On</th>
                <th style={thStyle}>Return By</th>
                <th style={thStyle}>Status</th>
                <th style={thActionStyle}>Action</th>
              </tr>
            </thead>
            <tbody>
              {activeLoans.filter(l => ['active', 'return_pending'].includes(l.status)).length === 0 && (
                <tr><td colSpan={6} style={{ ...tdStyle, color: '#9A8878', fontStyle: 'italic' as const }}>You don&apos;t have any items out on loan at this time.</td></tr>
              )}
              {activeLoans
                .filter(l => ['active', 'return_pending'].includes(l.status))
                .map(loan => {
                    const borrowerName = loan.borrower?.preferred_name || loan.borrower?.username || '—';
                    const borrowerUsername = loan.borrower?.username;
                    const returnBy = loan.return_by ? new Date(loan.return_by).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' }) : '—';
                    const pickedUpOn = loan.picked_up_at ? new Date(loan.picked_up_at).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' }) : '—';
                    const itemName = loan.gear_items?.item_name || items.find(i => i.id === loan.item_id)?.item_name || '—';
                    return (
                      <tr key={loan.id} style={rowStyle}>
                        <td style={{ ...tdStyle, fontWeight: 600, color: '#2D241E' }}>
                          {itemName}
                          <a href={`/find-items/${loan.item_id}`} style={editLinkStyle}>View Item Details</a>
                        </td>
                        <td style={tdStyle}>
                          {borrowerUsername
                            ? <a href={`/profile/${borrowerUsername}`} style={{ color: '#1E8A82', textDecoration: 'none', fontWeight: 500 }}>{borrowerName}</a>
                            : borrowerName}
                        </td>
                        <td style={tdStyle}>{pickedUpOn}</td>
                        <td style={tdStyle}>{returnBy}</td>
                        <td style={tdStyle}>
                          <span style={{ fontSize: '0.8rem', color: loan.status === 'return_pending' ? '#92400e' : '#555' }}>
                            {loan.status === 'return_pending' ? 'Return Pending' : 'Out on Loan'}
                          </span>
                        </td>
                        <td style={tdStyle}>
                          {loan.status === 'return_pending' && (
                            <div style={{ display: 'flex', gap: '6px' }}>
                              <button onClick={() => handleOwnerConfirmReturn(loan)} style={handsOverButtonStyle}>Confirm Return</button>
                              <button onClick={() => setDisputeLoan(loan)} style={cancelActionButtonStyle}>Dispute</button>
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

      {/* ITEMS BEING TRANSFERRED TO ME */}
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
                  <th style={thActionStyle}>Action</th>
                </tr>
              </thead>
              <tbody>
                {inboundTransfers.length === 0 && (
                  <tr><td colSpan={4} style={{ ...tdStyle, color: '#9A8878', fontStyle: 'italic' as const }}>No items are being transferred to you at this time.</td></tr>
                )}
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
                        <div style={{ display: 'flex', gap: '6px' }}>
                          {transfer.owner_confirmed && (
                            <button onClick={() => handleRecipientConfirmTransfer(transfer)} style={handsOverButtonStyle}>
                              Got It
                            </button>
                          )}
                          <button onClick={() => handleRecipientDeclineTransfer(transfer)} style={cancelActionButtonStyle}>
                            Decline
                          </button>
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>

      {/* ITEMS I'M BORROWING */}
      <div style={{ marginTop: '40px' }}>
        <h2 style={{ color: '#2D241E', fontSize: '1.1rem', fontWeight: 700, marginBottom: '16px' }}>
          Items I&apos;m Borrowing
        </h2>
          <div style={tableContainerStyle}>
            <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left' as const }}>
              <thead>
                <tr style={headerRowStyle}>
                  <th style={thStyle}>Item</th>
                  <th style={thStyle}>From</th>
                  <th style={thStyle}>Category</th>
                  <th style={thStyle}>Picked Up On</th>
                  <th style={thStyle}>Return By</th>
                  <th style={thStyle}>My Location</th>
                  <th style={thStyle}>Status</th>
                  <th style={thActionStyle}>Action</th>
                </tr>
              </thead>
              <tbody>
                {inboundLoans.length === 0 && (
                  <tr><td colSpan={8} style={{ ...tdStyle, color: '#9A8878', fontStyle: 'italic' as const }}>You&apos;re not borrowing anything at this time.</td></tr>
                )}
                {inboundLoans.map(loan => {
                  const ownerName = loan.owner?.preferred_name || loan.owner?.username || '—';
                  const ownerUsername = loan.owner?.username;
                  const itemName = loan.gear_items?.item_name || '—';
                  const category = loan.gear_items?.category || '—';
                  const pickedUpOn = loan.picked_up_at ? new Date(loan.picked_up_at).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' }) : '—';
                  const returnBy = loan.return_by ? new Date(loan.return_by).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' }) : '—';
                  const selectedLocId = borrowerLocationIds[loan.id] ?? '';
                  const isAddingNew = newLoanLocData.loanId === loan.id;
                  return (
                    <tr key={loan.id} style={rowStyle}>
                      <td style={{ ...tdStyle, fontWeight: 600, color: '#2D241E' }}>
                        {itemName}
                        <a href={`/find-items/${loan.item_id}`} style={editLinkStyle}>View Item Details</a>
                      </td>
                      <td style={tdStyle}>
                        {ownerUsername
                          ? <Link href={`/profile/${ownerUsername}`} style={{ color: '#1E8A82', textDecoration: 'none', fontWeight: 500 }}>{ownerName}</Link>
                          : ownerName}
                      </td>
                      <td style={tdStyle}>{category}</td>
                      <td style={tdStyle}>{pickedUpOn}</td>
                      <td style={tdStyle}>{returnBy}</td>
                      <td style={tdStyle}>
                        <select
                          value={selectedLocId || ''}
                          onChange={e => handleLoanLocationChange(loan.id, e.target.value)}
                          style={loanLocationSelectStyle}
                        >
                          <option value="" disabled>— Location —</option>
                          {userLocations.map(loc => (
                            <option key={loc.id} value={loc.id}>{loc.label}</option>
                          ))}
                          <option value="__new__">+ Add new location</option>
                        </select>
                        {isAddingNew && (
                          <div style={{ marginTop: '8px', display: 'flex', flexDirection: 'column' as const, gap: '6px' }}>
                            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '6px' }}>
                              <input style={loanLocInputStyle} placeholder="Label (e.g. Home)" value={newLoanLocData.label} onChange={e => setNewLoanLocData(d => ({ ...d, label: e.target.value }))} />
                              <input style={loanLocInputStyle} placeholder="Street Address" value={newLoanLocData.address_line_1} onChange={e => setNewLoanLocData(d => ({ ...d, address_line_1: e.target.value }))} />
                            </div>
                            <div style={{ display: 'grid', gridTemplateColumns: '2fr 1fr 1fr', gap: '6px' }}>
                              <input style={loanLocInputStyle} placeholder="City" value={newLoanLocData.city} onChange={e => setNewLoanLocData(d => ({ ...d, city: e.target.value }))} />
                              <select style={loanLocInputStyle} value={newLoanLocData.state} onChange={e => setNewLoanLocData(d => ({ ...d, state: e.target.value }))}>
                                {US_STATES.map(s => <option key={s} value={s}>{s || 'State'}</option>)}
                              </select>
                              <input style={loanLocInputStyle} placeholder="Zip" value={newLoanLocData.zip_code} onChange={e => setNewLoanLocData(d => ({ ...d, zip_code: e.target.value }))} />
                            </div>
                            <button onClick={handleSaveNewLoanLocation} style={saveLocButtonStyle}>Save Location</button>
                          </div>
                        )}
                      </td>
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
                          <button onClick={() => handleBorrowerConfirmReturn(loan)} style={cancelActionButtonStyle}>Return Item</button>
                        )}
                        {loan.status === 'return_pending' && (
                          <span style={{ fontSize: '0.75rem', color: '#aaa', fontStyle: 'italic' as const }}>Return Pending</span>
                        )}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>

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

      {disputeLoan && (
        <div style={{ position: 'fixed' as const, inset: 0, backgroundColor: 'rgba(0,0,0,0.5)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 1100, padding: '20px' }}>
          <div style={{ backgroundColor: '#fff', padding: '28px 24px', borderRadius: '16px', maxWidth: '420px', width: '100%', boxShadow: '0 20px 60px rgba(0,0,0,0.2)' }}>
            {disputeSuccess ? (
              <>
                <p style={{ margin: '0 0 20px', fontSize: '0.95rem', color: '#16a34a', lineHeight: 1.5 }}>
                  Your dispute has been submitted. We'll be in touch soon.
                </p>
                <button
                  onClick={() => { setDisputeLoan(null); setDisputeMessage(''); setDisputeSuccess(false); }}
                  style={{ width: '100%', padding: '10px', backgroundColor: '#f5f5f5', color: '#333', border: 'none', borderRadius: '8px', cursor: 'pointer', fontSize: '0.9rem', fontWeight: 600 }}
                >
                  Close
                </button>
              </>
            ) : (
              <>
                <h3 style={{ margin: '0 0 6px', fontSize: '1rem', color: '#2D241E' }}>Dispute Return</h3>
                <p style={{ margin: '0 0 16px', fontSize: '0.85rem', color: '#888', lineHeight: 1.4 }}>
                  Describe the issue with <strong style={{ color: '#2D241E' }}>{disputeLoan.gear_items?.item_name || 'this item'}</strong>. Our team will follow up.
                </p>
                <label style={{ display: 'block', fontSize: '0.75rem', fontWeight: 700, color: '#555', marginBottom: '6px', textTransform: 'uppercase' as const, letterSpacing: '0.05em' }}>
                  Describe the issue
                </label>
                <textarea
                  value={disputeMessage}
                  onChange={e => setDisputeMessage(e.target.value)}
                  rows={5}
                  placeholder="e.g. The item was returned damaged..."
                  style={{ width: '100%', padding: '10px', fontSize: '0.9rem', border: '1px solid #ddd', borderRadius: '8px', resize: 'vertical' as const, boxSizing: 'border-box' as const, color: '#2D241E', fontFamily: 'inherit' }}
                />
                <div style={{ display: 'flex', gap: '10px', marginTop: '16px' }}>
                  <button
                    onClick={() => { setDisputeLoan(null); setDisputeMessage(''); }}
                    style={{ flex: 1, padding: '10px', backgroundColor: '#f5f5f5', color: '#333', border: 'none', borderRadius: '8px', cursor: 'pointer', fontSize: '0.9rem', fontWeight: 600 }}
                  >
                    Cancel
                  </button>
                  <button
                    onClick={handleSubmitDispute}
                    disabled={disputeSubmitting || !disputeMessage.trim()}
                    style={{ flex: 1, padding: '10px', backgroundColor: '#dc2626', color: '#fff', border: 'none', borderRadius: '8px', cursor: disputeSubmitting || !disputeMessage.trim() ? 'not-allowed' : 'pointer', fontSize: '0.9rem', fontWeight: 600, opacity: disputeSubmitting || !disputeMessage.trim() ? 0.6 : 1 }}
                  >
                    {disputeSubmitting ? 'Submitting...' : 'Submit'}
                  </button>
                </div>
              </>
            )}
          </div>
        </div>
      )}
    </div>
    </div>
  );
}

// --- STATUS TOGGLE STYLE ---
function getStatusToggleStyle(optionValue: string, currentStatus: string): React.CSSProperties {
  const isActive = optionValue === currentStatus;
  if (optionValue === 'Available to Borrow') {
    return { padding: '3px 8px', fontSize: '0.7rem', cursor: 'pointer', fontWeight: isActive ? 'bold' : 'normal', border: '1px solid #1E8A82', backgroundColor: isActive ? '#1E8A82' : '#FDFAF4', color: isActive ? '#fff' : '#1E8A82', whiteSpace: 'nowrap' as const };
  }
  if (optionValue === 'Available to Keep') {
    return { padding: '3px 8px', fontSize: '0.7rem', cursor: 'pointer', fontWeight: isActive ? 'bold' : 'normal', border: '1px solid #C24820', backgroundColor: isActive ? '#C24820' : '#FDFAF4', color: isActive ? '#fff' : '#C24820', whiteSpace: 'nowrap' as const };
  }
  return { padding: '3px 8px', fontSize: '0.7rem', cursor: 'pointer', fontWeight: isActive ? 'bold' : 'normal', border: '1px solid #9A8878', backgroundColor: isActive ? '#EDE5D0' : '#FDFAF4', color: isActive ? '#1C1610' : '#9A8878', whiteSpace: 'nowrap' as const };
}

// --- STYLES ---
const addButtonStyle: React.CSSProperties = { backgroundColor: '#1E8A82', color: '#fff', padding: '10px 20px', border: '2px solid #1C1610', boxShadow: '3px 3px 0 #1C1610', fontWeight: 'bold', cursor: 'pointer', whiteSpace: 'nowrap' as const, fontSize: '0.9rem' };
const importButtonStyle: React.CSSProperties = { backgroundColor: '#EDE5D0', color: '#1C1610', padding: '10px 16px', border: '1.5px solid rgba(28,22,16,0.25)', fontWeight: 600, cursor: 'pointer', whiteSpace: 'nowrap' as const, fontSize: '0.9rem' };
const filterBarStyle: React.CSSProperties = { display: 'flex', gap: '12px', marginBottom: '24px', background: '#EDE5D0', padding: '16px', border: '1.5px solid rgba(28,22,16,0.12)', alignItems: 'flex-end' };
const labelStyle: React.CSSProperties = { display: 'block', fontFamily: "'Space Mono', monospace", fontSize: '0.58rem', fontWeight: 700, letterSpacing: '0.1em', textTransform: 'uppercase' as const, color: '#4A3828', marginBottom: '5px' };
const inputStyle: React.CSSProperties = { width: '100%', padding: '10px', backgroundColor: '#FDFAF4', border: '1.5px solid rgba(28,22,16,0.25)', color: '#1C1610', boxSizing: 'border-box' as const, fontSize: '0.9rem' };
const tableContainerStyle: React.CSSProperties = { overflowX: 'auto', backgroundColor: '#FDFAF4', border: '1.5px solid rgba(28,22,16,0.12)' };
const headerRowStyle: React.CSSProperties = { borderBottom: '1.5px solid rgba(28,22,16,0.12)', backgroundColor: '#EDE5D0' };
const thStyle: React.CSSProperties = { padding: '15px', fontFamily: "'Space Mono', monospace", color: '#4A3828', fontSize: '0.6rem', fontWeight: 700, textTransform: 'uppercase' as const, letterSpacing: '0.08em' };
const thActionStyle: React.CSSProperties = { padding: '15px 15px 15px 32px', fontFamily: "'Space Mono', monospace", color: '#4A3828', fontSize: '0.6rem', fontWeight: 700, textTransform: 'uppercase' as const, letterSpacing: '0.08em', whiteSpace: 'nowrap' as const, width: '1%' };
const tdStyle: React.CSSProperties = { padding: '10px 15px', verticalAlign: 'middle', color: '#4A3828', fontSize: '0.9rem' };
const rowStyle: React.CSSProperties = { borderBottom: '1px solid rgba(28,22,16,0.06)' };
const thumbnailStyle: React.CSSProperties = { width: '50px', height: '50px', backgroundColor: '#EDE5D0', overflow: 'hidden', flexShrink: 0, border: '1px solid rgba(28,22,16,0.12)' };
const editLinkStyle: React.CSSProperties = { background: 'none', border: 'none', color: '#1E8A82', fontSize: '0.75rem', padding: 0, cursor: 'pointer', textDecoration: 'underline', marginTop: '4px', display: 'block' };
const csvButtonStyle: React.CSSProperties = { background: 'none', border: 'none', color: '#9A8878', cursor: 'pointer', fontSize: '0.85rem', textDecoration: 'underline' };
const locationDropdownStyle: React.CSSProperties = { position: 'absolute' as const, top: '100%', left: 0, right: 0, backgroundColor: '#FDFAF4', border: '1.5px solid rgba(28,22,16,0.2)', boxShadow: '3px 3px 0 rgba(28,22,16,0.08)', zIndex: 100, marginTop: '4px', padding: '8px' };
const locationOptionStyle: React.CSSProperties = { display: 'flex', alignItems: 'center', gap: '8px', padding: '6px 4px', cursor: 'pointer' };

// Action buttons
const lendButtonStyle: React.CSSProperties = { height: '30px', padding: '0 14px', fontSize: '0.75rem', backgroundColor: '#1E8A82', color: '#fff', border: '1.5px solid #1C1610', cursor: 'pointer', fontWeight: 'bold', whiteSpace: 'nowrap' as const };
const transferButtonStyle: React.CSSProperties = { height: '30px', padding: '0 14px', fontSize: '0.75rem', backgroundColor: '#D4A020', color: '#fff', border: '1.5px solid #1C1610', cursor: 'pointer', fontWeight: 'bold', whiteSpace: 'nowrap' as const };
const pendingBadgeStyle: React.CSSProperties = { display: 'inline-block', padding: '2px 8px', backgroundColor: '#F5F0D0', color: '#92400e', fontSize: '0.7rem', fontWeight: 700 };
const handsOverButtonStyle: React.CSSProperties = { height: '28px', padding: '0 10px', fontSize: '0.7rem', backgroundColor: '#16a34a', color: '#fff', border: 'none', cursor: 'pointer', fontWeight: 'bold', whiteSpace: 'nowrap' as const };
const reminderButtonStyle: React.CSSProperties = { height: '24px', padding: '0 8px', fontSize: '0.7rem', backgroundColor: '#EDE5D0', color: '#4A3828', border: '1px solid rgba(28,22,16,0.2)', cursor: 'pointer', whiteSpace: 'nowrap' as const };
const cancelActionButtonStyle: React.CSSProperties = { height: '24px', padding: '0 8px', fontSize: '0.7rem', backgroundColor: '#FDFAF4', color: '#dc2626', border: '1px solid #fca5a5', cursor: 'pointer', whiteSpace: 'nowrap' as const };
const visibilitySelectStyle: React.CSSProperties = { marginTop: '6px', width: '100%', padding: '3px 6px', fontSize: '0.7rem', border: '1px solid rgba(28,22,16,0.2)', backgroundColor: '#FDFAF4', color: '#4A3828', cursor: 'pointer' };
const loanLocationSelectStyle: React.CSSProperties = { width: '100%', padding: '5px 8px', fontSize: '0.8rem', border: '1.5px solid rgba(28,22,16,0.25)', color: '#1C1610', backgroundColor: '#FDFAF4', cursor: 'pointer' };
const loanLocInputStyle: React.CSSProperties = { width: '100%', padding: '5px 8px', fontSize: '0.75rem', border: '1.5px solid rgba(28,22,16,0.25)', color: '#1C1610', backgroundColor: '#FDFAF4', boxSizing: 'border-box' as const };
const saveLocButtonStyle: React.CSSProperties = { padding: '5px 12px', fontSize: '0.75rem', backgroundColor: '#1E8A82', color: '#fff', border: '1.5px solid #1C1610', cursor: 'pointer', fontWeight: 600 };
