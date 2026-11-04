import type { EvidenceTier } from './evidence';

export type SourceStatus = 'used' | 'pending' | 'unavailable';

export type Source = {
  id: string;
  name: string;
  publisher: string;
  url?: string;
  tier: EvidenceTier;
  /** What this source is allowed to support on this site. */
  supports: string;
  status: SourceStatus;
  note?: string;
};

/**
 * Every source this project reads, or intends to read. If a figure appears on the
 * site and does not trace back to an entry here, one of the two is wrong.
 */
export const SOURCES: Source[] = [
  {
    id: 'psa-openstat',
    name: 'OpenSTAT — 2024 Census of Population',
    publisher: 'Philippine Statistics Authority',
    url: 'https://openstat.psa.gov.ph',
    tier: 'A',
    supports:
      'Population, household population, households, land area, density — municipality and all 40 barangays.',
    status: 'used',
    note: 'Read from PSA’s PxWeb API. Barangay figures reconcile to the municipal total exactly.',
  },
  {
    id: 'dilg-fdp',
    name: 'Full Disclosure Policy Portal',
    publisher: 'Department of the Interior and Local Government',
    url: 'https://fdpp.dilg.gov.ph',
    tier: 'A',
    supports:
      'The 14 statutory financial and operational filings — budgets, receipts and expenditures, procurement, disaster funds, SEF, indebtedness.',
    status: 'used',
    note: 'Documents are published as spreadsheets. This site indexes them and links directly to each filing.',
  },
  {
    id: 'dpwh-api',
    name: 'DPWH contract records (BetterGov mirror)',
    publisher: 'Department of Public Works and Highways',
    url: 'https://api.dpwh.bettergov.ph/projects',
    tier: 'A',
    supports: 'National infrastructure contracts located in Bauan: description, cost, contractor, dates, status.',
    status: 'used',
    note: 'Every contract is published by DPWH; BetterGov mirrors that publication as an open API. Records are filtered to Bauan by name and coordinate, mislocated records are flagged rather than trusted, and contracts that also name another LGU are marked as shared because their amount is not Bauan-only.',
  },
  {
    id: 'philippines-json-maps',
    name: 'Philippine administrative boundaries',
    publisher: 'Community mirror of PSA / NAMRIA boundary shapefiles',
    url: 'https://github.com/faeldon/philippines-json-maps',
    tier: 'C',
    supports: 'Country, provincial and barangay outlines used by the 3D location map.',
    status: 'used',
    note: 'Simplified for rendering. Used for orientation only — no area, distance or boundary is measured from it.',
  },
  {
    id: 'coa-aar',
    name: 'Annual Audit Report — Municipality of Bauan',
    publisher: 'Commission on Audit',
    url: 'https://www.coa.gov.ph',
    tier: 'B',
    supports: 'Audited financial statements; the independent check on self-reported fiscal figures.',
    status: 'pending',
    note: 'Not yet retrieved. COA’s site blocks automated requests, so the report must be downloaded and referenced manually.',
  },
  {
    id: 'comelec-proclamation',
    name: '2025 Certificate of Canvass and Proclamation',
    publisher: 'Commission on Elections',
    tier: 'B',
    supports: 'The names and vote counts of elected officials, and the proclamation date.',
    status: 'pending',
    note: 'Not yet retrieved. The roster on /government is published from the LGU’s own announcements as tier C and labelled “reported”. Vote counts are withheld until this record is in hand.',
  },
  {
    id: 'lgu-bauan',
    name: 'Municipality of Bauan — news, history and anniversary pages',
    publisher: 'Municipality of Bauan',
    url: 'https://bauan.gov.ph',
    tier: 'C',
    supports:
      'The 2025–2028 roster as announced by the LGU, the mayoral succession since 1998, the founding-anniversary theme and the Sublian Festival dates.',
    status: 'used',
    note: 'The server timed out when fetched directly on 4 November 2026; the passages used were read from the LGU pages as indexed on that date. Quoted and dated, never used for a fiscal figure.',
  },
  {
    id: 'subli-mirano',
    name: 'Subli: On the Use of Multidisciplinary Methods in Musicology',
    publisher: 'Bienvenido L. Mirano · Diagonal, University of California, Riverside',
    url: 'https://cilam.ucr.edu/diagonal/issues/2008/Mirano2.pdf',
    tier: 'D',
    supports:
      'Narrative account of the subli, the Holy Cross of Bauan and the Alitagtag discovery story.',
    status: 'used',
    note: 'Secondary scholarship. Used for narrative and leads only; no figure on this site cites it.',
  },
  {
    id: 'psa-sae',
    name: 'Municipal Small Area Estimates — poverty incidence',
    publisher: 'Philippine Statistics Authority',
    tier: 'B',
    supports: 'Municipal poverty incidence, as officially released.',
    status: 'pending',
    note: 'Municipal estimates are published only as documents, not through OpenSTAT. Not yet retrieved.',
  },
  {
    id: 'lgu-website',
    name: 'Official municipal website',
    publisher: 'Municipality of Bauan',
    url: 'https://bauan.gov.ph',
    tier: 'C',
    supports: 'Official announcements and documents, when reachable.',
    status: 'unavailable',
    note: 'The domain resolves but did not respond on the research date. Nothing here is cited to it.',
  },
  {
    id: 'wikipedia',
    name: 'Wikipedia — Bauan',
    publisher: 'Wikimedia community',
    url: 'https://en.wikipedia.org/wiki/Bauan',
    tier: 'D',
    supports: 'Leads only. Historical narrative, and pointers to primary sources.',
    status: 'used',
    note: 'Used to find primary sources, never as the citation for a figure. Its barangay table was found to disagree with PSA’s 2024 release.',
  },
];

export const sourceById = (id: string): Source => {
  const source = SOURCES.find((entry) => entry.id === id);
  if (!source) throw new Error(`Unknown source: ${id}`);
  return source;
};
