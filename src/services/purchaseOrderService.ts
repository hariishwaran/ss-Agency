import { api } from '../lib/api';
import { PurchaseOrder, LedgerEntry } from '../types';
import { ledgerService } from './ledgerService';

export const purchaseOrderService = {
  async getAll() {
    return api.get<PurchaseOrder[]>('/purchase_orders');
  },

  async getByCampaignId(campaignId: number) {
    return api.get<PurchaseOrder[]>(`/purchase_orders/by-campaign/${campaignId}`);
  },

  async getById(id: string) {
    return api.get<PurchaseOrder>(`/purchase_orders/${id}`);
  },

  async create(po: Omit<PurchaseOrder, 'id' | 'created_at' | 'updated_at'>) {
    return api.post<PurchaseOrder>('/purchase_orders', po);
  },

  async update(id: string, updates: Partial<PurchaseOrder>) {
    return api.put<PurchaseOrder>(`/purchase_orders/${id}`, updates);
  },

  async recordPayment(
    poId: string,
    payment: {
      amount: number;
      payment_date: string;
      payment_method: LedgerEntry['payment_method'];
      receipt_url?: string | null;
      reference_number?: string;
    }
  ) {
    const po = await this.getById(poId);
    const newPaidAmount = po.paid_amount + payment.amount;
    const newBalance = po.total_amount - newPaidAmount;
    const newStatus = newBalance <= 0 ? 'paid' : 'partial';

    await this.update(poId, {
      paid_amount: newPaidAmount,
      balance_amount: newBalance,
      status: newStatus,
    });

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
    await api.delete(`/purchase_orders/${id}`);
  },
};
