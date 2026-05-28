import { X, Calendar, User, Type, PlayCircle, MapPin, Check, FileText, Clock, Loader2, Trash2 } from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import React, { useState, useEffect } from 'react';
import { Campaign, Hoarding } from '../types';
import { CustomDatePicker } from './ui/DatePicker';
import { format, parseISO } from 'date-fns';
import { cn } from '../utils/cn';
import { calculateDays } from '../utils/date';
import { hoardingService } from '../services/hoardingService';

interface CampaignModalProps {
  isOpen: boolean;
  onClose: () => void;
  onCreate: (campaign: any) => void;
  onUpdate?: (id: number, campaign: any) => void;
  onDelete?: (id: number) => Promise<boolean | void>;
  campaign?: Campaign | null;
  initialHoardingId?: number | null;
}

interface FormDataState {
  client_info: string;
  start_date: string;
  end_date: string;
  hoarding_ids: number[];
  internal_notes: string;
}

export default function CampaignModal({ isOpen, onClose, onCreate, onUpdate, onDelete, campaign, initialHoardingId }: CampaignModalProps) {
  const [formData, setFormData] = useState<FormDataState>({
    client_info: '',
    start_date: '',
    end_date: '',
    hoarding_ids: [],
    internal_notes: '',
  });
  const [hoardings, setHoardings] = useState<Hoarding[]>([]);
  const [isLoading, setIsLoading] = useState(false);

  useEffect(() => {
    if (isOpen) {
      loadHoardings();
      if (campaign) {
        setFormData({
          client_info: campaign.client_info,
          start_date: campaign.start_date,
          end_date: campaign.end_date,
          hoarding_ids: campaign.hoarding_id ? [campaign.hoarding_id] : [],
          internal_notes: campaign.internal_notes || '',
        });
      } else {
        setFormData({
          client_info: '',
          start_date: '',
          end_date: '',
          hoarding_ids: initialHoardingId ? [initialHoardingId] : [],
          internal_notes: '',
        });
      }
    }
  }, [isOpen, campaign, initialHoardingId]);

  const loadHoardings = async () => {
    try {
      setIsLoading(true);
      const data = await hoardingService.getAll();
      setHoardings(data);
    } catch (error) {
      console.error('Error loading hoardings:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const handleToggleHoarding = (id: number) => {
    if (campaign) { // Single select mode for edit
      setFormData({ ...formData, hoarding_ids: [id] });
      return;
    }
    
    setFormData(prev => {
      if (prev.hoarding_ids.includes(id)) {
        return { ...prev, hoarding_ids: prev.hoarding_ids.filter(x => x !== id) };
      }
      return { ...prev, hoarding_ids: [...prev.hoarding_ids, id] };
    });
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (formData.client_info && formData.start_date && formData.end_date && formData.hoarding_ids.length > 0) {
      if (campaign && onUpdate) {
        onUpdate(campaign.id, {
          client_info: formData.client_info,
          start_date: formData.start_date,
          end_date: formData.end_date,
          hoarding_id: formData.hoarding_ids[0],
          internal_notes: formData.internal_notes
        });
      } else {
        // We pass the formData containing hoarding_ids to onCreate
        onCreate(formData);
      }
    }
  };

  return (
    <AnimatePresence>
      {isOpen && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-4">
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={onClose}
            className="absolute inset-0 bg-slate-900/60 backdrop-blur-sm"
          />
          
          <motion.div
            initial={{ opacity: 0, scale: 0.95, y: 20 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.95, y: 20 }}
            className="relative w-full max-w-lg bg-white rounded-3xl shadow-2xl overflow-hidden border border-slate-200"
          >
            <div className="p-8 border-b border-slate-100 flex justify-between items-center bg-slate-50/50">
              <div>
                <h3 className="text-xl font-bold text-slate-900 tracking-tight">
                  {campaign ? 'Edit Campaign' : 'New Campaign'}
                </h3>
                <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mt-1">Strategic Placement</p>
              </div>
              <button 
                onClick={onClose}
                className="p-2 text-slate-400 hover:text-slate-900 hover:bg-slate-100 rounded-full transition-all"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleSubmit} className="p-8 space-y-6 max-h-[80vh] overflow-y-auto custom-scrollbar">
              <div className="space-y-4">
                <div className="space-y-1.5">
                  <label className="text-[10px] font-bold text-slate-400 uppercase tracking-widest ml-1">Client / Brand Info</label>
                  <div className="relative">
                    <User className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
                    <input
                      required
                      type="text"
                      placeholder="e.g. Coca-Cola India - Summer Campaign"
                      className="w-full bg-slate-50 border border-slate-200 rounded-xl pl-12 pr-4 py-3 text-sm focus:ring-2 focus:ring-indigo-600/10 focus:border-indigo-600 outline-none transition-all font-medium"
                      value={formData.client_info}
                      onChange={(e) => setFormData({ ...formData, client_info: e.target.value })}
                    />
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-1.5">
                    <label className="text-[10px] font-bold text-slate-400 uppercase tracking-widest ml-1">Start Date</label>
                    <div className="relative">
                      <Calendar className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
                      <CustomDatePicker
                        className="pl-12"
                        selected={formData.start_date ? parseISO(formData.start_date) : null}
                        onChange={(date) => setFormData({ ...formData, start_date: date ? format(date, 'yyyy-MM-dd') : '' })}
                      />
                    </div>
                  </div>
                  <div className="space-y-1.5">
                    <label className="text-[10px] font-bold text-slate-400 uppercase tracking-widest ml-1">End Date</label>
                    <div className="relative">
                      <Calendar className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
                      <CustomDatePicker
                        className="pl-12"
                        selected={formData.end_date ? parseISO(formData.end_date) : null}
                        onChange={(date) => setFormData({ ...formData, end_date: date ? format(date, 'yyyy-MM-dd') : '' })}
                      />
                    </div>
                  </div>
                </div>

                {formData.start_date && formData.end_date && (
                  <div className="flex items-center gap-2 px-4 py-2 bg-indigo-50 border border-indigo-100 rounded-xl animate-in fade-in slide-in-from-top-1 duration-300">
                    <Clock className="w-3.5 h-3.5 text-indigo-600" />
                    <span className="text-[10px] font-bold text-indigo-900 uppercase tracking-widest">
                      Total Duration: {calculateDays(formData.start_date!, formData.end_date!)} Days
                    </span>
                  </div>
                )}

                <div className="space-y-1.5">
                  <label className="text-[10px] font-bold text-slate-400 uppercase tracking-widest ml-1">Internal Notes (Private)</label>
                  <div className="relative">
                    <FileText className="absolute left-4 top-3 w-4 h-4 text-slate-400" />
                    <textarea
                      placeholder="Add private team notes, strategic goals, or specific creative requirements..."
                      className="w-full bg-slate-50 border border-slate-200 rounded-xl pl-12 pr-4 py-3 text-sm focus:ring-2 focus:ring-indigo-600/10 focus:border-indigo-600 outline-none transition-all font-medium min-h-[80px] resize-none"
                      value={formData.internal_notes}
                      onChange={(e) => setFormData({ ...formData, internal_notes: e.target.value })}
                    />
                  </div>
                </div>

                <div className="space-y-3">
                  <div className="flex items-center justify-between ml-1">
                    <label className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">
                      Target Hoarding Asset{campaign ? '' : 's (Multiple ok)'}
                    </label>
                    <span className="text-[9px] font-bold text-slate-900 bg-slate-100 px-2 py-0.5 rounded-full">
                      {formData.hoarding_ids.length} selected
                    </span>
                  </div>
                  <div className="grid grid-cols-1 gap-2 max-h-48 overflow-y-auto pr-2 custom-scrollbar">
                    {isLoading ? (
                      <div className="py-8 flex justify-center">
                        <Loader2 className="w-6 h-6 text-indigo-600 animate-spin" />
                      </div>
                    ) : hoardings.map((site) => {
                      const isSelected = formData.hoarding_ids.includes(site.id);
                      return (
                        <button
                          key={site.id}
                          type="button"
                          onClick={() => handleToggleHoarding(site.id)}
                          className={cn(
                            "flex items-center justify-between p-3 rounded-xl border transition-all text-left group",
                            isSelected 
                              ? "bg-slate-50 border-slate-900 shadow-sm" 
                              : "bg-white border-slate-200 hover:border-slate-300"
                          )}
                        >
                          <div className="flex items-center gap-3">
                            <div className={cn(
                              "w-8 h-8 rounded-lg flex items-center justify-center transition-colors",
                              isSelected ? "bg-slate-900 text-white" : "bg-slate-50 text-slate-400 group-hover:bg-slate-100"
                            )}>
                              <MapPin className="w-4 h-4" />
                            </div>
                            <div className="pr-4 flex flex-col gap-0.5">
                              <p className={cn("text-xs font-bold truncate max-w-[200px]", isSelected ? "text-slate-900" : "text-slate-900")}>{site.location}</p>
                              <div className="flex items-center gap-2">
                                <p className="text-[9px] text-slate-400 font-bold uppercase tracking-widest">{site.width}×{site.height} ft</p>
                                {site.latitude && site.longitude && (
                                  <>
                                    <span className="text-slate-300">•</span>
                                    <p className="text-[9px] text-indigo-500 font-bold uppercase tracking-widest">{site.latitude}, {site.longitude}</p>
                                  </>
                                )}
                              </div>
                            </div>
                          </div>
                          {isSelected && <Check className="w-4 h-4 text-slate-900" />}
                        </button>
                      );
                    })}
                  </div>
                </div>
              </div>

              <div className="flex gap-4 pt-4">
                {campaign && onDelete && (
                  <button
                    type="button"
                    onClick={async () => {
                       if (onDelete) {
                         const success = await onDelete(campaign.id);
                         if (success === true) onClose();
                       }
                    }}
                    className="p-4 bg-red-50 text-red-600 rounded-xl hover:bg-red-600 hover:text-white transition-all border border-red-100"
                    title="Delete Campaign"
                  >
                    <Trash2 className="w-5 h-5" />
                  </button>
                )}
                <button
                  type="button"
                  onClick={onClose}
                  className="flex-1 py-4 bg-slate-100 text-slate-600 rounded-xl font-bold text-xs uppercase tracking-widest hover:bg-slate-200 transition-all font-mono"
                >
                  CANCEL
                </button>
                <button
                  type="submit"
                  disabled={formData.hoarding_ids.length === 0}
                  className="flex-[2] py-4 bg-slate-900 text-white rounded-xl font-bold text-xs uppercase tracking-widest shadow-lg shadow-slate-200 hover:bg-slate-800 transition-all disabled:opacity-50 disabled:cursor-not-allowed font-mono"
                >
                  {campaign ? 'UPDATE' : (formData.hoarding_ids.length > 1 ? `LAUNCH ${formData.hoarding_ids.length}` : 'LAUNCH')}
                </button>
              </div>
            </form>
          </motion.div>
        </div>
      )}
    </AnimatePresence>
  );
}
