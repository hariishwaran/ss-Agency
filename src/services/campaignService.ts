import { api } from '../lib/api';
import { Campaign } from '../types';

export const campaignService = {
  async getAll() {
    return api.get<Campaign[]>('/campaigns');
  },

  async getById(id: number) {
    return api.get<Campaign>(`/campaigns/${id}`);
  },

  async getByHoardingId(hoardingId: number) {
    return api.get<Campaign[]>(`/campaigns/by-hoarding/${hoardingId}`);
  },

  async create(campaign: Omit<Campaign, 'id' | 'created_at'>) {
    return api.post<Campaign>('/campaigns', campaign);
  },

  async update(id: number, campaign: Partial<Campaign>) {
    return api.put<Campaign>(`/campaigns/${id}`, campaign);
  },

  async refreshPoSummary(id: number) {
    return api.post<Campaign>(`/campaigns/${id}/refresh-po-summary`, {});
  },

  async delete(id: number) {
    console.log('Initiating delete sequence for campaign ID:', id);
    const res = await api.delete<{ ok: boolean }>(`/campaigns/${id}`);
    console.log('Campaign successfully deleted:', res);
    return res;
  }
};
