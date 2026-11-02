/**
 * PSA OpenSTAT — population, households, land area and density for one LGU.
 *
 * PSA's public website sits behind a bot challenge, but PSA's own statistical
 * database (OpenSTAT, a PxWeb instance) answers as data. This reads that.
 *
 * Hard gate: the barangay figures must sum to the municipal total in PSA's own
 * release. If they do not, the run fails — a build that cannot reconcile its
 * parts is a build that has misread the table.
 */
import { mkdir, writeFile } from 'node:fs/promises';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

const ROOT = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const OUT_PATH = resolve(ROOT, 'src/data/generated/psa.json');

const API = 'https://openstat.psa.gov.ph/PXWeb/api/v1/en/DB/1A';
const TABLE_2024 = `${API}/PO_2024/0041A6DTPH3.px`;
const TABLE_SERIES = `${API}/PO_2024/0221A6DLPD0.px`;

const MUNICIPALITY_PSGC = '0401006000';

/**
 * Bauan's 40 barangay PSGC suffixes. Note the real, non-contiguous sequence:
 * 017, 027, 040 and 043 are unassigned, which is why there are 40 and not 44.
 */
const BARANGAY_SUFFIXES = [
  1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12, 13, 14, 15, 16, 18, 19, 20, 21, 22, 23, 24, 25, 26, 28, 29,
  30, 31, 32, 33, 34, 35, 36, 37, 38, 39, 41, 42, 44,
];

const BARANGAY_PSGC = BARANGAY_SUFFIXES.map((n) => `04010060${String(n).padStart(2, '0')}`);

const USER_AGENT =
  'BetterBauan/0.1 (civic transparency project; +https://github.com/Arxenic/betterbauan)';

/** @param {string} table @param {string[]} geoCodes @returns {Promise<string[][]>} */
async function queryCsv(table, geoCodes) {
  const response = await fetch(table, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', 'User-Agent': USER_AGENT },
    signal: AbortSignal.timeout(90_000),
    body: JSON.stringify({
      query: [
        { code: 'Geographic Location', selection: { filter: 'item', values: geoCodes } },
        { code: 'Parameter', selection: { filter: 'all', values: ['*'] } },
      ],
      response: { format: 'csv' },
    }),
  });

  if (!response.ok) throw new Error(`${table} -> HTTP ${response.status}`);
  return parseCsv(await response.text());
}

/** PxWeb quotes labels and leaves numbers bare. */
function parseCsv(/** @type {string} */ text) {
  return text
    .trim()
    .split(/\r?\n/)
    .map((line) => {
      /** @type {string[]} */
      const cells = [];
      let cell = '';
      let quoted = false;
      for (const char of line) {
        if (char === '"') quoted = !quoted;
        else if (char === ',' && !quoted) {
          cells.push(cell);
          cell = '';
        } else cell += char;
      }
      cells.push(cell);
      return cells;
    });
}

/** PxWeb indents the hierarchy with dots: 6 for a municipality, 8 for a barangay. */
const depth = (/** @type {string} */ label) => label.match(/^\.*/)?.[0].length ?? 0;
const cleanName = (/** @type {string} */ label) => label.replace(/^\.+/, '').trim();

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

  const census = await queryCsv(TABLE_2024, [MUNICIPALITY_PSGC, ...BARANGAY_PSGC]);
  const [, ...censusRows] = census;

  const municipalityRow = censusRows.find((row) => depth(row[0]) === 6);
  const barangayRows = censusRows.filter((row) => depth(row[0]) === 8);
  if (!municipalityRow) throw new Error('municipality row not found in the 2024 census response');
  if (barangayRows.length !== BARANGAY_PSGC.length) {
    throw new Error(`expected ${BARANGAY_PSGC.length} barangays, received ${barangayRows.length}`);
  }

  const barangays = barangayRows.map((row, index) => ({
    psgc: BARANGAY_PSGC[index],
    name: cleanName(row[0]),
    population: Number(row[1]),
    householdPopulation: Number(row[2]),
    households: Number(row[3]),
  }));

  const municipality = {
    psgc: MUNICIPALITY_PSGC,
    name: cleanName(municipalityRow[0]),
    population: Number(municipalityRow[1]),
    householdPopulation: Number(municipalityRow[2]),
    households: Number(municipalityRow[3]),
  };

  const sumPopulation = barangays.reduce((total, b) => total + b.population, 0);
  const sumHouseholds = barangays.reduce((total, b) => total + b.households, 0);
  if (sumPopulation !== municipality.population) {
    throw new Error(`barangay population ${sumPopulation} != municipal ${municipality.population}`);
  }
  if (sumHouseholds !== municipality.households) {
    throw new Error(`barangay households ${sumHouseholds} != municipal ${municipality.households}`);
  }

  const series = await queryCsv(TABLE_SERIES, [MUNICIPALITY_PSGC]);
  const [seriesHeader, seriesRow] = series;
  const column = (/** @type {RegExp} */ pattern) => {
    const index = seriesHeader.findIndex((header) => pattern.test(header));
    if (index === -1) throw new Error(`column ${pattern} missing from the series table`);
    return seriesRow[index];
  };

  await mkdir(dirname(OUT_PATH), { recursive: true });
  await writeFile(
    OUT_PATH,
    `${JSON.stringify(
      sortKeys({
        schemaVersion: '1.0.0',
        source: {
          name: 'PSA OpenSTAT — 2024 Census of Population',
          publisher: 'Philippine Statistics Authority',
          api: API,
          tables: { census2024: TABLE_2024, series: TABLE_SERIES },
        },
        retrievedAt,
        municipality: {
          ...municipality,
          landAreaKm2: Number(column(/Land Area/)),
          density2024: Number(column(/2024 Population Density/)),
        },
        series: [
          { census: '2015 POPCEN', population: Number(column(/2015 Population$/)) },
          { census: '2020 CPH', population: Number(column(/2020 Population$/)) },
          { census: '2024 POPCEN', population: Number(column(/2024 Population$/)) },
        ],
        barangays,
      }),
      null,
      2
    )}\n`,
    'utf8'
  );

  console.log(`PSA: ${municipality.name} — ${municipality.population.toLocaleString()} people, ${municipality.households.toLocaleString()} households`);
  console.log(`PSA: ${barangays.length} barangays, reconciled exactly`);
}

main().catch((error) => {
  console.error(`PSA fetch failed: ${error.message}`);
  process.exitCode = 1;
});
