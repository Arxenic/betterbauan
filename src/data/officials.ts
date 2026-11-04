/**
 * Bauan's elective officials, 2025–2028.
 *
 * Sourced from the LGU's own announcements and the 2025 returns, labelled tier C
 * on the page. Vote counts are deliberately not stored: the COMELEC proclamation
 * scan has not been obtained, so a count here would look more verified than it is.
 */
export type Official = {
  name: string;
  role: string;
  note?: string;
  current?: boolean;
};

export const MAYOR = {
  name: 'Wendah Katrina Rivera Dolor',
  shortName: 'Wendah Dolor',
  role: 'Municipal Mayor',
  term: '2025–2028',
  since: '30 June 2025',
  note: 'The first woman elected mayor of Bauan.',
  party: 'Nacionalista',
} as const;

export const VICE_MAYOR = {
  name: 'Ronald Evangelista Cruzat',
  role: 'Vice Mayor',
  party: 'Nacionalista',
} as const;

export const COUNCILORS: Official[] = [
  { name: 'Hero Dolor', role: 'Councilor' },
  { name: 'Neil Valdez', role: 'Councilor' },
  { name: 'Guenn Abante', role: 'Councilor' },
  { name: 'Romel Basilan', role: 'Councilor' },
  { name: 'Jem Garcia', role: 'Councilor' },
  { name: 'Josephine Gimeno', role: 'Councilor' },
  { name: 'Michael Endaya', role: 'Councilor' },
  { name: 'Marjorie Jelly Adel', role: 'Councilor' },
];

export const EX_OFFICIO = [
  { name: 'Tony Caguete', role: 'ABC President' },
  { name: 'Jenisse Jade Aguilera', role: 'SK Federation President' },
];

/**
 * The succession, as the LGU's own history page tells it. Years are the terms
 * of office; the 2018–2019 line is a succession, not an election.
 */
export type MayoralTerm = {
  name: string;
  from: number;
  to: number;
  label: string;
  note: string;
  current?: boolean;
};

export const MAYORS: MayoralTerm[] = [
  {
    name: 'Wendah Katrina Rivera Dolor',
    from: 2025,
    to: 2028,
    label: '2025–2028',
    note: 'Elected in May 2025; the first woman to hold the post. Took over from Ryanh Dolor on 30 June 2025.',
    current: true,
  },
  {
    name: 'Ryanh M. Dolor',
    from: 2019,
    to: 2025,
    label: '2019–2025',
    note: 'Returned to the mayoralty in 2019 and served until the 2025 turnover. Also served 2007–2016, succeeding his father.',
  },
  {
    name: 'Julian “Bojie” C. Casapao',
    from: 2018,
    to: 2019,
    label: '2018–2019',
    note: 'Vice mayor who finished the unexpired term after Herminigildo Dolor died in office on 28 June 2018.',
  },
  {
    name: 'Herminigildo “Hermie” J. Dolor',
    from: 2016,
    to: 2018,
    label: '2016–2018',
    note: 'Returned to the post in 2016; died in office. Bauan received its first Seal of Good Local Governance under him.',
  },
  {
    name: 'Ryanh M. Dolor',
    from: 2007,
    to: 2016,
    label: '2007–2016',
    note: 'First elected at 27, succeeding his father; served three consecutive terms.',
  },
  {
    name: 'Herminigildo “Hermie” J. Dolor',
    from: 1998,
    to: 2007,
    label: '1998–2007',
    note: 'Won the mayoralty in 1998, the 246th local chief executive since 1653. The LGU counts later terms separately above.',
  },
];

export const MAYOR_SOURCE = {
  label: 'COMELEC 2025 returns, via Rappler',
  href: 'https://ph.rappler.com/elections/2025/local-race/batangas/bauan',
  lgu: 'https://bauan.gov.ph/oathtaking-of-elected-officials-turnover-ceremonies/',
  history: 'https://bauan.gov.ph/history/',
} as const;
