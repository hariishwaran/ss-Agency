import { api } from '../lib/api';
import { LedgerEntry } from '../types';

export const ledgerService = {
  async getAll() {
    return api.get<LedgerEntry[]>('/ledger');
  },

  async create(entry: Omit<LedgerEntry, 'id' | 'created_at'>) {
    return api.post<LedgerEntry>('/ledger', entry);
  },

  async delete(id: string) {
    console.log('Initiating delete sequence for ledger entry ID:', id);
    await api.delete(`/ledger/${id}`);
    console.log('Ledger entry successfully deleted');
  }
};
