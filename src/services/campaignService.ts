import { getSupabase } from '../lib/supabase';
import { Campaign } from '../types';

export const campaignService = {
  async getAll() {
    const { data, error } = await getSupabase()
      .from('campaigns')
      .select('*')
      .order('created_at', { ascending: false });
    
    if (error) throw error;
    return data as Campaign[];
  },

  async getById(id: number) {
    const { data, error } = await getSupabase()
      .from('campaigns')
      .select('*')
      .eq('id', id)
      .single();
    
    if (error) throw error;
    return data as Campaign;
  },

  async getByHoardingId(hoardingId: number) {
    const { data, error } = await getSupabase()
      .from('campaigns')
      .select('*')
      .eq('hoarding_id', hoardingId)
      .order('start_date', { ascending: true });
    
    if (error) throw error;
    return data as Campaign[];
  },

  async create(campaign: Omit<Campaign, 'id' | 'created_at'>) {
    const { data, error } = await getSupabase()
      .from('campaigns')
      .insert([{ ...campaign, po_status: 'none', total_po_amount: 0, paid_po_amount: 0 }])
      .select()
      .single();
    
    if (error) throw error;
    return data as Campaign;
  },

  async update(id: number, campaign: Partial<Campaign>) {
    const { data, error } = await getSupabase()
      .from('campaigns')
      .update(campaign)
      .eq('id', id)
      .select()
      .single();
    
    if (error) throw error;
    return data as Campaign;
  },

  async refreshPoSummary(id: number) {
    const { data: pos, error: poError } = await getSupabase()
      .from('purchase_orders')
      .select('total_amount, paid_amount, status')
      .eq('campaign_id', id);
    if (poError) throw poError;

    const totalAmount = pos.reduce((sum, po) => sum + Number(po.total_amount), 0);
    const paidAmount = pos.reduce((sum, po) => sum + Number(po.paid_amount), 0);


    let poStatus: Campaign['po_status'] = 'none';
    if (pos.length > 0) {
      const allPaid = pos.every(p => p.status === 'paid');
      const hasPartial = pos.some(p => p.status === 'partial' || p.status === 'paid');
      const anyCancelled = pos.every(p => p.status === 'cancelled');
      if (anyCancelled && pos.length > 0) {
        const nonCancelled = pos.filter(p => p.status !== 'cancelled');
        if (nonCancelled.length === 0) poStatus = 'none';
        else if (nonCancelled.every(p => p.status === 'paid')) poStatus = 'paid';
        else poStatus = 'partial';
      } else if (allPaid) poStatus = 'paid';
      else if (hasPartial) poStatus = 'partial';
      else poStatus = 'pending';
    }

    const { data, error } = await getSupabase()
      .from('campaigns')
      .update({ po_status: poStatus, total_po_amount: totalAmount, paid_po_amount: paidAmount })
      .eq('id', id)
      .select()
      .single();

    if (error) throw error;
    return data as Campaign;
  },

  async delete(id: number) {
    const supabase = getSupabase();
    console.log('Initiating delete sequence for campaign ID:', id);

    const { error } = await supabase
      .from('campaigns')
      .delete()
      .eq('id', id);
    
    if (error) {
      console.error('Error deleting campaign with ID:', id, error);
      throw new Error(`Campaign deletion failed: ${error.message}`);
    }
    console.log('Campaign successfully deleted');
  }
};
