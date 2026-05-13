import { NavLink } from 'react-router-dom';
import { 
  LayoutDashboard, 
  Package, 
  Info, 
  Wallet, 
  Settings, 
  HelpCircle,
  BarChart3
} from 'lucide-react';
import { cn } from '../utils/cn';

const navItems = [
  { icon: LayoutDashboard, label: 'Dashboard', path: '/' },
  { icon: Package, label: 'Inventory', path: '/inventory' },
  { icon: BarChart3, label: 'Campaigns', path: '/campaigns' },
  { icon: Wallet, label: 'Ledger', path: '/ledger' },
];

const bottomItems = [
  { icon: Settings, label: 'Settings', path: '/settings' },
  { icon: HelpCircle, label: 'Help', path: '/help' },
];

export default function Sidebar() {
  return (
    <aside className="h-screen w-64 fixed left-0 top-0 bg-white border-r border-slate-200 flex flex-col py-8 px-4 gap-2 z-50">
      <div className="mb-8 px-4">
        <div className="flex items-center gap-2 mb-1">
          <h1 className="text-[17px] font-bold text-slate-900 tracking-tight leading-none whitespace-nowrap">SS ADVERTISERS</h1>
        </div>
        <p className="text-[9px] font-bold text-slate-400 uppercase tracking-widest leading-none mt-2">Hoarding management</p>
      </div>
      
      <nav className="flex-1 space-y-1">
        {navItems.map((item) => (
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
      </nav>

      <div className="pt-4 border-t border-slate-100 space-y-1">
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
      </div>
    </aside>
  );
}
