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