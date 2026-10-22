export type InvoiceStatus =
  | 'draft'
  | 'sent'
  | 'partially_paid'
  | 'paid'
  | 'overdue'
  | 'cancelled';

export type PaymentMode = 'bank_transfer' | 'upi' | 'cheque' | 'cash' | 'card';

export type BillingFrequency = 'Monthly' | 'One-Time' | 'Custom';

export interface ClientService {
  id: string;
  name: string;
  description: string;
  quantity: number;
  rate?: number | null; // in INR (optional)
  billingFrequency: BillingFrequency;
  adSpend?: number | null; // Platform ad spend (reference only, never billed by TechSozo)
}

export type AdBudgetPeriod = 'Monthly' | 'One-Time Campaign';

export interface ClientAdBudget {
  period: AdBudgetPeriod;
  amount?: number | null;
  campaignName?: string;
}

export interface ClientDeliverables {
  posterCount?: number | null;
  reelCount?: number | null;
  shootingSessions?: number | null;
}

export interface Client {
  id: string;
  name: string;
  contactPerson: string;
  email: string;
  phone: string;
  address: string;
  city: string;
  state: string;
  pincode: string;
  gstin?: string;
  monthlyServiceFee?: number | null; // Total recurring monthly fee charged by TechSozo
  deliverables?: ClientDeliverables | null; // Optional manual deliverables counts (posters, reels, shooting sessions)
  adBudget?: ClientAdBudget | null; // Direct platform ad budget (reference only, paid directly by client to Meta/Google)
  services?: ClientService[];
  active: boolean;
  createdAt: string;
  updatedAt: string;
}

export interface ServiceItem {
  id: string;
  name: string;
  description: string;
  defaultRate: number; // in INR
  sac?: string;
  active: boolean;
  createdAt: string;
}

export interface InvoiceLineItem {
  id: string;
  serviceId?: string;
  description: string;
  sac?: string;
  quantity: number;
  rate: number;
  amount: number; // quantity * rate
  posterCount?: number | null;
  reelCount?: number | null;
  shootingSessions?: number | null;
}

export interface GSTConfigSnapshot {
  enabled: boolean;
  companyState: string;
  clientState: string;
  isInterstate: boolean;
  cgstRate: number; // e.g. 9
  sgstRate: number; // e.g. 9
  igstRate: number; // e.g. 18
  cgstAmount: number;
  sgstAmount: number;
  igstAmount: number;
  totalTax: number;
}

export interface BankDetails {
  accountName: string;
  accountNumber: string;
  bankName: string;
  branch: string;
  ifscCode: string;
  upiId: string;
}

export interface CompanySettings {
  companyName: string;
  tagline: string;
  address: string;
  city: string;
  state: string;
  pincode: string;
  phone: string;
  email: string;
  website: string;
  pan?: string;
  gstin?: string;
  gstEnabled?: boolean;
  defaultGstRate?: number;
  defaultPaymentTermsDays: number;
  defaultNotes: string;
  defaultTerms: string;
  footerText: string;
  logoUrl?: string | null;
}

export interface Payment {
  id: string;
  invoiceId: string;
  amount: number;
  paymentDate: string; // YYYY-MM-DD
  mode: PaymentMode;
  reference: string;
  notes?: string;
  recordedAt: string;
  isReversed: boolean;
  reversedAt?: string | null;
  reversalReason?: string | null;
}

export interface Invoice {
  id: string;
  invoiceNumber: string | null; // null if draft, e.g. 'INV/26-27/001' if finalized
  financialYear: string | null; // e.g. '26-27'
  sequenceNumber: number | null; // e.g. 1
  clientId: string;
  clientSnapshot: Client;
  issueDate: string; // YYYY-MM-DD
  dueDate: string; // YYYY-MM-DD
  billingPeriod?: string;
  billingChoice?: 'package' | 'itemized' | 'custom';
  deliverables?: ClientDeliverables | null;
  adBudget?: ClientAdBudget | null;
  items: InvoiceLineItem[];
  subtotal: number;
  discountPercent: number;
  discountAmount: number;
  taxSnapshot?: GSTConfigSnapshot;
  roundOff: number;
  total: number;
  amountInWords: string;
  notes: string;
  paymentTerms: string;
  bankDetailsSnapshot: BankDetails;
  companySnapshot: CompanySettings;
  status: InvoiceStatus;
  isFinalized: boolean;
  finalizedAt: string | null;
  isCancelled: boolean;
  cancelledAt: string | null;
  cancellationReason: string | null;
  createdAt: string;
  updatedAt: string;
}

export interface FYSequenceRecord {
  financialYear: string; // e.g. '26-27'
  lastSequenceNumber: number;
  cancelledNumbers: string[];
}

export interface AppNotification {
  id: string;
  title: string;
  message: string;
  type:
    | 'due_soon'
    | 'due_today'
    | 'overdue'
    | 'payment_partial'
    | 'payment_completed'
    | 'invoice_finalized'
    | 'backup_reminder';
  invoiceId?: string;
  invoiceNumber?: string;
  read: boolean;
  createdAt: string;
}

export interface AppDataBackup {
  version: string;
  exportedAt: string;
  clients: Client[];
  services: ServiceItem[];
  invoices: Invoice[];
  payments: Payment[];
  sequences: FYSequenceRecord[];
  companySettings: CompanySettings;
  bankDetails: BankDetails;
}
