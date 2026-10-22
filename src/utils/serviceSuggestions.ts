import { ServiceItem, ClientService } from '../types';

export interface ServiceSuggestion {
  name: string;
  description: string;
  defaultRate: number;
  source: 'catalog' | 'client' | 'agency';
}

export const COMMON_AGENCY_SERVICES: Omit<ServiceSuggestion, 'source'>[] = [
  {
    name: 'Social Media Management & Strategy',
    description: 'End-to-end monthly social media calendar, creative posts, caption copywriting and community engagement.',
    defaultRate: 0,
  },
  {
    name: 'Search Engine Optimization (SEO)',
    description: 'On-page technical SEO, keyword ranking research, Google Search Console optimization and backlink outreach.',
    defaultRate: 0,
  },
  {
    name: 'Custom Web Design & Development',
    description: 'Responsive, high-performance website design with interactive UX, SEO structure and contact form integration.',
    defaultRate: 0,
  },
  {
    name: 'Meta & Google Ads Campaign Management',
    description: 'High-conversion lead generation campaigns, creative A/B testing, pixel setup and weekly ROAS optimization.',
    defaultRate: 0,
  },
  {
    name: 'Instagram Reels & Video Production',
    description: 'Short-form vertical videos, on-site filming, creative editing, trendy audio and caption animations.',
    defaultRate: 0,
  },
  {
    name: 'Branding & Corporate Identity Design',
    description: 'Vector logo design, typography guidelines, brand color system, stationery and social media brand kit.',
    defaultRate: 0,
  },
  {
    name: 'Content Writing & SEO Articles',
    description: 'In-depth industry blog posts formatted with focus keywords, meta tags and royalty-free visuals.',
    defaultRate: 0,
  },
  {
    name: 'Performance Marketing Growth Retainer',
    description: 'Omnichannel growth marketing, conversion rate optimization (CRO), multi-touch attribution and weekly reporting.',
    defaultRate: 0,
  },
  {
    name: 'Website AMC & Hosting Maintenance',
    description: '24/7 uptime monitoring, weekly security patches, automated Cloud backups, SSL management and minor content updates.',
    defaultRate: 0,
  },
  {
    name: 'Creative Graphic Design & Posters',
    description: 'Monthly bundle of marketing banners, event posters, social media creatives and print flyers.',
    defaultRate: 0,
  },
];

/**
 * Aggregates suggestions from:
 * 1. Existing Services Catalog
 * 2. Saved Client Services
 * 3. Curated Agency Services
 * De-duplicates by normalized service name.
 */
export function getServiceSuggestions(
  query: string,
  catalogServices: ServiceItem[] = [],
  clientServices: ClientService[] = []
): ServiceSuggestion[] {
  const seenNames = new Set<string>();
  const results: ServiceSuggestion[] = [];

  const addIfUnique = (suggestion: ServiceSuggestion) => {
    const key = suggestion.name.trim().toLowerCase();
    if (!key || seenNames.has(key)) return;
    seenNames.add(key);
    results.push(suggestion);
  };

  // 1. Client configured services
  for (const cs of clientServices) {
    addIfUnique({
      name: cs.name,
      description: cs.description || '',
      defaultRate: cs.rate || 0,
      source: 'client',
    });
  }

  // 2. Existing Catalog services
  for (const s of catalogServices) {
    if (s.active !== false) {
      addIfUnique({
        name: s.name,
        description: s.description || '',
        defaultRate: s.defaultRate || 0,
        source: 'catalog',
      });
    }
  }

  // 3. Common Agency services
  for (const agencySrv of COMMON_AGENCY_SERVICES) {
    addIfUnique({
      ...agencySrv,
      source: 'agency',
    });
  }

  const q = query.trim().toLowerCase();
  if (!q) {
    return results.slice(0, 8);
  }

  return results
    .filter(
      (item) =>
        item.name.toLowerCase().includes(q) ||
        item.description.toLowerCase().includes(q)
    )
    .slice(0, 8);
}
