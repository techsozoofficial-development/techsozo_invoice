import React, { useState } from 'react';
import { useApp } from '../context/AppContext';
import { Client } from '../types';
import { ConfirmModal } from '../components/ui/ConfirmModal';
import {
  Users,
  Search,
  Plus,
  Edit,
  Trash2,
  Mail,
  Phone,
  MapPin,
  Building,
  FilePlus,
  ShieldAlert,
} from 'lucide-react';

export const ClientsPage: React.FC = () => {
  const {
    clients,
    invoices,
    saveClient,
    deleteClient,
    setActiveTab,
    setEditingDraftId,
    setSelectedInvoiceId,
  } = useApp();

  const [searchQuery, setSearchQuery] = useState('');
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingClient, setEditingClient] = useState<Client | null>(null);
  const [deletingClientId, setDeletingClientId] = useState<string | null>(null);

  // Form State
  const [name, setName] = useState('');
  const [contactPerson, setContactPerson] = useState('');
  const [email, setEmail] = useState('');
  const [phone, setPhone] = useState('');
  const [address, setAddress] = useState('');
  const [city, setCity] = useState('Tiruchirappalli');
  const [state, setState] = useState('Tamil Nadu');
  const [pincode, setPincode] = useState('620018');
  const [gstin, setGstin] = useState('');
  const [active, setActive] = useState(true);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const filteredClients = clients.filter((c) => {
    if (!searchQuery.trim()) return true;
    const q = searchQuery.toLowerCase();
    return (
      c.name.toLowerCase().includes(q) ||
      c.contactPerson.toLowerCase().includes(q) ||
      c.email.toLowerCase().includes(q) ||
      c.phone.includes(q)
    );
  });

  const handleOpenAdd = () => {
    setEditingClient(null);
    setName('');
    setContactPerson('');
    setEmail('');
    setPhone('');
    setAddress('Thillai Nagar Main Road');
    setCity('Tiruchirappalli');
    setState('Tamil Nadu');
    setPincode('620018');
    setGstin('');
    setActive(true);
    setIsModalOpen(true);
  };

  const handleOpenEdit = (client: Client) => {
    setEditingClient(client);
    setName(client.name);
    setContactPerson(client.contactPerson);
    setEmail(client.email);
    setPhone(client.phone);
    setAddress(client.address);
    setCity(client.city);
    setState(client.state);
    setPincode(client.pincode);
    setGstin(client.gstin || '');
    setActive(client.active);
    setIsModalOpen(true);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim()) return;

    try {
      setIsSubmitting(true);
      await saveClient({
        id: editingClient?.id,
        name: name.trim(),
        contactPerson: contactPerson.trim(),
        email: email.trim(),
        phone: phone.trim(),
        address: address.trim(),
        city: city.trim(),
        state: state.trim(),
        pincode: pincode.trim(),
        gstin: gstin.trim() || undefined,
        active,
      });
      setIsModalOpen(false);
    } catch (err: any) {
      // Error handled in AppContext
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleConfirmDelete = async () => {
    if (!deletingClientId) return;
    await deleteClient(deletingClientId);
    setDeletingClientId(null);
  };

  const handleCreateInvoiceForClient = (clientId: string) => {
    setSelectedInvoiceId(null);
    setEditingDraftId(null);
    setActiveTab('create_invoice');
  };

  return (
    <div className="space-y-6 animate-in fade-in duration-200">
      {/* Delete Confirmation Modal */}
      <ConfirmModal
        isOpen={Boolean(deletingClientId)}
        onClose={() => setDeletingClientId(null)}
        onConfirm={handleConfirmDelete}
        title="Delete Client Record?"
        description="Are you sure you want to remove this client? If invoices are linked to this client, deletion is blocked to preserve accounting integrity."
        confirmLabel="Delete Client"
        variant="danger"
      />

      {/* Add / Edit Client Modal */}
      {isModalOpen && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-xs animate-in fade-in"
          role="dialog"
          aria-modal="true"
        >
          <div className="bg-[#FAF9F6] border border-[#DAD8D2] rounded-2xl max-w-xl w-full p-6 shadow-2xl animate-in zoom-in-95 max-h-[92vh] flex flex-col">
            <h3 className="text-lg font-heading font-bold text-[#1A1B1E] mb-4 flex items-center gap-2">
              <Users className="w-5 h-5 text-[#C6A15B]" />
              <span>{editingClient ? 'Edit Client Details' : 'Add New Client'}</span>
            </h3>

            <form onSubmit={handleSubmit} className="flex-1 overflow-y-auto space-y-4 text-xs pr-1">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div className="sm:col-span-2">
                  <label className="block font-medium text-[#4C5056] mb-1">
                    Company / Organization Name <span className="text-red-500">*</span>
                  </label>
                  <input
                    type="text"
                    required
                    value={name}
                    onChange={(e) => setName(e.target.value)}
                    placeholder="e.g. Cauvery Real Estate & Builders"
                    className="w-full px-3 py-2 text-sm bg-white border border-[#DAD8D2] rounded-xl focus:ring-2 focus:ring-[#C6A15B]"
                  />
                </div>

                <div>
                  <label className="block font-medium text-[#4C5056] mb-1">
                    Primary Contact Person
                  </label>
                  <input
                    type="text"
                    value={contactPerson}
                    onChange={(e) => setContactPerson(e.target.value)}
                    placeholder="e.g. Mr. R. Senthil Kumar"
                    className="w-full px-3 py-2 text-sm bg-white border border-[#DAD8D2] rounded-xl focus:ring-2 focus:ring-[#C6A15B]"
                  />
                </div>

                <div>
                  <label className="block font-medium text-[#4C5056] mb-1">
                    Phone / Mobile
                  </label>
                  <input
                    type="tel"
                    value={phone}
                    onChange={(e) => setPhone(e.target.value)}
                    placeholder="e.g. +91 98432 11223"
                    className="w-full px-3 py-2 text-sm bg-white border border-[#DAD8D2] rounded-xl focus:ring-2 focus:ring-[#C6A15B]"
                  />
                </div>

                <div className="sm:col-span-2">
                  <label className="block font-medium text-[#4C5056] mb-1">
                    Email Address
                  </label>
                  <input
                    type="email"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    placeholder="e.g. billing@cauverybuilders.com"
                    className="w-full px-3 py-2 text-sm bg-white border border-[#DAD8D2] rounded-xl focus:ring-2 focus:ring-[#C6A15B]"
                  />
                </div>

                <div className="sm:col-span-2">
                  <label className="block font-medium text-[#4C5056] mb-1">
                    Street Address
                  </label>
                  <input
                    type="text"
                    value={address}
                    onChange={(e) => setAddress(e.target.value)}
                    placeholder="e.g. 42, Collector Office Road, Cantonment"
                    className="w-full px-3 py-2 text-sm bg-white border border-[#DAD8D2] rounded-xl focus:ring-2 focus:ring-[#C6A15B]"
                  />
                </div>

                <div>
                  <label className="block font-medium text-[#4C5056] mb-1">City</label>
                  <input
                    type="text"
                    value={city}
                    onChange={(e) => setCity(e.target.value)}
                    className="w-full px-3 py-2 text-sm bg-white border border-[#DAD8D2] rounded-xl focus:ring-2 focus:ring-[#C6A15B]"
                  />
                </div>

                <div>
                  <label className="block font-medium text-[#4C5056] mb-1">
                    State (Used for GST Interstate Check)
                  </label>
                  <input
                    type="text"
                    value={state}
                    onChange={(e) => setState(e.target.value)}
                    placeholder="Tamil Nadu"
                    className="w-full px-3 py-2 text-sm bg-white border border-[#DAD8D2] rounded-xl focus:ring-2 focus:ring-[#C6A15B]"
                  />
                </div>

                <div>
                  <label className="block font-medium text-[#4C5056] mb-1">PIN Code</label>
                  <input
                    type="text"
                    value={pincode}
                    onChange={(e) => setPincode(e.target.value)}
                    placeholder="620001"
                    className="w-full px-3 py-2 text-sm bg-white border border-[#DAD8D2] rounded-xl focus:ring-2 focus:ring-[#C6A15B]"
                  />
                </div>

                <div>
                  <label className="block font-medium text-[#4C5056] mb-1">
                    GSTIN (Optional)
                  </label>
                  <input
                    type="text"
                    value={gstin}
                    onChange={(e) => setGstin(e.target.value)}
                    placeholder="e.g. 33AABCC1234D1Z5"
                    className="w-full px-3 py-2 text-sm bg-white border border-[#DAD8D2] rounded-xl font-mono uppercase focus:ring-2 focus:ring-[#C6A15B]"
                  />
                </div>
              </div>

              <div className="pt-2 flex items-center gap-2">
                <input
                  type="checkbox"
                  id="client-active-toggle"
                  checked={active}
                  onChange={(e) => setActive(e.target.checked)}
                  className="rounded text-[#C6A15B] focus:ring-[#C6A15B]"
                />
                <label htmlFor="client-active-toggle" className="text-xs text-[#292A2D]">
                  Client is Active (Available for new invoices)
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
                  {isSubmitting ? 'Saving...' : 'Save Client'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Header & New Client Button */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h2 className="text-2xl font-heading font-bold text-[#1A1B1E]">
            Client Management
          </h2>
          <p className="text-sm text-[#5C6068]">
            Maintain billing profiles, tax identifications, and verified contact points.
          </p>
        </div>

        <button
          onClick={handleOpenAdd}
          className="flex items-center gap-2 px-4 py-2.5 bg-[#C6A15B] hover:bg-[#B38E46] text-[#292A2D] font-heading font-semibold text-sm rounded-xl shadow-sm transition-all min-h-[44px]"
        >
          <Plus className="w-4 h-4 stroke-[2.5]" />
          <span>Add New Client</span>
        </button>
      </div>

      {/* Search Toolbar */}
      <div className="bg-white p-4 rounded-2xl border border-[#DAD8D2] shadow-xs">
        <div className="relative">
          <Search className="w-4 h-4 absolute left-3 top-3.5 text-[#5C6068]" />
          <input
            type="text"
            placeholder="Search clients by name, contact, phone, or email..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full pl-9 pr-3 py-2 text-sm bg-[#FAF9F6] border border-[#DAD8D2] rounded-xl focus:outline-none focus:ring-2 focus:ring-[#C6A15B]"
          />
        </div>
      </div>

      {/* Client Cards Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
        {filteredClients.length === 0 ? (
          <div className="col-span-full bg-white p-12 text-center rounded-2xl border border-[#DAD8D2] text-[#5C6068]">
            <Users className="w-10 h-10 text-[#C6A15B] mx-auto mb-2 opacity-60" />
            <p className="font-semibold text-base text-[#1A1B1E]">No clients found</p>
            <p className="text-xs mt-1">Add a new client to start invoicing.</p>
          </div>
        ) : (
          filteredClients.map((client) => {
            const clientInvoices = invoices.filter((i) => i.clientId === client.id);

            return (
              <div
                key={client.id}
                className="bg-white border border-[#DAD8D2] hover:border-[#C6A15B] p-5 rounded-2xl shadow-xs transition-all flex flex-col justify-between space-y-4"
              >
                <div>
                  <div className="flex items-start justify-between gap-2 mb-2">
                    <span className="font-heading font-bold text-base text-[#1A1B1E] leading-snug">
                      {client.name}
                    </span>
                    {!client.active && (
                      <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-gray-100 text-gray-600">
                        Inactive
                      </span>
                    )}
                  </div>

                  {client.contactPerson && (
                    <p className="text-xs font-medium text-[#4C5056] mb-3">
                      Attn: {client.contactPerson}
                    </p>
                  )}

                  <div className="space-y-1.5 text-xs text-[#5C6068]">
                    {client.phone && (
                      <div className="flex items-center gap-2">
                        <Phone className="w-3.5 h-3.5 text-[#C6A15B] shrink-0" />
                        <span>{client.phone}</span>
                      </div>
                    )}
                    {client.email && (
                      <div className="flex items-center gap-2">
                        <Mail className="w-3.5 h-3.5 text-[#C6A15B] shrink-0" />
                        <span className="truncate">{client.email}</span>
                      </div>
                    )}
                    <div className="flex items-start gap-2">
                      <MapPin className="w-3.5 h-3.5 text-[#C6A15B] shrink-0 mt-0.5" />
                      <span>
                        {client.city}, {client.state}
                      </span>
                    </div>
                  </div>

                  {client.gstin && (
                    <div className="mt-3 pt-2 border-t border-[#F1F0ED] text-[11px] text-[#292A2D]">
                      GSTIN: <span className="font-mono font-semibold">{client.gstin}</span>
                    </div>
                  )}
                </div>

                <div className="pt-3 border-t border-[#F1F0ED] flex items-center justify-between">
                  <span className="text-[11px] text-[#5C6068]">
                    {clientInvoices.length} invoice{clientInvoices.length !== 1 ? 's' : ''}
                  </span>

                  <div className="flex items-center gap-1.5">
                    <button
                      onClick={() => handleCreateInvoiceForClient(client.id)}
                      className="p-1.5 text-[#9A7832] hover:text-[#C6A15B] hover:bg-[#FAF5E8] rounded-lg transition-colors"
                      title="Create Invoice for this Client"
                    >
                      <FilePlus className="w-4 h-4" />
                    </button>
                    <button
                      onClick={() => handleOpenEdit(client)}
                      className="p-1.5 text-[#5C6068] hover:text-[#1A1B1E] hover:bg-[#F1F0ED] rounded-lg transition-colors"
                      title="Edit Client"
                    >
                      <Edit className="w-4 h-4" />
                    </button>
                    <button
                      onClick={() => setDeletingClientId(client.id)}
                      className="p-1.5 text-neutral-400 hover:text-red-600 hover:bg-red-50 rounded-lg transition-colors"
                      title="Delete Client"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </div>
                </div>
              </div>
            );
          })
        )}
      </div>
    </div>
  );
};
