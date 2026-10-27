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

function removeDeletedCampaignId(id: number | string) {
  try {
    const current = getDeletedCampaignIds();
    current.delete(String(id));
    localStorage.setItem(DELETED_CAMPAIGNS_KEY, JSON.stringify(Array.from(current)));
  } catch (err) {
    console.error('Error updating deleted campaign ID in localStorage:', err);
  }
}

export function clearLocalCampaignCache() {
  try {
    localStorage.removeItem(DELETED_CAMPAIGNS_KEY);
    localStorage.removeItem('ss_agency_created_campaigns');
    localStorage.removeItem('ss_agency_updated_campaigns');
  } catch (err) {
    console.error('Error clearing local campaign cache:', err);
  }
}

export const campaignService = {
  async getAll(): Promise<Campaign[]> {
    const campaigns = await api.get<Campaign[]>('/campaigns');
    const deletedIds = getDeletedCampaignIds();
    const filtered = campaigns.filter(c => !deletedIds.has(String(c.id)));
    return filtered.sort((a, b) => {
      const dateA = new Date(a.start_date || a.created_at || 0).getTime();
      const dateB = new Date(b.start_date || b.created_at || 0).getTime();
      return dateB - dateA;
    });
  },

  async getById(id: number): Promise<Campaign> {
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

  async getByHoardingId(hoardingId: number): Promise<Campaign[]> {
    const campaigns = await api.get<Campaign[]>(`/campaigns/by-hoarding/${hoardingId}`);
    const deletedIds = getDeletedCampaignIds();
    return campaigns.filter(c => !deletedIds.has(String(c.id)));
  },

  async create(campaign: any): Promise<Campaign | Campaign[]> {
    const result = await api.post<Campaign | Campaign[]>('/campaigns', campaign);
    if (Array.isArray(result)) {
      result.forEach(r => r.id && removeDeletedCampaignId(r.id));
    } else if (result?.id) {
      removeDeletedCampaignId(result.id);
    }
    return result;
  },

  async update(id: number, campaign: Partial<Campaign>): Promise<Campaign> {
    removeDeletedCampaignId(id);
    return api.put<Campaign>(`/campaigns/${id}`, campaign);
  },

  async refreshPoSummary(id: number): Promise<Campaign> {
    return api.post<Campaign>(`/campaigns/${id}/refresh-po-summary`, {});
  },

  async delete(id: number) {
    addDeletedCampaignId(id);
    return api.delete<{ ok: boolean }>(`/campaigns/${id}`);
  }
};
