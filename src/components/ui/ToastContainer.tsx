import React from 'react';
import { useApp } from '../../context/AppContext';
import { CheckCircle2, AlertCircle, AlertTriangle, Info, X } from 'lucide-react';

export const ToastContainer: React.FC = () => {
  const { toasts, removeToast } = useApp();

  if (toasts.length === 0) return null;

  return (
    <div
      className="fixed bottom-5 right-5 z-50 flex flex-col gap-2 max-w-md w-full px-4 pointer-events-none no-print"
      aria-live="polite"
      aria-atomic="true"
    >
      {toasts.map((toast) => {
        const isSuccess = toast.type === 'success';
        const isError = toast.type === 'error';
        const isWarning = toast.type === 'warning';

        return (
          <div
            key={toast.id}
            role="alert"
            className={`pointer-events-auto flex items-start gap-3 p-4 rounded-xl shadow-lg border backdrop-blur-md transition-all duration-300 animate-in fade-in slide-in-from-bottom-2 ${
              isSuccess
                ? 'bg-[#FAF9F6] border-[#15803D]/40 text-[#1A1B1E]'
                : isError
                ? 'bg-[#FAF9F6] border-[#B91C1C]/40 text-[#1A1B1E]'
                : isWarning
                ? 'bg-[#FAF9F6] border-[#C6A15B] text-[#1A1B1E]'
                : 'bg-[#FAF9F6] border-[#DAD8D2] text-[#1A1B1E]'
            }`}
          >
            <div className="shrink-0 mt-0.5">
              {isSuccess && <CheckCircle2 className="w-5 h-5 text-[#15803D]" />}
              {isError && <AlertCircle className="w-5 h-5 text-[#B91C1C]" />}
              {isWarning && <AlertTriangle className="w-5 h-5 text-[#C6A15B]" />}
              {!isSuccess && !isError && !isWarning && <Info className="w-5 h-5 text-[#4C5056]" />}
            </div>

            <div className="flex-1 text-sm">
              {toast.title && <div className="font-semibold text-xs tracking-wide uppercase mb-0.5">{toast.title}</div>}
              <div className="text-sm font-medium leading-relaxed">{toast.message}</div>
            </div>

            <button
              onClick={() => removeToast(toast.id)}
              className="shrink-0 text-[#5C6068] hover:text-[#1A1B1E] p-1 rounded-lg hover:bg-[#F1F0ED] transition-colors"
              aria-label="Dismiss notification"
            >
              <X className="w-4 h-4" />
            </button>
          </div>
        );
      })}
    </div>
  );
};
