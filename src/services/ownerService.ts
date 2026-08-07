import { api } from '../lib/api';
import { Owner } from '../types';

export const ownerService = {
  async getAll() {
    return api.get<Owner[]>('/owners');
  },

  async getById(id: number) {
    return api.get<Owner>(`/owners/${id}`);
  },

  async create(owner: Omit<Owner, 'id' | 'created_at'>) {
    return api.post<Owner>('/owners', owner);
  },

  async update(id: number, owner: Partial<Owner>) {
    const { id: _id, created_at, ...cleanData } = owner as any;
    return api.put<Owner>(`/owners/${id}`, cleanData);
  },

  async delete(id: number) {
    await api.delete(`/owners/${id}`);
  }
};
