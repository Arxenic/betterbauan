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
| `/` | The magazine cover: tagline, figures, contents and the 3D municipal mark | PSA, DILG, DPWH |
| `/map` | A three-level 3D map: the Philippines, Batangas, then 40 barangays grown to their own statistics, with contract pins and a year scrubber | PSA, DPWH, PSA/NAMRIA boundaries |
| `/barangays` | Population and households for all 40 barangays, reconciled to the municipal total | PSA OpenSTAT, 2024 POPCEN |
| `/culture` | Sublian, the Holy Cross, the feast days and the town's three relocations | LGU history, festival programmes |
| `/government` | The 2025–2028 mayor and council (tier C), mayors since 1998, and the municipal profile | LGU announcements, PSA |
| `/finances` | Statutory filings by year and form, with the completeness of each year | DILG Full Disclosure Policy Portal |
| `/documents` | All 156 filings, by form and period | DILG Full Disclosure Policy Portal |
| `/projects` | 132 DPWH contracts, 2016–2026: cost, contractor, status | DPWH via BetterGov's open API |
| `/sources` | Every record, its evidence tier, and what is still missing | — |

Deliberately **not** published yet: municipal poverty incidence, the LGU's income class, the ordinance
index, and the vote counts behind the 2025–2028 officials. Each requires a primary record this project does
not have; the officials themselves are published as a clearly labelled tier C roster. The
[sources page](https://betterbauan.vercel.app/sources) says exactly what would unblock each one.

## How verification works

Every figure must clear three gates:

1. **Provenance.** It comes from a tier A or B record — a machine-readable table published by the agency
   that produces it, or a primary document read by a person. Encyclopaedias and news reports are leads,
   never citations. A tier C roster (the officials, for now) is labelled as reported and carries no
   derived numbers.
2. **Reconciliation.** The dataset must agree with itself. The build fails if the 40 barangay populations
   do not sum to the municipal total, and DPWH records whose coordinates fall outside a barangay polygon
   are left off the map and counted in the disclosure rather than nudged into place.
3. **Withdrawal first.** A disputed figure is removed before it is re-checked. Reinstatement needs the same
   evidence as first publication.

The full policy, including the correction process and FOI routes, is in
[`docs/verification.md`](docs/verification.md). Research notes — endpoint behaviour, discrepancies, spelling
variants — are in [`docs/research-bauan.md`](docs/research-bauan.md).

## Stack

- [Astro](https://astro.build) — static output, no server, no database, no client-side data fetching
- [Tailwind CSS 4](https://tailwindcss.com) via the Vite plugin
- [three.js](https://threejs.org) for the 3D map and the procedural municipal mark, bundled locally
- Node scripts that read public APIs and write committed JSON

The site has no analytics, no cookies and no backend. Every figure is in the HTML at build time.

### Nothing is fetched while you read

This is a hard constraint, not a preference:

- **Fonts** are self-hosted from npm (`@fontsource-variable/archivo`, `@fontsource/archivo-black`, `@fontsource-variable/newsreader`, `@fontsource-variable/public-sans`).
  There is no Google Fonts request and no font CDN.
- **Map geometry** is committed as `src/data/generated/map.json`. The page never calls a tile server, a
  geocoder or a basemap API. `scripts/build-map.mjs --download` fetches the raw boundaries only when a
  maintainer runs it, and the output is reviewed and committed.
- **Charts** are server-rendered CSS. No chart library loads in the browser.
- **No analytics, no tag manager, no third-party script of any kind.**
- The only outbound requests are the data-refresh scripts, run by a person, from a terminal.

That means no API keys exist in this repository, and none are needed to run or deploy it. If a future
feature needs a cloud service, it does not belong in this build.

```
src/
  data/generated/   committed datasets (psa.json, fdp.json, dpwh.json, map.json)
  data/             evidence tiers, source register, form descriptions
  pages/            one file per route
  components/       small presentational pieces, including the charts
  lib/map3d.ts      the three.js scene
  styles/           the design tokens and shared classes
scripts/
  fetch-psa.mjs     PSA OpenSTAT PxWeb API
  fetch-fdp.mjs     DILG Full Disclosure portal (HTML index)
  fetch-dpwh.mjs    DPWH contract API (BetterGov mirror)
  build-map.mjs     boundaries + contract pins -> map.json
  lib/fdp-client.mjs
docs/               verification policy, research notes, design notes
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
npm run data:map      # needs data/geo/raw/, or pass --download
# or all four
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
