import { Filter, Plus, MapPin, Camera, AlertCircle, Edit3, Trash2, Loader2, Circle, Smartphone } from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { Link } from 'react-router-dom';
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
  const [showConfirm, setShowConfirm] = useState(false);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingHoarding, setEditingHoarding] = useState<Hoarding | null>(null);
  const [hoardingsList, setHoardingsList] = useState<Hoarding[]>([]);
  const [campaigns, setCampaigns] = useState<Campaign[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [deletingId, setDeletingId] = useState<number | null>(null);
  const [filter, setFilter] = useState<'all' | 'available' | 'occupied'>('all');
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
    if (hoarding.rent_status === 'Pending' && hoarding.next_due_date) {
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
    
    return filtered;
  }, [hoardingsList, campaigns, searchQuery, filter]);

  return (
    <div className="space-y-12 animate-in fade-in duration-500 pb-20">
      <div className="bg-white p-6 rounded-3xl border border-slate-200 shadow-sm flex flex-col md:flex-row gap-4 justify-between items-center">
        <div className="flex items-center gap-2 p-1.5 bg-slate-50 rounded-xl border border-slate-200 w-full md:w-auto overflow-x-auto no-scrollbar">
          {(['all', 'available', 'occupied'] as const).map((f) => (
            <button
              key={f}
              onClick={() => setFilter(f)}
              className={cn(
                "px-5 py-2.5 rounded-lg text-xs font-bold uppercase tracking-wider transition-all whitespace-nowrap",
                filter === f 
                  ? "bg-slate-900 text-white shadow-sm border border-slate-800" 
                  : "text-slate-500 hover:text-indigo-600 border border-transparent"
              )}
            >
              {f}
            </button>
          ))}
        </div>
        <button 
          onClick={() => setShowConfirm(true)}
          className="bg-slate-900 text-white px-6 py-3.5 rounded-2xl font-bold text-xs uppercase tracking-widest hover:bg-slate-800 transition-all shadow-xl shadow-slate-200 flex items-center gap-2 group whitespace-nowrap"
        >
          <Plus className="w-4 h-4 group-hover:rotate-90 transition-transform" />
          New Site
        </button>
      </div>

      <section className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6 min-h-[400px]">
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
          filteredHoardings.map((hoarding, i) => (
            <motion.div 
              key={hoarding.id}
              layout
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              transition={{ duration: 0.2, delay: i * 0.05 }}
              className="group flex flex-col bg-white rounded-2xl overflow-hidden shadow-sm border border-slate-200 hover:shadow-md transition-all duration-300"
            >
              <div className="aspect-[1/1] relative overflow-hidden block">
                <Link to={`/details/${hoarding.id}`}>
                  <img 
                    src={hoarding.image_url || 'https://images.unsplash.com/photo-1541746972996-4e0b0f43e02a?q=80&w=2070&auto=format&fit=crop'} 
                    alt={hoarding.location} 
                    className="w-full h-full object-cover transition-transform duration-700 group-hover:scale-110"
                    referrerPolicy="no-referrer"
                  />
                </Link>
                <div className="absolute top-4 left-4 z-10">
                  <div className={cn(
                    "w-3 h-3 rounded-full shadow-[0_0_12px_rgba(0,0,0,0.1)] border border-white/50",
                    getStatusColor(hoarding)
                  )} />
                </div>
                <div className="absolute top-4 right-4 z-10 opacity-0 group-hover:opacity-100 transition-opacity">
                  <div className="flex flex-col gap-2">
                    <button 
                      onClick={(e) => {
                        e.stopPropagation();
                        if (hoarding.contact_number) {
                          const message = encodeURIComponent(`Hello ${hoarding.owner_name}, this is a reminder regarding the hoarding at ${hoarding.location}.`);
                          const formattedNumber = hoarding.contact_number.replace(/\D/g, '');
                          window.open(`https://wa.me/${formattedNumber}?text=${message}`, '_blank');
                        } else {
                          showAlert({
                            title: 'Missing Info',
                            message: 'Contact number not available for this site owner.',
                            variant: 'warning'
                          });
                        }
                      }}
                      className="p-2.5 bg-white/90 backdrop-blur-md rounded-xl text-emerald-600 border border-white hover:bg-emerald-50 transition-all shadow-xl"
                      title="Send WhatsApp Reminder"
                    >
                      <Smartphone className="w-4 h-4" />
                    </button>
                    <button 
                      onClick={() => handleEdit(hoarding)}
                      className="p-2.5 bg-white/90 backdrop-blur-md rounded-xl text-slate-900 border border-white hover:bg-white transition-all shadow-xl"
                      title="Edit site"
                    >
                      <Edit3 className="w-4 h-4" />
                    </button>
                  </div>
                </div>
                <div className="absolute inset-x-0 bottom-0 p-4 bg-gradient-to-t from-slate-900/60 to-transparent flex justify-between items-center transition-opacity opacity-0 group-hover:opacity-100 pointer-events-none">
                  <span className="bg-white/20 backdrop-blur-md px-3 py-1 rounded-full text-[9px] font-bold text-white uppercase tracking-widest border border-white/30">
                    {hoarding.width} x {hoarding.height} ft
                  </span>
                  <span className={cn(
                    "px-3 py-1 rounded-full text-[9px] font-bold shadow-sm uppercase tracking-widest",
                    hoarding.rent_status === 'Paid' ? "bg-indigo-600 text-white" : "bg-amber-500 text-white"
                  )}>
                    {hoarding.rent_status}
                  </span>
                </div>
              </div>
              <div className="p-5 space-y-2">
                <div className="flex justify-between items-start gap-2">
                  <Link to={`/details/${hoarding.id}`} className="flex-1">
                    <h3 className="font-bold text-slate-900 text-lg group-hover:text-indigo-600 transition-colors tracking-tight line-clamp-1">{hoarding.location}</h3>
                  </Link>
                  <span className="text-[10px] bg-slate-100 text-slate-500 px-2 py-0.5 rounded font-bold uppercase tracking-tight">
                    ₹{hoarding.rent_amount}
                  </span>
                </div>
                <p className="text-[10px] text-slate-400 flex items-center gap-1 font-bold uppercase tracking-widest">
                  <MapPin className="w-3 h-3 text-indigo-600" /> {hoarding.owner_name}
                </p>
              </div>
            </motion.div>
          ))
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
