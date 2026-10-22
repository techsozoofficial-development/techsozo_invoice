import React, { useMemo } from 'react';
import { useApp } from '../context/AppContext';
import { formatINR } from '../utils/indianNumbering';
import { calculateOutstandingBalance } from '../utils/calculations';
import { Payment } from '../types';
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
    companySettings,
    setActiveTab,
    setSelectedInvoiceId,
    setEditingDraftId,
    setPaymentModalInvoiceId,
    setInvoiceListInitialFilter,
  } = useApp();

  // 1. Pre-index payments by invoiceId for O(1) lookups
  const paymentsByInvoice = useMemo(() => {
    const map = new Map<string, Payment[]>();
    for (const p of payments) {
      if (p.isReversed) continue;
      const list = map.get(p.invoiceId);
      if (list) list.push(p);
      else map.set(p.invoiceId, [p]);
    }
    return map;
  }, [payments]);

  // 2. Dynamic Totals Derivation with useMemo
  const {
    finalizedActiveInvoices,
    totalBilled,
    totalReceived,
    totalOverdue,
    totalPending,
    urgentInvoices,
    recentInvoices,
    configuredWindowDays,
  } = useMemo(() => {
    const finalized = invoices.filter((i) => i.isFinalized && !i.isCancelled);
    const billed = finalized.reduce((sum, inv) => sum + inv.total, 0);

    const validPayments = payments.filter((p) => !p.isReversed);
    const invoiceMap = new Map(invoices.map((inv) => [inv.id, inv]));
    const received = validPayments.reduce((sum, p) => {
      const inv = invoiceMap.get(p.invoiceId);
      return inv && inv.isFinalized && !inv.isCancelled ? sum + p.amount : sum;
    }, 0);

    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const windowDays = companySettings?.defaultPaymentTermsDays || 15;

    let overdue = 0;
    let pending = 0;

    finalized.forEach((inv) => {
      const invPayments = paymentsByInvoice.get(inv.id) || [];
      const balance = calculateOutstandingBalance(inv.total, invPayments);
      if (balance <= 0) return;

      const [y, m, d] = inv.dueDate.split('-').map(Number);
      const dueDate = new Date(y, m - 1, d);
      dueDate.setHours(0, 0, 0, 0);
      const diffDays = Math.round((dueDate.getTime() - today.getTime()) / (1000 * 60 * 60 * 24));

      if (diffDays < 0 || inv.status === 'overdue') {
        overdue += balance;
      } else if (diffDays <= windowDays) {
        pending += balance;
      }
    });

    const urgent = finalized
      .filter((inv) => {
        const invPayments = paymentsByInvoice.get(inv.id) || [];
        const balance = calculateOutstandingBalance(inv.total, invPayments);
        if (balance <= 0) return false;

        const [y, m, d] = inv.dueDate.split('-').map(Number);
        const dueDate = new Date(y, m - 1, d);
        const diffDays = Math.round((dueDate.getTime() - today.getTime()) / (1000 * 60 * 60 * 24));
        return diffDays <= 7;
      })
      .sort((a, b) => new Date(a.dueDate).getTime() - new Date(b.dueDate).getTime());

    const recent = [...invoices]
      .sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime())
      .slice(0, 5);

    return {
      finalizedActiveInvoices: finalized,
      totalBilled: billed,
      totalReceived: received,
      totalOverdue: overdue,
      totalPending: pending,
      urgentInvoices: urgent,
      recentInvoices: recent,
      configuredWindowDays: windowDays,
    };
  }, [invoices, payments, paymentsByInvoice, companySettings]);

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
    <div className="space-y-8 animate-in fade-in duration-150">
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
            className="flex items-center gap-2 px-4 py-2.5 bg-[#C6A15B] hover:bg-[#B38E46] text-[#292A2D] font-heading font-semibold text-sm rounded-xl shadow-xs transition-all duration-150 active:scale-[0.98] min-h-[44px]"
          >
            <FilePlus className="w-4 h-4" />
            <span>Create Invoice</span>
          </button>

          <button
            onClick={() => setActiveTab('clients')}
            className="flex items-center gap-2 px-3.5 py-2.5 bg-white hover:bg-[#F1F0ED] text-[#292A2D] border border-[#DAD8D2] font-medium text-sm rounded-xl transition-all duration-150 active:scale-[0.98] min-h-[44px]"
          >
            <UserPlus className="w-4 h-4 text-[#5C6068]" />
            <span>Add Client</span>
          </button>
        </div>
      </div>

      {/* ================= 4 FINANCIAL STAT CARDS (ALL CLICKABLE) ================= */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 lg:gap-5">
        {/* Total Billed -> Invoices List (All finalized) */}
        <div
          onClick={() => {
            setInvoiceListInitialFilter('all');
            setActiveTab('invoices');
          }}
          className="bg-white border border-[#DAD8D2] rounded-2xl p-5 shadow-xs hover:border-[#C6A15B] hover:shadow-md transition-all duration-150 hover:-translate-y-0.5 active:scale-[0.98] cursor-pointer group"
          role="button"
          tabIndex={0}
          aria-label="View all billed invoices"
        >
          <div className="flex items-center justify-between text-[#5C6068] mb-3">
            <span className="text-xs font-semibold uppercase tracking-wider group-hover:text-[#1A1B1E] transition-colors">
              Total Billed
            </span>
            <div className="p-2 rounded-xl bg-[#F1F0ED] text-[#292A2D] group-hover:bg-[#FAF5E8] group-hover:text-[#9A7832] transition-colors">
              <TrendingUp className="w-4 h-4" />
            </div>
          </div>
          <div className="text-2xl lg:text-3xl font-heading font-bold text-[#1A1B1E] tabular-nums mb-1 group-hover:text-[#9A7832] transition-colors">
            {formatINR(totalBilled)}
          </div>
          <div className="flex items-center justify-between text-xs text-[#5C6068]">
            <span>Across {finalizedActiveInvoices.length} finalized invoices</span>
            <ArrowUpRight className="w-3.5 h-3.5 opacity-0 group-hover:opacity-100 transition-opacity text-[#9A7832]" />
          </div>
        </div>

        {/* Total Received -> Invoices List filtered to Paid */}
        <div
          onClick={() => {
            setInvoiceListInitialFilter('paid');
            setActiveTab('invoices');
          }}
          className="bg-white border border-[#DAD8D2] rounded-2xl p-5 shadow-xs hover:border-[#15803D] hover:shadow-md transition-all duration-150 hover:-translate-y-0.5 active:scale-[0.98] cursor-pointer group"
          role="button"
          tabIndex={0}
          aria-label="View paid invoices"
        >
          <div className="flex items-center justify-between text-[#15803D] mb-3">
            <span className="text-xs font-semibold uppercase tracking-wider text-[#5C6068] group-hover:text-[#15803D] transition-colors">
              Total Received
            </span>
            <div className="p-2 rounded-xl bg-emerald-50 text-[#15803D] group-hover:bg-emerald-100 transition-colors">
              <CheckCircle2 className="w-4 h-4" />
            </div>
          </div>
          <div className="text-2xl lg:text-3xl font-heading font-bold text-[#15803D] tabular-nums mb-1">
            {formatINR(totalReceived)}
          </div>
          <div className="flex items-center justify-between text-xs text-[#5C6068]">
            <span>
              {totalBilled > 0 ? `${Math.round((totalReceived / totalBilled) * 100)}% collection rate` : 'No bills yet'}
            </span>
            <ArrowUpRight className="w-3.5 h-3.5 opacity-0 group-hover:opacity-100 transition-opacity text-[#15803D]" />
          </div>
        </div>

        {/* Pending Receivables (Due Soon) -> Dedicated Pending Invoices View */}
        <div
          onClick={() => {
            setActiveTab('pending_invoices');
          }}
          className="bg-white border-2 border-[#C6A15B]/50 hover:border-[#C6A15B] rounded-2xl p-5 shadow-xs hover:shadow-md transition-all duration-150 hover:-translate-y-0.5 active:scale-[0.98] cursor-pointer group bg-linear-to-br from-white to-amber-50/20"
          role="button"
          tabIndex={0}
          aria-label="Open Pending Invoices View"
        >
          <div className="flex items-center justify-between text-[#C6A15B] mb-3">
            <span className="text-xs font-semibold uppercase tracking-wider text-[#5C6068] group-hover:text-[#9A7832] transition-colors">
              Pending (Due Soon)
            </span>
            <div className="p-2 rounded-xl bg-amber-50 text-[#9A7832] group-hover:bg-amber-100 transition-colors">
              <Clock className="w-4 h-4" />
            </div>
          </div>
          <div className="text-2xl lg:text-3xl font-heading font-bold text-[#9A7832] tabular-nums mb-1">
            {formatINR(totalPending)}
          </div>
          <div className="flex items-center justify-between text-xs text-[#5C6068]">
            <span>Within active payment terms (≤ {configuredWindowDays}d)</span>
            <ArrowUpRight className="w-3.5 h-3.5 opacity-0 group-hover:opacity-100 transition-opacity text-[#9A7832]" />
          </div>
        </div>

        {/* Overdue Amount -> Invoices List filtered to Overdue */}
        <div
          onClick={() => {
            setInvoiceListInitialFilter('overdue');
            setActiveTab('invoices');
          }}
          className="bg-white border border-[#DAD8D2] rounded-2xl p-5 shadow-xs hover:border-[#B91C1C] hover:shadow-md transition-all duration-150 hover:-translate-y-0.5 active:scale-[0.98] cursor-pointer group"
          role="button"
          tabIndex={0}
          aria-label="View overdue invoices"
        >
          <div className="flex items-center justify-between text-[#B91C1C] mb-3">
            <span className="text-xs font-semibold uppercase tracking-wider text-[#5C6068] group-hover:text-[#B91C1C] transition-colors">
              Overdue Balance
            </span>
            <div className="p-2 rounded-xl bg-red-50 text-[#B91C1C] group-hover:bg-red-100 transition-colors">
              <AlertTriangle className="w-4 h-4" />
            </div>
          </div>
          <div className="text-2xl lg:text-3xl font-heading font-bold text-[#B91C1C] tabular-nums mb-1">
            {formatINR(totalOverdue)}
          </div>
          <div className="flex items-center justify-between text-xs text-[#5C6068]">
            <span>Requires prompt client reminder</span>
            <ArrowUpRight className="w-3.5 h-3.5 opacity-0 group-hover:opacity-100 transition-opacity text-[#B91C1C]" />
          </div>
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
