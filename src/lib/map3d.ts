/**
 * The 3D location map.
 *
 * Everything is local: the geometry is the committed `map.json`, the pins are the
 * same DPWH records the projects page uses, and three.js is bundled. There is no
 * tile server, no geocoder, and no request after the page loads.
 *
 * The three levels each normalise to ~9 world units, so the camera can hold its
 * position while the geometry changes underneath — that is what makes the swap
 * read as a flight instead of a page jump.
 *
 * On the Bauan level the barangays are not flat: their height is a statistic
 * (population, households, contracts or contract value). Growing and re-growing
 * those bars is the map's main motion.
 */
import * as THREE from 'three';
import { OrbitControls } from 'three/examples/jsm/controls/OrbitControls.js';

import mapSource from '../data/generated/map.json';
import { num, peso } from './format';

type Ring = number[][];
type Polygons = Ring[][];

type Bounds = { minLon: number; minLat: number; maxLon: number; maxLat: number };

type Shape = {
  name: string;
  psgc?: string;
  focus?: boolean;
  population?: number;
  households?: number;
  contracts?: number;
  contractAmount?: number;
  polygons: Polygons;
};

type Pin = {
  id: string;
  lon: number;
  lat: number;
  description: string;
  amount: number;
  year: string;
  status: string;
  barangay: string | null;
};

type LevelKey = 'country' | 'province' | 'bauan';
type MetricKey = 'population' | 'households' | 'contracts' | 'contractAmount';

type MapData = {
  levels: Record<
    LevelKey,
    {
      label: string;
      bounds: Bounds;
      center: number[];
      shapes?: Shape[];
      barangays?: Shape[];
      municipality?: Polygons;
      pins?: Pin[];
      totals?: {
        pins: number;
        assignedPins: number;
        contractAmount: number;
        barangaysWithContracts: number;
      };
    }
  >;
};

const data = mapSource as unknown as MapData;

const TARGET_SIZE = 9;
const BAUAN_DEPTH = 0.16;
const MIN_HEIGHT = 0.16;
const MAX_HEIGHT = 2.05;

const PALETTE = {
  land: 0xded6c5,
  landEdge: 0x9f9278,
  low: 0xe8e1d2,
  high: 0xc2542d,
  accent: 0xc2542d,
  accentEdge: 0x8f3a1c,
  hover: 0x0e4a40,
  pin: 0x0e4a40,
};

const METRICS: Record<
  MetricKey,
  { label: string; noun: string; value: (barangay: Shape) => number; format: (value: number) => string }
> = {
  population: {
    label: 'Population',
    noun: 'people',
    value: (barangay) => barangay.population ?? 0,
    format: (value) => num(value),
  },
  households: {
    label: 'Households',
    noun: 'households',
    value: (barangay) => barangay.households ?? 0,
    format: (value) => num(value),
  },
  contracts: {
    label: 'Contracts',
    noun: 'contracts',
    value: (barangay) => barangay.contracts ?? 0,
    format: (value) => num(value),
  },
  contractAmount: {
    label: 'Contract value',
    noun: 'in contract value',
    value: (barangay) => barangay.contractAmount ?? 0,
    format: (value) => peso(value),
  },
};

const COPY: Record<LevelKey, { hint: string }> = {
  country: {
    hint: 'The Philippines in 18 regions. Bauan sits on the western coast of Batangas, in Region IV-A. Click the highlighted province, or use the rail, to fly in.',
  },
  province: {
    hint: 'Batangas has 34 cities and municipalities. Bauan is the raised, clay-coloured one on Balayan Bay. Click it to see the town as data.',
  },
  bauan: {
    hint: 'Forty barangays, each grown to its own number. Pick a measure on the left and the town rebuilds itself; hover a bar for the figure behind it.',
  },
};

const prefersReducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;

/* ------------------------------------------------------------------ */
/* projection                                                          */
/* ------------------------------------------------------------------ */

function makeProjection(bounds: Bounds) {
  const lat0 = (bounds.minLat + bounds.maxLat) / 2;
  const lonScale = Math.cos((lat0 * Math.PI) / 180);
  const centreLon = (bounds.minLon + bounds.maxLon) / 2;
  const centreLat = (bounds.minLat + bounds.maxLat) / 2;
  const width = (bounds.maxLon - bounds.minLon) * lonScale;
  const height = bounds.maxLat - bounds.minLat;
  const scale = TARGET_SIZE / Math.max(width, height, 1e-6);

  return {
    project(lon: number, lat: number): [number, number] {
      return [(lon - centreLon) * lonScale * scale, (lat - centreLat) * scale];
    },
  };
}

function polygonsToShapes(
  polygons: Polygons,
  project: (lon: number, lat: number) => [number, number]
) {
  const shapes: THREE.Shape[] = [];

  for (const polygon of polygons) {
    const outer = polygon[0];
    if (!outer || outer.length < 4) continue;

    const shape = new THREE.Shape(
      outer.map(([lon, lat]) => {
        const [x, y] = project(lon, lat);
        return new THREE.Vector2(x, y);
      })
    );

    for (const hole of polygon.slice(1)) {
      if (hole.length < 4) continue;
      shape.holes.push(
        new THREE.Path(
          hole.map(([lon, lat]) => {
            const [x, y] = project(lon, lat);
            return new THREE.Vector2(x, y);
          })
        )
      );
    }

    shapes.push(shape);
  }

  return shapes;
}

/* ------------------------------------------------------------------ */
/* tweening                                                            */
/* ------------------------------------------------------------------ */

type Tween = {
  start: number;
  duration: number;
  update: (t: number) => void;
  done?: () => void;
};

const tweens: Tween[] = [];
const easeInOutCubic = (t: number) => (t < 0.5 ? 4 * t * t * t : 1 - (-2 * t + 2) ** 3 / 2);

function tween(
  duration: number,
  update: Tween['update'],
  done?: Tween['done'],
  delay = 0
): Tween | undefined {
  if (prefersReducedMotion) {
    update(1);
    done?.();
    return undefined;
  }
  const item: Tween = { start: performance.now() + delay, duration, update, done };
  tweens.push(item);
  return item;
}

function stepTweens(now: number) {
  for (let i = tweens.length - 1; i >= 0; i -= 1) {
    const item = tweens[i];
    const progress = Math.min(1, Math.max(0, (now - item.start) / item.duration));
    item.update(easeInOutCubic(progress));
    if (progress >= 1) {
      tweens.splice(i, 1);
      item.done?.();
    }
  }
}

/* ------------------------------------------------------------------ */
/* opacity                                                             */
/* ------------------------------------------------------------------ */

function setOpacity(root: THREE.Object3D, value: number) {
  root.traverse((object) => {
    const material = (object as THREE.Mesh).material as THREE.Material | THREE.Material[] | undefined;
    if (!material) return;
    const list = Array.isArray(material) ? material : [material];
    for (const item of list) {
      item.transparent = value < 0.999;
      item.opacity = value;
    }
  });
}

/* ------------------------------------------------------------------ */
/* main                                                                */
/* ------------------------------------------------------------------ */

export function initMap() {
  const host = document.querySelector<HTMLElement>('[data-map-canvas]');
  const frame = document.querySelector<HTMLElement>('[data-map-frame]');
  const tooltip = document.querySelector<HTMLElement>('[data-map-tooltip]');
  const hint = document.querySelector<HTMLElement>('[data-map-hint]');
  const detail = document.querySelector<HTMLElement>('[data-map-detail]');
  const pinToggle = document.querySelector<HTMLInputElement>('[data-map-pins]');
  const pinRow = document.querySelector<HTMLElement>('[data-map-pin-row]');
  const metricRow = document.querySelector<HTMLElement>('[data-map-metric-row]');
  const legend = document.querySelector<HTMLElement>('[data-map-legend]');
  const ranking = document.querySelector<HTMLElement>('[data-map-ranking]');
  const rankingTitle = document.querySelector<HTMLElement>('[data-map-ranking-title]');
  const fallback = document.querySelector<HTMLElement>('[data-map-fallback]');
  const tabs = Array.from(document.querySelectorAll<HTMLButtonElement>('[data-map-level]'));
  const metrics = Array.from(document.querySelectorAll<HTMLButtonElement>('[data-map-metric]'));

  if (!host || !frame) return;

  const frameElement = frame;

  let renderer: THREE.WebGLRenderer;
  try {
    renderer = new THREE.WebGLRenderer({
      antialias: true,
      alpha: true,
      powerPreference: 'high-performance',
    });
  } catch {
    fallback?.removeAttribute('hidden');
    return;
  }

  renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
  renderer.setClearAlpha(0);
  renderer.shadowMap.enabled = true;
  renderer.shadowMap.type = THREE.PCFShadowMap;
  renderer.toneMapping = THREE.ACESFilmicToneMapping;
  renderer.toneMappingExposure = 1.06;
  host.appendChild(renderer.domElement);

  const scene = new THREE.Scene();

  const camera = new THREE.PerspectiveCamera(38, 1, 0.1, 300);
  const controls = new OrbitControls(camera, renderer.domElement);
  controls.enablePan = false;
  controls.enableDamping = true;
  controls.dampingFactor = 0.08;
  controls.minPolarAngle = 0.42;
  controls.maxPolarAngle = 1.3;
  controls.rotateSpeed = 0.62;
  controls.zoomSpeed = 0.7;
  controls.autoRotate = !prefersReducedMotion;
  controls.autoRotateSpeed = 0.4;

  scene.add(new THREE.HemisphereLight(0xffffff, 0xb9b0a0, 1.5));

  const key = new THREE.DirectionalLight(0xfff6ea, 2.4);
  key.position.set(6, 13, 7);
  key.castShadow = true;
  key.shadow.mapSize.set(2048, 2048);
  key.shadow.camera.left = -9;
  key.shadow.camera.right = 9;
  key.shadow.camera.top = 9;
  key.shadow.camera.bottom = -9;
  key.shadow.camera.near = 1;
  key.shadow.camera.far = 42;
  key.shadow.bias = -0.0006;
  key.shadow.normalBias = 0.02;
  key.shadow.radius = 2;
  scene.add(key);

  const rim = new THREE.DirectionalLight(0xbcd7d2, 0.9);
  rim.position.set(-9, 5, -8);
  scene.add(rim);

  const ground = new THREE.Mesh(
    new THREE.CircleGeometry(48, 64),
    new THREE.ShadowMaterial({ color: 0x2a2418, opacity: 0.2 })
  );
  ground.rotation.x = -Math.PI / 2;
  ground.position.y = -0.02;
  ground.receiveShadow = true;
  scene.add(ground);

  /* ---------------------------------------------------------------- */
  /* level construction                                                */
  /* ---------------------------------------------------------------- */

  type BuiltLevel = {
    group: THREE.Group;
    pickables: THREE.Object3D[];
    bars: THREE.Mesh[];
    pinGroup?: THREE.Group;
    pins: THREE.Mesh[];
  };

  const built: Partial<Record<LevelKey, BuiltLevel>> = {};

  function makeMesh(
    shape: THREE.Shape,
    options: {
      color: number;
      edgeColor: number;
      depth: number;
      data: Record<string, unknown>;
      emissive?: number;
      emissiveIntensity?: number;
    }
  ) {
    const geometry = new THREE.ExtrudeGeometry(shape, {
      depth: options.depth,
      bevelEnabled: false,
      curveSegments: 1,
    });

    const material = new THREE.MeshStandardMaterial({
      color: options.color,
      roughness: 0.86,
      metalness: 0.02,
      flatShading: true,
      emissive: options.emissive ?? 0x000000,
      emissiveIntensity: options.emissiveIntensity ?? 0,
    });

    const mesh = new THREE.Mesh(geometry, material);
    mesh.rotation.x = -Math.PI / 2;
    mesh.castShadow = true;
    mesh.receiveShadow = true;
    mesh.userData = { ...options.data };

    const edges = new THREE.LineSegments(
      new THREE.EdgesGeometry(geometry, 26),
      new THREE.LineBasicMaterial({
        color: options.edgeColor,
        transparent: true,
        opacity: 0.5,
      })
    );
    mesh.add(edges);

    return mesh;
  }

  function buildCountry(): BuiltLevel {
    const level = data.levels.country;
    const { project } = makeProjection(level.bounds);
    const group = new THREE.Group();
    const pickables: THREE.Object3D[] = [];

    for (const region of level.shapes ?? []) {
      for (const shape of polygonsToShapes(region.polygons, project)) {
        const mesh = makeMesh(shape, {
          color: PALETTE.land,
          edgeColor: PALETTE.landEdge,
          depth: 0.1,
          data: { kind: 'region', name: region.name },
        });
        group.add(mesh);
        pickables.push(mesh);
      }
    }

    // A small pin over Batangas so the province is findable at country scale.
    const [bx, bz] = project(data.levels.province.center[0], data.levels.province.center[1]);
    const marker = new THREE.Group();

    const stem = new THREE.Mesh(
      new THREE.CylinderGeometry(0.012, 0.012, 0.55, 8),
      new THREE.MeshStandardMaterial({ color: PALETTE.accent, roughness: 0.5 })
    );
    stem.position.set(bx, 0.27, -bz);

    const head = new THREE.Mesh(
      new THREE.SphereGeometry(0.055, 14, 14),
      new THREE.MeshStandardMaterial({
        color: PALETTE.accent,
        emissive: PALETTE.accent,
        emissiveIntensity: 0.4,
        roughness: 0.35,
      })
    );
    head.position.set(bx, 0.57, -bz);

    const halo = new THREE.Mesh(
      new THREE.RingGeometry(0.1, 0.15, 40),
      new THREE.MeshBasicMaterial({
        color: PALETTE.accent,
        transparent: true,
        opacity: 0.55,
        side: THREE.DoubleSide,
      })
    );
    halo.rotation.x = -Math.PI / 2;
    halo.position.set(bx, 0.32, -bz);
    halo.userData.pulse = true;

    marker.add(stem, head, halo);
    group.add(marker);

    return { group, pickables, bars: [], pins: [] };
  }

  function buildProvince(): BuiltLevel {
    const level = data.levels.province;
    const { project } = makeProjection(level.bounds);
    const group = new THREE.Group();
    const pickables: THREE.Object3D[] = [];

    for (const municipality of level.shapes ?? []) {
      for (const shape of polygonsToShapes(municipality.polygons, project)) {
        const mesh = makeMesh(shape, {
          color: municipality.focus ? PALETTE.accent : PALETTE.land,
          edgeColor: municipality.focus ? PALETTE.accentEdge : PALETTE.landEdge,
          depth: municipality.focus ? 0.5 : 0.3,
          data: {
            kind: 'municipality',
            name: municipality.name,
            focus: Boolean(municipality.focus),
          },
          emissive: municipality.focus ? PALETTE.accent : undefined,
          emissiveIntensity: municipality.focus ? 0.1 : 0,
        });
        group.add(mesh);
        pickables.push(mesh);
      }
    }

    return { group, pickables, bars: [], pins: [] };
  }

  function buildBauan(): BuiltLevel {
    const level = data.levels.bauan;
    const { project } = makeProjection(level.bounds);
    const group = new THREE.Group();
    const pickables: THREE.Object3D[] = [];
    const bars: THREE.Mesh[] = [];

    (level.barangays ?? []).forEach((barangay, index) => {
      for (const shape of polygonsToShapes(barangay.polygons, project)) {
        const mesh = makeMesh(shape, {
          color: PALETTE.low,
          edgeColor: PALETTE.accentEdge,
          depth: BAUAN_DEPTH,
          data: {
            kind: 'barangay',
            name: barangay.name,
            psgc: barangay.psgc,
            population: barangay.population,
            households: barangay.households,
            contracts: barangay.contracts,
            contractAmount: barangay.contractAmount,
            index,
          },
        });
        mesh.userData.currentColor = PALETTE.low;
        // Start squashed so the town can grow when the level is entered.
        mesh.scale.z = 0.001;
        group.add(mesh);
        pickables.push(mesh);
        bars.push(mesh);
      }
    });

    const pinGroup = new THREE.Group();
    pinGroup.name = 'pins';
    const pinMeshes: THREE.Mesh[] = [];

    for (const pin of level.pins ?? []) {
      // Only pins that land inside a barangay polygon are plotted on the town.
      // The rest sit in the sea or in a gap in the simplified boundary; drawing
      // them would suggest a location the source does not support.
      if (!pin.barangay) continue;

      const [x, z] = project(pin.lon, pin.lat);
      const dot = new THREE.Mesh(
        new THREE.SphereGeometry(0.042, 10, 10),
        new THREE.MeshStandardMaterial({
          color: PALETTE.pin,
          emissive: PALETTE.pin,
          emissiveIntensity: 0.35,
          roughness: 0.35,
        })
      );
      dot.position.set(x, 0.25, -z);
      dot.userData = { kind: 'pin', pin, baseY: 0.25 };
      dot.castShadow = false;
      pinGroup.add(dot);
      pickables.push(dot);
      pinMeshes.push(dot);
    }

    group.add(pinGroup);

    return { group, pickables, bars, pinGroup, pins: pinMeshes };
  }

  /* ---------------------------------------------------------------- */
  /* metric heights                                                    */
  /* ---------------------------------------------------------------- */

  let metric: MetricKey = 'population';
  const heightByBarangay = new Map<string, number>();

  function heightFor(value: number, max: number) {
    if (max <= 0) return MIN_HEIGHT;
    return MIN_HEIGHT + Math.pow(value / max, 0.62) * (MAX_HEIGHT - MIN_HEIGHT);
  }

  function applyMetric(next: MetricKey, options: { intro?: boolean } = {}) {
    metric = next;
    const barangays = data.levels.bauan.barangays ?? [];
    const config = METRICS[next];
    const values = barangays.map((barangay) => config.value(barangay));
    const max = Math.max(...values, 1);

    for (const button of metrics) {
      button.setAttribute('aria-pressed', String(button.dataset.mapMetric === next));
    }

    if (legend) {
      const min = Math.min(...values);
      legend.textContent = `${config.label} · ${config.format(min)} to ${config.format(max)}`;
    }

    if (rankingTitle) {
      rankingTitle.textContent = `Largest by ${config.label.toLowerCase()}`;
    }

    if (ranking) {
      const top = [...barangays]
        .sort((a, b) => config.value(b) - config.value(a))
        .slice(0, 6);

      ranking.replaceChildren();
      for (const [index, barangay] of top.entries()) {
        const value = config.value(barangay);
        const item = document.createElement('li');
        item.className = 'map-rank';

        const position = document.createElement('span');
        position.className = 'map-rank-index';
        position.textContent = String(index + 1).padStart(2, '0');

        const name = document.createElement('span');
        name.className = 'map-rank-name';
        name.textContent = barangay.name;

        const figure = document.createElement('span');
        figure.className = 'map-rank-value';
        figure.textContent = config.format(value);

        const bar = document.createElement('span');
        bar.className = 'map-rank-bar';
        const fill = document.createElement('span');
        fill.style.width = `${Math.max(4, (value / max) * 100)}%`;
        bar.appendChild(fill);

        item.append(position, name, figure, bar);
        ranking.appendChild(item);
      }
    }

    const level = built.bauan;
    if (!level) return;

    const low = new THREE.Color(PALETTE.low);
    const high = new THREE.Color(PALETTE.high);
    const colour = new THREE.Color();

    for (const bar of level.bars) {
      const index = bar.userData.index as number;
      const barangay = barangays[index];
      if (!barangay) continue;

      const value = config.value(barangay);
      const targetHeight = heightFor(value, max);
      heightByBarangay.set(barangay.name, targetHeight);

      const from = bar.scale.z;
      const to = targetHeight / BAUAN_DEPTH;
      const fromColour = new THREE.Color(bar.userData.currentColor as number);

      colour.lerpColors(low, high, Math.min(1, Math.sqrt(value / max) * 0.95));
      bar.userData.currentColor = colour.getHex();

      // A short stagger turns the intro into a wave across the town, not a
      // single switch. Capped so the last barangay does not lag behind.
      const delay = options.intro ? Math.min(index * 18, 320) : 0;
      const duration = options.intro ? 720 : 620;

      tween(
        duration,
        (t) => {
          bar.scale.z = from + (to - from) * t;
        },
        undefined,
        delay
      );

      // Colour rides along with the height, on the same curve.
      const startColour = fromColour.clone();
      const endColour = colour.clone();
      tween(
        duration,
        (t) => {
          (bar.material as THREE.MeshStandardMaterial).color.lerpColors(startColour, endColour, t);
        },
        undefined,
        delay
      );
    }

    // Pins sit on top of whichever bar contains them.
    for (const pin of level.pins) {
      const info = pin.userData.pin as Pin;
      const target = info.barangay ? (heightByBarangay.get(info.barangay) ?? MIN_HEIGHT) + 0.09 : 0.25;
      const from = pin.position.y;
      pin.userData.baseY = target;
      tween(620, (t) => {
        pin.position.y = from + (target - from) * t;
      });
    }
  }

  /* ---------------------------------------------------------------- */
  /* camera                                                            */
  /* ---------------------------------------------------------------- */

  function levelExtent(key: LevelKey) {
    const bounds = data.levels[key].bounds;
    const lat0 = (bounds.minLat + bounds.maxLat) / 2;
    const width = (bounds.maxLon - bounds.minLon) * Math.cos((lat0 * Math.PI) / 180);
    const height = bounds.maxLat - bounds.minLat;
    const scale = TARGET_SIZE / Math.max(width, height, 1e-6);
    return { width: width * scale, height: height * scale };
  }

  function frameDistance(key: LevelKey = current) {
    const aspect = Math.max(camera.aspect, 0.35);
    const vertical = THREE.MathUtils.degToRad(camera.fov);
    const horizontal = 2 * Math.atan(Math.tan(vertical / 2) * aspect);
    const { width, height } = levelExtent(key);

    // Fit whichever dimension is binding for this level; a wide province and a
    // tall archipelago should not share the same camera distance. The town needs
    // extra room because its bars rise toward the camera.
    const distance = Math.max(
      height / 2 / Math.tan(vertical / 2),
      width / 2 / Math.tan(horizontal / 2)
    );
    const margin = key === 'bauan' ? 1.2 : key === 'province' ? 1.05 : 1;
    return distance * margin;
  }

  function cameraPosition(distance: number, out = new THREE.Vector3()) {
    const polar = THREE.MathUtils.degToRad(52);
    const azimuth = THREE.MathUtils.degToRad(22);
    return out.set(
      Math.sin(polar) * Math.sin(azimuth) * distance,
      Math.cos(polar) * distance,
      Math.sin(polar) * Math.cos(azimuth) * distance
    );
  }

  function snapCamera() {
    camera.position.copy(cameraPosition(frameDistance()));
    controls.target.set(0, 0, 0);
    controls.update();
  }

  // Only one camera move may be in flight. Without this, the opening dolly can
  // finish after a level chosen from a deep link and drag the camera back to the
  // country framing.
  let cameraTween: Tween | undefined;

  function stopCameraTween() {
    if (!cameraTween) return;
    const index = tweens.indexOf(cameraTween);
    if (index >= 0) tweens.splice(index, 1);
    cameraTween = undefined;
  }

  function flyCamera() {
    stopCameraTween();
    const from = camera.position.clone();
    const to = cameraPosition(frameDistance());
    cameraTween = tween(950, (t) => {
      camera.position.lerpVectors(from, to, t);
    });
  }

  /* ---------------------------------------------------------------- */
  /* level switching                                                   */
  /* ---------------------------------------------------------------- */

  let current: LevelKey = 'country';
  let detailMode: 'hint' | 'barangay' | 'pin' = 'hint';

  function ensure(key: LevelKey): BuiltLevel {
    if (!built[key]) {
      const value =
        key === 'country' ? buildCountry() : key === 'province' ? buildProvince() : buildBauan();
      value.group.visible = false;
      built[key] = value;
      scene.add(value.group);
    }
    return built[key] as BuiltLevel;
  }

  function updateChrome(key: LevelKey) {
    for (const tab of tabs) {
      tab.setAttribute('aria-pressed', String(tab.dataset.mapLevel === key));
    }
    if (hint) hint.textContent = COPY[key].hint;

    if (pinRow) pinRow.hidden = key !== 'bauan';
    if (pinToggle) pinToggle.disabled = key !== 'bauan';
    if (metricRow) metricRow.hidden = key !== 'bauan';
    if (legend) legend.hidden = key !== 'bauan';
  }

  function renderHint() {
    if (!detail || detailMode !== 'hint') return;
    detail.replaceChildren();

    const line = document.createElement('p');
    line.className = 'map-detail-empty';

    if (current === 'bauan') {
      const totals = data.levels.bauan.totals;
      line.textContent = `${num(totals?.pins ?? 0)} contracts with usable coordinates, ${num(
        totals?.assignedPins ?? 0
      )} of them inside a barangay polygon. Hover a bar; click a dot.`;
    } else {
      line.textContent = 'Hover a shape to read its name, then click to fly in.';
    }

    detail.appendChild(line);
  }

  function selectLevel(key: LevelKey) {
    if (key === current) return;

    const previous = built[current];
    const next = ensure(key);

    current = key;
    detailMode = 'hint';
    updateChrome(key);
    renderHint();
    flyCamera();

    if (previous) {
      if (prefersReducedMotion) {
        previous.group.visible = false;
      } else {
        tween(200, (t) => setOpacity(previous.group, 1 - t), () => {
          previous.group.visible = false;
        });
      }
    }

    next.group.visible = true;
    setOpacity(next.group, prefersReducedMotion ? 1 : 0);
    next.group.position.y = prefersReducedMotion ? 0 : -0.55;
    next.group.scale.setScalar(prefersReducedMotion ? 1 : 0.97);

    tween(640, (t) => {
      setOpacity(next.group, t);
      next.group.position.y = -0.55 * (1 - t);
      next.group.scale.setScalar(0.97 + 0.03 * t);
    });

    if (key === 'bauan') {
      if (pinToggle) pinToggle.checked = true;
      if (next.pinGroup) next.pinGroup.visible = true;
      applyMetric(metric, { intro: true });
      if (next.pinGroup) {
        const pinGroup = next.pinGroup;
        setOpacity(pinGroup, prefersReducedMotion ? 1 : 0);
        tween(700, (t) => setOpacity(pinGroup, t));
      }
    }
  }

  /* ---------------------------------------------------------------- */
  /* interaction                                                       */
  /* ---------------------------------------------------------------- */

  const raycaster = new THREE.Raycaster();
  const pointer = new THREE.Vector2();
  let hovered: THREE.Object3D | null = null;
  let hoveredMesh: THREE.Mesh | null = null;
  let baseColor = 0;
  let baseEmissive = 0;
  let baseIntensity = 0;

  function restoreHover() {
    if (!hoveredMesh) return;
    const material = hoveredMesh.material as THREE.MeshStandardMaterial;
    material.color.setHex(baseColor);
    material.emissive.setHex(baseEmissive);
    material.emissiveIntensity = baseIntensity;
    hoveredMesh = null;
  }

  function setHover(object: THREE.Object3D | null) {
    if (hovered === object) return;

    restoreHover();
    hovered = object;

    if (object) {
      const info = object.userData as { kind?: string };
      if (info.kind === 'barangay' || info.kind === 'municipality' || info.kind === 'region') {
        const mesh = object as THREE.Mesh;
        const material = mesh.material as THREE.MeshStandardMaterial;
        hoveredMesh = mesh;
        baseColor = material.color.getHex();
        baseEmissive = material.emissive.getHex();
        baseIntensity = material.emissiveIntensity;
        material.emissive.setHex(PALETTE.hover);
        material.emissiveIntensity = 0.42;
      }
    }

    if (!tooltip) return;

    if (!object) {
      tooltip.hidden = true;
      return;
    }

    const info = object.userData as {
      kind?: string;
      name?: string;
      population?: number;
      contracts?: number;
      contractAmount?: number;
      pin?: Pin;
    };

    tooltip.replaceChildren();
    const title = document.createElement('p');
    title.className = 'map-tooltip-title';
    const sub = document.createElement('p');
    sub.className = 'map-tooltip-sub';

    if (info.kind === 'pin' && info.pin) {
      title.textContent = peso(info.pin.amount);
      sub.textContent = `${info.pin.id} · ${info.pin.status}`;
    } else if (info.kind === 'barangay') {
      title.textContent = info.name ?? '';
      const parts = [`${num(info.population ?? 0)} people`];
      if (info.contracts) parts.push(`${num(info.contracts)} contracts`);
      sub.textContent = parts.join(' · ');
    } else if (info.kind === 'municipality') {
      title.textContent = info.name ?? '';
      sub.textContent = (object.userData as { focus?: boolean }).focus
        ? 'Click to see Bauan in data'
        : 'Batangas';
    } else {
      title.textContent = info.name ?? '';
      sub.textContent = 'Philippines';
    }

    tooltip.append(title, sub);
    tooltip.hidden = false;
  }

  function toPointer(event: PointerEvent) {
    const rect = renderer.domElement.getBoundingClientRect();
    pointer.x = ((event.clientX - rect.left) / rect.width) * 2 - 1;
    pointer.y = -((event.clientY - rect.top) / rect.height) * 2 + 1;
    return rect;
  }

  function pick(event: PointerEvent) {
    const level = built[current];
    if (!level) return null;

    toPointer(event);
    raycaster.setFromCamera(pointer, camera);

    const visible = level.pickables.filter((object) => {
      let node: THREE.Object3D | null = object;
      while (node) {
        if (!node.visible) return false;
        node = node.parent;
      }
      return true;
    });

    return raycaster.intersectObjects(visible, false)[0]?.object ?? null;
  }

  renderer.domElement.addEventListener('pointermove', (event) => {
    const object = pick(event);
    setHover(object);

    if (object && tooltip) {
      const rect = frameElement.getBoundingClientRect();
      const x = Math.min(Math.max(event.clientX - rect.left + 14, 8), rect.width - 200);
      const y = Math.min(Math.max(event.clientY - rect.top + 12, 8), rect.height - 74);
      tooltip.style.transform = `translate(${x}px, ${y}px)`;
    }
  });

  renderer.domElement.addEventListener('pointerleave', () => setHover(null));

  let downAt = { x: 0, y: 0, time: 0 };
  renderer.domElement.addEventListener('pointerdown', (event) => {
    downAt = { x: event.clientX, y: event.clientY, time: performance.now() };
  });

  renderer.domElement.addEventListener('pointerup', (event) => {
    if (Math.hypot(event.clientX - downAt.x, event.clientY - downAt.y) > 8) return;
    if (performance.now() - downAt.time > 700) return;

    const object = pick(event);
    if (!object) return;

    const info = object.userData as {
      kind?: string;
      name?: string;
      psgc?: string;
      population?: number;
      households?: number;
      contracts?: number;
      contractAmount?: number;
      pin?: Pin;
    };

    if (info.kind === 'pin' && info.pin) {
      detailMode = 'pin';
      renderPinDetail(info.pin);
      return;
    }

    if (info.kind === 'barangay') {
      detailMode = 'barangay';
      renderBarangayDetail(info);
      return;
    }

    if (info.kind === 'region') {
      selectLevel('province');
      return;
    }

    if (info.kind === 'municipality') {
      selectLevel('bauan');
    }
  });

  let idleTimer: number | undefined;
  controls.addEventListener('start', () => {
    controls.autoRotate = false;
    window.clearTimeout(idleTimer);
  });

  controls.addEventListener('end', () => {
    if (prefersReducedMotion) return;
    window.clearTimeout(idleTimer);
    idleTimer = window.setTimeout(() => {
      controls.autoRotate = true;
    }, 9000);
  });

  function renderBarangayDetail(info: {
    name?: string;
    psgc?: string;
    population?: number;
    households?: number;
    contracts?: number;
    contractAmount?: number;
  }) {
    if (!detail) return;
    detail.replaceChildren();

    const title = document.createElement('p');
    title.className = 'map-detail-title';
    title.textContent = info.name ?? 'Barangay';

    const rows: [string, string][] = [
      ['Population', num(info.population ?? 0)],
      ['Households', num(info.households ?? 0)],
      ['Contracts', num(info.contracts ?? 0)],
      ['Contract value', peso(info.contractAmount ?? 0)],
    ];

    const list = document.createElement('dl');
    list.className = 'map-detail-list';
    for (const [label, value] of rows) {
      const dt = document.createElement('dt');
      dt.textContent = label;
      const dd = document.createElement('dd');
      dd.textContent = value;
      list.append(dt, dd);
    }

    const link = document.createElement('a');
    link.href = '/barangays';
    link.className = 'map-detail-link';
    link.textContent = 'All 40 barangays →';

    detail.append(title, list, link);
  }

  function renderPinDetail(pin: Pin) {
    if (!detail) return;
    detail.replaceChildren();

    const title = document.createElement('p');
    title.className = 'map-detail-title';
    title.textContent = peso(pin.amount);

    const description = document.createElement('p');
    description.className = 'map-detail-description';
    description.textContent = pin.description;

    const list = document.createElement('dl');
    list.className = 'map-detail-list';
    const rows: [string, string][] = [
      ['Contract', pin.id],
      ['Barangay', pin.barangay ?? 'Not matched to a polygon'],
      ['Year', pin.year],
      ['Status', pin.status],
    ];
    for (const [label, value] of rows) {
      const dt = document.createElement('dt');
      dt.textContent = label;
      const dd = document.createElement('dd');
      dd.textContent = value;
      list.append(dt, dd);
    }

    const link = document.createElement('a');
    link.href = '/projects';
    link.className = 'map-detail-link';
    link.textContent = 'All contracts →';

    detail.append(title, description, list, link);
  }

  for (const tab of tabs) {
    tab.addEventListener('click', () => {
      const key = tab.dataset.mapLevel as LevelKey | undefined;
      if (key === 'country' || key === 'province' || key === 'bauan') selectLevel(key);
    });
  }

  for (const button of metrics) {
    button.addEventListener('click', () => {
      const key = button.dataset.mapMetric as MetricKey | undefined;
      if (key && key !== metric && key in METRICS) applyMetric(key);
    });
  }

  pinToggle?.addEventListener('change', () => {
    const level = built.bauan;
    if (level?.pinGroup) level.pinGroup.visible = Boolean(pinToggle.checked);
  });

  /* ---------------------------------------------------------------- */
  /* resize + loop                                                     */
  /* ---------------------------------------------------------------- */

  function resize() {
    const width = frameElement.clientWidth;
    const height = frameElement.clientHeight;
    if (width === 0 || height === 0) return;

    renderer.setSize(width, height, false);
    camera.aspect = width / height;
    camera.updateProjectionMatrix();
    snapCamera();
  }

  new ResizeObserver(resize).observe(frameElement);

  const initial = ensure('country');
  initial.group.visible = true;
  setOpacity(initial.group, 1);
  updateChrome('country');
  renderHint();
  snapCamera();

  // Deep links: /map?level=bauan&metric=contracts. Read these before the opening
  // dolly, so a level chosen from the URL is not dragged back to country framing.
  const params = new URLSearchParams(window.location.search);
  const startMetric = params.get('metric');
  if (startMetric && startMetric !== metric && startMetric in METRICS) {
    applyMetric(startMetric as MetricKey);
  }

  const startLevel = params.get('level');
  const deepLink = startLevel === 'province' || startLevel === 'bauan';

  if (!prefersReducedMotion && !deepLink) {
    stopCameraTween();
    const entry = cameraPosition(frameDistance()).multiplyScalar(1.24);
    camera.position.copy(entry);
    const target = cameraPosition(frameDistance());
    cameraTween = tween(1250, (t) => {
      camera.position.lerpVectors(entry, target, t);
    });
  }

  const startedAt = performance.now();

  function animate() {
    const now = performance.now();
    stepTweens(now);

    const t = (now - startedAt) / 1000;
    controls.update();

    built[current]?.group.traverse((object) => {
      if (!object.userData.pulse) return;
      const material = (object as THREE.Mesh).material as THREE.MeshBasicMaterial;
      material.opacity = 0.4 + Math.sin(t * 1.9) * 0.18;
      object.scale.setScalar(1 + Math.sin(t * 1.9) * 0.14);
    });

    const pins = built.bauan?.pinGroup;
    if (pins?.visible) {
      pins.children.forEach((pin, index) => {
        pin.scale.setScalar(1 + Math.sin(t * 2 + index * 0.6) * 0.12);
      });
    }

    renderer.render(scene, camera);
    requestAnimationFrame(animate);
  }

  resize();
  animate();

  if (deepLink) selectLevel(startLevel as LevelKey);
}
