export interface Hoarding {
  id: number;
  location: string;
  city?: string;
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
  latitude?: string;
  longitude?: string;
  is_owned?: boolean;
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
  po_status?: 'none' | 'pending' | 'partial' | 'paid';
  total_po_amount?: number;
  paid_po_amount?: number;
}

export interface PurchaseOrder {
  id: string;
  campaign_id: number;
  hoarding_id: number;
  po_number: string;
  po_date: string;
  vendor_name: string;
  description: string;
  total_amount: number;
  paid_amount: number;
  balance_amount: number;
  status: 'draft' | 'sent' | 'partial' | 'paid' | 'cancelled';
  payment_terms: string;
  due_date: string;
  notes?: string;
  created_at?: string;
  updated_at?: string;
}

export interface LedgerEntry {
  id: string;
  hoarding_id: number;
  campaign_id?: number;
  po_id?: string;
  amount_paid: number;
  payment_date: string;
  period_covered: string;
  payment_method: 'UPI' | 'Bank Transfer' | 'Cash' | 'Cheque' | 'Other';
  receipt_url: string | null;
  transaction_type: 'po_payment' | 'rent' | 'other';
  reference_number?: string;
  created_at?: string;
}

export interface FlexPrinting {
  id: number;
  campaign_id?: number;
  hoarding_id?: number;
  printing_type: 'outsource' | 'own_printing';
  flex_size?: string;
  quantity: number;
  notes?: string;
  status: 'pending' | 'in_progress' | 'completed' | 'cancelled';
  created_at: string;
  updated_at: string;
  vendor_name?: string;
  vendor_contact?: string;
  assignment_date?: string;
  expected_completion?: string;
  outsource_status?: 'assigned' | 'in_progress' | 'completed' | 'delayed';
  outsource_cost?: number;
  material_cost?: number;
  labor_cost?: number;
  total_cost?: number;
  ledger_entry_id?: string;
  payment_status?: 'pending' | 'partial' | 'paid';
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
