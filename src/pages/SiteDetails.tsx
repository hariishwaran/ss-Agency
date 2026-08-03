import { Shield, PlusCircle, ChevronRight, Trash2, Loader2, Maximize, Printer, Wallet, Calendar, Banknote } from 'lucide-react';
import { useNavigate, useParams, Link } from 'react-router-dom';
import { useState, useEffect } from 'react';
import { cn } from '../utils/cn';
import ConfirmDialog from '../components/ConfirmDialog';
import { Hoarding, FlexPrinting, LedgerEntry } from '../types';
import { hoardingService } from '../services/hoardingService';
import { campaignService } from '../services/campaignService';
import { flexPrintingService } from '../services/flexPrintingService';
import { ledgerService } from '../services/ledgerService';
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
  const [flexJobs, setFlexJobs] = useState<FlexPrinting[]>([]);
  const [ledgerEntries, setLedgerEntries] = useState<LedgerEntry[]>([]);
  const [activeTab, setActiveTab] = useState<'campaigns' | 'flex' | 'ledger'>('campaigns');
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
  const [showSensitive, setShowSensitive] = useState(false);

  useEffect(() => {
    if (id) {
      loadHoarding();
      loadRelatedData();
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

  const loadRelatedData = async () => {
    try {
      const siteId = Number(id);
      const [siteBookings, allFlex, allLedger] = await Promise.all([
        campaignService.getByHoardingId(siteId),
        flexPrintingService.getAll(),
        ledgerService.getAll()
      ]);
      
      setBookings(siteBookings.map(c => ({
        id: c.id,
        startDate: new Date(c.start_date),
        endDate: new Date(c.end_date),
        campaignName: c.client_info,
        raw: c
      })));

      setFlexJobs(allFlex.filter(f => f.hoarding_id === siteId));
      setLedgerEntries(allLedger.filter(l => l.hoarding_id === siteId));
    } catch (error) {
      console.error('Error loading site related data:', error);
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
              {/* Specs Grid — public fields only */}
              <div className="grid grid-cols-2 sm:grid-cols-5 gap-6">
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
                  <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">City</p>
                  <p className="font-bold text-lg text-slate-900 leading-tight">
                    {hoarding.city || 'Chennai'}
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

            {/* Confidential Details — single row with toggle */}
            <div className="p-5 bg-slate-50/50 border border-slate-200/40 rounded-2xl space-y-4">
              <div className="flex items-center justify-between">
                <h4 className="text-[10px] font-extrabold text-slate-700 tracking-wider uppercase">Confidential Details</h4>
                <button
                  onClick={() => setShowSensitive(prev => !prev)}
                  className="px-3 py-1.5 bg-indigo-100 text-indigo-800 rounded-lg text-[10px] font-bold uppercase tracking-wider hover:bg-indigo-200 transition"
                >
                  {showSensitive ? 'Hide Details' : 'Show Details'}
                </button>
              </div>
              <div className="grid grid-cols-3 gap-6">
                <div className="space-y-1">
                  <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">Owner</p>
                  <p className={`font-bold text-lg text-slate-900 truncate leading-tight ${!showSensitive ? 'blurred' : ''}`}>
                    {hoarding.is_owned ? 'SS Advertisers' : hoarding.owner_name}
                  </p>
                </div>
                <div className="space-y-1">
                  <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">Primary Contact</p>
                  <p className={`font-bold text-lg text-indigo-600 truncate leading-tight font-mono ${!showSensitive ? 'blurred' : ''}`}>
                    {hoarding.is_owned ? '+91 98400 01234' : hoarding.contact_number}
                  </p>
                </div>
                <div className="space-y-1">
                  <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">Monthly Rent</p>
                  <p className={`font-extrabold text-lg text-slate-900 tracking-tight ${!showSensitive ? 'blurred' : ''}`}>
                    {hoarding.is_owned ? '₹0' : `₹${(hoarding.rent_amount || 0).toLocaleString('en-IN')}`}
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
              <div className="border-t border-slate-200/60 pt-6 space-y-4">
                <div className="flex justify-between items-center text-sm font-semibold">
                  <span className="text-slate-500">Settlement Cycle</span>
                  <span className="text-slate-950 font-bold">Every 5th</span>
                </div>
                <div className="flex justify-between items-center text-sm font-semibold">
                  <span className="text-slate-500">Next Payout</span>
                  <span className={cn("text-slate-950 font-bold", !showSensitive && "blurred")}>
                    {hoarding.next_due_date ? format(parseISO(hoarding.next_due_date), 'dd MMM yyyy') : '05 May 2024'}
                  </span>
                </div>
                {!hoarding.is_owned && (
                  <>
                    <div className="flex justify-between items-center text-sm font-semibold">
                      <span className="text-slate-500">Rent Status</span>
                      <span className={cn("text-slate-950 font-bold", !showSensitive && "blurred")}>{hoarding.rent_status}</span>
                    </div>
                    {hoarding.last_paid_date && (
                      <div className="flex justify-between items-center text-sm font-semibold">
                        <span className="text-slate-500">Last Paid</span>
                        <span className={cn("text-slate-950 font-bold", !showSensitive && "blurred")}>{format(parseISO(hoarding.last_paid_date), 'dd MMM yyyy')}</span>
                      </div>
                    )}
                  </>
                )}
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

        {/* Site Relationship Hub: Campaigns, Flex Printing, Ledger */}
        <div className="bg-white rounded-[2.5rem] border border-slate-200/80 p-8 shadow-sm space-y-6">
          <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 border-b border-slate-100 pb-5">
            <div className="flex items-center gap-2">
              <button
                onClick={() => setActiveTab('campaigns')}
                className={cn(
                  "px-5 py-2.5 rounded-2xl text-xs font-bold transition-all flex items-center gap-2",
                  activeTab === 'campaigns'
                    ? "bg-slate-900 text-white shadow-md"
                    : "bg-slate-100 text-slate-600 hover:bg-slate-200"
                )}
              >
                <Calendar className="w-4 h-4" />
                Campaigns ({bookings.length})
              </button>
              <button
                onClick={() => setActiveTab('flex')}
                className={cn(
                  "px-5 py-2.5 rounded-2xl text-xs font-bold transition-all flex items-center gap-2",
                  activeTab === 'flex'
                    ? "bg-slate-900 text-white shadow-md"
                    : "bg-slate-100 text-slate-600 hover:bg-slate-200"
                )}
              >
                <Printer className="w-4 h-4" />
                Flex Printing ({flexJobs.length})
              </button>
              <button
                onClick={() => setActiveTab('ledger')}
                className={cn(
                  "px-5 py-2.5 rounded-2xl text-xs font-bold transition-all flex items-center gap-2",
                  activeTab === 'ledger'
                    ? "bg-slate-900 text-white shadow-md"
                    : "bg-slate-100 text-slate-600 hover:bg-slate-200"
                )}
              >
                <Wallet className="w-4 h-4" />
                Finance Ledger ({ledgerEntries.length})
              </button>
            </div>

            {activeTab === 'campaigns' && (
              <button
                onClick={() => setIsModalOpen(true)}
                className="px-4 py-2 bg-slate-900 text-white text-xs font-bold rounded-xl hover:bg-slate-800 transition flex items-center gap-1.5"
              >
                <PlusCircle className="w-4 h-4" /> New Campaign
              </button>
            )}
            {activeTab === 'flex' && (
              <button
                onClick={() => navigate('/flex-printing')}
                className="px-4 py-2 bg-slate-900 text-white text-xs font-bold rounded-xl hover:bg-slate-800 transition flex items-center gap-1.5"
              >
                <Printer className="w-4 h-4" /> Manage Flex Jobs
              </button>
            )}
            {activeTab === 'ledger' && (
              <button
                onClick={() => navigate('/ledger')}
                className="px-4 py-2 bg-slate-900 text-white text-xs font-bold rounded-xl hover:bg-slate-800 transition flex items-center gap-1.5"
              >
                <Banknote className="w-4 h-4" /> Go to Ledger
              </button>
            )}
          </div>

          {/* TAB 1: Campaigns */}
          {activeTab === 'campaigns' && (
            <div className="space-y-4">
              {bookings.length === 0 ? (
                <div className="py-12 text-center text-slate-400">
                  <Calendar className="w-10 h-10 mx-auto mb-2 opacity-40" />
                  <p className="text-sm font-semibold">No active or scheduled campaigns for this site.</p>
                </div>
              ) : (
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  {bookings.map((booking, idx) => (
                    <div
                      key={idx}
                      onClick={() => booking.raw?.id && navigate(`/campaigns/${booking.raw.id}`)}
                      className="p-5 rounded-2xl border border-slate-200 bg-slate-50/50 hover:bg-slate-100/80 transition cursor-pointer flex flex-col justify-between"
                    >
                      <div>
                        <div className="flex items-center justify-between mb-2">
                          <span className="px-2.5 py-1 rounded-lg bg-blue-100 text-blue-700 text-[10px] font-bold uppercase tracking-widest">
                            Campaign #{booking.raw?.id || idx + 1}
                          </span>
                          <span className="text-[10px] font-bold text-slate-400">
                            {format(booking.startDate, 'dd MMM yyyy')} - {format(booking.endDate, 'dd MMM yyyy')}
                          </span>
                        </div>
                        <h4 className="text-base font-bold text-slate-900">{booking.campaignName}</h4>
                      </div>
                      <div className="mt-4 pt-3 border-t border-slate-200/60 flex items-center justify-between text-xs font-bold text-indigo-600">
                        <span>View Details</span>
                        <ChevronRight className="w-4 h-4" />
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}

          {/* TAB 2: Flex Printing Orders */}
          {activeTab === 'flex' && (
            <div className="space-y-4">
              {flexJobs.length === 0 ? (
                <div className="py-12 text-center text-slate-400">
                  <Printer className="w-10 h-10 mx-auto mb-2 opacity-40" />
                  <p className="text-sm font-semibold">No flex printing orders linked to this site.</p>
                </div>
              ) : (
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  {flexJobs.map((job) => (
                    <div key={job.id} className="p-5 rounded-2xl border border-slate-200 bg-slate-50/50 space-y-3">
                      <div className="flex items-center justify-between">
                        <span className="px-2.5 py-1 rounded-lg bg-purple-100 text-purple-700 text-[10px] font-bold uppercase">
                          {job.printing_type === 'outsource' ? 'Outsourced' : 'In-House'}
                        </span>
                        <span className="px-2.5 py-1 rounded-lg bg-emerald-100 text-emerald-700 text-[10px] font-bold uppercase">
                          {job.status}
                        </span>
                      </div>
                      <div>
                        <p className="text-sm font-bold text-slate-900">Flex Size: {job.flex_size || `${hoarding.width}x${hoarding.height} ft`}</p>
                        <p className="text-xs text-slate-500 font-medium">Quantity: {job.quantity}</p>
                        {job.vendor_name && (
                          <p className="text-xs text-slate-600 mt-1">Vendor: <span className="font-bold">{job.vendor_name}</span></p>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}

          {/* TAB 3: Finance Ledger */}
          {activeTab === 'ledger' && (
            <div className="space-y-4">
              {ledgerEntries.length === 0 ? (
                <div className="py-12 text-center text-slate-400">
                  <Wallet className="w-10 h-10 mx-auto mb-2 opacity-40" />
                  <p className="text-sm font-semibold">No ledger payment records found for this site.</p>
                </div>
              ) : (
                <div className="overflow-x-auto">
                  <table className="w-full text-left border-collapse text-sm">
                    <thead>
                      <tr className="bg-slate-50 text-[10px] font-bold text-slate-400 uppercase tracking-widest">
                        <th className="px-4 py-3">Date</th>
                        <th className="px-4 py-3">Period</th>
                        <th className="px-4 py-3">Type</th>
                        <th className="px-4 py-3">Method</th>
                        <th className="px-4 py-3 text-right">Amount</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100">
                      {ledgerEntries.map((entry) => (
                        <tr key={entry.id} className="hover:bg-slate-50">
                          <td className="px-4 py-3 font-medium text-slate-700">{format(parseISO(entry.payment_date), 'dd MMM yyyy')}</td>
                          <td className="px-4 py-3 text-xs text-slate-500">{entry.period_covered}</td>
                          <td className="px-4 py-3">
                            <span className="px-2 py-0.5 rounded text-[9px] font-bold uppercase tracking-widest bg-indigo-50 text-indigo-700">
                              {entry.transaction_type}
                            </span>
                          </td>
                          <td className="px-4 py-3 text-xs font-semibold text-slate-600">{entry.payment_method}</td>
                          <td className="px-4 py-3 text-right font-bold text-slate-900">₹ {entry.amount_paid.toLocaleString('en-IN')}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </div>
          )}
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
