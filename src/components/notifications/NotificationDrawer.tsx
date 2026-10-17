import React from 'react';
import { useApp } from '../../context/AppContext';
import {
  Bell,
  Clock,
  AlertTriangle,
  CheckCircle2,
  Calendar,
  Database,
  Check,
  X,
  ExternalLink,
} from 'lucide-react';

interface NotificationDrawerProps {
  isOpen: boolean;
  onClose: () => void;
}

export const NotificationDrawer: React.FC<NotificationDrawerProps> = ({ isOpen, onClose }) => {
  const {
    notifications,
    unreadNotificationCount,
    markNotificationRead,
    markAllNotificationsRead,
    setSelectedInvoiceId,
    setActiveTab,
  } = useApp();

  if (!isOpen) return null;

  return (
    <div
      className="fixed inset-0 z-50 flex justify-end bg-black/40 backdrop-blur-xs animate-in fade-in no-print"
      role="dialog"
      aria-modal="true"
      aria-label="Notification Centre"
    >
      <div className="bg-[#FAF9F6] border-l border-[#DAD8D2] w-full max-w-md h-full flex flex-col shadow-2xl animate-in slide-in-from-right duration-200">
        {/* Header */}
        <div className="p-4 sm:p-5 border-b border-[#DAD8D2] flex items-center justify-between bg-white">
          <div className="flex items-center gap-2.5">
            <div className="p-2 rounded-xl bg-[#292A2D] text-[#C6A15B]">
              <Bell className="w-5 h-5" />
            </div>
            <div>
              <h2 className="font-heading font-semibold text-base text-[#1A1B1E] flex items-center gap-2">
                Notifications
                {unreadNotificationCount > 0 && (
                  <span className="text-xs bg-[#C6A15B] text-[#292A2D] font-bold px-2 py-0.5 rounded-full">
                    {unreadNotificationCount} new
                  </span>
                )}
              </h2>
              <p className="text-xs text-[#5C6068]">Actionable billing & payment reminders</p>
            </div>
          </div>
          <div className="flex items-center gap-2">
            {unreadNotificationCount > 0 && (
              <button
                onClick={markAllNotificationsRead}
                className="text-xs font-medium text-[#C6A15B] hover:text-[#9A7832] px-2.5 py-1.5 rounded-lg hover:bg-[#F1F0ED] transition-colors"
              >
                Mark all read
              </button>
            )}
            <button
              onClick={onClose}
              className="p-1.5 rounded-lg text-[#5C6068] hover:text-[#1A1B1E] hover:bg-[#F1F0ED] transition-colors"
              aria-label="Close notification panel"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* Demo Notice Disclaimer */}
        <div className="bg-[#F1F0ED] px-4 py-2.5 border-b border-[#DAD8D2] flex items-start gap-2 text-xs text-[#4C5056]">
          <Clock className="w-4 h-4 text-[#C6A15B] shrink-0 mt-0.5" />
          <span>
            <strong>Browser Demo Notice:</strong> Alerts are calculated live from local invoice records while this tab is active. Background scheduled emails/push are disabled until Phase 2 Cloud Sync.
          </span>
        </div>

        {/* Notification List */}
        <div className="flex-1 overflow-y-auto p-4 space-y-3">
          {notifications.length === 0 ? (
            <div className="h-full flex flex-col items-center justify-center text-center p-6 text-[#5C6068]">
              <div className="p-4 rounded-full bg-[#F1F0ED] mb-3">
                <CheckCircle2 className="w-8 h-8 text-[#C6A15B]" />
              </div>
              <h4 className="font-heading font-semibold text-[#1A1B1E] text-base mb-1">
                All Caught Up!
              </h4>
              <p className="text-xs max-w-xs">
                No invoices are currently due soon or overdue, and payments are up to date.
              </p>
            </div>
          ) : (
            notifications.map((notif) => {
              const isOverdue = notif.type === 'overdue';
              const isDueToday = notif.type === 'due_today';
              const isDueSoon = notif.type === 'due_soon';
              const isBackup = notif.type === 'backup_reminder';

              return (
                <div
                  key={notif.id}
                  className={`p-3.5 rounded-xl border transition-all ${
                    notif.read
                      ? 'bg-white/60 border-[#DAD8D2] opacity-75'
                      : 'bg-white border-[#C6A15B]/40 shadow-xs'
                  }`}
                >
                  <div className="flex items-start gap-3">
                    <div
                      className={`p-2 rounded-lg shrink-0 mt-0.5 ${
                        isOverdue
                          ? 'bg-red-50 text-[#B91C1C]'
                          : isDueToday
                          ? 'bg-amber-50 text-[#C6A15B]'
                          : isDueSoon
                          ? 'bg-blue-50 text-blue-600'
                          : 'bg-[#F1F0ED] text-[#292A2D]'
                      }`}
                    >
                      {isOverdue ? (
                        <AlertTriangle className="w-4 h-4" />
                      ) : isDueToday || isDueSoon ? (
                        <Calendar className="w-4 h-4" />
                      ) : (
                        <Database className="w-4 h-4" />
                      )}
                    </div>

                    <div className="flex-1 min-w-0">
                      <div className="flex items-center justify-between gap-2 mb-1">
                        <span className="text-xs font-semibold text-[#1A1B1E] truncate">
                          {notif.title}
                        </span>
                        {!notif.read && (
                          <span className="w-2 h-2 rounded-full bg-[#C6A15B] shrink-0" />
                        )}
                      </div>
                      <p className="text-xs text-[#4C5056] leading-relaxed mb-2.5">
                        {notif.message}
                      </p>

                      <div className="flex items-center justify-between pt-1 border-t border-[#F1F0ED]">
                        {notif.invoiceId ? (
                          <button
                            onClick={() => {
                              setSelectedInvoiceId(notif.invoiceId || null);
                              setActiveTab('invoices');
                              markNotificationRead(notif.id);
                              onClose();
                            }}
                            className="inline-flex items-center gap-1 text-[11px] font-semibold text-[#9A7832] hover:text-[#C6A15B]"
                          >
                            <span>Inspect Invoice</span>
                            <ExternalLink className="w-3 h-3" />
                          </button>
                        ) : isBackup ? (
                          <button
                            onClick={() => {
                              setActiveTab('settings');
                              markNotificationRead(notif.id);
                              onClose();
                            }}
                            className="inline-flex items-center gap-1 text-[11px] font-semibold text-[#9A7832] hover:text-[#C6A15B]"
                          >
                            <span>Open Backup Tool</span>
                            <ExternalLink className="w-3 h-3" />
                          </button>
                        ) : (
                          <span />
                        )}

                        {!notif.read && (
                          <button
                            onClick={() => markNotificationRead(notif.id)}
                            className="text-[11px] text-[#5C6068] hover:text-[#1A1B1E] flex items-center gap-1"
                          >
                            <Check className="w-3 h-3" />
                            <span>Dismiss</span>
                          </button>
                        )}
                      </div>
                    </div>
                  </div>
                </div>
              );
            })
          )}
        </div>
      </div>
    </div>
  );
};
