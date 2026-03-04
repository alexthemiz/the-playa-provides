export type ItemQuality = 'New' | 'Good' | 'Dusty but Functional' | 'Beater';
export type HandoffMethod = 'Meet me there' | 'Pick up yourself' | 'I will deliver' | 'I will ship';

export interface PlayaItem {
  id: string;
  name: string;
  category: 'Environment' | 'Donations' | 'Community Service' | 'Art' | 'Transportation' | 'Other';
  brand?: string;
  quality: ItemQuality;
  locationZip: string;
  instructions: HandoffMethod;
  canBorrow: boolean;
  canRent: boolean;
  damageFee?: number;
}

export type TransferStatus = 'pending_handover' | 'complete' | 'cancelled';
export type LoanStatus = 'pending_handover' | 'active' | 'return_pending' | 'complete' | 'disputed' | 'cancelled';

export interface ItemTransfer {
  id: string;
  item_id: number;
  owner_id: string;
  recipient_id: string;
  status: TransferStatus;
  owner_confirmed: boolean;
  recipient_confirmed: boolean;
  created_at: string;
  updated_at: string;
  // joined
  gear_items?: { item_name: string };
  owner?: { username: string; preferred_name: string | null };
  recipient?: { username: string; preferred_name: string | null };
}

export interface ItemLoan {
  id: string;
  item_id: number;
  owner_id: string;
  borrower_id: string;
  status: LoanStatus;
  owner_confirmed_pickup: boolean;
  borrower_confirmed_pickup: boolean;
  borrower_confirmed_return: boolean;
  owner_confirmed_return: boolean;
  pickup_by: string | null;
  return_by: string | null;
  damage_agreement: number | null;
  loss_agreement: number | null;
  notes: string | null;
  created_at: string;
  updated_at: string;
  // joined
  gear_items?: { item_name: string };
  owner?: { username: string; preferred_name: string | null };
  borrower?: { username: string; preferred_name: string | null };
}