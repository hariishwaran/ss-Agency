export interface Hoarding {
  id: number;
  location: string;
  width: number;
  height: number;
  total_area?: number;
  owner_name: string;
  contact_number: string;
  rent_amount: number;
  rent_status: 'Paid' | 'Pending';
  last_paid_date: string | null;
  next_due_date: string | null;
  notes: string | null;
  created_at?: string;
  image_url?: string;
}

export interface Campaign {
  id: number;
  client_info: string;
  start_date: string;
  end_date: string;
  hoarding_id: number;
  internal_notes?: string;
  created_at?: string;
}

export interface LedgerEntry {
  id: string;
  hoarding_id: number;
  amount_paid: number;
  payment_date: string;
  period_covered: string;
  payment_method: 'UPI' | 'Bank Transfer' | 'Cash' | 'Cheque' | 'Other';
  receipt_url: string | null;
  created_at?: string;
}

export interface AppNotification {
  id: string;
  type: 'financial' | 'campaign' | 'operational';
  severity: 'red' | 'yellow' | 'green';
  title: string;
  message: string;
  date: string;
  read: boolean;
  action_link?: string;
}
