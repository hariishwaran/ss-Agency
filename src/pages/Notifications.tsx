import React, { useState } from 'react';
import { useNotifications } from '../context/NotificationContext';
import { useNavigate } from 'react-router-dom';
import { Check, CheckCircle2, TrendingUp, DollarSign, Image as ImageIcon, ChevronRight, Activity, MapPin, Eye, Clock } from 'lucide-react';
import { formatDistanceToNow } from 'date-fns';
import { cn } from '../utils/cn';
import { motion, AnimatePresence } from 'motion/react';
import { AppNotification } from '../types';

export default function Notifications() {
  const { notifications, markAsRead, markAllAsRead } = useNotifications();
  const [filter, setFilter] = useState<'all' | 'campaign' | 'operational' | 'financial'>('all');
  const navigate = useNavigate();

  const filteredNotifications = notifications.filter(
    (n) => filter === 'all' || n.type === filter
  );

  const renderIcon = (type: string) => {
    switch (type) {
      case 'financial':
        return <CheckCircle2 className="w-5 h-5 text-slate-500" strokeWidth={1.5} />;
      case 'operational':
        return <ImageIcon className="w-5 h-5 text-slate-500" strokeWidth={1.5} />;
      case 'campaign':
        return <TrendingUp className="w-5 h-5 text-slate-500" strokeWidth={1.5} />;
      default:
        return <Activity className="w-5 h-5 text-slate-500" strokeWidth={1.5} />;
    }
  };

  const getPrimaryActionText = (n: AppNotification) => {
    if (n.type === 'financial') return 'View Ledger';
    if (n.type === 'campaign') return 'Manage Campaign';
    if (n.type === 'operational') return 'View Site details';
    return 'View Details';
  };

  const getSecondaryActionText = (n: AppNotification) => {
    if (n.type === 'financial') return 'Download Invoice';
    if (n.type === 'campaign') return 'View Analytics';
    if (n.type === 'operational') return 'Contact Owner';
    return 'Dismiss';
  };

  return (
    <div className="max-w-[1000px] mx-auto w-full pb-24 mt-2">
      <div className="flex items-center text-xs text-slate-500 font-medium tracking-wide mb-6">
        <span>Account</span>
        <ChevronRight className="w-3.5 h-3.5 mx-2" />
        <span className="text-slate-900">Notifications</span>
      </div>

      <div className="flex flex-col md:flex-row md:items-end justify-between gap-6 mb-8">
        <h1 className="text-3xl font-bold tracking-tight text-slate-900">Notifications</h1>
        <button 
          onClick={markAllAsRead}
          className="flex items-center gap-2 text-sm font-semibold text-emerald-800 hover:text-emerald-900 transition-colors"
        >
          <Check className="w-4 h-4" strokeWidth={3} />
          Mark all as read
        </button>
      </div>

      <div className="flex gap-8 border-b border-slate-200 mb-6">
        {(['all', 'campaign', 'operational', 'financial'] as const).map((tab) => (
          <button
            key={tab}
            onClick={() => setFilter(tab)}
            className={cn(
              "text-sm font-semibold capitalize pb-3 transition-colors relative px-1",
              filter === tab ? "text-slate-900" : "text-slate-500 hover:text-slate-900"
            )}
          >
            {tab === 'operational' ? 'Inventory' : tab === 'financial' ? 'System' : tab}
            {filter === tab && (
              <motion.div 
                layoutId="active-tab" 
                className="absolute left-0 right-0 -bottom-[1px] h-[2px] bg-emerald-800"
              />
            )}
          </button>
        ))}
      </div>

      <div className="space-y-4">
        {filteredNotifications.length > 0 ? (
          <AnimatePresence mode="popLayout">
            {filteredNotifications.map((notification) => (
              <motion.div
                key={notification.id}
                layout
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, scale: 0.98 }}
                className={cn(
                  "bg-white p-6 rounded-2xl flex gap-6 items-start transition-all overflow-hidden",
                   notification.severity === 'red' ? "border-l-4 border-l-emerald-800 shadow-sm border border-slate-100" : "border border-slate-100 shadow-sm hover:shadow-md"
                )}
              >
                <div className="relative shrink-0">
                  <div className="w-12 h-12 rounded-xl bg-slate-50 border border-slate-100 flex items-center justify-center">
                    {renderIcon(notification.type)}
                  </div>
                  {!notification.read && (
                    <div className="absolute -top-1 -right-1 w-3 h-3 bg-emerald-600 rounded-full border-2 border-white" />
                  )}
                </div>

                <div className="flex-1 min-w-0">
                  <div className="flex justify-between items-start mb-1.5 gap-4">
                    <div className="flex items-center gap-3">
                       <h3 className="text-base font-bold text-slate-900">{notification.title}</h3>
                       {notification.severity === 'red' && (
                         <span className="px-2 py-0.5 rounded text-[10px] font-black uppercase tracking-widest bg-emerald-50 text-emerald-800">
                           Urgent
                         </span>
                       )}
                    </div>
                    <span className="text-xs font-medium text-slate-400 whitespace-nowrap shrink-0">
                      {formatDistanceToNow(new Date(notification.date), { addSuffix: true })}
                    </span>
                  </div>
                  
                  <p className="text-sm text-slate-600 leading-relaxed max-w-3xl mb-4">
                    {notification.message}
                  </p>

                  <div className="flex items-center gap-3">
                    {notification.action_link && (
                      <button 
                        onClick={() => {
                          markAsRead(notification.id);
                          navigate(notification.action_link!);
                        }}
                        className="px-4 py-2 bg-slate-800 hover:bg-slate-900 text-white text-sm font-semibold rounded-lg transition-colors"
                      >
                        {getPrimaryActionText(notification)}
                      </button>
                    )}
                    <button 
                      onClick={() => markAsRead(notification.id)}
                      className="px-4 py-2 bg-transparent hover:bg-slate-50 text-slate-700 text-sm font-semibold rounded-lg transition-colors border border-transparent hover:border-slate-200"
                    >
                      {getSecondaryActionText(notification)}
                    </button>
                  </div>
                </div>
              </motion.div>
            ))}
          </AnimatePresence>
        ) : (
          <motion.div 
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            className="py-32 text-center"
          >
             <div className="inline-flex items-center justify-center w-16 h-16 rounded-full bg-slate-50 mb-6">
                <CheckCircle2 className="w-8 h-8 text-slate-300" strokeWidth={1.5} />
             </div>
             <h3 className="text-lg font-bold text-slate-900 mb-2">You're all caught up</h3>
             <p className="text-slate-500">No new notifications in this category.</p>
          </motion.div>
        )}
      </div>
    </div>
  );
}
