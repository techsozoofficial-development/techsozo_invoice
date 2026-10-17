import React, { useState } from 'react';
import { useApp } from '../context/AppContext';
import { ServiceItem } from '../types';
import { formatINR } from '../utils/indianNumbering';
import { ConfirmModal } from '../components/ui/ConfirmModal';
import {
  Briefcase,
  Search,
  Plus,
  Edit,
  Trash2,
  Tag,
  FileText,
} from 'lucide-react';

export const ServicesPage: React.FC = () => {
  const { services, saveService, deleteService } = useApp();

  const [searchQuery, setSearchQuery] = useState('');
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingService, setEditingService] = useState<ServiceItem | null>(null);
  const [deletingServiceId, setDeletingServiceId] = useState<string | null>(null);

  // Form State
  const [name, setName] = useState('');
  const [description, setDescription] = useState('');
  const [defaultRate, setDefaultRate] = useState<string>('25000');
  const [sac, setSac] = useState('998361');
  const [active, setActive] = useState(true);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const filteredServices = services.filter((s) => {
    if (!searchQuery.trim()) return true;
    const q = searchQuery.toLowerCase();
    return s.name.toLowerCase().includes(q) || s.description.toLowerCase().includes(q);
  });

  const handleOpenAdd = () => {
    setEditingService(null);
    setName('');
    setDescription('');
    setDefaultRate('25000');
    setSac('998361');
    setActive(true);
    setIsModalOpen(true);
  };

  const handleOpenEdit = (srv: ServiceItem) => {
    setEditingService(srv);
    setName(srv.name);
    setDescription(srv.description);
    setDefaultRate(String(srv.defaultRate));
    setSac(srv.sac || '998361');
    setActive(srv.active);
    setIsModalOpen(true);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim()) return;

    try {
      setIsSubmitting(true);
      const payload: Omit<ServiceItem, 'id' | 'createdAt'> & { id?: string } = {
        id: editingService?.id,
        name: name.trim(),
        description: description.trim(),
        defaultRate: Math.max(0, parseFloat(defaultRate) || 0),
        active,
      };
      if (sac.trim()) {
        payload.sac = sac.trim();
      }
      await saveService(payload);
      setIsModalOpen(false);
    } catch (err: any) {
      // Handled
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleConfirmDelete = async () => {
    if (!deletingServiceId) return;
    await deleteService(deletingServiceId);
    setDeletingServiceId(null);
  };

  return (
    <div className="space-y-6 animate-in fade-in duration-200">
      {/* Delete Confirmation Modal */}
      <ConfirmModal
        isOpen={Boolean(deletingServiceId)}
        onClose={() => setDeletingServiceId(null)}
        onConfirm={handleConfirmDelete}
        title="Delete Service Offering?"
        description="Are you sure you want to remove this service from your active catalog?"
        confirmLabel="Delete Service"
        variant="danger"
      />

      {/* Add / Edit Service Modal */}
      {isModalOpen && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-xs animate-in fade-in"
          role="dialog"
          aria-modal="true"
        >
          <div className="bg-[#FAF9F6] border border-[#DAD8D2] rounded-2xl max-w-lg w-full p-6 shadow-2xl animate-in zoom-in-95">
            <h3 className="text-lg font-heading font-bold text-[#1A1B1E] mb-4 flex items-center gap-2">
              <Briefcase className="w-5 h-5 text-[#C6A15B]" />
              <span>{editingService ? 'Edit Service' : 'Add New Service Offering'}</span>
            </h3>

            <form onSubmit={handleSubmit} className="space-y-3.5 text-xs">
              <div>
                <label className="block font-medium text-[#4C5056] mb-1">
                  Service Title / Name <span className="text-red-500">*</span>
                </label>
                <input
                  type="text"
                  required
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  placeholder="e.g. SEO Strategy & Monthly Optimization"
                  className="w-full px-3 py-2 text-sm bg-white border border-[#DAD8D2] rounded-xl focus:ring-2 focus:ring-[#C6A15B]"
                />
              </div>

              <div>
                <label className="block font-medium text-[#4C5056] mb-1">
                  Service Description / Standard Deliverables
                </label>
                <textarea
                  rows={3}
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
                  placeholder="e.g. On-page SEO, technical audit, keyword ranking monitoring, and monthly report."
                  className="w-full px-3 py-2 text-xs bg-white border border-[#DAD8D2] rounded-xl focus:ring-2 focus:ring-[#C6A15B]"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block font-medium text-[#4C5056] mb-1">
                    Standard Rate (₹) <span className="text-red-500">*</span>
                  </label>
                  <input
                    type="number"
                    min="0"
                    step="100"
                    required
                    value={defaultRate}
                    onChange={(e) => setDefaultRate(e.target.value)}
                    className="w-full px-3 py-2 text-sm bg-white border border-[#DAD8D2] rounded-xl font-medium focus:ring-2 focus:ring-[#C6A15B]"
                  />
                </div>

                <div>
                  <label className="block font-medium text-[#4C5056] mb-1">
                    SAC Code (Tax Accounting)
                  </label>
                  <input
                    type="text"
                    value={sac}
                    onChange={(e) => setSac(e.target.value)}
                    placeholder="998361"
                    className="w-full px-3 py-2 text-sm bg-white border border-[#DAD8D2] rounded-xl font-mono focus:ring-2 focus:ring-[#C6A15B]"
                  />
                </div>
              </div>

              <div className="pt-2 flex items-center gap-2">
                <input
                  type="checkbox"
                  id="srv-active-toggle"
                  checked={active}
                  onChange={(e) => setActive(e.target.checked)}
                  className="rounded text-[#C6A15B] focus:ring-[#C6A15B]"
                />
                <label htmlFor="srv-active-toggle" className="text-xs text-[#292A2D]">
                  Service is active and available in invoice editor
                </label>
              </div>

              <div className="flex justify-end gap-2.5 pt-4 border-t border-[#DAD8D2]">
                <button
                  type="button"
                  onClick={() => setIsModalOpen(false)}
                  className="px-4 py-2 bg-[#F1F0ED] hover:bg-[#E5E3DD] text-[#4C5056] rounded-xl min-h-[44px]"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={isSubmitting}
                  className="px-5 py-2 bg-[#C6A15B] hover:bg-[#B38E46] text-[#292A2D] font-heading font-semibold rounded-xl min-h-[44px]"
                >
                  {isSubmitting ? 'Saving...' : 'Save Service'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Header & Add Button */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h2 className="text-2xl font-heading font-bold text-[#1A1B1E]">
            Services & Rate Catalog
          </h2>
          <p className="text-sm text-[#5C6068]">
            Predefine standard digital agency deliverables, default hourly/retainer rates, and SAC tax codes.
          </p>
        </div>

        <button
          onClick={handleOpenAdd}
          className="flex items-center gap-2 px-4 py-2.5 bg-[#C6A15B] hover:bg-[#B38E46] text-[#292A2D] font-heading font-semibold text-sm rounded-xl shadow-sm transition-all min-h-[44px]"
        >
          <Plus className="w-4 h-4 stroke-[2.5]" />
          <span>Add New Service</span>
        </button>
      </div>

      {/* Search Toolbar */}
      <div className="bg-white p-4 rounded-2xl border border-[#DAD8D2] shadow-xs">
        <div className="relative">
          <Search className="w-4 h-4 absolute left-3 top-3.5 text-[#5C6068]" />
          <input
            type="text"
            placeholder="Search services by title or description..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full pl-9 pr-3 py-2 text-sm bg-[#FAF9F6] border border-[#DAD8D2] rounded-xl focus:outline-none focus:ring-2 focus:ring-[#C6A15B]"
          />
        </div>
      </div>

      {/* Services Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
        {filteredServices.length === 0 ? (
          <div className="col-span-full bg-white p-12 text-center rounded-2xl border border-[#DAD8D2] text-[#5C6068]">
            <Briefcase className="w-10 h-10 text-[#C6A15B] mx-auto mb-2 opacity-60" />
            <p className="font-semibold text-base text-[#1A1B1E]">No services found</p>
            <p className="text-xs mt-1">Add a new service offering to your pricing sheet.</p>
          </div>
        ) : (
          filteredServices.map((srv) => (
            <div
              key={srv.id}
              className="bg-white border border-[#DAD8D2] hover:border-[#C6A15B] p-5 rounded-2xl shadow-xs transition-all flex flex-col justify-between space-y-4"
            >
              <div>
                <div className="flex items-start justify-between gap-2 mb-2">
                  <span className="font-heading font-bold text-base text-[#1A1B1E] leading-snug">
                    {srv.name}
                  </span>
                  {srv.sac && (
                    <span className="text-[10px] font-mono px-2 py-0.5 rounded-full bg-[#FAF5E8] text-[#9A7832] border border-[#C6A15B]/30 shrink-0">
                      SAC {srv.sac}
                    </span>
                  )}
                </div>

                <p className="text-xs text-[#5C6068] leading-relaxed line-clamp-3 mb-3">
                  {srv.description || 'No detailed scope recorded.'}
                </p>
              </div>

              <div className="pt-3 border-t border-[#F1F0ED] flex items-center justify-between">
                <div>
                  <span className="text-[10px] text-[#5C6068] block">Default Rate</span>
                  <span className="font-heading font-extrabold text-base text-[#1A1B1E] tabular-nums">
                    {formatINR(srv.defaultRate)}
                  </span>
                </div>

                <div className="flex items-center gap-1.5">
                  <button
                    onClick={() => handleOpenEdit(srv)}
                    className="p-1.5 text-[#5C6068] hover:text-[#1A1B1E] hover:bg-[#F1F0ED] rounded-lg transition-colors"
                    title="Edit Service"
                  >
                    <Edit className="w-4 h-4" />
                  </button>
                  <button
                    onClick={() => setDeletingServiceId(srv.id)}
                    className="p-1.5 text-neutral-400 hover:text-red-600 hover:bg-red-50 rounded-lg transition-colors"
                    title="Delete Service"
                  >
                    <Trash2 className="w-4 h-4" />
                  </button>
                </div>
              </div>
            </div>
          ))
        )}
      </div>
    </div>
  );
};
