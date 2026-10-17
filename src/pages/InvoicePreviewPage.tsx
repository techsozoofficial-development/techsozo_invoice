import React, { useState } from 'react';
import { useApp } from '../context/AppContext';
import { formatINR } from '../utils/indianNumbering';
import {
  calculateOutstandingBalance,
  calculateReceivedAmount,
} from '../utils/calculations';
import { BrandLogo } from '../components/ui/BrandLogo';
import { ConfirmModal } from '../components/ui/ConfirmModal';
import { PaymentManagerModal } from '../components/payments/PaymentManagerModal';
import { OutstandingReminderModal } from '../components/reminders/OutstandingReminderModal';
import {
  ArrowLeft,
  Printer,
  CreditCard,
  Send,
  Ban,
  Edit,
  FileCheck,
  CheckCircle2,
  AlertTriangle,
  Clock,
  ShieldAlert,
} from 'lucide-react';

interface InvoicePreviewPageProps {
  invoiceId: string;
  onBack: () => void;
}

export const InvoicePreviewPage: React.FC<InvoicePreviewPageProps> = ({
  invoiceId,
  onBack,
}) => {
  const {
    invoices,
    payments,
    finalizeInvoice,
    cancelInvoice,
    setEditingDraftId,
    setActiveTab,
    paymentModalInvoiceId,
    setPaymentModalInvoiceId,
    reminderModalInvoiceId,
    setReminderModalInvoiceId,
  } = useApp();

  const invoice = invoices.find((i) => i.id === invoiceId);
  const invPayments = payments.filter((p) => p.invoiceId === invoiceId);

  // Modals
  const [isFinalizeModalOpen, setIsFinalizeModalOpen] = useState(false);
  const [isCancelModalOpen, setIsCancelModalOpen] = useState(false);

  if (!invoice) {
    return (
      <div className="p-8 text-center text-[#5C6068]">
        <p className="text-base font-semibold text-[#1A1B1E] mb-2">Invoice Not Found</p>
        <button
          onClick={onBack}
          className="px-4 py-2 bg-[#292A2D] text-white rounded-xl text-xs font-semibold"
        >
          Return to Invoices List
        </button>
      </div>
    );
  }

  const total = invoice.total;
  const received = calculateReceivedAmount(invPayments);
  const balance = calculateOutstandingBalance(total, invPayments);
  const isDraft = !invoice.isFinalized;
  const isCancelled = invoice.isCancelled;

  const handlePrint = () => {
    window.print();
  };

  const handleConfirmFinalize = async () => {
    setIsFinalizeModalOpen(false);
    await finalizeInvoice(invoice.id);
  };

  const handleConfirmCancel = async (reason?: string) => {
    setIsCancelModalOpen(false);
    await cancelInvoice(invoice.id, reason || 'Cancelled by authorized user.');
  };

  const handleEditDraft = () => {
    setEditingDraftId(invoice.id);
    setActiveTab('create_invoice');
  };

  return (
    <div className="space-y-6">
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

      <ConfirmModal
        isOpen={isFinalizeModalOpen}
        onClose={() => setIsFinalizeModalOpen(false)}
        onConfirm={handleConfirmFinalize}
        title="Finalize & Issue Official Invoice?"
        description="Finalizing this draft will assign the permanent sequential statutory number (INV/26-27/xxx). All figures will be locked and tamper-resistant."
        confirmLabel="Finalize & Assign Number"
      />

      <ConfirmModal
        isOpen={isCancelModalOpen}
        onClose={() => setIsCancelModalOpen(false)}
        onConfirm={handleConfirmCancel}
        title="Cancel Invoice?"
        description="Cancelling an invoice permanently prevents payment collection while preserving the number in the financial audit record."
        confirmLabel="Confirm Cancellation"
        variant="warning"
        requireReason={true}
      />

      {/* Action Bar (Hidden on print) */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 bg-white p-4 rounded-2xl border border-[#DAD8D2] shadow-xs no-print">
        <button
          onClick={onBack}
          className="flex items-center gap-2 text-xs font-semibold text-[#4C5056] hover:text-[#1A1B1E] transition-colors"
        >
          <ArrowLeft className="w-4 h-4" />
          <span>Back to Ledger</span>
        </button>

        <div className="flex items-center gap-2.5 flex-wrap">
          {/* Print / Save PDF */}
          <button
            onClick={handlePrint}
            className="flex items-center gap-2 px-3.5 py-2 bg-[#292A2D] hover:bg-[#1E1F21] text-[#FAF9F6] text-xs font-semibold rounded-xl shadow-xs transition-colors min-h-[44px]"
          >
            <Printer className="w-4 h-4 text-[#C6A15B]" />
            <span>Print / Save as PDF</span>
          </button>

          {/* Draft Actions */}
          {isDraft && (
            <>
              <button
                onClick={handleEditDraft}
                className="flex items-center gap-1.5 px-3.5 py-2 bg-[#F1F0ED] hover:bg-[#E5E3DD] text-[#292A2D] text-xs font-semibold rounded-xl min-h-[44px]"
              >
                <Edit className="w-4 h-4 text-[#C6A15B]" />
                <span>Edit Draft</span>
              </button>
              <button
                onClick={() => setIsFinalizeModalOpen(true)}
                className="flex items-center gap-1.5 px-4 py-2 bg-[#C6A15B] hover:bg-[#B38E46] text-[#292A2D] text-xs font-bold rounded-xl shadow-xs min-h-[44px]"
              >
                <FileCheck className="w-4 h-4" />
                <span>Finalize Invoice</span>
              </button>
            </>
          )}

          {/* Finalized Active Actions */}
          {!isDraft && !isCancelled && (
            <>
              {balance > 0 && (
                <>
                  <button
                    onClick={() => setPaymentModalInvoiceId(invoice.id)}
                    className="flex items-center gap-1.5 px-3.5 py-2 bg-[#FAF5E8] hover:bg-[#C6A15B] hover:text-[#292A2D] text-[#9A7832] border border-[#C6A15B]/40 text-xs font-bold rounded-xl min-h-[44px]"
                  >
                    <CreditCard className="w-4 h-4" />
                    <span>Record Payment</span>
                  </button>
                  <button
                    onClick={() => setReminderModalInvoiceId(invoice.id)}
                    className="flex items-center gap-1.5 px-3.5 py-2 bg-[#F1F0ED] hover:bg-[#E5E3DD] text-[#292A2D] text-xs font-semibold rounded-xl min-h-[44px]"
                  >
                    <Send className="w-4 h-4 text-[#C6A15B]" />
                    <span>Balance Reminder</span>
                  </button>
                </>
              )}
              <button
                onClick={() => setIsCancelModalOpen(true)}
                className="flex items-center gap-1.5 px-3 py-2 text-neutral-500 hover:text-red-600 hover:bg-red-50 text-xs font-medium rounded-xl min-h-[44px]"
                title="Cancel invoice while keeping record"
              >
                <Ban className="w-4 h-4" />
                <span>Cancel</span>
              </button>
            </>
          )}
        </div>
      </div>

      {/* ================= PRINTABLE INVOICE SHEET ================= */}
      <div className="bg-white border border-[#DAD8D2] rounded-2xl shadow-md p-6 sm:p-10 max-w-4xl mx-auto print:border-none print:shadow-none print:p-0 print:max-w-none">
        {/* Top Header Band */}
        <div className="bg-[#292A2D] text-[#FAF9F6] p-6 sm:p-8 rounded-xl sm:rounded-2xl mb-8 flex flex-col sm:flex-row sm:items-center justify-between gap-6 print:bg-[#292A2D] print:text-white">
          <div className="space-y-1">
            <BrandLogo variant="full" size="lg" />
            <p className="text-xs text-[#B9BCC4] max-w-sm pt-1">
              {invoice.companySnapshot.tagline || 'Digital Growth & Media Solutions'}
            </p>
          </div>

          <div className="text-left sm:text-right space-y-1">
            <h1 className="text-2xl font-heading font-extrabold text-[#C6A15B] tracking-wide">
              {invoice.taxSnapshot.enabled ? 'TAX INVOICE' : 'INVOICE'}
            </h1>
            <div className="font-heading font-bold text-base text-[#FAF9F6] tracking-wider">
              {invoice.invoiceNumber || 'DRAFT (PREVIEW)'}
            </div>
            {invoice.financialYear && (
              <span className="text-[11px] text-[#B9BCC4] block">
                Financial Year: 20{invoice.financialYear.replace('-', '-20')}
              </span>
            )}
          </div>
        </div>

        {/* Cancellation Notice Banner (If cancelled) */}
        {isCancelled && (
          <div className="mb-6 p-4 bg-red-50 border-2 border-red-300 rounded-xl text-red-800 text-xs flex items-start gap-3">
            <ShieldAlert className="w-5 h-5 text-red-600 shrink-0 mt-0.5" />
            <div>
              <strong className="block text-sm font-heading font-bold uppercase tracking-wider mb-0.5">
                INVOICE CANCELLED & VOID
              </strong>
              <p>
                Cancelled on {invoice.cancelledAt?.split('T')[0]}. Reason:{' '}
                <em>{invoice.cancellationReason || 'No reason provided.'}</em>
              </p>
              <p className="text-[11px] text-red-600 mt-1">
                This document is void. Its sequential number remains reserved in the statutory sequence and is never reused.
              </p>
            </div>
          </div>
        )}

        {/* 2-Column: Company Info & Bill To */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-8 mb-8 pb-8 border-b border-[#DAD8D2] text-xs leading-relaxed">
          {/* Company details */}
          <div>
            <span className="text-[11px] font-bold uppercase tracking-wider text-[#9A7832] block mb-2">
              ISSUED BY:
            </span>
            <div className="font-heading font-bold text-base text-[#1A1B1E] mb-1">
              {invoice.companySnapshot.companyName}
            </div>
            <p className="text-[#4C5056]">{invoice.companySnapshot.address}</p>
            <p className="text-[#4C5056]">
              {invoice.companySnapshot.city}, {invoice.companySnapshot.state} - {invoice.companySnapshot.pincode}
            </p>
            <p className="text-[#4C5056]">Email: {invoice.companySnapshot.email}</p>
            <p className="text-[#4C5056]">Phone: {invoice.companySnapshot.phone}</p>
            {invoice.companySnapshot.gstin && (
              <p className="text-[#1A1B1E] font-medium font-mono mt-1">
                GSTIN: {invoice.companySnapshot.gstin}
              </p>
            )}
          </div>

          {/* Bill-to details */}
          <div className="sm:text-right">
            <span className="text-[11px] font-bold uppercase tracking-wider text-[#9A7832] block mb-2">
              BILLED TO:
            </span>
            <div className="font-heading font-bold text-base text-[#1A1B1E] mb-1">
              {invoice.clientSnapshot.name}
            </div>
            <p className="text-[#4C5056]">Attn: {invoice.clientSnapshot.contactPerson}</p>
            <p className="text-[#4C5056]">{invoice.clientSnapshot.address}</p>
            <p className="text-[#4C5056]">
              {invoice.clientSnapshot.city}, {invoice.clientSnapshot.state} - {invoice.clientSnapshot.pincode}
            </p>
            <p className="text-[#4C5056]">Email: {invoice.clientSnapshot.email}</p>
            <p className="text-[#4C5056]">Phone: {invoice.clientSnapshot.phone}</p>
            {invoice.clientSnapshot.gstin && (
              <p className="text-[#1A1B1E] font-medium font-mono mt-1">
                Client GSTIN: {invoice.clientSnapshot.gstin}
              </p>
            )}

            {/* Dates Strip */}
            <div className="mt-4 pt-3 border-t border-[#F1F0ED] space-y-1">
              <div className="flex justify-between sm:justify-end gap-3">
                <span className="text-[#5C6068]">Invoice Date:</span>
                <span className="font-semibold text-[#1A1B1E]">{invoice.issueDate}</span>
              </div>
              <div className="flex justify-between sm:justify-end gap-3">
                <span className="text-[#5C6068]">Due Date:</span>
                <span className="font-semibold text-[#1A1B1E]">{invoice.dueDate}</span>
              </div>
            </div>
          </div>
        </div>

        {/* Line Items Table */}
        <div className="mb-8 overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead>
              <tr className="border-b-2 border-[#292A2D] text-[#292A2D] font-bold uppercase tracking-wider">
                <th className="py-3 px-3 w-10 text-center">#</th>
                <th className="py-3 px-3">Service & Description</th>
                <th className="py-3 px-3 w-20 text-center">SAC</th>
                <th className="py-3 px-3 w-20 text-right">Qty</th>
                <th className="py-3 px-3 w-28 text-right">Rate</th>
                <th className="py-3 px-3 w-32 text-right">Amount</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-[#DAD8D2]">
              {invoice.items.map((item, idx) => (
                <tr key={item.id} className="text-[#292A2D]">
                  <td className="py-3.5 px-3 text-center text-[#5C6068]">{idx + 1}</td>
                  <td className="py-3.5 px-3">
                    <span className="font-semibold text-sm text-[#1A1B1E] block">
                      {item.description}
                    </span>
                  </td>
                  <td className="py-3.5 px-3 text-center font-mono text-[#5C6068]">
                    {item.sac || '998361'}
                  </td>
                  <td className="py-3.5 px-3 text-right tabular-nums">{item.quantity}</td>
                  <td className="py-3.5 px-3 text-right tabular-nums">{formatINR(item.rate)}</td>
                  <td className="py-3.5 px-3 text-right font-medium tabular-nums">
                    {formatINR(item.amount)}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        {/* Accounting Calculation Summary */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-8 mb-8 text-xs">
          {/* Amount in words & notes */}
          <div className="space-y-4">
            <div className="p-4 rounded-xl bg-[#FAF9F6] border border-[#DAD8D2]">
              <span className="text-[10px] uppercase font-bold text-[#9A7832] block mb-1">
                Total Amount in Words:
              </span>
              <p className="font-heading font-semibold text-sm text-[#292A2D] leading-relaxed">
                {invoice.amountInWords}
              </p>
            </div>

            {invoice.notes && (
              <div>
                <span className="font-semibold text-[#5C6068] uppercase text-[11px] block mb-1">
                  Notes:
                </span>
                <p className="text-[#4C5056] leading-relaxed whitespace-pre-wrap">{invoice.notes}</p>
              </div>
            )}
          </div>

          {/* Subtotal, discount, taxes, total */}
          <div className="space-y-2 text-right">
            <div className="flex justify-between py-1 border-b border-[#F1F0ED]">
              <span className="text-[#5C6068]">Subtotal:</span>
              <span className="font-medium text-[#1A1B1E] tabular-nums">
                {formatINR(invoice.subtotal)}
              </span>
            </div>

            {invoice.discountAmount > 0 && (
              <div className="flex justify-between py-1 border-b border-[#F1F0ED] text-red-600">
                <span>Discount ({invoice.discountPercent}%):</span>
                <span className="font-medium tabular-nums">- {formatINR(invoice.discountAmount)}</span>
              </div>
            )}

            {invoice.taxSnapshot.enabled && (
              <>
                {invoice.taxSnapshot.isInterstate ? (
                  <div className="flex justify-between py-1 border-b border-[#F1F0ED]">
                    <span className="text-[#5C6068]">
                      IGST ({invoice.taxSnapshot.igstRate}%):
                    </span>
                    <span className="font-medium text-[#1A1B1E] tabular-nums">
                      {formatINR(invoice.taxSnapshot.igstAmount)}
                    </span>
                  </div>
                ) : (
                  <>
                    <div className="flex justify-between py-1 border-b border-[#F1F0ED]">
                      <span className="text-[#5C6068]">
                        CGST ({invoice.taxSnapshot.cgstRate}%):
                      </span>
                      <span className="font-medium text-[#1A1B1E] tabular-nums">
                        {formatINR(invoice.taxSnapshot.cgstAmount)}
                      </span>
                    </div>
                    <div className="flex justify-between py-1 border-b border-[#F1F0ED]">
                      <span className="text-[#5C6068]">
                        SGST ({invoice.taxSnapshot.sgstRate}%):
                      </span>
                      <span className="font-medium text-[#1A1B1E] tabular-nums">
                        {formatINR(invoice.taxSnapshot.sgstAmount)}
                      </span>
                    </div>
                  </>
                )}
              </>
            )}

            {invoice.roundOff !== 0 && (
              <div className="flex justify-between py-1 border-b border-[#F1F0ED] text-[11px] text-[#5C6068]">
                <span>Round-off:</span>
                <span className="tabular-nums">
                  {invoice.roundOff > 0 ? `+${invoice.roundOff}` : invoice.roundOff}
                </span>
              </div>
            )}

            <div className="flex justify-between py-2 border-t-2 border-[#292A2D] text-base font-heading font-extrabold text-[#292A2D]">
              <span>Grand Total:</span>
              <span className="tabular-nums">{formatINR(invoice.total)}</span>
            </div>

            {/* Payment status breakdown */}
            <div className="pt-2 border-t border-[#F1F0ED] text-xs space-y-1">
              <div className="flex justify-between text-[#15803D]">
                <span>Total Received:</span>
                <span className="font-semibold tabular-nums">{formatINR(received)}</span>
              </div>
              <div className="flex justify-between font-bold text-sm">
                <span className="text-[#9A7832]">Balance Due:</span>
                <span className={`tabular-nums ${balance > 0 ? 'text-[#B91C1C]' : 'text-[#15803D]'}`}>
                  {formatINR(balance)}
                </span>
              </div>
            </div>
          </div>
        </div>

        {/* Remittance Bank Details & Signatory Section */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-8 pt-6 border-t border-[#DAD8D2] text-xs print-break-inside-avoid">
          {/* Bank Details */}
          <div className="p-4 rounded-xl bg-[#FAF9F6] border border-[#DAD8D2]">
            <span className="font-heading font-bold uppercase tracking-wider text-[#9A7832] text-[11px] block mb-2">
              Payment Remittance Details:
            </span>
            <div className="space-y-1 text-[#4C5056]">
              <div>Account Name: <strong className="text-[#1A1B1E]">{invoice.bankDetailsSnapshot.accountName}</strong></div>
              <div>Account No: <strong className="text-[#1A1B1E] font-mono">{invoice.bankDetailsSnapshot.accountNumber}</strong></div>
              <div>Bank: <strong className="text-[#1A1B1E]">{invoice.bankDetailsSnapshot.bankName}</strong></div>
              <div>Branch: <strong className="text-[#1A1B1E]">{invoice.bankDetailsSnapshot.branch}</strong></div>
              <div>IFSC Code: <strong className="text-[#1A1B1E] font-mono">{invoice.bankDetailsSnapshot.ifscCode}</strong></div>
              <div>UPI ID: <strong className="text-[#1A1B1E]">{invoice.bankDetailsSnapshot.upiId}</strong></div>
            </div>
          </div>

          {/* Authorized Signatory */}
          <div className="flex flex-col justify-between text-right">
            <div>
              <span className="font-heading font-semibold text-xs text-[#1A1B1E] block">
                For {invoice.companySnapshot.companyName}
              </span>
              <p className="text-[11px] text-[#5C6068]">Authorized Signatory</p>
            </div>

            <div className="pt-12">
              <div className="border-t border-[#DAD8D2] w-48 ml-auto pt-1 text-[11px] text-[#5C6068]">
                Computer generated invoice
              </div>
            </div>
          </div>
        </div>

        {/* Terms & Footer */}
        {invoice.paymentTerms && (
          <div className="mt-8 pt-6 border-t border-[#DAD8D2] text-[11px] text-[#5C6068] leading-relaxed">
            <span className="font-semibold uppercase tracking-wider block mb-1 text-[#292A2D]">
              Terms & Conditions:
            </span>
            <p className="whitespace-pre-wrap">{invoice.paymentTerms}</p>
          </div>
        )}

        <div className="mt-6 pt-4 border-t border-[#F1F0ED] text-center text-[10px] text-[#8E929B]">
          {invoice.companySnapshot.footerText}
        </div>
      </div>
    </div>
  );
};
