import React, { useState } from 'react';
import { useApp } from '../../context/AppContext';
import { formatINR } from '../../utils/indianNumbering';
import {
  calculateOutstandingBalance,
  calculateReceivedAmount,
} from '../../utils/calculations';
import {
  X,
  Send,
  MessageCircle,
  Mail,
  Copy,
  Printer,
  FileText,
  AlertCircle,
  Check,
} from 'lucide-react';

interface OutstandingReminderModalProps {
  invoiceId: string;
  onClose: () => void;
}

export const OutstandingReminderModal: React.FC<OutstandingReminderModalProps> = ({
  invoiceId,
  onClose,
}) => {
  const { invoices, payments, companySettings, bankDetails, addToast } = useApp();

  const invoice = invoices.find((i) => i.id === invoiceId);
  const invPayments = payments.filter((p) => p.invoiceId === invoiceId);

  const total = invoice?.total || 0;
  const received = calculateReceivedAmount(invPayments);
  const balance = calculateOutstandingBalance(total, invPayments);

  const [copiedType, setCopiedType] = useState<'whatsapp' | 'email' | null>(null);
  const [activeTab, setActiveTab] = useState<'statement' | 'whatsapp' | 'email'>('statement');

  if (!invoice) return null;

  if (invoice.isCancelled) {
    return (
      <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-xs no-print">
        <div className="bg-white p-6 rounded-2xl max-w-md w-full border border-[#DAD8D2] shadow-xl text-center">
          <AlertCircle className="w-8 h-8 text-red-500 mx-auto mb-2" />
          <h3 className="font-heading font-bold text-lg mb-1">Invoice Cancelled</h3>
          <p className="text-sm text-[#5C6068] mb-4">
            Reminders cannot be sent for cancelled invoices.
          </p>
          <button
            onClick={onClose}
            className="px-4 py-2 bg-[#292A2D] text-white rounded-xl text-sm"
          >
            Close
          </button>
        </div>
      </div>
    );
  }

  if (balance <= 0) {
    return (
      <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-xs no-print">
        <div className="bg-white p-6 rounded-2xl max-w-md w-full border border-[#DAD8D2] shadow-xl text-center">
          <div className="w-10 h-10 rounded-full bg-emerald-100 text-emerald-700 flex items-center justify-center mx-auto mb-3">
            <Check className="w-6 h-6" />
          </div>
          <h3 className="font-heading font-bold text-lg mb-1">Invoice Fully Settled</h3>
          <p className="text-sm text-[#5C6068] mb-4">
            Invoice {invoice.invoiceNumber} has zero outstanding balance. No reminder required.
          </p>
          <button
            onClick={onClose}
            className="px-4 py-2 bg-[#292A2D] text-white rounded-xl text-sm"
          >
            Close
          </button>
        </div>
      </div>
    );
  }

  // Pre-formatted WhatsApp Message
  const whatsappMessage = `Dear ${invoice.clientSnapshot.contactPerson || invoice.clientSnapshot.name},

Greetings from TechSozo!

This is a gentle reminder regarding your outstanding payment for Invoice *${invoice.invoiceNumber}*.

*Invoice Summary:*
• Original Invoice Total: ${formatINR(total)}
• Payments Received: ${formatINR(received)}
• *Current Outstanding Balance: ${formatINR(balance)}*
• Due Date: ${invoice.dueDate}

*Bank Transfer Details:*
• Account Name: ${bankDetails.accountName}
• Account Number: ${bankDetails.accountNumber}
• Bank & Branch: ${bankDetails.bankName}, ${bankDetails.branch}
• IFSC Code: ${bankDetails.ifscCode}
• UPI ID: ${bankDetails.upiId}

Kindly arrange for the balance settlement at your earliest convenience and share the payment reference.

Warm regards,
${companySettings.companyName}
${companySettings.phone} | ${companySettings.email}`;

  // Pre-formatted Email Body & Subject
  const emailSubject = `Payment Reminder: Outstanding Balance for Invoice ${invoice.invoiceNumber} — ${companySettings.companyName}`;
  const emailBody = `Dear ${invoice.clientSnapshot.contactPerson || invoice.clientSnapshot.name},

Greetings from ${companySettings.companyName}.

We hope this email finds you well. This is a reminder regarding the outstanding balance for invoice ${invoice.invoiceNumber}.

STATEMENT OF ACCOUNT:
-------------------------------------------
Invoice Number: ${invoice.invoiceNumber}
Issue Date: ${invoice.issueDate}
Due Date: ${invoice.dueDate}
Original Total: ${formatINR(total)}
Amount Received: ${formatINR(received)}
OUTSTANDING BALANCE DUE: ${formatINR(balance)}
-------------------------------------------

BANK PAYMENT DETAILS:
Account Name: ${bankDetails.accountName}
Account Number: ${bankDetails.accountNumber}
Bank: ${bankDetails.bankName} (${bankDetails.branch})
IFSC Code: ${bankDetails.ifscCode}
UPI ID: ${bankDetails.upiId}

Please let us know once the transfer is executed so we can update your ledger. If you have already made the transfer, please disregard this email.

Warm regards,
Billing Team
${companySettings.companyName}
${companySettings.phone}
${companySettings.email}`;

  const copyToClipboard = (text: string, type: 'whatsapp' | 'email') => {
    navigator.clipboard.writeText(text);
    setCopiedType(type);
    addToast(`${type === 'whatsapp' ? 'WhatsApp message' : 'Email template'} copied to clipboard!`, 'success');
    setTimeout(() => setCopiedType(null), 3000);
  };

  const handleOpenWhatsApp = () => {
    const cleanPhone = (invoice.clientSnapshot.phone || '').replace(/\D/g, '');
    const encoded = encodeURIComponent(whatsappMessage);
    const url = cleanPhone ? `https://wa.me/${cleanPhone}?text=${encoded}` : `https://wa.me/?text=${encoded}`;
    window.open(url, '_blank');
  };

  const handleOpenEmail = () => {
    const clientEmail = invoice.clientSnapshot.email || '';
    const mailto = `mailto:${clientEmail}?subject=${encodeURIComponent(emailSubject)}&body=${encodeURIComponent(emailBody)}`;
    window.location.href = mailto;
  };

  const handlePrintStatement = () => {
    window.print();
  };

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-xs animate-in fade-in"
      role="dialog"
      aria-modal="true"
    >
      <div className="bg-[#FAF9F6] border border-[#DAD8D2] rounded-2xl max-w-3xl w-full p-6 shadow-2xl animate-in zoom-in-95 duration-200 max-h-[92vh] flex flex-col">
        {/* Modal Header */}
        <div className="flex items-start justify-between border-b border-[#DAD8D2] pb-4 mb-4 no-print">
          <div className="flex items-center gap-3">
            <div className="p-2.5 rounded-xl bg-[#292A2D] text-[#C6A15B]">
              <Send className="w-5 h-5" />
            </div>
            <div>
              <h2 className="text-lg font-heading font-bold text-[#1A1B1E]">
                Outstanding Balance Statement & Reminder
              </h2>
              <p className="text-xs text-[#5C6068]">
                Reference: <strong className="text-[#292A2D]">{invoice.invoiceNumber}</strong> • Client:{' '}
                <strong className="text-[#292A2D]">{invoice.clientSnapshot.name}</strong>
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

        {/* View Mode Tabs */}
        <div className="flex items-center gap-2 border-b border-[#DAD8D2] pb-3 mb-4 text-xs no-print">
          <button
            onClick={() => setActiveTab('statement')}
            className={`px-3.5 py-2 rounded-xl font-semibold flex items-center gap-1.5 transition-colors ${
              activeTab === 'statement'
                ? 'bg-[#292A2D] text-[#FAF9F6]'
                : 'text-[#4C5056] hover:bg-[#F1F0ED]'
            }`}
          >
            <FileText className="w-4 h-4 text-[#C6A15B]" />
            <span>Formal Statement Preview</span>
          </button>
          <button
            onClick={() => setActiveTab('whatsapp')}
            className={`px-3.5 py-2 rounded-xl font-semibold flex items-center gap-1.5 transition-colors ${
              activeTab === 'whatsapp'
                ? 'bg-[#292A2D] text-[#FAF9F6]'
                : 'text-[#4C5056] hover:bg-[#F1F0ED]'
            }`}
          >
            <MessageCircle className="w-4 h-4 text-[#15803D]" />
            <span>WhatsApp Template</span>
          </button>
          <button
            onClick={() => setActiveTab('email')}
            className={`px-3.5 py-2 rounded-xl font-semibold flex items-center gap-1.5 transition-colors ${
              activeTab === 'email'
                ? 'bg-[#292A2D] text-[#FAF9F6]'
                : 'text-[#4C5056] hover:bg-[#F1F0ED]'
            }`}
          >
            <Mail className="w-4 h-4 text-blue-500" />
            <span>Email Template</span>
          </button>
        </div>

        {/* Content Body */}
        <div className="flex-1 overflow-y-auto pr-1">
          {/* 1. Formal Statement Layout */}
          {activeTab === 'statement' && (
            <div className="bg-white p-6 rounded-2xl border border-[#DAD8D2] shadow-xs space-y-6">
              {/* Header */}
              <div className="flex justify-between items-start border-b border-[#DAD8D2] pb-4">
                <div>
                  <h3 className="font-heading font-extrabold text-lg text-[#292A2D]">
                    {companySettings.companyName}
                  </h3>
                  <p className="text-xs text-[#5C6068]">{companySettings.address}</p>
                  <p className="text-xs text-[#5C6068]">
                    {companySettings.city}, {companySettings.state} - {companySettings.pincode}
                  </p>
                  <p className="text-xs text-[#5C6068]">{companySettings.email}</p>
                </div>
                <div className="text-right">
                  <span className="text-xs font-bold uppercase tracking-wider px-2.5 py-1 bg-[#FAF5E8] text-[#9A7832] border border-[#C6A15B]/30 rounded-lg inline-block mb-1">
                    Outstanding Statement
                  </span>
                  <p className="text-xs font-semibold text-[#1A1B1E]">
                    Ref: {invoice.invoiceNumber}
                  </p>
                  <p className="text-xs text-[#5C6068]">
                    Statement Date: {new Date().toISOString().split('T')[0]}
                  </p>
                </div>
              </div>

              {/* Client & Invoice Summary */}
              <div className="grid grid-cols-2 gap-4 text-xs">
                <div>
                  <span className="font-semibold text-[#5C6068] block mb-1">STATEMENT FOR:</span>
                  <p className="font-bold text-sm text-[#1A1B1E]">{invoice.clientSnapshot.name}</p>
                  <p className="text-[#5C6068]">Attn: {invoice.clientSnapshot.contactPerson}</p>
                  <p className="text-[#5C6068]">{invoice.clientSnapshot.email}</p>
                  <p className="text-[#5C6068]">{invoice.clientSnapshot.phone}</p>
                </div>
                <div className="text-right">
                  <span className="font-semibold text-[#5C6068] block mb-1">PAYMENT DETAILS:</span>
                  <p className="text-[#4C5056]">Original Invoice Date: {invoice.issueDate}</p>
                  <p className="text-[#4C5056] font-semibold text-red-600">
                    Payment Due Date: {invoice.dueDate}
                  </p>
                </div>
              </div>

              {/* Statement Accounting Table */}
              <div className="border border-[#DAD8D2] rounded-xl overflow-hidden text-xs">
                <table className="w-full">
                  <thead className="bg-[#292A2D] text-[#FAF9F6]">
                    <tr>
                      <th className="py-2.5 px-3 text-left">Description</th>
                      <th className="py-2.5 px-3 text-right">Amount</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-[#DAD8D2]">
                    <tr>
                      <td className="py-2.5 px-3">
                        Original Invoice Total (Ref: {invoice.invoiceNumber})
                      </td>
                      <td className="py-2.5 px-3 text-right font-medium tabular-nums">
                        {formatINR(total)}
                      </td>
                    </tr>
                    <tr className="bg-[#FAF9F6]">
                      <td className="py-2.5 px-3 text-[#15803D]">
                        Less: Valid Payments Received to Date
                      </td>
                      <td className="py-2.5 px-3 text-right font-medium text-[#15803D] tabular-nums">
                        - {formatINR(received)}
                      </td>
                    </tr>
                    <tr className="bg-[#F1F0ED] font-bold text-sm">
                      <td className="py-3 px-3 text-[#292A2D]">
                        TOTAL OUTSTANDING BALANCE
                      </td>
                      <td className="py-3 px-3 text-right text-[#B91C1C] tabular-nums font-heading">
                        {formatINR(balance)}
                      </td>
                    </tr>
                  </tbody>
                </table>
              </div>

              {/* Bank Remittance Details Box */}
              <div className="bg-[#FAF9F6] p-4 rounded-xl border border-[#DAD8D2] text-xs">
                <span className="font-semibold text-[#292A2D] uppercase tracking-wider block mb-2">
                  Remittance / Bank Account Details
                </span>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 text-[#4C5056]">
                  <div>
                    Account Name: <strong>{bankDetails.accountName}</strong>
                  </div>
                  <div>
                    Account Number: <strong>{bankDetails.accountNumber}</strong>
                  </div>
                  <div>
                    Bank & Branch: <strong>{bankDetails.bankName}, {bankDetails.branch}</strong>
                  </div>
                  <div>
                    IFSC Code: <strong>{bankDetails.ifscCode}</strong>
                  </div>
                  <div className="sm:col-span-2">
                    UPI ID: <strong>{bankDetails.upiId}</strong>
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* 2. WhatsApp Message View */}
          {activeTab === 'whatsapp' && (
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <span className="text-xs font-semibold text-[#4C5056]">
                  Copy or immediately open in WhatsApp chat:
                </span>
                <button
                  onClick={() => copyToClipboard(whatsappMessage, 'whatsapp')}
                  className="flex items-center gap-1.5 text-xs font-semibold text-[#9A7832] hover:text-[#C6A15B] px-3 py-1.5 bg-white border border-[#DAD8D2] rounded-lg"
                >
                  {copiedType === 'whatsapp' ? <Check className="w-3.5 h-3.5 text-emerald-600" /> : <Copy className="w-3.5 h-3.5" />}
                  <span>{copiedType === 'whatsapp' ? 'Copied!' : 'Copy Text'}</span>
                </button>
              </div>

              <pre className="p-4 bg-[#EFEAE2] text-[#111B21] rounded-2xl border border-[#DAD8D2] text-xs font-sans whitespace-pre-wrap leading-relaxed shadow-inner">
                {whatsappMessage}
              </pre>

              <button
                onClick={handleOpenWhatsApp}
                className="w-full flex items-center justify-center gap-2 px-4 py-3 bg-[#25D366] hover:bg-[#1EBE5D] text-white font-semibold text-sm rounded-xl shadow-md transition-all min-h-[44px]"
              >
                <MessageCircle className="w-5 h-5" />
                <span>Open in WhatsApp Web / App</span>
              </button>
            </div>
          )}

          {/* 3. Email Template View */}
          {activeTab === 'email' && (
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <span className="text-xs font-semibold text-[#4C5056]">
                  Pre-composed email draft ready to launch:
                </span>
                <button
                  onClick={() => copyToClipboard(emailBody, 'email')}
                  className="flex items-center gap-1.5 text-xs font-semibold text-[#9A7832] hover:text-[#C6A15B] px-3 py-1.5 bg-white border border-[#DAD8D2] rounded-lg"
                >
                  {copiedType === 'email' ? <Check className="w-3.5 h-3.5 text-emerald-600" /> : <Copy className="w-3.5 h-3.5" />}
                  <span>{copiedType === 'email' ? 'Copied!' : 'Copy Body'}</span>
                </button>
              </div>

              <div className="bg-white p-4 rounded-2xl border border-[#DAD8D2] space-y-3 text-xs">
                <div>
                  <span className="text-[#5C6068] block">To:</span>
                  <span className="font-semibold text-[#1A1B1E]">
                    {invoice.clientSnapshot.email || 'No email registered on client card'}
                  </span>
                </div>
                <div>
                  <span className="text-[#5C6068] block">Subject:</span>
                  <span className="font-semibold text-[#1A1B1E]">{emailSubject}</span>
                </div>
                <div className="border-t border-[#F1F0ED] pt-3">
                  <pre className="font-sans whitespace-pre-wrap text-[#292A2D] leading-relaxed">
                    {emailBody}
                  </pre>
                </div>
              </div>

              <button
                onClick={handleOpenEmail}
                className="w-full flex items-center justify-center gap-2 px-4 py-3 bg-[#292A2D] hover:bg-[#1E1F21] text-[#FAF9F6] font-semibold text-sm rounded-xl shadow-md transition-all min-h-[44px]"
              >
                <Mail className="w-5 h-5 text-[#C6A15B]" />
                <span>Open in Default Email Client (Mailto)</span>
              </button>
            </div>
          )}
        </div>

        {/* Modal Action Bar */}
        <div className="border-t border-[#DAD8D2] pt-4 mt-4 flex items-center justify-between no-print">
          <button
            onClick={handlePrintStatement}
            className="flex items-center gap-2 px-4 py-2.5 bg-white hover:bg-[#F1F0ED] text-[#292A2D] border border-[#DAD8D2] text-xs font-semibold rounded-xl min-h-[44px]"
          >
            <Printer className="w-4 h-4 text-[#C6A15B]" />
            <span>Print Statement</span>
          </button>

          <button
            onClick={onClose}
            className="px-5 py-2.5 bg-[#292A2D] hover:bg-[#1E1F21] text-[#FAF9F6] text-xs font-semibold rounded-xl min-h-[44px]"
          >
            Close
          </button>
        </div>
      </div>
    </div>
  );
};
