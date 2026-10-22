import React from 'react';
import { RefreshCw, FileText, X, AlertCircle, ArrowRight } from 'lucide-react';

interface SyncClientServicesModalProps {
  isOpen: boolean;
  clientName: string;
  differences: string[];
  onUpdateClientAndContinue: () => void;
  onInvoiceOnly: () => void;
  onCancel: () => void;
  actionType: 'save' | 'finalize';
}

export const SyncClientServicesModal: React.FC<SyncClientServicesModalProps> = ({
  isOpen,
  clientName,
  differences,
  onUpdateClientAndContinue,
  onInvoiceOnly,
  onCancel,
  actionType,
}) => {
  if (!isOpen) return null;

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-xs animate-in fade-in"
      role="dialog"
      aria-modal="true"
    >
      <div className="bg-[#FAF9F6] border border-[#DAD8D2] rounded-2xl max-w-lg w-full p-6 shadow-2xl animate-in zoom-in-95 space-y-4">
        {/* Header */}
        <div className="flex items-start justify-between">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-[#F7F4EC] border border-[#C6A15B]/30 flex items-center justify-center text-[#C6A15B]">
              <RefreshCw className="w-5 h-5 animate-spin-reverse" />
            </div>
            <div>
              <h3 className="text-lg font-heading font-bold text-[#1A1B1E]">
                Update Client Services?
              </h3>
              <p className="text-xs text-gray-500 font-medium">
                Client: <span className="font-semibold text-gray-800">{clientName}</span>
              </p>
            </div>
          </div>
          <button
            onClick={onCancel}
            className="p-1.5 rounded-lg text-gray-400 hover:text-gray-600 hover:bg-gray-100 transition-colors"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Message */}
        <p className="text-sm text-[#4C5056] leading-relaxed">
          You've made changes to this client's services while preparing this invoice. Would you like to save these changes to the client's default service list for future invoices?
        </p>

        {/* Change List */}
        {differences.length > 0 && (
          <div className="bg-white border border-[#DAD8D2] rounded-xl p-3 text-xs space-y-1.5 max-h-40 overflow-y-auto">
            <div className="text-[11px] font-semibold text-gray-500 uppercase tracking-wider flex items-center gap-1.5 mb-1">
              <AlertCircle className="w-3.5 h-3.5 text-[#C6A15B]" />
              <span>Detected Service Differences</span>
            </div>
            {differences.map((diff, index) => (
              <div key={index} className="flex items-start gap-2 text-gray-700">
                <span className="text-[#C6A15B] font-bold">•</span>
                <span className="leading-snug">{diff}</span>
              </div>
            ))}
          </div>
        )}

        {/* Action Buttons */}
        <div className="pt-2 flex flex-col gap-2">
          {/* Action 1: Update Client & Continue */}
          <button
            type="button"
            onClick={onUpdateClientAndContinue}
            className="w-full py-2.5 px-4 bg-[#C6A15B] hover:bg-[#b08e4d] text-white font-semibold text-xs rounded-xl shadow-sm transition-colors flex items-center justify-center gap-2"
          >
            <RefreshCw className="w-3.5 h-3.5" />
            <span>Update Client & Continue</span>
            <ArrowRight className="w-3.5 h-3.5 ml-auto opacity-75" />
          </button>

          {/* Action 2: Invoice Only */}
          <button
            type="button"
            onClick={onInvoiceOnly}
            className="w-full py-2.5 px-4 bg-white hover:bg-gray-50 border border-[#DAD8D2] text-[#1A1B1E] font-medium text-xs rounded-xl transition-colors flex items-center justify-center gap-2"
          >
            <FileText className="w-3.5 h-3.5 text-gray-500" />
            <span>
              Invoice Only ({actionType === 'finalize' ? 'Finalize' : 'Save'} without updating defaults)
            </span>
          </button>

          {/* Action 3: Cancel */}
          <button
            type="button"
            onClick={onCancel}
            className="w-full py-2 text-center text-xs text-gray-500 hover:text-gray-800 transition-colors"
          >
            Cancel
          </button>
        </div>
      </div>
    </div>
  );
};
