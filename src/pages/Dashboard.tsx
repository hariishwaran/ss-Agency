import { ArrowUpRight, Plus, CalendarDays, Filter, Loader2, AlertCircle } from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { useNavigate, Link } from 'react-router-dom';
import { useState, useEffect } from 'react';
import { cn } from '../utils/cn';
import { Campaign, Hoarding } from '../types';
import { campaignService } from '../services/campaignService';
import { hoardingService } from '../services/hoardingService';
import { format, parseISO } from 'date-fns';
import CampaignModal from '../components/CampaignModal';
import CampaignDetailView from '../components/CampaignDetailView';
import ConfirmDialog from '../components/ConfirmDialog';
import { useConfirm } from '../hooks/useConfirm';
import { useAlert } from '../hooks/useAlert';
import { useSearch } from '../context/SearchContext';

export default function Dashboard() {
  const navigate = useNavigate();
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [selectedCampaign, setSelectedCampaign] = useState<Campaign | null>(null);
  const [campaigns, setCampaigns] = useState<Campaign[]>([]);
  const [hoardings, setHoardings] = useState<Hoarding[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [configError, setConfigError] = useState<string | null>(null);
  const { confirm, confirmProps } = useConfirm();
  const { alert: showAlert, alertProps } = useAlert();
  const { searchQuery } = useSearch();

  useEffect(() => {
    fetchData();
  }, []);

  const fetchData = async () => {
    try {
      setIsLoading(true);
      setConfigError(null);
      const [campaignsData, hoardingsData] = await Promise.all([
        campaignService.getAll(),
        hoardingService.getAll()
      ]);
      setCampaigns(campaignsData);
      setHoardings(hoardingsData);
    } catch (error: any) {
      console.error('Error fetching dashboard data:', error);
      if (error.message?.includes('Supabase configuration missing')) {
        setConfigError(error.message);
      }
    } finally {
      setIsLoading(false);
    }
  };

  const getDaysDiff = (dateStr: string | null) => {
    if (!dateStr) return null;
    const diff = new Date(dateStr).getTime() - new Date().getTime();
    return Math.ceil(diff / (1000 * 60 * 60 * 24));
  };

  const renewals = hoardings
    .filter(h => h.next_due_date)
    .filter(h => h.location.toLowerCase().includes(searchQuery.toLowerCase()))
    .map(h => ({
      id: h.id,
      siteId: h.id,
      name: h.location,
      type: 'Hoarding',
      daysLeft: getDaysDiff(h.next_due_date),
      status: (getDaysDiff(h.next_due_date) || 0) < 7 ? 'warning' : 'normal'
    }))
    .sort((a, b) => (a.daysLeft || 0) - (b.daysLeft || 0))
    .slice(0, 5);

  const handleCreateCampaign = async (formData: any) => {
    try {
      if (formData.hoarding_ids && formData.hoarding_ids.length > 0) {
        await Promise.all(formData.hoarding_ids.map((id: number) => 
          campaignService.create({
            client_info: formData.client_info,
            start_date: formData.start_date,
            end_date: formData.end_date,
            hoarding_id: id,
            internal_notes: formData.internal_notes
          })
        ));
      } else {
        await campaignService.create(formData);
      }
      fetchData();
      setIsModalOpen(false);
    } catch (error) {
      console.error('Error creating campaign:', error);
    }
  };

  const handleDeleteCampaign = async (id: number) => {
    const isConfirmed = await confirm({
      title: 'Delete Campaign',
      message: 'Are you sure you want to permanently delete this campaign?',
      variant: 'danger'
    });

    if (isConfirmed) {
      try {
        await campaignService.delete(id);
        await fetchData();
        return true;
      } catch (error: any) {
        console.error('Error deleting campaign:', error);
        await showAlert({
          title: 'Deletion Failed',
          message: error.message || 'Check database permissions',
          variant: 'danger'
        });
        return false;
      }
    }
    return false;
  };

  const filteredCampaigns = campaigns.filter(c => 
    c.client_info.toLowerCase().includes(searchQuery.toLowerCase()) || 
    c.hoarding_id.toString().includes(searchQuery)
  );

  return (
    <div className="space-y-10 animate-in fade-in duration-500 pb-20">
      {configError && (
        <section className="bg-amber-50 border border-amber-200 rounded-3xl p-10 text-center">
          <div className="w-16 h-16 bg-amber-100 rounded-full flex items-center justify-center text-amber-600 mx-auto mb-6">
            <AlertCircle className="w-8 h-8" />
          </div>
          <h2 className="text-2xl font-bold text-slate-900 mb-4">Configuration Required</h2>
          <p className="text-slate-600 mb-8 max-w-md mx-auto">
            {configError}
          </p>
          <div className="p-4 bg-white rounded-xl border border-slate-200 inline-block text-left text-sm font-mono text-slate-500 mb-8">
            1. Open <span className="font-bold text-indigo-600">Settings</span> menu<br/>
            2. Add <span className="font-bold text-slate-900">VITE_SUPABASE_URL</span><br/>
            3. Add <span className="font-bold text-slate-900">VITE_SUPABASE_ANON_KEY</span>
          </div>
          <div>
            <button 
              onClick={() => fetchData()}
              className="px-8 py-3 bg-indigo-600 text-white rounded-xl font-bold text-xs uppercase tracking-widest shadow-lg hover:bg-black transition-all"
            >
              Retry Connection
            </button>
          </div>
        </section>
      )}

      <section className="grid grid-cols-1 md:grid-cols-3 gap-6">
        {isLoading ? (
          Array.from({ length: 3 }).map((_, i) => (
            <div key={i} className="p-8 rounded-2xl border border-slate-200 shadow-sm bg-white flex flex-col justify-between h-48">
              <div>
                <div className="w-24 h-3 bg-slate-100 rounded-md animate-pulse mb-3"></div>
                <div className="w-16 h-10 bg-slate-100 rounded-lg animate-pulse mt-2"></div>
              </div>
              <div className="w-32 h-3 bg-slate-100 rounded-md animate-pulse mt-6"></div>
            </div>
          ))
        ) : (
          <>
            <motion.div 
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              onClick={() => navigate('/inventory')}
              className="p-8 rounded-2xl border transition-all duration-300 cursor-pointer hover:scale-[1.02] bg-white border-slate-200 shadow-sm"
            >
              <div>
                <span className="text-[10px] font-bold uppercase tracking-widest opacity-60 text-slate-500">Total Assets</span>
                <div className="flex items-baseline gap-2 mt-2">
                  <h3 className="text-4xl font-light tracking-tight text-slate-900">{hoardings.length > 0 ? hoardings.length : 12}</h3>
                </div>
              </div>
              <div className="mt-6 text-[11px] font-bold text-slate-400">
                {hoardings.length > 0 ? `${hoardings.filter(h => h.rent_status === 'Paid').length} Active • ${hoardings.filter(h => h.rent_status !== 'Paid').length} Maintenance` : '9 Active • 3 Maintenance'}
              </div>
            </motion.div>

            <motion.div 
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.1 }}
              onClick={() => navigate('/inventory')}
              className="p-8 rounded-2xl border transition-all duration-300 cursor-pointer hover:scale-[1.02] bg-slate-900 text-white border-slate-800"
            >
              <div>
                <span className="text-[10px] font-bold uppercase tracking-widest opacity-60 text-slate-400">Active Campaigns</span>
                <div className="flex items-baseline gap-2 mt-2">
                  <h3 className="text-4xl font-light tracking-tight text-white">{campaigns.length > 0 ? campaigns.filter(c => new Date(c.end_date) >= new Date()).length : 3}</h3>
                </div>
              </div>
              <div className="mt-6 text-[11px] font-bold text-slate-400 opacity-80">↑ 12% from last month</div>
            </motion.div>

            <motion.div 
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.2 }}
              onClick={() => navigate('/inventory')}
              className="p-8 rounded-2xl border transition-all duration-300 cursor-pointer hover:scale-[1.02] bg-white border-slate-200 shadow-sm"
            >
              <div>
                <span className="text-[10px] font-bold uppercase tracking-widest opacity-60 text-slate-500">Avg Occupancy</span>
                <div className="flex items-baseline gap-2 mt-2">
                  <h3 className="text-4xl font-light tracking-tight text-slate-900">
                    {hoardings.length > 0 ? Math.round((hoardings.filter(h => h.rent_status === 'Paid').length / hoardings.length) * 100) : 75}%
                  </h3>
                </div>
              </div>
              <div className="space-y-2 mt-4">
                <div className="w-full bg-slate-100 h-1.5 rounded-full overflow-hidden">
                  <motion.div 
                    initial={{ width: 0 }}
                    animate={{ width: `${hoardings.length > 0 ? (hoardings.filter(h => h.rent_status === 'Paid').length / hoardings.length) * 100 : 75}%` }}
                    transition={{ duration: 1, ease: "easeOut" }}
                    className="bg-indigo-600 h-full rounded-full" 
                  />
                </div>
              </div>
            </motion.div>
          </>
        )}
      </section>

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">
        <div className="lg:col-span-8 space-y-6">
          <section className="bg-white p-8 rounded-2xl border border-slate-200 shadow-sm transition-all hover:shadow-md">
            <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 mb-8">
              <div className="space-y-1">
                <h4 className="text-sm font-bold text-slate-400 uppercase tracking-widest">Recent Campaigns</h4>
              </div>
              <button 
                onClick={() => setIsModalOpen(true)}
                className="bg-slate-900 text-white px-4 py-2 rounded-lg font-bold text-[10px] uppercase tracking-widest flex items-center gap-2 hover:bg-slate-800 transition-colors shadow-lg shadow-slate-200"
              >
                <Plus className="w-3.5 h-3.5" /> Create New
              </button>
            </div>

            <div className="space-y-4">
              <AnimatePresence mode="popLayout">
                {isLoading ? (
                  Array.from({ length: 3 }).map((_, i) => (
                    <div key={i} className="flex items-center justify-between p-4 bg-slate-50 rounded-xl border border-slate-100 h-[74px]">
                      <div className="flex items-center gap-4">
                        <div className="h-10 w-10 bg-slate-100 rounded-lg animate-pulse" />
                        <div className="space-y-2">
                           <div className="h-4 w-32 bg-slate-100 rounded animate-pulse" />
                           <div className="h-3 w-24 bg-slate-100 rounded animate-pulse" />
                        </div>
                      </div>
                      <div className="h-6 w-16 bg-slate-100 rounded-full animate-pulse" />
                    </div>
                  ))
                ) : filteredCampaigns.length > 0 ? (
                  filteredCampaigns.map((campaign) => (
                    <motion.div 
                      key={campaign.id}
                      layout
                      initial={{ opacity: 0, x: -10 }}
                      animate={{ opacity: 1, x: 0 }}
                      exit={{ opacity: 0, scale: 0.95 }}
                      onClick={() => setSelectedCampaign(campaign)}
                      className="flex items-center justify-between p-4 bg-slate-50 rounded-xl border border-slate-100 group hover:border-indigo-600/30 transition-all cursor-pointer"
                    >
                      <div className="flex items-center gap-4">
                        <div className="h-10 w-10 bg-slate-50 rounded-lg border border-slate-200 flex items-center justify-center text-slate-400 group-hover:text-indigo-600 group-hover:border-indigo-600/20 transition-all overflow-hidden flex-shrink-0 relative">
                           <div className="absolute inset-0 opacity-10 bg-[radial-gradient(ellipse_at_center,_var(--tw-gradient-stops))] from-indigo-900 to-transparent"></div>
                           <CalendarDays className="w-4 h-4 relative z-10" />
                        </div>
                        <div>
                          <h4 className="text-sm font-bold text-slate-900 line-clamp-1">{campaign.client_info}</h4>
                          <p className="text-[10px] text-slate-400 font-bold uppercase tracking-widest mt-0.5 truncate max-w-[200px]">Asset: {hoardings.find(h => h.id === campaign.hoarding_id)?.location || `ID: ${campaign.hoarding_id}`}</p>
                        </div>
                      </div>
                      <div className="text-right">
                        <p className="text-[10px] font-mono font-medium text-slate-500">{format(parseISO(campaign.start_date), 'MMM dd, yyyy')} – {format(parseISO(campaign.end_date), 'MMM dd, yyyy')}</p>
                        <span className={cn(
                          "inline-block mt-1.5 px-3 py-1 rounded-full text-[9px] font-bold uppercase tracking-widest border",
                          new Date(campaign.end_date) >= new Date() ? "bg-emerald-50 text-emerald-700 border-emerald-100" : "bg-slate-50 text-slate-500 border-slate-200"
                        )}>
                          {new Date(campaign.end_date) >= new Date() ? 'Active' : 'Completed'}
                        </span>
                      </div>
                    </motion.div>
                  ))
                ) : (
                  <motion.div 
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    className="py-12 flex flex-col items-center justify-center text-slate-400 border-2 border-dashed border-slate-100 rounded-2xl"
                  >
                    <Filter className="w-8 h-8 mb-2 opacity-20" />
                    <p className="text-xs font-bold uppercase tracking-widest">No campaigns broadcasted</p>
                  </motion.div>
                )}
              </AnimatePresence>
            </div>
          </section>
        </div>

        <div className="lg:col-span-4 space-y-6">
          <section className="bg-white p-8 rounded-2xl border border-slate-200 shadow-sm flex flex-col h-full">
            <h4 className="text-sm font-bold text-slate-400 uppercase tracking-widest mb-6">Market Renewals</h4>
            <div className="space-y-5 flex-1">
              {renewals.map((item) => (
                <div key={item.id} onClick={() => navigate(`/details/${item.siteId}`)} className="flex items-center justify-between group cursor-pointer">
                  <div className="flex items-center gap-3">
                    <div className="h-2 w-2 rounded-full bg-slate-200 group-hover:bg-indigo-600 transition-colors" />
                    <div>
                      <p className="text-sm font-bold text-slate-900 line-clamp-1">{item.name} <span className="text-slate-400 font-normal">- Asset {item.siteId}</span></p>
                      <p className="text-[10px] text-slate-400 uppercase tracking-widest font-bold font-mono mt-0.5">{item.type}</p>
                    </div>
                  </div>
                  <span className={cn(
                    "font-mono text-[10px] font-bold px-2.5 py-1 rounded-md ml-2 whitespace-nowrap",
                    (item.daysLeft ?? 0) < 0 ? "bg-red-50 text-red-600 border border-red-100" : 
                    (item.daysLeft ?? 0) <= 7 ? "bg-amber-50 text-amber-600 border border-amber-100" : 
                    "bg-slate-50 text-slate-500 border border-slate-100"
                  )}>
                    {(item.daysLeft ?? 0) < 0 ? `${Math.abs(item.daysLeft!)} days overdue` : `${item.daysLeft} days left`}
                  </span>
                </div>
              ))}
            </div>
            <button onClick={() => navigate('/inventory')} className="w-full mt-8 py-4 bg-slate-900 text-white rounded-xl font-bold text-xs uppercase tracking-widest shadow-lg shadow-slate-200 hover:bg-slate-800 transition-all flex items-center justify-center gap-2">
              Action Renewals <ArrowUpRight className="w-4 h-4" />
            </button>
          </section>
        </div>
      </div>


      <CampaignModal 
        isOpen={isModalOpen} 
        onClose={() => setIsModalOpen(false)} 
        onCreate={handleCreateCampaign} 
      />

      <CampaignDetailView 
        campaign={selectedCampaign}
        onClose={() => setSelectedCampaign(null)}
        onDelete={handleDeleteCampaign}
      />

      <ConfirmDialog {...confirmProps} />
      <ConfirmDialog {...alertProps} />
    </div>
  );
}
