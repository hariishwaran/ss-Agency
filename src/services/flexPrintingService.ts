import { getSupabase } from '../lib/supabase';
import { FlexPrinting } from '../types';

export const flexPrintingService = {
  async getAll() {
    const { data, error } = await getSupabase()
      .from('flex_printing')
      .select('*')
      .order('created_at', { ascending: false });

    if (error) throw error;
    return data as FlexPrinting[];
  },

  async getById(id: number) {
    const { data, error } = await getSupabase()
      .from('flex_printing')
      .select('*')
      .eq('id', id)
      .single();

    if (error) throw error;
    return data as FlexPrinting;
  },

  async create(printing: Omit<FlexPrinting, 'id' | 'created_at' | 'updated_at' | 'total_cost'>) {
    const { id, created_at, updated_at, total_cost, ...cleanData } = printing as any;
    const { data, error } = await getSupabase()
      .from('flex_printing')
      .insert([cleanData])
      .select()
      .single();

    if (error) throw error;
    return data as FlexPrinting;
  },

  async update(id: number, printing: Partial<FlexPrinting>) {
    const { id: _id, created_at, updated_at, total_cost, ...cleanData } = printing as any;
    const { data, error } = await getSupabase()
      .from('flex_printing')
      .update(cleanData)
      .eq('id', id)
      .select()
      .single();

    if (error) throw error;
    return data as FlexPrinting;
  },

  async delete(id: number) {
    const { error } = await getSupabase()
      .from('flex_printing')
      .delete()
      .eq('id', id);

    if (error) throw error;
  },
};
