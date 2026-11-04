export const SITE = {
  name: 'BetterBauan',
  wordmarkFirst: 'Better',
  wordmarkSecond: 'Bauan',
  lgu: 'Bauan',
  province: 'Batangas',
  region: 'Region IV-A (CALABARZON)',
  tagline: 'Public records for the Municipality of Bauan, Batangas.',
  description:
    'An independent, volunteer-run portal for the Municipality of Bauan, Batangas: population, barangays, public finances, documents and infrastructure contracts, each traced to the agency that published it.',
  repo: 'https://github.com/Arxenic/betterbauan',
  issues: 'https://github.com/Arxenic/betterbauan/issues',
  directory: 'https://github.com/jmacj/better-lgu-directory',
  municipalityPsgc: '0401006000',
  zip: '4201',
  areaCode: '+63 43',
  founded: '3 May 1596',
  officialSite: 'https://bauan.gov.ph',
} as const;

export const NAV = [
  { href: '/map', label: 'Map' },
  { href: '/government', label: 'Government' },
  { href: '/barangays', label: 'Barangays' },
  { href: '/finances', label: 'Finances' },
  { href: '/projects', label: 'Projects' },
  { href: '/documents', label: 'Documents' },
  { href: '/about', label: 'About' },
] as const;
