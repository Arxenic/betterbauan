/**
 * DILG Full Disclosure Policy Portal — the filing index for Bauan.
 *
 * DILG requires every municipality to post 14 statutory financial and
 * operational documents. The portal is the canonical index of what Bauan has
 * actually published, and each row links straight to the filing itself.
 *
 * This script reads the index only. It does not mirror the documents: the
 * portal already hosts them, and re-hosting government spreadsheets is neither
 * necessary nor ours to do.
 *
 * The portal reassigns its numeric document id when a filing is resubmitted, so
 * the stable identity used here is the filing slot — form + document period.
 */
import { mkdir, writeFile } from 'node:fs/promises';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

import { downloadUrl, get } from './lib/fdp-client.mjs';

const ROOT = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const OUT_PATH = resolve(ROOT, 'src/data/generated/fdp.json');

/**
 * Bauan on the portal: Region IV-A (04) / Batangas (010) / Bauan (06).
 * The LGU key is positional, not the PSGC — it is read off the portal's own
 * dropdown, where Bauan sits sixth in Batangas.
 */
const FILTERS = { region_filter: '04', province_filter: '010', lgu_filter: '06' };

const MAX_PAGES = 60;

const FORMS = [
  { slug: 'annual-budget-report', label: 'Annual Budget Report', cadence: 'annual', match: /^ANNUAL BUDGET REPORT/ },
  { slug: 'gad-accomplishment-report', label: 'Annual Gender and Development Accomplishment Report', cadence: 'annual', match: /^ANNUAL GENDER AND DEVELOPMENT/ },
  { slug: 'annual-procurement-plan', label: 'Annual Procurement Plan', cadence: 'annual', match: /^ANNUAL PROCUREMENT PLAN/ },
  { slug: 'supplemental-procurement-plan', label: 'Supplemental Procurement Plan', cadence: 'annual', match: /^SUPPLEMENTAL PROCUREMENT PLAN/ },
  { slug: 'statement-of-indebtedness', label: 'Statement of Indebtedness, Payments and Balances', cadence: 'quarterly', match: /^STATEMENT OF INDEBTEDNESS/ },
  { slug: 'nta-20-percent-utilization', label: '20% of the National Tax Allotment Utilization', cadence: 'quarterly', match: /^20% OF THE NATIONAL TAX ALLOTMENT/ },
  { slug: 'bid-results', label: 'Bid Results on Civil Works, Goods and Services, and Consulting Services', cadence: 'quarterly', match: /^BID RESULTS ON CIVIL WORKS/ },
  { slug: 'ldrrmf-utilization', label: 'Local Disaster Risk Reduction and Management Fund Utilization', cadence: 'quarterly', match: /^LOCAL DISASTER RISK REDUCTION/ },
  { slug: 'manpower-complement', label: 'Manpower Complement', cadence: 'quarterly', match: /^MANPOWER COMPLEMENT/ },
  { slug: 'statement-of-receipts-and-expenditures', label: 'Statement of Receipts and Expenditures', cadence: 'quarterly', match: /^STATEMENT OF RECEIPTS AND EXPENDITURES/ },
  { slug: 'trust-fund-utilization', label: 'Trust Fund Utilization', cadence: 'quarterly', match: /^TRUST FUND UTILIZATION/ },
  { slug: 'quarterly-statement-of-cash-flow', label: 'Quarterly Statement of Cash Flow', cadence: 'quarterly', match: /^QUARTERLY STATEMENT OF CASH FLOW/ },
  { slug: 'sef-utilization', label: 'Report of Special Education Fund Utilization', cadence: 'quarterly', match: /^REPORT OF SPECIAL EDUCATION FUND/ },
  { slug: 'unliquidated-cash-advances', label: 'Unliquidated Cash Advances', cadence: 'quarterly', match: /^UNLIQUIDATED CASH ADVANCES/ },
];

const decode = (/** @type {string} */ fragment) =>
  fragment
    .replace(/<br\s*\/?>/gi, ' ')
    .replace(/&nbsp;/g, ' ')
    .replace(/&amp;/g, '&')
    .replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>')
    .replace(/&quot;/g, '"')
    .replace(/&#(\d+);/g, (_, code) => String.fromCodePoint(Number(code)))
    .replace(/<[^>]+>/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();

/** "QUARTER 3 • CY 2026" and "CY 2025" both appear. */
function parsePeriod(/** @type {string} */ text) {
  const year = text.match(/CY\s*(\d{4})/i);
  if (!year) return null;
  const quarter = text.match(/QUARTER\s*([1-4])/i);
  return { year: Number(year[1]), quarter: quarter ? Number(quarter[1]) : null };
}

function classifyForm(/** @type {string} */ name) {
  const normalised = name.replace(/^[->\s]+/, '').trim().toUpperCase();
  return FORMS.find((form) => form.match.test(normalised)) ?? null;
}

/** @param {number} page */
async function listingPage(page) {
  const params = new URLSearchParams({
    ...FILTERS,
    document_filter: '',
    year_filter: '',
    quarter_filter: '',
    docperiod_filter: '',
    page: String(page),
  });
  const buffer = await get(`/fdpp/report/index?${params}`);
  // The portal is served in windows-1252.
  return new TextDecoder('windows-1252').decode(buffer);
}

/**
 * @param {string} html
 */
function parseRows(html) {
  const rows = html.match(/<tr id="row\d+"[\s\S]*?<\/tr>/g) ?? [];

  return rows.flatMap((row) => {
    const id = row.match(/<tr id="row(\d+)"/)?.[1];
    if (!id) return [];

    const formName = decode(
      row.match(/<span class="ext-dark fw-bolder mb-1 fs-7 ps-4">([\s\S]*?)<\/span>/)?.[1] ?? ''
    );
    const form = classifyForm(formName);
    if (!form) return [];

    // The remaining `ext-dark fw-bolder` spans are, in order: LGU, posting period,
    // document period, description.
    const spans = [...row.matchAll(/<span class="ext-dark fw-bolder mb-1 fs-7">([\s\S]*?)<\/span>/g)].map(
      (match) => decode(match[1])
    );
    const documentPeriod = parsePeriod(spans[2] ?? '') ?? parsePeriod(spans[1] ?? '');
    if (!documentPeriod) return [];

    return [
      {
        id,
        formSlug: form.slug,
        form: form.label,
        cadence: form.cadence,
        documentPeriod,
        postingPeriod: parsePeriod(spans[1] ?? ''),
        address: spans[3] ?? null,
        url: `https://fdpp.dilg.gov.ph${downloadUrl(id)}`,
      },
    ];
  });
}

function sortKeys(/** @type {unknown} */ value) {
  if (Array.isArray(value)) return value.map(sortKeys);
  if (value && typeof value === 'object') {
    return Object.fromEntries(
      Object.keys(value)
        .sort()
        .map((key) => [key, sortKeys(/** @type {Record<string, unknown>} */ (value)[key])])
    );
  }
  return value;
}

async function main() {
  const retrievedAt = new Date().toISOString();

  /** @type {ReturnType<typeof parseRows>} */
  const filings = [];
  const seen = new Set();

  for (let page = 1; page <= MAX_PAGES; page += 1) {
    const html = await listingPage(page);
    const rows = parseRows(html);
    if (rows.length === 0) break;

    for (const row of rows) {
      const slot = `${row.formSlug}-${row.documentPeriod.year}q${row.documentPeriod.quarter ?? 'a'}`;
      if (seen.has(slot)) continue;
      seen.add(slot);
      filings.push(row);
    }

    // The portal pads short pages; stop once a page is not full.
    const rowCount = (html.match(/<tr id="row\d+"/g) ?? []).length;
    if (rowCount < 10) break;
  }

  if (filings.length === 0) {
    throw new Error('no filings parsed — refusing to overwrite a populated dataset with nothing');
  }

  filings.sort(
    (a, b) =>
      b.documentPeriod.year - a.documentPeriod.year ||
      (b.documentPeriod.quarter ?? 0) - (a.documentPeriod.quarter ?? 0) ||
      a.form.localeCompare(b.form)
  );

  /** @type {Record<string, number>} */
  const byYear = {};
  /** @type {Record<string, number>} */
  const byForm = {};
  for (const filing of filings) {
    byYear[String(filing.documentPeriod.year)] = (byYear[String(filing.documentPeriod.year)] ?? 0) + 1;
    byForm[filing.form] = (byForm[filing.form] ?? 0) + 1;
  }

  const years = Object.keys(byYear).map(Number).sort((a, b) => a - b);

  // The portal prints the same posting address block on every filing; keep the
  // distinct variants so the site can quote the LGU's own address.
  const postingLocations = [...new Set(filings.map((filing) => filing.address).filter(Boolean))];

  // Pull the municipal hall line out of the address block the LGU prints on its
  // own filings, rather than retyping it.
  const municipalHall =
    postingLocations
      .map(
        (text) =>
          text.match(
            /Bauan Municipal Hall,\s*1st Floor,\s*F\. Mangobos St\.,\s*Poblacion I,\s*Bauan,?\s*Batangas/i
          )?.[0]
      )
      .find(Boolean) ?? null;

  await mkdir(dirname(OUT_PATH), { recursive: true });
  await writeFile(
    OUT_PATH,
    `${JSON.stringify(
      sortKeys({
        schemaVersion: '1.0.0',
        source: {
          name: 'Full Disclosure Policy Portal',
          publisher: 'Department of the Interior and Local Government',
          portal: 'https://fdpp.dilg.gov.ph',
          filters: FILTERS,
        },
        retrievedAt,
        coverage: { from: years[0] ?? null, to: years[years.length - 1] ?? null },
        posting: { municipalHall, locations: postingLocations },
        summary: { count: filings.length, byYear, byForm },
        forms: FORMS.map(({ slug, label, cadence }) => ({ slug, label, cadence })),
        filings,
      }),
      null,
      2
    )}\n`,
    'utf8'
  );

  console.log(`FDP: ${filings.length} filings, CY${years[0]}–CY${years[years.length - 1]}`);
  console.log(`FDP: ${Object.keys(byForm).length} distinct forms`);
}

main().catch((error) => {
  console.error(`FDP fetch failed: ${error.message}`);
  process.exitCode = 1;
});
