import { NavLink } from 'react-router-dom';
import { 
  LayoutDashboard, 
  Package, 
  Wallet, 
  Settings, 
  HelpCircle,
  BarChart3,
  Printer,
  Users,
  LogOut
} from 'lucide-react';
import { cn } from '../utils/cn';
import { useAuth } from '../context/AuthContext';

const navItems = [
  { icon: LayoutDashboard, label: 'Dashboard', path: '/' },
  { icon: Package, label: 'Inventory', path: '/inventory' },
  { icon: Users, label: 'Owners', path: '/owners' },
  { icon: Printer, label: 'Flex Printing', path: '/flex-printing' },
  { icon: BarChart3, label: 'Campaigns', path: '/campaigns' },
  { icon: Wallet, label: 'Ledger', path: '/ledger' },
];

const bottomItems = [
  { icon: Settings, label: 'Settings', path: '/settings' },
  { icon: HelpCircle, label: 'Help', path: '/help' },
];

export default function Sidebar() {
  const { signOut } = useAuth();

  const handleLogout = async () => {
    await signOut();
    window.location.href = '/auth';
  };

  return (
    <aside className="h-screen w-64 fixed left-0 top-0 bg-white border-r border-slate-200 flex flex-col z-50">
      <div className="h-20 flex items-center justify-start px-8 my-2">
        <img src="/logo.png" alt="SS Advertisers" className="h-14 w-auto object-contain" />
      </div>
      
      <div className="flex-1 flex flex-col px-4 gap-2 overflow-y-auto">
        <nav className="flex-1 space-y-1">
        {navItems.map((item) => (
          <NavLink
            key={item.path}
            to={item.path}
            end={item.path === '/'}
            className={({ isActive }) => cn(
              "flex items-center gap-3 px-4 py-3 rounded-xl transition-all duration-200 group text-sm font-medium",
              isActive 
                ? "bg-slate-900 text-white shadow-md shadow-slate-200" 
                : "text-slate-500 hover:bg-slate-50 hover:text-indigo-600"
            )}
          >
            <item.icon className={cn("w-5 h-5", "group-hover:scale-110 transition-transform")} />
            <span>{item.label}</span>
          </NavLink>
        ))}
      </nav>

      <div className="pt-4 border-t border-slate-100 space-y-1 mb-4">
        {bottomItems.map((item) => (
          <NavLink
            key={item.path}
            to={item.path}
            className={({ isActive }) => cn(
              "flex items-center gap-3 px-4 py-3 rounded-xl transition-all duration-200 group text-sm font-medium",
              isActive 
                ? "bg-slate-900 text-white shadow-md shadow-slate-200" 
                : "text-slate-500 hover:bg-slate-50 hover:text-indigo-600"
            )}
          >
            <item.icon className={cn("w-5 h-5", "group-hover:scale-110 transition-transform")} />
            <span>{item.label}</span>
          </NavLink>
        ))}

        <button
          onClick={handleLogout}
          className="w-full flex items-center gap-3 px-4 py-3 rounded-xl transition-all duration-200 text-red-600 hover:bg-red-50 text-sm font-medium group"
        >
          <LogOut className="w-5 h-5 group-hover:scale-110 transition-transform" />
          <span>Sign Out</span>
        </button>
      </div>
      </div>
    </aside>
  );
}
