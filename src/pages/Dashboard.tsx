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
                  <h3 className="text-4xl font-light tracking-tight text-slate-900">{hoardings.length}</h3>
                </div>
              </div>
              <div className="mt-6 text-xs font-medium text-slate-500">Across premium city zones</div>
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
                  <h3 className="text-4xl font-light tracking-tight text-white">{campaigns.filter(c => new Date(c.end_date) >= new Date()).length}</h3>
                </div>
              </div>
              <div className="mt-6 text-xs font-medium text-slate-400">In market circulation</div>
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
                    {Math.round((hoardings.filter(h => h.rent_status === 'Paid').length / hoardings.length || 0) * 100)}%
                  </h3>
                </div>
              </div>
              <div className="space-y-2 mt-4">
                <div className="w-full bg-slate-100 h-1.5 rounded-full overflow-hidden">
                  <motion.div 
                    initial={{ width: 0 }}
                    animate={{ width: `${(hoardings.filter(h => h.rent_status === 'Paid').length / hoardings.length || 0) * 100}%` }}
                    transition={{ duration: 1, ease: "easeOut" }}
                    className="bg-slate-900 h-full rounded-full" 
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
                ) : campaigns.length > 0 ? (
                  campaigns.map((campaign) => (
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
                        <div className="h-10 w-10 bg-white rounded-lg border border-slate-200 flex items-center justify-center text-slate-400 group-hover:text-indigo-600 group-hover:border-indigo-600/20 transition-all">
                          <CalendarDays className="w-5 h-5" />
                        </div>
                        <div>
                          <h4 className="text-sm font-bold text-slate-900 line-clamp-1">{campaign.client_info}</h4>
                          <p className="text-[10px] text-slate-400 font-bold uppercase tracking-widest mt-0.5">Asset ID: {campaign.hoarding_id}</p>
                        </div>
                      </div>
                      <div className="text-right">
                        <p className="text-[10px] font-mono text-slate-500">{format(parseISO(campaign.start_date), 'dd/MM/yyyy')} → {format(parseISO(campaign.end_date), 'dd/MM/yyyy')}</p>
                        <span className={cn(
                          "inline-block mt-1 px-2 py-0.5 rounded-full text-[9px] font-bold uppercase tracking-widest",
                          new Date(campaign.end_date) >= new Date() ? "bg-indigo-50 text-indigo-600" : "bg-slate-200 text-slate-600"
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
                      <p className="text-sm font-bold text-slate-900">{item.name}</p>
                      <p className="text-[10px] text-slate-400 uppercase tracking-widest font-bold font-mono">{item.type}</p>
                    </div>
                  </div>
                  <span className={cn(
                    "font-mono text-xs font-bold",
                    item.status === 'warning' ? "text-amber-500" : "text-slate-400"
                  )}>
                    {item.daysLeft}d
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
