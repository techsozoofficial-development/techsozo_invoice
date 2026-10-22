import { ClientService, InvoiceLineItem } from '../types';

export interface ServiceDiffResult {
  hasDifferences: boolean;
  differences: string[];
}

/**
 * Compares client's saved default services with current invoice line items.
 * Detects additions, deletions, rate changes, quantity changes, and description edits.
 */
export function detectClientServiceDifferences(
  savedServices: ClientService[] = [],
  invoiceItems: InvoiceLineItem[] = []
): ServiceDiffResult {
  const differences: string[] = [];

  // Filter out any completely empty invoice items
  const validInvoiceItems = invoiceItems.filter(
    (item) => item.description?.trim() || item.rate > 0 || item.quantity > 0
  );

  if (savedServices.length !== validInvoiceItems.length) {
    differences.push(
      `Service count differs: ${savedServices.length} client default(s) vs ${validInvoiceItems.length} invoice item(s).`
    );
  }

  // Compare item by item
  const maxLen = Math.max(savedServices.length, validInvoiceItems.length);
  for (let i = 0; i < maxLen; i++) {
    const saved = savedServices[i];
    const current = validInvoiceItems[i];

    if (!saved && current) {
      differences.push(`Added new service: "${current.description.split('\n')[0]}" (₹${current.rate})`);
    } else if (saved && !current) {
      differences.push(`Removed service: "${saved.name}"`);
    } else if (saved && current) {
      const currentName = current.description.split('\n')[0].trim();
      const savedName = saved.name.trim();

      if (currentName.toLowerCase() !== savedName.toLowerCase()) {
        differences.push(`Changed service name: "${savedName}" -> "${currentName}"`);
      }
      if (Number(current.quantity) !== Number(saved.quantity)) {
        differences.push(`Changed quantity for "${savedName}": ${saved.quantity} -> ${current.quantity}`);
      }
      const savedRate = saved.rate != null ? Number(saved.rate) : null;
      const currentRate = current.rate != null && current.rate > 0 ? Number(current.rate) : (savedRate != null ? Number(current.rate) : null);
      if (savedRate !== currentRate && !(savedRate == null && (current.rate == null || current.rate === 0))) {
        differences.push(
          `Changed rate for "${savedName}": ${savedRate != null ? '₹' + savedRate : 'None'} -> ${current.rate != null ? '₹' + current.rate : 'None'}`
        );
      }
    }
  }

  return {
    hasDifferences: differences.length > 0,
    differences,
  };
}

/**
 * Converts current invoice line items into a modernized ClientService list.
 * Preserves existing billing frequencies and adSpend where names match.
 */
export function convertInvoiceItemsToClientServices(
  invoiceItems: InvoiceLineItem[],
  existingClientServices: ClientService[] = []
): ClientService[] {
  const existingMap = new Map<string, ClientService>();
  for (const cs of existingClientServices) {
    existingMap.set(cs.name.trim().toLowerCase(), cs);
  }

  return invoiceItems
    .filter((item) => item.description?.trim() || item.rate > 0)
    .map((item, index) => {
      const fullDesc = item.description.trim();
      const firstLine = fullDesc.split('\n')[0].trim();
      const remainingDesc = fullDesc.includes('\n')
        ? fullDesc.substring(fullDesc.indexOf('\n') + 1).trim()
        : '';

      const matchedExisting = existingMap.get(firstLine.toLowerCase());

      return {
        id: matchedExisting ? matchedExisting.id : `cs-${Date.now()}-${index + 1}`,
        name: firstLine || 'Custom Service',
        description: remainingDesc || matchedExisting?.description || '',
        quantity: Math.max(1, Number(item.quantity) || 1),
        rate: item.rate != null && item.rate > 0 ? Number(item.rate) : (matchedExisting?.rate ?? null),
        billingFrequency: matchedExisting ? matchedExisting.billingFrequency : 'Monthly',
        adSpend: matchedExisting?.adSpend ?? null,
      };
    });
}

