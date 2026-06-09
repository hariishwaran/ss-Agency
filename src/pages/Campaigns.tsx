import { Plus, Calendar, MapPin, Loader2, Trash2, Edit3, FileText, FileDown, MessageSquare, ArrowDownUp, X, Check } from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { exportToExcel, exportToPPT } from '../utils/export';
import { useState, useEffect, useMemo } from 'react';
import { Campaign, Hoarding } from '../types';
import { campaignService } from '../services/campaignService';
import { hoardingService } from '../services/hoardingService';
import { calculateDays, isPast, isFuture } from '../utils/date';
import { format, parseISO } from 'date-fns';
import CampaignModal from '../components/CampaignModal';

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
  const [sortOrder, setSortOrder] = useState<'newest' | 'oldest'>('newest');
  const [showExcelModal, setShowExcelModal] = useState(false);

  const CAMPAIGN_FIELDS = useMemo(() => [
    { id: 'id', label: 'ID' },
    { id: 'client', label: 'Client' },
    { id: 'location', label: 'Location' },
    { id: 'city', label: 'City' },
    { id: 'hoarding_id', label: 'Hoarding ID' },
    { id: 'start_date', label: 'Start Date' },
    { id: 'end_date', label: 'End Date' },
    { id: 'duration', label: 'Duration (Days)' },
    { id: 'status', label: 'Status' },
    { id: 'po_status', label: 'PO Status' },
    { id: 'total_po_amount', label: 'Total PO Amount' },
    { id: 'paid_po_amount', label: 'Paid PO Amount' },
    { id: 'internal_notes', label: 'Internal Notes' },
    { id: 'created_at', label: 'Created At' },
  ], []);

  const [selectedExcelFields, setSelectedExcelFields] = useState<Record<string, boolean>>({
    id: true,
    client: true,
    location: true,
    city: true,
    hoarding_id: false,
    start_date: true,
    end_date: true,
    duration: true,
    status: true,
    po_status: true,
    total_po_amount: false,
    paid_po_amount: false,
    internal_notes: false,
    created_at: false,
  });

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

  const filteredCampaigns = campaigns
    .filter(c => {
      const status = getStatus(c.start_date, c.end_date);
      const matchesFilter = filter === 'all' || status === filter;
      const matchesSearch = c.client_info.toLowerCase().includes(searchQuery.toLowerCase()) || 
                            hoardings[c.hoarding_id]?.location.toLowerCase().includes(searchQuery.toLowerCase());
      return matchesFilter && matchesSearch;
    })
    .sort((a, b) => {
      const dateA = new Date(a.start_date).getTime();
      const dateB = new Date(b.start_date).getTime();
      return sortOrder === 'newest' ? dateB - dateA : dateA - dateB;
    });

  const handleExportExcel = () => {
    setShowExcelModal(true);
  };

  const triggerExcelExport = () => {
    const activeFields = Object.keys(selectedExcelFields).filter(k => selectedExcelFields[k]);
    if (activeFields.length === 0) {
      showAlert({ title: "No columns selected", message: "Please select at least one column to export." });
      return;
    }

    const data = filteredCampaigns.map(c => {
      const site = hoardings[c.hoarding_id];
      const row: Record<string, any> = {};
      if (selectedExcelFields.id) row['ID'] = c.id;
      if (selectedExcelFields.client) row['Client'] = c.client_info;
      if (selectedExcelFields.location) row['Location'] = site?.location || 'N/A';
      if (selectedExcelFields.city) row['City'] = site?.city || 'Chennai';
      if (selectedExcelFields.hoarding_id) row['Hoarding ID'] = c.hoarding_id;
      if (selectedExcelFields.start_date) row['Start Date'] = c.start_date;
      if (selectedExcelFields.end_date) row['End Date'] = c.end_date;
      if (selectedExcelFields.duration) row['Duration (Days)'] = calculateDays(c.start_date, c.end_date);
      if (selectedExcelFields.status) row['Status'] = getStatus(c.start_date, c.end_date);
      if (selectedExcelFields.po_status) row['PO Status'] = c.po_status || 'none';
      if (selectedExcelFields.total_po_amount) row['Total PO Amount'] = c.total_po_amount || 0;
      if (selectedExcelFields.paid_po_amount) row['Paid PO Amount'] = c.paid_po_amount || 0;
      if (selectedExcelFields.internal_notes) row['Internal Notes'] = c.internal_notes || '';
      if (selectedExcelFields.created_at) row['Created At'] = c.created_at || '';
      return row;
    });

    exportToExcel(data, 'Campaigns_List');
    setShowExcelModal(false);
  };

  const handleExportPPT = () => {
    const slides = filteredCampaigns.map(c => ({
      imageUrl: hoardings[c.hoarding_id]?.image_url || '',
      location: hoardings[c.hoarding_id]?.location || 'Unknown',
      city: hoardings[c.hoarding_id]?.city,
      dimensions: `${hoardings[c.hoarding_id]?.width || '?'}×${hoardings[c.hoarding_id]?.height || '?'} ft`,
      clientInfo: c.client_info,
      startDate: format(parseISO(c.start_date), 'MMM dd, yyyy'),
      endDate: format(parseISO(c.end_date), 'MMM dd, yyyy'),
      status: getStatus(c.start_date, c.end_date),
      poStatus: c.po_status,
      hoardingId: c.hoarding_id,
    }));
    exportToPPT(slides, 'Campaigns_Presentation');
  };

  return (
    <div className="space-y-8 pb-20">
      {/* Toolbar: Tabs + Controls + Launch — all on one row */}
      <div className="flex flex-wrap items-center justify-between gap-4">
        {/* Left: Segmented Pill Tabs */}
        <div className="flex items-center gap-1 p-1 bg-slate-100 rounded-xl">
          {(['all', 'active', 'upcoming', 'past'] as const).map((f) => (
            <button
              key={f}
              onClick={() => setFilter(f)}
              className={cn(
                "px-5 py-2 rounded-lg text-xs font-bold uppercase tracking-wider transition-all whitespace-nowrap",
                filter === f ? "bg-slate-900 text-white shadow-sm" : "text-slate-500 hover:text-slate-800"
              )}
            >
              {f}
            </button>
          ))}
        </div>

        {/* Right: Export + Sort + Launch */}
        <div className="flex items-center gap-2">
          <button
            onClick={handleExportExcel}
            className="px-4 py-2.5 bg-white text-slate-600 rounded-xl font-bold text-xs border border-slate-200 hover:bg-slate-50 transition-all flex items-center gap-2 shadow-sm"
            title="Export Excel"
          >
            <FileDown className="w-4 h-4" />
            <span className="hidden sm:inline">Excel</span>
          </button>
          <button
            onClick={handleExportPPT}
            className="px-4 py-2.5 bg-white text-slate-600 rounded-xl font-bold text-xs border border-slate-200 hover:bg-slate-50 transition-all flex items-center gap-2 shadow-sm"
            title="Export PowerPoint"
          >
            <FileText className="w-4 h-4" />
            <span className="hidden sm:inline">PPT</span>
          </button>
          <button
            onClick={() => setSortOrder(prev => prev === 'newest' ? 'oldest' : 'newest')}
            className="px-4 py-2.5 bg-white text-slate-600 rounded-xl font-bold text-xs border border-slate-200 hover:bg-slate-50 transition-all flex items-center gap-2 shadow-sm"
          >
            <ArrowDownUp className="w-3.5 h-3.5" />
            Sort: {sortOrder === 'newest' ? 'Newest' : 'Oldest'}
          </button>
          <button 
            onClick={() => setIsModalOpen(true)}
            className="bg-slate-900 text-white px-6 py-3 rounded-xl font-bold text-xs uppercase tracking-widest hover:bg-slate-800 transition-all shadow-lg shadow-slate-200 flex items-center gap-2 group whitespace-nowrap"
          >
            <Plus className="w-4 h-4 group-hover:rotate-90 transition-transform" />
            Launch Campaign
          </button>
        </div>
      </div>

      {/* Campaign Cards Grid */}
      {isLoading ? (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
          {Array.from({ length: 6 }).map((_, i) => (
            <div key={i} className="bg-white rounded-2xl border border-slate-200 overflow-hidden shadow-sm">
              <div className="aspect-[4/3] bg-slate-100 animate-pulse" />
              <div className="p-5 space-y-4">
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <div className="w-16 h-3 bg-slate-100 rounded animate-pulse" />
                    <div className="w-24 h-5 bg-slate-100 rounded animate-pulse" />
                  </div>
                  <div className="space-y-2">
                    <div className="w-16 h-3 bg-slate-100 rounded animate-pulse" />
                    <div className="w-24 h-5 bg-slate-100 rounded animate-pulse" />
                  </div>
                </div>
              </div>
              <div className="px-5 py-4 border-t border-slate-100 flex gap-3">
                <div className="w-6 h-6 bg-slate-100 rounded animate-pulse" />
                <div className="w-6 h-6 bg-slate-100 rounded animate-pulse" />
              </div>
            </div>
          ))}
        </div>
      ) : filteredCampaigns.length > 0 ? (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
          <AnimatePresence mode="popLayout">
            {filteredCampaigns.map((campaign) => {
              const status = getStatus(campaign.start_date, campaign.end_date);
              const site = hoardings[campaign.hoarding_id];
              const durationDays = calculateDays(campaign.start_date, campaign.end_date);

              return (
                <motion.div
                  layout
                  key={campaign.id}
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, scale: 0.95 }}
                  onClick={() => navigate('/campaigns/' + campaign.id)}
                  className="bg-white rounded-2xl border border-slate-200 overflow-hidden shadow-sm hover:shadow-lg transition-all group cursor-pointer flex flex-col"
                >
                  {/* Hero Image with Overlay */}
                  <div className="relative aspect-[4/3] overflow-hidden bg-slate-100">
                    <img
                      src={site?.image_url || 'https://images.unsplash.com/photo-1541746972996-4e0b0f43e02a?q=80&w=2070&auto=format&fit=crop'}
                      alt={campaign.client_info}
                      className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-700"
                      referrerPolicy="no-referrer"
                    />

                    {/* Status Badge */}
                    <div className="absolute top-4 left-4 z-10 flex gap-2">
                      <div className={cn(
                        "px-3 py-1.5 rounded-lg flex items-center gap-1.5 text-[10px] font-extrabold uppercase tracking-widest",
                        status === 'active' ? "bg-emerald-500 text-white" :
                        status === 'upcoming' ? "bg-blue-500 text-white" :
                        "bg-slate-500 text-white"
                      )}>
                        <span className={cn(
                          "w-1.5 h-1.5 rounded-full",
                          status === 'active' ? "bg-emerald-200" :
                          status === 'upcoming' ? "bg-blue-200" :
                          "bg-slate-300"
                        )} />
                        {status}
                      </div>
                      {campaign.po_status && campaign.po_status !== 'none' && (
                        <div className={cn(
                          "px-3 py-1.5 rounded-lg text-[10px] font-extrabold uppercase tracking-widest",
                          campaign.po_status === 'paid' ? "bg-emerald-500 text-white" :
                          campaign.po_status === 'partial' ? "bg-amber-500 text-white" :
                          "bg-slate-500 text-white"
                        )}>
                          PO: {campaign.po_status}
                        </div>
                      )}
                    </div>

                    {/* Bottom gradient overlay with campaign name */}
                    <div className="absolute inset-x-0 bottom-0 bg-gradient-to-t from-black/80 via-black/40 to-transparent p-5 pt-16">
                      <p className="text-[10px] font-bold text-white/70 uppercase tracking-widest mb-1">
                        {campaign.client_info.split(' ').slice(0, 2).join(' ').toUpperCase()}
                      </p>
                      <h3 className="text-lg font-bold text-white leading-tight line-clamp-1">
                        {campaign.client_info}
                      </h3>
                    </div>
                  </div>

                  {/* Details Section - 2x2 grid */}
                  <div className="p-5 flex-1">
                    <div className="grid grid-cols-2 gap-x-6 gap-y-4">
                      <div className="space-y-1">
                        <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">Location</p>
                        <div className="flex items-center gap-1.5">
                          <MapPin className="w-3.5 h-3.5 text-indigo-500 flex-shrink-0" />
                          <p className="text-sm font-bold text-slate-800 truncate">{site?.location || 'Unknown'}</p>
                        </div>
                      </div>
                      <div className="space-y-1">
                        <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">Period</p>
                        <p className="text-sm font-bold text-slate-800">
                          {format(parseISO(campaign.start_date), 'MMM dd')} - {format(parseISO(campaign.end_date), 'MMM dd')}
                        </p>
                      </div>
                      <div className="space-y-1">
                        <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">Duration</p>
                        <p className="text-sm font-bold text-slate-800">{durationDays} Days</p>
                      </div>
                      <div className="space-y-1">
                        <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">
                          {site?.is_owned ? 'Type' : 'Rent'}
                        </p>
                        <p className="text-sm font-bold text-slate-800">
                          {site?.is_owned ? 'Owned Asset' : `₹${(site?.rent_amount || 0).toLocaleString('en-IN')}`}
                        </p>
                      </div>
                    </div>
                  </div>

                  {/* Action Footer */}
                  <div className="px-5 py-3.5 border-t border-slate-100 flex items-center justify-between">
                    <div className="flex items-center gap-1">
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          setEditingCampaign(campaign);
                          setIsModalOpen(true);
                        }}
                        className="p-2 text-slate-400 hover:text-slate-800 hover:bg-slate-100 rounded-lg transition-all"
                        title="Edit"
                      >
                        <Edit3 className="w-4.5 h-4.5" />
                      </button>
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          // Notes view action
                        }}
                        className="p-2 text-slate-400 hover:text-slate-800 hover:bg-slate-100 rounded-lg transition-all"
                        title="Notes"
                      >
                        <MessageSquare className="w-4.5 h-4.5" />
                      </button>
                    </div>
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        handleDeleteCampaign(campaign.id);
                      }}
                      className="p-2 text-slate-400 hover:text-red-600 hover:bg-red-50 rounded-lg transition-all"
                      title="Delete"
                    >
                      {deletingId === campaign.id ? (
                        <Loader2 className="w-4.5 h-4.5 animate-spin" />
                      ) : (
                        <Trash2 className="w-4.5 h-4.5" />
                      )}
                    </button>
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
          <h3 className="text-2xl font-bold text-slate-900 tracking-tight mb-2">No Campaigns Found</h3>
          <p className="text-slate-500 max-w-sm mb-8 font-medium">No campaigns have been deployed yet. Launch your first strategic placement.</p>
          <button 
            onClick={() => setIsModalOpen(true)}
            className="px-8 py-4 bg-slate-900 text-white rounded-2xl font-bold text-xs uppercase tracking-widest hover:bg-slate-800 transition-all shadow-xl shadow-slate-200 flex items-center gap-2"
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

      <AnimatePresence>
        {showExcelModal && (
          <div className="fixed inset-0 z-[100] flex items-center justify-center p-4">
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => setShowExcelModal(false)}
              className="absolute inset-0 bg-slate-900/60 backdrop-blur-sm"
            />
            <motion.div
              initial={{ opacity: 0, scale: 0.95, y: 20 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.95, y: 20 }}
              className="relative w-full max-w-xl bg-white rounded-3xl shadow-2xl overflow-hidden border border-slate-200"
            >
              <div className="p-8 pb-4">
                <div className="flex items-center justify-between mb-4">
                  <div>
                    <h3 className="text-2xl font-bold text-slate-900 tracking-tight">Customize Excel Export</h3>
                    <p className="text-xs text-slate-500 font-semibold mt-1">Choose which data columns to include in your spreadsheet.</p>
                  </div>
                  <button onClick={() => setShowExcelModal(false)} className="p-2 hover:bg-slate-100 rounded-full transition-all text-slate-400 hover:text-slate-600">
                    <X className="w-5 h-5" />
                  </button>
                </div>
                <div className="flex gap-2 mb-6">
                  <button onClick={() => { const u = { ...selectedExcelFields }; CAMPAIGN_FIELDS.forEach(f => { u[f.id] = true; }); setSelectedExcelFields(u); }} className="text-[10px] font-extrabold uppercase tracking-wider text-indigo-600 hover:text-indigo-800 transition">Select All</button>
                  <span className="text-slate-300">|</span>
                  <button onClick={() => { const u = { ...selectedExcelFields }; CAMPAIGN_FIELDS.forEach(f => { u[f.id] = false; }); setSelectedExcelFields(u); }} className="text-[10px] font-extrabold uppercase tracking-wider text-indigo-600 hover:text-indigo-800 transition">Deselect All</button>
                </div>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 max-h-[300px] overflow-y-auto pr-1">
                  {CAMPAIGN_FIELDS.map(field => {
                    const isSelected = selectedExcelFields[field.id];
                    return (
                      <button key={field.id} onClick={() => setSelectedExcelFields(prev => ({ ...prev, [field.id]: !prev[field.id] }))} className={cn("flex items-center justify-between p-3.5 rounded-2xl border text-left transition-all hover:bg-slate-50/80", isSelected ? "bg-indigo-50/40 border-indigo-200/80 shadow-sm" : "bg-white border-slate-150")}>
                        <span className={cn("text-xs font-bold transition-all", isSelected ? "text-indigo-950 font-extrabold" : "text-slate-700")}>{field.label}</span>
                        <div className={cn("w-5 h-5 rounded-lg border flex items-center justify-center transition-all", isSelected ? "bg-indigo-600 border-indigo-600 text-white" : "border-slate-300 bg-white")}>
                          {isSelected && <Check className="w-3.5 h-3.5 stroke-[3]" />}
                        </div>
                      </button>
                    );
                  })}
                </div>
              </div>
              <div className="p-8 bg-slate-50/50 border-t border-slate-100 flex gap-4">
                <button onClick={() => setShowExcelModal(false)} className="flex-1 py-3.5 bg-white text-slate-600 border border-slate-200 rounded-xl font-bold text-xs uppercase tracking-widest hover:bg-slate-100 transition-all shadow-sm">Cancel</button>
                <button onClick={triggerExcelExport} className="flex-1 py-3.5 bg-indigo-600 text-white rounded-xl font-bold text-xs uppercase tracking-widest shadow-lg shadow-indigo-600/10 hover:bg-indigo-700 transition-all flex items-center justify-center gap-1.5">
                  <FileDown className="w-4 h-4" /> Download Excel
                </button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </div>
  );
}
