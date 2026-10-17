import React, { useState } from 'react';
import { useApp } from '../../context/AppContext';
import { Invoice, Payment, PaymentMode } from '../../types';
import { formatINR } from '../../utils/indianNumbering';
import {
  calculateOutstandingBalance,
  calculateReceivedAmount,
} from '../../utils/calculations';
import {
  X,
  PlusCircle,
  CreditCard,
  RotateCcw,
  CheckCircle2,
  Calendar,
  AlertCircle,
  History,
} from 'lucide-react';

interface PaymentManagerModalProps {
  invoiceId: string;
  onClose: () => void;
}

export const PaymentManagerModal: React.FC<PaymentManagerModalProps> = ({
  invoiceId,
  onClose,
}) => {
  const { invoices, payments, recordPayment, reversePayment, addToast } = useApp();

  const invoice = invoices.find((i) => i.id === invoiceId);
  const invPayments = payments.filter((p) => p.invoiceId === invoiceId);

  const total = invoice?.total || 0;
  const received = calculateReceivedAmount(invPayments);
  const balance = calculateOutstandingBalance(total, invPayments);

  // Form State
  const [amount, setAmount] = useState<string>(balance > 0 ? String(balance) : '');
  const [paymentDate, setPaymentDate] = useState<string>(new Date().toISOString().split('T')[0]);
  const [mode, setMode] = useState<PaymentMode>('bank_transfer');
  const [reference, setReference] = useState<string>('');
  const [notes, setNotes] = useState<string>('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [formError, setFormError] = useState<string>('');

  // Reversal State
  const [reversingPaymentId, setReversingPaymentId] = useState<string | null>(null);
  const [reversalReason, setReversalReason] = useState<string>('');

  if (!invoice) return null;

  const handleSubmitPayment = async (e: React.FormEvent) => {
    e.preventDefault();
    setFormError('');

    const numAmount = parseFloat(amount);
    if (isNaN(numAmount) || numAmount <= 0) {
      setFormError('Please enter a valid payment amount greater than zero.');
      return;
    }

    if (numAmount > balance + 0.05) {
      setFormError(
        `Overpayment protection: Payment of ₹${numAmount.toLocaleString('en-IN')} exceeds current outstanding balance of ₹${balance.toLocaleString('en-IN')}.`
      );
      return;
    }

    if (!reference.trim()) {
      setFormError('Transaction reference or cheque/UPI ID is required for accounting verification.');
      return;
    }

    try {
      setIsSubmitting(true);
      await recordPayment({
        invoiceId: invoice.id,
        amount: numAmount,
        paymentDate,
        mode,
        reference: reference.trim(),
        notes: notes.trim(),
      });
      // Reset form
      setAmount('');
      setReference('');
      setNotes('');
    } catch (err: any) {
      setFormError(err.message || 'Error recording payment.');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleConfirmReversal = async (paymentId: string) => {
    if (!reversalReason.trim()) {
      addToast('A reversal reason is required for audit trail integrity.', 'error');
      return;
    }

    try {
      await reversePayment({
        paymentId,
        reason: reversalReason.trim(),
      });
      setReversingPaymentId(null);
      setReversalReason('');
    } catch (err: any) {
      addToast(err.message || 'Error reversing payment.', 'error');
    }
  };

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-xs animate-in fade-in no-print"
      role="dialog"
      aria-modal="true"
      aria-labelledby="payment-modal-title"
    >
      <div className="bg-[#FAF9F6] border border-[#DAD8D2] rounded-2xl max-w-2xl w-full p-6 shadow-2xl animate-in zoom-in-95 duration-200 max-h-[90vh] flex flex-col">
        {/* Header */}
        <div className="flex items-start justify-between border-b border-[#DAD8D2] pb-4 mb-4">
          <div className="flex items-center gap-3">
            <div className="p-2.5 rounded-xl bg-[#292A2D] text-[#C6A15B]">
              <CreditCard className="w-5 h-5" />
            </div>
            <div>
              <h2 id="payment-modal-title" className="text-lg font-heading font-bold text-[#1A1B1E]">
                Payment Management — {invoice.invoiceNumber || 'Draft Invoice'}
              </h2>
              <p className="text-xs text-[#5C6068]">
                Client: <strong className="text-[#292A2D]">{invoice.clientSnapshot.name}</strong>
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 rounded-lg text-[#5C6068] hover:text-[#1A1B1E] hover:bg-[#F1F0ED] transition-colors"
            aria-label="Close modal"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Invoice Summary Strip */}
        <div className="grid grid-cols-3 gap-3 p-3.5 bg-white border border-[#DAD8D2] rounded-xl mb-5 text-center text-xs">
          <div>
            <span className="text-[#5C6068] block mb-0.5">Invoice Total</span>
            <span className="font-heading font-bold text-sm text-[#1A1B1E] tabular-nums">
              {formatINR(total)}
            </span>
          </div>
          <div className="border-x border-[#F1F0ED]">
            <span className="text-[#15803D] block mb-0.5">Total Received</span>
            <span className="font-heading font-bold text-sm text-[#15803D] tabular-nums">
              {formatINR(received)}
            </span>
          </div>
          <div>
            <span className="text-[#9A7832] block mb-0.5">Balance Due</span>
            <span
              className={`font-heading font-bold text-sm tabular-nums ${
                balance > 0 ? 'text-[#B91C1C]' : 'text-[#15803D]'
              }`}
            >
              {formatINR(balance)}
            </span>
          </div>
        </div>

        <div className="flex-1 overflow-y-auto space-y-6 pr-1">
          {/* Record New Payment Form (Only if balance > 0) */}
          {balance > 0 ? (
            <form onSubmit={handleSubmitPayment} className="bg-white p-4 rounded-xl border border-[#DAD8D2] space-y-3">
              <h4 className="text-xs font-semibold text-[#1A1B1E] uppercase tracking-wider flex items-center gap-1.5">
                <PlusCircle className="w-4 h-4 text-[#C6A15B]" />
                <span>Record New Payment Entry</span>
              </h4>

              {formError && (
                <div className="p-3 bg-red-50 border border-red-200 text-red-700 text-xs rounded-xl flex items-start gap-2">
                  <AlertCircle className="w-4 h-4 shrink-0 mt-0.5" />
                  <span>{formError}</span>
                </div>
              )}

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                {/* Amount */}
                <div>
                  <label className="block text-xs font-medium text-[#4C5056] mb-1">
                    Amount Received (₹) <span className="text-red-500">*</span>
                  </label>
                  <input
                    type="number"
                    step="0.01"
                    min="1"
                    max={balance}
                    value={amount}
                    onChange={(e) => setAmount(e.target.value)}
                    required
                    placeholder="e.g. 25000"
                    className="w-full px-3 py-2 text-sm bg-[#FAF9F6] border border-[#DAD8D2] rounded-xl focus:outline-none focus:ring-2 focus:ring-[#C6A15B]"
                  />
                  <div className="flex justify-between items-center mt-1">
                    <span className="text-[11px] text-[#5C6068]">Max: {formatINR(balance)}</span>
                    <button
                      type="button"
                      onClick={() => setAmount(String(balance))}
                      className="text-[11px] text-[#9A7832] hover:underline font-semibold"
                    >
                      Pay Full Balance
                    </button>
                  </div>
                </div>

                {/* Payment Date */}
                <div>
                  <label className="block text-xs font-medium text-[#4C5056] mb-1">
                    Payment Date <span className="text-red-500">*</span>
                  </label>
                  <input
                    type="date"
                    value={paymentDate}
                    onChange={(e) => setPaymentDate(e.target.value)}
                    required
                    className="w-full px-3 py-2 text-sm bg-[#FAF9F6] border border-[#DAD8D2] rounded-xl focus:outline-none focus:ring-2 focus:ring-[#C6A15B]"
                  />
                </div>

                {/* Mode */}
                <div>
                  <label className="block text-xs font-medium text-[#4C5056] mb-1">
                    Payment Method
                  </label>
                  <select
                    value={mode}
                    onChange={(e) => setMode(e.target.value as PaymentMode)}
                    className="w-full px-3 py-2 text-sm bg-[#FAF9F6] border border-[#DAD8D2] rounded-xl focus:outline-none focus:ring-2 focus:ring-[#C6A15B]"
                  >
                    <option value="bank_transfer">Bank Transfer (NEFT/RTGS/IMPS)</option>
                    <option value="upi">UPI / QR Code</option>
                    <option value="cheque">Cheque</option>
                    <option value="cash">Cash</option>
                    <option value="card">Card / POS</option>
                  </select>
                </div>

                {/* Reference */}
                <div>
                  <label className="block text-xs font-medium text-[#4C5056] mb-1">
                    Transaction Ref / Cheque No. <span className="text-red-500">*</span>
                  </label>
                  <input
                    type="text"
                    value={reference}
                    onChange={(e) => setReference(e.target.value)}
                    required
                    placeholder="e.g. UTR / UPI Ref / Cheque #1234"
                    className="w-full px-3 py-2 text-sm bg-[#FAF9F6] border border-[#DAD8D2] rounded-xl focus:outline-none focus:ring-2 focus:ring-[#C6A15B]"
                  />
                </div>
              </div>

              {/* Notes */}
              <div>
                <label className="block text-xs font-medium text-[#4C5056] mb-1">
                  Optional Remarks / Notes
                </label>
                <input
                  type="text"
                  value={notes}
                  onChange={(e) => setNotes(e.target.value)}
                  placeholder="e.g. Received advance 50% for campaign commencement"
                  className="w-full px-3 py-2 text-sm bg-[#FAF9F6] border border-[#DAD8D2] rounded-xl focus:outline-none focus:ring-2 focus:ring-[#C6A15B]"
                />
              </div>

              <div className="pt-2 flex justify-end">
                <button
                  type="submit"
                  disabled={isSubmitting}
                  className="px-5 py-2.5 bg-[#C6A15B] hover:bg-[#B38E46] text-[#292A2D] font-heading font-semibold text-sm rounded-xl transition-all shadow-sm flex items-center gap-2 min-h-[44px]"
                >
                  <PlusCircle className="w-4 h-4" />
                  <span>{isSubmitting ? 'Recording...' : 'Record Payment'}</span>
                </button>
              </div>
            </form>
          ) : (
            <div className="p-4 bg-emerald-50 border border-emerald-200 text-emerald-800 rounded-xl text-center text-sm flex items-center justify-center gap-2 font-medium">
              <CheckCircle2 className="w-5 h-5" />
              <span>This invoice is fully settled. No outstanding balance remains.</span>
            </div>
          )}

          {/* Payment History & Reversal Section */}
          <div className="space-y-3">
            <h4 className="text-xs font-semibold text-[#1A1B1E] uppercase tracking-wider flex items-center gap-1.5">
              <History className="w-4 h-4 text-[#5C6068]" />
              <span>Payment Ledger & Audit Trail ({invPayments.length})</span>
            </h4>

            {invPayments.length === 0 ? (
              <p className="text-xs text-[#5C6068] italic p-3 bg-white rounded-xl border border-[#DAD8D2] text-center">
                No payment transactions recorded for this invoice yet.
              </p>
            ) : (
              <div className="space-y-2">
                {invPayments.map((p) => (
                  <div
                    key={p.id}
                    className={`p-3.5 rounded-xl border transition-all text-xs ${
                      p.isReversed
                        ? 'bg-gray-100 border-gray-300 opacity-60'
                        : 'bg-white border-[#DAD8D2]'
                    }`}
                  >
                    <div className="flex items-start justify-between gap-3">
                      <div>
                        <div className="flex items-center gap-2 mb-1">
                          <span className="font-heading font-bold text-sm text-[#1A1B1E] tabular-nums">
                            {formatINR(p.amount)}
                          </span>
                          <span className="capitalize px-2 py-0.5 rounded-full bg-[#F1F0ED] text-[#4C5056] text-[10px] font-semibold border border-[#DAD8D2]">
                            {p.mode.replace('_', ' ')}
                          </span>
                          {p.isReversed && (
                            <span className="px-2 py-0.5 rounded-full bg-red-100 text-red-700 text-[10px] font-bold">
                              Reversed / Corrected
                            </span>
                          )}
                        </div>
                        <p className="text-[11px] text-[#4C5056]">
                          Ref: <span className="font-mono">{p.reference}</span> • Date: {p.paymentDate}
                        </p>
                        {p.notes && <p className="text-[11px] text-[#5C6068] mt-0.5">{p.notes}</p>}
                        {p.isReversed && p.reversalReason && (
                          <p className="text-[11px] text-red-600 mt-1 italic">
                            Reason: {p.reversalReason}
                          </p>
                        )}
                      </div>

                      {!p.isReversed && (
                        <div className="shrink-0">
                          {reversingPaymentId === p.id ? (
                            <div className="flex flex-col gap-1.5 items-end">
                              <input
                                type="text"
                                placeholder="Reversal reason..."
                                value={reversalReason}
                                onChange={(e) => setReversalReason(e.target.value)}
                                className="px-2 py-1 text-xs border border-red-300 rounded-lg bg-white"
                              />
                              <div className="flex items-center gap-1">
                                <button
                                  onClick={() => handleConfirmReversal(p.id)}
                                  className="px-2 py-1 bg-red-600 text-white rounded-lg text-[10px] font-semibold"
                                >
                                  Confirm
                                </button>
                                <button
                                  onClick={() => {
                                    setReversingPaymentId(null);
                                    setReversalReason('');
                                  }}
                                  className="px-2 py-1 bg-gray-200 text-gray-700 rounded-lg text-[10px]"
                                >
                                  Cancel
                                </button>
                              </div>
                            </div>
                          ) : (
                            <button
                              onClick={() => setReversingPaymentId(p.id)}
                              className="inline-flex items-center gap-1 text-[11px] text-[#5C6068] hover:text-red-600 p-1 rounded-lg hover:bg-[#F1F0ED] transition-colors"
                              title="Reverse or correct this entry (preserves audit trail)"
                            >
                              <RotateCcw className="w-3.5 h-3.5" />
                              <span>Reverse</span>
                            </button>
                          )}
                        </div>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>

        {/* Modal Footer */}
        <div className="border-t border-[#DAD8D2] pt-4 mt-4 flex justify-end">
          <button
            onClick={onClose}
            className="px-5 py-2.5 bg-[#292A2D] hover:bg-[#1E1F21] text-[#FAF9F6] text-xs font-semibold rounded-xl min-h-[44px]"
          >
            Done
          </button>
        </div>
      </div>
    </div>
  );
};
