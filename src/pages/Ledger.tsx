import { Download, Wallet, Banknote, Plus, Trash2, ExternalLink, Loader2, Smartphone, Landmark, Receipt, CreditCard, Coins } from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { useNavigate } from 'react-router-dom';
import { useState, useEffect } from 'react';
import { CustomDatePicker } from '../components/ui/DatePicker';
import { format, parseISO } from 'date-fns';
import { cn } from '../utils/cn';
import { LedgerEntry, Hoarding, Campaign } from '../types';
import ConfirmDialog from '../components/ConfirmDialog';
import { useConfirm } from '../hooks/useConfirm';
import { useAlert } from '../hooks/useAlert';
import { ledgerService } from '../services/ledgerService';
import { hoardingService } from '../services/hoardingService';
import { campaignService } from '../services/campaignService';
import { useSearch } from '../context/SearchContext';

const getMethodIcon = (method: string) => {
  switch (method) {
    case 'UPI': return <Smartphone className="w-3.5 h-3.5" />;
    case 'Bank Transfer': return <Landmark className="w-3.5 h-3.5" />;
    case 'Cash': return <Coins className="w-3.5 h-3.5" />;
    case 'Cheque': return <Receipt className="w-3.5 h-3.5" />;
    default: return <CreditCard className="w-3.5 h-3.5" />;
  }
};

export default function Ledger() {
  const navigate = useNavigate();
  const [entries, setEntries] = useState<LedgerEntry[]>([]);
  const [hoardings, setHoardings] = useState<Record<number, Hoarding>>({});
  const [campaigns, setCampaigns] = useState<Record<number, Campaign>>({});
  const [isLoading, setIsLoading] = useState(true);
  const { searchQuery } = useSearch();
  const { confirm, confirmProps } = useConfirm();
  const { alert: showAlert, alertProps } = useAlert();
  const [isAdding, setIsAdding] = useState(false);
  const [deletingId, setDeletingId] = useState<string | null>(null);
  const [newEntry, setNewEntry] = useState<Omit<LedgerEntry, 'id' | 'created_at'>>({
    hoarding_id: 0,
    campaign_id: undefined,
    po_id: undefined,
    amount_paid: 0,
    payment_date: new Date().toISOString().split('T')[0],
    period_covered: '',
    payment_method: 'UPI',
    receipt_url: null,
    transaction_type: 'other',
    reference_number: undefined,
  });

  useEffect(() => {
    fetchData();
  }, []);

  const fetchData = async () => {
    try {
      setIsLoading(true);
      const [ledgerData, hoardingData, campaignData] = await Promise.all([
        ledgerService.getAll(),
        hoardingService.getAll(),
        campaignService.getAll()
      ]);
      
      setEntries(ledgerData);
      
      const hoardingMap: Record<number, Hoarding> = {};
      hoardingData.forEach(h => {
        hoardingMap[h.id] = h;
      });
      setHoardings(hoardingMap);

      const campaignMap: Record<number, Campaign> = {};
      campaignData.forEach(c => {
        campaignMap[c.id] = c;
      });
      setCampaigns(campaignMap);
      
      if (hoardingData.length > 0 && newEntry.hoarding_id === 0) {
        setNewEntry(prev => ({ ...prev, hoarding_id: hoardingData[0].id }));
      }
    } catch (error) {
      console.error('Error fetching ledger data:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const handleAddEntry = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      await ledgerService.create(newEntry);
      setIsAdding(false);
      fetchData();
      setNewEntry({
        hoarding_id: (Object.values(hoardings) as Hoarding[])[0]?.id || 0,
        campaign_id: undefined,
        po_id: undefined,
        amount_paid: 0,
        payment_date: new Date().toISOString().split('T')[0],
        period_covered: '',
        payment_method: 'UPI',
        receipt_url: null,
        transaction_type: 'other',
        reference_number: undefined,
      });
    } catch (error: any) {
      console.error('Error adding entry:', error);
      if (error.code === '42501') {
        showAlert({
          title: 'Permission Denied',
          message: 'You need to add an RLS policy in Supabase for the "ledger" table.',
          variant: 'danger'
        });
      } else {
        showAlert({
          title: 'Entry Failed',
          message: error.message || 'Unknown error',
          variant: 'danger'
        });
      }
    }
  };

  const handleDelete = async (id: string) => {
    const isConfirmed = await confirm({
      title: 'Delete Ledger Entry',
      message: 'Are You Sure You Want To Delete This Payment Record?',
      variant: 'danger'
    });

    if (isConfirmed) {
      try {
        setDeletingId(id);
        await ledgerService.delete(id);
        await fetchData();
        return true;
      } catch (error: any) {
        console.error('Error deleting entry:', error);
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

  const filteredEntries = entries.filter(entry => {
    const site = hoardings[entry.hoarding_id]?.location || '';
    const campaignName = entry.campaign_id ? campaigns[entry.campaign_id]?.client_info || '' : '';
    return site.toLowerCase().includes(searchQuery.toLowerCase()) || 
           entry.period_covered.toLowerCase().includes(searchQuery.toLowerCase()) ||
           entry.payment_method.toLowerCase().includes(searchQuery.toLowerCase()) ||
           entry.transaction_type.toLowerCase().includes(searchQuery.toLowerCase()) ||
           campaignName.toLowerCase().includes(searchQuery.toLowerCase());
  });

  const totalCollected = entries.reduce((sum, entry) => sum + entry.amount_paid, 0);

  return (
    <div className="space-y-12 pb-20">
      <section className="grid grid-cols-1 md:grid-cols-3 gap-6">
        {[
          { label: 'Total Revenue', value: `₹ ${totalCollected.toLocaleString('en-IN')}`, color: 'bg-slate-900', icon: Banknote },
          { label: 'Transaction Count', value: entries.length.toString(), color: 'bg-white', icon: Receipt },
          { label: 'Avg Payment', value: `₹ ${(entries.length > 0 ? Math.round(totalCollected / entries.length) : 0).toLocaleString('en-IN')}`, color: 'bg-white', icon: Wallet },
        ].map((summary, i) => (
          <motion.div 
            key={summary.label}
            initial={{ opacity: 0, x: -20 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ delay: i * 0.1 }}
            className={cn(
              "p-8 rounded-3xl border transition-all duration-300 relative overflow-hidden group",
              i === 0 ? "text-white border-slate-800 shadow-xl shadow-slate-200" : 
              "bg-white border-slate-200 text-slate-900 shadow-sm",
              summary.color
            )}
          >
            <summary.icon className={cn(
              "absolute -right-4 -bottom-4 w-32 h-32 opacity-[0.03] transition-transform group-hover:scale-110",
              i === 0 ? "text-white opacity-[0.08]" : "text-slate-900"
            )} />
            <p className={cn(
              "text-[10px] font-black uppercase tracking-widest mb-4",
              i === 0 ? "text-slate-400" : "text-slate-400"
            )}>{summary.label}</p>
            <h3 className="text-4xl font-black tracking-tight">{summary.value}</h3>
          </motion.div>
        ))}
      </section>

      <div className="bg-white rounded-[40px] shadow-sm border border-slate-200 overflow-hidden">
        <div className="p-8 border-b border-slate-100 flex flex-col md:flex-row md:items-center justify-end gap-6">
          <div className="flex gap-3">
             <button className="px-6 py-3 bg-slate-50 rounded-xl text-slate-500 font-bold text-[10px] uppercase tracking-widest flex items-center gap-2 border border-slate-200 hover:bg-slate-100 transition-colors">
               <Download className="w-4 h-4" /> Export CSV
             </button>
             <button 
               onClick={() => setIsAdding(true)}
               className="px-6 py-3 bg-slate-900 text-white rounded-xl font-bold text-[10px] uppercase tracking-widest shadow-lg shadow-slate-200 hover:bg-slate-800 transition-all flex items-center gap-2 group whitespace-nowrap"
             >
               <Plus className="w-4 h-4 group-hover:rotate-90 transition-transform" />
               Post Payment
             </button>
          </div>
        </div>

        {isLoading ? (
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="bg-slate-50/50">
                  <th className="px-8 py-5 text-[10px] font-black text-slate-400 uppercase tracking-widest">Payment ID</th>
                  <th className="px-8 py-5 text-[10px] font-black text-slate-400 uppercase tracking-widest">Hoarding Unit</th>
                  <th className="px-8 py-5 text-[10px] font-black text-slate-400 uppercase tracking-widest">Campaign</th>
                  <th className="px-8 py-5 text-[10px] font-black text-slate-400 uppercase tracking-widest">Amount Paid</th>
                  <th className="px-8 py-5 text-[10px] font-black text-slate-400 uppercase tracking-widest">Date</th>
                  <th className="px-8 py-5 text-[10px] font-black text-slate-400 uppercase tracking-widest">Period</th>
                  <th className="px-8 py-5 text-[10px] font-black text-slate-400 uppercase tracking-widest">Type</th>
                  <th className="px-8 py-5 text-[10px] font-black text-slate-400 uppercase tracking-widest">Method</th>
                  <th className="px-8 py-5 text-[10px] font-black text-slate-400 uppercase tracking-widest text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100/80">
                {Array.from({ length: 5 }).map((_, i) => (
                  <tr key={i} className="hover:bg-slate-50/50 transition-colors">
                    <td className="px-8 py-5">
                      <div className="w-20 h-4 bg-slate-100 rounded animate-pulse"></div>
                    </td>
                    <td className="px-8 py-5">
                      <div className="flex items-center gap-3">
                        <div className="w-8 h-8 rounded-lg bg-slate-100 animate-pulse"></div>
                        <div className="w-32 h-4 bg-slate-100 rounded animate-pulse"></div>
                      </div>
                    </td>
                    <td className="px-8 py-5">
                      <div className="w-24 h-5 bg-slate-100 rounded animate-pulse"></div>
                    </td>
                    <td className="px-8 py-5">
                      <div className="w-20 h-4 bg-slate-100 rounded animate-pulse"></div>
                    </td>
                    <td className="px-8 py-5">
                      <div className="w-24 h-4 bg-slate-100 rounded animate-pulse"></div>
                    </td>
                    <td className="px-8 py-5">
                      <div className="w-20 h-6 bg-slate-100 rounded-lg animate-pulse"></div>
                    </td>
                    <td className="px-8 py-5 text-right flex justify-end gap-2">
                       <div className="w-8 h-8 bg-slate-100 rounded-lg animate-pulse"></div>
                       <div className="w-8 h-8 bg-slate-100 rounded-lg animate-pulse"></div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        ) : filteredEntries.length > 0 ? (
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="bg-slate-50/50">
                  <th className="px-8 py-5 text-[10px] font-black text-slate-400 uppercase tracking-widest">Payment ID</th>
                  <th className="px-8 py-5 text-[10px] font-black text-slate-400 uppercase tracking-widest">Hoarding Unit</th>
                  <th className="px-8 py-5 text-[10px] font-black text-slate-400 uppercase tracking-widest">Campaign</th>
                  <th className="px-8 py-5 text-[10px] font-black text-slate-400 uppercase tracking-widest">Amount Paid</th>
                  <th className="px-8 py-5 text-[10px] font-black text-slate-400 uppercase tracking-widest">Date</th>
                  <th className="px-8 py-5 text-[10px] font-black text-slate-400 uppercase tracking-widest">Period</th>
                  <th className="px-8 py-5 text-[10px] font-black text-slate-400 uppercase tracking-widest">Type</th>
                  <th className="px-8 py-5 text-[10px] font-black text-slate-400 uppercase tracking-widest">Method</th>
                  <th className="px-8 py-5 text-[10px] font-black text-slate-400 uppercase tracking-widest text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {filteredEntries.map((entry) => (
                  <tr key={entry.id} className="hover:bg-slate-50/80 transition-colors group">
                    <td className="px-8 py-6">
                      <p className="text-[10px] font-mono text-slate-400 truncate w-24" title={entry.id}>
                        {entry.id.split('-')[0]}...
                      </p>
                    </td>
                    <td className="px-8 py-6">
                      <div 
                        onClick={() => navigate(`/details/${entry.hoarding_id}`)}
                        className="cursor-pointer group/site"
                      >
                        <p className="text-sm font-bold text-slate-900 group-hover/site:text-indigo-600 transition-colors">
                          {hoardings[entry.hoarding_id]?.location || 'Loading...'}
                        </p>
                        <p className="text-[9px] font-bold text-slate-400 uppercase tracking-widest">REF: #{entry.hoarding_id}</p>
                      </div>
                    </td>
                    <td className="px-8 py-6">
                      {entry.campaign_id ? (
                        <div onClick={() => navigate(`/campaigns/${entry.campaign_id}`)} className="cursor-pointer group/campaign">
                          <p className="text-xs font-bold text-slate-900 group-hover/campaign:text-indigo-600 transition-colors truncate max-w-[140px]">
                            {campaigns[entry.campaign_id]?.client_info || 'Loading...'}
                          </p>
                          <p className="text-[9px] font-bold text-slate-400 uppercase tracking-widest">Campaign #{entry.campaign_id}</p>
                        </div>
                      ) : (
                        <p className="text-xs font-bold text-slate-400">—</p>
                      )}
                    </td>
                    <td className="px-8 py-6">
                      <p className="text-lg font-black text-slate-900">₹ {entry.amount_paid.toLocaleString('en-IN')}</p>
                    </td>
                    <td className="px-8 py-6">
                      <p className="text-xs font-bold text-slate-500">{format(parseISO(entry.payment_date), 'dd/MM/yyyy')}</p>
                    </td>
                    <td className="px-8 py-6">
                      <span className="px-3 py-1 rounded-lg text-[9px] font-black uppercase tracking-widest bg-slate-50 text-slate-600 border border-slate-100">
                        {entry.period_covered}
                      </span>
                    </td>
                    <td className="px-8 py-6">
                      <span className={cn("px-2 py-1 rounded text-[9px] font-black uppercase tracking-widest border", entry.transaction_type === 'po_payment' ? "bg-indigo-50 text-indigo-700 border-indigo-100" : entry.transaction_type === 'rent' ? "bg-amber-50 text-amber-700 border-amber-100" : "bg-slate-50 text-slate-600 border-slate-100")}>
                        {entry.transaction_type === 'po_payment' ? 'PO Payment' : entry.transaction_type}
                      </span>
                    </td>
                    <td className="px-8 py-6">
                      <div className="flex items-center gap-2 text-slate-400 group/method transition-colors">
                        <div className="w-7 h-7 rounded-lg bg-slate-50 border border-slate-100 flex items-center justify-center group-hover/method:text-indigo-600 group-hover/method:bg-white transition-all">
                          {getMethodIcon(entry.payment_method)}
                        </div>
                        <p className="text-[10px] font-bold uppercase tracking-widest">{entry.payment_method}</p>
                      </div>
                    </td>
                    <td className="px-8 py-6 text-right">
                      <div className="flex items-center justify-end gap-2">
                        {entry.receipt_url && (
                          <a 
                            href={entry.receipt_url} 
                            target="_blank" 
                            rel="noopener noreferrer"
                            className="p-2 text-slate-400 hover:text-indigo-600 hover:bg-white rounded-lg transition-all shadow-sm border border-transparent hover:border-slate-200"
                          >
                            <ExternalLink className="w-4 h-4" />
                          </a>
                        )}
                        <button 
                          onClick={() => {
                            if (deletingId === entry.id) return;
                            handleDelete(entry.id);
                          }}
                          disabled={deletingId === entry.id}
                          className={cn(
                            "p-2 text-slate-300 hover:text-red-500 transition-colors",
                            deletingId === entry.id && "text-red-500 opacity-50"
                          )}
                        >
                          {deletingId === entry.id ? (
                            <Loader2 className="w-4 h-4 animate-spin" />
                          ) : (
                            <Trash2 className="w-4 h-4" />
                          )}
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        ) : (
          <div className="py-32 flex flex-col items-center justify-center text-center px-6">
            <div className="w-20 h-20 bg-slate-50 rounded-full flex items-center justify-center text-slate-300 mb-6 font-light">
              <Banknote className="w-10 h-10" />
            </div>
            <h3 className="text-2xl font-bold text-slate-900 mb-2">No Transactions Logged</h3>
            <p className="text-slate-500 max-w-sm mb-8 font-medium">Your financial vault is currently empty. Start posting payments to track capital flow.</p>
            <button 
              onClick={() => setIsAdding(true)}
              className="px-8 py-4 bg-slate-900 text-white rounded-2xl font-bold text-xs uppercase tracking-widest shadow-xl shadow-slate-100 hover:bg-slate-800 transition-all"
            >
              Post First Payment
            </button>
          </div>
        )}
      </div>

      <AnimatePresence>
        {isAdding && (
          <div className="fixed inset-0 z-[100] flex items-center justify-center p-4">
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => setIsAdding(false)}
              className="absolute inset-0 bg-slate-900/60 backdrop-blur-sm"
            />
            
            <motion.div
              initial={{ opacity: 0, scale: 0.95, y: 20 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.95, y: 20 }}
              className="relative w-full max-w-lg bg-white rounded-[40px] shadow-2xl overflow-hidden border border-slate-200"
            >
              <div className="p-8 pb-4">
                <h3 className="text-3xl font-black text-slate-900 tracking-tight">Post Payment</h3>
                <p className="text-sm text-slate-500 font-medium">Record a new financial transaction into the primary ledger.</p>
              </div>

              <form onSubmit={handleAddEntry} className="p-8 space-y-6">
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Select Site</label>
                    <select 
                      required
                      className="w-full bg-slate-50 border border-slate-200 rounded-2xl px-4 py-3 text-sm focus:ring-4 focus:ring-indigo-600/5 outline-none font-bold"
                      value={newEntry.hoarding_id}
                      onChange={(e) => setNewEntry({...newEntry, hoarding_id: parseInt(e.target.value)})}
                    >
                      {(Object.values(hoardings) as Hoarding[]).map(h => (
                        <option key={h.id} value={h.id}>{h.location}</option>
                      ))}
                    </select>
                  </div>
                  <div className="space-y-2">
                    <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Amount (₹)</label>
                    <input 
                      type="number"
                      required
                      className="w-full bg-slate-50 border border-slate-200 rounded-2xl px-4 py-3 text-sm focus:ring-4 focus:ring-indigo-600/5 outline-none font-bold"
                      value={newEntry.amount_paid}
                      onChange={(e) => setNewEntry({...newEntry, amount_paid: parseFloat(e.target.value)})}
                    />
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Transaction Type</label>
                    <select 
                      className="w-full bg-slate-50 border border-slate-200 rounded-2xl px-4 py-3 text-sm focus:ring-4 focus:ring-indigo-600/5 outline-none font-bold"
                      value={newEntry.transaction_type}
                      onChange={(e) => setNewEntry({...newEntry, transaction_type: e.target.value as any})}
                    >
                      <option value="other">Other</option>
                      <option value="rent">Rent</option>
                      <option value="po_payment">PO Payment</option>
                    </select>
                  </div>
                  <div className="space-y-2">
                    <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Linked Campaign</label>
                    <select 
                      className="w-full bg-slate-50 border border-slate-200 rounded-2xl px-4 py-3 text-sm focus:ring-4 focus:ring-indigo-600/5 outline-none font-bold"
                      value={newEntry.campaign_id || ''}
                      onChange={(e) => setNewEntry({...newEntry, campaign_id: e.target.value ? parseInt(e.target.value) : undefined})}
                    >
                      <option value="">None</option>
                      {Object.values(campaigns).map(c => (
                        <option key={c.id} value={c.id}>{c.client_info}</option>
                      ))}
                    </select>
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Payment Date</label>
                    <CustomDatePicker
                      selected={newEntry.payment_date ? parseISO(newEntry.payment_date) : null}
                      onChange={(date) => setNewEntry({...newEntry, payment_date: date ? format(date, 'yyyy-MM-dd') : ''})}
                    />
                  </div>
                  <div className="space-y-2">
                    <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Period (e.g. Q3 2024)</label>
                    <input 
                      type="text"
                      required
                      placeholder="June 2026"
                      className="w-full bg-slate-50 border border-slate-200 rounded-2xl px-4 py-3 text-sm focus:ring-4 focus:ring-indigo-600/5 outline-none font-bold"
                      value={newEntry.period_covered}
                      onChange={(e) => setNewEntry({...newEntry, period_covered: e.target.value})}
                    />
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Method</label>
                    <select 
                      required
                      className="w-full bg-slate-50 border border-slate-200 rounded-2xl px-4 py-3 text-sm focus:ring-4 focus:ring-indigo-600/5 outline-none font-bold"
                      value={newEntry.payment_method}
                      onChange={(e) => setNewEntry({...newEntry, payment_method: e.target.value as any})}
                    >
                      <option value="UPI">UPI</option>
                      <option value="Bank Transfer">Bank Transfer</option>
                      <option value="Cash">Cash</option>
                      <option value="Cheque">Cheque</option>
                      <option value="Other">Other</option>
                    </select>
                  </div>
                  <div className="space-y-2">
                    <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Receipt Link (URL)</label>
                    <input 
                      type="url"
                      placeholder="https://..."
                      className="w-full bg-slate-50 border border-slate-200 rounded-2xl px-4 py-3 text-sm focus:ring-4 focus:ring-indigo-600/5 outline-none font-bold"
                      value={newEntry.receipt_url || ''}
                      onChange={(e) => setNewEntry({...newEntry, receipt_url: e.target.value || null})}
                    />
                  </div>
                  <div className="space-y-2">
                    <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Ref Number</label>
                    <input 
                      type="text"
                      placeholder="UTR / Invoice #"
                      className="w-full bg-slate-50 border border-slate-200 rounded-2xl px-4 py-3 text-sm focus:ring-4 focus:ring-indigo-600/5 outline-none font-bold"
                      value={newEntry.reference_number || ''}
                      onChange={(e) => setNewEntry({...newEntry, reference_number: e.target.value || undefined})}
                    />
                  </div>
                </div>

                <div className="pt-6 flex gap-4">
                  <button
                    type="button"
                    onClick={() => setIsAdding(false)}
                    className="flex-1 py-4 bg-slate-100 text-slate-600 rounded-2xl font-bold text-xs uppercase tracking-widest hover:bg-slate-200 transition-all"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    className="flex-1 py-4 bg-slate-900 text-white rounded-2xl font-bold text-xs uppercase tracking-widest shadow-xl shadow-slate-200 hover:bg-slate-800 transition-all"
                  >
                    Confirm Payment
                  </button>
                </div>
              </form>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      <ConfirmDialog {...confirmProps} />
      <ConfirmDialog {...alertProps} />
    </div>
  );
}
