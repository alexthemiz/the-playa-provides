'use client';

import { useState, useEffect } from 'react';
import { supabase } from '@/lib/supabaseClient';

interface MyLoan {
  id: string;
  status: 'pending_handover' | 'active' | 'return_pending';
  borrower_id: string;
  owner_id: string;
}

// Shared across every surface that shows an item's Request/Return button
// (find-items quick-view, item detail page, intercepted modal) so the
// borrower-return flow can't silently drift out of sync between them again
// (it did once — see TASKS.md, 2026-07-17).
//
// RLS on item_loans scopes SELECT to owner_id/borrower_id = auth.uid(), so
// this returns null for everyone else — third parties only ever see the
// public gear_items.is_on_loan flag, never who has the item.
export function useItemLoan(itemId: string | number | undefined, userId: string | null | undefined) {
  const [myLoan, setMyLoan] = useState<MyLoan | null>(null);
  const [returningItem, setReturningItem] = useState(false);

  useEffect(() => {
    setMyLoan(null);
    if (!itemId || !userId) return;
    supabase
      .from('item_loans')
      .select('id, status, borrower_id, owner_id')
      .eq('item_id', itemId)
      .in('status', ['pending_handover', 'active', 'return_pending'])
      .maybeSingle()
      .then(({ data }) => setMyLoan(data as MyLoan | null));
  }, [itemId, userId]);

  const isBorrower = !!myLoan && myLoan.borrower_id === userId;

  async function handleReturnItem() {
    if (!myLoan || !itemId) return;
    setReturningItem(true);
    try {
      const { error } = await supabase
        .from('item_loans')
        .update({ borrower_confirmed_return: true, status: 'return_pending' })
        .eq('id', myLoan.id);
      if (error) throw error;
      setMyLoan(prev => prev ? { ...prev, status: 'return_pending' } : prev);
      await supabase.from('notifications').insert({
        type: 'loan_return_pending',
        recipient_id: myLoan.owner_id,
        actor_id: userId,
        item_id: itemId,
      });
      await supabase.functions.invoke('send-loan-notification', {
        body: { type: 'borrower_confirmed_return', loan_id: myLoan.id },
      });
    } catch (err: any) {
      console.error('Return item error:', err.message);
    } finally {
      setReturningItem(false);
    }
  }

  return { myLoan, isBorrower, returningItem, handleReturnItem };
}
