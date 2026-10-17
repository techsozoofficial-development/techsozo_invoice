import React, { useState } from 'react';
import { AlertTriangle, Lock, Trash2, X } from 'lucide-react';

export interface ConfirmModalProps {
  isOpen: boolean;
  onClose: () => void;
  onConfirm: (reason?: string) => void;
  title: string;
  description: string;
  confirmLabel?: string;
  cancelLabel?: string;
  variant?: 'danger' | 'warning' | 'primary';
  requireReason?: boolean;
  reasonPlaceholder?: string;
  isLoading?: boolean;
}

export const ConfirmModal: React.FC<ConfirmModalProps> = ({
  isOpen,
  onClose,
  onConfirm,
  title,
  description,
  confirmLabel = 'Confirm Action',
  cancelLabel = 'Cancel',
  variant = 'primary',
  requireReason = false,
  reasonPlaceholder = 'Please explain the reason for this action...',
  isLoading = false,
}) => {
  const [reason, setReason] = useState('');
  const [error, setError] = useState('');

  if (!isOpen) return null;

  const handleConfirm = () => {
    if (requireReason && !reason.trim()) {
      setError('A reason is mandatory for audit trail compliance.');
      return;
    }
    setError('');
    onConfirm(reason);
  };

  const isDanger = variant === 'danger';
  const isWarning = variant === 'warning';

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-xs animate-in fade-in no-print"
      role="dialog"
      aria-modal="true"
      aria-labelledby="confirm-modal-title"
    >
      <div className="bg-[#FAF9F6] border border-[#DAD8D2] rounded-2xl max-w-lg w-full p-6 shadow-2xl animate-in zoom-in-95 duration-200">
        <div className="flex items-start justify-between gap-4 mb-4">
          <div className="flex items-center gap-3">
            <div
              className={`p-3 rounded-xl shrink-0 ${
                isDanger
                  ? 'bg-red-50 text-red-600 border border-red-200'
                  : isWarning
                  ? 'bg-amber-50 text-[#C6A15B] border border-[#C6A15B]/30'
                  : 'bg-[#F1F0ED] text-[#292A2D] border border-[#DAD8D2]'
              }`}
            >
              {isDanger ? (
                <Trash2 className="w-5 h-5" />
              ) : isWarning ? (
                <AlertTriangle className="w-5 h-5" />
              ) : (
                <Lock className="w-5 h-5" />
              )}
            </div>
            <div>
              <h3 id="confirm-modal-title" className="text-lg font-heading font-semibold text-[#1A1B1E]">
                {title}
              </h3>
            </div>
          </div>
          <button
            onClick={onClose}
            className="text-[#5C6068] hover:text-[#1A1B1E] p-1.5 rounded-lg hover:bg-[#F1F0ED] transition-colors"
            aria-label="Close dialog"
            disabled={isLoading}
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        <p className="text-sm text-[#4C5056] leading-relaxed mb-4">{description}</p>

        {requireReason && (
          <div className="mb-4">
            <label className="block text-xs font-semibold uppercase tracking-wider text-[#292A2D] mb-1.5">
              Reason / Justification <span className="text-red-500">*</span>
            </label>
            <textarea
              value={reason}
              onChange={(e) => {
                setReason(e.target.value);
                if (error) setError('');
              }}
              placeholder={reasonPlaceholder}
              rows={3}
              className={`w-full px-3.5 py-2.5 text-sm bg-white border rounded-xl focus:outline-none focus:ring-2 focus:ring-[#C6A15B] transition-all ${
                error ? 'border-red-400' : 'border-[#DAD8D2]'
              }`}
            />
            {error && <p className="text-xs text-red-600 mt-1 font-medium">{error}</p>}
          </div>
        )}

        <div className="flex items-center justify-end gap-3 pt-3 border-t border-[#DAD8D2]">
          <button
            type="button"
            onClick={onClose}
            disabled={isLoading}
            className="px-4 py-2.5 text-sm font-medium text-[#4C5056] hover:text-[#1A1B1E] bg-[#F1F0ED] hover:bg-[#E8E6E1] rounded-xl transition-colors min-h-[44px]"
          >
            {cancelLabel}
          </button>
          <button
            type="button"
            onClick={handleConfirm}
            disabled={isLoading}
            className={`px-5 py-2.5 text-sm font-semibold text-white rounded-xl shadow-sm transition-all min-h-[44px] flex items-center gap-2 ${
              isDanger
                ? 'bg-[#B91C1C] hover:bg-red-700'
                : isWarning
                ? 'bg-[#292A2D] hover:bg-[#1E1F21] border border-[#C6A15B]/50'
                : 'bg-[#C6A15B] hover:bg-[#B38E46] text-[#292A2D]'
            }`}
          >
            {isLoading ? 'Processing...' : confirmLabel}
          </button>
        </div>
      </div>
    </div>
  );
};
