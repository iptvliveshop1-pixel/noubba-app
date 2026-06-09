export type Barber = {
  id: string;
  shop_name: string;
  owner_name: string;
  location: string;
  is_active: boolean;
};

export type QueueItem = {
  id: string;
  barber_id: string;
  customer_name: string;
  whatsapp_number: string;
  total_estimated_time: number;
  status: 'waiting' | 'notified' | 'in_chair' | 'completed' | 'cancelled';
  joined_at: string;
};