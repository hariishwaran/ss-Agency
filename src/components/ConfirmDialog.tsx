import { AlertTriangle, X } from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { cn } from '../utils/cn';

interface ConfirmDialogProps {
  isOpen: boolean;
  title: string;
  message: string;
  confirmLabel?: string;
  cancelLabel?: string;
  onConfirm: () => void;
  onCancel: () => void;
  variant?: 'danger' | 'warning' | 'info' | 'success';
}

export default function ConfirmDialog({
  isOpen,
  title,
  message,
  confirmLabel = 'Confirm',
  cancelLabel = 'Cancel',
  onConfirm,
  onCancel,
  variant = 'danger'
}: ConfirmDialogProps) {
  if (!isOpen) return null;

  return (
    <AnimatePresence>
      <div className="fixed inset-0 z-[100] flex items-center justify-center p-4">
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          onClick={onCancel}
          className="absolute inset-0 bg-slate-900/40 backdrop-blur-sm"
        />
        <motion.div
          initial={{ opacity: 0, scale: 0.95, y: 20 }}
          animate={{ opacity: 1, scale: 1, y: 0 }}
          exit={{ opacity: 0, scale: 0.95, y: 20 }}
          className="relative bg-white rounded-3xl shadow-2xl w-full max-w-md overflow-hidden"
        >
          <div className="p-8">
            <div className="flex items-start justify-between mb-6">
              <div className={cn(
                "p-3 rounded-2xl",
                variant === 'danger' ? "bg-red-50 text-red-600" : 
                variant === 'warning' ? "bg-amber-50 text-amber-600" : 
                variant === 'success' ? "bg-emerald-50 text-emerald-600" :
                "bg-indigo-50 text-indigo-600"
              )}>
                <AlertTriangle className="w-6 h-6" />
              </div>
              <button 
                onClick={onCancel}
                className="p-2 text-slate-400 hover:text-slate-600 hover:bg-slate-100 rounded-xl transition-all"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <h3 className="text-xl font-bold text-slate-900 mb-2">{title}</h3>
            <p className="text-slate-500 leading-relaxed">{message}</p>
          </div>

          <div className="p-6 bg-slate-50 flex gap-3">
            {cancelLabel && (
              <button
                onClick={onCancel}
                className="flex-1 py-3 px-4 bg-white text-slate-600 rounded-xl font-bold text-sm border border-slate-200 hover:bg-slate-100 transition-all"
              >
                {cancelLabel}
              </button>
            )}
            <button
              onClick={() => {
                onConfirm();
                // If it's an alert (no cancel label), we might still want to close it, 
                // but the hooks handle closing by setting isOpen to false.
              }}
              className={cn(
                "flex-1 py-3 px-4 text-white rounded-xl font-bold text-sm shadow-lg transition-all",
                variant === 'danger' ? "bg-red-600 shadow-red-200 hover:bg-red-700" : 
                variant === 'warning' ? "bg-amber-500 shadow-amber-200 hover:bg-amber-600" : 
                variant === 'success' ? "bg-emerald-600 shadow-emerald-200 hover:bg-emerald-700" :
                "bg-slate-900 shadow-slate-200 hover:bg-slate-800"
              )}
            >
              {confirmLabel}
            </button>
          </div>
        </motion.div>
      </div>
    </AnimatePresence>
  );
}
