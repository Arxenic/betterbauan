/**
 * The evidence model.
 *
 * A figure on this site is only as good as the record behind it, and the reader
 * is entitled to see which record that is. Tiers are defined in
 * `docs/verification.md`; this module is the single place they are encoded.
 */

export type EvidenceTier = 'A' | 'B' | 'C' | 'D' | 'E';

export type Evidence = {
  tier: EvidenceTier;
  /** Key into `src/data/sources.ts`. */
  sourceId: string;
  /** Table, page, paragraph or row that holds the figure. */
  locator?: string;
  /** ISO date the record was read. */
  retrievedAt?: string;
  note?: string;
};

type TierDefinition = {
  name: string;
  summary: string;
  publishesFigures: boolean;
};

export const TIERS: Record<EvidenceTier, TierDefinition> = {
  A: {
    name: 'Primary, structured',
    summary:
      'Machine-readable record published by the agency that produces it — an API table, a statutory filing. Reconciles internally.',
    publishesFigures: true,
  },
  B: {
    name: 'Primary, document',
    summary:
      'An official document a human must read — audit report, signed ordinance, proclamation. Figures are transcribed with a page reference.',
    publishesFigures: true,
  },
  C: {
    name: 'Official statement',
    summary:
      'The LGU or an agency says it in prose, with no underlying record. Quoted and dated, never used as a figure.',
    publishesFigures: false,
  },
  D: {
    name: 'Secondary',
    summary:
      'Reporting, encyclopaedias, aggregators. A lead to chase. Never a citation for a number.',
    publishesFigures: false,
  },
  E: {
    name: 'Community',
    summary:
      'Submitted by a resident and awaiting review against a primary source. Not published until promoted.',
    publishesFigures: false,
  },
};
