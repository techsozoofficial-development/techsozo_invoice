import { describe, it, expect } from 'vitest';
import {
  calculateLineItemAmount,
  calculateInvoiceTotals,
  getFinancialYear,
  formatInvoiceNumber,
  resolveInvoiceStatus,
  calculateOutstandingBalance,
  calculateReceivedAmount,
  roundToTwoDecimals,
} from '../utils/calculations';
import { numberToIndianWords, formatINR } from '../utils/indianNumbering';
import { Payment } from '../types';

import { computeGSTSnapshot } from '../utils/gstEngine';

describe('Financial Calculations Engine', () => {
  it('safely computes line item totals with 2-decimal precision', () => {
    expect(calculateLineItemAmount(3, 4999.99)).toBe(14999.97);
    expect(calculateLineItemAmount(0.1, 0.2)).toBe(0.02);
    expect(calculateLineItemAmount(0, 5000)).toBe(0);
    expect(calculateLineItemAmount(-2, 500)).toBe(0);
  });

  it('calculates invoice totals: Subtotal - Discount = Total Payable', () => {
    const result = calculateInvoiceTotals({
      items: [
        { id: '1', description: 'SEO Strategy', quantity: 1, rate: 25000, amount: 25000 },
        { id: '2', description: 'Social Media Management', quantity: 2, rate: 15000, amount: 30000 },
      ],
      discountPercent: 10,
    });

    expect(result.subtotal).toBe(55000);
    expect(result.discountAmount).toBe(5500);
    expect(result.total).toBe(49500);
    expect(result.amountInWords).toBe('Forty-Nine Thousand Five Hundred Rupees Only');
  });

  it('calculates exact payable amount with zero discount', () => {
    const result = calculateInvoiceTotals({
      items: [
        { id: '1', description: 'Ads Management', quantity: 1, rate: 10000, amount: 10000 },
      ],
      discountPercent: 0,
    });

    expect(result.subtotal).toBe(10000);
    expect(result.discountAmount).toBe(0);
    expect(result.total).toBe(10000);
    expect(result.amountInWords).toBe('Ten Thousand Rupees Only');
  });

  it('verifies modular GST engine snapshot for future reintroduction', () => {
    const intraState = computeGSTSnapshot({
      taxableAmount: 10000,
      gstRate: 18,
      companyState: 'Tamil Nadu',
      clientState: 'Tamil Nadu',
    });
    expect(intraState.isInterstate).toBe(false);
    expect(intraState.cgstAmount).toBe(900);
    expect(intraState.sgstAmount).toBe(900);
    expect(intraState.totalTax).toBe(1800);

    const interState = computeGSTSnapshot({
      taxableAmount: 10000,
      gstRate: 18,
      companyState: 'Tamil Nadu',
      clientState: 'Karnataka',
    });
    expect(interState.isInterstate).toBe(true);
    expect(interState.igstAmount).toBe(1800);
    expect(interState.totalTax).toBe(1800);
  });

  it('handles rounding off to the nearest rupee accurately', () => {
    const result = calculateInvoiceTotals({
      items: [
        { id: '1', description: 'Consulting', quantity: 1, rate: 12500.67, amount: 12500.67 },
      ],
      discountPercent: 0,
    });

    expect(result.unroundedTotal).toBe(12500.67);
    expect(result.total).toBe(12501);
    expect(result.roundOff).toBe(0.33);
  });
});

describe('Indian Financial Year and Numbering', () => {
  it('correctly maps Indian Financial Year across April 1 boundary', () => {
    // Oct 17, 2026 -> FY 2026-27 -> '26-27'
    expect(getFinancialYear('2026-10-17')).toBe('26-27');

    // March 31, 2027 -> FY 2026-27 -> '26-27'
    expect(getFinancialYear('2027-03-31')).toBe('26-27');

    // April 1, 2027 -> FY 2027-28 -> '27-28'
    expect(getFinancialYear('2027-04-01')).toBe('27-28');

    // January 15, 2026 -> FY 2025-26 -> '25-26'
    expect(getFinancialYear('2026-01-15')).toBe('25-26');
  });

  it('formats invoice number correctly with 3-digit padding', () => {
    expect(formatInvoiceNumber('26-27', 1)).toBe('INV/26-27/001');
    expect(formatInvoiceNumber('26-27', 42)).toBe('INV/26-27/042');
    expect(formatInvoiceNumber('27-28', 105)).toBe('INV/27-28/105');
  });
});

describe('Indian Currency Words & Formatting', () => {
  it('formats Indian currency properly with ₹ symbol and commas', () => {
    expect(formatINR(125000)).toBe('₹1,25,000.00');
    expect(formatINR(15000000.5)).toBe('₹1,50,00,000.50');
    expect(formatINR(0)).toBe('₹0.00');
  });

  it('converts amounts to Indian words correctly', () => {
    expect(numberToIndianWords(125000)).toBe('One Lakh Twenty-Five Thousand Rupees Only');
    expect(numberToIndianWords(1000)).toBe('One Thousand Rupees Only');
    expect(numberToIndianWords(50)).toBe('Fifty Rupees Only');
    expect(numberToIndianWords(10500200)).toBe('One Crore Five Lakh Two Hundred Rupees Only');
    expect(numberToIndianWords(0)).toBe('Zero Rupees Only');
  });
});

describe('Payment & Invoice Status Transitions', () => {
  const dummyPayment = (id: string, amount: number, isReversed: boolean = false): Payment => ({
    id,
    invoiceId: 'inv-1',
    amount,
    paymentDate: '2026-10-10',
    mode: 'bank_transfer',
    reference: 'TXN123',
    recordedAt: '2026-10-10T10:00:00Z',
    isReversed,
  });

  it('calculates received amount ignoring reversed payments', () => {
    const payments = [
      dummyPayment('1', 5000, false),
      dummyPayment('2', 2000, true), // reversed
      dummyPayment('3', 3000, false),
    ];

    expect(calculateReceivedAmount(payments)).toBe(8000);
    expect(calculateOutstandingBalance(10000, payments)).toBe(2000);
  });

  it('evaluates status correctly across states', () => {
    const today = new Date('2026-10-17');

    // 1. Draft
    expect(
      resolveInvoiceStatus(false, false, 10000, [], '2026-10-20', today)
    ).toBe('draft');

    // 2. Cancelled
    expect(
      resolveInvoiceStatus(true, true, 10000, [], '2026-10-20', today)
    ).toBe('cancelled');

    // 3. Sent (Unpaid, not overdue)
    expect(
      resolveInvoiceStatus(true, false, 10000, [], '2026-10-25', today)
    ).toBe('sent');

    // 4. Overdue (Unpaid, past due date)
    expect(
      resolveInvoiceStatus(true, false, 10000, [], '2026-10-10', today)
    ).toBe('overdue');

    // 5. Partially paid (not overdue)
    expect(
      resolveInvoiceStatus(true, false, 10000, [dummyPayment('1', 4000)], '2026-10-25', today)
    ).toBe('partially_paid');

    // 6. Overdue with partial payment
    expect(
      resolveInvoiceStatus(true, false, 10000, [dummyPayment('1', 4000)], '2026-10-10', today)
    ).toBe('overdue');

    // 7. Fully paid
    expect(
      resolveInvoiceStatus(true, false, 10000, [dummyPayment('1', 10000)], '2026-10-10', today)
    ).toBe('paid');
  });
});
