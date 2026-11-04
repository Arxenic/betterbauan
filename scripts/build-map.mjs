/**
 * Builds the geometry for the 3D map.
 *
 * Source: `philippines-json-maps` (faeldon), a community mirror of the PSA/NAMRIA
 * boundary shapefiles, published as GeoJSON per administrative level.
 *
 * The site itself never calls a network API. This script is a *manual* data
 * refresh: run `node scripts/build-map.mjs --download` to fetch the three source
 * files into `data/geo/raw/` (git-ignored), then it writes a simplified,
 * committed `src/data/generated/map.json` that the browser loads locally.
 *
 * Simplification is deliberate. These are context boundaries rendered at screen
 * size, not a cadastral survey, and the site says so where the map appears.
 */
import { existsSync, mkdirSync, readFileSync, writeFileSync } from 'node:fs';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

const ROOT = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const RAW_DIR = resolve(ROOT, 'data/geo/raw');
const OUT_PATH = resolve(ROOT, 'src/data/generated/map.json');
const PSA_PATH = resolve(ROOT, 'src/data/generated/psa.json');
const DPWH_PATH = resolve(ROOT, 'src/data/generated/dpwh.json');

const BASE = 'https://raw.githubusercontent.com/faeldon/philippines-json-maps/master/latest/geojson';

const SOURCES = {
  country: {
    file: 'country.json',
    url: `${BASE}/country/lowres/country.0.001.json`,
    tolerance: 0.02,
    minRingArea: 0.01,
  },
  province: {
    file: 'batangas.json',
    url: `${BASE}/provdists/lowres/municities-provdist-401000000.0.001.json`,
    tolerance: 0.003,
    minRingArea: 0.000001,
  },
  bauan: {
    file: 'bauan-barangays.json',
    url: `${BASE}/municities/lowres/bgysubmuns-municity-401006000.0.001.json`,
    tolerance: 0.0006,
    minRingArea: 0.0000001,
  },
};

const download = process.argv.includes('--download');

async function readSource(key) {
  const { file, url } = SOURCES[key];
  const path = resolve(RAW_DIR, file);

  if (!existsSync(path)) {
    if (!download) {
      throw new Error(`missing ${path} — run with --download to fetch the boundary source`);
    }
    mkdirSync(RAW_DIR, { recursive: true });
    const response = await fetch(url, {
      headers: {
        'user-agent': 'BetterBauan/0.1 (civic transparency project; +https://github.com/Arxenic/betterbauan)',
      },
      signal: AbortSignal.timeout(120_000),
    });
    if (!response.ok) throw new Error(`${url} -> HTTP ${response.status}`);
    writeFileSync(path, await response.text());
    console.log(`downloaded ${file}`);
  }

  return JSON.parse(readFileSync(path, 'utf8'));
}

/** Perpendicular distance from a point to the line through a and b. */
function distanceToSegment([x, y], [x1, y1], [x2, y2]) {
  const dx = x2 - x1;
  const dy = y2 - y1;
  const lengthSq = dx * dx + dy * dy;
  if (lengthSq === 0) return Math.hypot(x - x1, y - y1);
  let t = ((x - x1) * dx + (y - y1) * dy) / lengthSq;
  t = Math.max(0, Math.min(1, t));
  return Math.hypot(x - (x1 + t * dx), y - (y1 + t * dy));
}

/** Ramer–Douglas–Peucker. */
function simplify(points, tolerance) {
  if (points.length <= 4) return points;

  const first = points[0];
  const last = points[points.length - 1];
  let index = -1;
  let maxDistance = 0;

  for (let i = 1; i < points.length - 1; i += 1) {
    const distance = distanceToSegment(points[i], first, last);
    if (distance > maxDistance) {
      maxDistance = distance;
      index = i;
    }
  }

  if (maxDistance <= tolerance) return [first, last];

  const left = simplify(points.slice(0, index + 1), tolerance);
  const right = simplify(points.slice(index), tolerance);
  return [...left.slice(0, -1), ...right];
}

/** Shoelace area of a closed lon/lat ring, in square degrees. */
function ringArea(ring) {
  let sum = 0;
  for (let i = 0; i < ring.length - 1; i += 1) {
    sum += ring[i][0] * ring[i + 1][1] - ring[i + 1][0] * ring[i][1];
  }
  return Math.abs(sum / 2);
}

function round(point) {
  return [Number(point[0].toFixed(5)), Number(point[1].toFixed(5))];
}

function cleanRing(ring, tolerance, minArea) {
  const simplified = simplify(ring, tolerance).map(round);
  if (simplified.length < 4) return null;
  if (ringArea(simplified) < minArea) return null;

  // Ensure the ring is closed without duplicating a rounded point.
  const [fx, fy] = simplified[0];
  const [lx, ly] = simplified[simplified.length - 1];
  if (fx !== lx || fy !== ly) simplified.push([fx, fy]);
  return simplified;
}

function polygonsOf(geometry) {
  if (geometry.type === 'Polygon') return [geometry.coordinates];
  if (geometry.type === 'MultiPolygon') return geometry.coordinates;
  return [];
}

function cleanPolygons(geometry, tolerance, minArea) {
  const polygons = [];

  for (const polygon of polygonsOf(geometry)) {
    const rings = [];

    for (let i = 0; i < polygon.length; i += 1) {
      const cleaned = cleanRing(polygon[i], tolerance, i === 0 ? minArea : minArea / 10);
      if (cleaned) rings.push(cleaned);
    }

    // A polygon without an outer ring, or with fewer than three distinct points,
    // cannot be triangulated.
    if (rings.length > 0 && rings[0].length >= 4) polygons.push(rings);
  }

  return polygons;
}

function bboxOf(polygons) {
  let minLon = Infinity;
  let minLat = Infinity;
  let maxLon = -Infinity;
  let maxLat = -Infinity;

  for (const polygon of polygons) {
    for (const [lon, lat] of polygon[0]) {
      if (lon < minLon) minLon = lon;
      if (lon > maxLon) maxLon = lon;
      if (lat < minLat) minLat = lat;
      if (lat > maxLat) maxLat = lat;
    }
  }

  return { minLon, minLat, maxLon, maxLat };
}

/**
 * Bounding box of the parts big enough to frame the view. The country file
 * includes tiny islets far to the west; letting them set the bounds would shrink
 * the mainland to a postage stamp.
 */
function bboxOfSignificant(polygons, minArea = 0) {
  const kept = polygons.filter((polygon) => ringArea(polygon[0]) >= minArea);
  return bboxOf(kept.length > 0 ? kept : polygons);
}

/** Area-weighted centroid of the largest polygon, good enough for a camera target. */
function centroidOf(polygons) {
  let best = null;
  let bestArea = -1;

  for (const polygon of polygons) {
    const ring = polygon[0];
    let area = 0;
    let cx = 0;
    let cy = 0;

    for (let i = 0; i < ring.length - 1; i += 1) {
      const [x0, y0] = ring[i];
      const [x1, y1] = ring[i + 1];
      const cross = x0 * y1 - x1 * y0;
      area += cross;
      cx += (x0 + x1) * cross;
      cy += (y0 + y1) * cross;
    }

    area /= 2;
    if (Math.abs(area) > bestArea) {
      bestArea = Math.abs(area);
      best = [cx / (6 * area), cy / (6 * area)];
    }
  }

  return best ?? [0, 0];
}

const roundBbox = (bbox) =>
  Object.fromEntries(
    Object.entries(bbox).map(([key, value]) => [key, Number(value.toFixed(5))])
  );

/* ------------------------------------------------------------------ */
/* point-in-polygon, used to attach contracts to barangays             */
/* ------------------------------------------------------------------ */

function pointInRing([x, y], ring) {
  let inside = false;
  for (let i = 0, j = ring.length - 1; i < ring.length; j = i, i += 1) {
    const [xi, yi] = ring[i];
    const [xj, yj] = ring[j];
    const intersects = yi > y !== yj > y && x < ((xj - xi) * (y - yi)) / (yj - yi) + xi;
    if (intersects) inside = !inside;
  }
  return inside;
}

function pointInPolygons(lon, lat, polygons) {
  for (const polygon of polygons) {
    if (!pointInRing([lon, lat], polygon[0])) continue;
    const inHole = polygon.slice(1).some((hole) => pointInRing([lon, lat], hole));
    if (!inHole) return true;
  }
  return false;
}

async function main() {
  const retrievedAt = new Date().toISOString();
  const psa = JSON.parse(readFileSync(PSA_PATH, 'utf8'));
  const dpwh = JSON.parse(readFileSync(DPWH_PATH, 'utf8'));

  // --- Country: the 18 regions, simplified into one silhouette.
  const countrySource = await readSource('country');
  const regions = countrySource.features
    .map((feature) => ({
      name: feature.properties.adm1_en,
      polygons: cleanPolygons(
        feature.geometry,
        SOURCES.country.tolerance,
        SOURCES.country.minRingArea
      ),
    }))
    .filter((region) => region.polygons.length > 0);

  if (regions.length === 0) throw new Error('country geometry is empty');

  // --- Province: 34 municipalities, with Bauan singled out.
  const provinceSource = await readSource('province');
  const municipalities = provinceSource.features
    .map((feature) => ({
      name: feature.properties.adm3_en,
      psgc: String(feature.properties.adm3_psgc),
      polygons: cleanPolygons(
        feature.geometry,
        SOURCES.province.tolerance,
        SOURCES.province.minRingArea
      ),
    }))
    .filter((municipality) => municipality.polygons.length > 0);

  const bauanMunicipality = municipalities.find((municipality) => municipality.name === 'Bauan');
  if (!bauanMunicipality) throw new Error('Bauan not found in the province geometry');

  // --- Municipality: 40 barangays, joined to PSA population.
  const bauanSource = await readSource('bauan');
  const populationByName = new Map(psa.barangays.map((barangay) => [barangay.name, barangay]));

  const barangays = bauanSource.features.map((feature) => {
    const name = feature.properties.adm4_en;
    const match = populationByName.get(name);

    if (!match) {
      throw new Error(`barangay "${name}" in the boundary file has no PSA population match`);
    }

    return {
      name,
      psgc: String(feature.properties.adm4_psgc),
      population: match.population,
      households: match.households,
      polygons: cleanPolygons(feature.geometry, SOURCES.bauan.tolerance, SOURCES.bauan.minRingArea),
    };
  });

  if (barangays.length !== 40) {
    throw new Error(`expected 40 barangays in the geometry, found ${barangays.length}`);
  }

  // --- Contract pins, only where DPWH's own coordinates fall inside Bauan.
  // Each pin is assigned to the barangay that contains it, so the map can show
  // construction as a statistic rather than a scatter of dots.
  const pins = dpwh.contracts
    .filter((contract) => contract.coordinatesVerified && contract.latitude && contract.longitude)
    .map((contract) => {
      const barangay = barangays.find((candidate) =>
        pointInPolygons(contract.longitude, contract.latitude, candidate.polygons)
      );

      return {
        id: contract.id,
        lon: Number(contract.longitude.toFixed(5)),
        lat: Number(contract.latitude.toFixed(5)),
        description: contract.description,
        amount: contract.budget,
        year: contract.year,
        status: contract.status,
        barangay: barangay?.name ?? null,
      };
    });

  const pinsByBarangay = new Map();
  for (const pin of pins) {
    if (!pin.barangay) continue;
    const current = pinsByBarangay.get(pin.barangay) ?? { contracts: 0, contractAmount: 0 };
    current.contracts += 1;
    current.contractAmount += pin.amount ?? 0;
    pinsByBarangay.set(pin.barangay, current);
  }

  const levels = {
    country: {
      label: 'Philippines',
      bounds: roundBbox(bboxOfSignificant(regions.flatMap((region) => region.polygons), 0.02)),
      center: centroidOf(regions.flatMap((region) => region.polygons)),
      shapes: regions.map((region) => ({
        name: region.name,
        polygons: region.polygons,
      })),
    },
    province: {
      label: 'Batangas',
      bounds: roundBbox(
        bboxOfSignificant(municipalities.flatMap((municipality) => municipality.polygons), 0.0004)
      ),
      center: centroidOf(bauanMunicipality.polygons),
      shapes: municipalities.map((municipality) => ({
        name: municipality.name,
        psgc: municipality.psgc,
        focus: municipality.name === 'Bauan',
        polygons: municipality.polygons,
      })),
    },
    bauan: {
      label: 'Bauan',
      bounds: roundBbox(bboxOf(barangays.flatMap((barangay) => barangay.polygons))),
      center: centroidOf(bauanMunicipality.polygons),
      municipality: bauanMunicipality.polygons,
      barangays: barangays.map((barangay) => {
        const stats = pinsByBarangay.get(barangay.name) ?? { contracts: 0, contractAmount: 0 };
        return {
          name: barangay.name,
          psgc: barangay.psgc,
          population: barangay.population,
          households: barangay.households,
          contracts: stats.contracts,
          contractAmount: stats.contractAmount,
          polygons: barangay.polygons,
        };
      }),
      pins,
      totals: {
        pins: pins.length,
        assignedPins: pins.filter((pin) => pin.barangay).length,
        contractAmount: pins.reduce((sum, pin) => sum + (pin.amount ?? 0), 0),
        barangaysWithContracts: pinsByBarangay.size,
      },
    },
  };

  const payload = {
    schemaVersion: '1.0.0',
    source: {
      name: 'philippines-json-maps',
      publisher: 'Community mirror of PSA / NAMRIA administrative boundaries',
      repository: 'https://github.com/faeldon/philippines-json-maps',
      files: Object.fromEntries(
        Object.entries(SOURCES).map(([key, value]) => [key, value.url])
      ),
      retrievedAt,
      note: 'Boundaries are simplified for rendering. Not a cadastral survey.',
    },
    levels,
  };

  writeFileSync(OUT_PATH, `${JSON.stringify(payload)}\n`, 'utf8');

  const kb = (resolve(OUT_PATH) && readFileSync(OUT_PATH).length) / 1024;
  console.log(
    `map: ${regions.length} regions, ${municipalities.length} municipalities, ${barangays.length} barangays, ${pins.length} contract pins`
  );
  console.log(`map: ${kb.toFixed(0)} KB written to src/data/generated/map.json`);
}

main().catch((error) => {
  console.error(`map build failed: ${error.message}`);
  process.exitCode = 1;
});
