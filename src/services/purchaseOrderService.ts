import { getSupabase } from '../lib/supabase';
import { PurchaseOrder, LedgerEntry } from '../types';
import { ledgerService } from './ledgerService';

export const purchaseOrderService = {
  async getAll() {
    const { data, error } = await getSupabase()
      .from('purchase_orders')
      .select('*')
      .order('created_at', { ascending: false });
    if (error) throw error;
    return data as PurchaseOrder[];
  },

  async getByCampaignId(campaignId: number) {
    const { data, error } = await getSupabase()
      .from('purchase_orders')
      .select('*')
      .eq('campaign_id', campaignId)
      .order('created_at', { ascending: false });
    if (error) throw error;
    return data as PurchaseOrder[];
  },

  async getById(id: string) {
    const { data, error } = await getSupabase()
      .from('purchase_orders')
      .select('*')
      .eq('id', id)
      .single();
    if (error) throw error;
    return data as PurchaseOrder;
  },

  async create(po: Omit<PurchaseOrder, 'id' | 'created_at' | 'updated_at'>) {
    const { data, error } = await getSupabase()
      .from('purchase_orders')
      .insert([{ ...po, balance_amount: po.total_amount, paid_amount: 0, status: 'draft' }])
      .select()
      .single();
    if (error) throw error;
    return data as PurchaseOrder;
  },

  async update(id: string, updates: Partial<PurchaseOrder>) {
    const { data, error } = await getSupabase()
      .from('purchase_orders')
      .update(updates)
      .eq('id', id)
      .select()
      .single();
    if (error) throw error;
    return data as PurchaseOrder;
  },

  async recordPayment(poId: string, payment: { amount: number; payment_date: string; payment_method: LedgerEntry['payment_method']; receipt_url?: string | null; reference_number?: string }) {
    const po = await this.getById(poId);
    const newPaidAmount = po.paid_amount + payment.amount;
    const newBalance = po.total_amount - newPaidAmount;
    const newStatus = newBalance <= 0 ? 'paid' : 'partial';

    await this.update(poId, { paid_amount: newPaidAmount, balance_amount: newBalance, status: newStatus });

    await ledgerService.create({
      hoarding_id: po.hoarding_id,
      campaign_id: po.campaign_id,
      po_id: poId,
      amount_paid: payment.amount,
      payment_date: payment.payment_date,
      period_covered: `PO:${po.po_number}`,
      payment_method: payment.payment_method,
      receipt_url: payment.receipt_url ?? null,
      transaction_type: 'po_payment',
      reference_number: payment.reference_number ?? undefined,
    });

    return this.getById(poId);
  },

  async delete(id: string) {
    const { error } = await getSupabase()
      .from('purchase_orders')
      .delete()
      .eq('id', id);
    if (error) throw error;
  },
};
