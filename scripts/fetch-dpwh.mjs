/**
 * DPWH infrastructure contracts located in Bauan.
 *
 * DPWH publishes every contract it lets. BetterGov mirrors that publication as
 * an open API, which is what this reads. Nothing is estimated: every value is
 * the record's own.
 *
 * A free-text search for the place name is not a location filter, so two gates
 * are applied and recorded:
 *
 *  1. NAME — the description must contain "BAUAN" as a whole word. This is what
 *     keeps Bauang, La Union out, since `\bBAUAN\b` does not match "BAUANG".
 *  2. COORDINATES — the record's own latitude/longitude must fall inside Bauan's
 *     bounding box. Records that fail this are kept (they name Bauan and are
 *     genuine projects) but flagged, so the site can withhold the map pin instead
 *     of plotting a road 100 km away.
 */
import { mkdir, writeFile } from 'node:fs/promises';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

const ROOT = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const OUT_PATH = resolve(ROOT, 'src/data/generated/dpwh.json');

const API = 'https://api.dpwh.bettergov.ph/projects';
const QUERY = 'Bauan, Batangas';

const USER_AGENT =
  'BetterBauan/0.1 (civic transparency project; +https://github.com/Arxenic/betterbauan)';

/** Approximate bounding box of the Municipality of Bauan, Batangas. */
const BOUNDS = { minLat: 13.68, maxLat: 13.9, minLon: 120.85, maxLon: 121.1 };

const NAME_PATTERN = /\bBAUAN\b/;
const PROVINCE_PATTERN = /BATANGAS/;

/**
 * Other local governments in Batangas. A contract whose description also names one
 * of these is a shared contract: the published amount covers more than Bauan, so
 * the full value must not be presented as spending in Bauan alone.
 */
const OTHER_LGUS = [
  'AGONCILLO',
  'ALITAGTAG',
  'BALAYAN',
  'BALETE',
  'BATANGAS CITY',
  'CALACA',
  'CALATAGAN',
  'CUENCA',
  'IBAAN',
  'LAUREL',
  'LEMERY',
  'LIAN',
  'LIPA CITY',
  'LOBO',
  'MABINI',
  'MALVAR',
  'MATAASNAKAHOY',
  'NASUGBU',
  'PADRE GARCIA',
  'ROSARIO',
  'SAN ANTONIO',
  'SAN ISIDRO',
  'SAN JOSE',
  'SAN JUAN',
  'SAN LUIS',
  'SAN NICOLAS',
  'SAN PASCUAL',
  'SANTA TERESITA',
  'SANTO TOMAS',
  'TAAL',
  'TALISAY',
  'TANAUAN',
  'TAYSAN',
  'TINGLOY',
  'TUY',
];

/** @param {string} url */
async function getJson(url, tries = 4) {
  for (let attempt = 1; ; attempt += 1) {
    try {
      const response = await fetch(url, {
        headers: { 'User-Agent': USER_AGENT, Accept: 'application/json' },
        signal: AbortSignal.timeout(60_000),
      });
      if (!response.ok) throw new Error(`${url} -> HTTP ${response.status}`);
      const body = await response.json();
      if (body.status !== 200) throw new Error(`${url} -> ${body.code ?? 'error'}`);
      return body.data;
    } catch (error) {
      if (attempt >= tries) throw error;
      await new Promise((done) => setTimeout(done, 1_500 * attempt));
    }
  }
}

/** @param {string} query */
async function searchAll(query) {
  /** @type {any[]} */
  const rows = [];
  for (let page = 1; ; page += 1) {
    const data = await getJson(`${API}?search=${encodeURIComponent(query)}&limit=100&page=${page}`);
    rows.push(...data.data);
    if (!data.pagination?.hasNext) break;
  }
  return rows;
}

const money = (/** @type {unknown} */ value) => {
  const n = typeof value === 'string' ? Number(value) : value;
  return typeof n === 'number' && Number.isFinite(n) && n > 0 ? Math.round(n * 100) / 100 : null;
};

const day = (/** @type {unknown} */ value) =>
  typeof value === 'string' && /^\d{4}-\d{2}-\d{2}/.test(value) ? value.slice(0, 10) : null;

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
  const raw = await searchAll(QUERY);

  const contracts = raw
    .filter((record) => NAME_PATTERN.test(String(record.description ?? '').toUpperCase()))
    .filter((record) => {
      const province = String(record.location?.province ?? '').toUpperCase();
      const description = String(record.description ?? '').toUpperCase();
      return PROVINCE_PATTERN.test(province) || PROVINCE_PATTERN.test(description);
    })
    .map((record) => {
      const lat = typeof record.latitude === 'number' ? record.latitude : null;
      const lon = typeof record.longitude === 'number' ? record.longitude : null;
      const coordinatesVerified =
        lat !== null &&
        lon !== null &&
        lat >= BOUNDS.minLat &&
        lat <= BOUNDS.maxLat &&
        lon >= BOUNDS.minLon &&
        lon <= BOUNDS.maxLon;

      return {
        id: String(record.contractId),
        description: String(record.description ?? '').trim(),
        category: record.category ?? null,
        status: record.status ?? null,
        budget: money(record.budget),
        contractor: record.contractor ?? null,
        year: record.infraYear ? String(record.infraYear) : null,
        startDate: day(record.startDate),
        completionDate: day(record.completionDate),
        program: record.programName ?? null,
        sourceOfFunds: record.sourceOfFunds ?? null,
        latitude: lat,
        longitude: lon,
        coordinatesVerified,
        sharedWith: OTHER_LGUS.filter((lgu) =>
          new RegExp(`\\b${lgu.replace(/ /g, '\\s+')}\\b`).test(String(record.description ?? '').toUpperCase())
        ),
      };
    })
    .sort((a, b) => (b.completionDate ?? '').localeCompare(a.completionDate ?? '') || a.id.localeCompare(b.id));

  if (contracts.length === 0) {
    throw new Error('no contracts matched — refusing to write an empty dataset over a populated one');
  }

  /** @type {Record<string, number>} */
  const byYear = {};
  /** @type {Record<string, number>} */
  const byStatus = {};
  /** @type {Record<string, number>} */
  const byCategory = {};
  let totalBudget = 0;

  for (const contract of contracts) {
    if (contract.year) byYear[contract.year] = (byYear[contract.year] ?? 0) + 1;
    if (contract.status) byStatus[contract.status] = (byStatus[contract.status] ?? 0) + 1;
    if (contract.category) byCategory[contract.category] = (byCategory[contract.category] ?? 0) + 1;
    totalBudget += contract.budget ?? 0;
  }

  await mkdir(dirname(OUT_PATH), { recursive: true });
  await writeFile(
    OUT_PATH,
    `${JSON.stringify(
      sortKeys({
        schemaVersion: '1.0.0',
        source: {
          name: 'DPWH contract records',
          publisher: 'Department of Public Works and Highways',
          api: API,
          mirror: 'BetterGov.ph',
        },
        retrievedAt,
        query: QUERY,
        gates: {
          name: 'description contains BAUAN as a whole word',
          province: 'location.province or description contains BATANGAS',
          coordinates: BOUNDS,
        },
        summary: {
          count: contracts.length,
          totalBudget: Math.round(totalBudget * 100) / 100,
          coordinatesUnverified: contracts.filter((contract) => !contract.coordinatesVerified).length,
          sharedCount: contracts.filter((contract) => contract.sharedWith.length > 0).length,
          sharedBudget:
            Math.round(
              contracts.reduce((sum, contract) => {
                return contract.sharedWith.length > 0 ? sum + (contract.budget ?? 0) : sum;
              }, 0) * 100
            ) / 100,
          byYear,
          byStatus,
          byCategory,
        },
        contracts,
      }),
      null,
      2
    )}\n`,
    'utf8'
  );

  console.log(
    `DPWH: ${contracts.length} contracts, PHP ${Math.round(totalBudget).toLocaleString()} total`
  );
  console.log(
    `DPWH: ${contracts.filter((contract) => !contract.coordinatesVerified).length} record(s) flagged for unverified coordinates`
  );
}

main().catch((error) => {
  console.error(`DPWH fetch failed: ${error.message}`);
  process.exitCode = 1;
});
