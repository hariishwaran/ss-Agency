import { ArrowLeft, MapPin, Handshake, Info, Shield, PlusCircle, Lightbulb, Send, TrendingUp, ChevronRight, Edit3, Trash2, Camera, MoreHorizontal, Loader2, Maximize } from 'lucide-react';
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
import SiteModal from '../components/SiteModal';
import { format, parseISO } from 'date-fns';

export default function SiteDetails() {
  const navigate = useNavigate();
  const { id } = useParams();
  const [hoarding, setHoarding] = useState<Hoarding | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [isEditModalOpen, setIsEditModalOpen] = useState(false);
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

  const handleEditSave = async (formData: any) => {
    try {
      if (hoarding) {
        await hoardingService.update(hoarding.id, formData);
        loadHoarding();
      }
    } catch (error) {
      console.error('Error saving hoarding:', error);
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

  const now = new Date();
  
  // Calculate if currently occupied from real bookings in state
  const isCurrentlyOccupied = bookings.some(b => b.startDate <= now && b.endDate >= now);

  // Calculate actual average occupancy dynamically from the bookings in Supabase
  const currentYear = now.getFullYear();
  const yearStart = new Date(currentYear, 0, 1).getTime();
  const yearEnd = new Date(currentYear, 11, 31).getTime();

  let bookedDaysInYear = 0;
  bookings.forEach(b => {
    const start = Math.max(yearStart, b.startDate.getTime());
    const end = Math.min(yearEnd, b.endDate.getTime());
    if (start < end) {
      const diff = end - start;
      bookedDaysInYear += Math.ceil(diff / (1000 * 60 * 60 * 24));
    }
  });

  const dynamicOccupancyRate = Math.min(100, Math.round((bookedDaysInYear / 365) * 100));

  // Gantt chart column calculator helper
  const getGanttSpan = (startDate: Date, endDate: Date) => {
    const startMonth = startDate.getMonth(); // Jan = 0
    const endMonth = endDate.getMonth();
    
    // April (Month 3) to August (Month 7)
    let startCol = 1;
    if (startMonth === 4) startCol = 3;      // May
    else if (startMonth === 5) startCol = 6; // June
    else if (startMonth === 6) startCol = 8; // July
    else if (startMonth >= 7) startCol = 10; // August

    let endCol = 12;
    if (endMonth <= 3) endCol = 2;          // April
    else if (endMonth === 4) endCol = 5;    // May
    else if (endMonth === 5) endCol = 7;    // June
    else if (endMonth === 6) endCol = 9;    // July
    
    const span = Math.max(2, endCol - startCol + 1);
    return { startCol, span };
  };

  return (
    <div className="space-y-12 animate-in fade-in duration-500 pb-20">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-6">
        <div className="space-y-1">
          <button 
            onClick={() => navigate('/inventory')}
            className="flex items-center gap-1 text-slate-500 font-bold text-xs hover:text-slate-900 transition-colors mb-2"
          >
            ← Back to Inventory
          </button>
          <h1 className="text-4xl font-bold text-slate-900 tracking-tight leading-tight">{hoarding.location}</h1>
        </div>
        <div className="flex items-center gap-3 h-fit">
          <button 
            onClick={() => setIsEditModalOpen(true)}
            className="px-4 py-2.5 bg-white text-slate-800 rounded-xl font-bold text-xs border border-slate-200 hover:bg-slate-50 transition-all cursor-pointer shadow-sm uppercase tracking-wider"
          >
            Edit Site
          </button>
          <button 
            onClick={() => setIsModalOpen(true)}
            className="px-4 py-2.5 bg-black text-white rounded-xl font-bold text-xs hover:bg-slate-800 transition-all flex items-center gap-1.5 cursor-pointer shadow-sm uppercase tracking-wider"
          >
            <PlusCircle className="w-4 h-4" /> Create Campaign
          </button>
          <button 
            onClick={handleDelete}
            disabled={!!deletingId}
            className="p-2.5 bg-white text-red-500 rounded-xl font-bold border border-slate-200 hover:bg-red-50 transition-all flex items-center justify-center disabled:opacity-50 cursor-pointer shadow-sm"
            title="Delete Site"
          >
            {deletingId === hoarding.id ? (
              <Loader2 className="w-4 h-4 animate-spin" />
            ) : (
              <Trash2 className="w-4 h-4" />
            )}
          </button>
        </div>
      </div>

      <section className="space-y-10">
        <div className="relative aspect-[21/9] rounded-3xl overflow-hidden shadow-sm group border border-slate-200/50 bg-slate-50">
          <img 
            src={hoarding.image_url || 'https://images.unsplash.com/photo-1541746972996-4e0b0f43e02a?q=80&w=2070&auto=format&fit=crop'} 
            alt={hoarding.location} 
            className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-[2s]"
            referrerPolicy="no-referrer"
          />
          
          {/* Maximize Icon Overlay */}
          <div className="absolute top-4 right-4 z-10">
            <button className="p-2.5 bg-white/90 backdrop-blur-sm rounded-xl text-slate-800 border border-slate-200/50 hover:bg-white shadow-sm flex items-center justify-center transition-all">
              <Maximize className="w-4 h-4" />
            </button>
          </div>

          <div className="absolute inset-x-0 bottom-0 p-8 bg-gradient-to-t from-black/50 to-transparent flex flex-col justify-end">
            <div className="flex items-center gap-3">
              {/* Badge 1: Status */}
              <div className="bg-white/95 backdrop-blur-sm px-4 py-2 rounded-xl flex items-center gap-2 shadow-sm border border-slate-200/40">
                <span className={cn("w-2 h-2 rounded-full", isCurrentlyOccupied ? "bg-red-500 animate-pulse" : "bg-emerald-500")} />
                <span className="text-[10px] font-extrabold text-slate-700 uppercase tracking-widest">
                  {isCurrentlyOccupied ? 'Occupied' : 'Available'}
                </span>
              </div>
              
              {/* Badge 2: Average Occupancy */}
              <div className="bg-white/95 backdrop-blur-sm px-4 py-2 rounded-xl flex items-center gap-2 shadow-sm border border-slate-200/40">
                <span className="text-[10px] font-extrabold text-slate-700 uppercase tracking-widest">Avg Occupancy: {dynamicOccupancyRate}%</span>
              </div>
            </div>
          </div>
        </div>

        {/* Asset Overview & Financials clean borderless grid */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8 pt-8 border-t border-slate-200/60">
          {/* Left Specs & Compliance */}
          <div className="lg:col-span-2 space-y-8 pr-0 lg:pr-8 border-r-0 lg:border-r border-slate-200/60 flex flex-col justify-between">
            <div>
              {/* Specs Grid */}
              <div className="grid grid-cols-2 sm:grid-cols-3 gap-6">
                <div className="space-y-1">
                  <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">Dimensions</p>
                  <p className="font-bold text-lg text-slate-900 leading-tight">
                    {hoarding.width} × {hoarding.height} <span className="text-xs text-slate-400 font-normal">ft</span>
                  </p>
                </div>
                <div className="space-y-1">
                  <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">Total Area</p>
                  <p className="font-bold text-lg text-slate-900 leading-tight">
                    {(hoarding.width * hoarding.height).toLocaleString()} <span className="text-xs text-slate-400 font-normal">sqft</span>
                  </p>
                </div>
                <div className="space-y-1">
                  <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">Owner</p>
                  <p className="font-bold text-lg text-slate-900 truncate leading-tight">
                    {hoarding.is_owned ? 'SS Advertisers' : hoarding.owner_name}
                  </p>
                </div>
                <div className="space-y-1">
                  <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">Primary Contact</p>
                  <p className="font-bold text-lg text-indigo-600 hover:text-indigo-800 transition-colors truncate leading-tight font-mono">
                    {hoarding.is_owned ? '+91 98400 01234' : hoarding.contact_number}
                  </p>
                </div>
                <div className="space-y-1">
                  <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">Latitude</p>
                  <p className="font-bold text-lg text-slate-900 leading-tight">
                    {hoarding.latitude ?? 'N/A'}
                  </p>
                </div>
                <div className="space-y-1">
                  <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">Longitude</p>
                  <p className="font-bold text-lg text-slate-900 leading-tight">
                    {hoarding.longitude ?? 'N/A'}
                  </p>
                </div>
              </div>
            </div>

            {/* Compliance & Status card */}
            <div className="flex items-start gap-4 p-5 bg-slate-50/50 border border-slate-200/40 rounded-2xl">
              <div className="w-9 h-9 rounded-full bg-emerald-50 border border-emerald-100 flex items-center justify-center text-emerald-600 flex-shrink-0">
                <Shield className="w-4 h-4" />
              </div>
              <div className="space-y-1">
                <h4 className="text-[10px] font-extrabold text-slate-700 tracking-wider uppercase">Compliance & Status</h4>
                <p className="text-xs text-slate-500 leading-relaxed font-semibold">
                  {hoarding.notes || 'All fire safety and structural clearances are up to date for 2024. Next audit scheduled for Oct 12th.'}
                </p>
              </div>
            </div>
          </div>

          {/* Right Financials */}
          <div className="lg:col-span-1 pl-0 lg:pl-4 space-y-6 flex flex-col justify-between">
            <div className="space-y-6">
              <div>
                <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">Financials</p>
                <p className="text-xs font-semibold text-slate-500 mt-2">Monthly Yield</p>
                <p className="font-extrabold text-4xl text-slate-900 tracking-tight mt-1">
                  {hoarding.is_owned ? '₹0' : `₹${(hoarding.rent_amount || 0).toLocaleString('en-IN')}`}
                </p>
              </div>
              
              <div className="border-t border-slate-200/60 pt-6 space-y-4">
                <div className="flex justify-between items-center text-sm font-semibold">
                  <span className="text-slate-500">Settlement Cycle</span>
                  <span className="text-slate-950 font-bold">Every 5th</span>
                </div>
                <div className="flex justify-between items-center text-sm font-semibold">
                  <span className="text-slate-500">Next Payout</span>
                  <span className="text-slate-950 font-bold">
                    {hoarding.next_due_date ? format(parseISO(hoarding.next_due_date), 'dd MMM yyyy') : '05 May 2024'}
                  </span>
                </div>
              </div>
            </div>

            <div className="pt-4">
              <Link 
                to="/ledger" 
                className="w-full py-3.5 bg-white hover:bg-slate-50 text-slate-800 border border-slate-200 rounded-xl font-bold text-xs uppercase tracking-widest flex items-center justify-center gap-1.5 transition-all shadow-sm cursor-pointer"
              >
                View Detailed Ledger <ChevronRight className="w-4 h-4" />
              </Link>
            </div>
          </div>
        </div>

        {/* Campaign Timeline Section */}
        <div className="bg-white rounded-[2.5rem] border border-slate-200/80 p-8 shadow-sm">
          <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 mb-6">
            <h3 className="text-2xl font-bold text-slate-900 tracking-tight">Campaign Timeline</h3>
            <div className="flex items-center gap-4 text-[10px] font-bold tracking-wider uppercase text-slate-500">
              <div className="flex items-center gap-1.5">
                <span className="w-2.5 h-2.5 rounded-full bg-blue-600 animate-pulse" />
                Occupied
              </div>
              <div className="flex items-center gap-1.5">
                <span className="w-2.5 h-2.5 rounded-full bg-slate-300" />
                Upcoming
              </div>
              <div className="flex items-center gap-1.5">
                <span className="w-2.5 h-2.5 rounded-full border border-dashed border-slate-400" />
                Vacant
              </div>
            </div>
          </div>
          
          <div className="border-t border-slate-100 pt-6">
            {/* Months Header Grid */}
            <div className="grid grid-cols-5 text-center text-[10px] font-bold text-slate-400 tracking-widest uppercase mb-4">
              <div>April</div>
              <div>May</div>
              <div>June</div>
              <div>July</div>
              <div>August</div>
            </div>

            {/* Visual Gantt Bar Grid */}
            <div className="grid grid-cols-12 gap-3 items-center">
              {bookings.filter(b => b.hoarding_id === hoarding.id).length > 0 ? (
                bookings.filter(b => b.hoarding_id === hoarding.id).map((booking, idx) => (
                  <div
                    key={idx}
                    className="col-span-4 bg-blue-600 text-white py-3 px-4 rounded-xl text-xs font-bold uppercase tracking-widest text-center truncate shadow-sm"
                  >
                    {booking.campaignName}
                  </div>
                ))
              ) : (
                <p className="col-span-12 text-center text-sm text-slate-500">No campaigns for this hoarding.</p>
              )}
            </div>
          </div>
        </div>

      </section>

      <CampaignModal 
        isOpen={isModalOpen}
        onClose={() => setIsModalOpen(false)}
        onCreate={handleCreateCampaign}
        initialHoardingId={hoarding?.id}
      />

      <SiteModal 
        isOpen={isEditModalOpen}
        onClose={() => setIsEditModalOpen(false)}
        onSave={handleEditSave}
        hoarding={hoarding}
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
