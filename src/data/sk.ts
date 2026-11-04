/**
 * The Sangguniang Kabataan, as far as the public record goes.
 *
 * The federation president is published by the LGU. The 10% fund rule is
 * statutory (RA 10742, the SK Reform Act). Barangay-level SK budgets, annual
 * youth investment plans and project lists are not published in a form this
 * project can read, so they are named as a gap rather than filled in.
 */
export const SK = {
  councils: 40,
  term: '2025–2028',
  federationPresident: 'Jenisse Jade A. Aguilera',
  federationRole: 'SK Federation President',
  fundRule: '10% of the barangay general fund',
  statutes: 'Republic Act No. 10742 (SK Reform Act of 2015)',
  law: 'https://lawphil.net/statutes/repacts/ra2016/ra_10742_2016.html',
  missing: [
    'Barangay SK annual budgets',
    'Annual Barangay Youth Investment Plans (ABYIP)',
    'SK project lists and completion reports',
    'SK fund utilisation reports',
  ],
} as const;
