export const SITE = {
  name: 'BetterBauan',
  wordmarkFirst: 'Better',
  wordmarkSecond: 'Bauan',
  lgu: 'Bauan',
  province: 'Batangas',
  region: 'Region IV-A (CALABARZON)',
  tagline: 'We are One in Bauan.',
  description:
    'An independent, volunteer-run portal for the Municipality of Bauan, Batangas: population, barangays, public finances, documents and infrastructure contracts, each traced to the agency that published it.',
  repo: 'https://github.com/Arxenic/betterbauan',
  issues: 'https://github.com/Arxenic/betterbauan/issues',
  directory: 'https://github.com/jmacj/better-lgu-directory',
  municipalityPsgc: '0401006000',
  zip: '4201',
  areaCode: '+63 43',
  founded: '1690',
  officialSite: 'https://bauan.gov.ph',
} as const;

export type NavItem = {
  href: string;
  label: string;
  description: string;
  external?: boolean;
};

export type NavGroup = {
  id: string;
  label: string;
  kicker: string;
  items: NavItem[];
};

/**
 * Four top-level tabs, the rest folded into the group each one belongs to.
 * Order matters: Overview, Government, Transparency, About.
 */
export const NAV_GROUPS: NavGroup[] = [
  {
    id: 'overview',
    label: 'Overview',
    kicker: 'The town',
    items: [
      { href: '/', label: 'Front page', description: 'The record as a magazine: cover, contents, figures.' },
      { href: '/map', label: 'The 3D map', description: 'Country, province, then 40 barangays grown to their numbers.' },
      { href: '/barangays', label: 'Barangays', description: 'Population and households for every one of the forty.' },
      { href: '/culture', label: 'Culture & history', description: 'Sublian, the Holy Cross, and the town that moved three times.' },
    ],
  },
  {
    id: 'government',
    label: 'Government',
    kicker: 'Who runs it',
    items: [
      { href: '/government', label: 'Mayor & council', description: 'The 2025–2028 officials, reported and labelled.' },
      { href: '/government#mayors', label: 'Mayors since 1998', description: 'The succession, including the first woman elected mayor.' },
      { href: '/government#profile', label: 'Municipal profile', description: 'PSGC, land area, population density and official channels.' },
    ],
  },
  {
    id: 'transparency',
    label: 'Transparency',
    kicker: 'Follow the money',
    items: [
      { href: '/finances', label: 'Finances', description: 'Statutory filings, by year and by form.' },
      { href: '/projects', label: 'Projects', description: 'DPWH contracts, with shared-LGU amounts separated out.' },
      { href: '/documents', label: 'Documents', description: 'The full disclosure archive, searchable by form.' },
      { href: '/sources', label: 'Sources', description: 'Every record read, and what it is allowed to support.' },
    ],
  },
  {
    id: 'about',
    label: 'About',
    kicker: 'How this is made',
    items: [
      { href: '/about', label: 'About the project', description: 'Who made this, and what it refuses to publish.' },
      { href: '/about#verification', label: 'Verification', description: 'The evidence tiers, from machine-readable record to rumour.' },
      { href: '/about#contribute', label: 'Contribute', description: 'Send a source, open an issue, or fork the repository.' },
      { href: 'https://github.com/Arxenic/betterbauan', label: 'Source code ↗', description: 'The whole site, scripts and committed datasets.', external: true },
    ],
  },
];

/** Flat list, kept for the footer and for anywhere that needs every page. */
export const NAV = NAV_GROUPS.flatMap((group) => group.items).filter(
  (item, index, list) => !item.external && list.findIndex((other) => other.href === item.href) === index
);

export const isNavItemCurrent = (path: string, href: string) => {
  if (href.startsWith('http')) return false;
  const clean = href.split('#')[0].replace(/\/$/, '') || '/';
  const here = path.replace(/\/$/, '') || '/';
  return clean === here;
};

export const isNavGroupCurrent = (path: string, group: NavGroup) =>
  group.items.some((item) => isNavItemCurrent(path, item.href));
