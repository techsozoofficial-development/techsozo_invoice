import React from 'react';
import { useApp } from '../context/AppContext';
import { formatINR } from '../utils/indianNumbering';
import { calculateOutstandingBalance, calculateReceivedAmount } from '../utils/calculations';
import {
  TrendingUp,
  CheckCircle2,
  Clock,
  AlertTriangle,
  FilePlus,
  UserPlus,
  Briefcase,
  ArrowUpRight,
  ChevronRight,
  Calendar,
  AlertCircle,
} from 'lucide-react';

export const DashboardPage: React.FC = () => {
  const {
    invoices,
    payments,
    clients,
    setActiveTab,
    setSelectedInvoiceId,
    setEditingDraftId,
    setPaymentModalInvoiceId,
  } = useApp();

  // 1. Dynamic Totals Derivation
  const finalizedActiveInvoices = invoices.filter((i) => i.isFinalized && !i.isCancelled);

  // Total Billed
  const totalBilled = finalizedActiveInvoices.reduce((sum, inv) => sum + inv.total, 0);

  // Total Received
  const validPayments = payments.filter((p) => !p.isReversed);
  const totalReceived = validPayments.reduce((sum, p) => {
    // Check if the payment belongs to a finalized, non-cancelled invoice
    const inv = invoices.find((i) => i.id === p.invoiceId);
    return inv && inv.isFinalized && !inv.isCancelled ? sum + p.amount : sum;
  }, 0);

  // Total Overdue and Total Pending
  let totalOverdue = 0;
  let totalPending = 0;

  finalizedActiveInvoices.forEach((inv) => {
    const invPayments = payments.filter((p) => p.invoiceId === inv.id);
    const balance = calculateOutstandingBalance(inv.total, invPayments);

    if (inv.status === 'overdue') {
      totalOverdue += balance;
    } else if (inv.status === 'sent' || inv.status === 'partially_paid') {
      totalPending += balance;
    }
  });

  // 2. Urgent attention items (Overdue or Due in 7 days)
  const today = new Date();
  today.setHours(0, 0, 0, 0);

  const urgentInvoices = finalizedActiveInvoices
    .filter((inv) => {
      const invPayments = payments.filter((p) => p.invoiceId === inv.id);
      const balance = calculateOutstandingBalance(inv.total, invPayments);
      if (balance <= 0) return false;

      const [y, m, d] = inv.dueDate.split('-').map(Number);
      const dueDate = new Date(y, m - 1, d);
      const diffDays = Math.round((dueDate.getTime() - today.getTime()) / (1000 * 60 * 60 * 24));
      return diffDays <= 7;
    })
    .sort((a, b) => new Date(a.dueDate).getTime() - new Date(b.dueDate).getTime());

  // 3. Recent 5 invoices
  const recentInvoices = [...invoices]
    .sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime())
    .slice(0, 5);

  const handleInvoiceClick = (invId: string, isDraft: boolean) => {
    if (isDraft) {
      setEditingDraftId(invId);
      setActiveTab('create_invoice');
    } else {
      setSelectedInvoiceId(invId);
      setActiveTab('invoices');
    }
  };

  return (
    <div className="space-y-8 animate-in fade-in duration-200">
      {/* Top Banner & Quick Actions Bar */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-2">
        <div>
          <h2 className="text-2xl font-heading font-bold text-[#1A1B1E]">
            Financial Overview
          </h2>
          <p className="text-sm text-[#5C6068]">
            Real-time billing, collection and receivables across all client engagements.
          </p>
        </div>

        <div className="flex items-center gap-2.5 flex-wrap">
          <button
            onClick={() => {
              setSelectedInvoiceId(null);
              setEditingDraftId(null);
              setActiveTab('create_invoice');
            }}
            className="flex items-center gap-2 px-4 py-2.5 bg-[#C6A15B] hover:bg-[#B38E46] text-[#292A2D] font-heading font-semibold text-sm rounded-xl shadow-sm transition-all min-h-[44px]"
          >
            <FilePlus className="w-4 h-4" />
            <span>Create Invoice</span>
          </button>

          <button
            onClick={() => setActiveTab('clients')}
            className="flex items-center gap-2 px-3.5 py-2.5 bg-white hover:bg-[#F1F0ED] text-[#292A2D] border border-[#DAD8D2] font-medium text-sm rounded-xl transition-all min-h-[44px]"
          >
            <UserPlus className="w-4 h-4 text-[#5C6068]" />
            <span>Add Client</span>
          </button>
        </div>
      </div>

      {/* ================= 4 FINANCIAL STAT CARDS ================= */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 lg:gap-5">
        {/* Total Billed */}
        <div className="bg-white border border-[#DAD8D2] rounded-2xl p-5 shadow-xs hover:border-[#C6A15B]/50 transition-all duration-200">
          <div className="flex items-center justify-between text-[#5C6068] mb-3">
            <span className="text-xs font-semibold uppercase tracking-wider">Total Billed</span>
            <div className="p-2 rounded-xl bg-[#F1F0ED] text-[#292A2D]">
              <TrendingUp className="w-4 h-4" />
            </div>
          </div>
          <div className="text-2xl lg:text-3xl font-heading font-bold text-[#1A1B1E] tabular-nums mb-1">
            {formatINR(totalBilled)}
          </div>
          <p className="text-xs text-[#5C6068]">
            Across {finalizedActiveInvoices.length} finalized invoices
          </p>
        </div>

        {/* Total Received */}
        <div className="bg-white border border-[#DAD8D2] rounded-2xl p-5 shadow-xs hover:border-[#15803D]/50 transition-all duration-200">
          <div className="flex items-center justify-between text-[#15803D] mb-3">
            <span className="text-xs font-semibold uppercase tracking-wider text-[#5C6068]">Total Received</span>
            <div className="p-2 rounded-xl bg-emerald-50 text-[#15803D]">
              <CheckCircle2 className="w-4 h-4" />
            </div>
          </div>
          <div className="text-2xl lg:text-3xl font-heading font-bold text-[#15803D] tabular-nums mb-1">
            {formatINR(totalReceived)}
          </div>
          <p className="text-xs text-[#5C6068]">
            {totalBilled > 0 ? `${Math.round((totalReceived / totalBilled) * 100)}% collection rate` : 'No bills yet'}
          </p>
        </div>

        {/* Pending Receivables */}
        <div className="bg-white border border-[#DAD8D2] rounded-2xl p-5 shadow-xs hover:border-[#C6A15B]/50 transition-all duration-200">
          <div className="flex items-center justify-between text-[#C6A15B] mb-3">
            <span className="text-xs font-semibold uppercase tracking-wider text-[#5C6068]">Pending (Due Soon)</span>
            <div className="p-2 rounded-xl bg-amber-50 text-[#9A7832]">
              <Clock className="w-4 h-4" />
            </div>
          </div>
          <div className="text-2xl lg:text-3xl font-heading font-bold text-[#9A7832] tabular-nums mb-1">
            {formatINR(totalPending)}
          </div>
          <p className="text-xs text-[#5C6068]">
            Within active payment terms
          </p>
        </div>

        {/* Overdue Amount */}
        <div className="bg-white border border-[#DAD8D2] rounded-2xl p-5 shadow-xs hover:border-[#B91C1C]/50 transition-all duration-200">
          <div className="flex items-center justify-between text-[#B91C1C] mb-3">
            <span className="text-xs font-semibold uppercase tracking-wider text-[#5C6068]">Overdue Balance</span>
            <div className="p-2 rounded-xl bg-red-50 text-[#B91C1C]">
              <AlertTriangle className="w-4 h-4" />
            </div>
          </div>
          <div className="text-2xl lg:text-3xl font-heading font-bold text-[#B91C1C] tabular-nums mb-1">
            {formatINR(totalOverdue)}
          </div>
          <p className="text-xs text-[#5C6068]">
            Requires prompt client reminder
          </p>
        </div>
      </div>

      {/* ================= COLLECTION RATIO BAR ================= */}
      <div className="bg-white border border-[#DAD8D2] rounded-2xl p-5 shadow-xs space-y-3">
        <div className="flex items-center justify-between text-xs">
          <span className="font-semibold text-[#1A1B1E] uppercase tracking-wider">
            Collection & Cash Flow Distribution
          </span>
          <span className="text-[#5C6068]">
            Total Invoiced:{' '}
            <strong className="text-[#1A1B1E]">{formatINR(totalBilled)}</strong>
          </span>
        </div>

        {totalBilled > 0 ? (
          <div>
            <div className="w-full h-3 bg-[#F1F0ED] rounded-full overflow-hidden flex">
              <div
                style={{ width: `${Math.min(100, (totalReceived / totalBilled) * 100)}%` }}
                className="bg-[#15803D] transition-all duration-500"
                title={`Received: ${formatINR(totalReceived)}`}
              />
              <div
                style={{ width: `${Math.min(100, (totalPending / totalBilled) * 100)}%` }}
                className="bg-[#C6A15B] transition-all duration-500"
                title={`Pending: ${formatINR(totalPending)}`}
              />
              <div
                style={{ width: `${Math.min(100, (totalOverdue / totalBilled) * 100)}%` }}
                className="bg-[#B91C1C] transition-all duration-500"
                title={`Overdue: ${formatINR(totalOverdue)}`}
              />
            </div>

            <div className="flex items-center justify-between gap-4 mt-3 text-xs text-[#5C6068] flex-wrap">
              <div className="flex items-center gap-1.5">
                <span className="w-2.5 h-2.5 rounded-full bg-[#15803D]" />
                <span>Received: {formatINR(totalReceived)}</span>
              </div>
              <div className="flex items-center gap-1.5">
                <span className="w-2.5 h-2.5 rounded-full bg-[#C6A15B]" />
                <span>Pending: {formatINR(totalPending)}</span>
              </div>
              <div className="flex items-center gap-1.5">
                <span className="w-2.5 h-2.5 rounded-full bg-[#B91C1C]" />
                <span>Overdue: {formatINR(totalOverdue)}</span>
              </div>
            </div>
          </div>
        ) : (
          <p className="text-xs text-[#5C6068]">
            Finalize invoices to generate live revenue insights.
          </p>
        )}
      </div>

      {/* ================= 2-COLUMN SECTION: DUE SOON & RECENT ================= */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Urgent & Due Invoices */}
        <div className="bg-white border border-[#DAD8D2] rounded-2xl p-6 shadow-xs flex flex-col">
          <div className="flex items-center justify-between mb-4">
            <div>
              <h3 className="font-heading font-semibold text-base text-[#1A1B1E] flex items-center gap-2">
                <Calendar className="w-4 h-4 text-[#C6A15B]" />
                <span>Due in 7 Days or Overdue</span>
              </h3>
              <p className="text-xs text-[#5C6068]">Invoices requiring follow-up or payment recording</p>
            </div>
            {urgentInvoices.length > 0 && (
              <span className="text-xs font-bold px-2 py-0.5 rounded-full bg-red-100 text-red-700">
                {urgentInvoices.length} active
              </span>
            )}
          </div>

          <div className="flex-1 space-y-3">
            {urgentInvoices.length === 0 ? (
              <div className="p-8 text-center text-[#5C6068] flex flex-col items-center justify-center">
                <CheckCircle2 className="w-8 h-8 text-[#15803D] mb-2" />
                <p className="text-sm font-medium text-[#1A1B1E]">No overdue or imminent payments</p>
                <p className="text-xs text-[#5C6068] mt-0.5">All clients are currently up to date.</p>
              </div>
            ) : (
              urgentInvoices.map((inv) => {
                const invPayments = payments.filter((p) => p.invoiceId === inv.id);
                const balance = calculateOutstandingBalance(inv.total, invPayments);
                const isOverdue = inv.status === 'overdue';

                return (
                  <div
                    key={inv.id}
                    className="flex items-center justify-between p-3.5 rounded-xl border border-[#DAD8D2] hover:border-[#C6A15B] transition-colors bg-[#FAF9F6]"
                  >
                    <div className="min-w-0 pr-3">
                      <div className="flex items-center gap-2 mb-1">
                        <span className="font-heading font-semibold text-xs text-[#1A1B1E]">
                          {inv.invoiceNumber}
                        </span>
                        <span
                          className={`text-[10px] font-bold px-2 py-0.5 rounded-full ${
                            isOverdue
                              ? 'bg-red-100 text-[#B91C1C]'
                              : 'bg-amber-100 text-[#9A7832]'
                          }`}
                        >
                          {isOverdue ? 'Overdue' : 'Due Soon'}
                        </span>
                      </div>
                      <p className="text-xs font-medium text-[#4C5056] truncate">
                        {inv.clientSnapshot.name}
                      </p>
                      <p className="text-[11px] text-[#5C6068]">Due: {inv.dueDate}</p>
                    </div>

                    <div className="text-right shrink-0">
                      <div className="text-sm font-heading font-bold text-[#1A1B1E] tabular-nums">
                        {formatINR(balance)}
                      </div>
                      <div className="flex items-center gap-1.5 mt-1">
                        <button
                          onClick={() => setPaymentModalInvoiceId(inv.id)}
                          className="text-[11px] font-semibold text-[#9A7832] hover:text-[#C6A15B] px-2 py-0.5 bg-[#FAF5E8] rounded border border-[#C6A15B]/30"
                        >
                          Pay
                        </button>
                        <button
                          onClick={() => handleInvoiceClick(inv.id, false)}
                          className="text-[11px] text-[#5C6068] hover:text-[#1A1B1E] p-1"
                          aria-label="View invoice"
                        >
                          <ChevronRight className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    </div>
                  </div>
                );
              })
            )}
          </div>
        </div>

        {/* Recent Invoices */}
        <div className="bg-white border border-[#DAD8D2] rounded-2xl p-6 shadow-xs flex flex-col">
          <div className="flex items-center justify-between mb-4">
            <div>
              <h3 className="font-heading font-semibold text-base text-[#1A1B1E]">
                Recent Invoices
              </h3>
              <p className="text-xs text-[#5C6068]">Latest generated drafts and billings</p>
            </div>
            <button
              onClick={() => setActiveTab('invoices')}
              className="text-xs font-semibold text-[#9A7832] hover:text-[#C6A15B] flex items-center gap-1"
            >
              <span>View All</span>
              <ArrowUpRight className="w-3.5 h-3.5" />
            </button>
          </div>

          <div className="flex-1 space-y-3">
            {recentInvoices.length === 0 ? (
              <div className="p-8 text-center text-[#5C6068]">
                <p className="text-sm">No invoices recorded yet.</p>
              </div>
            ) : (
              recentInvoices.map((inv) => {
                const isDraft = !inv.isFinalized;
                return (
                  <div
                    key={inv.id}
                    onClick={() => handleInvoiceClick(inv.id, isDraft)}
                    className="flex items-center justify-between p-3.5 rounded-xl border border-[#DAD8D2] hover:border-[#C6A15B] hover:bg-[#FAF9F6] transition-all cursor-pointer"
                  >
                    <div className="min-w-0 pr-3">
                      <div className="flex items-center gap-2 mb-1">
                        <span className="font-heading font-semibold text-xs text-[#1A1B1E]">
                          {inv.invoiceNumber || 'Draft (Unassigned)'}
                        </span>
                        <span
                          className={`text-[10px] font-bold px-2 py-0.5 rounded-full capitalize ${
                            inv.status === 'paid'
                              ? 'bg-emerald-100 text-emerald-800'
                              : inv.status === 'overdue'
                              ? 'bg-red-100 text-red-800'
                              : inv.status === 'partially_paid'
                              ? 'bg-amber-100 text-amber-800'
                              : inv.status === 'draft'
                              ? 'bg-gray-100 text-gray-700'
                              : inv.status === 'cancelled'
                              ? 'bg-neutral-200 text-neutral-600 line-through'
                              : 'bg-blue-100 text-blue-800'
                          }`}
                        >
                          {inv.status === 'partially_paid' ? 'Partially Paid' : inv.status}
                        </span>
                      </div>
                      <p className="text-xs text-[#5C6068] truncate">
                        {inv.clientSnapshot?.name || 'Client'}
                      </p>
                    </div>

                    <div className="text-right shrink-0">
                      <div className="text-sm font-heading font-bold text-[#1A1B1E] tabular-nums">
                        {formatINR(inv.total)}
                      </div>
                      <p className="text-[11px] text-[#5C6068]">{inv.issueDate}</p>
                    </div>
                  </div>
                );
              })
            )}
          </div>
        </div>
      </div>
    </div>
  );
};
