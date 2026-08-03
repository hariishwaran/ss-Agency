import { api } from '../lib/api';
import { Hoarding } from '../types';

export const hoardingService = {
  async getAll() {
    return api.get<Hoarding[]>('/hoardings');
  },

  async getById(id: number) {
    return api.get<Hoarding>(`/hoardings/${id}`);
  },

  async create(hoarding: Omit<Hoarding, 'id' | 'created_at' | 'total_area'>) {
    return api.post<Hoarding>('/hoardings', hoarding);
  },

  async update(id: number, hoarding: Partial<Hoarding>) {
    const { total_area, id: _id, created_at, ...cleanData } = hoarding as any;
    return api.put<Hoarding>(`/hoardings/${id}`, cleanData);
  },

  async delete(id: number) {
    console.log('Initiating delete sequence for hoarding ID:', id);
    await api.delete(`/hoardings/${id}`);
    console.log('Hoarding site deleted');
  }
};
