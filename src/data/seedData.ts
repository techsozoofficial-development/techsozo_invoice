import {
  Client,
  ServiceItem,
  Invoice,
  Payment,
  CompanySettings,
  BankDetails,
  FYSequenceRecord,
} from '../types';

export const INITIAL_COMPANY_SETTINGS: CompanySettings = {
  companyName: 'TechSozo',
  tagline: 'Precision Digital Marketing & Media Solutions',
  address: 'No. 14, Cauvery Complex, Thillai Nagar Main Road',
  city: 'Tiruchirappalli',
  state: 'Tamil Nadu',
  pincode: '620018',
  phone: '+91 98424 01234',
  email: 'billing@techsozo.in',
  website: 'https://techsozo.in',
  defaultPaymentTermsDays: 15,
  defaultNotes:
    'Thank you for partnering with TechSozo. Please make payment via NEFT/IMPS/UPI to the bank account detailed below within 15 days.',
  defaultTerms:
    '1. All payments are strictly due within 15 calendar days from invoice issue date.\n2. Delayed payments past 30 days are subject to 1.5% monthly delayed payment charge.\n3. Retainer marketing services are billed at the beginning of each billing cycle.\n4. All disputes are subject to the exclusive jurisdiction of courts in Tiruchirappalli, Tamil Nadu.',
  footerText: 'TechSozo Digital Services • Tiruchirappalli, Tamil Nadu • billing@techsozo.in',
  logoUrl: null,
};

export const INITIAL_BANK_DETAILS: BankDetails = {
  accountName: 'TechSozo Digital Services',
  accountNumber: '50200084920194',
  bankName: 'HDFC Bank',
  branch: 'Thillai Nagar, Trichy',
  ifscCode: 'HDFC0001092',
  upiId: 'techsozo@hdfcbank',
};

// Clean initial production data collections (empty workspace)
export const INITIAL_CLIENTS: Client[] = [];
export const INITIAL_SERVICES: ServiceItem[] = [];
export const INITIAL_INVOICES: Invoice[] = [];
export const INITIAL_PAYMENTS: Payment[] = [];

export const INITIAL_SEQUENCES: FYSequenceRecord[] = [
  {
    financialYear: '26-27',
    lastSequenceNumber: 0,
    cancelledNumbers: [],
  },
];

// Signatures used to safely identify and purge preloaded demo seed records from existing storage
export const KNOWN_DEMO_CLIENT_IDS = ['client-1', 'client-2', 'client-3'];
export const KNOWN_DEMO_SERVICE_IDS = ['srv-1', 'srv-2', 'srv-3', 'srv-4'];
export const KNOWN_DEMO_INVOICE_IDS = ['inv-1', 'inv-2', 'inv-3', 'draft-1'];
export const KNOWN_DEMO_PAYMENT_IDS = ['pay-1', 'pay-2'];
