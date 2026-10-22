import {
  Client,
  ServiceItem,
  Invoice,
  Payment,
  CompanySettings,
  BankDetails,
  AppNotification,
  AppDataBackup,
  FYSequenceRecord,
} from '../types';
import {
  IInvoiceRepository,
  FinalizeInvoiceOptions,
  CancelInvoiceOptions,
  RecordPaymentInput,
  ReversePaymentInput,
} from './types';
import {
  INITIAL_COMPANY_SETTINGS,
  INITIAL_BANK_DETAILS,
  INITIAL_CLIENTS,
  INITIAL_SERVICES,
  INITIAL_INVOICES,
  INITIAL_PAYMENTS,
  INITIAL_SEQUENCES,
  KNOWN_DEMO_CLIENT_IDS,
  KNOWN_DEMO_SERVICE_IDS,
  KNOWN_DEMO_INVOICE_IDS,
  KNOWN_DEMO_PAYMENT_IDS,
} from '../data/seedData';
import {
  calculateInvoiceTotals,
  getFinancialYear,
  formatInvoiceNumber,
  resolveInvoiceStatus,
  calculateOutstandingBalance,
  calculateDefaultDueDate,
} from '../utils/calculations';

function isDemoClientRecord(c: Client): boolean {
  if (KNOWN_DEMO_CLIENT_IDS.includes(c.id)) {
    // Only classify as demo if it matches known demo business details
    const nameMatch =
      c.name === 'Cauvery Real Estate & Builders' ||
      c.name === 'Shree Arasu Motors' ||
      c.name === 'RK Wellness & Nutrition Center';
    const emailMatch =
      c.email === 'senthil@cauverybuilders.com' ||
      c.email === 'accounts@shreearasucars.com' ||
      c.email === 'priya@rknutrition.in';
    return nameMatch || emailMatch;
  }
  return false;
}

function isDemoServiceRecord(s: ServiceItem): boolean {
  if (KNOWN_DEMO_SERVICE_IDS.includes(s.id)) {
    return (
      s.name === 'SEO Strategy & Monthly Optimization' ||
      s.name === 'Social Media Management & Video Reels' ||
      s.name === 'Meta & Google Ads Campaign Management' ||
      s.name === 'Brand Content Writing & Copywriting'
    );
  }
  return false;
}

function isDemoInvoiceRecord(inv: Invoice): boolean {
  if (KNOWN_DEMO_INVOICE_IDS.includes(inv.id)) {
    return true;
  }
  if (['INV/26-27/001', 'INV/26-27/002', 'INV/26-27/003'].includes(inv.invoiceNumber || '')) {
    const isDemoClientName =
      inv.clientSnapshot?.name === 'Cauvery Real Estate & Builders' ||
      inv.clientSnapshot?.name === 'Shree Arasu Motors' ||
      inv.clientSnapshot?.name === 'RK Wellness & Nutrition Center';
    if (isDemoClientName) {
      return true;
    }
  }
  return false;
}

function isDemoPaymentRecord(p: Payment): boolean {
  if (KNOWN_DEMO_PAYMENT_IDS.includes(p.id)) {
    return true;
  }
  if (KNOWN_DEMO_INVOICE_IDS.includes(p.invoiceId)) {
    return true;
  }
  return false;
}

const STORAGE_KEYS = {
  CLIENTS: 'techsozo_clients_v1',
  SERVICES: 'techsozo_services_v1',
  INVOICES: 'techsozo_invoices_v1',
  PAYMENTS: 'techsozo_payments_v1',
  SETTINGS: 'techsozo_settings_v1',
  BANK: 'techsozo_bank_v1',
  SEQUENCES: 'techsozo_sequences_v1',
  NOTIFICATIONS: 'techsozo_notifications_v1',
  LAST_BACKUP: 'techsozo_last_backup_v1',
};

export class LocalStorageRepository implements IInvoiceRepository {
  private memoryCache: Map<string, any> = new Map();

  constructor() {
    this.ensureInitialized();
  }

  private ensureInitialized(): void {
    if (typeof window === 'undefined') return;

    if (!localStorage.getItem(STORAGE_KEYS.CLIENTS)) {
      localStorage.setItem(STORAGE_KEYS.CLIENTS, JSON.stringify(INITIAL_CLIENTS));
    }
    if (!localStorage.getItem(STORAGE_KEYS.SERVICES)) {
      localStorage.setItem(STORAGE_KEYS.SERVICES, JSON.stringify(INITIAL_SERVICES));
    }
    if (!localStorage.getItem(STORAGE_KEYS.INVOICES)) {
      localStorage.setItem(STORAGE_KEYS.INVOICES, JSON.stringify(INITIAL_INVOICES));
    }
    if (!localStorage.getItem(STORAGE_KEYS.PAYMENTS)) {
      localStorage.setItem(STORAGE_KEYS.PAYMENTS, JSON.stringify(INITIAL_PAYMENTS));
    }
    if (!localStorage.getItem(STORAGE_KEYS.SETTINGS)) {
      localStorage.setItem(STORAGE_KEYS.SETTINGS, JSON.stringify(INITIAL_COMPANY_SETTINGS));
    }
    if (!localStorage.getItem(STORAGE_KEYS.BANK)) {
      localStorage.setItem(STORAGE_KEYS.BANK, JSON.stringify(INITIAL_BANK_DETAILS));
    }
    if (!localStorage.getItem(STORAGE_KEYS.SEQUENCES)) {
      localStorage.setItem(STORAGE_KEYS.SEQUENCES, JSON.stringify(INITIAL_SEQUENCES));
    }

    this.purgeDemoDataIfPresent();
  }

  private purgeDemoDataIfPresent(): void {
    try {
      const purgeKey = 'techsozo_demo_purged_v2';
      if (localStorage.getItem(purgeKey) === 'true') {
        return;
      }

      // Purge demo clients while preserving user-created or customized clients
      const rawClients = localStorage.getItem(STORAGE_KEYS.CLIENTS);
      if (rawClients) {
        const clients: Client[] = JSON.parse(rawClients);
        const filtered = clients.filter((c) => !isDemoClientRecord(c));
        localStorage.setItem(STORAGE_KEYS.CLIENTS, JSON.stringify(filtered));
        this.memoryCache.set(STORAGE_KEYS.CLIENTS, filtered);
      }

      // Purge demo services while preserving user catalog services
      const rawServices = localStorage.getItem(STORAGE_KEYS.SERVICES);
      if (rawServices) {
        const services: ServiceItem[] = JSON.parse(rawServices);
        const filtered = services.filter((s) => !isDemoServiceRecord(s));
        localStorage.setItem(STORAGE_KEYS.SERVICES, JSON.stringify(filtered));
        this.memoryCache.set(STORAGE_KEYS.SERVICES, filtered);
      }

      // Purge demo invoices while preserving user invoices
      const rawInvoices = localStorage.getItem(STORAGE_KEYS.INVOICES);
      let remainingInvoices: Invoice[] = [];
      if (rawInvoices) {
        const invoices: Invoice[] = JSON.parse(rawInvoices);
        remainingInvoices = invoices.filter((inv) => !isDemoInvoiceRecord(inv));
        localStorage.setItem(STORAGE_KEYS.INVOICES, JSON.stringify(remainingInvoices));
        this.memoryCache.set(STORAGE_KEYS.INVOICES, remainingInvoices);
      }

      // Purge demo payments while preserving real transactions
      const rawPayments = localStorage.getItem(STORAGE_KEYS.PAYMENTS);
      if (rawPayments) {
        const payments: Payment[] = JSON.parse(rawPayments);
        const filtered = payments.filter((p) => !isDemoPaymentRecord(p));
        localStorage.setItem(STORAGE_KEYS.PAYMENTS, JSON.stringify(filtered));
        this.memoryCache.set(STORAGE_KEYS.PAYMENTS, filtered);
      }

      // Recalculate sequences cleanly based on remaining genuine finalized invoices
      const rawSequences = localStorage.getItem(STORAGE_KEYS.SEQUENCES);
      if (rawSequences) {
        const sequences: FYSequenceRecord[] = JSON.parse(rawSequences);
        const updatedSequences = sequences.map((seq) => {
          const genuineFyInvoices = remainingInvoices.filter(
            (inv) => inv.financialYear === seq.financialYear && inv.isFinalized
          );
          const maxSeq = genuineFyInvoices.reduce(
            (max, inv) => Math.max(max, inv.sequenceNumber || 0),
            0
          );
          return {
            ...seq,
            lastSequenceNumber: maxSeq,
            cancelledNumbers: seq.cancelledNumbers.filter(
              (n) => n > 0 && n <= maxSeq
            ),
          };
        });
        localStorage.setItem(STORAGE_KEYS.SEQUENCES, JSON.stringify(updatedSequences));
        this.memoryCache.set(STORAGE_KEYS.SEQUENCES, updatedSequences);
      }

      localStorage.removeItem('techsozo_read_notifs');
      localStorage.setItem(purgeKey, 'true');
    } catch (e) {
      console.error('Error during demo data purge:', e);
    }
  }

  private getItems<T>(key: string, fallback: T): T {
    if (this.memoryCache.has(key)) {
      return this.memoryCache.get(key) as T;
    }
    try {
      const data = localStorage.getItem(key);
      const parsed = data ? JSON.parse(data) : fallback;
      this.memoryCache.set(key, parsed);
      return parsed;
    } catch (e) {
      console.error(`Error reading ${key} from storage:`, e);
      return fallback;
    }
  }

  private setItems<T>(key: string, value: T): void {
    try {
      this.memoryCache.set(key, value);
      localStorage.setItem(key, JSON.stringify(value));
    } catch (e) {
      console.error(`Error saving ${key} to storage:`, e);
      throw new Error(`Storage quota exceeded or error writing data.`);
    }
  }

  // Clients
  async getClients(): Promise<Client[]> {
    return this.getItems<Client[]>(STORAGE_KEYS.CLIENTS, []);
  }

  async getClient(id: string): Promise<Client | null> {
    const clients = await this.getClients();
    return clients.find((c) => c.id === id) || null;
  }

  async saveClient(clientData: Omit<Client, 'id' | 'createdAt' | 'updatedAt'> & { id?: string }): Promise<Client> {
    const clients = await this.getClients();
    const now = new Date().toISOString();

    if (clientData.id) {
      // Update
      const index = clients.findIndex((c) => c.id === clientData.id);
      if (index === -1) {
        throw new Error(`Client with ID ${clientData.id} not found.`);
      }
      const updated: Client = {
        ...clients[index],
        ...clientData,
        updatedAt: now,
      };
      clients[index] = updated;
      this.setItems(STORAGE_KEYS.CLIENTS, clients);
      return updated;
    } else {
      // Create
      const newClient: Client = {
        ...clientData,
        id: `client-${Date.now()}-${Math.random().toString(36).substring(2, 6)}`,
        active: clientData.active ?? true,
        createdAt: now,
        updatedAt: now,
      };
      clients.push(newClient);
      this.setItems(STORAGE_KEYS.CLIENTS, clients);
      return newClient;
    }
  }

  async deleteClient(id: string): Promise<{ success: boolean; error?: string }> {
    const invoices = await this.getInvoices();
    const isReferenced = invoices.some((inv) => inv.clientId === id);
    if (isReferenced) {
      return {
        success: false,
        error: 'Client cannot be deleted because invoices are linked to this client. You can deactivate the client instead to preserve financial records.',
      };
    }
    const clients = await this.getClients();
    const filtered = clients.filter((c) => c.id !== id);
    this.setItems(STORAGE_KEYS.CLIENTS, filtered);
    return { success: true };
  }

  // Services
  async getServices(): Promise<ServiceItem[]> {
    return this.getItems<ServiceItem[]>(STORAGE_KEYS.SERVICES, []);
  }

  async saveService(serviceData: Omit<ServiceItem, 'id' | 'createdAt'> & { id?: string }): Promise<ServiceItem> {
    const services = await this.getServices();
    if (serviceData.id) {
      const idx = services.findIndex((s) => s.id === serviceData.id);
      if (idx === -1) throw new Error('Service not found');
      const updated: ServiceItem = {
        ...services[idx],
        ...serviceData,
      };
      services[idx] = updated;
      this.setItems(STORAGE_KEYS.SERVICES, services);
      return updated;
    } else {
      const newService: ServiceItem = {
        ...serviceData,
        id: `srv-${Date.now()}-${Math.random().toString(36).substring(2, 6)}`,
        active: serviceData.active ?? true,
        createdAt: new Date().toISOString(),
      };
      services.push(newService);
      this.setItems(STORAGE_KEYS.SERVICES, services);
      return newService;
    }
  }

  async deleteService(id: string): Promise<{ success: boolean; error?: string }> {
    const services = await this.getServices();
    const filtered = services.filter((s) => s.id !== id);
    this.setItems(STORAGE_KEYS.SERVICES, filtered);
    return { success: true };
  }

  // Invoices
  async getInvoices(): Promise<Invoice[]> {
    const invoices = this.getItems<Invoice[]>(STORAGE_KEYS.INVOICES, []);
    const payments = await this.getPayments();
    const today = new Date();

    // Dynamically refresh status for unpaid or partially paid finalized invoices based on due date
    return invoices.map((inv) => {
      const invPayments = payments.filter((p) => p.invoiceId === inv.id);
      const computedStatus = resolveInvoiceStatus(
        inv.isFinalized,
        inv.isCancelled,
        inv.total,
        invPayments,
        inv.dueDate,
        today
      );
      if (inv.status !== computedStatus) {
        return { ...inv, status: computedStatus };
      }
      return inv;
    });
  }

  async getInvoice(id: string): Promise<Invoice | null> {
    const invoices = await this.getInvoices();
    return invoices.find((inv) => inv.id === id) || null;
  }

  async saveDraftInvoice(invoiceData: Partial<Invoice> & { clientId: string }): Promise<Invoice> {
    const invoices = await this.getInvoices();
    const client = await this.getClient(invoiceData.clientId);
    if (!client) {
      throw new Error('Client not found.');
    }

    const companySettings = await this.getCompanySettings();
    const bankDetails = await this.getBankDetails();
    const now = new Date().toISOString();
    const issueDate = invoiceData.issueDate || now.split('T')[0];
    const dueDate = invoiceData.dueDate || calculateDefaultDueDate(issueDate, companySettings.defaultPaymentTermsDays || 15);
    const items = invoiceData.items || [];

    // Recalculate totals
    const calc = calculateInvoiceTotals({
      items,
      discountPercent: invoiceData.discountPercent ?? 0,
    });

    if (invoiceData.id) {
      const idx = invoices.findIndex((inv) => inv.id === invoiceData.id);
      if (idx === -1) throw new Error('Invoice not found.');
      const existing = invoices[idx];

      if (existing.isFinalized) {
        throw new Error('Finalized invoices are locked and cannot be edited. Please cancel and reissue if modifications are necessary.');
      }

      const updatedDraft: Invoice = {
        ...existing,
        clientId: client.id,
        clientSnapshot: client,
        issueDate,
        dueDate,
        billingPeriod: invoiceData.billingPeriod ?? existing.billingPeriod,
        billingChoice: invoiceData.billingChoice ?? existing.billingChoice ?? 'itemized',
        deliverables: invoiceData.deliverables !== undefined ? invoiceData.deliverables : (existing.deliverables ?? client.deliverables),
        adBudget: invoiceData.adBudget !== undefined ? invoiceData.adBudget : (existing.adBudget ?? client.adBudget),
        items,
        subtotal: calc.subtotal,
        discountPercent: calc.discountPercent,
        discountAmount: calc.discountAmount,
        taxSnapshot: calc.taxSnapshot,
        roundOff: calc.roundOff,
        total: calc.total,
        amountInWords: calc.amountInWords,
        notes: invoiceData.notes ?? existing.notes ?? companySettings.defaultNotes,
        paymentTerms: invoiceData.paymentTerms ?? existing.paymentTerms ?? companySettings.defaultTerms,
        bankDetailsSnapshot: bankDetails,
        companySnapshot: companySettings,
        updatedAt: now,
      };

      invoices[idx] = updatedDraft;
      this.setItems(STORAGE_KEYS.INVOICES, invoices);
      return updatedDraft;
    } else {
      const newDraft: Invoice = {
        id: `draft-${Date.now()}-${Math.random().toString(36).substring(2, 6)}`,
        invoiceNumber: null,
        financialYear: null,
        sequenceNumber: null,
        clientId: client.id,
        clientSnapshot: client,
        issueDate,
        dueDate,
        billingPeriod: invoiceData.billingPeriod,
        billingChoice: invoiceData.billingChoice || 'itemized',
        deliverables: invoiceData.deliverables !== undefined ? invoiceData.deliverables : client.deliverables,
        adBudget: invoiceData.adBudget !== undefined ? invoiceData.adBudget : client.adBudget,
        items,
        subtotal: calc.subtotal,
        discountPercent: calc.discountPercent,
        discountAmount: calc.discountAmount,
        taxSnapshot: calc.taxSnapshot,
        roundOff: calc.roundOff,
        total: calc.total,
        amountInWords: calc.amountInWords,
        notes: invoiceData.notes || companySettings.defaultNotes,
        paymentTerms: invoiceData.paymentTerms || companySettings.defaultTerms,
        bankDetailsSnapshot: bankDetails,
        companySnapshot: companySettings,
        status: 'draft',
        isFinalized: false,
        finalizedAt: null,
        isCancelled: false,
        cancelledAt: null,
        cancellationReason: null,
        createdAt: now,
        updatedAt: now,
      };

      invoices.push(newDraft);
      this.setItems(STORAGE_KEYS.INVOICES, invoices);
      return newDraft;
    }
  }

  async finalizeInvoice(options: FinalizeInvoiceOptions): Promise<Invoice> {
    const { invoiceId, issueDate } = options;
    const invoices = await this.getInvoices();
    const idx = invoices.findIndex((inv) => inv.id === invoiceId);

    if (idx === -1) {
      throw new Error('Invoice not found.');
    }

    const draft = invoices[idx];
    if (draft.isFinalized) {
      throw new Error(`Invoice is already finalized with number ${draft.invoiceNumber}.`);
    }

    const effectiveDate = issueDate || draft.issueDate || new Date().toISOString().split('T')[0];
    const financialYear = getFinancialYear(effectiveDate);

    // Sequence allocation
    const sequences = this.getItems<FYSequenceRecord[]>(STORAGE_KEYS.SEQUENCES, []);
    let fyRecord = sequences.find((s) => s.financialYear === financialYear);

    if (!fyRecord) {
      fyRecord = {
        financialYear,
        lastSequenceNumber: 0,
        cancelledNumbers: [],
      };
      sequences.push(fyRecord);
    }

    fyRecord.lastSequenceNumber += 1;
    const sequenceNumber = fyRecord.lastSequenceNumber;
    const invoiceNumber = formatInvoiceNumber(financialYear, sequenceNumber);

    this.setItems(STORAGE_KEYS.SEQUENCES, sequences);

    // Snapshot GST settings and client at moment of finalization
    const companySettings = await this.getCompanySettings();
    const bankDetails = await this.getBankDetails();
    const client = await this.getClient(draft.clientId) || draft.clientSnapshot;

    const calc = calculateInvoiceTotals({
      items: draft.items,
      discountPercent: draft.discountPercent,
    });

    const now = new Date().toISOString();
    const finalizedInvoice: Invoice = {
      ...draft,
      invoiceNumber,
      financialYear,
      sequenceNumber,
      clientSnapshot: client,
      companySnapshot: companySettings,
      bankDetailsSnapshot: bankDetails,
      taxSnapshot: calc.taxSnapshot,
      subtotal: calc.subtotal,
      discountAmount: calc.discountAmount,
      roundOff: calc.roundOff,
      total: calc.total,
      amountInWords: calc.amountInWords,
      status: 'sent',
      isFinalized: true,
      finalizedAt: now,
      updatedAt: now,
    };

    invoices[idx] = finalizedInvoice;
    this.setItems(STORAGE_KEYS.INVOICES, invoices);

    return finalizedInvoice;
  }

  async cancelInvoice(options: CancelInvoiceOptions): Promise<Invoice> {
    const { invoiceId, reason } = options;
    const invoices = await this.getInvoices();
    const idx = invoices.findIndex((inv) => inv.id === invoiceId);

    if (idx === -1) {
      throw new Error('Invoice not found.');
    }

    const invoice = invoices[idx];
    if (invoice.isCancelled) {
      throw new Error('Invoice is already cancelled.');
    }
    if (!invoice.isFinalized) {
      throw new Error('Draft invoices cannot be cancelled; delete the draft instead.');
    }

    const now = new Date().toISOString();
    const cancelledInvoice: Invoice = {
      ...invoice,
      status: 'cancelled',
      isCancelled: true,
      cancelledAt: now,
      cancellationReason: reason,
      updatedAt: now,
    };

    invoices[idx] = cancelledInvoice;
    this.setItems(STORAGE_KEYS.INVOICES, invoices);

    // Record cancelled number in sequences so it is never reused
    if (invoice.financialYear && invoice.invoiceNumber) {
      const sequences = this.getItems<FYSequenceRecord[]>(STORAGE_KEYS.SEQUENCES, []);
      const seq = sequences.find((s) => s.financialYear === invoice.financialYear);
      if (seq) {
        if (!seq.cancelledNumbers.includes(invoice.invoiceNumber)) {
          seq.cancelledNumbers.push(invoice.invoiceNumber);
          this.setItems(STORAGE_KEYS.SEQUENCES, sequences);
        }
      }
    }

    return cancelledInvoice;
  }

  async deleteDraftInvoice(id: string): Promise<{ success: boolean; error?: string }> {
    const invoices = await this.getInvoices();
    const inv = invoices.find((i) => i.id === id);

    if (!inv) {
      return { success: false, error: 'Invoice not found.' };
    }

    if (inv.isFinalized) {
      return {
        success: false,
        error: 'Finalized invoices cannot be deleted as they represent permanent accounting records. You may Cancel the invoice instead.',
      };
    }

    const filtered = invoices.filter((i) => i.id !== id);
    this.setItems(STORAGE_KEYS.INVOICES, filtered);
    return { success: true };
  }

  // Payments
  async getPayments(invoiceId?: string): Promise<Payment[]> {
    const all = this.getItems<Payment[]>(STORAGE_KEYS.PAYMENTS, []);
    return invoiceId ? all.filter((p) => p.invoiceId === invoiceId) : all;
  }

  async recordPayment(input: RecordPaymentInput): Promise<{ payment: Payment; updatedInvoice: Invoice }> {
    const { invoiceId, amount, paymentDate, mode, reference, notes } = input;
    const numAmount = Number(amount);

    if (isNaN(numAmount) || numAmount <= 0) {
      throw new Error('Payment amount must be greater than zero.');
    }

    const invoice = await this.getInvoice(invoiceId);
    if (!invoice) {
      throw new Error('Invoice not found.');
    }

    if (!invoice.isFinalized) {
      throw new Error('Payments can only be recorded on finalized invoices.');
    }

    if (invoice.isCancelled) {
      throw new Error('Cannot record payments against a cancelled invoice.');
    }

    const existingPayments = await this.getPayments(invoiceId);
    const balance = calculateOutstandingBalance(invoice.total, existingPayments);

    // Overpayment prevention
    if (numAmount > balance + 0.05) {
      throw new Error(
        `Payment amount of ₹${numAmount.toLocaleString('en-IN')} exceeds current outstanding balance of ₹${balance.toLocaleString('en-IN')}. Please verify the amount.`
      );
    }

    const newPayment: Payment = {
      id: `pay-${Date.now()}-${Math.random().toString(36).substring(2, 6)}`,
      invoiceId,
      amount: numAmount,
      paymentDate: paymentDate || new Date().toISOString().split('T')[0],
      mode,
      reference: reference.trim() || 'N/A',
      notes: notes?.trim() || '',
      recordedAt: new Date().toISOString(),
      isReversed: false,
    };

    const allPayments = await this.getPayments();
    allPayments.push(newPayment);
    this.setItems(STORAGE_KEYS.PAYMENTS, allPayments);

    // Recompute invoice status
    const updatedPayments = [...existingPayments, newPayment];
    const newStatus = resolveInvoiceStatus(
      invoice.isFinalized,
      invoice.isCancelled,
      invoice.total,
      updatedPayments,
      invoice.dueDate
    );

    const invoices = await this.getInvoices();
    const idx = invoices.findIndex((i) => i.id === invoiceId);
    const updatedInvoice: Invoice = {
      ...invoice,
      status: newStatus,
      updatedAt: new Date().toISOString(),
    };
    if (idx !== -1) {
      invoices[idx] = updatedInvoice;
      this.setItems(STORAGE_KEYS.INVOICES, invoices);
    }

    return { payment: newPayment, updatedInvoice };
  }

  async reversePayment(input: ReversePaymentInput): Promise<{ payment: Payment; updatedInvoice: Invoice }> {
    const { paymentId, reason } = input;
    const allPayments = await this.getPayments();
    const idx = allPayments.findIndex((p) => p.id === paymentId);

    if (idx === -1) {
      throw new Error('Payment not found.');
    }

    const payment = allPayments[idx];
    if (payment.isReversed) {
      throw new Error('Payment is already reversed.');
    }

    const now = new Date().toISOString();
    const updatedPayment: Payment = {
      ...payment,
      isReversed: true,
      reversedAt: now,
      reversalReason: reason,
    };

    allPayments[idx] = updatedPayment;
    this.setItems(STORAGE_KEYS.PAYMENTS, allPayments);

    // Update invoice status
    const invoice = await this.getInvoice(payment.invoiceId);
    if (!invoice) {
      throw new Error('Associated invoice not found.');
    }

    const invPayments = allPayments.filter((p) => p.invoiceId === invoice.id);
    const newStatus = resolveInvoiceStatus(
      invoice.isFinalized,
      invoice.isCancelled,
      invoice.total,
      invPayments,
      invoice.dueDate
    );

    const invoices = await this.getInvoices();
    const invIdx = invoices.findIndex((i) => i.id === invoice.id);
    const updatedInvoice: Invoice = {
      ...invoice,
      status: newStatus,
      updatedAt: now,
    };
    if (invIdx !== -1) {
      invoices[invIdx] = updatedInvoice;
      this.setItems(STORAGE_KEYS.INVOICES, invoices);
    }

    return { payment: updatedPayment, updatedInvoice };
  }

  // Settings
  async getCompanySettings(): Promise<CompanySettings> {
    return this.getItems<CompanySettings>(STORAGE_KEYS.SETTINGS, INITIAL_COMPANY_SETTINGS);
  }

  async saveCompanySettings(settings: Partial<CompanySettings>): Promise<CompanySettings> {
    const current = await this.getCompanySettings();
    const updated: CompanySettings = { ...current, ...settings };
    this.setItems(STORAGE_KEYS.SETTINGS, updated);
    return updated;
  }

  async getBankDetails(): Promise<BankDetails> {
    return this.getItems<BankDetails>(STORAGE_KEYS.BANK, INITIAL_BANK_DETAILS);
  }

  async saveBankDetails(bankDetails: Partial<BankDetails>): Promise<BankDetails> {
    const current = await this.getBankDetails();
    const updated: BankDetails = { ...current, ...bankDetails };
    this.setItems(STORAGE_KEYS.BANK, updated);
    return updated;
  }

  // Notifications
  async getNotifications(): Promise<AppNotification[]> {
    return this.generateDerivedNotifications();
  }

  async markNotificationRead(id: string): Promise<void> {
    const readIds = this.getItems<string[]>('techsozo_read_notifs', []);
    if (!readIds.includes(id)) {
      readIds.push(id);
      this.setItems('techsozo_read_notifs', readIds);
    }
  }

  async markAllNotificationsRead(): Promise<void> {
    const notifs = await this.generateDerivedNotifications();
    const ids = notifs.map((n) => n.id);
    this.setItems('techsozo_read_notifs', ids);
  }

  async generateDerivedNotifications(): Promise<AppNotification[]> {
    const invoices = await this.getInvoices();
    const payments = await this.getPayments();
    const readIds = this.getItems<string[]>('techsozo_read_notifs', []);
    const notifications: AppNotification[] = [];

    const today = new Date();
    today.setHours(0, 0, 0, 0);

    // Scan invoices
    for (const inv of invoices) {
      // Exclude draft and cancelled
      if (!inv.isFinalized || inv.isCancelled) continue;

      const invPayments = payments.filter((p) => p.invoiceId === inv.id);
      const balance = calculateOutstandingBalance(inv.total, invPayments);

      // Exclude fully paid invoices
      if (balance <= 0) continue;

      const [y, m, d] = inv.dueDate.split('-').map(Number);
      const dueDate = new Date(y, m - 1, d);
      dueDate.setHours(0, 0, 0, 0);

      const diffDays = Math.round((dueDate.getTime() - today.getTime()) / (1000 * 60 * 60 * 24));

      if (diffDays < 0) {
        // Overdue
        const id = `notif-overdue-${inv.id}`;
        notifications.push({
          id,
          title: `Overdue Invoice: ${inv.invoiceNumber}`,
          message: `${inv.clientSnapshot.name} has an overdue balance of ₹${balance.toLocaleString('en-IN')}. Due date was ${inv.dueDate}.`,
          type: 'overdue',
          invoiceId: inv.id,
          invoiceNumber: inv.invoiceNumber || undefined,
          read: readIds.includes(id),
          createdAt: inv.updatedAt,
        });
      } else if (diffDays === 0) {
        // Due today
        const id = `notif-today-${inv.id}`;
        notifications.push({
          id,
          title: `Payment Due Today: ${inv.invoiceNumber}`,
          message: `Invoice for ${inv.clientSnapshot.name} with balance ₹${balance.toLocaleString('en-IN')} is due today.`,
          type: 'due_today',
          invoiceId: inv.id,
          invoiceNumber: inv.invoiceNumber || undefined,
          read: readIds.includes(id),
          createdAt: new Date().toISOString(),
        });
      } else if (diffDays <= 3) {
        // Due soon
        const id = `notif-soon-${inv.id}`;
        notifications.push({
          id,
          title: `Due in ${diffDays} day${diffDays > 1 ? 's' : ''}: ${inv.invoiceNumber}`,
          message: `Invoice for ${inv.clientSnapshot.name} (balance ₹${balance.toLocaleString('en-IN')}) is due on ${inv.dueDate}.`,
          type: 'due_soon',
          invoiceId: inv.id,
          invoiceNumber: inv.invoiceNumber || undefined,
          read: readIds.includes(id),
          createdAt: inv.updatedAt,
        });
      }
    }

    // Backup reminder
    const lastBackup = localStorage.getItem(STORAGE_KEYS.LAST_BACKUP);
    if (!lastBackup) {
      const id = 'notif-backup-first';
      notifications.push({
        id,
        title: 'Safety Backup Recommended',
        message: 'You have not created a local JSON data backup yet. Export a backup in Settings to safeguard your records.',
        type: 'backup_reminder',
        read: readIds.includes(id),
        createdAt: new Date().toISOString(),
      });
    }

    return notifications;
  }

  // Backup & Restore
  async exportBackupData(): Promise<AppDataBackup> {
    const clients = await this.getClients();
    const services = await this.getServices();
    const invoices = await this.getInvoices();
    const payments = await this.getPayments();
    const sequences = this.getItems<FYSequenceRecord[]>(STORAGE_KEYS.SEQUENCES, []);
    const companySettings = await this.getCompanySettings();
    const bankDetails = await this.getBankDetails();

    const backup: AppDataBackup = {
      version: '1.0.0',
      exportedAt: new Date().toISOString(),
      clients,
      services,
      invoices,
      payments,
      sequences,
      companySettings,
      bankDetails,
    };

    localStorage.setItem(STORAGE_KEYS.LAST_BACKUP, new Date().toISOString());
    return backup;
  }

  async importBackupData(backup: AppDataBackup, mode: 'merge' | 'replace'): Promise<{ success: boolean; message: string }> {
    if (!backup || typeof backup !== 'object') {
      throw new Error('Invalid backup file: Not a valid JSON object.');
    }

    if (!Array.isArray(backup.clients) || !Array.isArray(backup.invoices)) {
      throw new Error('Invalid backup schema: Missing clients or invoices array.');
    }

    if (mode === 'replace') {
      this.setItems(STORAGE_KEYS.CLIENTS, backup.clients);
      this.setItems(STORAGE_KEYS.SERVICES, backup.services || []);
      this.setItems(STORAGE_KEYS.INVOICES, backup.invoices);
      this.setItems(STORAGE_KEYS.PAYMENTS, backup.payments || []);
      this.setItems(STORAGE_KEYS.SEQUENCES, backup.sequences || []);
      if (backup.companySettings) {
        this.setItems(STORAGE_KEYS.SETTINGS, backup.companySettings);
      }
      if (backup.bankDetails) {
        this.setItems(STORAGE_KEYS.BANK, backup.bankDetails);
      }
      return { success: true, message: `Successfully replaced local database with ${backup.invoices.length} invoices and ${backup.clients.length} clients.` };
    } else {
      // Merge mode
      const existingClients = await this.getClients();
      const existingInvoices = await this.getInvoices();
      const existingPayments = await this.getPayments();
      const existingServices = await this.getServices();

      // Merge clients by ID
      const clientMap = new Map(existingClients.map((c) => [c.id, c]));
      backup.clients.forEach((c) => clientMap.set(c.id, c));

      // Merge services by ID
      const serviceMap = new Map(existingServices.map((s) => [s.id, s]));
      (backup.services || []).forEach((s) => serviceMap.set(s.id, s));

      // Merge invoices by ID
      const invoiceMap = new Map(existingInvoices.map((i) => [i.id, i]));
      backup.invoices.forEach((i) => invoiceMap.set(i.id, i));

      // Merge payments by ID
      const paymentMap = new Map(existingPayments.map((p) => [p.id, p]));
      (backup.payments || []).forEach((p) => paymentMap.set(p.id, p));

      this.setItems(STORAGE_KEYS.CLIENTS, Array.from(clientMap.values()));
      this.setItems(STORAGE_KEYS.SERVICES, Array.from(serviceMap.values()));
      this.setItems(STORAGE_KEYS.INVOICES, Array.from(invoiceMap.values()));
      this.setItems(STORAGE_KEYS.PAYMENTS, Array.from(paymentMap.values()));

      return {
        success: true,
        message: `Successfully merged data. Total invoices: ${invoiceMap.size}, total clients: ${clientMap.size}.`,
      };
    }
  }

  async resetToDemoSeed(): Promise<void> {
    this.memoryCache.clear();
    localStorage.setItem(STORAGE_KEYS.CLIENTS, JSON.stringify([]));
    localStorage.setItem(STORAGE_KEYS.SERVICES, JSON.stringify([]));
    localStorage.setItem(STORAGE_KEYS.INVOICES, JSON.stringify([]));
    localStorage.setItem(STORAGE_KEYS.PAYMENTS, JSON.stringify([]));
    localStorage.setItem(STORAGE_KEYS.SETTINGS, JSON.stringify(INITIAL_COMPANY_SETTINGS));
    localStorage.setItem(STORAGE_KEYS.BANK, JSON.stringify(INITIAL_BANK_DETAILS));
    localStorage.setItem(
      STORAGE_KEYS.SEQUENCES,
      JSON.stringify([{ financialYear: '26-27', lastSequenceNumber: 0, cancelledNumbers: [] }])
    );
    localStorage.removeItem('techsozo_read_notifs');
    localStorage.setItem('techsozo_demo_purged_v2', 'true');
    this.memoryCache.set(STORAGE_KEYS.CLIENTS, []);
    this.memoryCache.set(STORAGE_KEYS.SERVICES, []);
    this.memoryCache.set(STORAGE_KEYS.INVOICES, []);
    this.memoryCache.set(STORAGE_KEYS.PAYMENTS, []);
    this.memoryCache.set(STORAGE_KEYS.SETTINGS, INITIAL_COMPANY_SETTINGS);
    this.memoryCache.set(STORAGE_KEYS.BANK, INITIAL_BANK_DETAILS);
    this.memoryCache.set(STORAGE_KEYS.SEQUENCES, [
      { financialYear: '26-27', lastSequenceNumber: 0, cancelledNumbers: [] },
    ]);
  }
}

// Singleton instance
export const invoiceRepository = new LocalStorageRepository();
