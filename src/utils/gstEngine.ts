import { InvoiceLineItem, GSTConfigSnapshot } from '../types';
import { roundToTwoDecimals } from './calculations';

/**
 * Modular GST Engine (Archived for future reintroduction)
 * Contains the statutory rules for Indian Goods and Services Tax (GST):
 * - Intra-state: CGST (50%) + SGST (50%)
 * - Inter-state: IGST (100%)
 */
export interface GSTCalculationParams {
  taxableAmount: number;
  gstRate: number;
  companyState: string;
  clientState: string;
}

export function computeGSTSnapshot(params: GSTCalculationParams): GSTConfigSnapshot {
  const { taxableAmount, gstRate, companyState, clientState } = params;

  if (gstRate <= 0 || taxableAmount <= 0) {
    return {
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

  const normCompanyState = (companyState || '').trim().toLowerCase();
  const normClientState = (clientState || '').trim().toLowerCase();

  const isInterstate = Boolean(
    normClientState &&
    normCompanyState &&
    normClientState !== normCompanyState
  );

  if (isInterstate) {
    const igstAmount = roundToTwoDecimals(taxableAmount * (gstRate / 100));
    return {
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
    const halfRate = roundToTwoDecimals(gstRate / 2);
    const cgstAmount = roundToTwoDecimals(taxableAmount * (halfRate / 100));
    const sgstAmount = roundToTwoDecimals(taxableAmount * (halfRate / 100));
    return {
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
}
