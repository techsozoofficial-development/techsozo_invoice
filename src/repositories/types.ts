import {
  Client,
  ServiceItem,
  Invoice,
  Payment,
  CompanySettings,
  BankDetails,
  AppNotification,
  AppDataBackup,
} from '../types';

export interface FinalizeInvoiceOptions {
  invoiceId: string;
  issueDate?: string;
}

export interface CancelInvoiceOptions {
  invoiceId: string;
  reason: string;
}

export interface RecordPaymentInput {
  invoiceId: string;
  amount: number;
  paymentDate: string;
  mode: Payment['mode'];
  reference: string;
  notes?: string;
}

export interface ReversePaymentInput {
  paymentId: string;
  reason: string;
}

export interface IInvoiceRepository {
  // Clients
  getClients(): Promise<Client[]>;
  getClient(id: string): Promise<Client | null>;
  saveClient(client: Omit<Client, 'id' | 'createdAt' | 'updatedAt'> & { id?: string }): Promise<Client>;
  deleteClient(id: string): Promise<{ success: boolean; error?: string }>;

  // Services
  getServices(): Promise<ServiceItem[]>;
  saveService(service: Omit<ServiceItem, 'id' | 'createdAt'> & { id?: string }): Promise<ServiceItem>;
  deleteService(id: string): Promise<{ success: boolean; error?: string }>;

  // Invoices
  getInvoices(): Promise<Invoice[]>;
  getInvoice(id: string): Promise<Invoice | null>;
  saveDraftInvoice(invoiceData: Partial<Invoice> & { clientId: string }): Promise<Invoice>;
  finalizeInvoice(options: FinalizeInvoiceOptions): Promise<Invoice>;
  cancelInvoice(options: CancelInvoiceOptions): Promise<Invoice>;
  deleteDraftInvoice(id: string): Promise<{ success: boolean; error?: string }>;

  // Payments
  getPayments(invoiceId?: string): Promise<Payment[]>;
  recordPayment(input: RecordPaymentInput): Promise<{ payment: Payment; updatedInvoice: Invoice }>;
  reversePayment(input: ReversePaymentInput): Promise<{ payment: Payment; updatedInvoice: Invoice }>;

  // Settings
  getCompanySettings(): Promise<CompanySettings>;
  saveCompanySettings(settings: Partial<CompanySettings>): Promise<CompanySettings>;
  getBankDetails(): Promise<BankDetails>;
  saveBankDetails(bankDetails: Partial<BankDetails>): Promise<BankDetails>;

  // Notifications
  getNotifications(): Promise<AppNotification[]>;
  markNotificationRead(id: string): Promise<void>;
  markAllNotificationsRead(): Promise<void>;
  generateDerivedNotifications(): Promise<AppNotification[]>;

  // Backup & Restore
  exportBackupData(): Promise<AppDataBackup>;
  importBackupData(backup: AppDataBackup, mode: 'merge' | 'replace'): Promise<{ success: boolean; message: string }>;
  resetToDemoSeed(): Promise<void>;
}
