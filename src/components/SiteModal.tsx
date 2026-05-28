import { X, Camera, Upload, Trash2, MapPin, Ruler, User, Mail, FileText, Check, Scissors, Loader2 } from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import React, { useState, useRef, useEffect, useCallback } from 'react';
import Cropper from 'react-easy-crop';
import { CustomDatePicker } from './ui/DatePicker';
import { format, parseISO } from 'date-fns';
import { Hoarding } from '../types';
import { cn } from '../utils/cn';

// Helper function to create a cropped image
const getCroppedImg = async (imageSrc: string, pixelCrop: any): Promise<string> => {
  const image = await new Promise<HTMLImageElement>((resolve, reject) => {
    const img = new Image();
    img.addEventListener('load', () => resolve(img));
    img.addEventListener('error', (error) => reject(error));
    img.src = imageSrc;
  });

  const canvas = document.createElement('canvas');
  const ctx = canvas.getContext('2d');

  if (!ctx) return '';

  canvas.width = pixelCrop.width;
  canvas.height = pixelCrop.height;

  ctx.drawImage(
    image,
    pixelCrop.x,
    pixelCrop.y,
    pixelCrop.width,
    pixelCrop.height,
    0,
    0,
    pixelCrop.width,
    pixelCrop.height
  );

  return new Promise((resolve) => {
    canvas.toBlob((blob) => {
      if (!blob) return resolve('');
      const reader = new FileReader();
      reader.readAsDataURL(blob);
      reader.onloadend = () => {
        resolve(reader.result as string);
      };
    }, 'image/jpeg');
  });
};

interface SiteModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSave: (hoarding: any) => void;
  onDelete?: (id: number) => Promise<boolean | void>;
  hoarding?: Hoarding | null;
}

const rentStatusOptions: Hoarding['rent_status'][] = ['Paid', 'Pending'];

export default function SiteModal({ isOpen, onClose, onSave, onDelete, hoarding }: SiteModalProps) {
  const [formData, setFormData] = useState<Partial<Hoarding>>({
    location: '',
    width: 0,
    height: 0,
    owner_name: '',
    contact_number: '',
    rent_amount: 0,
    rent_status: 'Pending',
    last_paid_date: '',
    next_due_date: '',
    notes: '',
    latitude: '',
    longitude: '',
    is_owned: false,
    image_url: '',
  });

  const fileInputRef = useRef<HTMLInputElement>(null);
  const [isDragging, setIsDragging] = useState(false);
  const [isUploading, setIsUploading] = useState(false);
  const [uploadProgress, setUploadProgress] = useState(0);

  // Cropper states
  const [imageToCrop, setImageToCrop] = useState<string | null>(null);
  const [crop, setCrop] = useState({ x: 0, y: 0 });
  const [zoom, setZoom] = useState(1);
  const [croppedAreaPixels, setCroppedAreaPixels] = useState(null);

  const onCropComplete = useCallback((_croppedArea: any, croppedAreaPixels: any) => {
    setCroppedAreaPixels(croppedAreaPixels);
  }, []);

  const handleApplyCrop = async () => {
    if (imageToCrop && croppedAreaPixels) {
      setIsUploading(true);
      setUploadProgress(0);
      
      const interval = setInterval(() => {
        setUploadProgress(prev => Math.min(prev + 10, 90));
      }, 100);

      try {
        const croppedImage = await getCroppedImg(imageToCrop, croppedAreaPixels);
        setFormData(prev => ({ ...prev, image_url: croppedImage }));
        setImageToCrop(null);
        setUploadProgress(100);
        setTimeout(() => setIsUploading(false), 500);
      } catch (e) {
        console.error(e);
        setIsUploading(false);
      } finally {
        clearInterval(interval);
      }
    }
  };

  useEffect(() => {
    if (hoarding) {
      setFormData(hoarding);
    } else {
      setFormData({
        location: '',
        width: 0,
        height: 0,
        owner_name: '',
        contact_number: '',
        rent_amount: 0,
        rent_status: 'Pending',
        last_paid_date: '',
        next_due_date: '',
        notes: '',
        latitude: '',
        longitude: '',
        is_owned: false,
        image_url: '',
      });
    }
  }, [hoarding, isOpen]);

  const processFile = (file: File) => {
    const reader = new FileReader();
    reader.onloadend = () => {
      setImageToCrop(reader.result as string);
    };
    reader.readAsDataURL(file);
  };

  const handleImageChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      processFile(file);
    }
  };

  const onDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(true);
  };

  const onDragLeave = () => {
    setIsDragging(false);
  };

  const onDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
    const file = e.dataTransfer.files?.[0];
    if (file) {
      processFile(file);
    }
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    onSave(formData);
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
            className="relative w-full max-w-2xl bg-white rounded-3xl shadow-2xl overflow-hidden border border-slate-200 flex flex-col max-h-[90vh]"
          >
            <div className="p-8 border-b border-slate-100 flex justify-between items-center bg-slate-50/50">
              <div>
                <h3 className="text-xl font-bold text-slate-900 tracking-tight">
                  {hoarding ? 'Edit Hoarding Unit' : 'Add New Hoarding Unit'}
                </h3>
                <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mt-1">Asset Management</p>
              </div>
              <button 
                onClick={onClose}
                className="p-2 text-slate-400 hover:text-slate-900 hover:bg-slate-100 rounded-full transition-all"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleSubmit} className="overflow-y-auto p-8 space-y-8 flex-1 custom-scrollbar">
              {/* Image Upload Block */}
              <div className="space-y-3">
                <label className="text-[10px] font-bold text-slate-400 uppercase tracking-widest ml-1">Hoarding Appearance</label>
                <div 
                  onDragOver={onDragOver}
                  onDragLeave={onDragLeave}
                  onDrop={onDrop}
                  className={cn(
                    "relative aspect-video rounded-2xl border-2 border-dashed transition-all flex flex-col items-center justify-center overflow-hidden group bg-slate-50",
                    formData.image_url ? "border-indigo-600/20" : "border-slate-200 hover:border-indigo-600/40",
                    isDragging && "border-indigo-600 bg-indigo-50/50 scale-[1.01]"
                  )}
                >
                  {isUploading && (
                    <div className="absolute inset-0 z-20 bg-white/90 backdrop-blur-sm flex flex-col items-center justify-center p-8 text-center animate-in fade-in duration-300">
                      <Loader2 className="w-8 h-8 text-indigo-600 animate-spin mb-4" />
                      <p className="text-sm font-bold text-slate-900 mb-2">Processing image</p>
                      <div className="w-full max-w-[200px] h-1.5 bg-slate-100 rounded-full overflow-hidden">
                        <motion.div 
                          className="h-full bg-indigo-600"
                          initial={{ width: 0 }}
                          animate={{ width: `${uploadProgress}%` }}
                        />
                      </div>
                    </div>
                  )}

                  {imageToCrop ? (
                    <div className="absolute inset-0 z-10 bg-slate-900 flex flex-col animate-in zoom-in-95 duration-300">
                      <div className="relative flex-1">
                        <Cropper
                          image={imageToCrop}
                          crop={crop}
                          zoom={zoom}
                          aspect={16 / 9}
                          onCropChange={setCrop}
                          onCropComplete={onCropComplete}
                          onZoomChange={setZoom}
                        />
                      </div>
                      <div className="p-4 bg-white border-t border-slate-100 flex items-center justify-between gap-4">
                        <div className="flex items-center gap-3 flex-1 px-4">
                          <Scissors className="w-4 h-4 text-slate-400" />
                          <input
                            type="range"
                            value={zoom}
                            min={1}
                            max={3}
                            step={0.1}
                            aria-labelledby="Zoom"
                            onChange={(e) => setZoom(Number(e.target.value))}
                            className="w-full accent-indigo-600 h-1.5 bg-slate-100 rounded-lg appearance-none cursor-pointer"
                          />
                        </div>
                        <div className="flex gap-2">
                          <button
                            type="button"
                            onClick={() => setImageToCrop(null)}
                            className="px-4 py-2 text-[10px] font-bold uppercase tracking-widest text-slate-400 hover:text-slate-900"
                          >
                            Cancel
                          </button>
                          <button
                            type="button"
                            onClick={handleApplyCrop}
                            className="px-6 py-2 bg-slate-900 text-white rounded-lg text-[10px] font-bold uppercase tracking-widest shadow-lg shadow-slate-200"
                          >
                            Apply Crop
                          </button>
                        </div>
                      </div>
                    </div>
                  ) : formData.image_url ? (
                    <>
                      <img src={formData.image_url} alt="Preview" className="w-full h-full object-cover" />
                      <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center gap-4">
                        <button 
                          type="button"
                          onClick={() => fileInputRef.current?.click()}
                          className="p-3 bg-white text-slate-900 rounded-full shadow-lg hover:scale-110 transition-transform"
                        >
                          <Upload className="w-5 h-5" />
                        </button>
                        <button 
                          type="button"
                          onClick={() => setImageToCrop(formData.image_url!)}
                          className="p-3 bg-white text-indigo-600 rounded-full shadow-lg hover:scale-110 transition-transform"
                        >
                           <Scissors className="w-5 h-5" />
                        </button>
                        <button 
                          type="button"
                          onClick={() => setFormData({ ...formData, image_url: '' })}
                          className="p-3 bg-white text-red-600 rounded-full shadow-lg hover:scale-110 transition-transform"
                        >
                          <Trash2 className="w-5 h-5" />
                        </button>
                      </div>
                    </>
                  ) : (
                    <div className="text-center px-6">
                      <div className="w-12 h-12 rounded-2xl bg-slate-50 border border-slate-200 flex items-center justify-center mx-auto mb-4 text-slate-400 group-hover:text-indigo-600 group-hover:border-indigo-600/20 transition-all">
                        <Camera className="w-6 h-6" />
                      </div>
                      <p className="text-xs font-bold text-slate-900 mb-1">Upload high-res capture</p>
                      <button 
                        type="button"
                        onClick={() => fileInputRef.current?.click()}
                        className="mt-4 px-6 py-2 bg-white border border-slate-200 rounded-lg text-[10px] font-bold uppercase tracking-widest hover:border-indigo-600 hover:text-indigo-600 transition-all"
                      >
                        Select Image
                      </button>
                    </div>
                  )}
                  <input 
                    ref={fileInputRef}
                    type="file" 
                    accept="image/*" 
                    className="hidden" 
                    onChange={handleImageChange}
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                {/* Basic Info */}
                <div className="space-y-6">
                  <div className="space-y-1.5">
                    <label className="text-[10px] font-bold text-slate-400 uppercase tracking-widest ml-1">Location / Address</label>
                    <div className="relative">
                      <MapPin className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
                      <input
                        required
                        type="text"
                        className="w-full bg-slate-50 border border-slate-200 rounded-xl pl-12 pr-4 py-3 text-sm focus:ring-2 focus:ring-indigo-600/10 focus:border-indigo-600 outline-none transition-all font-medium"
                        value={formData.location}
                        onChange={(e) => setFormData({ ...formData, location: e.target.value })}
                      />
                    </div>
                  </div>

                  <div className="grid grid-cols-2 gap-4">
                    <div className="space-y-1.5">
                      <label className="text-[10px] font-bold text-slate-400 uppercase tracking-widest ml-1">Latitude</label>
                      <input
                        type="text"
                        placeholder="e.g. 12.9716"
                        className="w-full bg-slate-50 border border-slate-200 rounded-xl px-4 py-3 text-sm focus:ring-2 focus:ring-indigo-600/10 focus:border-indigo-600 outline-none transition-all font-medium"
                        value={formData.latitude || ''}
                        onChange={(e) => setFormData({ ...formData, latitude: e.target.value })}
                      />
                    </div>
                    <div className="space-y-1.5">
                      <label className="text-[10px] font-bold text-slate-400 uppercase tracking-widest ml-1">Longitude</label>
                      <input
                        type="text"
                        placeholder="e.g. 77.5946"
                        className="w-full bg-slate-50 border border-slate-200 rounded-xl px-4 py-3 text-sm focus:ring-2 focus:ring-indigo-600/10 focus:border-indigo-600 outline-none transition-all font-medium"
                        value={formData.longitude || ''}
                        onChange={(e) => setFormData({ ...formData, longitude: e.target.value })}
                      />
                    </div>
                  </div>

                  <div className="grid grid-cols-2 gap-4">
                    <div className="space-y-1.5">
                      <label className="text-[10px] font-bold text-slate-400 uppercase tracking-widest ml-1">Width (ft)</label>
                      <div className="relative">
                        <Ruler className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
                        <input
                          required
                          type="number"
                          className="w-full bg-slate-50 border border-slate-200 rounded-xl pl-12 pr-4 py-3 text-sm focus:ring-2 focus:ring-indigo-600/10 focus:border-indigo-600 outline-none transition-all font-medium"
                          value={formData.width}
                          onChange={(e) => setFormData({ ...formData, width: Number(e.target.value) })}
                        />
                      </div>
                    </div>
                    <div className="space-y-1.5">
                      <label className="text-[10px] font-bold text-slate-400 uppercase tracking-widest ml-1">Height (ft)</label>
                      <div className="relative">
                        <Ruler className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
                        <input
                          required
                          type="number"
                          className="w-full bg-slate-50 border border-slate-200 rounded-xl pl-12 pr-4 py-3 text-sm focus:ring-2 focus:ring-indigo-600/10 focus:border-indigo-600 outline-none transition-all font-medium"
                          value={formData.height}
                          onChange={(e) => setFormData({ ...formData, height: Number(e.target.value) })}
                        />
                      </div>
                    </div>
                  </div>

                  {!formData.is_owned && (
                    <div className="space-y-1.5">
                      <label className="text-[10px] font-bold text-slate-400 uppercase tracking-widest ml-1">Rent Amount (Monthly)</label>
                      <input
                        required
                        type="number"
                        className="w-full bg-slate-50 border border-slate-200 rounded-xl px-4 py-3 text-sm focus:ring-2 focus:ring-indigo-600/10 focus:border-indigo-600 outline-none transition-all font-medium"
                        value={formData.rent_amount}
                        onChange={(e) => setFormData({ ...formData, rent_amount: Number(e.target.value) })}
                      />
                    </div>
                  )}
                </div>

                {/* Owner & Rent Status */}
                <div className="space-y-6">
                  {/* Toggle Own Asset */}
                  <div className="flex items-center justify-between p-4 bg-slate-50 border border-slate-200 rounded-2xl mb-4">
                    <div>
                      <p className="text-xs font-bold text-slate-900">Own Hoarding Asset</p>
                      <p className="text-[10px] text-slate-400 font-bold uppercase tracking-widest mt-0.5">Agency-owned billboard</p>
                    </div>
                    <label className="relative inline-flex items-center cursor-pointer">
                      <input 
                        type="checkbox" 
                        checked={formData.is_owned || false} 
                        onChange={(e) => {
                          const checked = e.target.checked;
                          setFormData(prev => ({
                            ...prev,
                            is_owned: checked,
                            owner_name: checked ? 'SS Advertisers' : (prev.owner_name === 'SS Advertisers' ? '' : prev.owner_name),
                            rent_amount: checked ? 0 : prev.rent_amount,
                            rent_status: checked ? 'Paid' : prev.rent_status,
                            last_paid_date: checked ? '' : prev.last_paid_date,
                            next_due_date: checked ? '' : prev.next_due_date,
                            contact_number: checked ? 'N/A (Agency Owned)' : (prev.contact_number === 'N/A (Agency Owned)' ? '' : prev.contact_number),
                          }));
                        }}
                        className="sr-only peer"
                      />
                      <div className="w-11 h-6 bg-slate-200 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-slate-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-indigo-600"></div>
                    </label>
                  </div>

                  <div className="space-y-1.5">
                    <label className="text-[10px] font-bold text-slate-400 uppercase tracking-widest ml-1">Owner Name</label>
                    <div className="relative">
                      <User className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
                      <input
                        required
                        type="text"
                        disabled={formData.is_owned}
                        className={cn(
                          "w-full bg-slate-50 border border-slate-200 rounded-xl pl-12 pr-4 py-3 text-sm focus:ring-2 focus:ring-indigo-600/10 focus:border-indigo-600 outline-none transition-all font-medium",
                          formData.is_owned && "opacity-60 bg-slate-100 cursor-not-allowed"
                        )}
                        value={formData.owner_name}
                        onChange={(e) => setFormData({ ...formData, owner_name: e.target.value })}
                      />
                    </div>
                  </div>

                  <div className="space-y-1.5">
                    <label className="text-[10px] font-bold text-slate-400 uppercase tracking-widest ml-1">Contact Number</label>
                    <input
                      required={!formData.is_owned}
                      type="text"
                      disabled={formData.is_owned}
                      className={cn(
                        "w-full bg-slate-50 border border-slate-200 rounded-xl px-4 py-3 text-sm focus:ring-2 focus:ring-indigo-600/10 focus:border-indigo-600 outline-none transition-all font-medium",
                        formData.is_owned && "opacity-60 bg-slate-100 cursor-not-allowed"
                      )}
                      value={formData.contact_number}
                      onChange={(e) => setFormData({ ...formData, contact_number: e.target.value })}
                    />
                  </div>

                  {!formData.is_owned && (
                    <div className="space-y-1.5">
                      <label className="text-[10px] font-bold text-slate-400 uppercase tracking-widest ml-1">Rent Payment Status</label>
                      <div className="grid grid-cols-2 gap-2">
                         {rentStatusOptions.map(opt => (
                           <button 
                             key={opt}
                             type="button"
                             onClick={() => setFormData({ ...formData, rent_status: opt })}
                             className={cn(
                               "py-2 rounded-lg text-[9px] font-bold uppercase tracking-widest border transition-all",
                               formData.rent_status === opt 
                                 ? "bg-slate-900 text-white border-slate-900 shadow-sm shadow-slate-200" 
                                 : "text-slate-400 border-slate-200 hover:border-slate-300 hover:text-indigo-600"
                             )}
                           >
                             {opt}
                           </button>
                         ))}
                      </div>
                    </div>
                  )}
                </div>
              </div>

              {!formData.is_owned && (
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6 pb-2">
                  <div className="space-y-1.5">
                    <label className="text-[10px] font-bold text-slate-400 uppercase tracking-widest ml-1">Last Paid Date</label>
                    <CustomDatePicker
                      selected={formData.last_paid_date ? parseISO(formData.last_paid_date) : null}
                      onChange={(date) => setFormData({ ...formData, last_paid_date: date ? format(date, 'yyyy-MM-dd') : '' })}
                    />
                  </div>
                  <div className="space-y-1.5">
                    <label className="text-[10px] font-bold text-slate-400 uppercase tracking-widest ml-1">Next Due Date</label>
                    <CustomDatePicker
                      selected={formData.next_due_date ? parseISO(formData.next_due_date) : null}
                      onChange={(date) => setFormData({ ...formData, next_due_date: date ? format(date, 'yyyy-MM-dd') : '' })}
                    />
                  </div>
                </div>
              )}

              <div className="space-y-1.5 pt-2">
                <label className="text-[10px] font-bold text-slate-400 uppercase tracking-widest ml-1 flex items-center gap-2">
                  <FileText className="w-3.5 h-3.5" /> Additional Notes
                </label>
                <textarea
                  rows={3}
                  className="w-full bg-slate-50 border border-slate-200 rounded-xl px-4 py-3 text-sm focus:ring-2 focus:ring-indigo-600/10 focus:border-indigo-600 outline-none transition-all font-medium resize-none"
                  placeholder="Any extra details about the hoarding..."
                  value={formData.notes || ''}
                  onChange={(e) => setFormData({ ...formData, notes: e.target.value })}
                />
              </div>

              <div className="flex gap-4 pt-6 mt-4 border-t border-slate-100">
                {hoarding && onDelete && (
                  <button
                    type="button"
                    onClick={async () => {
                       if (onDelete) {
                         const success = await onDelete(hoarding.id);
                         if (success === true) onClose();
                       }
                    }}
                    className="p-4 bg-red-50 text-red-600 rounded-xl hover:bg-red-600 hover:text-white transition-all border border-red-100"
                    title="Delete Hoarding Site"
                  >
                    <Trash2 className="w-5 h-5" />
                  </button>
                )}
                <button
                  type="button"
                  onClick={onClose}
                  className="flex-1 py-4 bg-slate-100 text-slate-600 rounded-xl font-bold text-xs uppercase tracking-widest hover:bg-slate-200 transition-all"
                >
                  Discard
                </button>
                <button
                  type="submit"
                  className="flex-[2] py-4 bg-slate-900 text-white rounded-xl font-bold text-xs uppercase tracking-widest shadow-lg shadow-slate-200 hover:bg-slate-800 transition-all flex items-center justify-center gap-2"
                >
                  <Check className="w-4 h-4" /> Save Hoarding Details
                </button>
              </div>
            </form>
          </motion.div>
        </div>
      )}
    </AnimatePresence>
  );
}
