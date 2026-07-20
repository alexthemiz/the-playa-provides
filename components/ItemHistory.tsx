'use client';

import { useState, useEffect } from 'react';
import { ChevronDown, ChevronUp } from 'lucide-react';
import Link from 'next/link';
import { supabase } from '@/lib/supabaseClient';

const INK_MID  = '#4A3828';
const INK_LITE = '#9A8878';
const TEAL     = '#1E8A82';

interface HistoryEntry {
  date: string;
  prefix: string;
  name?: string | null;
  username?: string | null;
}

interface Props {
  itemId: string | number;
  isOwner: boolean;
  createdAt: string;
}

// Owner-only item history. RLS on item_loans/item_transfers grants the
// *current* owner of an item (via gear_items.user_id) visibility into every
// loan/transfer row for it, regardless of who the historical owner/borrower
// was — but never grants that to a borrower, and never to a past owner who's
// since transferred it away. The isOwner check here is a client-side
// convenience on top of that, not the actual security boundary.
export default function ItemHistory({ itemId, isOwner, createdAt }: Props) {
  const [entries, setEntries] = useState<HistoryEntry[] | null>(null);
  const [expanded, setExpanded] = useState(false);

  useEffect(() => {
    if (!isOwner || !itemId) { setEntries(null); return; }
    let cancelled = false;

    async function fetchHistory() {
      const [loansRes, transfersRes] = await Promise.all([
        supabase
          .from('item_loans')
          .select('id, picked_up_at, returned_at, borrower:profiles!item_loans_borrower_id_fkey(username, preferred_name)')
          .eq('item_id', itemId)
          .eq('status', 'complete'),
        supabase
          .from('item_transfers')
          .select('id, completed_at, owner:profiles!item_transfers_owner_id_fkey(username, preferred_name)')
          .eq('item_id', itemId)
          .eq('status', 'complete'),
      ]);

      const loanEntries: HistoryEntry[] = (loansRes.data || []).flatMap((l: any) => {
        const name = l.borrower?.preferred_name || l.borrower?.username || null;
        const username = l.borrower?.username || null;
        const out: HistoryEntry[] = [];
        if (l.picked_up_at) out.push({ date: l.picked_up_at, prefix: 'Lent to ', name, username });
        if (l.returned_at) out.push({ date: l.returned_at, prefix: 'Returned by ', name, username });
        return out;
      });

      const transferEntries: HistoryEntry[] = (transfersRes.data || [])
        .filter((t: any) => t.completed_at)
        .map((t: any) => ({
          date: t.completed_at,
          prefix: 'Transferred from ',
          name: t.owner?.preferred_name || t.owner?.username || null,
          username: t.owner?.username || null,
        }));

      const all = [
        { date: createdAt, prefix: 'Added to The Playa Provides', name: null, username: null },
        ...loanEntries,
        ...transferEntries,
      ].sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());

      if (!cancelled) setEntries(all);
    }
    fetchHistory();
    return () => { cancelled = true; };
  }, [itemId, isOwner, createdAt]);

  if (!isOwner || !entries || entries.length === 0) return null;

  return (
    <div style={{ marginTop: '16px', borderTop: '1px solid rgba(28,22,16,0.1)', paddingTop: '12px' }}>
      <button
        onClick={() => setExpanded(e => !e)}
        style={{ display: 'flex', alignItems: 'center', gap: '6px', background: 'none', border: 'none', cursor: 'pointer', padding: 0, fontFamily: "'Space Mono', monospace", fontSize: '0.62rem', fontWeight: 700, letterSpacing: '0.08em', textTransform: 'uppercase' as const, color: INK_LITE }}
      >
        {expanded ? <ChevronUp size={12} /> : <ChevronDown size={12} />}
        Item History ({entries.length})
        <span style={{ fontSize: '0.6rem', color: INK_LITE, fontWeight: 400, textTransform: 'none' as const, marginLeft: '4px' }}>· only you can see this</span>
      </button>
      {expanded && (
        <div style={{ marginTop: '10px', display: 'flex', flexDirection: 'column' as const, gap: '6px' }}>
          {entries.map((e, i) => (
            <div key={i} style={{ fontSize: '0.8rem', color: INK_MID, display: 'flex', justifyContent: 'space-between', gap: '10px' }}>
              <span>
                {e.prefix}
                {e.name && (
                  e.username ? (
                    <Link href={`/profile/${e.username}`} style={{ color: TEAL, textDecoration: 'none', fontWeight: 600 }} onClick={ev => ev.stopPropagation()}>
                      {e.name}
                    </Link>
                  ) : e.name
                )}
              </span>
              <span style={{ color: INK_LITE, whiteSpace: 'nowrap' as const, fontSize: '0.75rem' }}>
                {new Date(e.date).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })}
              </span>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
