import React, { useState } from 'react';
import { useApp, ActiveTab } from '../../context/AppContext';
import { BrandLogo } from '../ui/BrandLogo';
import { ToastContainer } from '../ui/ToastContainer';
import { NotificationDrawer } from '../notifications/NotificationDrawer';
import {
  LayoutDashboard,
  FileText,
  Users,
  Briefcase,
  Settings,
  Plus,
  Bell,
  Search,
  Menu,
  X,
  ExternalLink,
} from 'lucide-react';

interface AppShellProps {
  children: React.ReactNode;
}

export const AppShell: React.FC<AppShellProps> = ({ children }) => {
  const {
    activeTab,
    setActiveTab,
    setSelectedInvoiceId,
    setEditingDraftId,
    invoices,
    unreadNotificationCount,
  } = useApp();

  const [isNotifOpen, setIsNotifOpen] = useState(false);
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);

  // Compute pending and overdue counts for sidebar badge
  const overdueCount = invoices.filter((i) => i.status === 'overdue').length;
  const draftCount = invoices.filter((i) => i.status === 'draft').length;

  const navItems: { id: ActiveTab; label: string; icon: React.ReactNode; badge?: number; badgeColor?: string }[] = [
    {
      id: 'dashboard',
      label: 'Dashboard',
      icon: <LayoutDashboard className="w-5 h-5" />,
    },
    {
      id: 'invoices',
      label: 'Invoices',
      icon: <FileText className="w-5 h-5" />,
      badge: overdueCount > 0 ? overdueCount : draftCount > 0 ? draftCount : undefined,
      badgeColor: overdueCount > 0 ? 'bg-red-500 text-white' : 'bg-[#C6A15B] text-[#292A2D]',
    },
    {
      id: 'clients',
      label: 'Clients',
      icon: <Users className="w-5 h-5" />,
    },
    {
      id: 'services',
      label: 'Services',
      icon: <Briefcase className="w-5 h-5" />,
    },
    {
      id: 'settings',
      label: 'Settings',
      icon: <Settings className="w-5 h-5" />,
    },
  ];

  const handleCreateNewInvoice = () => {
    setSelectedInvoiceId(null);
    setEditingDraftId(null);
    setActiveTab('create_invoice');
  };

  const handleNavClick = (tabId: ActiveTab) => {
    if (tabId === 'invoices') {
      setSelectedInvoiceId(null);
      setEditingDraftId(null);
    }
    setActiveTab(tabId);
    setIsMobileMenuOpen(false);
  };

  return (
    <div className="min-h-screen flex flex-col md:flex-row bg-[#FAF9F6] text-[#1A1B1E]">
      {/* Toast Notification Mount */}
      <ToastContainer />

      {/* Notification Drawer Modal */}
      <NotificationDrawer isOpen={isNotifOpen} onClose={() => setIsNotifOpen(false)} />

      {/* ================= DESKTOP SIDEBAR ================= */}
      <aside className="hidden md:flex flex-col w-64 lg:w-72 bg-[#292A2D] text-[#FAF9F6] border-r border-[#3D4046] shrink-0 no-print select-none">
        {/* Brand Header */}
        <div className="p-6 border-b border-[#3D4046]">
          <BrandLogo variant="full" size="md" />
        </div>

        {/* Primary Action Button */}
        <div className="p-4">
          <button
            onClick={handleCreateNewInvoice}
            className="w-full flex items-center justify-center gap-2.5 px-4 py-3 bg-[#C6A15B] hover:bg-[#B38E46] text-[#292A2D] font-heading font-semibold text-sm rounded-xl shadow-md transition-all duration-200 hover:shadow-lg active:scale-[0.98] min-h-[44px]"
          >
            <Plus className="w-5 h-5 stroke-[2.5]" />
            <span>Create Invoice</span>
          </button>
        </div>

        {/* Navigation Items */}
        <nav className="flex-1 px-3 py-2 space-y-1.5 overflow-y-auto">
          {navItems.map((item) => {
            const isActive =
              activeTab === item.id ||
              (item.id === 'invoices' && activeTab === 'create_invoice');

            return (
              <button
                key={item.id}
                onClick={() => handleNavClick(item.id)}
                className={`w-full flex items-center justify-between px-3.5 py-2.5 rounded-xl text-sm font-medium transition-all duration-150 min-h-[44px] ${
                  isActive
                    ? 'bg-[#37393F] text-[#FAF9F6] font-semibold border-l-4 border-[#C6A15B] shadow-inner'
                    : 'text-[#B9BCC4] hover:text-[#FAF9F6] hover:bg-[#323438]'
                }`}
              >
                <div className="flex items-center gap-3">
                  <span className={isActive ? 'text-[#C6A15B]' : 'text-[#8E929B]'}>
                    {item.icon}
                  </span>
                  <span>{item.label}</span>
                </div>

                {item.badge !== undefined && (
                  <span
                    className={`text-[11px] font-bold px-2 py-0.5 rounded-full ${item.badgeColor}`}
                  >
                    {item.badge}
                  </span>
                )}
              </button>
            );
          })}
        </nav>
      </aside>

      {/* ================= MOBILE HEADER ================= */}
      <header className="md:hidden flex items-center justify-between px-4 py-3 bg-[#292A2D] text-[#FAF9F6] border-b border-[#3D4046] sticky top-0 z-40 no-print">
        <BrandLogo variant="full" size="sm" />

        <div className="flex items-center gap-2">
          <button
            onClick={() => setIsNotifOpen(true)}
            className="relative p-2 rounded-lg text-[#B9BCC4] hover:text-[#FAF9F6] hover:bg-[#37393F] transition-colors min-h-[44px] min-w-[44px] flex items-center justify-center"
            aria-label="Open notifications"
          >
            <Bell className="w-5 h-5" />
            {unreadNotificationCount > 0 && (
              <span className="absolute top-2 right-2 w-2 h-2 rounded-full bg-[#C6A15B]" />
            )}
          </button>

          <button
            onClick={handleCreateNewInvoice}
            className="p-2 bg-[#C6A15B] text-[#292A2D] rounded-lg font-semibold flex items-center justify-center min-h-[44px] min-w-[44px]"
            aria-label="Create new invoice"
          >
            <Plus className="w-5 h-5 stroke-[2.5]" />
          </button>

          <button
            onClick={() => setIsMobileMenuOpen(!isMobileMenuOpen)}
            className="p-2 rounded-lg text-[#B9BCC4] hover:text-[#FAF9F6] hover:bg-[#37393F] transition-colors min-h-[44px] min-w-[44px] flex items-center justify-center"
            aria-label="Toggle menu"
          >
            {isMobileMenuOpen ? <X className="w-5 h-5" /> : <Menu className="w-5 h-5" />}
          </button>
        </div>
      </header>

      {/* ================= MOBILE DRAWER MENU ================= */}
      {isMobileMenuOpen && (
        <div
          className="md:hidden fixed inset-0 top-[61px] z-40 bg-black/60 backdrop-blur-xs flex flex-col no-print animate-in fade-in"
          onClick={() => setIsMobileMenuOpen(false)}
        >
          <div
            className="bg-[#292A2D] border-b border-[#3D4046] p-4 space-y-2 shadow-2xl"
            onClick={(e) => e.stopPropagation()}
          >
            {navItems.map((item) => {
              const isActive = activeTab === item.id;
              return (
                <button
                  key={item.id}
                  onClick={() => handleNavClick(item.id)}
                  className={`w-full flex items-center justify-between px-4 py-3 rounded-xl text-base font-medium min-h-[48px] ${
                    isActive
                      ? 'bg-[#37393F] text-[#FAF9F6] font-semibold border-l-4 border-[#C6A15B]'
                      : 'text-[#B9BCC4] hover:bg-[#323438]'
                  }`}
                >
                  <div className="flex items-center gap-3">
                    <span className={isActive ? 'text-[#C6A15B]' : 'text-[#8E929B]'}>
                      {item.icon}
                    </span>
                    <span>{item.label}</span>
                  </div>
                  {item.badge !== undefined && (
                    <span
                      className={`text-xs font-bold px-2 py-0.5 rounded-full ${item.badgeColor}`}
                    >
                      {item.badge}
                    </span>
                  )}
                </button>
              );
            })}
          </div>
        </div>
      )}

      {/* ================= MAIN CONTENT AREA ================= */}
      <div className="flex-1 flex flex-col min-w-0 overflow-x-hidden">
        {/* Desktop Top Header Bar */}
        <header className="hidden md:flex items-center justify-between px-8 py-4 bg-white border-b border-[#DAD8D2] shrink-0 no-print">
          <div className="flex items-center gap-3">
            <h1 className="text-xl font-heading font-bold text-[#292A2D] capitalize">
              {activeTab === 'create_invoice'
                ? 'Create Invoice'
                : activeTab === 'invoices'
                ? 'Invoice Ledger'
                : activeTab}
            </h1>
            <span className="text-xs font-semibold px-2.5 py-0.5 bg-[#FAF5E8] text-[#9A7832] border border-[#C6A15B]/30 rounded-full">
              FY 26-27 Active
            </span>
          </div>

          <div className="flex items-center gap-4">
            {/* Notification Button */}
            <button
              onClick={() => setIsNotifOpen(true)}
              className="relative p-2.5 rounded-xl border border-[#DAD8D2] hover:border-[#C6A15B] bg-[#FAF9F6] text-[#4C5056] hover:text-[#292A2D] transition-colors min-h-[44px]"
              aria-label="View notifications"
            >
              <Bell className="w-5 h-5" />
              {unreadNotificationCount > 0 && (
                <span className="absolute -top-1 -right-1 bg-[#C6A15B] text-[#292A2D] font-bold text-[10px] w-5 h-5 rounded-full flex items-center justify-center border-2 border-white shadow-xs">
                  {unreadNotificationCount}
                </span>
              )}
            </button>

            {/* Quick Action Button */}
            <button
              onClick={handleCreateNewInvoice}
              className="flex items-center gap-2 px-4 py-2 bg-[#292A2D] hover:bg-[#1E1F21] text-[#FAF9F6] text-sm font-semibold rounded-xl border border-[#C6A15B]/40 hover:border-[#C6A15B] transition-all duration-200 min-h-[44px]"
            >
              <Plus className="w-4 h-4 text-[#C6A15B]" />
              <span>New Invoice</span>
            </button>
          </div>
        </header>

        {/* Page Content Body */}
        <main className="flex-1 p-4 sm:p-6 lg:p-8 max-w-7xl w-full mx-auto pb-24 md:pb-8">
          {children}
        </main>
      </div>

      {/* ================= MOBILE BOTTOM NAVIGATION BAR ================= */}
      <nav className="md:hidden fixed bottom-0 left-0 right-0 z-40 bg-[#292A2D] border-t border-[#3D4046] px-2 py-1 flex items-center justify-around shadow-2xl no-print select-none">
        {navItems.map((item) => {
          const isActive = activeTab === item.id;
          return (
            <button
              key={item.id}
              onClick={() => handleNavClick(item.id)}
              className={`flex flex-col items-center justify-center flex-1 py-1.5 text-[11px] font-medium transition-colors min-h-[48px] relative ${
                isActive ? 'text-[#C6A15B]' : 'text-[#8E929B] hover:text-[#FAF9F6]'
              }`}
            >
              <div className="relative">
                {item.icon}
                {item.badge !== undefined && (
                  <span
                    className={`absolute -top-1 -right-2 text-[9px] font-bold w-4 h-4 rounded-full flex items-center justify-center ${item.badgeColor}`}
                  >
                    {item.badge}
                  </span>
                )}
              </div>
              <span className="mt-1 text-[10px]">{item.label}</span>
            </button>
          );
        })}
      </nav>
    </div>
  );
};
