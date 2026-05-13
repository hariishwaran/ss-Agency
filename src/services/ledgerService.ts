import { getSupabase } from '../lib/supabase';
import { LedgerEntry } from '../types';

export const ledgerService = {
  async getAll() {
    const { data, error } = await getSupabase()
      .from('ledger')
      .select('*')
      .order('payment_date', { ascending: false });
    
    if (error) throw error;
    return data as LedgerEntry[];
  },

  async create(entry: Omit<LedgerEntry, 'id' | 'created_at'>) {
    const { data, error } = await getSupabase()
      .from('ledger')
      .insert([entry])
      .select()
      .single();
    
    if (error) throw error;
    return data as LedgerEntry;
  },

  async delete(id: string) {
    const supabase = getSupabase();
    console.log('Initiating delete sequence for ledger entry ID:', id);

    const { error } = await supabase
      .from('ledger')
      .delete()
      .eq('id', id);
    
    if (error) {
      console.error('Error deleting ledger entry:', id, error);
      throw new Error(`Payment record deletion failed: ${error.message}`);
    }
    console.log('Ledger entry successfully deleted');
  }
};
