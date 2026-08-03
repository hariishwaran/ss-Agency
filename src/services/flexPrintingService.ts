import { api } from '../lib/api';
import { FlexPrinting } from '../types';

export const flexPrintingService = {
  async getAll() {
    return api.get<FlexPrinting[]>('/flex_printing');
  },

  async getById(id: number) {
    return api.get<FlexPrinting>(`/flex_printing/${id}`);
  },

  async create(printing: Omit<FlexPrinting, 'id' | 'created_at' | 'updated_at' | 'total_cost'>) {
    const { id, created_at, updated_at, total_cost, ...cleanData } = printing as any;
    return api.post<FlexPrinting>('/flex_printing', cleanData);
  },

  async update(id: number, printing: Partial<FlexPrinting>) {
    const { id: _id, created_at, updated_at, total_cost, ...cleanData } = printing as any;
    return api.put<FlexPrinting>(`/flex_printing/${id}`, cleanData);
  },

  async delete(id: number) {
    await api.delete(`/flex_printing/${id}`);
  },
};
