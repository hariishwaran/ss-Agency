import { createContext, useContext, useState, useEffect, useCallback, useRef } from 'react';
import { AppNotification } from '../types';
import { hoardingService } from '../services/hoardingService';
import { campaignService } from '../services/campaignService';

interface NotificationContextType {
  notifications: AppNotification[];
  unreadCount: number;
  markAsRead: (id: string) => void;
  markAllAsRead: () => void;
  refreshNotifications: () => Promise<void>;
}

const NotificationContext = createContext<NotificationContextType | undefined>(undefined);

export function NotificationProvider({ children }: { children: React.ReactNode }) {
  const [notifications, setNotifications] = useState<AppNotification[]>([]);

  const appStateRef = useRef<{ 
    hoardingStatus: Record<number, string>;
    campaignStatus: Record<number, string>;
    initialized: boolean;
    simulatedMessages: AppNotification[];
  }>({ hoardingStatus: {}, campaignStatus: {}, initialized: false, simulatedMessages: [] });

  const scanData = useCallback(async () => {
    try {
      const [hoardings, campaigns] = await Promise.all([
        hoardingService.getAll(),
        campaignService.getAll()
      ]);

      const baseNotifications: AppNotification[] = [];
      const now = new Date();
      
      const currentHoardingStatus: Record<number, string> = {};
      const currentCampaignStatus: Record<number, string> = {};
      const newSimulatedMessages: AppNotification[] = [];
      const prevAppState = appStateRef.current;

      // Helper to retrieve persistent creation date for notifications
      let createdDatesMap: Record<string, string> = {};
      try {
        const storedDates = localStorage.getItem('app_notifications_created_dates');
        if (storedDates) createdDatesMap = JSON.parse(storedDates);
      } catch (e) {}

      const getOrSetCreatedDate = (id: string, fallbackIso: string): string => {
        if (createdDatesMap[id]) {
          return createdDatesMap[id];
        }
        createdDatesMap[id] = fallbackIso;
        try {
          localStorage.setItem('app_notifications_created_dates', JSON.stringify(createdDatesMap));
        } catch (e) {}
        return fallbackIso;
      };

      // 1. Financial Reminders (Landlord/Owner Payouts)
      hoardings.forEach(h => {
        currentHoardingStatus[h.id] = h.rent_status;
        
        // Simulated trigger: Rent status changed to Paid
        if (prevAppState.initialized && 
            prevAppState.hoardingStatus[h.id] !== h.rent_status && 
            h.rent_status === 'Paid') {
            console.log(`[SIMULATED TRIGGER] WhatsApp/Email sent to Owner of Site #${h.id} (${h.location}) - Rent Status is now 'Paid'`);
            const simId = `sim-msg-hoarding-${h.id}-${now.getTime()}`;
            newSimulatedMessages.push({
              id: simId,
              type: 'financial',
              severity: 'green',
              title: 'Simulated Notification',
              message: `WhatsApp/Email simulated to Owner: Rent for ${h.location} marked as Paid.`,
              date: getOrSetCreatedDate(simId, now.toISOString()),
              read: false,
              action_link: `/details/${h.id}`
            });
        }

        // Regular notifications
        if (h.next_due_date) {
          const dueDate = new Date(h.next_due_date);
          const diffDays = Math.ceil((dueDate.getTime() - now.getTime()) / (1000 * 60 * 60 * 24));

          if (h.rent_status === 'Pending') {
            if (diffDays < 0) {
              const notifId = `fin-overdue-${h.id}`;
              const fallbackDate = new Date(dueDate.getTime()).toISOString();
              baseNotifications.push({
                id: notifId,
                type: 'financial',
                severity: 'red',
                title: 'Rent Overdue',
                message: `Payment for Site #${h.id} (${h.location} - ${h.width}x${h.height} ft) is overdue since ${h.next_due_date}.`,
                date: getOrSetCreatedDate(notifId, fallbackDate),
                read: false,
                action_link: `/details/${h.id}`
              });
            } else if (diffDays <= 7) {
              const notifId = `fin-upcoming-${h.id}`;
              const fallbackDate = new Date(now.getTime() - 2 * 3600000).toISOString();
              baseNotifications.push({
                id: notifId,
                type: 'financial',
                severity: 'yellow',
                title: 'Rent Due Soon',
                message: `Rent for Site #${h.id} (${h.location} - ${h.width}x${h.height} ft) is due in ${diffDays} days.`,
                date: getOrSetCreatedDate(notifId, fallbackDate),
                read: false,
                action_link: `/details/${h.id}`
              });
            }
          }
        }

      });

      // 2. Campaign Lifecycle
      campaigns.forEach(c => {
        const endDate = new Date(c.end_date);
        const startDate = new Date(c.start_date);
        const endDiffDays = Math.ceil((endDate.getTime() - now.getTime()) / (1000 * 60 * 60 * 24));
        const startDiffDays = Math.ceil((startDate.getTime() - now.getTime()) / (1000 * 60 * 60 * 24));

        let status = 'Upcoming';
        if (now >= startDate && now <= endDate) status = 'Active';
        else if (now > endDate) status = 'Completed';
        
        currentCampaignStatus[c.id] = status;

        // Simulated trigger: Campaign status changed
        if (prevAppState.initialized && 
            prevAppState.campaignStatus[c.id] && 
            prevAppState.campaignStatus[c.id] !== status) {
            console.log(`[SIMULATED TRIGGER] WhatsApp/Email sent to Client (${c.client_info}) - Campaign #${c.id} status changed to ${status}`);
            const simId = `sim-msg-campaign-${c.id}-${now.getTime()}`;
            newSimulatedMessages.push({
              id: simId,
              type: 'campaign',
              severity: 'green',
              title: 'Simulated Notification',
              message: `WhatsApp/Email simulated to Client: ${c.client_info} campaign is now ${status}.`,
              date: getOrSetCreatedDate(simId, now.toISOString()),
              action_link: `/campaigns`,
              read: false
            });
        }

        // Campaign Ended notification
        if (endDiffDays <= 0) {
          const notifId = `camp-ended-${c.id}`;
          const fallbackDate = endDate.getTime() < now.getTime() 
            ? endDate.toISOString() 
            : new Date(now.getTime() - 3 * 3600000).toISOString();

          baseNotifications.push({
            id: notifId,
            type: 'campaign',
            severity: 'red',
            title: 'Campaign Ended',
            message: `${c.client_info} campaign at Site #${c.hoarding_id} has ended (${c.end_date}). Dismantle vinyl & mark site available for sales.`,
            date: getOrSetCreatedDate(notifId, fallbackDate),
            action_link: `/campaigns`,
            read: false
          });
        } else if (endDiffDays > 0 && endDiffDays <= 14) {
          if (endDiffDays >= 7) {
            const notifId = `camp-renewal-alert-${c.id}`;
            const fallbackDate = new Date(now.getTime() - 5 * 3600000).toISOString();
            baseNotifications.push({
              id: notifId,
              type: 'campaign',
              severity: 'yellow',
              title: 'Sales Renewal Alert',
              message: `${c.client_info} campaign at Site #${c.hoarding_id} ends in ${endDiffDays} days. Alert Sales Team for renewal/new advertiser.`,
              date: getOrSetCreatedDate(notifId, fallbackDate),
              action_link: `/campaigns`,
              read: false
            });
          } else {
            const notifId = `camp-expire-${c.id}`;
            const fallbackDate = new Date(now.getTime() - 2 * 3600000).toISOString();
            baseNotifications.push({
              id: notifId,
              type: 'campaign',
              severity: 'red',
              title: 'Campaign Expiring Soon',
              message: `${c.client_info} campaign at Site #${c.hoarding_id} ends in ${endDiffDays} days.`,
              date: getOrSetCreatedDate(notifId, fallbackDate),
              action_link: `/campaigns`,
              read: false
            });
          }
        }

        if (startDiffDays >= -1 && startDiffDays <= 0) {
          const notifId = `camp-proof-${c.id}`;
          const fallbackDate = new Date(startDate.getTime()).toISOString();
          baseNotifications.push({
            id: notifId,
            type: 'operational',
            severity: 'red',
            title: 'Proof of Posting Required',
            message: `Upload launch day photo for ${c.client_info} at Site #${c.hoarding_id}.`,
            date: getOrSetCreatedDate(notifId, fallbackDate),
            read: false,
            action_link: `/campaigns`
          });
        }

        if (startDiffDays > 0 && startDiffDays <= 2) {
          const notifId = `camp-launch-${c.id}`;
          const fallbackDate = new Date(now.getTime() - 4 * 3600000).toISOString();
          baseNotifications.push({
            id: notifId,
            type: 'operational',
            severity: 'yellow',
            title: 'Launch Preparation',
            message: `Prepare vinyl for ${c.client_info} launching in ${startDiffDays} days.`,
            date: getOrSetCreatedDate(notifId, fallbackDate),
            read: false,
            action_link: `/inventory`
          });
        }
      });

      // Vacant Site Alert (Simplified)
      const occupiedHoardingIds = new Set(campaigns.filter(c => {
        const end = new Date(c.end_date);
        const start = new Date(c.start_date);
        return start <= now && end >= now;
      }).map(c => c.hoarding_id));

      hoardings.forEach(h => {
        if (!occupiedHoardingIds.has(h.id)) {
           const notifId = `camp-vacant-${h.id}`;
           // Stagger vacant site creation dates for realistic representation
           const fallbackDate = new Date(now.getTime() - (h.id * 7200000 + 3600000)).toISOString();
           baseNotifications.push({
            id: notifId,
            type: 'campaign',
            severity: 'yellow',
            title: 'Site Vacant',
            message: `Site #${h.id} (${h.location} - ${h.width}x${h.height} ft) is currently unlisted. Priority for sales.`,
            date: getOrSetCreatedDate(notifId, fallbackDate),
            read: false,
            action_link: `/inventory`
          });
        }
      });

      appStateRef.current = {
        hoardingStatus: currentHoardingStatus,
        campaignStatus: currentCampaignStatus,
        initialized: true,
        simulatedMessages: [...prevAppState.simulatedMessages, ...newSimulatedMessages]
      };

      const rawNotifications = [...baseNotifications, ...appStateRef.current.simulatedMessages];
      
      // Strict Deduplication by Notification ID
      const uniqueMap = new Map<string, AppNotification>();
      rawNotifications.forEach(n => {
        if (!uniqueMap.has(n.id)) {
          uniqueMap.set(n.id, n);
        }
      });
      const allGeneratedNotifications = Array.from(uniqueMap.values());

      setNotifications(prev => {
        let savedState: Record<string, boolean> = {};
        try {
          const stored = localStorage.getItem('app_notifications_read_state');
          if (stored) savedState = JSON.parse(stored);
        } catch (e) {}

        const readStatusMap = new Map(prev.map(n => [n.id, n.read]));
        return allGeneratedNotifications.map(n => ({
          ...n,
          read: savedState[n.id] !== undefined ? savedState[n.id] : (readStatusMap.has(n.id) ? readStatusMap.get(n.id)! : n.read)
        })).sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());
      });
    } catch (error) {
      console.error('Failed to scan for notifications:', error);
    }
  }, []);

  useEffect(() => {
    scanData();
    const interval = setInterval(scanData, 120000); // Check every 2 minutes
    return () => clearInterval(interval);
  }, [scanData]);

  useEffect(() => {
    try {
      const stored = localStorage.getItem('app_notifications_read_state');
      if (stored) {
        const parsed = JSON.parse(stored);
        setNotifications(prev => prev.map(n => ({
          ...n,
          read: parsed[n.id] ?? n.read
        })));
      }
    } catch (e) {
      console.error('Failed to load notification state', e);
    }
  }, []);

  const saveReadState = (notifications: AppNotification[]) => {
    const readState = notifications.reduce((acc, n) => {
      acc[n.id] = n.read;
      return acc;
    }, {} as Record<string, boolean>);
    localStorage.setItem('app_notifications_read_state', JSON.stringify(readState));
  };

  const markAsRead = (id: string) => {
    setNotifications(prev => {
      const next = prev.map(n => n.id === id ? { ...n, read: true } : n);
      saveReadState(next);
      return next;
    });
  };

  const markAllAsRead = () => {
    setNotifications(prev => {
      const next = prev.map(n => ({ ...n, read: true }));
      saveReadState(next);
      return next;
    });
  };

  const unreadCount = notifications.filter(n => !n.read).length;

  return (
    <NotificationContext.Provider value={{ notifications, unreadCount, markAsRead, markAllAsRead, refreshNotifications: scanData }}>
      {children}
    </NotificationContext.Provider>
  );
}

export function useNotifications() {
  const context = useContext(NotificationContext);
  if (context === undefined) {
    throw new Error('useNotifications must be used within a NotificationProvider');
  }
  return context;
}
