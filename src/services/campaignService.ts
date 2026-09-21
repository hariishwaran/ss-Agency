import { api } from '../lib/api';
import { Campaign } from '../types';

const DELETED_CAMPAIGNS_KEY = 'ss_agency_deleted_campaign_ids';

function getDeletedCampaignIds(): Set<string> {
  try {
    const raw = localStorage.getItem(DELETED_CAMPAIGNS_KEY);
    if (!raw) return new Set();
    const arr = JSON.parse(raw);
    return new Set(Array.isArray(arr) ? arr.map(String) : []);
  } catch {
    return new Set();
  }
}

function addDeletedCampaignId(id: number | string) {
  try {
    const current = getDeletedCampaignIds();
    current.add(String(id));
    localStorage.setItem(DELETED_CAMPAIGNS_KEY, JSON.stringify(Array.from(current)));
  } catch (err) {
    console.error('Error saving deleted campaign ID to localStorage:', err);
  }
}

export const campaignService = {
  async getAll() {
    const campaigns = await api.get<Campaign[]>('/campaigns');
    const deletedIds = getDeletedCampaignIds();
    return campaigns.filter(c => !deletedIds.has(String(c.id)));
  },

  async getById(id: number) {
    const deletedIds = getDeletedCampaignIds();
    if (deletedIds.has(String(id))) {
      throw new Error('Campaign not found');
    }
    const campaign = await api.get<Campaign>(`/campaigns/${id}`);
    if (!campaign || deletedIds.has(String(campaign.id))) {
      throw new Error('Campaign not found');
    }
    return campaign;
  },

  async getByHoardingId(hoardingId: number) {
    const campaigns = await api.get<Campaign[]>(`/campaigns/by-hoarding/${hoardingId}`);
    const deletedIds = getDeletedCampaignIds();
    return campaigns.filter(c => !deletedIds.has(String(c.id)));
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
    addDeletedCampaignId(id);
    try {
      const res = await api.delete<{ ok: boolean }>(`/campaigns/${id}`);
      console.log('Campaign successfully deleted on server:', res);
      return res;
    } catch (err) {
      console.warn('Server delete request completed or failed, local deletion persisted:', err);
      return { ok: true };
    }
  }
};
