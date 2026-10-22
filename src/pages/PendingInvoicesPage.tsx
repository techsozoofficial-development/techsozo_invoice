import React, { useState, useMemo } from 'react';
import { useApp } from '../context/AppContext';
import { Invoice, Payment } from '../types';
import { formatINR } from '../utils/indianNumbering';
import {
  calculateOutstandingBalance,
  calculateReceivedAmount,
} from '../utils/calculations';
import { PaymentManagerModal } from '../components/payments/PaymentManagerModal';
import { OutstandingReminderModal } from '../components/reminders/OutstandingReminderModal';
import {
  Search,
  ArrowLeft,
  Eye,
  CreditCard,
  Send,
  Clock,
  CheckCircle2,
  AlertTriangle,
  Calendar,
  Building,
  Filter,
  ArrowUpDown,
  SlidersHorizontal,
} from 'lucide-react';

interface PendingInvoicesPageProps {
  onBack?: () => void;
}

export const PendingInvoicesPage: React.FC<PendingInvoicesPageProps> = ({ onBack }) => {
  const {
    invoices,
    payments,
    clients,
    companySettings,
    setActiveTab,
    setSelectedInvoiceId,
    paymentModalInvoiceId,
    setPaymentModalInvoiceId,
    reminderModalInvoiceId,
    setReminderModalInvoiceId,
  } = useApp();

  const [searchQuery, setSearchQuery] = useState('');
  const [clientFilter, setClientFilter] = useState<string>('all');
  const [subStatusFilter, setSubStatusFilter] = useState<'all' | 'sent' | 'partially_paid'>('all');
  const [windowFilter, setWindowFilter] = useState<'all' | 'window' | 'today' | '7days' | '15days'>('window');
  const [sortBy, setSortBy] = useState<'due_asc' | 'due_desc' | 'balance_desc' | 'balance_asc' | 'date_desc'>('due_asc');

  const configuredWindowDays = companySettings.defaultPaymentTermsDays || 15;

  // 1. Pre-index payments and pre-calculate balances for O(1) access
  const { paymentsByInvoice, balancesByInvoice } = useMemo(() => {
    const pMap = new Map<string, Payment[]>();
    for (const p of payments) {
      if (p.isReversed) continue;
      const list = pMap.get(p.invoiceId);
      if (list) list.push(p);
      else pMap.set(p.invoiceId, [p]);
    }
    const bMap = new Map<string, number>();
    for (const inv of invoices) {
      const invPayments = pMap.get(inv.id) || [];
      bMap.set(inv.id, calculateOutstandingBalance(inv.total, invPayments));
    }
    return { paymentsByInvoice: pMap, balancesByInvoice: bMap };
  }, [payments, invoices]);

  // 2. Identify every unpaid or partially paid finalized invoice whose due date is today or in the future
  const { filteredInvoices, displayedOutstandingTotal, urgentCount } = useMemo(() => {
    const today = new Date();
    today.setHours(0, 0, 0, 0);

    const pending = invoices.filter((inv) => {
      if (!inv.isFinalized || inv.isCancelled) return false;
      const balance = balancesByInvoice.get(inv.id) || 0;
      if (balance <= 0) return false;

      const [y, m, d] = inv.dueDate.split('-').map(Number);
      const dueDate = new Date(y, m - 1, d);
      dueDate.setHours(0, 0, 0, 0);

      const diffDays = Math.round((dueDate.getTime() - today.getTime()) / (1000 * 60 * 60 * 24));
      if (diffDays < 0) return false; // Overdue invoices excluded

      return true;
    });

    const query = searchQuery.trim().toLowerCase();

    const filtered = pending
      .filter((inv) => {
        const [y, m, d] = inv.dueDate.split('-').map(Number);
        const dueDate = new Date(y, m - 1, d);
        dueDate.setHours(0, 0, 0, 0);
        const diffDays = Math.round((dueDate.getTime() - today.getTime()) / (1000 * 60 * 60 * 24));

        if (windowFilter === 'window' && diffDays > configuredWindowDays) return false;
        if (windowFilter === 'today' && diffDays !== 0) return false;
        if (windowFilter === '7days' && diffDays > 7) return false;
        if (windowFilter === '15days' && diffDays > 15) return false;

        if (subStatusFilter === 'sent' && inv.status !== 'sent') return false;
        if (subStatusFilter === 'partially_paid' && inv.status !== 'partially_paid') return false;

        if (clientFilter !== 'all' && inv.clientId !== clientFilter) return false;

        if (query) {
          const numberMatch = (inv.invoiceNumber || '').toLowerCase().includes(query);
          const clientMatch = (inv.clientSnapshot?.name || '').toLowerCase().includes(query);
          const contactMatch = (inv.clientSnapshot?.contactPerson || '').toLowerCase().includes(query);
          return numberMatch || clientMatch || contactMatch;
        }

        return true;
      })
      .sort((a, b) => {
        const aBal = balancesByInvoice.get(a.id) || 0;
        const bBal = balancesByInvoice.get(b.id) || 0;

        if (sortBy === 'due_asc') {
          return new Date(a.dueDate).getTime() - new Date(b.dueDate).getTime();
        }
        if (sortBy === 'due_desc') {
          return new Date(b.dueDate).getTime() - new Date(a.dueDate).getTime();
        }
        if (sortBy === 'balance_desc') {
          return bBal - aBal;
        }
        if (sortBy === 'balance_asc') {
          return aBal - bBal;
        }
        if (sortBy === 'date_desc') {
          return new Date(b.issueDate).getTime() - new Date(a.issueDate).getTime();
        }
        return 0;
      });

    const total = filtered.reduce((sum, inv) => sum + (balancesByInvoice.get(inv.id) || 0), 0);

    const urgent = pending.filter((inv) => {
      const [y, m, d] = inv.dueDate.split('-').map(Number);
      const dueDate = new Date(y, m - 1, d);
      dueDate.setHours(0, 0, 0, 0);
      const diffDays = Math.round((dueDate.getTime() - today.getTime()) / (1000 * 60 * 60 * 24));
      return diffDays <= 3;
    }).length;

    return {
      filteredInvoices: filtered,
      displayedOutstandingTotal: total,
      urgentCount: urgent,
    };
  }, [
    invoices,
    balancesByInvoice,
    searchQuery,
    windowFilter,
    configuredWindowDays,
    subStatusFilter,
    clientFilter,
    sortBy,
  ]);

  const displayedOriginalTotal = useMemo(() => filteredInvoices.reduce((sum, inv) => sum + inv.total, 0), [filteredInvoices]);
  const displayedReceivedTotal = Math.max(0, displayedOriginalTotal - displayedOutstandingTotal);

  const handleView = (invoiceId: string) => {
    setSelectedInvoiceId(invoiceId);
  };

  const handleBackToDashboard = () => {
    if (onBack) {
      onBack();
    } else {
      setActiveTab('dashboard');
    }
  };

  const getDueBadge = (dueDateStr: string) => {
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const [y, m, d] = dueDateStr.split('-').map(Number);
    const dueDate = new Date(y, m - 1, d);
    dueDate.setHours(0, 0, 0, 0);
    const diffDays = Math.round((dueDate.getTime() - today.getTime()) / (1000 * 60 * 60 * 24));

    if (diffDays === 0) {
      return (
        <span className="inline-flex items-center gap-1 text-[11px] font-bold px-2 py-0.5 rounded-full bg-amber-500 text-white">
          <Clock className="w-3 h-3" />
          <span>Due Today</span>
        </span>
      );
    }
    if (diffDays === 1) {
      return (
        <span className="inline-flex items-center gap-1 text-[11px] font-semibold px-2 py-0.5 rounded-full bg-amber-100 text-[#9A7832] border border-amber-300">
          <Clock className="w-3 h-3" />
          <span>Due Tomorrow</span>
        </span>
      );
    }
    return (
      <span className="inline-flex items-center gap-1 text-[11px] font-medium px-2 py-0.5 rounded-full bg-[#FAF9F6] text-[#5C6068] border border-[#DAD8D2]">
        <Calendar className="w-3 h-3 text-[#C6A15B]" />
        <span>Due in {diffDays} days</span>
      </span>
    );
  };

  return (
    <div className="space-y-6 animate-in fade-in duration-150">
      {/* Modals for payment & reminder */}
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

      {/* Top Breadcrumb & Navigation Bar */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-1">
        <div className="flex items-center gap-3">
          <button
            onClick={handleBackToDashboard}
            className="flex items-center gap-2 px-3.5 py-2 text-xs font-semibold text-[#4C5056] hover:text-[#1A1B1E] bg-white hover:bg-[#F1F0ED] border border-[#DAD8D2] rounded-xl transition-all shadow-2xs min-h-[40px]"
            title="Return to Financial Dashboard"
          >
            <ArrowLeft className="w-4 h-4 text-[#C6A15B]" />
            <span>Dashboard</span>
          </button>
          <div>
            <div className="flex items-center gap-2">
              <h2 className="text-2xl font-heading font-bold text-[#1A1B1E]">
                Pending Invoices (Due Soon)
              </h2>
              <span className="text-xs font-bold px-2 py-0.5 rounded-full bg-amber-100 text-[#9A7832] border border-amber-200">
                {filteredInvoices.length} Invoices
              </span>
            </div>
            <p className="text-xs text-[#5C6068] mt-0.5">
              Active billings with due date today or in future within the {configuredWindowDays}-day payment window.
            </p>
          </div>
        </div>

        {/* Quick jump to Overdue view */}
        <div className="flex items-center gap-2">
          <button
            onClick={() => {
              setActiveTab('invoices');
            }}
            className="text-xs font-semibold px-3.5 py-2 text-[#5C6068] hover:text-[#1A1B1E] bg-white border border-[#DAD8D2] rounded-xl hover:border-[#C6A15B] transition-colors"
          >
            View All Invoices
          </button>
        </div>
      </div>

      {/* ================= SUMMARY STATS FOR DISPLAYED VIEW ================= */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        {/* Total Outstanding Balance */}
        <div className="bg-white border-2 border-[#C6A15B]/40 rounded-2xl p-5 shadow-xs bg-linear-to-br from-white via-white to-amber-50/30">
          <div className="flex items-center justify-between text-[#9A7832] mb-2">
            <span className="text-xs font-semibold uppercase tracking-wider text-[#5C6068]">
              Outstanding Pending Balance
            </span>
            <div className="p-2 rounded-xl bg-amber-50 text-[#9A7832] border border-amber-200/50">
              <Clock className="w-4 h-4" />
            </div>
          </div>
          <div className="text-2xl lg:text-3xl font-heading font-bold text-[#9A7832] tabular-nums mb-1">
            {formatINR(displayedOutstandingTotal)}
          </div>
          <p className="text-xs text-[#5C6068]">
            Sum of remaining dues across {filteredInvoices.length} pending billings
          </p>
        </div>

        {/* Original Invoiced Value */}
        <div className="bg-white border border-[#DAD8D2] rounded-2xl p-5 shadow-xs">
          <div className="flex items-center justify-between text-[#5C6068] mb-2">
            <span className="text-xs font-semibold uppercase tracking-wider">
              Original Invoiced Total
            </span>
            <div className="p-2 rounded-xl bg-[#F1F0ED] text-[#292A2D]">
              <Calendar className="w-4 h-4" />
            </div>
          </div>
          <div className="text-2xl lg:text-3xl font-heading font-bold text-[#1A1B1E] tabular-nums mb-1">
            {formatINR(displayedOriginalTotal)}
          </div>
          <p className="text-xs text-[#5C6068]">
            Initial contract billing before payments
          </p>
        </div>

        {/* Amount Already Received */}
        <div className="bg-white border border-[#DAD8D2] rounded-2xl p-5 shadow-xs">
          <div className="flex items-center justify-between text-[#15803D] mb-2">
            <span className="text-xs font-semibold uppercase tracking-wider text-[#5C6068]">
              Advance / Received Amount
            </span>
            <div className="p-2 rounded-xl bg-emerald-50 text-[#15803D]">
              <CheckCircle2 className="w-4 h-4" />
            </div>
          </div>
          <div className="text-2xl lg:text-3xl font-heading font-bold text-[#15803D] tabular-nums mb-1">
            {formatINR(displayedReceivedTotal)}
          </div>
          <p className="text-xs text-[#5C6068]">
            {displayedOriginalTotal > 0
              ? `${Math.round((displayedReceivedTotal / displayedOriginalTotal) * 100)}% partial collection`
              : '₹0 collected yet'}
          </p>
        </div>
      </div>

      {/* ================= SEARCH & FILTER CONTROLS ================= */}
      <div className="bg-white p-4 rounded-2xl border border-[#DAD8D2] shadow-xs space-y-3">
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
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

          {/* Payment Terms Window Filter */}
          <div>
            <select
              value={windowFilter}
              onChange={(e) => setWindowFilter(e.target.value as any)}
              className="w-full px-3 py-2 text-sm bg-[#FAF9F6] border border-[#DAD8D2] rounded-xl focus:outline-none focus:ring-2 focus:ring-[#C6A15B]"
            >
              <option value="window">Payment Terms Window (≤ {configuredWindowDays} days)</option>
              <option value="today">Due Today Only</option>
              <option value="7days">Due in Next 7 Days</option>
              <option value="15days">Due in Next 15 Days</option>
              <option value="all">All Future Dates</option>
            </select>
          </div>

          {/* Sort By */}
          <div>
            <select
              value={sortBy}
              onChange={(e) => setSortBy(e.target.value as any)}
              className="w-full px-3 py-2 text-sm bg-[#FAF9F6] border border-[#DAD8D2] rounded-xl focus:outline-none focus:ring-2 focus:ring-[#C6A15B]"
            >
              <option value="due_asc">Due Date (Soonest first)</option>
              <option value="due_desc">Due Date (Latest first)</option>
              <option value="balance_desc">Outstanding Due (Highest first)</option>
              <option value="balance_asc">Outstanding Due (Lowest first)</option>
              <option value="date_desc">Invoice Date (Newest first)</option>
            </select>
          </div>
        </div>

        {/* Quick Payment Status Tabs */}
        <div className="flex items-center gap-2 pt-1 overflow-x-auto text-xs">
          <span className="text-[#5C6068] font-medium flex items-center gap-1 shrink-0">
            <SlidersHorizontal className="w-3.5 h-3.5 text-[#C6A15B]" />
            <span>Status:</span>
          </span>
          {[
            { id: 'all', label: 'All Pending', count: pendingInvoices.length },
            {
              id: 'sent',
              label: 'Sent (100% Unpaid)',
              count: pendingInvoices.filter((i) => i.status === 'sent').length,
            },
            {
              id: 'partially_paid',
              label: 'Partially Paid',
              count: pendingInvoices.filter((i) => i.status === 'partially_paid').length,
            },
          ].map((tab) => {
            const isActive = subStatusFilter === tab.id;
            return (
              <button
                key={tab.id}
                onClick={() => setSubStatusFilter(tab.id as any)}
                className={`px-3 py-1.5 rounded-xl font-medium shrink-0 transition-all ${
                  isActive
                    ? 'bg-[#292A2D] text-[#FAF9F6] font-semibold shadow-2xs'
                    : 'text-[#4C5056] hover:bg-[#F1F0ED]'
                }`}
              >
                <span>{tab.label}</span>
                <span
                  className={`ml-1.5 px-1.5 py-0.2 rounded-full text-[10px] ${
                    isActive ? 'bg-[#C6A15B] text-[#292A2D] font-bold' : 'bg-[#E5E3DD]'
                  }`}
                >
                  {tab.count}
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
              <th className="py-3.5 px-4">Invoice Date</th>
              <th className="py-3.5 px-4">Due Date</th>
              <th className="py-3.5 px-4 text-center">Status</th>
              <th className="py-3.5 px-4 text-right">Original Total</th>
              <th className="py-3.5 px-4 text-right">Received</th>
              <th className="py-3.5 px-4 text-right">Outstanding Balance</th>
              <th className="py-3.5 px-4 text-center">Actions</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-[#DAD8D2]">
            {filteredInvoices.length === 0 ? (
              <tr>
                <td colSpan={9} className="py-14 text-center text-[#5C6068]">
                  <Clock className="w-10 h-10 text-amber-500/60 mx-auto mb-2" />
                  <p className="text-base font-semibold text-[#1A1B1E] mb-1">
                    No pending invoices match criteria
                  </p>
                  <p className="text-xs">
                    All upcoming invoices within this window are either cleared or no invoices match your filter.
                  </p>
                </td>
              </tr>
            ) : (
              filteredInvoices.map((inv) => {
                const invPayments = payments.filter((p) => p.invoiceId === inv.id);
                const received = calculateReceivedAmount(invPayments);
                const balance = calculateOutstandingBalance(inv.total, invPayments);

                return (
                  <tr
                    key={inv.id}
                    className="hover:bg-[#FAF9F6] transition-colors cursor-pointer group"
                    onClick={() => handleView(inv.id)}
                  >
                    {/* Invoice Number */}
                    <td className="py-4 px-4">
                      <span className="font-heading font-semibold text-[#1A1B1E] group-hover:text-[#C6A15B] transition-colors">
                        {inv.invoiceNumber}
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

                    {/* Invoice Date */}
                    <td className="py-4 px-4 text-xs text-[#4C5056] tabular-nums">
                      {inv.issueDate}
                    </td>

                    {/* Due Date + Countdown Badge */}
                    <td className="py-4 px-4 text-xs">
                      <div className="font-medium text-[#1A1B1E] tabular-nums mb-1">
                        {inv.dueDate}
                      </div>
                      {getDueBadge(inv.dueDate)}
                    </td>

                    {/* Status */}
                    <td className="py-4 px-4 text-center">
                      {inv.status === 'partially_paid' ? (
                        <span className="inline-flex items-center gap-1 text-[11px] font-semibold px-2.5 py-0.5 rounded-full bg-amber-100 text-[#9A7832] border border-amber-200">
                          <Clock className="w-3 h-3" />
                          <span>Partially Paid</span>
                        </span>
                      ) : (
                        <span className="inline-flex items-center gap-1 text-[11px] font-semibold px-2.5 py-0.5 rounded-full bg-blue-50 text-blue-700 border border-blue-200">
                          <Send className="w-3 h-3" />
                          <span>Sent (Unpaid)</span>
                        </span>
                      )}
                    </td>

                    {/* Original Total */}
                    <td className="py-4 px-4 text-right font-heading font-semibold text-[#1A1B1E] tabular-nums">
                      {formatINR(inv.total)}
                    </td>

                    {/* Amount Received */}
                    <td className="py-4 px-4 text-right font-heading font-medium text-[#15803D] tabular-nums">
                      {formatINR(received)}
                    </td>

                    {/* Outstanding Balance */}
                    <td className="py-4 px-4 text-right tabular-nums">
                      <span className="font-heading font-bold text-[#9A7832] text-sm">
                        {formatINR(balance)}
                      </span>
                    </td>

                    {/* Actions */}
                    <td
                      className="py-4 px-4 text-center"
                      onClick={(e) => e.stopPropagation()}
                    >
                      <div className="flex items-center justify-center gap-1.5">
                        {/* View Invoice */}
                        <button
                          onClick={() => handleView(inv.id)}
                          className="p-1.5 text-[#5C6068] hover:text-[#1A1B1E] hover:bg-[#F1F0ED] rounded-lg transition-colors"
                          title="View Invoice"
                          aria-label="View Invoice"
                        >
                          <Eye className="w-4 h-4" />
                        </button>

                        {/* Record Payment */}
                        <button
                          onClick={() => setPaymentModalInvoiceId(inv.id)}
                          className="px-2.5 py-1 text-xs font-semibold bg-[#FAF5E8] text-[#9A7832] border border-[#C6A15B]/40 rounded-lg hover:bg-[#C6A15B] hover:text-[#292A2D] transition-colors flex items-center gap-1"
                          title="Record Payment"
                          aria-label="Record Payment"
                        >
                          <CreditCard className="w-3.5 h-3.5" />
                          <span>Pay</span>
                        </button>

                        {/* Send Reminder */}
                        <button
                          onClick={() => setReminderModalInvoiceId(inv.id)}
                          className="p-1.5 text-[#C6A15B] hover:text-[#9A7832] hover:bg-[#F1F0ED] rounded-lg transition-colors"
                          title="Send Payment Reminder"
                          aria-label="Send Reminder"
                        >
                          <Send className="w-4 h-4" />
                        </button>
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
            <Clock className="w-8 h-8 text-amber-500/60 mx-auto mb-2" />
            <p className="font-semibold text-[#1A1B1E] mb-1">No pending invoices found</p>
            <p className="text-xs">Try adjusting your filters.</p>
          </div>
        ) : (
          filteredInvoices.map((inv) => {
            const invPayments = payments.filter((p) => p.invoiceId === inv.id);
            const received = calculateReceivedAmount(invPayments);
            const balance = calculateOutstandingBalance(inv.total, invPayments);

            return (
              <div
                key={inv.id}
                onClick={() => handleView(inv.id)}
                className="bg-white p-4 rounded-2xl border border-[#DAD8D2] shadow-xs space-y-3 cursor-pointer active:scale-[0.99] transition-transform"
              >
                {/* Header */}
                <div className="flex items-start justify-between gap-2">
                  <div>
                    <span className="font-heading font-bold text-sm text-[#1A1B1E]">
                      {inv.invoiceNumber}
                    </span>
                    <p className="text-xs text-[#5C6068]">{inv.clientSnapshot?.name}</p>
                  </div>
                  <div>{getDueBadge(inv.dueDate)}</div>
                </div>

                {/* Dates & Status */}
                <div className="flex items-center justify-between text-xs text-[#4C5056] py-1 border-t border-[#F1F0ED]">
                  <div>Issued: {inv.issueDate}</div>
                  <div>
                    {inv.status === 'partially_paid' ? (
                      <span className="text-amber-700 font-medium">Partially Paid</span>
                    ) : (
                      <span className="text-blue-700 font-medium">Sent (Unpaid)</span>
                    )}
                  </div>
                </div>

                {/* Financial breakdown */}
                <div className="grid grid-cols-3 gap-2 py-2 border-t border-b border-[#F1F0ED] text-xs">
                  <div>
                    <span className="text-[#5C6068] block text-[10px] uppercase">Original Total</span>
                    <span className="font-heading font-bold text-sm text-[#1A1B1E] tabular-nums">
                      {formatINR(inv.total)}
                    </span>
                  </div>
                  <div>
                    <span className="text-[#5C6068] block text-[10px] uppercase">Received</span>
                    <span className="font-heading font-bold text-sm text-[#15803D] tabular-nums">
                      {formatINR(received)}
                    </span>
                  </div>
                  <div className="text-right">
                    <span className="text-[#5C6068] block text-[10px] uppercase">Outstanding</span>
                    <span className="font-heading font-bold text-sm text-[#9A7832] tabular-nums">
                      {formatINR(balance)}
                    </span>
                  </div>
                </div>

                {/* Actions */}
                <div
                  className="flex items-center justify-between pt-1 text-xs"
                  onClick={(e) => e.stopPropagation()}
                >
                  <button
                    onClick={() => handleView(inv.id)}
                    className="flex items-center gap-1 text-[#5C6068] hover:text-[#1A1B1E] font-medium"
                  >
                    <Eye className="w-3.5 h-3.5" />
                    <span>View</span>
                  </button>

                  <div className="flex items-center gap-2">
                    <button
                      onClick={() => setPaymentModalInvoiceId(inv.id)}
                      className="px-3 py-1.5 text-xs font-semibold bg-[#FAF5E8] text-[#9A7832] border border-[#C6A15B]/40 rounded-lg flex items-center gap-1"
                    >
                      <CreditCard className="w-3.5 h-3.5" />
                      <span>Record Payment</span>
                    </button>
                    <button
                      onClick={() => setReminderModalInvoiceId(inv.id)}
                      className="p-1.5 text-[#C6A15B] hover:text-[#9A7832] bg-[#FAF9F6] rounded-lg border border-[#DAD8D2]"
                      title="Send Reminder"
                    >
                      <Send className="w-4 h-4" />
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
