import { api } from '../lib/api';
import { Campaign } from '../types';

const DELETED_CAMPAIGNS_KEY = 'ss_agency_deleted_campaign_ids';
const CREATED_CAMPAIGNS_KEY = 'ss_agency_created_campaigns';
const UPDATED_CAMPAIGNS_KEY = 'ss_agency_updated_campaigns';

// --- DELETED CAMPAIGNS ---
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
    removeCreatedCampaign(id);
  } catch (err) {
    console.error('Error saving deleted campaign ID to localStorage:', err);
  }
}

// --- CREATED CAMPAIGNS ---
function getCreatedCampaigns(): Campaign[] {
  try {
    const raw = localStorage.getItem(CREATED_CAMPAIGNS_KEY);
    if (!raw) return [];
    const arr = JSON.parse(raw);
    return Array.isArray(arr) ? arr : [];
  } catch {
    return [];
  }
}

function addCreatedCampaigns(newItems: Campaign | Campaign[]) {
  try {
    const list = Array.isArray(newItems) ? newItems : [newItems];
    const current = getCreatedCampaigns();
    const currentMap = new Map<string, Campaign>();
    current.forEach(c => {
      if (c && c.id) currentMap.set(String(c.id), c);
    });
    list.forEach(c => {
      if (c && c.id) currentMap.set(String(c.id), c);
    });
    localStorage.setItem(CREATED_CAMPAIGNS_KEY, JSON.stringify(Array.from(currentMap.values())));
  } catch (err) {
    console.error('Error saving created campaign to localStorage:', err);
  }
}

function removeCreatedCampaign(id: number | string) {
  try {
    const current = getCreatedCampaigns();
    const filtered = current.filter(c => String(c.id) !== String(id));
    localStorage.setItem(CREATED_CAMPAIGNS_KEY, JSON.stringify(filtered));
  } catch (err) {
    console.error('Error removing created campaign from localStorage:', err);
  }
}

// --- UPDATED CAMPAIGNS ---
function getUpdatedCampaignsMap(): Record<string, Partial<Campaign>> {
  try {
    const raw = localStorage.getItem(UPDATED_CAMPAIGNS_KEY);
    if (!raw) return {};
    return JSON.parse(raw) || {};
  } catch {
    return {};
  }
}

function setUpdatedCampaign(id: number | string, patch: Partial<Campaign>) {
  try {
    const map = getUpdatedCampaignsMap();
    map[String(id)] = { ...(map[String(id)] || {}), ...patch };
    localStorage.setItem(UPDATED_CAMPAIGNS_KEY, JSON.stringify(map));
  } catch (err) {
    console.error('Error saving campaign updates to localStorage:', err);
  }
}

// Helper to merge and filter campaigns list
function mergeAndFilterCampaigns(serverCampaigns: Campaign[]): Campaign[] {
  const deletedIds = getDeletedCampaignIds();
  const createdCampaigns = getCreatedCampaigns();
  const updatedMap = getUpdatedCampaignsMap();

  const resultMap = new Map<string, Campaign>();

  // 1. Add server campaigns
  (serverCampaigns || []).forEach(c => {
    if (c && c.id && !deletedIds.has(String(c.id))) {
      resultMap.set(String(c.id), { ...c });
    }
  });

  // 2. Add locally created campaigns (overriding if server has outdated version)
  createdCampaigns.forEach(c => {
    if (c && c.id && !deletedIds.has(String(c.id))) {
      resultMap.set(String(c.id), { ...c });
    }
  });

  // 3. Apply local updates
  const merged = Array.from(resultMap.values()).map(c => {
    const patch = updatedMap[String(c.id)];
    if (patch) {
      return { ...c, ...patch };
    }
    return c;
  });

  // Sort newest first
  return merged.sort((a, b) => {
    const dateA = new Date(a.start_date || a.created_at || 0).getTime();
    const dateB = new Date(b.start_date || b.created_at || 0).getTime();
    return dateB - dateA;
  });
}

export const campaignService = {
  async getAll(): Promise<Campaign[]> {
    try {
      const serverCampaigns = await api.get<Campaign[]>('/campaigns');
      return mergeAndFilterCampaigns(serverCampaigns);
    } catch (err) {
      console.warn('Network issue fetching campaigns, serving from local cache:', err);
      return mergeAndFilterCampaigns([]);
    }
  },

  async getById(id: number): Promise<Campaign> {
    const deletedIds = getDeletedCampaignIds();
    if (deletedIds.has(String(id))) {
      throw new Error('Campaign not found');
    }

    let campaign: Campaign | null = null;
    try {
      campaign = await api.get<Campaign>(`/campaigns/${id}`);
    } catch {
      // Fallback to local created campaigns
      const created = getCreatedCampaigns();
      campaign = created.find(c => String(c.id) === String(id)) || null;
    }

    if (!campaign || deletedIds.has(String(campaign.id))) {
      throw new Error('Campaign not found');
    }

    const patch = getUpdatedCampaignsMap()[String(campaign.id)];
    return patch ? { ...campaign, ...patch } : campaign;
  },

  async getByHoardingId(hoardingId: number): Promise<Campaign[]> {
    let serverCampaigns: Campaign[] = [];
    try {
      serverCampaigns = await api.get<Campaign[]>(`/campaigns/by-hoarding/${hoardingId}`);
    } catch {
      serverCampaigns = [];
    }
    const allMerged = mergeAndFilterCampaigns(serverCampaigns);
    return allMerged.filter(c => Number(c.hoarding_id) === Number(hoardingId));
  },

  async create(campaign: any): Promise<Campaign | Campaign[]> {
    try {
      const res = await api.post<Campaign | Campaign[]>('/campaigns', campaign);
      if (res) {
        addCreatedCampaigns(res);
      }
      return res;
    } catch (err) {
      console.warn('Error creating campaign on server, caching locally:', err);
      const fakeId = Date.now();
      const newObj: Campaign = {
        id: fakeId,
        client_info: campaign.client_info || 'New Campaign',
        start_date: campaign.start_date || new Date().toISOString().split('T')[0],
        end_date: campaign.end_date || new Date().toISOString().split('T')[0],
        hoarding_id: Number(campaign.hoarding_id || (campaign.hoarding_ids ? campaign.hoarding_ids[0] : 1)),
        internal_notes: campaign.internal_notes || '',
        po_status: campaign.po_status || 'none',
        created_at: new Date().toISOString()
      };
      addCreatedCampaigns(newObj);
      return newObj;
    }
  },

  async update(id: number, campaign: Partial<Campaign>): Promise<Campaign> {
    setUpdatedCampaign(id, campaign);
    try {
      const res = await api.put<Campaign>(`/campaigns/${id}`, campaign);
      if (res) {
        setUpdatedCampaign(id, res);
      }
      return res;
    } catch (err) {
      console.warn('Server update failed, update saved in local cache:', err);
      const existing = await this.getById(id);
      return { ...existing, ...campaign };
    }
  },

  async refreshPoSummary(id: number): Promise<Campaign> {
    try {
      return await api.post<Campaign>(`/campaigns/${id}/refresh-po-summary`, {});
    } catch {
      return this.getById(id);
    }
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
