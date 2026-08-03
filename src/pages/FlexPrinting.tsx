import { Printer, Plus, Truck, Building2, MapPin } from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { useState, useEffect, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { flexPrintingService } from '../services/flexPrintingService';
import { hoardingService } from '../services/hoardingService';
import { FlexPrinting, Hoarding } from '../types';
import { cn } from '../utils/cn';
import { useSearch } from '../context/SearchContext';
import { useConfirm } from '../hooks/useConfirm';
import { useAlert } from '../hooks/useAlert';
import ConfirmDialog from '../components/ConfirmDialog';

const statusColors: Record<string, string> = {
  pending: 'bg-amber-100 text-amber-700',
  in_progress: 'bg-blue-100 text-blue-700',
  completed: 'bg-emerald-100 text-emerald-700',
  cancelled: 'bg-slate-100 text-slate-500',
};

const typeColors: Record<string, string> = {
  outsource: 'bg-purple-100 text-purple-700',
  own_printing: 'bg-cyan-100 text-cyan-700',
};

const typeLabels: Record<string, string> = {
  outsource: 'Outsource',
  own_printing: 'Own Printing',
};

const statusLabels: Record<string, string> = {
  pending: 'Pending',
  in_progress: 'In Progress',
  completed: 'Completed',
  cancelled: 'Cancelled',
};

interface FormData {
  hoarding_id?: string;
  printing_type: 'outsource' | 'own_printing';
  flex_size: string;
  quantity: number;
  notes: string;
  status: string;
  vendor_name: string;
  vendor_contact: string;
  assignment_date: string;
  expected_completion: string;
  outsource_status: string;
  outsource_cost: string;
  material_cost: string;
  labor_cost: string;
  payment_status: string;
}

const emptyForm: FormData = {
  hoarding_id: '',
  printing_type: 'outsource',
  flex_size: '',
  quantity: 1,
  notes: '',
  status: 'pending',
  vendor_name: '',
  vendor_contact: '',
  assignment_date: '',
  expected_completion: '',
  outsource_status: 'assigned',
  outsource_cost: '',
  material_cost: '',
  labor_cost: '',
  payment_status: 'pending',
};

export default function FlexPrintingPage() {
  const navigate = useNavigate();
  const { searchQuery } = useSearch();
  const { confirm, confirmProps } = useConfirm();
  const { alert: showAlert, alertProps } = useAlert();

  const [isLoading, setIsLoading] = useState(true);
  const [items, setItems] = useState<FlexPrinting[]>([]);
  const [hoardings, setHoardings] = useState<Hoarding[]>([]);
  const [selectedHoardingFilter, setSelectedHoardingFilter] = useState<string>('all');
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingItem, setEditingItem] = useState<FlexPrinting | null>(null);
  const [deletingId, setDeletingId] = useState<number | null>(null);
  const [saving, setSaving] = useState(false);
  const [form, setForm] = useState<FormData>(emptyForm);
  const [filterType, setFilterType] = useState<string>('all');

  useEffect(() => {
    fetchData();
  }, []);

  const fetchData = async () => {
    try {
      setIsLoading(true);
      const [data, hoardingList] = await Promise.all([
        flexPrintingService.getAll(),
        hoardingService.getAll(),
      ]);
      setItems(data);
      setHoardings(hoardingList);
    } catch (error) {
      console.error('Error fetching flex printing records:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const hoardingMap = useMemo(() => {
    const map: Record<number, Hoarding> = {};
    hoardings.forEach(h => { map[h.id] = h; });
    return map;
  }, [hoardings]);

  const openCreate = () => {
    setEditingItem(null);
    setForm(emptyForm);
    setIsModalOpen(true);
  };

  const openEdit = (item: FlexPrinting) => {
    setEditingItem(item);
    setForm({
      hoarding_id: item.hoarding_id ? item.hoarding_id.toString() : '',
      printing_type: item.printing_type,
      flex_size: item.flex_size || '',
      quantity: item.quantity,
      notes: item.notes || '',
      status: item.status,
      vendor_name: item.vendor_name || '',
      vendor_contact: item.vendor_contact || '',
      assignment_date: item.assignment_date || '',
      expected_completion: item.expected_completion || '',
      outsource_status: item.outsource_status || 'assigned',
      outsource_cost: item.outsource_cost?.toString() || '',
      material_cost: item.material_cost?.toString() || '',
      labor_cost: item.labor_cost?.toString() || '',
      payment_status: item.payment_status || 'pending',
    });
    setIsModalOpen(true);
  };

  const handleDelete = async (id: number) => {
    const isConfirmed = await confirm({
      title: 'Delete Flex Printing Record',
      message: 'Are you sure you want to delete this record? This action cannot be undone.',
      variant: 'danger',
    });
    if (isConfirmed) {
      try {
        setDeletingId(id);
        await flexPrintingService.delete(id);
        await fetchData();
      } catch (error: any) {
        await showAlert({
          title: 'Deletion Failed',
          message: error.message,
          variant: 'danger',
        });
      } finally {
        setDeletingId(null);
      }
    }
  };

  const handleSelectHoarding = (hIdStr: string) => {
    const hId = parseInt(hIdStr, 10);
    const targetHoarding = hoardings.find(h => h.id === hId);
    setForm(prev => ({
      ...prev,
      hoarding_id: hIdStr,
      flex_size: targetHoarding ? `${targetHoarding.width}x${targetHoarding.height} ft` : prev.flex_size
    }));
  };

  const handleSubmit = async () => {
    if (!form.flex_size) {
      await showAlert({ title: 'Validation Error', message: 'Flex size is required.', variant: 'danger' });
      return;
    }

    try {
      setSaving(true);
      const payload: any = {
        hoarding_id: form.hoarding_id ? parseInt(form.hoarding_id, 10) : null,
        printing_type: form.printing_type,
        flex_size: form.flex_size,
        quantity: form.quantity,
        notes: form.notes || null,
        status: form.status,
      };

      if (form.printing_type === 'outsource') {
        payload.vendor_name = form.vendor_name || null;
        payload.vendor_contact = form.vendor_contact || null;
        payload.assignment_date = form.assignment_date || null;
        payload.expected_completion = form.expected_completion || null;
        payload.outsource_status = form.outsource_status || null;
        payload.outsource_cost = form.outsource_cost ? parseFloat(form.outsource_cost) : null;
      } else {
        payload.material_cost = form.material_cost ? parseFloat(form.material_cost) : null;
        payload.labor_cost = form.labor_cost ? parseFloat(form.labor_cost) : null;
        payload.payment_status = form.payment_status || null;
      }

      if (editingItem) {
        await flexPrintingService.update(editingItem.id, payload);
      } else {
        await flexPrintingService.create(payload);
      }

      setIsModalOpen(false);
      await fetchData();
    } catch (error: any) {
      await showAlert({
        title: editingItem ? 'Update Failed' : 'Creation Failed',
        message: error.message,
        variant: 'danger',
      });
    } finally {
      setSaving(false);
    }
  };

  const filteredItems = useMemo(() => {
    let list = items;
    if (filterType !== 'all') {
      list = list.filter((item) => item.printing_type === filterType);
    }
    if (selectedHoardingFilter !== 'all') {
      const hId = parseInt(selectedHoardingFilter, 10);
      list = list.filter((item) => item.hoarding_id === hId);
    }
    if (searchQuery) {
      const q = searchQuery.toLowerCase();
      list = list.filter(
        (item) =>
          item.flex_size?.toLowerCase().includes(q) ||
          item.vendor_name?.toLowerCase().includes(q) ||
          item.notes?.toLowerCase().includes(q) ||
          (item.hoarding_id && hoardingMap[item.hoarding_id]?.location.toLowerCase().includes(q))
      );
    }
    return list;
  }, [items, filterType, selectedHoardingFilter, searchQuery, hoardingMap]);

  const renderSkeleton = () => (
    <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-6">
      {[1, 2, 3].map((i) => (
        <div key={i} className="bg-white rounded-3xl border border-slate-200 p-6 space-y-4 animate-pulse">
          <div className="h-5 bg-slate-200 rounded w-1/3" />
          <div className="h-4 bg-slate-200 rounded w-2/3" />
          <div className="h-4 bg-slate-200 rounded w-1/2" />
        </div>
      ))}
    </div>
  );

  return (
    <div className="space-y-8 animate-in fade-in duration-500 pb-20">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold text-slate-900 tracking-tight">Flex Printing</h1>
          <p className="text-sm text-slate-500 mt-1">Manage flex printing jobs — outsource or in-house</p>
        </div>
        <button
          onClick={openCreate}
          className="flex items-center gap-2 px-5 py-2.5 bg-slate-900 text-white rounded-xl hover:bg-slate-800 transition-all shadow-sm text-sm font-semibold"
        >
          <Plus className="w-4 h-4" />
          New Record
        </button>
      </div>

      <div className="flex flex-wrap items-center gap-3">
        <div className="flex items-center gap-2">
          {['all', 'outsource', 'own_printing'].map((type) => (
            <button
              key={type}
              onClick={() => setFilterType(type)}
              className={cn(
                'px-4 py-2 rounded-xl text-sm font-medium transition-all',
                filterType === type
                  ? 'bg-slate-900 text-white shadow-sm'
                  : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
              )}
            >
              {type === 'all' ? 'All Types' : typeLabels[type]}
            </button>
          ))}
        </div>

        <div className="ml-auto">
          <select
            value={selectedHoardingFilter}
            onChange={(e) => setSelectedHoardingFilter(e.target.value)}
            className="px-4 py-2 bg-slate-100 border-none rounded-xl text-sm font-semibold text-slate-700 focus:ring-2 focus:ring-slate-900 outline-none"
          >
            <option value="all">All Inventory Sites ({hoardings.length})</option>
            {hoardings.map((h) => (
              <option key={h.id} value={h.id}>
                {h.location} ({h.city || 'Madurai'})
              </option>
            ))}
          </select>
        </div>
      </div>

      {isLoading ? (
        renderSkeleton()
      ) : filteredItems.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-24 text-center">
          <div className="w-16 h-16 bg-slate-100 rounded-3xl flex items-center justify-center mb-4">
            <Printer className="w-8 h-8 text-slate-400" />
          </div>
          <h3 className="text-lg font-bold text-slate-900">No flex printing records</h3>
          <p className="text-sm text-slate-500 mt-1 mb-6">
            {searchQuery ? 'No results match your search.' : 'Create your first flex printing record to get started.'}
          </p>
          {!searchQuery && (
            <button
              onClick={openCreate}
              className="flex items-center gap-2 px-5 py-2.5 bg-slate-900 text-white rounded-xl hover:bg-slate-800 transition-all text-sm font-semibold"
            >
              <Plus className="w-4 h-4" />
              New Record
            </button>
          )}
        </div>
      ) : (
        <AnimatePresence mode="popLayout">
          <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-6">
            {filteredItems.map((item) => {
              const hoarding = item.hoarding_id ? hoardingMap[item.hoarding_id] : null;
              return (
                <motion.div
                  key={item.id}
                  layout
                  initial={{ opacity: 0, scale: 0.95 }}
                  animate={{ opacity: 1, scale: 1 }}
                  exit={{ opacity: 0, scale: 0.95 }}
                  className="bg-white rounded-3xl border border-slate-200 p-6 hover:shadow-md transition-shadow flex flex-col justify-between"
                >
                  <div>
                    <div className="flex items-start justify-between mb-3">
                      <div className="flex items-center gap-2">
                        <span className={cn('px-3 py-1 rounded-lg text-xs font-bold', typeColors[item.printing_type])}>
                          {typeLabels[item.printing_type]}
                        </span>
                        <span className={cn('px-3 py-1 rounded-lg text-xs font-bold', statusColors[item.status])}>
                          {statusLabels[item.status]}
                        </span>
                      </div>
                    </div>

                    {hoarding && (
                      <button
                        onClick={() => navigate(`/details/${hoarding.id}`)}
                        className="flex items-center gap-1.5 text-xs font-bold text-indigo-600 bg-indigo-50 px-3 py-1.5 rounded-xl hover:bg-indigo-100 transition mb-3 text-left w-full truncate"
                      >
                        <MapPin className="w-3.5 h-3.5 shrink-0" />
                        <span className="truncate">{hoarding.location} ({hoarding.city || 'Madurai'})</span>
                      </button>
                    )}

                    <div className="space-y-2">
                      <div className="flex items-center gap-2">
                        <Printer className="w-4 h-4 text-slate-400 shrink-0" />
                        <span className="text-sm font-semibold text-slate-900">{item.flex_size}</span>
                        <span className="text-xs text-slate-400">x{item.quantity}</span>
                      </div>

                      {item.printing_type === 'outsource' && item.vendor_name && (
                        <div className="flex items-center gap-2">
                          <Truck className="w-4 h-4 text-slate-400 shrink-0" />
                          <span className="text-sm text-slate-600">{item.vendor_name}</span>
                        </div>
                      )}

                      {item.printing_type === 'own_printing' && (
                        <div className="flex items-center gap-2">
                          <Building2 className="w-4 h-4 text-slate-400 shrink-0" />
                          <span className="text-sm text-slate-600">
                            Cost: ₹{((item.material_cost || 0) + (item.labor_cost || 0)).toLocaleString()}
                          </span>
                        </div>
                      )}

                      {item.notes && (
                        <p className="text-xs text-slate-400 line-clamp-2 mt-1">{item.notes}</p>
                      )}
                    </div>
                  </div>

                  <div className="flex items-center gap-2 mt-4 pt-4 border-t border-slate-100">
                    <button
                      onClick={() => openEdit(item)}
                      className="text-xs font-semibold text-indigo-600 hover:text-indigo-800 transition-colors"
                    >
                      Edit
                    </button>
                    <span className="text-slate-200">|</span>
                    <button
                      onClick={() => handleDelete(item.id)}
                      disabled={deletingId === item.id}
                      className="text-xs font-semibold text-red-500 hover:text-red-700 transition-colors disabled:opacity-50"
                    >
                      {deletingId === item.id ? 'Deleting...' : 'Delete'}
                    </button>
                  </div>
                </motion.div>
              );
            })}
          </div>
        </AnimatePresence>
      )}

      <AnimatePresence>
        {isModalOpen && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-50 flex items-center justify-center p-4"
          >
            <div className="absolute inset-0 bg-black/40 backdrop-blur-sm" onClick={() => setIsModalOpen(false)} />
            <motion.div
              initial={{ opacity: 0, scale: 0.95, y: 20 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.95, y: 20 }}
              className="relative bg-white rounded-3xl shadow-xl w-full max-w-lg max-h-[90vh] overflow-y-auto p-8"
            >
              <h2 className="text-xl font-bold text-slate-900 mb-6">
                {editingItem ? 'Edit Flex Printing Record' : 'New Flex Printing Record'}
              </h2>

              <div className="space-y-5">
                <div>
                  <label className="text-xs font-bold text-slate-500 uppercase tracking-widest">Inventory Site (Hoarding)</label>
                  <select
                    value={form.hoarding_id || ''}
                    onChange={(e) => handleSelectHoarding(e.target.value)}
                    className="w-full mt-2 px-4 py-3 bg-slate-50 border-none rounded-2xl text-sm font-medium focus:ring-2 focus:ring-indigo-600/20 focus:bg-white transition-all outline-none"
                  >
                    <option value="">-- Select Inventory Site --</option>
                    {hoardings.map((h) => (
                      <option key={h.id} value={h.id}>
                        {h.location} ({h.city || 'Madurai'}) - {h.width}x{h.height} ft
                      </option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="text-xs font-bold text-slate-500 uppercase tracking-widest">Printing Type</label>
                  <div className="flex gap-3 mt-2">
                    {(['outsource', 'own_printing'] as const).map((type) => (
                      <button
                        key={type}
                        type="button"
                        onClick={() => setForm({ ...form, printing_type: type })}
                        className={cn(
                          'flex-1 py-3 px-4 rounded-xl border-2 text-sm font-bold transition-all',
                          form.printing_type === type
                            ? 'border-slate-900 bg-slate-50 text-slate-900'
                            : 'border-slate-200 text-slate-500 hover:border-slate-300'
                        )}
                      >
                        {typeLabels[type]}
                      </button>
                    ))}
                  </div>
                </div>

                <div>
                  <label className="text-xs font-bold text-slate-500 uppercase tracking-widest">Flex Size *</label>
                  <input
                    type="text"
                    value={form.flex_size}
                    onChange={(e) => setForm({ ...form, flex_size: e.target.value })}
                    placeholder="e.g. 20ft x 10ft"
                    className="w-full mt-2 px-4 py-3 bg-slate-50 border-none rounded-2xl text-sm font-medium focus:ring-2 focus:ring-indigo-600/20 focus:bg-white transition-all outline-none"
                  />
                </div>

                <div>
                  <label className="text-xs font-bold text-slate-500 uppercase tracking-widest">Quantity</label>
                  <input
                    type="number"
                    min={1}
                    value={form.quantity}
                    onChange={(e) => setForm({ ...form, quantity: parseInt(e.target.value) || 1 })}
                    className="w-full mt-2 px-4 py-3 bg-slate-50 border-none rounded-2xl text-sm font-medium focus:ring-2 focus:ring-indigo-600/20 focus:bg-white transition-all outline-none"
                  />
                </div>

                <div>
                  <label className="text-xs font-bold text-slate-500 uppercase tracking-widest">Status</label>
                  <select
                    value={form.status}
                    onChange={(e) => setForm({ ...form, status: e.target.value })}
                    className="w-full mt-2 px-4 py-3 bg-slate-50 border-none rounded-2xl text-sm font-medium focus:ring-2 focus:ring-indigo-600/20 focus:bg-white transition-all outline-none"
                  >
                    <option value="pending">Pending</option>
                    <option value="in_progress">In Progress</option>
                    <option value="completed">Completed</option>
                    <option value="cancelled">Cancelled</option>
                  </select>
                </div>

                {form.printing_type === 'outsource' && (
                  <motion.div
                    initial={{ opacity: 0, height: 0 }}
                    animate={{ opacity: 1, height: 'auto' }}
                    exit={{ opacity: 0, height: 0 }}
                    className="space-y-5 overflow-hidden"
                  >
                    <div className="h-px bg-slate-200" />
                    <h3 className="text-sm font-bold text-slate-700">Vendor Details</h3>

                    <div>
                      <label className="text-xs font-bold text-slate-500 uppercase tracking-widest">Vendor Name</label>
                      <input
                        type="text"
                        value={form.vendor_name}
                        onChange={(e) => setForm({ ...form, vendor_name: e.target.value })}
                        placeholder="Vendor / subcontractor name"
                        className="w-full mt-2 px-4 py-3 bg-slate-50 border-none rounded-2xl text-sm font-medium focus:ring-2 focus:ring-indigo-600/20 focus:bg-white transition-all outline-none"
                      />
                    </div>

                    <div>
                      <label className="text-xs font-bold text-slate-500 uppercase tracking-widest">Contact</label>
                      <input
                        type="text"
                        value={form.vendor_contact}
                        onChange={(e) => setForm({ ...form, vendor_contact: e.target.value })}
                        placeholder="Phone or email"
                        className="w-full mt-2 px-4 py-3 bg-slate-50 border-none rounded-2xl text-sm font-medium focus:ring-2 focus:ring-indigo-600/20 focus:bg-white transition-all outline-none"
                      />
                    </div>

                    <div className="grid grid-cols-2 gap-4">
                      <div>
                        <label className="text-xs font-bold text-slate-500 uppercase tracking-widest">Assignment Date</label>
                        <input
                          type="date"
                          value={form.assignment_date}
                          onChange={(e) => setForm({ ...form, assignment_date: e.target.value })}
                          className="w-full mt-2 px-4 py-3 bg-slate-50 border-none rounded-2xl text-sm font-medium focus:ring-2 focus:ring-indigo-600/20 focus:bg-white transition-all outline-none"
                        />
                      </div>
                      <div>
                        <label className="text-xs font-bold text-slate-500 uppercase tracking-widest">Expected Completion</label>
                        <input
                          type="date"
                          value={form.expected_completion}
                          onChange={(e) => setForm({ ...form, expected_completion: e.target.value })}
                          className="w-full mt-2 px-4 py-3 bg-slate-50 border-none rounded-2xl text-sm font-medium focus:ring-2 focus:ring-indigo-600/20 focus:bg-white transition-all outline-none"
                        />
                      </div>
                    </div>

                    <div>
                      <label className="text-xs font-bold text-slate-500 uppercase tracking-widest">Outsource Status</label>
                      <select
                        value={form.outsource_status}
                        onChange={(e) => setForm({ ...form, outsource_status: e.target.value })}
                        className="w-full mt-2 px-4 py-3 bg-slate-50 border-none rounded-2xl text-sm font-medium focus:ring-2 focus:ring-indigo-600/20 focus:bg-white transition-all outline-none"
                      >
                        <option value="assigned">Assigned</option>
                        <option value="in_progress">In Progress</option>
                        <option value="completed">Completed</option>
                        <option value="delayed">Delayed</option>
                      </select>
                    </div>

                    <div>
                      <label className="text-xs font-bold text-slate-500 uppercase tracking-widest">Cost (₹)</label>
                      <input
                        type="number"
                        min={0}
                        value={form.outsource_cost}
                        onChange={(e) => setForm({ ...form, outsource_cost: e.target.value })}
                        placeholder="0.00"
                        className="w-full mt-2 px-4 py-3 bg-slate-50 border-none rounded-2xl text-sm font-medium focus:ring-2 focus:ring-indigo-600/20 focus:bg-white transition-all outline-none"
                      />
                    </div>
                  </motion.div>
                )}

                {form.printing_type === 'own_printing' && (
                  <motion.div
                    initial={{ opacity: 0, height: 0 }}
                    animate={{ opacity: 1, height: 'auto' }}
                    exit={{ opacity: 0, height: 0 }}
                    className="space-y-5 overflow-hidden"
                  >
                    <div className="h-px bg-slate-200" />
                    <h3 className="text-sm font-bold text-slate-700">Financial Details</h3>

                    <div className="grid grid-cols-2 gap-4">
                      <div>
                        <label className="text-xs font-bold text-slate-500 uppercase tracking-widest">Material Cost (₹)</label>
                        <input
                          type="number"
                          min={0}
                          value={form.material_cost}
                          onChange={(e) => setForm({ ...form, material_cost: e.target.value })}
                          placeholder="0.00"
                          className="w-full mt-2 px-4 py-3 bg-slate-50 border-none rounded-2xl text-sm font-medium focus:ring-2 focus:ring-indigo-600/20 focus:bg-white transition-all outline-none"
                        />
                      </div>
                      <div>
                        <label className="text-xs font-bold text-slate-500 uppercase tracking-widest">Labor Cost (₹)</label>
                        <input
                          type="number"
                          min={0}
                          value={form.labor_cost}
                          onChange={(e) => setForm({ ...form, labor_cost: e.target.value })}
                          placeholder="0.00"
                          className="w-full mt-2 px-4 py-3 bg-slate-50 border-none rounded-2xl text-sm font-medium focus:ring-2 focus:ring-indigo-600/20 focus:bg-white transition-all outline-none"
                        />
                      </div>
                    </div>

                    <div>
                      <label className="text-xs font-bold text-slate-500 uppercase tracking-widest">Payment Status</label>
                      <select
                        value={form.payment_status}
                        onChange={(e) => setForm({ ...form, payment_status: e.target.value })}
                        className="w-full mt-2 px-4 py-3 bg-slate-50 border-none rounded-2xl text-sm font-medium focus:ring-2 focus:ring-indigo-600/20 focus:bg-white transition-all outline-none"
                      >
                        <option value="pending">Pending</option>
                        <option value="partial">Partial</option>
                        <option value="paid">Paid</option>
                      </select>
                    </div>

                    {(parseFloat(form.material_cost) || 0) + (parseFloat(form.labor_cost) || 0) > 0 && (
                      <div className="bg-slate-50 rounded-2xl px-4 py-3">
                        <span className="text-xs font-bold text-slate-500 uppercase tracking-widest">Total Cost</span>
                        <p className="text-lg font-bold text-slate-900 mt-1">
                          ₹{((parseFloat(form.material_cost) || 0) + (parseFloat(form.labor_cost) || 0)).toLocaleString()}
                        </p>
                      </div>
                    )}
                  </motion.div>
                )}

                <div>
                  <label className="text-xs font-bold text-slate-500 uppercase tracking-widest">Notes</label>
                  <textarea
                    rows={3}
                    value={form.notes}
                    onChange={(e) => setForm({ ...form, notes: e.target.value })}
                    placeholder="Any additional notes..."
                    className="w-full mt-2 px-4 py-3 bg-slate-50 border-none rounded-2xl text-sm font-medium focus:ring-2 focus:ring-indigo-600/20 focus:bg-white transition-all outline-none resize-none"
                  />
                </div>
              </div>

              <div className="flex items-center gap-3 mt-8">
                <button
                  onClick={() => setIsModalOpen(false)}
                  className="flex-1 py-3 rounded-xl border-2 border-slate-200 text-sm font-bold text-slate-600 hover:bg-slate-50 transition-all"
                >
                  Cancel
                </button>
                <button
                  onClick={handleSubmit}
                  disabled={saving}
                  className="flex-1 py-3 rounded-xl bg-slate-900 text-white text-sm font-bold hover:bg-slate-800 transition-all disabled:opacity-50"
                >
                  {saving ? 'Saving...' : editingItem ? 'Update' : 'Create'}
                </button>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      <ConfirmDialog {...confirmProps} />
      <ConfirmDialog {...alertProps} />
    </div>
  );
}
