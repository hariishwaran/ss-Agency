import { useState, useEffect, useCallback } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { campaignService } from '../services/campaignService';
import { hoardingService } from '../services/hoardingService';
import { purchaseOrderService } from '../services/purchaseOrderService';
import { Campaign, Hoarding, PurchaseOrder, LedgerEntry } from '../types';
import { calculateDays, isPast, isFuture } from '../utils/date';
import { format, parseISO } from 'date-fns';
import { Loader2, ArrowLeft, Calendar as CalendarIcon, FileText, ChevronRight, MapPin, Trash2, Plus, CircleDollarSign, FileSpreadsheet } from 'lucide-react';
import { cn } from '../utils/cn';
import { motion, AnimatePresence } from 'motion/react';
import ConfirmDialog from '../components/ConfirmDialog';
import { CustomDatePicker } from '../components/ui/DatePicker';

export default function CampaignDetails() {
  const { id } = useParams();
  const navigate = useNavigate();
  const [campaign, setCampaign] = useState<Campaign | null>(null);
  const [hoarding, setHoarding] = useState<Hoarding | null>(null);
  const [purchaseOrders, setPurchaseOrders] = useState<PurchaseOrder[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [showPoModal, setShowPoModal] = useState(false);
  const [showPaymentModal, setShowPaymentModal] = useState(false);
  const [selectedPo, setSelectedPo] = useState<PurchaseOrder | null>(null);
  const [poForm, setPoForm] = useState({ vendor_name: '', description: '', total_amount: 0, payment_terms: 'Due on Receipt', due_date: '' });
  const [paymentForm, setPaymentForm] = useState({ amount: 0, payment_date: new Date().toISOString().split('T')[0], payment_method: 'UPI' as LedgerEntry['payment_method'], receipt_url: '', reference_number: '' });
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

  const loadData = useCallback(async () => {
    if (!id) return;
    setIsLoading(true);
    try {
      const campaignData = await campaignService.getById(parseInt(id, 10));
      setCampaign(campaignData);
      if (campaignData) {
        const [hoardingData, poData] = await Promise.all([
          hoardingService.getById(campaignData.hoarding_id),
          purchaseOrderService.getByCampaignId(campaignData.id)
        ]);
        setHoarding(hoardingData);
        setPurchaseOrders(poData);
      }
    } catch (error) {
      console.error('Failed to load campaign details', error);
    } finally {
      setIsLoading(false);
    }
  }, [id]);

  useEffect(() => {
    loadData();
  }, [loadData]);

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

  const handleCreatePo = async () => {
    if (!campaign || !poForm.vendor_name || !poForm.description || poForm.total_amount <= 0 || !poForm.due_date) return;
    try {
      const poNumber = `PO-${campaign.id}-${Date.now().toString(36).toUpperCase()}`;
      await purchaseOrderService.create({
        campaign_id: campaign.id,
        hoarding_id: campaign.hoarding_id,
        po_number: poNumber,
        po_date: new Date().toISOString().split('T')[0],
        vendor_name: poForm.vendor_name,
        description: poForm.description,
        total_amount: poForm.total_amount,
        paid_amount: 0,
        balance_amount: poForm.total_amount,
        status: 'draft',
        payment_terms: poForm.payment_terms,
        due_date: poForm.due_date,
        notes: undefined,
      });
      await campaignService.refreshPoSummary(campaign.id);
      setShowPoModal(false);
      setPoForm({ vendor_name: '', description: '', total_amount: 0, payment_terms: 'Due on Receipt', due_date: '' });
      await loadData();
    } catch (error) {
      console.error('Error creating PO:', error);
    }
  };

  const handleRecordPayment = async () => {
    if (!selectedPo || paymentForm.amount <= 0) return;
    try {
      await purchaseOrderService.recordPayment(selectedPo.id, {
        amount: paymentForm.amount,
        payment_date: paymentForm.payment_date,
        payment_method: paymentForm.payment_method,
        receipt_url: paymentForm.receipt_url || undefined,
        reference_number: paymentForm.reference_number || undefined,
      });
      await campaignService.refreshPoSummary(selectedPo.campaign_id);
      setShowPaymentModal(false);
      setSelectedPo(null);
      setPaymentForm({ amount: 0, payment_date: new Date().toISOString().split('T')[0], payment_method: 'UPI', receipt_url: '', reference_number: '' });
      await loadData();
    } catch (error) {
      console.error('Error recording payment:', error);
    }
  };

  const handleDeletePo = async (poId: string) => {
    setConfirmConfig({
      isOpen: true,
      title: 'Delete Purchase Order',
      message: 'Are you sure you want to delete this purchase order?',
      variant: 'danger',
      onConfirm: async () => {
        try {
          await purchaseOrderService.delete(poId);
          if (campaign) await campaignService.refreshPoSummary(campaign.id);
          await loadData();
        } catch (error) {
          console.error('Error deleting PO:', error);
        }
      }
    });
  };

  const poStatusColor = (status: string) => {
    switch (status) {
      case 'paid': return 'bg-emerald-50 text-emerald-700 border-emerald-100';
      case 'partial': return 'bg-amber-50 text-amber-700 border-amber-100';
      case 'sent': return 'bg-blue-50 text-blue-700 border-blue-100';
      case 'draft': return 'bg-slate-50 text-slate-600 border-slate-100';
      case 'cancelled': return 'bg-red-50 text-red-600 border-red-100';
      default: return 'bg-slate-50 text-slate-600 border-slate-100';
    }
  };

  if (isLoading) {
    return (
      <div className="space-y-12 animate-in fade-in duration-500 pb-20">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-6">
          <div className="w-40 h-5 bg-slate-200 rounded-md animate-pulse"></div>
          <div className="w-56 h-12 bg-slate-200 rounded-2xl animate-pulse"></div>
        </div>
        <section className="grid grid-cols-1 lg:grid-cols-12 gap-10">
          <div className="lg:col-span-8 space-y-10">
            <div className="w-48 h-10 bg-slate-200 rounded-lg animate-pulse mb-4"></div>
            <div className="w-full h-6 bg-slate-200 rounded-md animate-pulse"></div>
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
  const progress = Math.min(100, Math.max(0, ((elapsedDays ?? 0) / totalDays) * 100));

  return (
    <div className="space-y-8 max-w-6xl animate-in fade-in duration-500 pb-20">
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
          {campaign.po_status && campaign.po_status !== 'none' && (
            <span className={cn(
              "px-3 py-1.5 rounded-lg text-[10px] font-black uppercase tracking-widest",
              campaign.po_status === 'paid' ? "bg-emerald-50 text-emerald-700 border-emerald-100" :
              campaign.po_status === 'partial' ? "bg-amber-50 text-amber-700 border-amber-100" :
              "bg-slate-50 text-slate-600 border-slate-100"
            )}>
              PO: {campaign.po_status}
            </span>
          )}
        </div>
      </div>

      <section className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-stretch">
        <div className="lg:col-span-8 flex flex-col gap-8">
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

              {campaign.total_po_amount !== undefined && campaign.total_po_amount > 0 && (
                <div className="pb-4 border-b border-slate-200/40">
                  <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-2">Financial Summary</p>
                  <div className="grid grid-cols-2 gap-4">
                    <div className="p-4 bg-white rounded-xl border border-slate-200/60">
                      <p className="text-[9px] font-bold text-slate-400 uppercase tracking-widest">Total PO Value</p>
                      <p className="text-xl font-black text-slate-900 mt-1">₹ {campaign.total_po_amount.toLocaleString('en-IN')}</p>
                    </div>
                    <div className="p-4 bg-white rounded-xl border border-slate-200/60">
                      <p className="text-[9px] font-bold text-slate-400 uppercase tracking-widest">Paid</p>
                      <p className="text-xl font-black text-emerald-600 mt-1">₹ {(campaign.paid_po_amount || 0).toLocaleString('en-IN')}</p>
                    </div>
                  </div>
                </div>
              )}

              <div className="flex justify-between items-center pb-4 border-b border-slate-200/40">
                <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">Hoarding ID</p>
                <span className="bg-slate-200/60 text-slate-700 px-2.5 py-1 rounded-lg font-mono text-xs font-bold">
                  #HID-{1000 + campaign.hoarding_id}
                </span>
              </div>

              {campaign.internal_notes && (
                <div className="pt-2">
                  <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-2">Internal Notes</p>
                    <p className="text-sm text-slate-600 italic leading-relaxed font-sans font-medium">
                    {campaign.internal_notes}
                  </p>
                </div>
              )}
            </div>
          </div>

          <div className="bg-white p-8 rounded-[2rem] border border-slate-200/60 shadow-sm">
            <div className="flex items-center justify-between mb-6">
              <h3 className="text-[10px] font-black text-indigo-600 uppercase tracking-[0.2em] flex items-center gap-2">
                <FileSpreadsheet className="w-4 h-4 text-indigo-600" /> Purchase Orders
              </h3>
              <button
                onClick={() => setShowPoModal(true)}
                className="px-4 py-2 bg-slate-900 text-white rounded-xl font-bold text-[10px] uppercase tracking-widest hover:bg-slate-800 transition-all flex items-center gap-2"
              >
                <Plus className="w-3.5 h-3.5" /> Add PO
              </button>
            </div>

            {purchaseOrders.length === 0 ? (
              <div className="py-12 flex flex-col items-center justify-center text-center">
                <FileSpreadsheet className="w-10 h-10 text-slate-300 mb-4" />
                <p className="text-sm font-bold text-slate-500">No Purchase Orders Yet</p>
                <p className="text-xs text-slate-400 mt-1">Create a PO to track payments against this campaign.</p>
              </div>
            ) : (
              <div className="space-y-3">
                {purchaseOrders.map((po) => (
                  <div key={po.id} className="p-5 bg-slate-50/50 rounded-2xl border border-slate-200/60 hover:border-slate-300 transition-all">
                    <div className="flex items-start justify-between gap-4">
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-3 mb-2">
                          <p className="text-xs font-mono font-bold text-slate-700 bg-slate-100 px-2 py-0.5 rounded">{po.po_number}</p>
                          <span className={cn("px-2 py-0.5 rounded text-[9px] font-black uppercase tracking-widest border", poStatusColor(po.status))}>
                            {po.status}
                          </span>
                        </div>
                        <p className="text-sm font-bold text-slate-900 truncate">{po.description}</p>
                        <p className="text-xs font-medium text-slate-500 mt-0.5">{po.vendor_name}</p>
                      </div>
                      <div className="text-right flex-shrink-0">
                        <p className="text-lg font-black text-slate-900">₹ {po.total_amount.toLocaleString('en-IN')}</p>
                        {po.status !== 'paid' && po.status !== 'cancelled' && (
                          <p className="text-[10px] font-bold text-amber-600">Balance: ₹ {po.balance_amount.toLocaleString('en-IN')}</p>
                        )}
                      </div>
                    </div>
                    <div className="flex items-center justify-between mt-4 pt-3 border-t border-slate-200/60">
                      <div className="flex items-center gap-2 text-[10px] text-slate-400 font-bold">
                        <span>Due: {format(parseISO(po.due_date), 'MMM dd, yyyy')}</span>
                        <span className="text-slate-300">|</span>
                        <span>{po.payment_terms}</span>
                      </div>
                      <div className="flex items-center gap-2">
                        {po.status !== 'paid' && po.status !== 'cancelled' && (
                          <button
                            onClick={() => { setSelectedPo(po); setShowPaymentModal(true); }}
                            className="px-3 py-1.5 bg-emerald-50 text-emerald-700 rounded-lg font-bold text-[9px] uppercase tracking-widest border border-emerald-100 hover:bg-emerald-100 transition-all flex items-center gap-1"
                          >
                            <CircleDollarSign className="w-3 h-3" /> Record Payment
                          </button>
                        )}
                        <button
                          onClick={() => handleDeletePo(po.id)}
                          className="p-1.5 text-slate-400 hover:text-red-500 transition-colors"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>

        <aside className="lg:col-span-4 h-full">
          {hoarding ? (
            <div 
              onClick={() => navigate('/details/' + hoarding.id)}
              className="bg-white rounded-[2rem] border border-slate-200/60 p-6 shadow-sm hover:shadow-lg transition-all cursor-pointer group flex flex-col justify-between h-full min-h-[480px]"
            >
              <div>
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

                <div className="aspect-[4/3] rounded-2xl overflow-hidden bg-slate-50 border border-slate-100 mb-6">
                  <img 
                    src={hoarding.image_url || 'https://images.unsplash.com/photo-1541746972996-4e0b0f43e02a?q=80&w=2070&auto=format&fit=crop'} 
                    alt={hoarding.location}
                    className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-[1.5s]"
                    referrerPolicy="no-referrer"
                  />
                </div>

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

      <AnimatePresence>
        {showPoModal && (
          <div className="fixed inset-0 z-[100] flex items-center justify-center p-4">
            <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} onClick={() => setShowPoModal(false)} className="absolute inset-0 bg-slate-900/60 backdrop-blur-sm" />
            <motion.div initial={{ opacity: 0, scale: 0.95, y: 20 }} animate={{ opacity: 1, scale: 1, y: 0 }} exit={{ opacity: 0, scale: 0.95, y: 20 }} className="relative w-full max-w-lg bg-white rounded-[40px] shadow-2xl overflow-hidden border border-slate-200">
              <div className="p-8 pb-4">
                <h3 className="text-3xl font-black text-slate-900 tracking-tight">New Purchase Order</h3>
                <p className="text-sm text-slate-500 font-medium">Create a PO for this campaign.</p>
              </div>
              <div className="p-8 pt-0 space-y-6">
                <div className="space-y-2">
                  <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Vendor/Supplier</label>
                  <input required className="w-full bg-slate-50 border border-slate-200 rounded-2xl px-4 py-3 text-sm focus:ring-4 focus:ring-indigo-600/5 outline-none font-bold" placeholder="e.g. Print House Solutions" value={poForm.vendor_name} onChange={(e) => setPoForm({...poForm, vendor_name: e.target.value})} />
                </div>
                <div className="space-y-2">
                  <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Description</label>
                  <input required className="w-full bg-slate-50 border border-slate-200 rounded-2xl px-4 py-3 text-sm focus:ring-4 focus:ring-indigo-600/5 outline-none font-bold" placeholder="e.g. Flex printing and installation" value={poForm.description} onChange={(e) => setPoForm({...poForm, description: e.target.value})} />
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Total Amount (₹)</label>
                    <input required type="number" className="w-full bg-slate-50 border border-slate-200 rounded-2xl px-4 py-3 text-sm focus:ring-4 focus:ring-indigo-600/5 outline-none font-bold" value={poForm.total_amount} onChange={(e) => setPoForm({...poForm, total_amount: parseFloat(e.target.value)})} />
                  </div>
                  <div className="space-y-2">
                    <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Due Date</label>
                    <CustomDatePicker selected={poForm.due_date ? parseISO(poForm.due_date) : null} onChange={(date) => setPoForm({...poForm, due_date: date ? format(date, 'yyyy-MM-dd') : ''})} />
                  </div>
                </div>
                <div className="space-y-2">
                  <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Payment Terms</label>
                  <select className="w-full bg-slate-50 border border-slate-200 rounded-2xl px-4 py-3 text-sm focus:ring-4 focus:ring-indigo-600/5 outline-none font-bold" value={poForm.payment_terms} onChange={(e) => setPoForm({...poForm, payment_terms: e.target.value})}>
                    <option>Due on Receipt</option>
                    <option>Net 15</option>
                    <option>Net 30</option>
                    <option>Net 60</option>
                    <option>50% Advance</option>
                  </select>
                </div>
                <div className="pt-4 flex gap-4">
                  <button type="button" onClick={() => setShowPoModal(false)} className="flex-1 py-4 bg-slate-100 text-slate-600 rounded-2xl font-bold text-xs uppercase tracking-widest hover:bg-slate-200 transition-all">Cancel</button>
                  <button onClick={handleCreatePo} disabled={!poForm.vendor_name || !poForm.description || poForm.total_amount <= 0 || !poForm.due_date} className="flex-1 py-4 bg-slate-900 text-white rounded-2xl font-bold text-xs uppercase tracking-widest shadow-xl shadow-slate-200 hover:bg-slate-800 transition-all disabled:opacity-50">Create PO</button>
                </div>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      <AnimatePresence>
        {showPaymentModal && selectedPo && (
          <div className="fixed inset-0 z-[100] flex items-center justify-center p-4">
            <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} onClick={() => { setShowPaymentModal(false); setSelectedPo(null); }} className="absolute inset-0 bg-slate-900/60 backdrop-blur-sm" />
            <motion.div initial={{ opacity: 0, scale: 0.95, y: 20 }} animate={{ opacity: 1, scale: 1, y: 0 }} exit={{ opacity: 0, scale: 0.95, y: 20 }} className="relative w-full max-w-lg bg-white rounded-[40px] shadow-2xl overflow-hidden border border-slate-200">
              <div className="p-8 pb-4">
                <h3 className="text-3xl font-black text-slate-900 tracking-tight">Record Payment</h3>
                <p className="text-sm text-slate-500 font-medium">PO: {selectedPo.po_number} — Balance: ₹ {selectedPo.balance_amount.toLocaleString('en-IN')}</p>
              </div>
              <div className="p-8 pt-0 space-y-6">
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Amount (₹)</label>
                    <input required type="number" max={selectedPo.balance_amount} className="w-full bg-slate-50 border border-slate-200 rounded-2xl px-4 py-3 text-sm focus:ring-4 focus:ring-indigo-600/5 outline-none font-bold" value={paymentForm.amount} onChange={(e) => setPaymentForm({...paymentForm, amount: parseFloat(e.target.value)})} />
                  </div>
                  <div className="space-y-2">
                    <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Payment Date</label>
                    <CustomDatePicker selected={paymentForm.payment_date ? parseISO(paymentForm.payment_date) : null} onChange={(date) => setPaymentForm({...paymentForm, payment_date: date ? format(date, 'yyyy-MM-dd') : ''})} />
                  </div>
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Method</label>
                    <select className="w-full bg-slate-50 border border-slate-200 rounded-2xl px-4 py-3 text-sm focus:ring-4 focus:ring-indigo-600/5 outline-none font-bold" value={paymentForm.payment_method} onChange={(e) => setPaymentForm({...paymentForm, payment_method: e.target.value as any})}>
                      <option value="UPI">UPI</option>
                      <option value="Bank Transfer">Bank Transfer</option>
                      <option value="Cash">Cash</option>
                      <option value="Cheque">Cheque</option>
                      <option value="Other">Other</option>
                    </select>
                  </div>
                  <div className="space-y-2">
                    <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Ref Number</label>
                    <input className="w-full bg-slate-50 border border-slate-200 rounded-2xl px-4 py-3 text-sm focus:ring-4 focus:ring-indigo-600/5 outline-none font-bold" placeholder="UTR / Ref" value={paymentForm.reference_number} onChange={(e) => setPaymentForm({...paymentForm, reference_number: e.target.value})} />
                  </div>
                </div>
                <div className="space-y-2">
                  <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Receipt URL</label>
                  <input type="url" placeholder="https://..." className="w-full bg-slate-50 border border-slate-200 rounded-2xl px-4 py-3 text-sm focus:ring-4 focus:ring-indigo-600/5 outline-none font-bold" value={paymentForm.receipt_url} onChange={(e) => setPaymentForm({...paymentForm, receipt_url: e.target.value})} />
                </div>
                <div className="pt-4 flex gap-4">
                  <button type="button" onClick={() => { setShowPaymentModal(false); setSelectedPo(null); }} className="flex-1 py-4 bg-slate-100 text-slate-600 rounded-2xl font-bold text-xs uppercase tracking-widest hover:bg-slate-200 transition-all">Cancel</button>
                  <button onClick={handleRecordPayment} disabled={paymentForm.amount <= 0} className="flex-1 py-4 bg-emerald-600 text-white rounded-2xl font-bold text-xs uppercase tracking-widest shadow-xl shadow-emerald-200 hover:bg-emerald-700 transition-all disabled:opacity-50">Confirm Payment</button>
                </div>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

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
