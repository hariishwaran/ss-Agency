import { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { campaignService } from '../services/campaignService';
import { hoardingService } from '../services/hoardingService';
import { Campaign, Hoarding } from '../types';
import { calculateDays, isPast, isFuture } from '../utils/date';
import { format, parseISO } from 'date-fns';
import { Loader2, ArrowLeft, Building2, Calendar as CalendarIcon, FileText, ChevronRight, Activity, Handshake, MapPin, Trash2 } from 'lucide-react';
import { cn } from '../utils/cn';
import { motion } from 'motion/react';
import ConfirmDialog from '../components/ConfirmDialog';

export default function CampaignDetails() {
  const { id } = useParams();
  const navigate = useNavigate();
  const [campaign, setCampaign] = useState<Campaign | null>(null);
  const [hoarding, setHoarding] = useState<Hoarding | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [confirmConfig, setConfirmConfig] = useState<{
    isOpen: boolean;
    title: string;
    message: string;
    onConfirm: () => void;
    variant?: 'danger' | 'warning' | 'info';
  }>({
    isOpen: false,
    title: '',
    message: '',
    onConfirm: () => {},
  });

  const getStatus = (start: string, end: string) => {
    if (isPast(end)) return 'past';
    if (isFuture(start)) return 'upcoming';
    return 'active';
  };

  const handleDelete = async () => {
    if (!campaign) return;
    setConfirmConfig({
      isOpen: true,
      title: 'Delete Campaign',
      message: 'Are you sure you want to delete this campaign deployment record?',
      variant: 'danger',
      onConfirm: async () => {
        try {
          setIsLoading(true);
          await campaignService.delete(campaign.id);
          navigate('/campaigns');
        } catch (error: any) {
          console.error('Error deleting campaign:', error);
          setConfirmConfig({
            isOpen: true,
            title: 'Deletion Failed',
            message: error.message || 'Check database permissions',
            variant: 'danger',
            onConfirm: () => {},
          });
          setIsLoading(false);
        }
      }
    });
  };

  useEffect(() => {
    async function loadData() {
      if (!id) return;
      setIsLoading(true);
      try {
        const campaignData = await campaignService.getById(parseInt(id, 10));
        setCampaign(campaignData);
        if (campaignData) {
          const hoardingData = await hoardingService.getById(campaignData.hoarding_id);
          setHoarding(hoardingData);
        }
      } catch (error) {
        console.error('Failed to load campaign details', error);
      } finally {
        setIsLoading(false);
      }
    }
    loadData();
  }, [id]);

  if (isLoading) {
    return (
      <div className="space-y-12 animate-in fade-in duration-500 pb-20">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-6">
          <div className="w-40 h-5 bg-slate-200 rounded-md animate-pulse"></div>
          <div className="w-56 h-12 bg-slate-200 rounded-2xl animate-pulse"></div>
        </div>

        <section className="grid grid-cols-1 lg:grid-cols-12 gap-10">
          <div className="lg:col-span-8 space-y-10">
            <div>
              <div className="w-48 h-10 bg-slate-200 rounded-lg animate-pulse mb-4"></div>
              <div className="w-full h-6 bg-slate-200 rounded-md animate-pulse"></div>
            </div>
            <div className="grid grid-cols-2 gap-6">
              {Array.from({ length: 4 }).map((_, i) => (
                <div key={i} className="p-6 bg-white rounded-3xl border border-slate-200 shadow-sm">
                   <div className="w-full h-3 bg-slate-200 rounded animate-pulse mb-3"></div>
                   <div className="w-16 h-8 bg-slate-200 rounded-lg animate-pulse"></div>
                </div>
              ))}
            </div>
          </div>
          <div className="lg:col-span-4 space-y-6">
             <div className="w-full h-[300px] bg-slate-200 rounded-3xl animate-pulse"></div>
          </div>
        </section>
      </div>
    );
  }

  if (!campaign) return null;

  const status = getStatus(campaign.start_date, campaign.end_date);
  const totalDays = calculateDays(campaign.start_date, campaign.end_date) || 1;
  const elapsedDays = status === 'active' ? calculateDays(campaign.start_date, new Date().toISOString()) : 
                      status === 'past' ? totalDays : 0;
  const progress = Math.min(100, Math.max(0, (elapsedDays / totalDays) * 100));

  return (
    <div className="space-y-12 max-w-6xl animate-in fade-in duration-500 pb-20">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-6">
        <div className="flex items-center text-sm text-slate-500 font-medium tracking-wide">
          <button onClick={() => navigate('/campaigns')} className="hover:text-slate-900 transition-colors">Campaigns</button>
          <ChevronRight className="w-4 h-4 mx-2" />
          <span className="text-slate-900 truncate max-w-[200px]">{campaign.client_info}</span>
        </div>
        <button 
          onClick={handleDelete}
          className="flex items-center gap-2 px-6 py-3 bg-white text-red-500 border border-slate-200 rounded-xl font-bold text-xs uppercase tracking-widest hover:bg-red-50 transition-all shadow-sm"
        >
          <Trash2 className="w-4 h-4" /> Delete Campaign
        </button>
      </div>

      <div className="flex flex-col md:flex-row md:items-end justify-between gap-6 pb-6 border-b border-slate-200">
        <div>
          <h1 className="text-4xl font-bold tracking-tight text-slate-900 mb-3">{campaign.client_info}</h1>
          <div className="flex items-center gap-4">
            <span className={cn(
              "px-3 py-1 rounded-full text-xs font-bold uppercase tracking-widest flex items-center gap-1.5",
              status === 'active' ? "bg-emerald-100 text-emerald-800" :
              status === 'upcoming' ? "bg-amber-100 text-amber-800" :
              "bg-slate-100 text-slate-600"
            )}>
              {status === 'active' && <span className="w-1.5 h-1.5 rounded-full bg-emerald-600 animate-pulse" />}
              {status}
            </span>
          </div>
        </div>
      </div>

      <section className="grid grid-cols-1 lg:grid-cols-12 gap-8 mb-12">
        <article className="lg:col-span-8 flex flex-col gap-8">
          
          {/* Timeline Bento Box */}
          <div className="bg-white p-8 rounded-[2rem] border border-slate-200 shadow-sm relative overflow-hidden">
            <h3 className="text-[10px] font-black text-slate-400 uppercase tracking-[0.2em] mb-8 flex items-center gap-2">
              <CalendarIcon className="w-4 h-4 text-slate-900" />
              Campaign Progress
            </h3>
            
            <div className="space-y-6">
              <div className="relative h-2.5 bg-slate-100 rounded-full overflow-hidden">
                <motion.div 
                  initial={{ width: 0 }}
                  animate={{ width: `${progress}%` }}
                  transition={{ duration: 1, ease: 'easeOut' }}
                  className={cn(
                    "absolute left-0 top-0 bottom-0 rounded-full",
                    status === 'active' ? "bg-slate-900 shadow-[0_0_12px_rgba(15,23,42,0.3)]" : "bg-slate-400"
                  )}
                />
              </div>

              <div className="flex justify-between items-end">
                <div className="space-y-1">
                  <p className="text-[10px] font-bold text-slate-300 uppercase tracking-widest">Elapsed Time</p>
                  <p className="text-2xl font-black text-slate-900 tracking-tighter">
                    {elapsedDays} <span className="text-xs text-slate-400 font-bold uppercase tracking-widest">Days</span>
                  </p>
                </div>
                <div className="text-right space-y-1">
                  <p className="text-[10px] font-bold text-slate-300 uppercase tracking-widest">Completion</p>
                  <p className="text-2xl font-black text-slate-900 tracking-tighter">{Math.round(progress)}%</p>
                </div>
              </div>
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
            {/* Client Info */}
            <div className="bg-indigo-50/50 p-8 rounded-[2rem] border border-indigo-100 flex flex-col">
              <h3 className="text-[10px] font-black text-indigo-900 uppercase tracking-[0.2em] mb-8 flex items-center gap-2">
                <FileText className="w-4 h-4" /> Client Metadata
              </h3>
              <div className="space-y-6 flex-1">
                <div>
                  <p className="text-[10px] font-bold text-indigo-300 uppercase tracking-widest mb-1">Entity Name</p>
                  <p className="text-xl font-bold text-indigo-900">{campaign.client_info}</p>
                </div>
                {campaign.internal_notes && (
                  <div className="bg-white/60 p-5 rounded-2xl border border-indigo-100/50">
                    <p className="text-[10px] font-bold text-indigo-300 uppercase tracking-widest mb-2">Internal Strategy</p>
                    <p className="text-sm text-indigo-900/70 italic leading-relaxed">{campaign.internal_notes}</p>
                  </div>
                )}
              </div>
            </div>

            {/* Performance */}
            <div className="bg-slate-900 p-8 rounded-[2rem] text-white shadow-xl flex flex-col justify-center relative overflow-hidden">
              <div className="absolute top-0 right-0 p-8 opacity-10">
                <Activity className="w-24 h-24" />
              </div>
              <h3 className="text-[10px] font-black text-indigo-400 uppercase tracking-[0.2em] mb-8 flex items-center gap-2">
                <Activity className="w-4 h-4" /> Intelligence
              </h3>
              <div>
                <p className="text-[10px] font-bold text-slate-500 uppercase tracking-widest mb-1">Estimated Gross Impressions</p>
                <p className="text-4xl font-black text-white tracking-tighter">
                  {Math.floor(totalDays * 1250).toLocaleString()}<span className="text-indigo-500 ml-1">+</span>
                </p>
                <p className="mt-4 text-[10px] text-slate-500 font-bold uppercase tracking-[0.15em] leading-relaxed">
                  Traffic derived projection
                </p>
              </div>
            </div>
          </div>
        </article>


        <aside className="lg:col-span-4 flex flex-col gap-8">
           {hoarding ? (
            <div 
              onClick={() => navigate('/details/' + hoarding.id)}
              className="bg-white rounded-3xl border border-slate-200 overflow-hidden shadow-sm hover:shadow-md transition-shadow cursor-pointer group"
            >
              <div className="aspect-[4/3] bg-slate-100 relative overflow-hidden">
                <img 
                  src={hoarding.image_url || 'https://images.unsplash.com/photo-1541746972996-4e0b0f43e02a?q=80&w=2070&auto=format&fit=crop'} 
                  alt={hoarding.location}
                  className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-700"
                />
                <div className="absolute top-4 left-4">
                  <span className="px-3 py-1.5 bg-white/90 backdrop-blur-sm text-xs font-black uppercase tracking-widest text-indigo-600 rounded-lg shadow-sm">
                    {hoarding.width} x {hoarding.height} ft
                  </span>
                </div>
              </div>
              <div className="p-6">
                <h4 className="text-sm font-bold text-slate-400 uppercase tracking-widest mb-2 flex items-center justify-between">
                  Target Asset <ChevronRight className="w-4 h-4" />
                </h4>
                <p className="text-lg font-bold text-slate-900 line-clamp-2">
                  {hoarding.location}
                </p>
                <div className="flex items-center gap-2 mt-4 text-sm text-slate-500">
                  <MapPin className="w-4 h-4 shrink-0" />
                  <span className="truncate">Active Deployment</span>
                </div>
              </div>
            </div>
           ) : (
             <div className="bg-slate-50 border border-slate-200 rounded-3xl p-8 text-center">
                <p className="text-sm text-slate-500">Loading asset...</p>
             </div>
           )}
        </aside>
      </section>

      <ConfirmDialog
        isOpen={confirmConfig.isOpen}
        title={confirmConfig.title}
        message={confirmConfig.message}
        variant={confirmConfig.variant}
        onConfirm={confirmConfig.onConfirm}
        onCancel={() => setConfirmConfig(prev => ({ ...prev, isOpen: false }))}
      />
    </div>
  );
}
