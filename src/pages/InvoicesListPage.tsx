import React, { useState } from 'react';
import { useApp } from '../context/AppContext';
import { Invoice, InvoiceStatus } from '../types';
import { formatINR } from '../utils/indianNumbering';
import {
  calculateOutstandingBalance,
  calculateReceivedAmount,
} from '../utils/calculations';
import { ConfirmModal } from '../components/ui/ConfirmModal';
import { PaymentManagerModal } from '../components/payments/PaymentManagerModal';
import { OutstandingReminderModal } from '../components/reminders/OutstandingReminderModal';
import {
  Search,
  Filter,
  Plus,
  Eye,
  Edit,
  Trash2,
  CheckCircle2,
  Clock,
  AlertTriangle,
  CreditCard,
  Send,
  Ban,
  ArrowUpDown,
  MoreVertical,
} from 'lucide-react';

export const InvoicesListPage: React.FC = () => {
  const {
    invoices,
    payments,
    clients,
    setActiveTab,
    setSelectedInvoiceId,
    setEditingDraftId,
    deleteDraftInvoice,
    cancelInvoice,
    finalizeInvoice,
    paymentModalInvoiceId,
    setPaymentModalInvoiceId,
    reminderModalInvoiceId,
    setReminderModalInvoiceId,
    invoiceListInitialFilter,
    setInvoiceListInitialFilter,
    addToast,
  } = useApp();

  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState<string>(invoiceListInitialFilter || 'all');
  const [clientFilter, setClientFilter] = useState<string>('all');
  const [sortBy, setSortBy] = useState<'date_desc' | 'date_asc' | 'amount_desc' | 'amount_asc'>('date_desc');

  // Sync if initialFilter changes externally
  React.useEffect(() => {
    if (invoiceListInitialFilter) {
      setStatusFilter(invoiceListInitialFilter);
    }
  }, [invoiceListInitialFilter]);

  // Confirmation Modals State
  const [deletingDraftId, setDeletingDraftId] = useState<string | null>(null);
  const [cancellingInvoiceId, setCancellingInvoiceId] = useState<string | null>(null);
  const [finalizingInvoiceId, setFinalizingInvoiceId] = useState<string | null>(null);

  // Filter & Search
  const filteredInvoices = invoices
    .filter((inv) => {
      // Status filter
      if (statusFilter !== 'all' && inv.status !== statusFilter) {
        return false;
      }
      // Client filter
      if (clientFilter !== 'all' && inv.clientId !== clientFilter) {
        return false;
      }
      // Search query
      if (searchQuery.trim()) {
        const query = searchQuery.toLowerCase();
        const numberMatch = (inv.invoiceNumber || 'draft').toLowerCase().includes(query);
        const clientMatch = (inv.clientSnapshot?.name || '').toLowerCase().includes(query);
        const contactMatch = (inv.clientSnapshot?.contactPerson || '').toLowerCase().includes(query);
        return numberMatch || clientMatch || contactMatch;
      }
      return true;
    })
    .sort((a, b) => {
      if (sortBy === 'date_desc') {
        return new Date(b.issueDate).getTime() - new Date(a.issueDate).getTime();
      }
      if (sortBy === 'date_asc') {
        return new Date(a.issueDate).getTime() - new Date(b.issueDate).getTime();
      }
      if (sortBy === 'amount_desc') {
        return b.total - a.total;
      }
      if (sortBy === 'amount_asc') {
        return a.total - b.total;
      }
      return 0;
    });

  const handleView = (invoiceId: string) => {
    setSelectedInvoiceId(invoiceId);
  };

  const handleEdit = (invoiceId: string) => {
    setEditingDraftId(invoiceId);
    setActiveTab('create_invoice');
  };

  const handleDeleteDraft = async () => {
    if (!deletingDraftId) return;
    await deleteDraftInvoice(deletingDraftId);
    setDeletingDraftId(null);
  };

  const handleCancelInvoice = async (reason?: string) => {
    if (!cancellingInvoiceId) return;
    await cancelInvoice(cancellingInvoiceId, reason || 'Cancelled by authorized user.');
    setCancellingInvoiceId(null);
  };

  const handleFinalizeConfirm = async () => {
    if (!finalizingInvoiceId) return;
    await finalizeInvoice(finalizingInvoiceId);
    setFinalizingInvoiceId(null);
  };

  const statusBadge = (status: InvoiceStatus) => {
    switch (status) {
      case 'paid':
        return (
          <span className="inline-flex items-center gap-1 text-[11px] font-semibold px-2.5 py-0.5 rounded-full bg-emerald-100 text-[#15803D] border border-emerald-200">
            <CheckCircle2 className="w-3 h-3" />
            <span>Paid</span>
          </span>
        );
      case 'partially_paid':
        return (
          <span className="inline-flex items-center gap-1 text-[11px] font-semibold px-2.5 py-0.5 rounded-full bg-amber-100 text-[#9A7832] border border-amber-200">
            <Clock className="w-3 h-3" />
            <span>Partially Paid</span>
          </span>
        );
      case 'overdue':
        return (
          <span className="inline-flex items-center gap-1 text-[11px] font-semibold px-2.5 py-0.5 rounded-full bg-red-100 text-[#B91C1C] border border-red-200">
            <AlertTriangle className="w-3 h-3" />
            <span>Overdue</span>
          </span>
        );
      case 'sent':
        return (
          <span className="inline-flex items-center gap-1 text-[11px] font-semibold px-2.5 py-0.5 rounded-full bg-blue-50 text-blue-700 border border-blue-200">
            <Send className="w-3 h-3" />
            <span>Sent (Unpaid)</span>
          </span>
        );
      case 'draft':
        return (
          <span className="inline-flex items-center gap-1 text-[11px] font-semibold px-2.5 py-0.5 rounded-full bg-gray-100 text-[#4C5056] border border-[#DAD8D2]">
            <span>Draft</span>
          </span>
        );
      case 'cancelled':
        return (
          <span className="inline-flex items-center gap-1 text-[11px] font-semibold px-2.5 py-0.5 rounded-full bg-neutral-100 text-[#5C6068] line-through border border-neutral-300">
            <Ban className="w-3 h-3" />
            <span>Cancelled</span>
          </span>
        );
    }
  };

  return (
    <div className="space-y-6 animate-in fade-in duration-200">
      {/* Modals */}
      {paymentModalInvoiceId && (
        <PaymentManagerModal
          invoiceId={paymentModalInvoiceId}
          onClose={() => setPaymentModalInvoiceId(null)}
        />
      )}

      {reminderModalInvoiceId && (
        <OutstandingReminderModal
          invoiceId={reminderModalInvoiceId}
          onClose={() => setReminderModalInvoiceId(null)}
        />
      )}

      {/* Delete Draft Confirm */}
      <ConfirmModal
        isOpen={Boolean(deletingDraftId)}
        onClose={() => setDeletingDraftId(null)}
        onConfirm={handleDeleteDraft}
        title="Delete Draft Invoice?"
        description="Are you sure you want to permanently remove this unfinalized draft? This action cannot be undone."
        confirmLabel="Delete Draft"
        variant="danger"
      />

      {/* Cancel Finalized Invoice Confirm */}
      <ConfirmModal
        isOpen={Boolean(cancellingInvoiceId)}
        onClose={() => setCancellingInvoiceId(null)}
        onConfirm={handleCancelInvoice}
        title="Cancel Finalized Invoice?"
        description="Cancelling a finalized invoice permanently locks its status and prevents further payments. The sequential invoice number will never be reused, preserving the statutory audit trail."
        confirmLabel="Cancel Invoice"
        variant="warning"
        requireReason={true}
        reasonPlaceholder="e.g. Client requested revised line items / billing details"
      />

      {/* Finalize Draft Confirm */}
      <ConfirmModal
        isOpen={Boolean(finalizingInvoiceId)}
        onClose={() => setFinalizingInvoiceId(null)}
        onConfirm={handleFinalizeConfirm}
        title="Finalize & Lock Invoice?"
        description="Finalizing assigns a permanent statutory invoice number (INV/26-27/xxx). Once finalized, line items and rates cannot be edited or deleted."
        confirmLabel="Finalize & Assign Number"
        variant="primary"
      />

      {/* Top Header & New Invoice Button */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h2 className="text-2xl font-heading font-bold text-[#1A1B1E]">
            Invoices Ledger
          </h2>
          <p className="text-sm text-[#5C6068]">
            Manage client billings, track payment statuses, and generate legal PDF statements.
          </p>
        </div>

        <button
          onClick={() => {
            setSelectedInvoiceId(null);
            setEditingDraftId(null);
            setActiveTab('create_invoice');
          }}
          className="flex items-center gap-2 px-4 py-2.5 bg-[#C6A15B] hover:bg-[#B38E46] text-[#292A2D] font-heading font-semibold text-sm rounded-xl shadow-sm transition-all min-h-[44px]"
        >
          <Plus className="w-4 h-4 stroke-[2.5]" />
          <span>New Invoice</span>
        </button>
      </div>

      {/* Filters & Search Toolbar */}
      <div className="bg-white p-4 rounded-2xl border border-[#DAD8D2] shadow-xs space-y-3">
        {/* Search & Selectors */}
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
          {/* Search bar */}
          <div className="relative">
            <Search className="w-4 h-4 absolute left-3 top-3.5 text-[#5C6068]" />
            <input
              type="text"
              placeholder="Search by invoice # or client..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full pl-9 pr-3 py-2 text-sm bg-[#FAF9F6] border border-[#DAD8D2] rounded-xl focus:outline-none focus:ring-2 focus:ring-[#C6A15B]"
            />
          </div>

          {/* Client filter */}
          <div>
            <select
              value={clientFilter}
              onChange={(e) => setClientFilter(e.target.value)}
              className="w-full px-3 py-2 text-sm bg-[#FAF9F6] border border-[#DAD8D2] rounded-xl focus:outline-none focus:ring-2 focus:ring-[#C6A15B]"
            >
              <option value="all">All Clients ({clients.length})</option>
              {clients.map((c) => (
                <option key={c.id} value={c.id}>
                  {c.name}
                </option>
              ))}
            </select>
          </div>

          {/* Sort order */}
          <div>
            <select
              value={sortBy}
              onChange={(e) => setSortBy(e.target.value as any)}
              className="w-full px-3 py-2 text-sm bg-[#FAF9F6] border border-[#DAD8D2] rounded-xl focus:outline-none focus:ring-2 focus:ring-[#C6A15B]"
            >
              <option value="date_desc">Issue Date (Newest first)</option>
              <option value="date_asc">Issue Date (Oldest first)</option>
              <option value="amount_desc">Amount (Highest first)</option>
              <option value="amount_asc">Amount (Lowest first)</option>
            </select>
          </div>
        </div>

        {/* Status Pill Tabs */}
        <div className="flex items-center gap-1.5 overflow-x-auto pt-1 pb-1 text-xs select-none">
          {[
            { id: 'all', label: 'All Invoices' },
            { id: 'draft', label: 'Drafts' },
            { id: 'sent', label: 'Sent / Unpaid' },
            { id: 'partially_paid', label: 'Partially Paid' },
            { id: 'overdue', label: 'Overdue' },
            { id: 'paid', label: 'Paid' },
            { id: 'cancelled', label: 'Cancelled' },
          ].map((tab) => {
            const count =
              tab.id === 'all'
                ? invoices.length
                : invoices.filter((i) => i.status === tab.id).length;
            const isActive = statusFilter === tab.id;

            return (
              <button
                key={tab.id}
                onClick={() => setStatusFilter(tab.id)}
                className={`px-3 py-1.5 rounded-xl font-medium shrink-0 transition-all ${
                  isActive
                    ? 'bg-[#292A2D] text-[#FAF9F6] font-semibold shadow-xs'
                    : 'text-[#4C5056] hover:bg-[#F1F0ED]'
                }`}
              >
                <span>{tab.label}</span>
                <span
                  className={`ml-1.5 px-1.5 py-0.2 rounded-full text-[10px] ${
                    isActive ? 'bg-[#C6A15B] text-[#292A2D] font-bold' : 'bg-[#E5E3DD]'
                  }`}
                >
                  {count}
                </span>
              </button>
            );
          })}
        </div>
      </div>

      {/* ================= DESKTOP TABLE VIEW ================= */}
      <div className="hidden md:block bg-white border border-[#DAD8D2] rounded-2xl shadow-xs overflow-hidden">
        <table className="w-full text-left text-sm">
          <thead className="bg-[#FAF9F6] border-b border-[#DAD8D2] text-[#4C5056] text-xs font-semibold uppercase tracking-wider">
            <tr>
              <th className="py-3.5 px-4">Invoice #</th>
              <th className="py-3.5 px-4">Client</th>
              <th className="py-3.5 px-4">Issue / Due Date</th>
              <th className="py-3.5 px-4">Status</th>
              <th className="py-3.5 px-4 text-right">Total</th>
              <th className="py-3.5 px-4 text-right">Balance Due</th>
              <th className="py-3.5 px-4 text-center">Actions</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-[#DAD8D2]">
            {filteredInvoices.length === 0 ? (
              <tr>
                <td colSpan={7} className="py-12 text-center text-[#5C6068]">
                  <p className="text-base font-semibold text-[#1A1B1E] mb-1">
                    No invoices match criteria
                  </p>
                  <p className="text-xs">
                    Try adjusting the search query or status filters above.
                  </p>
                </td>
              </tr>
            ) : (
              filteredInvoices.map((inv) => {
                const invPayments = payments.filter((p) => p.invoiceId === inv.id);
                const balance = calculateOutstandingBalance(inv.total, invPayments);
                const isDraft = !inv.isFinalized;
                const isCancelled = inv.isCancelled;

                return (
                  <tr
                    key={inv.id}
                    className="hover:bg-[#FAF9F6] transition-colors cursor-pointer group"
                    onClick={() => handleView(inv.id)}
                  >
                    {/* Invoice Number */}
                    <td className="py-4 px-4">
                      <span className="font-heading font-semibold text-[#1A1B1E] group-hover:text-[#C6A15B] transition-colors">
                        {inv.invoiceNumber || 'Draft (Unassigned)'}
                      </span>
                      {inv.financialYear && (
                        <span className="block text-[11px] text-[#5C6068]">
                          FY {inv.financialYear}
                        </span>
                      )}
                    </td>

                    {/* Client Name */}
                    <td className="py-4 px-4">
                      <span className="font-medium text-[#1A1B1E] block">
                        {inv.clientSnapshot?.name || 'Unknown Client'}
                      </span>
                      <span className="text-[11px] text-[#5C6068]">
                        {inv.clientSnapshot?.contactPerson}
                      </span>
                    </td>

                    {/* Dates */}
                    <td className="py-4 px-4 text-xs text-[#4C5056]">
                      <div>Issued: {inv.issueDate}</div>
                      <div className={inv.status === 'overdue' ? 'text-red-600 font-semibold' : ''}>
                        Due: {inv.dueDate}
                      </div>
                    </td>

                    {/* Status Badge */}
                    <td className="py-4 px-4">{statusBadge(inv.status)}</td>

                    {/* Total */}
                    <td className="py-4 px-4 text-right font-heading font-semibold text-[#1A1B1E] tabular-nums">
                      {formatINR(inv.total)}
                    </td>

                    {/* Balance */}
                    <td className="py-4 px-4 text-right tabular-nums">
                      <span
                        className={`font-heading font-semibold ${
                          balance > 0 ? 'text-[#B91C1C]' : 'text-[#15803D]'
                        }`}
                      >
                        {formatINR(balance)}
                      </span>
                    </td>

                    {/* Actions */}
                    <td
                      className="py-4 px-4 text-center"
                      onClick={(e) => e.stopPropagation()}
                    >
                      <div className="flex items-center justify-center gap-1.5">
                        <button
                          onClick={() => handleView(inv.id)}
                          className="p-1.5 text-[#5C6068] hover:text-[#1A1B1E] hover:bg-[#F1F0ED] rounded-lg transition-colors"
                          title="View / Print Invoice"
                        >
                          <Eye className="w-4 h-4" />
                        </button>

                        {isDraft ? (
                          <>
                            <button
                              onClick={() => handleEdit(inv.id)}
                              className="p-1.5 text-[#9A7832] hover:text-[#C6A15B] hover:bg-[#F1F0ED] rounded-lg transition-colors"
                              title="Edit Draft"
                            >
                              <Edit className="w-4 h-4" />
                            </button>
                            <button
                              onClick={() => setFinalizingInvoiceId(inv.id)}
                              className="px-2 py-1 text-xs font-semibold bg-[#C6A15B] text-[#292A2D] rounded-lg hover:bg-[#B38E46]"
                              title="Finalize invoice"
                            >
                              Finalize
                            </button>
                            <button
                              onClick={() => setDeletingDraftId(inv.id)}
                              className="p-1.5 text-red-500 hover:text-red-700 hover:bg-red-50 rounded-lg transition-colors"
                              title="Delete Draft"
                            >
                              <Trash2 className="w-4 h-4" />
                            </button>
                          </>
                        ) : !isCancelled ? (
                          <>
                            {balance > 0 && (
                              <>
                                <button
                                  onClick={() => setPaymentModalInvoiceId(inv.id)}
                                  className="px-2 py-1 text-xs font-semibold bg-[#FAF5E8] text-[#9A7832] border border-[#C6A15B]/30 rounded-lg hover:bg-[#C6A15B] hover:text-[#292A2D] transition-colors"
                                  title="Record Payment"
                                >
                                  Pay
                                </button>
                                <button
                                  onClick={() => setReminderModalInvoiceId(inv.id)}
                                  className="p-1.5 text-[#5C6068] hover:text-[#292A2D] hover:bg-[#F1F0ED] rounded-lg transition-colors"
                                  title="Outstanding Reminder / Statement"
                                >
                                  <Send className="w-4 h-4 text-[#C6A15B]" />
                                </button>
                              </>
                            )}
                            <button
                              onClick={() => setCancellingInvoiceId(inv.id)}
                              className="p-1.5 text-neutral-400 hover:text-red-600 hover:bg-red-50 rounded-lg transition-colors"
                              title="Cancel Invoice (Keeps Audit Trail)"
                            >
                              <Ban className="w-4 h-4" />
                            </button>
                          </>
                        ) : null}
                      </div>
                    </td>
                  </tr>
                );
              })
            )}
          </tbody>
        </table>
      </div>

      {/* ================= MOBILE CARD VIEW ================= */}
      <div className="md:hidden space-y-3">
        {filteredInvoices.length === 0 ? (
          <div className="bg-white p-8 rounded-2xl border border-[#DAD8D2] text-center text-[#5C6068]">
            <p className="font-semibold text-[#1A1B1E] mb-1">No invoices found</p>
            <p className="text-xs">Try adjusting your filters.</p>
          </div>
        ) : (
          filteredInvoices.map((inv) => {
            const invPayments = payments.filter((p) => p.invoiceId === inv.id);
            const balance = calculateOutstandingBalance(inv.total, invPayments);
            const isDraft = !inv.isFinalized;
            const isCancelled = inv.isCancelled;

            return (
              <div
                key={inv.id}
                onClick={() => handleView(inv.id)}
                className="bg-white p-4 rounded-2xl border border-[#DAD8D2] shadow-xs space-y-3 cursor-pointer active:scale-[0.99] transition-transform"
              >
                {/* Header */}
                <div className="flex items-start justify-between">
                  <div>
                    <span className="font-heading font-bold text-sm text-[#1A1B1E]">
                      {inv.invoiceNumber || 'Draft Invoice'}
                    </span>
                    <p className="text-xs text-[#5C6068]">{inv.clientSnapshot?.name}</p>
                  </div>
                  <div>{statusBadge(inv.status)}</div>
                </div>

                {/* Amount Row */}
                <div className="flex items-center justify-between text-xs pt-2 border-t border-[#F1F0ED]">
                  <div>
                    <span className="text-[#5C6068] block">Total</span>
                    <span className="font-heading font-bold text-sm text-[#1A1B1E] tabular-nums">
                      {formatINR(inv.total)}
                    </span>
                  </div>
                  <div className="text-right">
                    <span className="text-[#5C6068] block">Balance</span>
                    <span
                      className={`font-heading font-bold text-sm tabular-nums ${
                        balance > 0 ? 'text-[#B91C1C]' : 'text-[#15803D]'
                      }`}
                    >
                      {formatINR(balance)}
                    </span>
                  </div>
                </div>

                {/* Date & Actions Row */}
                <div
                  className="flex items-center justify-between pt-2 border-t border-[#F1F0ED] text-xs"
                  onClick={(e) => e.stopPropagation()}
                >
                  <span className="text-[#5C6068]">Due: {inv.dueDate}</span>

                  <div className="flex items-center gap-2">
                    {isDraft ? (
                      <>
                        <button
                          onClick={() => handleEdit(inv.id)}
                          className="px-2.5 py-1 text-xs font-semibold bg-[#F1F0ED] rounded-lg text-[#292A2D]"
                        >
                          Edit
                        </button>
                        <button
                          onClick={() => setFinalizingInvoiceId(inv.id)}
                          className="px-2.5 py-1 text-xs font-semibold bg-[#C6A15B] text-[#292A2D] rounded-lg"
                        >
                          Finalize
                        </button>
                      </>
                    ) : !isCancelled && balance > 0 ? (
                      <>
                        <button
                          onClick={() => setPaymentModalInvoiceId(inv.id)}
                          className="px-2.5 py-1 text-xs font-semibold bg-[#FAF5E8] text-[#9A7832] border border-[#C6A15B]/30 rounded-lg"
                        >
                          Record Pay
                        </button>
                        <button
                          onClick={() => setReminderModalInvoiceId(inv.id)}
                          className="p-1.5 text-[#C6A15B]"
                          aria-label="Send reminder"
                        >
                          <Send className="w-4 h-4" />
                        </button>
                      </>
                    ) : null}
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
