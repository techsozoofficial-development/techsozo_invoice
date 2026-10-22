import { describe, it, expect } from 'vitest';
import { getServiceSuggestions } from '../utils/serviceSuggestions';
import {
  detectClientServiceDifferences,
  convertInvoiceItemsToClientServices,
} from '../utils/serviceDiff';
import { ClientService, InvoiceLineItem, ServiceItem } from '../types';

describe('Client Service Synchronization & Autocomplete Tests', () => {
  const mockCatalogServices: ServiceItem[] = [
    {
      id: 'srv-1',
      name: 'SEO Strategy & Optimization',
      description: 'Monthly technical SEO and keyword ranking.',
      defaultRate: 25000,
      active: true,
      createdAt: '2026-08-01T00:00:00Z',
    },
    {
      id: 'srv-2',
      name: 'Social Media Management',
      description: 'Monthly social media posting and creatives.',
      defaultRate: 35000,
      active: true,
      createdAt: '2026-08-01T00:00:00Z',
    },
  ];

  const mockClientServices: ClientService[] = [
    {
      id: 'cs-1',
      name: 'Social Media Management',
      description: 'Custom negotiated social media scope.',
      quantity: 1,
      rate: 30000,
      billingFrequency: 'Monthly',
    },
    {
      id: 'cs-2',
      name: 'Poster Design Package',
      description: '4 flyers per month.',
      quantity: 4,
      rate: 1500,
      billingFrequency: 'Monthly',
    },
  ];

  describe('Service Autocomplete Suggestions', () => {
    it('aggregates suggestions from client presets, catalog, and agency templates', () => {
      const suggestions = getServiceSuggestions('', mockCatalogServices, mockClientServices);
      expect(suggestions.length).toBeGreaterThan(0);
      // Client presets appear first
      expect(suggestions[0].source).toBe('client');
      expect(suggestions[0].name).toBe('Social Media Management');
    });

    it('filters suggestions correctly according to search query', () => {
      const suggestions = getServiceSuggestions('poster', mockCatalogServices, mockClientServices);
      expect(suggestions.some((s) => s.name.toLowerCase().includes('poster'))).toBe(true);
    });

    it('deduplicates services with same normalized name', () => {
      const suggestions = getServiceSuggestions('social media', mockCatalogServices, mockClientServices);
      const socialMediaOccurrences = suggestions.filter(
        (s) => s.name.trim().toLowerCase() === 'social media management'
      );
      expect(socialMediaOccurrences.length).toBe(1);
    });
  });

  describe('Client Service Differences Detection', () => {
    it('detects no differences when invoice items match client defaults', () => {
      const invoiceItems: InvoiceLineItem[] = [
        {
          id: 'item-1',
          description: 'Social Media Management\nCustom negotiated social media scope.',
          quantity: 1,
          rate: 30000,
          amount: 30000,
        },
        {
          id: 'item-2',
          description: 'Poster Design Package\n4 flyers per month.',
          quantity: 4,
          rate: 1500,
          amount: 6000,
        },
      ];

      const diff = detectClientServiceDifferences(mockClientServices, invoiceItems);
      expect(diff.hasDifferences).toBe(false);
      expect(diff.differences.length).toBe(0);
    });

    it('detects rate modifications', () => {
      const invoiceItems: InvoiceLineItem[] = [
        {
          id: 'item-1',
          description: 'Social Media Management',
          quantity: 1,
          rate: 35000, // changed from 30000
          amount: 35000,
        },
        {
          id: 'item-2',
          description: 'Poster Design Package',
          quantity: 4,
          rate: 1500,
          amount: 6000,
        },
      ];

      const diff = detectClientServiceDifferences(mockClientServices, invoiceItems);
      expect(diff.hasDifferences).toBe(true);
      expect(diff.differences.some((d) => d.includes('Changed rate'))).toBe(true);
    });

    it('detects added and removed services', () => {
      // Adding Reels Creation (5000), removing Poster Design
      const invoiceItems: InvoiceLineItem[] = [
        {
          id: 'item-1',
          description: 'Social Media Management',
          quantity: 1,
          rate: 30000,
          amount: 30000,
        },
        {
          id: 'item-3',
          description: 'Reels Creation',
          quantity: 2,
          rate: 5000,
          amount: 10000,
        },
      ];

      const diff = detectClientServiceDifferences(mockClientServices, invoiceItems);
      expect(diff.hasDifferences).toBe(true);
      expect(diff.differences.length).toBeGreaterThan(0);
    });
  });

  describe('Invoice to Client Services Conversion', () => {
    it('converts invoice items and preserves matching billing frequency and adSpend', () => {
      const clientWithAdSpend: ClientService[] = [
        {
          id: 'cs-ads',
          name: 'Meta & Google Ads Campaign Management',
          description: 'Weekly ad management',
          quantity: 1,
          rate: 20000,
          billingFrequency: 'Monthly',
          adSpend: 35000,
        },
        {
          id: 'cs-retainer-item',
          name: 'Social Media Management',
          description: 'Package included',
          quantity: 1,
          rate: null, // optional rate
          billingFrequency: 'Monthly',
        },
      ];

      const invoiceItems: InvoiceLineItem[] = [
        {
          id: 'item-1',
          description: 'Meta & Google Ads Campaign Management',
          quantity: 1,
          rate: 25000,
          amount: 25000,
        },
      ];

      const converted = convertInvoiceItemsToClientServices(invoiceItems, clientWithAdSpend);
      expect(converted.length).toBe(1);
      expect(converted[0].name).toBe('Meta & Google Ads Campaign Management');
      expect(converted[0].rate).toBe(25000);
      expect(converted[0].adSpend).toBe(35000); // Platform ad spend is preserved
    });

    it('supports services with optional (null) rates without throwing errors', () => {
      const mockWithNullRates: ClientService[] = [
        {
          id: 'cs-null-1',
          name: 'Social Media Organic Posts',
          description: 'Deliverables included under monthly package fee',
          quantity: 1,
          rate: null,
          billingFrequency: 'Monthly',
        },
      ];

      const invoiceItems: InvoiceLineItem[] = [
        {
          id: 'item-null-1',
          description: 'Social Media Organic Posts',
          quantity: 1,
          rate: 0,
          amount: 0,
        },
      ];

      const diff = detectClientServiceDifferences(mockWithNullRates, invoiceItems);
      // Both represent unpriced/package deliverables, no rate diff error
      expect(diff.hasDifferences).toBe(false);
    });
  });
});

