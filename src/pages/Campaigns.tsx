import { Filter, Plus, Calendar, User, MapPin, Search, AlertCircle, Loader2, Clock, Trash2, Edit3, ChevronRight, LayoutGrid, FileText } from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { useState, useEffect } from 'react';
import { Campaign, Hoarding } from '../types';
import { campaignService } from '../services/campaignService';
import { hoardingService } from '../services/hoardingService';
import { calculateDays, isPast, isFuture } from '../utils/date';
import { format, parseISO } from 'date-fns';
import CampaignModal from '../components/CampaignModal';
import BookingCalendar from '../components/BookingCalendar';
import ConfirmDialog from '../components/ConfirmDialog';
import { useConfirm } from '../hooks/useConfirm';
import { useAlert } from '../hooks/useAlert';
import { cn } from '../utils/cn';
import { useSearch } from '../context/SearchContext';
import { useNavigate } from 'react-router-dom';

export default function Campaigns() {
  const navigate = useNavigate();
  const [campaigns, setCampaigns] = useState<Campaign[]>([]);
  const [hoardings, setHoardings] = useState<Record<number, Hoarding>>({});
  const [isLoading, setIsLoading] = useState(true);
  const { searchQuery } = useSearch();
  const { confirm, confirmProps } = useConfirm();
  const { alert: showAlert, alertProps } = useAlert();
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingCampaign, setEditingCampaign] = useState<Campaign | null>(null);
  const [deletingId, setDeletingId] = useState<number | null>(null);
  const [filter, setFilter] = useState<'all' | 'active' | 'upcoming' | 'past'>('all');
  const [viewMode, setViewMode] = useState<'grid' | 'calendar'>('grid');

  useEffect(() => {
    fetchData();
  }, []);

  const fetchData = async () => {
    try {
      setIsLoading(true);
      const [campaignData, hoardingData] = await Promise.all([
        campaignService.getAll(),
        hoardingService.getAll()
      ]);
      
      setCampaigns(campaignData);
      
      const hoardingMap: Record<number, Hoarding> = {};
      hoardingData.forEach(h => {
        hoardingMap[h.id] = h;
      });
      setHoardings(hoardingMap);
    } catch (error) {
      console.error('Error fetching campaigns:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const handleCreateCampaign = async (formData: any) => {
    try {
      if (formData.hoarding_ids && formData.hoarding_ids.length > 0) {
        // Create multiple campaigns
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
        // Fallback for single create if needed
        await campaignService.create(formData);
      }
      setIsModalOpen(false);
      fetchData();
    } catch (error) {
      console.error('Error creating campaign:', error);
    }
  };

  const handleUpdateCampaign = async (id: number, updatedData: Partial<Campaign>) => {
    try {
      await campaignService.update(id, updatedData);
      setIsModalOpen(false);
      setEditingCampaign(null);
      fetchData();
    } catch (error) {
      console.error('Error updating campaign:', error);
    }
  };

  const handleDeleteCampaign = async (id: number) => {
    const isConfirmed = await confirm({
      title: 'Delete Campaign',
      message: 'Are You Sure You Want To Remove This Campaign?',
      variant: 'danger'
    });

    if (isConfirmed) {
      try {
        setDeletingId(id);
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
      } finally {
        setDeletingId(null);
      }
    }
    return false;
  };

  const getStatus = (start: string, end: string) => {
    if (isPast(end)) return 'past';
    if (isFuture(start)) return 'upcoming';
    return 'active';
  };

  const filteredCampaigns = campaigns.filter(c => {
    const status = getStatus(c.start_date, c.end_date);
    const matchesFilter = filter === 'all' || status === filter;
    const matchesSearch = c.client_info.toLowerCase().includes(searchQuery.toLowerCase()) || 
                          hoardings[c.hoarding_id]?.location.toLowerCase().includes(searchQuery.toLowerCase());
    return matchesFilter && matchesSearch;
  });

  return (
    <div className="space-y-10 pb-20">
      <div className="bg-white p-6 rounded-3xl border border-slate-200 shadow-sm flex flex-col md:flex-row gap-4 justify-between items-center">
        <div className="flex items-center gap-6 w-full md:w-auto">
          <div className="flex items-center gap-2 p-1.5 bg-slate-50 rounded-xl border border-slate-200 overflow-x-auto no-scrollbar">
            {(['all', 'active', 'upcoming', 'past'] as const).map((f) => (
              <button
                key={f}
                onClick={() => setFilter(f)}
                className={cn(
                  "px-4 py-2 rounded-lg text-[10px] font-bold uppercase tracking-widest transition-all whitespace-nowrap",
                  filter === f ? "bg-slate-900 text-white shadow-sm" : "text-slate-400 hover:text-indigo-600"
                )}
              >
                {f}
              </button>
            ))}
          </div>

          <div className="h-8 w-px bg-slate-200 hidden md:block" />

          <div className="flex items-center gap-1 p-1 bg-slate-50 rounded-xl border border-slate-200">
            <button
              onClick={() => setViewMode('grid')}
              className={cn(
                "p-2 rounded-lg transition-all",
                viewMode === 'grid' ? "bg-slate-900 text-white shadow-sm" : "text-slate-400 hover:text-indigo-600"
              )}
            >
              <LayoutGrid className="w-4 h-4" />
            </button>
            <button
              onClick={() => setViewMode('calendar')}
              className={cn(
                "p-2 rounded-lg transition-all",
                viewMode === 'calendar' ? "bg-slate-900 text-white shadow-sm" : "text-slate-400 hover:text-indigo-600"
              )}
            >
              <Calendar className="w-4 h-4" />
            </button>
          </div>
        </div>

        <button 
          onClick={() => setIsModalOpen(true)}
          className="bg-slate-900 text-white px-6 py-3.5 rounded-2xl font-bold text-xs uppercase tracking-widest hover:bg-slate-800 transition-all shadow-xl shadow-slate-200 flex items-center gap-2 group whitespace-nowrap"
        >
          <Plus className="w-4 h-4 group-hover:rotate-90 transition-transform" />
          Launch Campaign
        </button>
      </div>

      {isLoading ? (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 2xl:grid-cols-4 gap-5">
          {Array.from({ length: 8 }).map((_, i) => (
            <div key={i} className="bg-white rounded-2xl border border-slate-200 overflow-hidden shadow-sm flex flex-col h-[280px]">
              <div className="p-5 flex-1 space-y-5">
                <div className="flex justify-between items-center mb-2">
                  <div className="w-20 h-6 bg-slate-100 rounded-md animate-pulse"></div>
                  <div className="w-16 h-4 bg-slate-100 rounded-md animate-pulse"></div>
                </div>
                <div className="w-3/4 h-6 bg-slate-100 rounded-md animate-pulse mb-4"></div>
                <div className="space-y-4">
                  <div className="flex items-start gap-3">
                    <div className="w-8 h-8 rounded-lg bg-slate-100 animate-pulse"></div>
                    <div className="flex-1 space-y-2 pt-1">
                      <div className="w-full h-3 bg-slate-100 rounded-md animate-pulse"></div>
                      <div className="w-2/3 h-3 bg-slate-100 rounded-md animate-pulse"></div>
                    </div>
                  </div>
                  <div className="h-px bg-slate-100 w-full" />
                  <div className="flex items-center justify-between">
                    <div className="w-16 h-3 bg-slate-100 rounded-md animate-pulse"></div>
                    <div className="w-24 h-4 bg-slate-100 rounded-md animate-pulse"></div>
                  </div>
                </div>
              </div>
              <div className="px-5 py-4 bg-slate-50 border-t border-slate-100 flex items-center justify-between mt-auto">
                <div className="w-16 h-3 bg-slate-100 rounded-md animate-pulse"></div>
                <div className="w-24 h-4 bg-slate-100 rounded-lg animate-pulse"></div>
              </div>
            </div>
          ))}
        </div>
      ) : viewMode === 'calendar' ? (
        <motion.div
          initial={{ opacity: 0, scale: 0.99 }}
          animate={{ opacity: 1, scale: 1 }}
          className="animate-in fade-in duration-500"
        >
          <BookingCalendar 
            bookings={filteredCampaigns.map(c => ({
              startDate: new Date(c.start_date),
              endDate: new Date(c.end_date),
              campaignName: `${c.client_info} (${hoardings[c.hoarding_id]?.location || 'N/A'})`
            }))} 
          />
        </motion.div>
      ) : filteredCampaigns.length > 0 ? (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 2xl:grid-cols-4 gap-5">
          <AnimatePresence mode="popLayout">
            {filteredCampaigns.map((campaign) => {
              const status = getStatus(campaign.start_date, campaign.end_date);
              const site = hoardings[campaign.hoarding_id];

              return (
                <motion.div
                  layout
                  key={campaign.id}
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, scale: 0.95 }}
                  onClick={() => navigate('/campaigns/' + campaign.id)}
                  className={cn(
                    "rounded-2xl border overflow-hidden shadow-sm hover:shadow-md transition-all group flex flex-col h-full cursor-pointer",
                    status === 'active' ? "bg-emerald-50/60 border-emerald-200" :
                    status === 'upcoming' ? "bg-amber-50/60 border-amber-200" :
                    "bg-slate-50/60 border-slate-200"
                  )}
                >
                  <div className="p-5 flex-1 space-y-4">
                    <div className="flex justify-between items-center mb-1">
                      <div className={cn(
                        "px-2.5 py-1 rounded-lg text-[9px] font-black uppercase tracking-widest",
                        status === 'active' ? "bg-emerald-50 text-emerald-600 border border-emerald-100" :
                        status === 'upcoming' ? "bg-amber-50 text-amber-600 border border-amber-100" :
                        "bg-slate-100 text-slate-500 border border-slate-200"
                      )}>
                        {status}
                      </div>
                      <div className="flex items-center gap-2">
                        {/* Status label already here, no need for action here anymore */}
                      </div>
                    </div>

                    <div className="space-y-3">
                      <div>
                        <h4 className="text-base font-bold text-slate-900 group-hover:text-indigo-600 transition-colors leading-tight line-clamp-1">
                          {campaign.client_info}
                        </h4>
                        <div className="flex items-center gap-1.5 mt-1.5">
                          <MapPin className="w-3 h-3 text-indigo-400" />
                          <p className="text-[10px] font-bold text-slate-400 uppercase tracking-tight truncate">
                            {site?.location || 'Unknown Asset'}
                          </p>
                        </div>
                      </div>

                      <div className="space-y-2 pt-1">
                        <div className="flex items-center justify-between group/line">
                          <span className="text-[9px] font-bold text-slate-400 uppercase tracking-widest">Period</span>
                          <div className="flex flex-col items-end">
                            <span className="text-xs font-bold text-slate-700">{format(parseISO(campaign.start_date), 'dd/MM/yyyy')}</span>
                            <span className="text-[9px] font-medium text-slate-400">to {format(parseISO(campaign.end_date), 'dd/MM/yyyy')}</span>
                          </div>
                        </div>
                        
                        <div className={cn(
                          "h-px w-full",
                          status === 'active' ? "bg-emerald-200/50" :
                          status === 'upcoming' ? "bg-amber-200/50" :
                          "bg-slate-200/50"
                        )} />

                        <div className="flex items-center justify-between">
                          <span className="text-[9px] font-bold text-slate-400 uppercase tracking-widest">Duration</span>
                          <div className="flex items-center gap-1.5 text-indigo-600">
                            <Clock className="w-3 h-3" />
                            <span className="text-xs font-black">{calculateDays(campaign.start_date, campaign.end_date)} Days</span>
                          </div>
                        </div>
                      </div>
                    </div>
                  </div>

                  <div className={cn(
                    "px-5 py-3 border-t flex items-center justify-between mt-auto",
                    status === 'active' ? "bg-emerald-100/50 border-emerald-100" :
                    status === 'upcoming' ? "bg-amber-100/50 border-amber-100" :
                    "bg-slate-200/50 border-slate-200/50"
                  )}>
                    <div className="flex items-center gap-3">
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          setEditingCampaign(campaign);
                          setIsModalOpen(true);
                        }}
                        className="flex items-center gap-1.5 px-3 py-1.5 bg-white border border-slate-200 text-slate-900 rounded-lg text-[9px] font-black uppercase tracking-widest hover:bg-slate-900 hover:text-white transition-all shadow-sm"
                      >
                        <Edit3 className="w-3 h-3" />
                        Edit
                      </button>
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          handleDeleteCampaign(campaign.id);
                        }}
                        className="p-1.5 text-slate-400 hover:text-red-600 transition-all"
                        title="Delete"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    </div>
                    {campaign.internal_notes ? (
                      <span className="text-[9px] font-bold text-slate-400 uppercase tracking-widest flex items-center gap-2">
                         <FileText className="w-3 h-3" /> Notes
                      </span>
                    ) : (
                      <span className="text-[9px] text-slate-300 italic">No notes</span>
                    )}
                  </div>
                </motion.div>
              );
            })}
          </AnimatePresence>
        </div>
      ) : (
        <div className="bg-white py-32 rounded-[40px] border-2 border-dashed border-slate-200 flex flex-col items-center text-center px-6">
          <div className="w-20 h-20 bg-slate-50 rounded-full flex items-center justify-center text-slate-400 mb-6">
            <Calendar className="w-10 h-10" />
          </div>
          <h3 className="text-2xl font-bold text-slate-900 tracking-tight mb-2">Static Archive</h3>
          <p className="text-slate-500 max-w-sm mb-8 font-medium">No campaigns have been deployed yet. Launch your first strategic placement.</p>
          <button 
            onClick={() => setIsModalOpen(true)}
            className="px-8 py-4 bg-indigo-600 text-white rounded-2xl font-bold text-xs uppercase tracking-widest hover:bg-black transition-all shadow-xl shadow-indigo-100 flex items-center gap-2"
          >
            <Plus className="w-4 h-4" />
            New Campaign
          </button>
        </div>
      )}

      <CampaignModal 
        isOpen={isModalOpen}
        onClose={() => {
          setIsModalOpen(false);
          setEditingCampaign(null);
        }}
        onCreate={handleCreateCampaign}
        onUpdate={handleUpdateCampaign}
        onDelete={handleDeleteCampaign}
        campaign={editingCampaign}
      />

      <ConfirmDialog {...confirmProps} />
      <ConfirmDialog {...alertProps} />
    </div>
  );
}
