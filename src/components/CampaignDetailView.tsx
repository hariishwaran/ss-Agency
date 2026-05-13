import { X, Calendar, User, MapPin, BarChart3, Clock, ChevronRight, FileText, Loader2, Trash2 } from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { Link } from 'react-router-dom';
import { useState, useEffect } from 'react';
import { Campaign, Hoarding } from '../types';
import { cn } from '../utils/cn';
import { calculateDays } from '../utils/date';
import { format, parseISO } from 'date-fns';
import { hoardingService } from '../services/hoardingService';

interface CampaignDetailViewProps {
  campaign: Campaign | null;
  onClose: () => void;
  onDelete?: (id: number) => Promise<boolean | void>;
}

export default function CampaignDetailView({ campaign, onClose, onDelete }: CampaignDetailViewProps) {
  const [hoarding, setHoarding] = useState<Hoarding | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);

  useEffect(() => {
    if (campaign?.hoarding_id) {
      loadHoardingData(campaign.hoarding_id);
    } else {
      setHoarding(null);
    }
  }, [campaign]);

  const loadHoardingData = async (id: number) => {
    try {
      setIsLoading(true);
      const data = await hoardingService.getById(id);
      setHoarding(data);
    } catch (error) {
      console.error('Error loading hoarding:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const handleDelete = async () => {
    if (!campaign || !onDelete) return;
    try {
      setIsDeleting(true);
      const success = await onDelete(campaign.id);
      if (success === true) onClose();
    } catch (error) {
      console.error('Error deleting campaign:', error);
    } finally {
      setIsDeleting(false);
    }
  };

  const isActive = campaign ? new Date(campaign.end_date) >= new Date() : false;

  return (
    <AnimatePresence>
      {campaign && (
        <div className="fixed inset-0 z-[100] flex items-center justify-end p-0 sm:p-4 focus:outline-none">
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={onClose}
            className="absolute inset-0 bg-slate-900/40 backdrop-blur-sm"
          />
          
          <motion.div
            initial={{ x: '100%' }}
            animate={{ x: 0 }}
            exit={{ x: '100%' }}
            transition={{ type: 'spring', damping: 25, stiffness: 200 }}
            className="relative w-full max-w-lg h-full sm:h-[calc(100vh-2rem)] bg-white sm:rounded-3xl shadow-2xl overflow-hidden border-l border-slate-200 flex flex-col"
          >
            {/* Header */}
            <div className="p-8 border-b border-slate-100 flex justify-between items-center bg-white sticky top-0 z-10">
              <div>
                <h3 className="text-2xl font-bold text-slate-900 tracking-tight line-clamp-1">{campaign.client_info}</h3>
                <div className="flex items-center gap-2 mt-1">
                   <span className={cn(
                      "px-2.5 py-0.5 rounded-full text-[10px] font-bold uppercase tracking-widest",
                      isActive ? "bg-slate-900 text-white" : "bg-slate-200 text-slate-600"
                    )}>
                      {isActive ? 'Active' : 'Completed'}
                    </span>
                    <span className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">#{campaign.id}</span>
                </div>
              </div>
              <button 
                onClick={onClose}
                className="p-2 text-slate-400 hover:text-slate-900 hover:bg-slate-100 rounded-full transition-all"
              >
                <X className="w-6 h-6" />
              </button>
            </div>

            {/* Content */}
            <div className="flex-1 overflow-y-auto p-8 space-y-8 custom-scrollbar">
              {/* Primary Info */}
              <div className="grid grid-cols-2 gap-4">
                <div className="p-4 bg-slate-50 rounded-2xl border border-slate-100">
                  <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-2">Client Description</p>
                  <div className="flex items-start gap-2">
                    <User className="w-4 h-4 text-indigo-600 mt-1" />
                    <span className="text-sm font-bold text-slate-900 leading-tight">{campaign.client_info}</span>
                  </div>
                </div>
                <div className="p-4 bg-slate-50 rounded-2xl border border-slate-100 flex flex-col justify-between">
                  <div>
                    <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-2">Timeline</p>
                    <div className="flex items-center gap-2">
                      <Calendar className="w-4 h-4 text-emerald-600" />
                      <span className="text-xs font-mono font-bold text-slate-900 break-all">{format(parseISO(campaign.start_date), 'dd/MM/yyyy')} → {format(parseISO(campaign.end_date), 'dd/MM/yyyy')}</span>
                    </div>
                  </div>
                  <div className="mt-2 pt-2 border-t border-slate-200">
                    <p className="text-[10px] font-bold text-slate-900">
                      {calculateDays(campaign.start_date, campaign.end_date)} Days Total
                    </p>
                  </div>
                </div>
              </div>

              {/* Internal Notes Section */}
              {campaign.internal_notes && (
                <div className="space-y-4">
                  <h4 className="text-xs font-bold text-slate-900 uppercase tracking-widest flex items-center gap-2">
                    <FileText className="w-4 h-4 text-indigo-600" /> Internal Notes
                  </h4>
                  <div className="p-5 bg-amber-50/50 border border-amber-100 rounded-2xl">
                    <p className="text-sm text-slate-700 leading-relaxed italic">
                      "{campaign.internal_notes}"
                    </p>
                  </div>
                </div>
              )}

              {/* Related Information Section */}
              <div className="space-y-4">
                <div className="flex items-center justify-between">
                  <h4 className="text-xs font-bold text-slate-900 uppercase tracking-widest flex items-center gap-2">
                    <MapPin className="w-4 h-4 text-indigo-600" /> Targeted Hoarding
                  </h4>
                </div>
                <div className="space-y-3">
                  {isLoading ? (
                    <div className="p-8 flex justify-center">
                      <Loader2 className="w-6 h-6 text-indigo-600 animate-spin" />
                    </div>
                  ) : hoarding ? (
                    <Link 
                      to={`/details/${hoarding.id}`}
                      onClick={onClose}
                      className="flex items-center justify-between p-4 bg-white border border-slate-200 rounded-xl hover:border-indigo-600/30 transition-all cursor-pointer group"
                    >
                      <div className="flex items-center gap-3">
                        <div className="w-8 h-8 rounded-lg bg-indigo-50 flex items-center justify-center text-indigo-600 group-hover:bg-indigo-600 group-hover:text-white transition-all">
                          <BarChart3 className="w-4 h-4" />
                        </div>
                        <div>
                          <p className="text-sm font-bold text-slate-900 line-clamp-1">{hoarding.location}</p>
                          <p className="text-[10px] text-slate-400 font-bold uppercase tracking-widest">{hoarding.width}×{hoarding.height} ft • {hoarding.rent_status}</p>
                        </div>
                      </div>
                      <ChevronRight className="w-4 h-4 text-slate-300 group-hover:text-indigo-600 transition-colors" />
                    </Link>
                  ) : (
                    <div className="p-8 border-2 border-dashed border-slate-100 rounded-2xl text-center">
                      <p className="text-xs font-bold text-slate-400 uppercase tracking-widest">Asset information unavailable</p>
                    </div>
                  )}
                </div>
              </div>


            </div>

            {/* Footer Actions */}
            <div className="p-8 border-t border-slate-100 bg-slate-50 flex gap-4">
               {onDelete && (
                 <button 
                   onClick={handleDelete}
                   disabled={isDeleting}
                   className="p-4 bg-red-50 text-red-600 border border-red-100 rounded-xl hover:bg-red-600 hover:text-white transition-all disabled:opacity-50"
                   title="Delete Campaign"
                 >
                   {isDeleting ? <Loader2 className="w-5 h-5 animate-spin" /> : <Trash2 className="w-5 h-5" />}
                 </button>
               )}
               <button 
                 onClick={onClose}
                 className="flex-1 py-4 bg-white text-slate-600 border border-slate-200 rounded-xl font-bold text-xs uppercase tracking-widest hover:bg-slate-50 transition-all font-mono"
               >
                  CLOSE
               </button>
               <button className="flex-1 py-4 bg-slate-900 text-white rounded-xl font-bold text-xs uppercase tracking-widest shadow-lg shadow-slate-200 hover:bg-slate-800 transition-all font-mono">
                  EXPORT REPORT
               </button>
            </div>
          </motion.div>
        </div>
      )}
    </AnimatePresence>
  );
}
