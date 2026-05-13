import { ArrowLeft, MapPin, Handshake, Info, Shield, PlusCircle, Lightbulb, Send, TrendingUp, ChevronRight, Edit3, Trash2, Camera, MoreHorizontal, Loader2 } from 'lucide-react';
import { motion } from 'motion/react';
import { useNavigate, useParams, Link } from 'react-router-dom';
import { useState, useEffect } from 'react';
import { cn } from '../utils/cn';
import BookingCalendar from '../components/BookingCalendar';
import ConfirmDialog from '../components/ConfirmDialog';
import { Hoarding } from '../types';
import { hoardingService } from '../services/hoardingService';
import { campaignService } from '../services/campaignService';
import CampaignModal from '../components/CampaignModal';
import { format, parseISO } from 'date-fns';

export default function SiteDetails() {
  const navigate = useNavigate();
  const { id } = useParams();
  const [hoarding, setHoarding] = useState<Hoarding | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [bookings, setBookings] = useState<any[]>([]);
  const [deletingId, setDeletingId] = useState<number | null>(null);
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

  useEffect(() => {
    if (id) {
      loadHoarding();
      loadBookings();
    }
  }, [id]);

  const loadHoarding = async () => {
    try {
      setIsLoading(true);
      const data = await hoardingService.getById(Number(id));
      setHoarding(data);
    } catch (error) {
      console.error('Error loading hoarding:', error);
      navigate('/inventory');
    } finally {
      setIsLoading(false);
    }
  };

  const handleDelete = async () => {
    if (!hoarding) return;
    setConfirmConfig({
      isOpen: true,
      title: 'Delete Site',
      message: 'CRITICAL: Removing this site will also delete all its active/past campaigns and payment history. This action cannot be undone. Proceed?',
      variant: 'danger',
      onConfirm: async () => {
        try {
          setDeletingId(hoarding.id);
          await hoardingService.delete(hoarding.id);
          navigate('/inventory');
        } catch (error: any) {
          console.error('Error deleting hoarding:', error);
          setConfirmConfig({
            isOpen: true,
            title: 'Deletion Failed',
            message: error.message || 'Check database permissions',
            variant: 'danger',
            onConfirm: () => {},
          });
        } finally {
          setDeletingId(null);
        }
      }
    });
  };

  const loadBookings = async () => {
    try {
      const siteBookings = await campaignService.getByHoardingId(Number(id));
      setBookings(siteBookings.map(c => ({
        startDate: new Date(c.start_date),
        endDate: new Date(c.end_date),
        campaignName: c.client_info
      })));
    } catch (error) {
      console.error('Error loading bookings:', error);
    }
  };

  const handleCreateCampaign = async (formData: any) => {
    try {
      if (formData.hoarding_ids && formData.hoarding_ids.length > 0) {
        await Promise.all(formData.hoarding_ids.map((hId: number) => 
          campaignService.create({
            client_info: formData.client_info,
            start_date: formData.start_date,
            end_date: formData.end_date,
            hoarding_id: hId,
            internal_notes: formData.internal_notes
          })
        ));
      } else {
        await campaignService.create(formData);
      }
      setIsModalOpen(false);
      navigate('/campaigns');
    } catch (error) {
      console.error('Error creating campaign:', error);
    }
  };

  if (isLoading) {
    return (
      <div className="space-y-12 animate-in fade-in duration-500 pb-20">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-6">
          <div className="space-y-3">
            <div className="w-32 h-4 bg-slate-200 rounded animate-pulse"></div>
            <div className="w-64 h-10 bg-slate-200 rounded-lg animate-pulse"></div>
          </div>
          <div className="w-56 h-14 bg-slate-200 rounded-2xl animate-pulse"></div>
        </div>

        <section className="grid grid-cols-1 lg:grid-cols-12 gap-10">
          <div className="lg:col-span-12">
            <div className="w-full aspect-[21/9] bg-slate-200 rounded-3xl animate-pulse"></div>
          </div>
          
          <div className="lg:col-span-8 space-y-10">
            <div>
              <div className="w-48 h-10 bg-slate-200 rounded-lg animate-pulse mb-4"></div>
              <div className="w-full h-6 bg-slate-200 rounded-md animate-pulse"></div>
              <div className="w-3/4 h-6 bg-slate-200 rounded-md animate-pulse mt-2"></div>
            </div>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-6">
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

  if (!hoarding) return null;

  return (
    <div className="space-y-12 animate-in fade-in duration-500 pb-20">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-6">
        <div className="space-y-1">
          <button 
            onClick={() => navigate('/inventory')}
            className="flex items-center gap-2 text-slate-900 font-bold text-sm hover:text-indigo-600 transition-colors group mb-2"
          >
            <ArrowLeft className="w-4 h-4 group-hover:-translate-x-1 transition-transform" /> Back to Inventory
          </button>
          <h1 className="text-4xl font-bold text-slate-900 tracking-tight">{hoarding.location}</h1>
        </div>
        <div className="flex items-center gap-3 h-fit">
          <button 
            onClick={handleDelete}
            disabled={!!deletingId}
            className="p-4 bg-white text-red-500 rounded-2xl font-bold border border-slate-200 hover:bg-red-50 transition-all flex items-center justify-center disabled:opacity-50"
            title="Delete Site"
          >
            {deletingId === hoarding.id ? (
              <Loader2 className="w-5 h-5 animate-spin" />
            ) : (
              <Trash2 className="w-5 h-5" />
            )}
          </button>
          <button 
            onClick={() => setIsModalOpen(true)}
            disabled={!!deletingId}
            className="px-8 py-4 bg-slate-900 text-white rounded-2xl font-bold text-sm shadow-lg shadow-slate-200 hover:bg-slate-800 transition-all flex items-center gap-2 disabled:opacity-50"
          >
            Create Campaign <Handshake className="w-5 h-5" />
          </button>
        </div>
      </div>

      <section className="space-y-10">
        <div className="relative aspect-[21/9] rounded-3xl overflow-hidden shadow-2xl group border border-slate-100 bg-slate-50">
          <img 
            src={hoarding.image_url || 'https://images.unsplash.com/photo-1541746972996-4e0b0f43e02a?q=80&w=2070&auto=format&fit=crop'} 
            alt={hoarding.location} 
            className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-[2s]"
            referrerPolicy="no-referrer"
          />
          <div className="absolute inset-x-0 bottom-0 p-10 bg-gradient-to-t from-black/60 to-transparent flex flex-col justify-end">
            <div className="flex items-center gap-4">
              <div className="px-4 py-2 rounded-xl text-xs font-bold uppercase tracking-widest flex items-center gap-2 shadow-lg bg-emerald-500 text-white">
                <div className="w-2 h-2 rounded-full bg-white" /> 
                Avg Occupancy: 85%
              </div>
            </div>
          </div>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 mb-12">
          {/* Main Stats Bento Box */}
          <div className="lg:col-span-8 grid grid-cols-1 md:grid-cols-2 gap-8">
            {/* Asset Specs */}
            <div className="bg-white p-8 rounded-[2rem] border border-slate-200 shadow-sm">
              <h3 className="text-[10px] font-black text-slate-400 uppercase tracking-[0.2em] mb-8 flex items-center gap-2">
                <div className="w-1 h-3 bg-slate-900 rounded-full" />
                Asset Details
              </h3>
              <div className="grid grid-cols-2 gap-8">
                <div className="space-y-1">
                  <p className="text-[10px] font-bold text-slate-300 uppercase tracking-widest">Size</p>
                  <p className="font-bold text-xl text-slate-900">{hoarding.width}x{hoarding.height} <span className="text-xs text-slate-400">ft</span></p>
                </div>
                <div className="space-y-1">
                  <p className="text-[10px] font-bold text-slate-300 uppercase tracking-widest">Area</p>
                  <p className="font-bold text-xl text-slate-900">{hoarding.total_area} <span className="text-xs text-slate-400">sqft</span></p>
                </div>
                <div className="space-y-1">
                  <p className="text-[10px] font-bold text-slate-300 uppercase tracking-widest">Owner</p>
                  <p className="font-bold text-base text-slate-700 truncate">{hoarding.owner_name}</p>
                </div>
                <div className="space-y-1">
                  <p className="text-[10px] font-bold text-slate-300 uppercase tracking-widest">Phone</p>
                  <p className="font-bold text-base text-indigo-600 truncate">{hoarding.contact_number}</p>
                </div>
              </div>
            </div>

            {/* Financial Overview */}
            <div className="bg-slate-900 p-8 rounded-[2rem] text-white shadow-xl">
              <h3 className="text-[10px] font-black text-indigo-400 uppercase tracking-[0.2em] mb-8 flex items-center gap-2">
                <div className="w-1 h-3 bg-emerald-500 rounded-full" />
                Revenue
              </h3>
              <div className="space-y-6">
                <div>
                  <p className="text-[10px] font-bold text-slate-500 uppercase tracking-widest mb-1">Monthly Yield</p>
                  <p className="font-black text-4xl text-white tracking-tight">₹{(hoarding.rent_amount || 0).toLocaleString()}</p>
                </div>
                <div className="flex justify-between items-center pt-6 border-t border-slate-800">
                  <div>
                    <p className="text-[10px] font-bold text-slate-500 uppercase tracking-widest">Settlement</p>
                    <p className="text-sm font-bold text-emerald-400">
                      {hoarding.next_due_date ? format(parseISO(hoarding.next_due_date), 'MMM dd') : 'N/A'}
                    </p>
                  </div>
                  <div className="text-right">
                    <p className="text-[10px] font-bold text-slate-500 uppercase tracking-widest">Last Paid</p>
                    <p className="text-sm font-bold text-slate-300">
                      {hoarding.last_paid_date ? format(parseISO(hoarding.last_paid_date), 'MMM dd') : 'N/A'}
                    </p>
                  </div>
                </div>
              </div>
            </div>
          </div>

          {/* Sidebar Info */}
          <div className="lg:col-span-4 space-y-8">
            <div className="bg-indigo-50/50 p-8 rounded-[2rem] border border-indigo-100 h-full flex flex-col">
              <h4 className="text-[10px] font-black text-indigo-900 uppercase tracking-[0.2em] mb-6 flex items-center gap-2">
                <Shield className="w-4 h-4" /> Compliance Note
              </h4>
              <p className="text-sm text-indigo-900/60 italic leading-relaxed flex-1">
                "{hoarding.notes || "Standard structural and regulatory verification passed for this location."}"
              </p>
              <div className="mt-8 flex items-center gap-2">
                <div className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
                <span className="text-[10px] font-black text-emerald-600 uppercase tracking-widest">Active Status</span>
              </div>
            </div>
          </div>
        </div>

        <div className="grid grid-cols-1 gap-10">
          <BookingCalendar bookings={bookings} />
        </div>

      </section>

      <CampaignModal 
        isOpen={isModalOpen}
        onClose={() => setIsModalOpen(false)}
        onCreate={handleCreateCampaign}
        initialHoardingId={hoarding?.id}
      />

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
