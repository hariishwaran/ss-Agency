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
      .insert([campaign])
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
