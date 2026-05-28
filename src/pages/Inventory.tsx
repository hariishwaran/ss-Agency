import { Filter, Plus, MapPin, Camera, AlertCircle, Edit3, Trash2, Loader2, Circle, Smartphone, FileDown, User, Calendar, X } from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { exportToExcel, exportToPDF } from '../utils/export';
import { CustomDatePicker } from '../components/ui/DatePicker';
import { Link, useNavigate } from 'react-router-dom';
import { useState, useEffect, useMemo } from 'react';
import { cn } from '../utils/cn';
import { Hoarding, Campaign } from '../types';
import SiteModal from '../components/SiteModal';
import ConfirmDialog from '../components/ConfirmDialog';
import { useConfirm } from '../hooks/useConfirm';
import { useAlert } from '../hooks/useAlert';
import { hoardingService } from '../services/hoardingService';
import { campaignService } from '../services/campaignService';
import { useSearch } from '../context/SearchContext';

export default function Inventory() {
  const navigate = useNavigate();
  const [showConfirm, setShowConfirm] = useState(false);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingHoarding, setEditingHoarding] = useState<Hoarding | null>(null);
  const [hoardingsList, setHoardingsList] = useState<Hoarding[]>([]);
  const [campaigns, setCampaigns] = useState<Campaign[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [deletingId, setDeletingId] = useState<number | null>(null);
  const [filter, setFilter] = useState<'all' | 'available' | 'occupied'>('all');
  const [searchDate, setSearchDate] = useState<Date | null>(null);
  const { searchQuery } = useSearch();
  const { confirm, confirmProps } = useConfirm();
  const { alert: showAlert, alertProps } = useAlert();

  useEffect(() => {
    fetchData();
  }, []);

  const fetchData = async () => {
    try {
      setIsLoading(true);
      const [hData, cData] = await Promise.all([
        hoardingService.getAll(),
        campaignService.getAll()
      ]);
      setHoardingsList(hData);
      setCampaigns(cData);
    } catch (error) {
      console.error('Error fetching data:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const getStatusColor = (hoarding: Hoarding) => {
    const now = new Date();
    
    // Check Rent
    if (!hoarding.is_owned && hoarding.rent_status === 'Pending' && hoarding.next_due_date) {
      const dueDate = new Date(hoarding.next_due_date);
      const diffDays = Math.ceil((dueDate.getTime() - now.getTime()) / (1000 * 60 * 60 * 24));
      if (diffDays <= 3) return 'bg-red-500 shadow-red-200';
      if (diffDays <= 7) return 'bg-amber-500 shadow-amber-200';
    }

    // Check Campaigns
    const siteCampaigns = campaigns.filter(c => c.hoarding_id === hoarding.id);
    const activeCampaign = siteCampaigns.find(c => new Date(c.start_date) <= now && new Date(c.end_date) >= now);
    
    if (activeCampaign) {
      const endDate = new Date(activeCampaign.end_date);
      const diffDays = Math.ceil((endDate.getTime() - now.getTime()) / (1000 * 60 * 60 * 24));
      if (diffDays <= 3) return 'bg-red-500 shadow-red-200';
      if (diffDays <= 7) return 'bg-amber-500 shadow-amber-200';
    }

    return 'bg-emerald-500 shadow-emerald-200';
  };

  const handleProceed = () => {
    setShowConfirm(false);
    setEditingHoarding(null);
    setIsModalOpen(true);
  };

  const handleEdit = (hoarding: Hoarding) => {
    setEditingHoarding(hoarding);
    setIsModalOpen(true);
  };

  const handleDelete = async (id: number) => {
    const isConfirmed = await confirm({
      title: 'Delete Site',
      message: 'Confirm Deletion: This site, all its campaigns, and financial records will be permanently removed. Proceed?',
      variant: 'danger'
    });

    if (isConfirmed) {
      try {
        setDeletingId(id);
        await hoardingService.delete(id);
        await fetchData();
        return true;
      } catch (error: any) {
        console.error('Error deleting hoarding:', error);
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

  const handleSaveHoarding = async (savedHoarding: any) => {
    try {
      if (editingHoarding) {
        await hoardingService.update(editingHoarding.id, savedHoarding);
      } else {
        await hoardingService.create(savedHoarding);
      }
      setIsModalOpen(false);
      setEditingHoarding(null);
      fetchData();
    } catch (error) {
      console.error('Error saving hoarding:', error);
    }
  };

  const filteredHoardings = useMemo(() => {
    let filtered = hoardingsList.filter(h => h.location.toLowerCase().includes(searchQuery.toLowerCase()));

    if (filter !== 'all') {
      const now = new Date();
      filtered = filtered.filter(h => {
        const siteCampaigns = campaigns.filter(c => c.hoarding_id === h.id);
        const isActive = siteCampaigns.some(c => new Date(c.start_date) <= now && new Date(c.end_date) >= now);
        if (filter === 'available') return !isActive;
        if (filter === 'occupied') return isActive;
        return true;
      });
    }

    if (searchDate) {
      filtered = filtered.filter(h => {
        const siteCampaigns = campaigns.filter(c => c.hoarding_id === h.id);
        const occupiedOnDate = siteCampaigns.some(c => {
          const start = new Date(c.start_date);
          const end = new Date(c.end_date);
          return start <= searchDate && searchDate <= end;
        });
        return !occupiedOnDate;
      });
    }

    return filtered;
  }, [hoardingsList, campaigns, searchQuery, filter, searchDate]);

  const handleExportExcel = () => {
    const data = filteredHoardings.map(h => ({
      ID: h.id,
      Location: h.location,
      Size: `${h.width} x ${h.height} ft`,
      Owner: h.is_owned ? 'SS Advertisers (Agency)' : h.owner_name,
      Contact: h.is_owned ? 'N/A' : h.contact_number,
      Rent: h.is_owned ? 0 : h.rent_amount,
      Status: h.is_owned ? 'Owned' : h.rent_status,
      'Last Paid': h.is_owned ? 'N/A' : h.last_paid_date,
      'Next Due': h.is_owned ? 'N/A' : h.next_due_date
    }));
    exportToExcel(data, 'Hoardings_Inventory');
  };

  const handleExportPDF = () => {
    const headers = ['ID', 'Location', 'Size', 'Owner', 'Contact', 'Rent', 'Status'];
    const data = filteredHoardings.map(h => [
      h.id,
      h.location,
      `${h.width} x ${h.height} ft`,
      h.is_owned ? 'SS Advertisers' : h.owner_name,
      h.is_owned ? 'N/A' : h.contact_number,
      h.is_owned ? '0 (Owned)' : h.rent_amount,
      h.is_owned ? 'Owned' : h.rent_status
    ]);
    exportToPDF(headers, data, 'Hoardings_Inventory', 'Hoardings Inventory List');
  };

  return (
    <div className="space-y-8 animate-in fade-in duration-500 pb-20">
      {/* Toolbar — all on one row */}
      <div className="flex flex-wrap items-center justify-between gap-4">
        {/* Left: Pill Tabs */}
        <div className="flex items-center p-1 bg-[#f3f4f6] rounded-xl border border-slate-200">
          {(['all', 'available', 'occupied'] as const).map((f) => (
            <button
              key={f}
              onClick={() => setFilter(f)}
              className={cn(
                "px-4 py-2 rounded-lg text-xs font-bold transition-all whitespace-nowrap",
                filter === f 
                  ? "bg-white text-slate-900 shadow-sm" 
                  : "text-slate-500 hover:text-slate-900"
              )}
            >
              {f === 'all' ? 'All Assets' : f.charAt(0).toUpperCase() + f.slice(1)}
            </button>
          ))}
        </div>

        {/* Right: Date picker + Export + New Site */}
        <div className="flex flex-wrap items-center gap-3">

          {/* Date Picker — modern inline */}
          <div className="relative flex items-center">
            <div className="absolute left-3 pointer-events-none text-slate-400">
              <Calendar className="w-4 h-4" />
            </div>
            <CustomDatePicker
              selected={searchDate}
              onChange={date => setSearchDate(date)}
              placeholderText="Check availability…"
              className="!pl-9 !pr-9 !py-2.5 !w-52 !bg-white !border-slate-200 !rounded-xl !text-xs !font-bold !tracking-wide !shadow-sm hover:!border-slate-300 focus:!border-indigo-500 focus:!ring-2 focus:!ring-indigo-500/10"
            />
            {searchDate && (
              <button
                onClick={() => setSearchDate(null)}
                className="absolute right-2.5 p-0.5 text-slate-400 hover:text-slate-700 hover:bg-slate-100 rounded-md transition-all"
                title="Clear date"
              >
                <X className="w-3.5 h-3.5" />
              </button>
            )}
          </div>

          {/* Excel/PDF Export buttons */}
          <button
            onClick={handleExportExcel}
            className="p-3 bg-white hover:bg-slate-50 text-slate-700 rounded-xl border border-slate-200 transition-all font-bold text-xs uppercase tracking-widest flex items-center gap-1.5 shadow-sm"
            title="Export Excel"
          >
            <FileDown className="w-4 h-4" />
            <span className="hidden sm:inline">Excel</span>
          </button>
          <button
            onClick={handleExportPDF}
            className="p-3 bg-white hover:bg-slate-50 text-slate-700 rounded-xl border border-slate-200 transition-all font-bold text-xs uppercase tracking-widest flex items-center gap-1.5 shadow-sm"
            title="Export PDF"
          >
            <Smartphone className="w-4 h-4" />
            <span className="hidden sm:inline">PDF</span>
          </button>

          <button 
            onClick={() => setShowConfirm(true)}
            className="bg-black text-white px-5 py-3 rounded-xl font-bold text-xs flex items-center gap-1.5 hover:bg-slate-800 transition-all shadow-sm"
          >
            <Plus className="w-4 h-4" /> New Site
          </button>
        </div>
      </div>

      {/* Active date filter banner */}
      <AnimatePresence>
        {searchDate && (
          <motion.div
            initial={{ opacity: 0, y: -8 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -8 }}
            className="flex items-center gap-3 px-5 py-3 bg-indigo-50 border border-indigo-100 rounded-2xl"
          >
            <div className="flex items-center justify-center w-8 h-8 bg-indigo-100 rounded-lg">
              <Calendar className="w-4 h-4 text-indigo-600" />
            </div>
            <div className="flex-1">
              <p className="text-xs font-bold text-indigo-900 tracking-wide">
                Showing available hoardings for <span className="text-indigo-600">{searchDate.toLocaleDateString('en-IN', { weekday: 'short', day: 'numeric', month: 'short', year: 'numeric' })}</span>
              </p>
              <p className="text-[10px] font-medium text-indigo-500 mt-0.5">
                {filteredHoardings.length} site{filteredHoardings.length !== 1 ? 's' : ''} unoccupied on this date
              </p>
            </div>
            <button
              onClick={() => setSearchDate(null)}
              className="px-3 py-1.5 text-[10px] font-bold uppercase tracking-widest text-indigo-600 hover:text-indigo-800 hover:bg-indigo-100 rounded-lg transition-all flex items-center gap-1"
            >
              <X className="w-3 h-3" />
              Clear
            </button>
          </motion.div>
        )}
      </AnimatePresence>

      <section className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
        {isLoading ? (
          Array.from({ length: 8 }).map((_, i) => (
            <div key={i} className="flex flex-col bg-white rounded-2xl overflow-hidden shadow-sm border border-slate-200">
              <div className="relative aspect-[4/3] bg-slate-100 animate-pulse overflow-hidden">
                <div className="absolute top-3 left-3 w-16 h-6 bg-slate-200 rounded-full"></div>
                <div className="absolute top-3 right-3 w-20 h-6 bg-slate-200 rounded-full"></div>
              </div>
              <div className="p-4 flex-1 flex flex-col space-y-4">
                <div className="flex justify-between items-start">
                  <div className="w-2/3 h-5 bg-slate-100 rounded-md animate-pulse"></div>
                  <div className="w-8 h-8 bg-slate-100 rounded-md animate-pulse"></div>
                </div>
                <div className="space-y-2">
                  <div className="w-full h-4 bg-slate-100 rounded-md animate-pulse"></div>
                  <div className="w-4/5 h-4 bg-slate-100 rounded-md animate-pulse"></div>
                </div>
                <div className="mt-auto grid grid-cols-2 gap-2 pb-4 border-b border-slate-100">
                  <div className="flex items-center gap-2">
                    <div className="w-4 h-4 rounded-full bg-slate-100 animate-pulse"></div>
                    <div className="w-16 h-3 bg-slate-100 rounded-md animate-pulse"></div>
                  </div>
                  <div className="flex items-center gap-2">
                    <div className="w-4 h-4 rounded-full bg-slate-100 animate-pulse"></div>
                    <div className="w-16 h-3 bg-slate-100 rounded-md animate-pulse"></div>
                  </div>
                </div>
                <div className="flex justify-between items-center pt-1">
                  <div className="w-16 h-4 bg-slate-100 rounded-md animate-pulse"></div>
                  <div className="w-20 h-6 bg-slate-100 rounded-full animate-pulse"></div>
                </div>
              </div>
            </div>
          ))
        ) : filteredHoardings.length > 0 ? (
          filteredHoardings.map((hoarding, i) => {
            const now = new Date();
            const siteCampaigns = campaigns.filter(c => c.hoarding_id === hoarding.id);
            const activeCampaign = siteCampaigns.find(c => new Date(c.start_date) <= now && new Date(c.end_date) >= now);
            const isOccupied = !!activeCampaign;

            return (
              <motion.div
                key={hoarding.id}
                layout
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, scale: 0.95 }}
                transition={{ duration: 0.2, delay: i * 0.05 }}
                onClick={() => navigate(`/details/${hoarding.id}`)}
                className="bg-white rounded-2xl border border-slate-200 overflow-hidden shadow-sm hover:shadow-lg transition-all group cursor-pointer flex flex-col"
              >
                {/* Hero Image */}
                <div className="relative aspect-[4/3] overflow-hidden bg-slate-100">
                  <img
                    src={hoarding.image_url || 'https://images.unsplash.com/photo-1541746972996-4e0b0f43e02a?q=80&w=2070&auto=format&fit=crop'}
                    alt={hoarding.location}
                    className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-700"
                    referrerPolicy="no-referrer"
                  />

                  {/* Status Badge — top-left, matching campaign cards */}
                  <div className="absolute top-4 left-4 z-10">
                    <div className={cn(
                      "px-3 py-1.5 rounded-lg flex items-center gap-1.5 text-[10px] font-extrabold uppercase tracking-widest",
                      isOccupied ? "bg-red-500 text-white" : "bg-emerald-500 text-white"
                    )}>
                      <span className={cn(
                        "w-1.5 h-1.5 rounded-full",
                        isOccupied ? "bg-red-200" : "bg-emerald-200"
                      )} />
                      {isOccupied ? 'Occupied' : 'Available'}
                    </div>
                  </div>

                  {/* Bottom gradient overlay with location name */}
                  <div className="absolute inset-x-0 bottom-0 bg-gradient-to-t from-black/80 via-black/40 to-transparent p-5 pt-16">
                    <p className="text-[10px] font-bold text-white/70 uppercase tracking-widest mb-1">
                      {hoarding.location.split(' ').slice(0, 2).join(' ').toUpperCase()}
                    </p>
                    <h3 className="text-lg font-bold text-white leading-tight line-clamp-1">
                      {hoarding.location}
                    </h3>
                  </div>
                </div>

                {/* Details Section — 2×2 grid matching campaign cards */}
                <div className="p-5 flex-1">
                  <div className="grid grid-cols-2 gap-x-6 gap-y-4">
                    <div className="space-y-1">
                      <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">Size</p>
                      <p className="text-sm font-bold text-slate-800">{hoarding.width} × {hoarding.height} ft</p>
                    </div>
                    <div className="space-y-1">
                      <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">Rent</p>
                      <p className="text-sm font-bold text-slate-800">
                        {hoarding.is_owned ? 'Owned' : `₹${(hoarding.rent_amount || 0).toLocaleString('en-IN')}`}
                      </p>
                    </div>
                    <div className="space-y-1">
                      <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">Contact</p>
                      <p className="text-sm font-bold text-slate-800">
                        {hoarding.is_owned ? 'SS Support' : hoarding.contact_number}
                      </p>
                    </div>
{/* Status */}
                    <div className="space-y-1">
                      <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">Status</p>
                      <p className="text-sm font-bold text-slate-800">{isOccupied ? 'Occupied' : 'Available'}</p>
                    </div>
                    {/* Latitude */}
                    <div className="space-y-1">
                      <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">Latitude</p>
                      <p className="text-sm font-bold text-slate-800">{hoarding.latitude ?? 'N/A'}</p>
                    </div>
                    {/* Longitude */}
                    <div className="space-y-1">
                      <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">Longitude</p>
                      <p className="text-sm font-bold text-slate-800">{hoarding.longitude ?? 'N/A'}</p>
                    </div>
                  </div>
                </div>

                {/* Action Footer — matches campaign card footer */}
                <div className="px-5 py-3.5 border-t border-slate-100 flex items-center justify-between">
                  <div className="flex items-center gap-1">
                    <button
                      onClick={(e) => { e.stopPropagation(); handleEdit(hoarding); }}
                      className="p-2 text-slate-400 hover:text-slate-800 hover:bg-slate-100 rounded-lg transition-all"
                      title="Edit"
                    >
                      <Edit3 className="w-4 h-4" />
                    </button>
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        if (hoarding.contact_number) {
                          const message = encodeURIComponent(`Hello ${hoarding.owner_name}, this is a reminder regarding the hoarding at ${hoarding.location}.`);
                          const formattedNumber = hoarding.contact_number.replace(/\D/g, '');
                          window.open(`https://wa.me/${formattedNumber}?text=${message}`, '_blank');
                        } else {
                          showAlert({ title: 'Missing Info', message: 'Contact number not available for this site owner.', variant: 'warning' });
                        }
                      }}
                      className="p-2 text-emerald-600 hover:text-emerald-800 hover:bg-slate-100 rounded-lg transition-all"
                      title="WhatsApp"
                    >
                      <Smartphone className="w-4 h-4" />
                    </button>
                  </div>
                  <span
                    className="text-xs font-bold text-indigo-600 group-hover:text-indigo-800 transition-colors"
                  >
                    Details
                  </span>
                </div>
              </motion.div>
            );
          })
        ) : (
          <div className="col-span-full py-20 flex flex-col items-center justify-center text-center space-y-4">
             <div className="w-20 h-20 rounded-full bg-slate-50 flex items-center justify-center text-slate-300">
               <Camera className="w-10 h-10" />
             </div>
             <div>
               <h3 className="text-xl font-bold text-slate-900">No Inventory Found</h3>
               <p className="text-slate-500 max-w-xs mx-auto">Start by adding your first hoarding unit to the visual inventory.</p>
             </div>
          </div>
        )}

      </section>

      <AnimatePresence>
        {showConfirm && (
          <div className="fixed inset-0 z-[100] flex items-center justify-center p-4">
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => setShowConfirm(false)}
              className="absolute inset-0 bg-slate-900/60 backdrop-blur-sm"
            />
            
            <motion.div
              initial={{ opacity: 0, scale: 0.95, y: 20 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.95, y: 20 }}
              className="relative w-full max-w-md bg-white rounded-3xl shadow-2xl overflow-hidden border border-slate-200"
            >
              <div className="p-8 pb-4 flex flex-col items-center text-center">
                <div className="w-16 h-16 rounded-full bg-indigo-50 flex items-center justify-center text-indigo-600 mb-6">
                  <AlertCircle className="w-8 h-8" />
                </div>
                <h3 className="text-2xl font-bold text-slate-900 tracking-tight mb-2">Create New Site?</h3>
                <p className="text-sm text-slate-500 leading-relaxed font-medium">
                  You are about to enter the site onboarding flow. Ensure you have the site coordinates and high-res imagery ready.
                </p>
              </div>

              <div className="p-8 flex gap-4">
                <button
                  onClick={() => setShowConfirm(false)}
                  className="flex-1 py-4 bg-slate-100 text-slate-600 rounded-xl font-bold text-xs uppercase tracking-widest hover:bg-slate-200 transition-all"
                >
                  Go Back
                </button>
                <button
                  onClick={handleProceed}
                  className="flex-1 py-4 bg-slate-900 text-white rounded-xl font-bold text-xs uppercase tracking-widest shadow-lg shadow-slate-200 hover:bg-slate-800 transition-all"
                >
                  Proceed
                </button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      <SiteModal 
        isOpen={isModalOpen}
        onClose={() => setIsModalOpen(false)}
        onSave={handleSaveHoarding}
        onDelete={handleDelete}
        hoarding={editingHoarding}
      />

      <ConfirmDialog {...confirmProps} />
      <ConfirmDialog {...alertProps} />
    </div>
  );
}
