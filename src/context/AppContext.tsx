import React, { createContext, useContext, useEffect, useState, useCallback } from 'react';
import {
  Client,
  ServiceItem,
  Invoice,
  Payment,
  CompanySettings,
  BankDetails,
  AppNotification,
} from '../types';
import { invoiceRepository } from '../repositories/LocalStorageRepository';
import {
  RecordPaymentInput,
  ReversePaymentInput,
} from '../repositories/types';
import {
  INITIAL_COMPANY_SETTINGS,
  INITIAL_BANK_DETAILS,
} from '../data/seedData';

export type ActiveTab =
  | 'dashboard'
  | 'invoices'
  | 'create_invoice'
  | 'clients'
  | 'services'
  | 'settings';

export interface ToastItem {
  id: string;
  type: 'success' | 'error' | 'info' | 'warning';
  title?: string;
  message: string;
}

interface AppContextValue {
  // Navigation & View state
  activeTab: ActiveTab;
  setActiveTab: (tab: ActiveTab) => void;
  selectedInvoiceId: string | null;
  setSelectedInvoiceId: (id: string | null) => void;
  editingDraftId: string | null;
  setEditingDraftId: (id: string | null) => void;
  paymentModalInvoiceId: string | null;
  setPaymentModalInvoiceId: (id: string | null) => void;
  reminderModalInvoiceId: string | null;
  setReminderModalInvoiceId: (id: string | null) => void;

  // Data
  clients: Client[];
  services: ServiceItem[];
  invoices: Invoice[];
  payments: Payment[];
  companySettings: CompanySettings;
  bankDetails: BankDetails;
  notifications: AppNotification[];
  unreadNotificationCount: number;
  isLoading: boolean;

  // Actions
  refreshAllData: () => Promise<void>;
  saveDraftInvoice: (invoiceData: Partial<Invoice> & { clientId: string }) => Promise<Invoice>;
  finalizeInvoice: (invoiceId: string, issueDate?: string) => Promise<Invoice>;
  cancelInvoice: (invoiceId: string, reason: string) => Promise<Invoice>;
  deleteDraftInvoice: (id: string) => Promise<boolean>;
  recordPayment: (input: RecordPaymentInput) => Promise<void>;
  reversePayment: (input: ReversePaymentInput) => Promise<void>;
  saveClient: (clientData: Omit<Client, 'id' | 'createdAt' | 'updatedAt'> & { id?: string }) => Promise<Client>;
  deleteClient: (id: string) => Promise<boolean>;
  saveService: (serviceData: Omit<ServiceItem, 'id' | 'createdAt'> & { id?: string }) => Promise<ServiceItem>;
  deleteService: (id: string) => Promise<boolean>;
  updateCompanySettings: (settings: Partial<CompanySettings>) => Promise<void>;
  updateBankDetails: (details: Partial<BankDetails>) => Promise<void>;
  markNotificationRead: (id: string) => Promise<void>;
  markAllNotificationsRead: () => Promise<void>;
  resetToDemo: () => Promise<void>;

  // Toast UI
  toasts: ToastItem[];
  addToast: (message: string, type?: ToastItem['type'], title?: string) => void;
  removeToast: (id: string) => void;
}

const AppContext = createContext<AppContextValue | null>(null);

export const AppProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [activeTab, setActiveTab] = useState<ActiveTab>('dashboard');
  const [selectedInvoiceId, setSelectedInvoiceId] = useState<string | null>(null);
  const [editingDraftId, setEditingDraftId] = useState<string | null>(null);
  const [paymentModalInvoiceId, setPaymentModalInvoiceId] = useState<string | null>(null);
  const [reminderModalInvoiceId, setReminderModalInvoiceId] = useState<string | null>(null);

  const [clients, setClients] = useState<Client[]>([]);
  const [services, setServices] = useState<ServiceItem[]>([]);
  const [invoices, setInvoices] = useState<Invoice[]>([]);
  const [payments, setPayments] = useState<Payment[]>([]);
  const [companySettings, setCompanySettings] = useState<CompanySettings>(INITIAL_COMPANY_SETTINGS);
  const [bankDetails, setBankDetails] = useState<BankDetails>(INITIAL_BANK_DETAILS);
  const [notifications, setNotifications] = useState<AppNotification[]>([]);
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [toasts, setToasts] = useState<ToastItem[]>([]);

  const addToast = useCallback(
    (message: string, type: ToastItem['type'] = 'info', title?: string) => {
      const id = `toast-${Date.now()}-${Math.random().toString(36).substring(2, 6)}`;
      setToasts((prev) => [...prev, { id, type, title, message }]);
      setTimeout(() => {
        setToasts((prev) => prev.filter((t) => t.id !== id));
      }, 4500);
    },
    []
  );

  const removeToast = useCallback((id: string) => {
    setToasts((prev) => prev.filter((t) => t.id !== id));
  }, []);

  const refreshAllData = useCallback(async () => {
    try {
      setIsLoading(true);
      const [cls, srvs, invs, pays, settings, bank, notifs] = await Promise.all([
        invoiceRepository.getClients(),
        invoiceRepository.getServices(),
        invoiceRepository.getInvoices(),
        invoiceRepository.getPayments(),
        invoiceRepository.getCompanySettings(),
        invoiceRepository.getBankDetails(),
        invoiceRepository.getNotifications(),
      ]);

      setClients(cls);
      setServices(srvs);
      setInvoices(invs);
      setPayments(pays);
      setCompanySettings(settings);
      setBankDetails(bank);
      setNotifications(notifs);
    } catch (err: any) {
      console.error('Error refreshing data:', err);
      addToast(err?.message || 'Error loading application data', 'error');
    } finally {
      setIsLoading(false);
    }
  }, [addToast]);

  useEffect(() => {
    refreshAllData();
  }, [refreshAllData]);

  const saveDraftInvoice = async (invoiceData: Partial<Invoice> & { clientId: string }) => {
    try {
      const result = await invoiceRepository.saveDraftInvoice(invoiceData);
      await refreshAllData();
      addToast('Draft invoice saved successfully.', 'success');
      return result;
    } catch (err: any) {
      addToast(err.message || 'Failed to save draft invoice.', 'error');
      throw err;
    }
  };

  const finalizeInvoice = async (invoiceId: string, issueDate?: string) => {
    try {
      const result = await invoiceRepository.finalizeInvoice({ invoiceId, issueDate });
      await refreshAllData();
      addToast(`Invoice ${result.invoiceNumber} finalized successfully!`, 'success');
      return result;
    } catch (err: any) {
      addToast(err.message || 'Failed to finalize invoice.', 'error');
      throw err;
    }
  };

  const cancelInvoice = async (invoiceId: string, reason: string) => {
    try {
      const result = await invoiceRepository.cancelInvoice({ invoiceId, reason });
      await refreshAllData();
      addToast(`Invoice ${result.invoiceNumber} marked as cancelled.`, 'warning');
      return result;
    } catch (err: any) {
      addToast(err.message || 'Failed to cancel invoice.', 'error');
      throw err;
    }
  };

  const deleteDraftInvoice = async (id: string): Promise<boolean> => {
    try {
      const res = await invoiceRepository.deleteDraftInvoice(id);
      if (!res.success) {
        addToast(res.error || 'Cannot delete invoice.', 'error');
        return false;
      }
      await refreshAllData();
      addToast('Draft invoice removed.', 'info');
      return true;
    } catch (err: any) {
      addToast(err.message || 'Error deleting draft.', 'error');
      return false;
    }
  };

  const recordPayment = async (input: RecordPaymentInput) => {
    try {
      await invoiceRepository.recordPayment(input);
      await refreshAllData();
      addToast(`Payment of ₹${Number(input.amount).toLocaleString('en-IN')} recorded successfully!`, 'success');
    } catch (err: any) {
      addToast(err.message || 'Failed to record payment.', 'error');
      throw err;
    }
  };

  const reversePayment = async (input: ReversePaymentInput) => {
    try {
      await invoiceRepository.reversePayment(input);
      await refreshAllData();
      addToast('Payment correction/reversal recorded.', 'warning');
    } catch (err: any) {
      addToast(err.message || 'Failed to reverse payment.', 'error');
      throw err;
    }
  };

  const saveClient = async (clientData: Omit<Client, 'id' | 'createdAt' | 'updatedAt'> & { id?: string }) => {
    try {
      const res = await invoiceRepository.saveClient(clientData);
      await refreshAllData();
      addToast(`Client "${res.name}" saved.`, 'success');
      return res;
    } catch (err: any) {
      addToast(err.message || 'Failed to save client.', 'error');
      throw err;
    }
  };

  const deleteClient = async (id: string): Promise<boolean> => {
    try {
      const res = await invoiceRepository.deleteClient(id);
      if (!res.success) {
        addToast(res.error || 'Failed to delete client.', 'error');
        return false;
      }
      await refreshAllData();
      addToast('Client removed.', 'info');
      return true;
    } catch (err: any) {
      addToast(err.message || 'Error deleting client.', 'error');
      return false;
    }
  };

  const saveService = async (serviceData: Omit<ServiceItem, 'id' | 'createdAt'> & { id?: string }) => {
    try {
      const res = await invoiceRepository.saveService(serviceData);
      await refreshAllData();
      addToast(`Service "${res.name}" saved.`, 'success');
      return res;
    } catch (err: any) {
      addToast(err.message || 'Failed to save service.', 'error');
      throw err;
    }
  };

  const deleteService = async (id: string): Promise<boolean> => {
    try {
      const res = await invoiceRepository.deleteService(id);
      if (!res.success) {
        addToast(res.error || 'Failed to delete service.', 'error');
        return false;
      }
      await refreshAllData();
      addToast('Service removed.', 'info');
      return true;
    } catch (err: any) {
      addToast(err.message || 'Error deleting service.', 'error');
      return false;
    }
  };

  const updateCompanySettings = async (settings: Partial<CompanySettings>) => {
    try {
      await invoiceRepository.saveCompanySettings(settings);
      await refreshAllData();
      addToast('Company settings updated.', 'success');
    } catch (err: any) {
      addToast(err.message || 'Failed to update company settings.', 'error');
      throw err;
    }
  };

  const updateBankDetails = async (details: Partial<BankDetails>) => {
    try {
      await invoiceRepository.saveBankDetails(details);
      await refreshAllData();
      addToast('Bank details updated.', 'success');
    } catch (err: any) {
      addToast(err.message || 'Failed to update bank details.', 'error');
      throw err;
    }
  };

  const markNotificationRead = async (id: string) => {
    await invoiceRepository.markNotificationRead(id);
    setNotifications((prev) => prev.map((n) => (n.id === id ? { ...n, read: true } : n)));
  };

  const markAllNotificationsRead = async () => {
    await invoiceRepository.markAllNotificationsRead();
    setNotifications((prev) => prev.map((n) => ({ ...n, read: true })));
  };

  const resetToDemo = async () => {
    await invoiceRepository.resetToDemoSeed();
    await refreshAllData();
    addToast('Demo database restored to default seed.', 'info');
  };

  const unreadNotificationCount = notifications.filter((n) => !n.read).length;

  return (
    <AppContext.Provider
      value={{
        activeTab,
        setActiveTab,
        selectedInvoiceId,
        setSelectedInvoiceId,
        editingDraftId,
        setEditingDraftId,
        paymentModalInvoiceId,
        setPaymentModalInvoiceId,
        reminderModalInvoiceId,
        setReminderModalInvoiceId,
        clients,
        services,
        invoices,
        payments,
        companySettings,
        bankDetails,
        notifications,
        unreadNotificationCount,
        isLoading,
        refreshAllData,
        saveDraftInvoice,
        finalizeInvoice,
        cancelInvoice,
        deleteDraftInvoice,
        recordPayment,
        reversePayment,
        saveClient,
        deleteClient,
        saveService,
        deleteService,
        updateCompanySettings,
        updateBankDetails,
        markNotificationRead,
        markAllNotificationsRead,
        resetToDemo,
        toasts,
        addToast,
        removeToast,
      }}
    >
      {children}
    </AppContext.Provider>
  );
};

export function useApp(): AppContextValue {
  const context = useContext(AppContext);
  if (!context) {
    throw new Error('useApp must be used within an AppProvider');
  }
  return context;
}
