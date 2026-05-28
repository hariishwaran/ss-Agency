import { Bell, Search, User as UserIcon } from 'lucide-react';
import { useEffect } from 'react';
import { useNotifications } from '../context/NotificationContext';
import { useSearch } from '../context/SearchContext';
import { useAuth } from '../context/AuthContext';
import { useNavigate, useLocation } from 'react-router-dom';
import { cn } from '../utils/cn';

export default function TopBar() {
  const { unreadCount } = useNotifications();
  const { searchQuery, setSearchQuery } = useSearch();
  const { user } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();

  const fullName = user?.user_metadata?.full_name || user?.email?.split('@')[0] || 'User';
  const initials = fullName.charAt(0).toUpperCase();

  // Clear search query when changing routes
  useEffect(() => {
    setSearchQuery('');
  }, [location.pathname, setSearchQuery]);

  return (
    <header className="flex justify-between items-center h-20 px-10 bg-white sticky top-0 z-40 border-b border-slate-200 shadow-sm gap-8">
      <div className="flex-1 max-w-2xl">
        {location.pathname !== '/' && (
          <div className="relative">
            <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-slate-400" />
            <input 
              type="text" 
              placeholder="Search..." 
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full pl-12 pr-4 py-3 bg-slate-50 border-none rounded-2xl text-sm font-medium focus:ring-2 focus:ring-indigo-600/20 focus:bg-white transition-all outline-none"
            />
          </div>
        )}
      </div>

      <div className="flex items-center gap-6">
        <div className="flex items-center gap-2">
          <button 
            onClick={() => navigate('/notifications')}
            className={cn(
              "p-2.5 text-slate-500 hover:text-indigo-600 transition-colors rounded-full hover:bg-slate-50 relative",
              location.pathname === '/notifications' && "text-indigo-600 bg-indigo-50"
            )}
          >
            <Bell className="w-5 h-5" />
            {unreadCount > 0 && (
              <span className="absolute top-2 right-2 w-4 h-4 bg-red-600 text-white text-[8px] font-black flex items-center justify-center rounded-full border-2 border-white">
                {unreadCount}
              </span>
            )}
          </button>
        </div>
        
        <div className="flex items-center gap-4 pl-6 border-l border-slate-200">
          <div className="text-right hidden md:block">
            <p className="text-sm font-bold text-slate-900">{fullName}</p>
            <p className="text-[10px] text-slate-400 uppercase tracking-widest font-bold">
              {user?.user_metadata?.role || 'Site Admin'}
            </p>
          </div>
          <div className="w-10 h-10 rounded-full bg-slate-900 flex items-center justify-center text-white font-black text-sm border-2 border-slate-100 shadow-sm ring-1 ring-slate-200 hover:bg-slate-800 transition-colors cursor-pointer">
            {initials}
          </div>
        </div>
      </div>
    </header>
  );
}
