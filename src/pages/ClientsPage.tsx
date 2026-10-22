import React, { useState } from 'react';
import { useApp } from '../context/AppContext';
import { Client, ClientService, BillingFrequency, AdBudgetPeriod, ClientAdBudget, ClientDeliverables } from '../types';
import { ConfirmModal } from '../components/ui/ConfirmModal';
import { ServiceAutocomplete } from '../components/ui/ServiceAutocomplete';
import { formatINR } from '../utils/indianNumbering';
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
  Briefcase,
  Layers,
  Sparkles,
  Megaphone,
} from 'lucide-react';

export const ClientsPage: React.FC = () => {
  const {
    clients,
    services,
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
  const [active, setActive] = useState(true);
  const [monthlyServiceFee, setMonthlyServiceFee] = useState<number | null>(null);
  const [posterCount, setPosterCount] = useState<number | null>(null);
  const [reelCount, setReelCount] = useState<number | null>(null);
  const [shootingSessions, setShootingSessions] = useState<number | null>(null);
  const [adBudgetPeriod, setAdBudgetPeriod] = useState<AdBudgetPeriod>('Monthly');
  const [adBudgetAmount, setAdBudgetAmount] = useState<number | null>(null);
  const [adBudgetCampaignName, setAdBudgetCampaignName] = useState<string>('');
  const [clientServices, setClientServices] = useState<ClientService[]>([]);
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Pre-index invoice counts per client for O(1) card rendering
  const invoiceCountByClientId = React.useMemo(() => {
    const map = new Map<string, number>();
    for (const inv of invoices) {
      map.set(inv.clientId, (map.get(inv.clientId) || 0) + 1);
    }
    return map;
  }, [invoices]);

  const filteredClients = React.useMemo(() => {
    if (!searchQuery.trim()) return clients;
    const q = searchQuery.toLowerCase();
    return clients.filter(
      (c) =>
        c.name.toLowerCase().includes(q) ||
        c.contactPerson.toLowerCase().includes(q) ||
        c.email.toLowerCase().includes(q) ||
        c.phone.includes(q)
    );
  }, [clients, searchQuery]);

  const handleOpenAdd = () => {
    setEditingClient(null);
    setName('');
    setContactPerson('');
    setEmail('');
    setPhone('');
    setAddress('');
    setCity('Tiruchirappalli');
    setState('Tamil Nadu');
    setPincode('620018');
    setActive(true);
    setMonthlyServiceFee(null);
    setPosterCount(null);
    setReelCount(null);
    setShootingSessions(null);
    setAdBudgetPeriod('Monthly');
    setAdBudgetAmount(null);
    setAdBudgetCampaignName('');
    setClientServices([]);
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
    setActive(client.active);
    setMonthlyServiceFee(client.monthlyServiceFee ?? null);
    setPosterCount(client.deliverables?.posterCount ?? null);
    setReelCount(client.deliverables?.reelCount ?? null);
    setShootingSessions(client.deliverables?.shootingSessions ?? null);
    if (client.adBudget) {
      setAdBudgetPeriod(client.adBudget.period || 'Monthly');
      setAdBudgetAmount(client.adBudget.amount ?? null);
      setAdBudgetCampaignName(client.adBudget.campaignName || '');
    } else {
      const legacyAdSpend = client.services?.find((s) => s.adSpend && s.adSpend > 0)?.adSpend ?? null;
      setAdBudgetPeriod('Monthly');
      setAdBudgetAmount(legacyAdSpend);
      setAdBudgetCampaignName('');
    }
    setClientServices(client.services && client.services.length > 0 ? [...client.services] : []);
    setIsModalOpen(true);
  };

  const handleAddService = () => {
    const newService: ClientService = {
      id: `cs-${Date.now()}-${clientServices.length + 1}`,
      name: '',
      description: '',
      quantity: 1,
      rate: null, // Rate is optional
      billingFrequency: 'Monthly',
    };
    setClientServices((prev) => [...prev, newService]);
  };

  const handleRemoveService = (index: number) => {
    setClientServices((prev) => prev.filter((_, i) => i !== index));
  };

  const handleServiceChange = (index: number, field: keyof ClientService, value: any) => {
    setClientServices((prev) => {
      const copy = [...prev];
      copy[index] = { ...copy[index], [field]: value };
      return copy;
    });
  };

  const handleServiceSelectSuggestion = (index: number, suggestion: any) => {
    setClientServices((prev) => {
      const copy = [...prev];
      const existingRate = copy[index].rate;
      copy[index] = {
        ...copy[index],
        name: suggestion.name,
        description: suggestion.description || copy[index].description || '',
        rate: existingRate != null && existingRate > 0 ? existingRate : (suggestion.defaultRate || null),
      };
      return copy;
    });
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim()) return;

    try {
      setIsSubmitting(true);
      // Clean up empty services if user left blank rows
      const validServices = clientServices
        .filter((s) => s.name.trim())
        .map((s) => ({
          id: s.id,
          name: s.name.trim(),
          description: s.description ? s.description.trim() : '',
          quantity: Math.max(1, Number(s.quantity) || 1),
          rate: s.rate != null && !isNaN(Number(s.rate)) && Number(s.rate) >= 0 ? Number(s.rate) : null,
          billingFrequency: s.billingFrequency || 'Monthly',
        }));

      const adBudget: ClientAdBudget | null =
        adBudgetAmount != null && !isNaN(Number(adBudgetAmount)) && Number(adBudgetAmount) > 0
          ? {
              period: adBudgetPeriod,
              amount: Number(adBudgetAmount),
              campaignName: adBudgetPeriod === 'One-Time Campaign' ? adBudgetCampaignName.trim() : undefined,
            }
          : null;

      const hasPosters = posterCount != null && !isNaN(Number(posterCount)) && Number(posterCount) > 0;
      const hasReels = reelCount != null && !isNaN(Number(reelCount)) && Number(reelCount) > 0;
      const hasShoots = shootingSessions != null && !isNaN(Number(shootingSessions)) && Number(shootingSessions) > 0;

      const deliverables: ClientDeliverables | null = (hasPosters || hasReels || hasShoots)
        ? {
            posterCount: hasPosters ? Number(posterCount) : null,
            reelCount: hasReels ? Number(reelCount) : null,
            shootingSessions: hasShoots ? Number(shootingSessions) : null,
          }
        : null;

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
        monthlyServiceFee:
          monthlyServiceFee != null && !isNaN(Number(monthlyServiceFee)) && Number(monthlyServiceFee) > 0
            ? Number(monthlyServiceFee)
            : null,
        deliverables,
        adBudget,
        services: validServices,
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
          <div className="bg-[#FAF9F6] border border-[#DAD8D2] rounded-2xl max-w-3xl w-full p-6 shadow-2xl animate-in zoom-in-95 max-h-[92vh] flex flex-col">
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
                    placeholder="e.g. Acme Innovations Pvt Ltd"
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
                    placeholder="e.g. Rajesh Kumar"
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
                    placeholder="e.g. +91 98765 43210"
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
                    placeholder="e.g. billing@client.com"
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
                    placeholder="e.g. 123 Business Parkway, Suite 400"
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
                    State
                  </label>
                  <input
                    type="text"
                    value={state}
                    onChange={(e) => setState(e.target.value)}
                    placeholder="Tamil Nadu"
                    className="w-full px-3 py-2 text-sm bg-white border border-[#DAD8D2] rounded-xl focus:ring-2 focus:ring-[#C6A15B]"
                  />
                </div>

                <div className="sm:col-span-2">
                  <label className="block font-medium text-[#4C5056] mb-1">PIN Code</label>
                  <input
                    type="text"
                    value={pincode}
                    onChange={(e) => setPincode(e.target.value)}
                    placeholder="620001"
                    className="w-full px-3 py-2 text-sm bg-white border border-[#DAD8D2] rounded-xl focus:ring-2 focus:ring-[#C6A15B]"
                  />
                </div>

                {/* Total Recurring Monthly Service Package Fee (₹) */}
                <div className="sm:col-span-2 bg-[#FAF5E8]/60 border border-[#C6A15B]/30 rounded-xl p-3.5 space-y-2">
                  <div className="flex flex-wrap items-center justify-between gap-1">
                    <label htmlFor="client-monthly-service-fee" className="text-xs font-heading font-bold text-[#1A1B1E] flex items-center gap-1.5">
                      <span>Total Recurring Monthly Service Package Fee (₹)</span>
                      <span className="text-[10px] font-normal text-gray-500">(Main Package Retainer)</span>
                    </label>
                    {monthlyServiceFee != null && monthlyServiceFee > 0 && (
                      <span className="text-xs font-bold text-[#9A7832] bg-[#FAF5E8] px-2 py-0.5 rounded-md border border-[#C6A15B]/30">
                        ₹{monthlyServiceFee.toLocaleString('en-IN')}/month
                      </span>
                    )}
                  </div>
                  <p className="text-[11px] text-gray-600 leading-relaxed">
                    Total recurring monthly package fee charged by TechSozo for this client. When creating an invoice, you can select this Monthly Package Fee to bill all services under one consolidated amount without double-charging individual deliverables.
                  </p>
                  <div className="relative max-w-xs">
                    <span className="absolute left-3 top-2 text-sm font-semibold text-gray-500">₹</span>
                    <input
                      id="client-monthly-service-fee"
                      type="number"
                      min="0"
                      step="any"
                      placeholder="e.g. 55000 (Optional)"
                      value={monthlyServiceFee ?? ''}
                      onChange={(e) => {
                        const val = e.target.value.trim();
                        setMonthlyServiceFee(val === '' ? null : Math.max(0, parseFloat(val) || 0));
                      }}
                      className="w-full pl-7 pr-3 py-1.5 text-sm bg-white border border-[#DAD8D2] rounded-xl focus:ring-2 focus:ring-[#C6A15B]"
                    />
                  </div>
                </div>
              </div>

              {/* Services Provided Section */}
              <div className="pt-4 border-t border-[#DAD8D2] space-y-3">
                <div className="flex items-center justify-between">
                  <div>
                    <h4 className="text-sm font-heading font-bold text-[#1A1B1E] flex items-center gap-1.5">
                      <Briefcase className="w-4 h-4 text-[#C6A15B]" />
                      <span>Services Provided</span>
                    </h4>
                    <p className="text-[11px] text-gray-500">
                      Configure deliverables. Individual service fees are optional and blank by default when covered by the Monthly Package Fee.
                    </p>
                  </div>
                  <button
                    type="button"
                    onClick={handleAddService}
                    className="inline-flex items-center gap-1 px-3 py-1.5 bg-[#FAF5E8] hover:bg-[#F3EAD3] text-[#9A7832] font-semibold text-xs rounded-xl border border-[#C6A15B]/30 transition-colors"
                  >
                    <Plus className="w-3.5 h-3.5 stroke-[2.5]" />
                    <span>Add Service</span>
                  </button>
                </div>

                {clientServices.length === 0 ? (
                  <div className="bg-white border border-dashed border-[#DAD8D2] rounded-xl p-4 text-center">
                    <Briefcase className="w-6 h-6 text-gray-400 mx-auto mb-1 opacity-70" />
                    <p className="text-xs text-gray-600 font-medium">No default services configured yet</p>
                    <p className="text-[11px] text-gray-400 mt-0.5">
                      Add services now or enter them freely when creating invoices.
                    </p>
                    <button
                      type="button"
                      onClick={handleAddService}
                      className="mt-2 text-xs font-semibold text-[#C6A15B] hover:underline"
                    >
                      + Add First Service
                    </button>
                  </div>
                ) : (
                  <div className="space-y-3">
                    {clientServices.map((srv, idx) => (
                      <div
                        key={srv.id || idx}
                        className="bg-white border border-[#DAD8D2] rounded-xl p-3 space-y-2.5 relative shadow-2xs"
                      >
                        <div className="flex items-center justify-between gap-2">
                          <span className="text-[11px] font-bold text-[#C6A15B]">
                            Service #{idx + 1}
                          </span>
                          <button
                            type="button"
                            onClick={() => handleRemoveService(idx)}
                            className="text-gray-400 hover:text-red-500 p-1 rounded-md transition-colors"
                            title="Remove Service"
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                          </button>
                        </div>

                        <div className="grid grid-cols-1 sm:grid-cols-12 gap-2.5">
                          {/* Service Name with Autocomplete */}
                          <div className="sm:col-span-8">
                            <label className="block text-[10px] font-semibold text-gray-500 uppercase mb-1">
                              Service Name <span className="text-red-500">*</span>
                            </label>
                            <ServiceAutocomplete
                              value={srv.name}
                              onChange={(val) => handleServiceChange(idx, 'name', val)}
                              onSelectSuggestion={(sugg) => handleServiceSelectSuggestion(idx, sugg)}
                              catalogServices={services}
                              clientServices={clientServices}
                              placeholder="e.g. Social Media Management"
                              className="w-full px-2.5 py-1.5 text-xs bg-white border border-[#DAD8D2] rounded-lg focus:ring-2 focus:ring-[#C6A15B]"
                            />
                          </div>

                          {/* Optional Individual Service Fee (₹) */}
                          <div className="sm:col-span-4">
                            <label className="block text-[10px] font-semibold text-gray-500 uppercase mb-1">
                              Individual Service Fee (₹)
                              <span className="text-[9px] text-gray-400 font-normal ml-1 lowercase">(optional)</span>
                            </label>
                            <input
                              type="number"
                              min="0"
                              step="any"
                              placeholder="Optional / Package Included"
                              value={srv.rate ?? ''}
                              onChange={(e) => {
                                const val = e.target.value.trim();
                                handleServiceChange(idx, 'rate', val === '' ? null : Math.max(0, parseFloat(val) || 0));
                              }}
                              className="w-full px-2.5 py-1.5 text-xs bg-white border border-[#DAD8D2] rounded-lg focus:ring-2 focus:ring-[#C6A15B]"
                            />
                          </div>

                          {/* Service Scope / Description */}
                          <div className="sm:col-span-12">
                            <label className="block text-[10px] font-semibold text-gray-500 uppercase mb-1">
                              Service Scope / Description
                            </label>
                            <input
                              type="text"
                              value={srv.description}
                              onChange={(e) => handleServiceChange(idx, 'description', e.target.value)}
                              placeholder="Brief deliverables description..."
                              className="w-full px-2.5 py-1.5 text-xs bg-white border border-[#DAD8D2] rounded-lg focus:ring-2 focus:ring-[#C6A15B]"
                            />
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>

              {/* Manual Deliverables / Counts (Optional) Section */}
              <div className="pt-4 border-t border-[#DAD8D2] space-y-3">
                <div>
                  <div className="flex flex-wrap items-center justify-between gap-1">
                    <h4 className="text-sm font-heading font-bold text-[#1A1B1E] flex items-center gap-1.5">
                      <Layers className="w-4 h-4 text-[#C6A15B]" />
                      <span>Manual Deliverables / Counts (Optional)</span>
                    </h4>
                    {((posterCount != null && posterCount > 0) ||
                      (reelCount != null && reelCount > 0) ||
                      (shootingSessions != null && shootingSessions > 0)) && (
                      <div className="flex items-center gap-1.5 text-xs font-semibold text-[#8B6B23] bg-[#FAF5E8] px-2.5 py-0.5 rounded-md border border-[#C6A15B]/30">
                        {posterCount != null && posterCount > 0 && <span>{posterCount} Posters</span>}
                        {posterCount != null && posterCount > 0 && ((reelCount != null && reelCount > 0) || (shootingSessions != null && shootingSessions > 0)) && <span>•</span>}
                        {reelCount != null && reelCount > 0 && <span>{reelCount} Reels</span>}
                        {reelCount != null && reelCount > 0 && shootingSessions != null && shootingSessions > 0 && <span>•</span>}
                        {shootingSessions != null && shootingSessions > 0 && <span>{shootingSessions} Shoots</span>}
                      </div>
                    )}
                  </div>
                  <p className="text-[11px] text-gray-500 mt-1 leading-relaxed">
                    Optional. Enter agreed monthly deliverable counts manually. Leave blank if unmetered or not applicable. Blank and zero counts will never appear on the final invoice.
                  </p>
                </div>

                <div className="bg-white border border-[#DAD8D2] rounded-xl p-3.5 shadow-2xs">
                  <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                    {/* Poster Count */}
                    <div>
                      <label htmlFor="client-poster-count" className="block text-[11px] font-semibold text-[#4C5056] mb-1">
                        Poster Count
                      </label>
                      <input
                        id="client-poster-count"
                        type="number"
                        min="0"
                        step="1"
                        placeholder="e.g. 12 (Optional)"
                        value={posterCount ?? ''}
                        onChange={(e) => {
                          const val = e.target.value.trim();
                          setPosterCount(val === '' ? null : Math.max(0, parseInt(val, 10) || 0));
                        }}
                        className="w-full px-3 py-1.5 text-xs bg-[#FAF9F6] border border-[#DAD8D2] rounded-xl focus:ring-2 focus:ring-[#C6A15B]"
                      />
                      <span className="text-[10px] text-gray-400 mt-1 block">Monthly posters / creatives</span>
                    </div>

                    {/* Reel Count */}
                    <div>
                      <label htmlFor="client-reel-count" className="block text-[11px] font-semibold text-[#4C5056] mb-1">
                        Reel Count
                      </label>
                      <input
                        id="client-reel-count"
                        type="number"
                        min="0"
                        step="1"
                        placeholder="e.g. 8 (Optional)"
                        value={reelCount ?? ''}
                        onChange={(e) => {
                          const val = e.target.value.trim();
                          setReelCount(val === '' ? null : Math.max(0, parseInt(val, 10) || 0));
                        }}
                        className="w-full px-3 py-1.5 text-xs bg-[#FAF9F6] border border-[#DAD8D2] rounded-xl focus:ring-2 focus:ring-[#C6A15B]"
                      />
                      <span className="text-[10px] text-gray-400 mt-1 block">Monthly short-form reels</span>
                    </div>

                    {/* Shooting Sessions */}
                    <div>
                      <label htmlFor="client-shooting-sessions" className="block text-[11px] font-semibold text-[#4C5056] mb-1">
                        Shooting Sessions
                      </label>
                      <input
                        id="client-shooting-sessions"
                        type="number"
                        min="0"
                        step="1"
                        placeholder="e.g. 2 (Optional)"
                        value={shootingSessions ?? ''}
                        onChange={(e) => {
                          const val = e.target.value.trim();
                          setShootingSessions(val === '' ? null : Math.max(0, parseInt(val, 10) || 0));
                        }}
                        className="w-full px-3 py-1.5 text-xs bg-[#FAF9F6] border border-[#DAD8D2] rounded-xl focus:ring-2 focus:ring-[#C6A15B]"
                      />
                      <span className="text-[10px] text-gray-400 mt-1 block">On-site video/photo shoots</span>
                    </div>
                  </div>
                </div>
              </div>

              {/* Client Advertising Budget (Optional) Section */}
              <div className="pt-4 border-t border-[#DAD8D2] space-y-3">
                <div>
                  <div className="flex flex-wrap items-center justify-between gap-1">
                    <h4 className="text-sm font-heading font-bold text-[#1A1B1E] flex items-center gap-1.5">
                      <Megaphone className="w-4 h-4 text-[#C6A15B]" />
                      <span>Client Advertising Budget (Optional)</span>
                    </h4>
                    {adBudgetAmount != null && adBudgetAmount > 0 && (
                      <span className="text-xs font-bold text-amber-800 bg-amber-50 px-2 py-0.5 rounded-md border border-amber-200">
                        ₹{adBudgetAmount.toLocaleString('en-IN')}{adBudgetPeriod === 'Monthly' ? '/month' : ' (One-Time)'}
                      </span>
                    )}
                  </div>
                  <p className="text-[11px] text-gray-500 mt-1 leading-relaxed">
                    Optional. Enter the client's advertising budget only when known. This amount is paid directly by the client to Meta, Google, or the relevant advertising platform. It is separate from TechSozo's service fee and is not included in the invoice total automatically.
                  </p>
                </div>

                <div className="bg-white border border-[#DAD8D2] rounded-xl p-3.5 space-y-3 shadow-2xs">
                  {/* Period Selector */}
                  <div>
                    <label className="block text-[10px] font-semibold text-gray-500 uppercase mb-1.5">
                      Budget Period
                    </label>
                    <div className="inline-flex p-1 bg-[#FAF9F6] border border-[#DAD8D2] rounded-xl gap-1">
                      <button
                        type="button"
                        onClick={() => setAdBudgetPeriod('Monthly')}
                        className={`px-3 py-1.5 text-xs font-semibold rounded-lg transition-all ${
                          adBudgetPeriod === 'Monthly'
                            ? 'bg-[#C6A15B] text-[#292A2D] shadow-xs'
                            : 'text-gray-600 hover:text-gray-900 hover:bg-gray-100'
                        }`}
                      >
                        Monthly
                      </button>
                      <button
                        type="button"
                        onClick={() => setAdBudgetPeriod('One-Time Campaign')}
                        className={`px-3 py-1.5 text-xs font-semibold rounded-lg transition-all ${
                          adBudgetPeriod === 'One-Time Campaign'
                            ? 'bg-[#C6A15B] text-[#292A2D] shadow-xs'
                            : 'text-gray-600 hover:text-gray-900 hover:bg-gray-100'
                        }`}
                      >
                        One-Time Campaign
                      </button>
                    </div>
                  </div>

                  {/* Budget Inputs */}
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-1">
                    {adBudgetPeriod === 'Monthly' ? (
                      <div className="sm:col-span-1">
                        <label
                          htmlFor="client-estimated-monthly-ad-budget"
                          className="block text-[11px] font-semibold text-[#4C5056] mb-1"
                        >
                          Estimated Monthly Ad Budget (₹)
                        </label>
                        <div className="relative">
                          <span className="absolute left-3 top-2 text-sm font-semibold text-gray-500">₹</span>
                          <input
                            id="client-estimated-monthly-ad-budget"
                            type="number"
                            min="0"
                            step="any"
                            placeholder="e.g. 35000 (Optional)"
                            value={adBudgetAmount ?? ''}
                            onChange={(e) => {
                              const val = e.target.value.trim();
                              setAdBudgetAmount(val === '' ? null : Math.max(0, parseFloat(val) || 0));
                            }}
                            className="w-full pl-7 pr-3 py-1.5 text-xs bg-white border border-[#DAD8D2] rounded-xl focus:ring-2 focus:ring-[#C6A15B]"
                          />
                        </div>
                        <span className="text-[10px] text-gray-400 mt-1 block">
                          Leave blank if client's ad spend is unknown or not applicable.
                        </span>
                      </div>
                    ) : (
                      <>
                        <div>
                          <label
                            htmlFor="client-campaign-ad-budget"
                            className="block text-[11px] font-semibold text-[#4C5056] mb-1"
                          >
                            Campaign Budget (₹)
                          </label>
                          <div className="relative">
                            <span className="absolute left-3 top-2 text-sm font-semibold text-gray-500">₹</span>
                            <input
                              id="client-campaign-ad-budget"
                              type="number"
                              min="0"
                              step="any"
                              placeholder="e.g. 50000 (Optional)"
                              value={adBudgetAmount ?? ''}
                              onChange={(e) => {
                                const val = e.target.value.trim();
                                setAdBudgetAmount(val === '' ? null : Math.max(0, parseFloat(val) || 0));
                              }}
                              className="w-full pl-7 pr-3 py-1.5 text-xs bg-white border border-[#DAD8D2] rounded-xl focus:ring-2 focus:ring-[#C6A15B]"
                            />
                          </div>
                        </div>

                        <div>
                          <label
                            htmlFor="client-campaign-name"
                            className="block text-[11px] font-semibold text-[#4C5056] mb-1"
                          >
                            Campaign Name <span className="text-gray-400 font-normal">(Optional)</span>
                          </label>
                          <input
                            id="client-campaign-name"
                            type="text"
                            placeholder="e.g. Diwali Mega Sale 2026"
                            value={adBudgetCampaignName}
                            onChange={(e) => setAdBudgetCampaignName(e.target.value)}
                            className="w-full px-3 py-1.5 text-xs bg-white border border-[#DAD8D2] rounded-xl focus:ring-2 focus:ring-[#C6A15B]"
                          />
                        </div>
                      </>
                    )}
                  </div>
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
                  className="px-4 py-2 bg-[#F1F0ED] hover:bg-[#E5E3DD] text-[#4C5056] rounded-xl min-h-11"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={isSubmitting}
                  className="px-5 py-2 bg-[#C6A15B] hover:bg-[#B38E46] text-[#292A2D] font-heading font-semibold rounded-xl min-h-11"
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
          className="flex items-center gap-2 px-4 py-2.5 bg-[#C6A15B] hover:bg-[#B38E46] text-[#292A2D] font-heading font-semibold text-sm rounded-xl shadow-sm transition-all min-h-11"
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
            const invoiceCount = invoiceCountByClientId.get(client.id) || 0;

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

                  {/* Monthly Service Fee Retainer Banner (if set) */}
                  {client.monthlyServiceFee != null && client.monthlyServiceFee > 0 && (
                    <div className="mt-3 p-2 bg-[#FAF5E8] border border-[#C6A15B]/30 rounded-xl flex items-center justify-between">
                      <span className="text-[11px] font-semibold text-[#8B6B23]">
                        Monthly Service Fee:
                      </span>
                      <span className="text-xs font-bold text-[#1A1B1E]">
                        {formatINR(client.monthlyServiceFee)}/mo
                      </span>
                    </div>
                  )}

                  {/* Client Advertising Budget Reference Banner (if set) */}
                  {((client.adBudget?.amount != null && client.adBudget.amount > 0) ||
                    (client.services?.some((s) => s.adSpend && s.adSpend > 0))) && (
                    <div className="mt-2 p-2 bg-amber-50/70 border border-amber-200/80 rounded-xl flex items-center justify-between text-xs">
                      <div className="flex items-center gap-1.5 text-[11px] text-amber-900 font-medium">
                        <Megaphone className="w-3.5 h-3.5 text-amber-600 shrink-0" />
                        <span>
                          Ad Budget ({client.adBudget?.period || 'Monthly'}):
                        </span>
                        {client.adBudget?.campaignName && (
                          <span className="text-[10px] text-amber-700 truncate max-w-27.5" title={client.adBudget.campaignName}>
                            ({client.adBudget.campaignName})
                          </span>
                        )}
                      </div>
                      <span className="text-xs font-bold text-amber-950">
                        {formatINR(client.adBudget?.amount ?? client.services?.find((s) => s.adSpend)?.adSpend ?? 0)}
                        {(client.adBudget?.period || 'Monthly') === 'Monthly' ? '/mo' : ''}
                      </span>
                    </div>
                  )}

                  {/* Manual Deliverables Scope Badges (if configured) */}
                  {client.deliverables && (
                    (client.deliverables.posterCount != null && client.deliverables.posterCount > 0) ||
                    (client.deliverables.reelCount != null && client.deliverables.reelCount > 0) ||
                    (client.deliverables.shootingSessions != null && client.deliverables.shootingSessions > 0)
                  ) && (
                    <div className="mt-2 flex flex-wrap items-center gap-1.5 text-[11px]">
                      {client.deliverables.posterCount != null && client.deliverables.posterCount > 0 && (
                        <span className="px-2 py-0.5 bg-gray-100 text-gray-700 rounded-md border border-gray-200 font-medium">
                          <strong>{client.deliverables.posterCount}</strong> Posters
                        </span>
                      )}
                      {client.deliverables.reelCount != null && client.deliverables.reelCount > 0 && (
                        <span className="px-2 py-0.5 bg-gray-100 text-gray-700 rounded-md border border-gray-200 font-medium">
                          <strong>{client.deliverables.reelCount}</strong> Reels
                        </span>
                      )}
                      {client.deliverables.shootingSessions != null && client.deliverables.shootingSessions > 0 && (
                        <span className="px-2 py-0.5 bg-gray-100 text-gray-700 rounded-md border border-gray-200 font-medium">
                          <strong>{client.deliverables.shootingSessions}</strong> Shoots
                        </span>
                      )}
                    </div>
                  )}

                  {/* Configured Services Summary */}
                  <div className="mt-3 pt-2.5 border-t border-gray-100">
                    <div className="flex items-center justify-between text-[11px] font-semibold text-[#1A1B1E] mb-1.5">
                      <span className="flex items-center gap-1 text-[#C6A15B]">
                        <Briefcase className="w-3 h-3" />
                        <span>
                          {client.services && client.services.length > 0
                            ? `${client.services.length} Service${client.services.length > 1 ? 's' : ''} Provided`
                            : 'No Default Services'}
                        </span>
                      </span>
                      {client.services && client.services.length > 0 && (
                        <span className="text-[10px] text-gray-500 font-medium">
                          {client.monthlyServiceFee != null && client.monthlyServiceFee > 0
                            ? 'Package Retainer'
                            : formatINR(client.services.reduce((acc, s) => acc + (s.quantity * (s.rate || 0)), 0))}
                        </span>
                      )}
                    </div>

                    {client.services && client.services.length > 0 ? (
                      <div className="space-y-1">
                        {client.services.slice(0, 3).map((s) => (
                          <div
                            key={s.id}
                            className="flex items-center justify-between text-[11px] text-gray-600 bg-gray-50/80 px-2 py-0.5 rounded border border-gray-100"
                          >
                            <span className="truncate max-w-37.5 font-medium text-gray-800" title={s.name}>
                              {s.name}
                            </span>
                            <div className="flex items-center gap-1 shrink-0">
                              <span className="font-semibold text-gray-700">
                                {s.rate != null && s.rate > 0
                                  ? `${formatINR(s.rate)}${s.billingFrequency === 'Monthly' ? '/mo' : ''}`
                                  : 'Incl.'}
                              </span>
                            </div>
                          </div>
                        ))}
                        {client.services.length > 3 && (
                          <p className="text-[10px] text-gray-400 italic text-right">
                            +{client.services.length - 3} more service{client.services.length - 3 > 1 ? 's' : ''}
                          </p>
                        )}
                      </div>
                    ) : (
                      <p className="text-[11px] text-gray-400 italic">
                        Standard line items will be prompted on invoice creation.
                      </p>
                    )}
                  </div>
                </div>

                <div className="pt-3 border-t border-[#F1F0ED] flex items-center justify-between">
                  <span className="text-[11px] text-[#5C6068]">
                    {invoiceCount} invoice{invoiceCount !== 1 ? 's' : ''}
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
