import { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { campaignService } from '../services/campaignService';
import { hoardingService } from '../services/hoardingService';
import { Campaign, Hoarding } from '../types';
import { calculateDays, isPast, isFuture } from '../utils/date';
import { format, parseISO } from 'date-fns';
import { Loader2, ArrowLeft, Building2, Calendar as CalendarIcon, FileText, ChevronRight, Activity, Handshake, MapPin, Trash2, TrendingUp } from 'lucide-react';
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
    <div className="space-y-8 max-w-6xl animate-in fade-in duration-500 pb-20">
      {/* Header, Back link and Breadcrumbs */}
      <div className="space-y-4">
        <div className="flex items-center gap-3">
          <button 
            onClick={() => navigate('/campaigns')}
            className="flex items-center gap-1.5 text-slate-400 font-bold text-xs hover:text-slate-800 transition-colors uppercase tracking-widest cursor-pointer"
          >
            <ArrowLeft className="w-3.5 h-3.5" /> Back
          </button>
          <span className="text-slate-300">|</span>
          <div className="flex items-center text-[10px] font-black uppercase tracking-widest text-slate-400">
            <button onClick={() => navigate('/campaigns')} className="hover:text-slate-800 transition-colors cursor-pointer">Campaigns</button>
            <span className="mx-2 text-slate-300">&gt;</span>
            <span className="text-slate-800">{campaign.client_info}</span>
          </div>
        </div>

        <div className="flex items-center gap-4">
          <h1 className="text-4xl font-extrabold tracking-tight text-slate-900 font-sans">
            {campaign.client_info}
          </h1>
          <span className={cn(
            "px-3 py-1.5 rounded-lg text-[10px] font-black uppercase tracking-widest",
            status === 'active' ? "bg-emerald-50 text-emerald-700 border border-emerald-100" :
            status === 'upcoming' ? "bg-indigo-50 text-indigo-700 border border-indigo-100" :
            "bg-slate-50 text-slate-600 border border-slate-100"
          )}>
            {status}
          </span>
        </div>
      </div>

      <section className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-stretch">
        {/* Left Bento Column */}
        <div className="lg:col-span-8 flex flex-col gap-8">
          
          {/* Campaign Progress Card */}
          <div className="bg-white p-8 rounded-[2rem] border border-slate-200/60 shadow-sm relative overflow-hidden flex flex-col justify-between h-full min-h-[220px]">
            <h3 className="text-[10px] font-black text-indigo-600 uppercase tracking-[0.2em] mb-8 flex items-center gap-2">
              <CalendarIcon className="w-4 h-4 text-indigo-600" />
              Campaign Progress
            </h3>
            
            <div className="space-y-6">
              <div className="relative h-2 bg-slate-100 rounded-full overflow-hidden">
                <motion.div 
                  initial={{ width: 0 }}
                  animate={{ width: `${progress}%` }}
                  transition={{ duration: 1, ease: 'easeOut' }}
                  className={cn(
                    "absolute left-0 top-0 bottom-0 rounded-full bg-blue-600",
                    status === 'active' ? "shadow-[0_0_12px_rgba(37,99,235,0.4)]" : ""
                  )}
                />
              </div>

              <div className="flex justify-between items-end pt-2">
                <div className="space-y-1">
                  <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">Elapsed Time</p>
                  <p className="text-5xl font-black text-slate-900 tracking-tight">
                    {elapsedDays} <span className="text-xs font-extrabold text-slate-400 uppercase tracking-widest ml-0.5">Days</span>
                  </p>
                </div>
                <div className="text-right space-y-1">
                  <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">Completion</p>
                  <p className="text-5xl font-black text-slate-900 tracking-tight">{Math.round(progress)}%</p>
                </div>
              </div>
            </div>
          </div>

          {/* Campaign Details Card */}
          <div className="bg-slate-50/50 p-8 rounded-[2rem] border border-slate-200/50 space-y-6">
            <h3 className="text-[10px] font-black text-indigo-600 uppercase tracking-[0.2em] mb-4 flex items-center gap-2">
              <FileText className="w-4 h-4 text-indigo-600" /> Campaign Details
            </h3>
            
            <div className="space-y-5">
              <div className="flex justify-between items-center pb-4 border-b border-slate-200/40">
                <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">Client Info</p>
                <p className="text-sm font-extrabold text-slate-900">{campaign.client_info}</p>
              </div>
              
              <div className="grid grid-cols-2 gap-4 pb-4 border-b border-slate-200/40">
                <div>
                  <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-1">Start Date</p>
                  <p className="text-sm font-extrabold text-slate-800">{format(parseISO(campaign.start_date), 'MMM dd, yyyy')}</p>
                </div>
                <div>
                  <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-1">End Date</p>
                  <p className="text-sm font-extrabold text-slate-800">{format(parseISO(campaign.end_date), 'MMM dd, yyyy')}</p>
                </div>
              </div>

              <div className="flex justify-between items-center pb-4 border-b border-slate-200/40">
                <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">Hoarding ID</p>
                <span className="bg-slate-200/60 text-slate-700 px-2.5 py-1 rounded-lg font-mono text-xs font-bold">
                  #HID-{1000 + campaign.hoarding_id}
                </span>
              </div>

              {campaign.internal_notes && (
                <div className="pt-2">
                  <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-2">Internal Notes</p>
                  <p className="text-sm text-slate-650 italic leading-relaxed font-sans font-medium">
                    {campaign.internal_notes}
                  </p>
                </div>
              )}
            </div>
          </div>
        </div>

        {/* Right Section: Target Asset Card */}
        <aside className="lg:col-span-4 h-full">
          {hoarding ? (
            <div 
              onClick={() => navigate('/details/' + hoarding.id)}
              className="bg-white rounded-[2rem] border border-slate-200/60 p-6 shadow-sm hover:shadow-lg transition-all cursor-pointer group flex flex-col justify-between h-full min-h-[480px]"
            >
              <div>
                {/* Top card actions */}
                <div className="flex justify-between items-center mb-6">
                  <span className="px-4 py-2 border border-indigo-100 bg-indigo-50/30 text-indigo-600 rounded-full text-xs font-black uppercase tracking-widest">
                    {hoarding.width} X {hoarding.height} FT
                  </span>
                  
                  <button 
                    onClick={(e) => { e.stopPropagation(); handleDelete(); }}
                    className="flex items-center gap-1 text-[10px] font-black text-red-500 uppercase tracking-widest hover:text-red-700 transition-colors cursor-pointer"
                  >
                    <Trash2 className="w-3.5 h-3.5" /> Delete Campaign
                  </button>
                </div>

                {/* Hoarding Image */}
                <div className="aspect-[4/3] rounded-2xl overflow-hidden bg-slate-50 border border-slate-100 mb-6">
                  <img 
                    src={hoarding.image_url || 'https://images.unsplash.com/photo-1541746972996-4e0b0f43e02a?q=80&w=2070&auto=format&fit=crop'} 
                    alt={hoarding.location}
                    className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-[1.5s]"
                    referrerPolicy="no-referrer"
                  />
                </div>

                {/* Asset Metadata */}
                <div className="space-y-2">
                  <div className="flex justify-between items-center">
                    <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Target Asset</p>
                    <ChevronRight className="w-4 h-4 text-slate-400 group-hover:text-slate-800 transition-colors" />
                  </div>
                  <h4 className="text-3xl font-black text-slate-900 leading-tight tracking-tight line-clamp-2">
                    {hoarding.location}
                  </h4>
                </div>
              </div>

              {/* Status Deployment details */}
              <div className="border-t border-slate-100 pt-6 mt-8 flex items-center gap-2 text-xs font-bold text-slate-500 uppercase tracking-widest">
                <MapPin className="w-4 h-4 text-indigo-500 flex-shrink-0" />
                <span>Active Deployment</span>
              </div>
            </div>
          ) : (
            <div className="bg-slate-50 border border-slate-200/60 rounded-[2rem] p-8 text-center flex items-center justify-center h-full min-h-[480px]">
              <div className="space-y-3">
                <Loader2 className="w-6 h-6 animate-spin text-slate-400 mx-auto" />
                <p className="text-sm font-semibold text-slate-400 uppercase tracking-widest">Loading Asset...</p>
              </div>
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
