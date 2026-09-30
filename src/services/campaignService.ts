import { api } from '../lib/api';
import { Campaign } from '../types';

export function clearLocalCampaignCache() {
  try {
    localStorage.removeItem('ss_agency_deleted_campaign_ids');
    localStorage.removeItem('ss_agency_created_campaigns');
    localStorage.removeItem('ss_agency_updated_campaigns');
  } catch (err) {
    console.error('Error clearing local campaign cache:', err);
  }
}

export const campaignService = {
  async getAll(): Promise<Campaign[]> {
    const campaigns = await api.get<Campaign[]>('/campaigns');
    return campaigns.sort((a, b) => {
      const dateA = new Date(a.start_date || a.created_at || 0).getTime();
      const dateB = new Date(b.start_date || b.created_at || 0).getTime();
      return dateB - dateA;
    });
  },

  async getById(id: number): Promise<Campaign> {
    return api.get<Campaign>(`/campaigns/${id}`);
  },

  async getByHoardingId(hoardingId: number): Promise<Campaign[]> {
    return api.get<Campaign[]>(`/campaigns/by-hoarding/${hoardingId}`);
  },

  async create(campaign: any): Promise<Campaign | Campaign[]> {
    return api.post<Campaign | Campaign[]>('/campaigns', campaign);
  },

  async update(id: number, campaign: Partial<Campaign>): Promise<Campaign> {
    return api.put<Campaign>(`/campaigns/${id}`, campaign);
  },

  async refreshPoSummary(id: number): Promise<Campaign> {
    return api.post<Campaign>(`/campaigns/${id}/refresh-po-summary`, {});
  },

  async delete(id: number) {
    return api.delete<{ ok: boolean }>(`/campaigns/${id}`);
  }
};

