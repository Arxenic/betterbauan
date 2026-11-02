export type FdpFormDescription = {
  slug: string;
  label: string;
  cadence: 'annual' | 'quarterly';
  what: string;
};

/**
 * What each of the 14 statutory forms actually contains, in plain language.
 * Ordered the way a reader would want them: the money first, then operations.
 */
export const FDP_FORM_NOTES: FdpFormDescription[] = [
  {
    slug: 'statement-of-receipts-and-expenditures',
    label: 'Statement of Receipts and Expenditures',
    cadence: 'quarterly',
    what: 'Income and spending by line item, with the General Fund and the Special Education Fund kept separate. The single most useful document on the portal.',
  },
  {
    slug: 'annual-budget-report',
    label: 'Annual Budget Report',
    cadence: 'annual',
    what: "The year's enacted budget: appropriations by office and programme, and where the money is expected to come from.",
  },
  {
    slug: 'nta-20-percent-utilization',
    label: '20% of the National Tax Allotment Utilization',
    cadence: 'quarterly',
    what: 'How the 20% share of the National Tax Allotment was used — the portion reserved for local development projects.',
  },
  {
    slug: 'statement-of-indebtedness',
    label: 'Statement of Indebtedness, Payments and Balances',
    cadence: 'quarterly',
    what: 'Loans and other obligations: what was borrowed, what was paid, and what is still owed.',
  },
  {
    slug: 'quarterly-statement-of-cash-flow',
    label: 'Quarterly Statement of Cash Flow',
    cadence: 'quarterly',
    what: 'Cash in, cash out, and the balance at the end of the period.',
  },
  {
    slug: 'trust-fund-utilization',
    label: 'Trust Fund Utilization',
    cadence: 'quarterly',
    what: 'Money held in trust rather than owned, and how it was spent.',
  },
  {
    slug: 'sef-utilization',
    label: 'Report of Special Education Fund Utilization',
    cadence: 'quarterly',
    what: "The school board's share of real property tax, and what it paid for.",
  },
  {
    slug: 'ldrrmf-utilization',
    label: 'Local Disaster Risk Reduction and Management Fund Utilization',
    cadence: 'quarterly',
    what: 'Spending from the 5% disaster fund — preparedness, response and relief.',
  },
  {
    slug: 'bid-results',
    label: 'Bid Results on Civil Works, Goods and Services, and Consulting Services',
    cadence: 'quarterly',
    what: 'Who won each procurement, at what price, and how many bidders competed.',
  },
  {
    slug: 'annual-procurement-plan',
    label: 'Annual Procurement Plan',
    cadence: 'annual',
    what: 'Everything the LGU intends to buy or build in the year, with quantities and estimated costs.',
  },
  {
    slug: 'supplemental-procurement-plan',
    label: 'Supplemental Procurement Plan',
    cadence: 'annual',
    what: 'Additions and revisions to the annual procurement plan.',
  },
  {
    slug: 'manpower-complement',
    label: 'Manpower Complement',
    cadence: 'quarterly',
    what: "The LGU's staffing: positions authorised, filled and vacant.",
  },
  {
    slug: 'gad-accomplishment-report',
    label: 'Annual Gender and Development Accomplishment Report',
    cadence: 'annual',
    what: 'What the LGU spent on gender and development programmes, and what those programmes delivered.',
  },
  {
    slug: 'unliquidated-cash-advances',
    label: 'Unliquidated Cash Advances',
    cadence: 'quarterly',
    what: 'Advances released but not yet settled, and who is accountable for them.',
  },
];
