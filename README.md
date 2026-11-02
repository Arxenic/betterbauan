# BetterBauan

An independent, source-first transparency portal for the **Municipality of Bauan, Batangas**.

**Live:** https://betterbauan.vercel.app

Bauan's public records are public, but they are scattered across national agencies: population in PSA's
OpenSTAT, statutory financial filings in DILG's Full Disclosure portal, infrastructure contracts in DPWH's
publication. None of them is arranged around the town. This project assembles them, in public, and shows
where every figure came from.

It is not an official website. It is not affiliated with, endorsed by, or operated by the Municipality of
Bauan or any government agency.

---

## What is on the site

| Page | What it holds | Source |
| --- | --- | --- |
| `/barangays` | Population and households for all 40 barangays, reconciled to the municipal total | PSA OpenSTAT, 2024 POPCEN |
| `/finances` | Index of the 14 statutory financial forms, with direct links | DILG Full Disclosure Policy Portal |
| `/documents` | All 156 filings, by form and period | DILG Full Disclosure Policy Portal |
| `/projects` | 132 DPWH contracts, 2016–2026: cost, contractor, status | DPWH via BetterGov's open API |
| `/government` | Municipal profile; officials deliberately withheld | PSA |
| `/sources` | Every record, its evidence tier, and what is still missing | — |

Deliberately **not** published yet: elected officials, municipal poverty incidence, the LGU's income class,
and the ordinance index. Each requires a primary record this project does not have. The
[sources page](https://betterbauan.vercel.app/sources) says exactly what would unblock each one.

## How verification works

Every figure must clear three gates:

1. **Provenance.** It comes from a tier A or B record — a machine-readable table published by the agency
   that produces it, or a primary document read by a person. Encyclopaedias and news reports are leads,
   never citations.
2. **Reconciliation.** The dataset must agree with itself. The build fails if the 40 barangay populations
   do not sum to the municipal total, and DPWH records whose coordinates fall outside Bauan are flagged
   rather than plotted.
3. **Withdrawal first.** A disputed figure is removed before it is re-checked. Reinstatement needs the same
   evidence as first publication.

The full policy, including the correction process and FOI routes, is in
[`docs/verification.md`](docs/verification.md). Research notes — endpoint behaviour, discrepancies, spelling
variants — are in [`docs/research-bauan.md`](docs/research-bauan.md).

## Stack

- [Astro](https://astro.build) — static output, no server, no database, no client-side data fetching
- [Tailwind CSS 4](https://tailwindcss.com) via the Vite plugin
- Node scripts that read public APIs and write committed JSON

The site has no analytics, no cookies and no backend. Every figure is in the HTML at build time.

```
src/
  data/generated/   committed datasets (psa.json, fdp.json, dpwh.json)
  data/             evidence tiers, source register, form descriptions
  pages/            one file per route
  components/       small presentational pieces
scripts/
  fetch-psa.mjs     PSA OpenSTAT PxWeb API
  fetch-fdp.mjs     DILG Full Disclosure portal (HTML index)
  fetch-dpwh.mjs    DPWH contract API (BetterGov mirror)
  lib/fdp-client.mjs
docs/               verification policy and research notes
```

## Running it

Requires Node 20 or newer.

```bash
npm install
npm run dev        # http://localhost:4321
npm run build      # static build to dist/
npm run check      # astro check + TypeScript
```

Rebuild the datasets:

```bash
npm run data:psa
npm run data:dpwh
npm run data:fdp
# or all three
npm run data:all
```

Each script writes to `src/data/generated/` and refuses to overwrite a populated dataset with an empty one.
The FDP portal serves an incomplete TLS chain, so `scripts/lib/fdp-client.mjs` fetches the missing
intermediate certificate via the leaf's AIA extension and verifies that it actually issued the leaf. There
is no fallback to an unverified connection.

## Contributing

Corrections are more valuable than compliments. If a figure contradicts a document you hold, open an issue
with the document — a scan, a link, a page number.

- [Report an error](https://github.com/Arxenic/betterbauan/issues)
- See [`CONTRIBUTING.md`](CONTRIBUTING.md) for the data and code workflow.

## Licence

- **Code:** MIT — see [`LICENSE`](LICENSE).
- **Written content and generated datasets:** CC BY 4.0 — reuse them, credit the agency that produced the
  underlying record.

## Credits

Part of the [Better LGU directory](https://github.com/jmacj/better-lgu-directory). Built with Astro. Data
from the Philippine Statistics Authority, the Department of the Interior and Local Government, and the
Department of Public Works and Highways.
