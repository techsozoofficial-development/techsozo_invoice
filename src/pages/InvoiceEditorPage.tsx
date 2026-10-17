import React, { useState, useEffect } from 'react';
import { useApp } from '../context/AppContext';
import { InvoiceLineItem } from '../types';
import {
  calculateInvoiceTotals,
  calculateDefaultDueDate,
} from '../utils/calculations';
import { formatINR } from '../utils/indianNumbering';
import { ConfirmModal } from '../components/ui/ConfirmModal';
import {
  ArrowLeft,
  Plus,
  Trash2,
  Save,
  CheckCircle,
  HelpCircle,
  AlertCircle,
  UserPlus,
  FileCheck,
} from 'lucide-react';

export const InvoiceEditorPage: React.FC = () => {
  const {
    editingDraftId,
    setEditingDraftId,
    invoices,
    clients,
    services,
    companySettings,
    setActiveTab,
    setSelectedInvoiceId,
    saveDraftInvoice,
    finalizeInvoice,
    saveClient,
    addToast,
  } = useApp();

  const existingInvoice = invoices.find((i) => i.id === editingDraftId);

  // Form State
  const [clientId, setClientId] = useState<string>('');
  const [issueDate, setIssueDate] = useState<string>(
    new Date().toISOString().split('T')[0]
  );
  const [dueDate, setDueDate] = useState<string>(
    calculateDefaultDueDate(new Date().toISOString().split('T')[0], companySettings.defaultPaymentTermsDays || 15)
  );
  const [items, setItems] = useState<InvoiceLineItem[]>([
    {
      id: `item-${Date.now()}-1`,
      serviceId: services[0]?.id || '',
      description: services[0]?.name || 'Digital Marketing Retainer',
      sac: services[0]?.sac || '998361',
      quantity: 1,
      rate: services[0]?.defaultRate || 25000,
      amount: services[0]?.defaultRate || 25000,
    },
  ]);
  const [discountPercent, setDiscountPercent] = useState<number>(0);
  const [notes, setNotes] = useState<string>(companySettings.defaultNotes || '');
  const [paymentTerms, setPaymentTerms] = useState<string>(companySettings.defaultTerms || '');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isFinalizeModalOpen, setIsFinalizeModalOpen] = useState(false);

  // Inline Quick Add Client Modal State
  const [isQuickClientOpen, setIsQuickClientOpen] = useState(false);
  const [newClientName, setNewClientName] = useState('');
  const [newClientContact, setNewClientContact] = useState('');
  const [newClientEmail, setNewClientEmail] = useState('');
  const [newClientPhone, setNewClientPhone] = useState('');
  const [newClientState, setNewClientState] = useState('Tamil Nadu');

  // Prepopulate if editing existing draft
  useEffect(() => {
    if (existingInvoice) {
      if (existingInvoice.isFinalized) {
        addToast('Finalized invoices cannot be edited. Opening in preview mode.', 'warning');
        setSelectedInvoiceId(existingInvoice.id);
        setActiveTab('invoices');
        return;
      }
      setClientId(existingInvoice.clientId);
      setIssueDate(existingInvoice.issueDate);
      setDueDate(existingInvoice.dueDate);
      setItems(existingInvoice.items.length > 0 ? existingInvoice.items : []);
      setDiscountPercent(existingInvoice.discountPercent || 0);
      setNotes(existingInvoice.notes || companySettings.defaultNotes);
      setPaymentTerms(existingInvoice.paymentTerms || companySettings.defaultTerms);
    } else if (clients.length > 0 && !clientId) {
      setClientId(clients[0].id);
    }
  }, [existingInvoice, clients, companySettings, addToast, setSelectedInvoiceId, setActiveTab]);

  // Selected client details
  const selectedClient = clients.find((c) => c.id === clientId);

  // Auto recalculate live totals
  const liveCalculation = calculateInvoiceTotals({
    items,
    discountPercent,
    gstEnabled: companySettings.gstEnabled,
    gstRate: companySettings.defaultGstRate || 18,
    companyState: companySettings.state || 'Tamil Nadu',
    clientState: selectedClient?.state || 'Tamil Nadu',
  });

  // Handle Line Items
  const handleAddItem = () => {
    const defaultSrv = services[0];
    const newItem: InvoiceLineItem = {
      id: `item-${Date.now()}-${items.length + 1}`,
      serviceId: defaultSrv?.id,
      description: defaultSrv?.name || 'Consulting & Marketing Services',
      sac: defaultSrv?.sac || '998361',
      quantity: 1,
      rate: defaultSrv?.defaultRate || 10000,
      amount: defaultSrv?.defaultRate || 10000,
    };
    setItems((prev) => [...prev, newItem]);
  };

  const handleRemoveItem = (index: number) => {
    if (items.length <= 1) {
      addToast('An invoice must contain at least one line item.', 'warning');
      return;
    }
    setItems((prev) => prev.filter((_, i) => i !== index));
  };

  const handleItemChange = (index: number, field: keyof InvoiceLineItem, value: any) => {
    setItems((prev) => {
      const copy = [...prev];
      const item = { ...copy[index] };

      if (field === 'serviceId') {
        item.serviceId = value;
        const found = services.find((s) => s.id === value);
        if (found) {
          item.description = found.name;
          item.rate = found.defaultRate;
          item.sac = found.sac || '998361';
          item.amount = item.quantity * found.defaultRate;
        }
      } else if (field === 'quantity') {
        const qty = Math.max(0, parseFloat(value) || 0);
        item.quantity = qty;
        item.amount = Math.round(qty * item.rate * 100) / 100;
      } else if (field === 'rate') {
        const rate = Math.max(0, parseFloat(value) || 0);
        item.rate = rate;
        item.amount = Math.round(item.quantity * rate * 100) / 100;
      } else {
        (item as any)[field] = value;
      }

      copy[index] = item;
      return copy;
    });
  };

  const handleIssueDateChange = (newDate: string) => {
    setIssueDate(newDate);
    setDueDate(calculateDefaultDueDate(newDate, companySettings.defaultPaymentTermsDays || 15));
  };

  const handleSaveDraft = async () => {
    if (!clientId) {
      addToast('Please select a client for this invoice.', 'error');
      return;
    }
    if (items.length === 0) {
      addToast('Please include at least one item.', 'error');
      return;
    }

    try {
      setIsSubmitting(true);
      const saved = await saveDraftInvoice({
        id: editingDraftId || undefined,
        clientId,
        issueDate,
        dueDate,
        items,
        discountPercent,
        notes,
        paymentTerms,
      });

      setSelectedInvoiceId(saved.id);
      setActiveTab('invoices');
    } catch (err: any) {
      // Error handled in AppContext
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleFinalizeConfirm = async () => {
    setIsFinalizeModalOpen(false);
    try {
      setIsSubmitting(true);
      // First save draft
      const savedDraft = await saveDraftInvoice({
        id: editingDraftId || undefined,
        clientId,
        issueDate,
        dueDate,
        items,
        discountPercent,
        notes,
        paymentTerms,
      });
      // Then finalize
      const finalized = await finalizeInvoice(savedDraft.id, issueDate);
      setSelectedInvoiceId(finalized.id);
      setActiveTab('invoices');
    } catch (err: any) {
      // Handled
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleQuickAddClient = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newClientName.trim()) return;

    try {
      const created = await saveClient({
        name: newClientName.trim(),
        contactPerson: newClientContact.trim(),
        email: newClientEmail.trim(),
        phone: newClientPhone.trim(),
        address: 'Thillai Nagar',
        city: 'Tiruchirappalli',
        state: newClientState.trim(),
        pincode: '620018',
        active: true,
      });

      setClientId(created.id);
      setIsQuickClientOpen(false);
      setNewClientName('');
      setNewClientContact('');
      setNewClientEmail('');
      setNewClientPhone('');
    } catch (err: any) {
      // Handled
    }
  };

  return (
    <div className="space-y-6 animate-in fade-in duration-200">
      {/* Confirmation Modal for Finalize */}
      <ConfirmModal
        isOpen={isFinalizeModalOpen}
        onClose={() => setIsFinalizeModalOpen(false)}
        onConfirm={handleFinalizeConfirm}
        title="Finalize & Lock Invoice?"
        description="Finalizing will assign an official statutory invoice number (INV/26-27/xxx). Line items, tax calculations, and figures will be legally frozen and cannot be modified or deleted. Do you wish to proceed?"
        confirmLabel="Finalize & Lock Invoice"
        variant="primary"
        isLoading={isSubmitting}
      />

      {/* Inline Quick Add Client Modal */}
      {isQuickClientOpen && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-xs animate-in fade-in no-print"
          role="dialog"
          aria-modal="true"
        >
          <div className="bg-[#FAF9F6] border border-[#DAD8D2] rounded-2xl max-w-md w-full p-6 shadow-2xl">
            <h3 className="text-base font-heading font-bold text-[#1A1B1E] mb-3 flex items-center gap-2">
              <UserPlus className="w-5 h-5 text-[#C6A15B]" />
              <span>Quick Add Client</span>
            </h3>
            <form onSubmit={handleQuickAddClient} className="space-y-3 text-xs">
              <div>
                <label className="block font-medium text-[#4C5056] mb-1">Company / Client Name *</label>
                <input
                  type="text"
                  required
                  value={newClientName}
                  onChange={(e) => setNewClientName(e.target.value)}
                  placeholder="e.g. Cauvery Builders"
                  className="w-full px-3 py-2 bg-white border border-[#DAD8D2] rounded-xl"
                />
              </div>
              <div>
                <label className="block font-medium text-[#4C5056] mb-1">Contact Person</label>
                <input
                  type="text"
                  value={newClientContact}
                  onChange={(e) => setNewClientContact(e.target.value)}
                  placeholder="e.g. Mr. R. Senthil Kumar"
                  className="w-full px-3 py-2 bg-white border border-[#DAD8D2] rounded-xl"
                />
              </div>
              <div className="grid grid-cols-2 gap-2">
                <div>
                  <label className="block font-medium text-[#4C5056] mb-1">Email</label>
                  <input
                    type="email"
                    value={newClientEmail}
                    onChange={(e) => setNewClientEmail(e.target.value)}
                    placeholder="billing@client.com"
                    className="w-full px-3 py-2 bg-white border border-[#DAD8D2] rounded-xl"
                  />
                </div>
                <div>
                  <label className="block font-medium text-[#4C5056] mb-1">Phone</label>
                  <input
                    type="tel"
                    value={newClientPhone}
                    onChange={(e) => setNewClientPhone(e.target.value)}
                    placeholder="+91 98432 11223"
                    className="w-full px-3 py-2 bg-white border border-[#DAD8D2] rounded-xl"
                  />
                </div>
              </div>
              <div>
                <label className="block font-medium text-[#4C5056] mb-1">State</label>
                <input
                  type="text"
                  value={newClientState}
                  onChange={(e) => setNewClientState(e.target.value)}
                  className="w-full px-3 py-2 bg-white border border-[#DAD8D2] rounded-xl"
                />
              </div>

              <div className="flex justify-end gap-2 pt-3 border-t border-[#DAD8D2]">
                <button
                  type="button"
                  onClick={() => setIsQuickClientOpen(false)}
                  className="px-4 py-2 bg-[#F1F0ED] rounded-xl text-[#4C5056]"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-4 py-2 bg-[#C6A15B] text-[#292A2D] font-semibold rounded-xl"
                >
                  Save & Select Client
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Navigation & Header */}
      <div className="flex items-center justify-between">
        <button
          onClick={() => {
            setEditingDraftId(null);
            setActiveTab('invoices');
          }}
          className="flex items-center gap-2 text-xs font-semibold text-[#5C6068] hover:text-[#1A1B1E] transition-colors"
        >
          <ArrowLeft className="w-4 h-4" />
          <span>Back to Invoices Ledger</span>
        </button>

        <span className="text-xs font-semibold uppercase tracking-wider px-3 py-1 bg-[#FAF5E8] text-[#9A7832] rounded-full border border-[#C6A15B]/30">
          {editingDraftId ? 'Editing Draft Invoice' : 'New Invoice Draft'}
        </span>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* ================= LEFT 2 COLUMNS: FORM ================= */}
        <div className="lg:col-span-2 space-y-6">
          {/* Card 1: Client & Dates */}
          <div className="bg-white p-5 rounded-2xl border border-[#DAD8D2] shadow-xs space-y-4">
            <h3 className="font-heading font-semibold text-sm text-[#1A1B1E] uppercase tracking-wider">
              Client & Billing Schedule
            </h3>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              {/* Client Selector */}
              <div className="sm:col-span-2">
                <div className="flex items-center justify-between mb-1">
                  <label className="text-xs font-medium text-[#4C5056]">
                    Bill To Client <span className="text-red-500">*</span>
                  </label>
                  <button
                    type="button"
                    onClick={() => setIsQuickClientOpen(true)}
                    className="text-xs font-semibold text-[#9A7832] hover:text-[#C6A15B] flex items-center gap-1"
                  >
                    <Plus className="w-3.5 h-3.5" />
                    <span>Quick Add Client</span>
                  </button>
                </div>
                <select
                  value={clientId}
                  onChange={(e) => setClientId(e.target.value)}
                  className="w-full px-3.5 py-2.5 text-sm bg-[#FAF9F6] border border-[#DAD8D2] rounded-xl focus:ring-2 focus:ring-[#C6A15B]"
                >
                  <option value="">-- Choose Client --</option>
                  {clients.map((c) => (
                    <option key={c.id} value={c.id}>
                      {c.name} {c.city ? `(${c.city})` : ''}
                    </option>
                  ))}
                </select>

                {selectedClient && (
                  <div className="mt-2.5 p-3 rounded-xl bg-[#FAF9F6] border border-[#DAD8D2] text-xs text-[#5C6068] flex items-start justify-between">
                    <div>
                      <p className="font-semibold text-[#1A1B1E]">{selectedClient.name}</p>
                      <p>{selectedClient.contactPerson} • {selectedClient.phone}</p>
                      <p>{selectedClient.address}, {selectedClient.city}, {selectedClient.state} - {selectedClient.pincode}</p>
                    </div>
                    {selectedClient.gstin && (
                      <span className="text-[10px] bg-white px-2 py-0.5 rounded border border-[#DAD8D2] text-[#292A2D] font-mono">
                        GSTIN: {selectedClient.gstin}
                      </span>
                    )}
                  </div>
                )}
              </div>

              {/* Issue Date */}
              <div>
                <label className="block text-xs font-medium text-[#4C5056] mb-1">
                  Invoice Date <span className="text-red-500">*</span>
                </label>
                <input
                  type="date"
                  value={issueDate}
                  onChange={(e) => handleIssueDateChange(e.target.value)}
                  className="w-full px-3 py-2 text-sm bg-[#FAF9F6] border border-[#DAD8D2] rounded-xl focus:ring-2 focus:ring-[#C6A15B]"
                />
              </div>

              {/* Due Date */}
              <div>
                <label className="block text-xs font-medium text-[#4C5056] mb-1">
                  Due Date <span className="text-red-500">*</span>
                </label>
                <input
                  type="date"
                  value={dueDate}
                  onChange={(e) => setDueDate(e.target.value)}
                  className="w-full px-3 py-2 text-sm bg-[#FAF9F6] border border-[#DAD8D2] rounded-xl focus:ring-2 focus:ring-[#C6A15B]"
                />
                <span className="text-[10px] text-[#5C6068] mt-0.5 block">
                  Defaults to {companySettings.defaultPaymentTermsDays || 15} days from issue
                </span>
              </div>
            </div>
          </div>

            {/* Card 2: Line Items */}
          <div className="bg-white p-5 rounded-2xl border border-[#DAD8D2] shadow-xs space-y-4">
            <div className="flex items-center justify-between">
              <h3 className="font-heading font-semibold text-sm text-[#1A1B1E] uppercase tracking-wider">
                Line Items & Services
              </h3>
              <button
                type="button"
                onClick={handleAddItem}
                className="flex items-center gap-1.5 px-3 py-1.5 bg-[#FAF5E8] hover:bg-[#C6A15B] hover:text-[#292A2D] text-[#9A7832] font-semibold text-xs rounded-xl border border-[#C6A15B]/30 transition-colors"
              >
                <Plus className="w-3.5 h-3.5" />
                <span>Add Item</span>
              </button>
            </div>

            {/* Item Rows */}
            <div className="space-y-3">
              {items.map((item, index) => (
                <div
                  key={item.id}
                  className="p-3.5 rounded-xl border border-[#DAD8D2] bg-[#FAF9F6] space-y-3"
                >
                  <div className="flex items-start justify-between gap-2">
                    <span className="text-xs font-bold text-[#5C6068]">Item #{index + 1}</span>
                    <button
                      type="button"
                      onClick={() => handleRemoveItem(index)}
                      className="text-red-500 hover:text-red-700 p-1"
                      title="Remove item"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-12 gap-3">
                    {/* Service preset */}
                    <div className="sm:col-span-5">
                      <label className="block text-[11px] font-medium text-[#4C5056] mb-1">
                        Preset Service
                      </label>
                      <select
                        value={item.serviceId || ''}
                        onChange={(e) => handleItemChange(index, 'serviceId', e.target.value)}
                        className="w-full px-2.5 py-1.5 text-xs bg-white border border-[#DAD8D2] rounded-lg focus:ring-2 focus:ring-[#C6A15B]"
                      >
                        <option value="">-- Custom Entry --</option>
                        {services.map((s) => (
                          <option key={s.id} value={s.id}>
                            {s.name} (₹{s.defaultRate.toLocaleString('en-IN')})
                          </option>
                        ))}
                      </select>
                    </div>

                    {/* SAC Code */}
                    <div className="sm:col-span-2">
                      <label className="block text-[11px] font-medium text-[#4C5056] mb-1">
                        SAC
                      </label>
                      <input
                        type="text"
                        value={item.sac || ''}
                        onChange={(e) => handleItemChange(index, 'sac', e.target.value)}
                        placeholder="998361"
                        className="w-full px-2.5 py-1.5 text-xs bg-white border border-[#DAD8D2] rounded-lg font-mono"
                      />
                    </div>

                    {/* Qty */}
                    <div className="sm:col-span-2">
                      <label className="block text-[11px] font-medium text-[#4C5056] mb-1">
                        Qty
                      </label>
                      <input
                        type="number"
                        min="0.1"
                        step="0.1"
                        value={item.quantity}
                        onChange={(e) => handleItemChange(index, 'quantity', e.target.value)}
                        className="w-full px-2.5 py-1.5 text-xs bg-white border border-[#DAD8D2] rounded-lg"
                      />
                    </div>

                    {/* Rate */}
                    <div className="sm:col-span-3">
                      <label className="block text-[11px] font-medium text-[#4C5056] mb-1">
                        Rate (₹)
                      </label>
                      <input
                        type="number"
                        min="0"
                        step="1"
                        value={item.rate}
                        onChange={(e) => handleItemChange(index, 'rate', e.target.value)}
                        className="w-full px-2.5 py-1.5 text-xs bg-white border border-[#DAD8D2] rounded-lg font-medium"
                      />
                    </div>

                    {/* Description */}
                    <div className="sm:col-span-9">
                      <label className="block text-[11px] font-medium text-[#4C5056] mb-1">
                        Detailed Description
                      </label>
                      <input
                        type="text"
                        value={item.description}
                        onChange={(e) => handleItemChange(index, 'description', e.target.value)}
                        placeholder="Deliverables & scope details..."
                        className="w-full px-2.5 py-1.5 text-xs bg-white border border-[#DAD8D2] rounded-lg"
                      />
                    </div>

                    {/* Line Total */}
                    <div className="sm:col-span-3 text-right">
                      <label className="block text-[11px] font-medium text-[#4C5056] mb-1">
                        Line Total
                      </label>
                      <div className="text-sm font-heading font-bold text-[#1A1B1E] pt-1.5 tabular-nums">
                        {formatINR(item.amount)}
                      </div>
                    </div>
                  </div>
                </div>
              ))}
            </div>

            <button
              type="button"
              onClick={handleAddItem}
              className="w-full py-2.5 border-2 border-dashed border-[#DAD8D2] hover:border-[#C6A15B] text-[#5C6068] hover:text-[#292A2D] text-xs font-semibold rounded-xl flex items-center justify-center gap-1.5 transition-colors"
            >
              <Plus className="w-4 h-4 text-[#C6A15B]" />
              <span>Add Another Service Line</span>
            </button>
          </div>

          {/* Card 3: Notes & Terms */}
          <div className="bg-white p-5 rounded-2xl border border-[#DAD8D2] shadow-xs space-y-4">
            <h3 className="font-heading font-semibold text-sm text-[#1A1B1E] uppercase tracking-wider">
              Notes & Contract Terms
            </h3>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label className="block text-xs font-medium text-[#4C5056] mb-1">
                  Client Notes & Remittance Message
                </label>
                <textarea
                  rows={4}
                  value={notes}
                  onChange={(e) => setNotes(e.target.value)}
                  className="w-full px-3 py-2 text-xs bg-[#FAF9F6] border border-[#DAD8D2] rounded-xl"
                />
              </div>

              <div>
                <label className="block text-xs font-medium text-[#4C5056] mb-1">
                  Payment Terms & Conditions
                </label>
                <textarea
                  rows={4}
                  value={paymentTerms}
                  onChange={(e) => setPaymentTerms(e.target.value)}
                  className="w-full px-3 py-2 text-xs bg-[#FAF9F6] border border-[#DAD8D2] rounded-xl"
                />
              </div>
            </div>
          </div>
        </div>

        {/* ================= RIGHT 1 COLUMN: LIVE FINANCIAL SUMMARY ================= */}
        <div className="space-y-6">
          <div className="bg-white p-5 rounded-2xl border border-[#DAD8D2] shadow-md sticky top-20 space-y-4">
            <div className="border-b border-[#DAD8D2] pb-3">
              <span className="text-xs font-semibold uppercase tracking-wider text-[#9A7832]">
                Accounting Summary
              </span>
              <h3 className="font-heading font-bold text-lg text-[#1A1B1E]">
                Financial Preview
              </h3>
            </div>

            {/* Subtotal & Discount */}
            <div className="space-y-2.5 text-xs text-[#4C5056]">
              <div className="flex justify-between items-center">
                <span>Subtotal ({items.length} items):</span>
                <span className="font-medium text-[#1A1B1E] tabular-nums">
                  {formatINR(liveCalculation.subtotal)}
                </span>
              </div>

              {/* Discount Input */}
              <div className="pt-2 border-t border-[#F1F0ED]">
                <div className="flex items-center justify-between gap-2">
                  <span className="shrink-0">Discount (%):</span>
                  <input
                    type="number"
                    min="0"
                    max="100"
                    value={discountPercent}
                    onChange={(e) => setDiscountPercent(parseFloat(e.target.value) || 0)}
                    className="w-20 px-2 py-1 text-right text-xs bg-[#FAF9F6] border border-[#DAD8D2] rounded-lg font-medium"
                  />
                </div>
                {liveCalculation.discountAmount > 0 && (
                  <div className="flex justify-between items-center text-red-600 mt-1">
                    <span>Discount Deduction:</span>
                    <span className="tabular-nums font-medium">
                      - {formatINR(liveCalculation.discountAmount)}
                    </span>
                  </div>
                )}
              </div>

              {/* Taxable Amount */}
              <div className="flex justify-between items-center pt-2 border-t border-[#F1F0ED]">
                <span>Taxable Subtotal:</span>
                <span className="font-semibold text-[#1A1B1E] tabular-nums">
                  {formatINR(liveCalculation.taxableAmount)}
                </span>
              </div>

              {/* GST Breakdown (if enabled) */}
              {companySettings.gstEnabled ? (
                <div className="p-3 rounded-xl bg-[#FAF9F6] border border-[#DAD8D2] space-y-1.5 mt-2">
                  <div className="flex justify-between text-[11px] font-semibold text-[#292A2D]">
                    <span>
                      GST Mode: {liveCalculation.taxSnapshot.isInterstate ? 'Interstate (IGST)' : 'Intra-State (CGST + SGST)'}
                    </span>
                    <span>{companySettings.defaultGstRate || 18}%</span>
                  </div>

                  {liveCalculation.taxSnapshot.isInterstate ? (
                    <div className="flex justify-between text-[11px]">
                      <span>IGST ({liveCalculation.taxSnapshot.igstRate}%):</span>
                      <span className="tabular-nums font-medium">
                        {formatINR(liveCalculation.taxSnapshot.igstAmount)}
                      </span>
                    </div>
                  ) : (
                    <>
                      <div className="flex justify-between text-[11px]">
                        <span>CGST ({liveCalculation.taxSnapshot.cgstRate}%):</span>
                        <span className="tabular-nums font-medium">
                          {formatINR(liveCalculation.taxSnapshot.cgstAmount)}
                        </span>
                      </div>
                      <div className="flex justify-between text-[11px]">
                        <span>SGST ({liveCalculation.taxSnapshot.sgstRate}%):</span>
                        <span className="tabular-nums font-medium">
                          {formatINR(liveCalculation.taxSnapshot.sgstAmount)}
                        </span>
                      </div>
                    </>
                  )}

                  <p className="text-[10px] text-[#8E929B] italic pt-1 border-t border-[#DAD8D2]">
                    *Snapshot will lock into finalized invoice. Verify with your CA before commercial filing.
                  </p>
                </div>
              ) : (
                <div className="p-2.5 rounded-xl bg-[#FAF9F6] border border-[#DAD8D2] text-[11px] text-[#5C6068]">
                  <span>GST is currently <strong>OFF</strong>. Document will generate as a non-tax Invoice.</span>
                </div>
              )}

              {/* Round-off */}
              {liveCalculation.roundOff !== 0 && (
                <div className="flex justify-between items-center pt-1 text-[11px]">
                  <span>Round-off (nearest ₹):</span>
                  <span className="tabular-nums font-medium">
                    {liveCalculation.roundOff > 0 ? `+${liveCalculation.roundOff}` : liveCalculation.roundOff}
                  </span>
                </div>
              )}
            </div>

            {/* Grand Total */}
            <div className="pt-3 border-t-2 border-[#292A2D] flex justify-between items-baseline">
              <span className="font-heading font-bold text-sm text-[#292A2D]">Total Payable:</span>
              <span className="font-heading font-extrabold text-2xl text-[#292A2D] tabular-nums">
                {formatINR(liveCalculation.total)}
              </span>
            </div>

            {/* Amount In Words */}
            <div className="p-3 rounded-xl bg-[#FAF5E8] border border-[#C6A15B]/30 text-xs">
              <span className="text-[10px] uppercase font-bold text-[#9A7832] block mb-0.5">
                Amount in Words (Indian System):
              </span>
              <p className="font-semibold text-[#292A2D] leading-snug">
                {liveCalculation.amountInWords}
              </p>
            </div>

            {/* Action Buttons */}
            <div className="space-y-2 pt-2">
              <button
                type="button"
                onClick={handleSaveDraft}
                disabled={isSubmitting}
                className="w-full flex items-center justify-center gap-2 px-4 py-3 bg-[#FAF9F6] hover:bg-[#F1F0ED] text-[#292A2D] font-semibold text-xs rounded-xl border border-[#DAD8D2] transition-colors min-h-[44px]"
              >
                <Save className="w-4 h-4 text-[#5C6068]" />
                <span>Save Draft (No Number Assigned)</span>
              </button>

              <button
                type="button"
                onClick={() => setIsFinalizeModalOpen(true)}
                disabled={isSubmitting}
                className="w-full flex items-center justify-center gap-2 px-4 py-3 bg-[#C6A15B] hover:bg-[#B38E46] text-[#292A2D] font-heading font-bold text-sm rounded-xl shadow-md transition-all active:scale-[0.98] min-h-[44px]"
              >
                <FileCheck className="w-4 h-4 stroke-[2.5]" />
                <span>Finalize & Assign Invoice #</span>
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
