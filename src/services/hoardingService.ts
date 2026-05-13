import { getSupabase } from '../lib/supabase';
import { Hoarding } from '../types';

export const hoardingService = {
  async getAll() {
    const { data, error } = await getSupabase()
      .from('hoardings')
      .select('*')
      .order('created_at', { ascending: false });
    
    if (error) throw error;
    return data as Hoarding[];
  },

  async getById(id: number) {
    const { data, error } = await getSupabase()
      .from('hoardings')
      .select('*')
      .eq('id', id)
      .single();
    
    if (error) throw error;
    return data as Hoarding;
  },

  async create(hoarding: Omit<Hoarding, 'id' | 'created_at' | 'total_area'>) {
    const { total_area, id, created_at, ...cleanData } = hoarding as any;
    const { data, error } = await getSupabase()
      .from('hoardings')
      .insert([cleanData])
      .select()
      .single();
    
    if (error) throw error;
    return data as Hoarding;
  },

  async update(id: number, hoarding: Partial<Hoarding>) {
    const { total_area, id: _id, created_at, ...cleanData } = hoarding as any;
    const { data, error } = await getSupabase()
      .from('hoardings')
      .update(cleanData)
      .eq('id', id)
      .select()
      .single();
    
    if (error) throw error;
    return data as Hoarding;
  },

  async delete(id: number) {
    const supabase = getSupabase();
    
    console.log('Initiating delete sequence for hoarding ID:', id);

    // 1. Delete associated ledger entries
    const { error: ledgerError } = await supabase.from('ledger').delete().eq('hoarding_id', id);
    if (ledgerError) {
      console.error('Step 1 failed: Error deleting associated ledger entries:', ledgerError);
      throw new Error(`Financial records deletion failed: ${ledgerError.message}`);
    }
    console.log('Step 1 successful: Ledger entries cleared');
    
    // 2. Delete associated campaigns
    // Note: If campaigns have their own children, they should be handled here or via DB cascade.
    // We try to delete them first.
    const { error: campaignsError } = await supabase.from('campaigns').delete().eq('hoarding_id', id);
    if (campaignsError) {
      console.error('Step 2 failed: Error deleting associated campaigns:', campaignsError);
      throw new Error(`Campaigns deletion failed: ${campaignsError.message}`);
    }
    console.log('Step 2 successful: Campaigns cleared');
    
    // 3. Delete the hoarding itself
    const { error } = await supabase
      .from('hoardings')
      .delete()
      .eq('id', id);
    
    if (error) {
       console.error('Step 3 failed: Error deleting hoarding:', error);
       throw new Error(`Site deletion failed: ${error.message}`);
    }
    console.log('Step 3 successful: Hoarding site deleted');
  }
};
