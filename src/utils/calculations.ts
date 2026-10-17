import {
  InvoiceLineItem,
  GSTConfigSnapshot,
  InvoiceStatus,
  Payment,
  CompanySettings,
} from '../types';
import { numberToIndianWords } from './indianNumbering';

/**
 * Rounds a number safely to 2 decimal places to avoid floating-point math issues.
 */
export function roundToTwoDecimals(num: number): number {
  return Math.round((num + Number.EPSILON) * 100) / 100;
}

/**
 * Rounds a number to the nearest whole integer (nearest Rupee).
 */
export function roundToNearestRupee(num: number): number {
  return Math.round(num);
}

/**
 * Computes line item total safely.
 */
export function calculateLineItemAmount(quantity: number, rate: number): number {
  const safeQty = Math.max(0, Number(quantity) || 0);
  const safeRate = Math.max(0, Number(rate) || 0);
  return roundToTwoDecimals(safeQty * safeRate);
}

/**
 * Computes the Indian Financial Year string (e.g., '26-27') for a given date.
 * Financial year in India runs from 1 April of year Y to 31 March of year Y+1.
 */
export function getFinancialYear(dateInput: string | Date = new Date()): string {
  const d = typeof dateInput === 'string' ? new Date(dateInput) : dateInput;
  if (isNaN(d.getTime())) {
    return getFinancialYear(new Date());
  }

  const year = d.getFullYear();
  const month = d.getMonth(); // 0 is January, 3 is April

  let startYear: number;
  let endYear: number;

  if (month >= 3) {
    // April (3) to December (11)
    startYear = year;
    endYear = year + 1;
  } else {
    // January (0) to March (2)
    startYear = year - 1;
    endYear = year;
  }

  const startYY = String(startYear % 100).padStart(2, '0');
  const endYY = String(endYear % 100).padStart(2, '0');

  return `${startYY}-${endYY}`;
}

/**
 * Formats an invoice number based on Financial Year and sequence number.
 * Example: INV/26-27/001
 */
export function formatInvoiceNumber(financialYear: string, sequence: number): string {
  const paddedSeq = String(sequence).padStart(3, '0');
  return `INV/${financialYear}/${paddedSeq}`;
}

export interface CalculationInput {
  items: InvoiceLineItem[];
  discountPercent: number;
  gstEnabled: boolean;
  gstRate: number;
  companyState: string;
  clientState: string;
}

export interface CalculationResult {
  subtotal: number;
  discountPercent: number;
  discountAmount: number;
  taxableAmount: number;
  taxSnapshot: GSTConfigSnapshot;
  unroundedTotal: number;
  roundOff: number;
  total: number;
  amountInWords: string;
}

/**
 * Computes all invoice financial figures with decimal-safe precision.
 */
export function calculateInvoiceTotals(input: CalculationInput): CalculationResult {
  const {
    items,
    discountPercent,
    gstEnabled,
    gstRate,
    companyState,
    clientState,
  } = input;

  // 1. Subtotal = sum of all line item amounts
  const subtotal = roundToTwoDecimals(
    items.reduce((sum, item) => sum + calculateLineItemAmount(item.quantity, item.rate), 0)
  );

  // 2. Discount
  const safeDiscountPercent = Math.min(100, Math.max(0, Number(discountPercent) || 0));
  const discountAmount = roundToTwoDecimals(subtotal * (safeDiscountPercent / 100));

  // 3. Taxable Amount
  const taxableAmount = Math.max(0, roundToTwoDecimals(subtotal - discountAmount));

  // 4. GST Snapshot
  let taxSnapshot: GSTConfigSnapshot;

  if (gstEnabled && gstRate > 0 && taxableAmount > 0) {
    const normCompanyState = (companyState || '').trim().toLowerCase();
    const normClientState = (clientState || '').trim().toLowerCase();
    
    // Interstate if client state is specified and different from company state
    const isInterstate = Boolean(
      normClientState &&
      normCompanyState &&
      normClientState !== normCompanyState
    );

    if (isInterstate) {
      // IGST (full rate)
      const igstAmount = roundToTwoDecimals(taxableAmount * (gstRate / 100));
      taxSnapshot = {
        enabled: true,
        companyState: companyState || 'Tamil Nadu',
        clientState: clientState || '',
        isInterstate: true,
        cgstRate: 0,
        sgstRate: 0,
        igstRate: gstRate,
        cgstAmount: 0,
        sgstAmount: 0,
        igstAmount,
        totalTax: igstAmount,
      };
    } else {
      // Intra-state (CGST + SGST split evenly)
      const halfRate = roundToTwoDecimals(gstRate / 2);
      const cgstAmount = roundToTwoDecimals(taxableAmount * (halfRate / 100));
      const sgstAmount = roundToTwoDecimals(taxableAmount * (halfRate / 100));
      taxSnapshot = {
        enabled: true,
        companyState: companyState || 'Tamil Nadu',
        clientState: clientState || 'Tamil Nadu',
        isInterstate: false,
        cgstRate: halfRate,
        sgstRate: halfRate,
        igstRate: 0,
        cgstAmount,
        sgstAmount,
        igstAmount: 0,
        totalTax: roundToTwoDecimals(cgstAmount + sgstAmount),
      };
    }
  } else {
    // GST Disabled or 0 rate
    taxSnapshot = {
      enabled: false,
      companyState: companyState || 'Tamil Nadu',
      clientState: clientState || '',
      isInterstate: false,
      cgstRate: 0,
      sgstRate: 0,
      igstRate: 0,
      cgstAmount: 0,
      sgstAmount: 0,
      igstAmount: 0,
      totalTax: 0,
    };
  }

  // 5. Total before round-off
  const unroundedTotal = roundToTwoDecimals(taxableAmount + taxSnapshot.totalTax);

  // 6. Round-off to nearest rupee
  const finalTotal = roundToNearestRupee(unroundedTotal);
  const roundOff = roundToTwoDecimals(finalTotal - unroundedTotal);

  // 7. Amount in words
  const amountInWords = numberToIndianWords(finalTotal);

  return {
    subtotal,
    discountPercent: safeDiscountPercent,
    discountAmount,
    taxableAmount,
    taxSnapshot,
    unroundedTotal,
    roundOff,
    total: finalTotal,
    amountInWords,
  };
}

/**
 * Calculates sum of valid (non-reversed) payments for an invoice.
 */
export function calculateReceivedAmount(payments: Payment[]): number {
  return roundToTwoDecimals(
    payments
      .filter((p) => !p.isReversed)
      .reduce((sum, p) => sum + (Number(p.amount) || 0), 0)
  );
}

/**
 * Calculates remaining balance on an invoice.
 */
export function calculateOutstandingBalance(total: number, payments: Payment[]): number {
  const received = calculateReceivedAmount(payments);
  return Math.max(0, roundToTwoDecimals(total - received));
}

/**
 * Resolves the dynamic status of an invoice.
 * Paid / Cancelled invoices are strictly preserved.
 * Draft invoices stay draft.
 * Unpaid or Partially paid invoices recalculate based on due date.
 */
export function resolveInvoiceStatus(
  isFinalized: boolean,
  isCancelled: boolean,
  total: number,
  payments: Payment[],
  dueDateStr: string,
  currentDate: Date = new Date()
): InvoiceStatus {
  if (isCancelled) {
    return 'cancelled';
  }

  if (!isFinalized) {
    return 'draft';
  }

  const received = calculateReceivedAmount(payments);

  if (received >= total && total > 0) {
    return 'paid';
  }

  // Check if overdue
  // Parse dueDateStr YYYY-MM-DD
  const [year, month, day] = dueDateStr.split('-').map(Number);
  const dueDate = new Date(year, month - 1, day, 23, 59, 59, 999);
  const isOverdue = currentDate.getTime() > dueDate.getTime();

  if (received > 0) {
    return isOverdue ? 'overdue' : 'partially_paid';
  }

  return isOverdue ? 'overdue' : 'sent';
}

/**
 * Generates default due date (+15 days by default from issue date).
 */
export function calculateDefaultDueDate(issueDateStr: string, daysOffset: number = 15): string {
  const date = new Date(issueDateStr || new Date());
  date.setDate(date.getDate() + daysOffset);
  return date.toISOString().split('T')[0];
}
