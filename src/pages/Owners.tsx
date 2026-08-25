import { useState, useEffect, useMemo } from 'react';
import { 
  UserCheck, 
  Plus, 
  Phone, 
  Mail, 
  CreditCard, 
  MapPin, 
  Pencil, 
  Trash2, 
  ChevronRight, 
  X, 
  Building2,
  Check
} from 'lucide-react';
import { ownerService } from '../services/ownerService';
import { hoardingService } from '../services/hoardingService';
import { Owner, Hoarding } from '../types';
import { useSearch } from '../context/SearchContext';
import { useNavigate } from 'react-router-dom';
import ConfirmDialog from '../components/ConfirmDialog';

export default function Owners() {
  const [owners, setOwners] = useState<Owner[]>([]);
  const [hoardings, setHoardings] = useState<Hoarding[]>([]);
  const [loading, setLoading] = useState(true);
  const { searchQuery } = useSearch();
  const navigate = useNavigate();

  // Modal State
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingOwner, setEditingOwner] = useState<Owner | null>(null);
  const [formData, setFormData] = useState({
    name: '',
    contact_number: '',
    email: '',
    payment_details: ''
  });

  // Delete State
  const [deleteOwnerId, setDeleteOwnerId] = useState<number | null>(null);

  useEffect(() => {
    fetchData();
  }, []);

  const fetchData = async () => {
    try {
      setLoading(true);
      const [ownersData, hoardingsData] = await Promise.all([
        ownerService.getAll(),
        hoardingService.getAll()
      ]);
      setOwners(ownersData);
      setHoardings(hoardingsData);
    } catch (err) {
      console.error('Failed to load owners/hoardings:', err);
    } finally {
      setLoading(false);
    }
  };

  // Map hoardings list by owner_id
  const hoardingsByOwner = useMemo(() => {
    const map = new Map<number, Hoarding[]>();
    hoardings.forEach(h => {
      if (h.owner_id) {
        const existing = map.get(h.owner_id) || [];
        existing.push(h);
        map.set(h.owner_id, existing);
      }
    });
    return map;
  }, [hoardings]);

  // Search Filter
  const filteredOwners = useMemo(() => {
    const query = searchQuery.trim().toLowerCase();
    if (!query) return owners;
    return owners.filter(o => 
      o.name.toLowerCase().includes(query) ||
      o.contact_number.toLowerCase().includes(query) ||
      (o.email && o.email.toLowerCase().includes(query)) ||
      (o.payment_details && o.payment_details.toLowerCase().includes(query))
    );
  }, [owners, searchQuery]);

  const handleOpenCreateModal = () => {
    setEditingOwner(null);
    setFormData({ name: '', contact_number: '', email: '', payment_details: '' });
    setIsModalOpen(true);
  };

  const handleOpenEditModal = (owner: Owner) => {
    setEditingOwner(owner);
    setFormData({
      name: owner.name,
      contact_number: owner.contact_number,
      email: owner.email || '',
      payment_details: owner.payment_details || ''
    });
    setIsModalOpen(true);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.name.trim() || !formData.contact_number.trim()) return;

    try {
      if (editingOwner) {
        await ownerService.update(editingOwner.id, formData);
      } else {
        await ownerService.create(formData);
      }
      setIsModalOpen(false);
      fetchData();
    } catch (err) {
      console.error('Failed to save owner:', err);
    }
  };

  const handleDelete = async () => {
    if (!deleteOwnerId) return;
    try {
      await ownerService.delete(deleteOwnerId);
      setDeleteOwnerId(null);
      fetchData();
    } catch (err) {
      console.error('Failed to delete owner:', err);
    }
  };

  return (
    <div className="max-w-[1400px] mx-auto pb-24 mt-2 px-4 sm:px-6">
      {/* Breadcrumb Navigation */}
      <div className="flex items-center text-xs text-slate-500 font-medium tracking-wide mb-6">
        <span>Account</span>
        <ChevronRight className="w-3.5 h-3.5 mx-2" />
        <span className="text-slate-900 font-semibold">Site Owners</span>
      </div>

      {/* Header Section */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-8">
        <div>
          <h1 className="text-3xl font-bold tracking-tight text-slate-900">Site Owners & Landlords</h1>
          <p className="text-sm text-slate-500 mt-1">
            Manage property owners, payment details, and assigned hoarding locations.
          </p>
        </div>
        <button
          onClick={handleOpenCreateModal}
          className="inline-flex items-center justify-center gap-2 px-5 py-3 bg-slate-900 hover:bg-slate-800 text-white font-semibold rounded-xl transition-all shadow-sm shrink-0 text-sm"
        >
          <Plus className="w-4 h-4" />
          <span>Add New Owner</span>
        </button>
      </div>

      {/* Overview Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-6 mb-8">
        <div className="bg-white p-6 rounded-2xl border border-slate-100 shadow-sm flex items-center gap-4">
          <div className="w-12 h-12 rounded-xl bg-indigo-50 flex items-center justify-center text-indigo-600 shrink-0">
            <UserCheck className="w-6 h-6" />
          </div>
          <div>
            <p className="text-xs font-semibold text-slate-400 uppercase tracking-wider">Total Registered Owners</p>
            <p className="text-2xl font-bold text-slate-900 mt-0.5">{owners.length}</p>
          </div>
        </div>

        <div className="bg-white p-6 rounded-2xl border border-slate-100 shadow-sm flex items-center gap-4">
          <div className="w-12 h-12 rounded-xl bg-emerald-50 flex items-center justify-center text-emerald-600 shrink-0">
            <Building2 className="w-6 h-6" />
          </div>
          <div>
            <p className="text-xs font-semibold text-slate-400 uppercase tracking-wider">Agency Owned Sites</p>
            <p className="text-2xl font-bold text-slate-900 mt-0.5">
              {hoardings.filter(h => h.is_owned).length}
            </p>
          </div>
        </div>

        <div className="bg-white p-6 rounded-2xl border border-slate-100 shadow-sm flex items-center gap-4">
          <div className="w-12 h-12 rounded-xl bg-amber-50 flex items-center justify-center text-amber-600 shrink-0">
            <CreditCard className="w-6 h-6" />
          </div>
          <div>
            <p className="text-xs font-semibold text-slate-400 uppercase tracking-wider">Leased Landlord Sites</p>
            <p className="text-2xl font-bold text-slate-900 mt-0.5">
              {hoardings.filter(h => !h.is_owned).length}
            </p>
          </div>
        </div>
      </div>

      {/* Owners List Grid */}
      {loading ? (
        <div className="py-20 text-center">
          <div className="w-8 h-8 border-4 border-indigo-200 border-t-indigo-600 rounded-full animate-spin mx-auto mb-4" />
          <p className="text-sm font-medium text-slate-500">Loading site owners...</p>
        </div>
      ) : filteredOwners.length > 0 ? (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {filteredOwners.map((owner) => {
            const assignedHoardings = hoardingsByOwner.get(owner.id) || [];
            return (
              <div 
                key={owner.id} 
                className="bg-white rounded-2xl border border-slate-100 shadow-sm hover:shadow-md transition-all p-6 flex flex-col justify-between"
              >
                <div>
                  <div className="flex items-start justify-between gap-3 mb-4">
                    <div className="flex items-center gap-3">
                      <div className="w-10 h-10 rounded-full bg-slate-900 text-white font-bold flex items-center justify-center text-sm shrink-0">
                        {owner.name.charAt(0).toUpperCase()}
                      </div>
                      <div>
                        <h3 className="font-bold text-slate-900 text-base leading-tight">{owner.name}</h3>
                        <span className="inline-flex items-center gap-1 text-[11px] font-semibold text-slate-500 mt-0.5">
                          <MapPin className="w-3 h-3 text-slate-400" />
                          {assignedHoardings.length} {assignedHoardings.length === 1 ? 'Site' : 'Sites'} Assigned
                        </span>
                      </div>
                    </div>

                    <div className="flex items-center gap-1">
                      <button
                        onClick={() => handleOpenEditModal(owner)}
                        className="p-1.5 text-slate-400 hover:text-indigo-600 hover:bg-slate-50 rounded-lg transition-colors"
                        title="Edit Owner"
                      >
                        <Pencil className="w-4 h-4" />
                      </button>
                      <button
                        onClick={() => setDeleteOwnerId(owner.id)}
                        className="p-1.5 text-slate-400 hover:text-red-600 hover:bg-slate-50 rounded-lg transition-colors"
                        title="Delete Owner"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </div>
                  </div>

                  {/* Owner Contact Information */}
                  <div className="space-y-2.5 text-sm py-3 border-y border-slate-100 mb-4">
                    <div className="flex items-center gap-2.5 text-slate-600">
                      <Phone className="w-4 h-4 text-slate-400 shrink-0" />
                      <a href={`tel:${owner.contact_number}`} className="hover:text-indigo-600 transition-colors font-medium">
                        {owner.contact_number}
                      </a>
                    </div>

                    {owner.email && (
                      <div className="flex items-center gap-2.5 text-slate-600 truncate">
                        <Mail className="w-4 h-4 text-slate-400 shrink-0" />
                        <a href={`mailto:${owner.email}`} className="hover:text-indigo-600 transition-colors truncate">
                          {owner.email}
                        </a>
                      </div>
                    )}

                    {owner.payment_details && (
                      <div className="flex items-start gap-2.5 text-slate-600">
                        <CreditCard className="w-4 h-4 text-slate-400 shrink-0 mt-0.5" />
                        <span className="text-xs text-slate-500 font-mono bg-slate-50 px-2 py-1 rounded border border-slate-100 block w-full truncate">
                          {owner.payment_details}
                        </span>
                      </div>
                    )}
                  </div>
                </div>

                {/* Bottom Action: View Assigned Sites */}
                <div>
                  <button
                    onClick={() => navigate(`/inventory?search=${encodeURIComponent(owner.name)}`)}
                    className="w-full flex items-center justify-between px-4 py-2.5 bg-slate-50 hover:bg-slate-100 text-slate-700 text-xs font-semibold rounded-xl transition-colors"
                  >
                    <span>View {assignedHoardings.length} Assigned Sites</span>
                    <ChevronRight className="w-4 h-4 text-slate-400" />
                  </button>
                </div>
              </div>
            );
          })}
        </div>
      ) : (
        <div className="py-20 text-center bg-white rounded-2xl border border-slate-100 shadow-sm">
          <div className="w-16 h-16 rounded-full bg-slate-50 flex items-center justify-center text-slate-400 mx-auto mb-4">
            <UserCheck className="w-8 h-8" />
          </div>
          <h3 className="text-lg font-bold text-slate-900 mb-1">
            {searchQuery ? 'No owners found' : 'No Site Owners Added Yet'}
          </h3>
          <p className="text-sm text-slate-500 max-w-md mx-auto mb-6">
            {searchQuery ? `No owners matching "${searchQuery}".` : 'Add your first site owner or landlord to manage property contacts.'}
          </p>
          {!searchQuery && (
            <button
              onClick={handleOpenCreateModal}
              className="inline-flex items-center gap-2 px-4 py-2.5 bg-slate-900 hover:bg-slate-800 text-white font-semibold rounded-xl text-sm transition-all"
            >
              <Plus className="w-4 h-4" />
              <span>Add New Owner</span>
            </button>
          )}
        </div>
      )}

      {/* Modal: Create/Edit Owner */}
      {isModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/40 backdrop-blur-sm">
          <div className="bg-white rounded-2xl max-w-lg w-full p-6 shadow-2xl border border-slate-100">
            <div className="flex items-center justify-between mb-6 pb-4 border-b border-slate-100">
              <h2 className="text-xl font-bold text-slate-900">
                {editingOwner ? 'Edit Site Owner' : 'Add New Site Owner'}
              </h2>
              <button 
                onClick={() => setIsModalOpen(false)}
                className="p-1.5 text-slate-400 hover:text-slate-600 rounded-lg transition-colors"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleSubmit} className="space-y-4">
              <div>
                <label className="block text-xs font-semibold text-slate-700 uppercase tracking-wider mb-1.5">
                  Owner / Landlord Name <span className="text-red-500">*</span>
                </label>
                <input
                  type="text"
                  required
                  placeholder="e.g. Arun Murugan / Agency Owned"
                  value={formData.name}
                  onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                  className="w-full px-4 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-sm font-medium focus:ring-2 focus:ring-slate-900/10 focus:border-slate-900 outline-none transition-all"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 uppercase tracking-wider mb-1.5">
                  Contact Number <span className="text-red-500">*</span>
                </label>
                <input
                  type="text"
                  required
                  placeholder="e.g. +91 94431 12345"
                  value={formData.contact_number}
                  onChange={(e) => setFormData({ ...formData, contact_number: e.target.value })}
                  className="w-full px-4 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-sm font-medium focus:ring-2 focus:ring-slate-900/10 focus:border-slate-900 outline-none transition-all"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 uppercase tracking-wider mb-1.5">
                  Email Address
                </label>
                <input
                  type="email"
                  placeholder="e.g. owner@example.com"
                  value={formData.email}
                  onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                  className="w-full px-4 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-sm font-medium focus:ring-2 focus:ring-slate-900/10 focus:border-slate-900 outline-none transition-all"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 uppercase tracking-wider mb-1.5">
                  Payment & Bank Details
                </label>
                <textarea
                  rows={2}
                  placeholder="e.g. GPay: +91 94431 12345 or HDFC A/c: 50100..."
                  value={formData.payment_details}
                  onChange={(e) => setFormData({ ...formData, payment_details: e.target.value })}
                  className="w-full px-4 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-sm font-medium focus:ring-2 focus:ring-slate-900/10 focus:border-slate-900 outline-none transition-all"
                />
              </div>

              <div className="flex items-center justify-end gap-3 pt-4 border-t border-slate-100 mt-6">
                <button
                  type="button"
                  onClick={() => setIsModalOpen(false)}
                  className="px-4 py-2.5 bg-slate-100 hover:bg-slate-200 text-slate-700 font-semibold rounded-xl text-sm transition-colors"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="inline-flex items-center gap-2 px-5 py-2.5 bg-slate-900 hover:bg-slate-800 text-white font-semibold rounded-xl text-sm transition-all shadow-sm"
                >
                  <Check className="w-4 h-4" />
                  <span>{editingOwner ? 'Update Owner' : 'Create Owner'}</span>
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Delete Confirmation Modal */}
      <ConfirmDialog
        isOpen={deleteOwnerId !== null}
        title="Delete Site Owner"
        message="Are you sure you want to delete this site owner? Associated hoardings will be unlinked from this owner."
        confirmLabel="Delete Owner"
        variant="danger"
        onConfirm={handleDelete}
        onCancel={() => setDeleteOwnerId(null)}
      />
    </div>
  );
}
