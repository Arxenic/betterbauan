/**
 * The Bauan emblem, built as real geometry rather than a picture.
 *
 * The composition follows the municipal mark: a gold sun over two green
 * ridges, the white municipal hall with its arched portal, a palm on the left,
 * the sea in three bands below, and terraced fields on the right. Every shape is
 * an extruded path, so the object has depth and can be lit and turned.
 *
 * No image, texture, model file or network request is involved. The only
 * dependency is the bundled three.js.
 */
import * as THREE from 'three';

const COLORS = {
  gold: 0xe8a317,
  goldDeep: 0xd2870b,
  hillDark: 0x0d4b31,
  hill: 0x1f6b3a,
  hillLight: 0x2e7d46,
  terrace: 0x58a85c,
  paper: 0xf4f7f4,
  paperShade: 0xdfe7e1,
  door: 0x0e5537,
  seaDeep: 0x0a4066,
  sea: 0x0c5b87,
  seaLight: 0x1a7fb4,
};

type Options = { depth: number; color: number; z?: number; bevel?: number; emissive?: number };

function extrude(shape: THREE.Shape, options: Options) {
  const bevel = options.bevel ?? 0.025;
  const geometry = new THREE.ExtrudeGeometry(shape, {
    depth: options.depth,
    bevelEnabled: bevel > 0,
    bevelSize: bevel,
    bevelThickness: bevel,
    bevelSegments: 2,
    curveSegments: 16,
  });

  const material = new THREE.MeshStandardMaterial({
    color: options.color,
    roughness: 0.62,
    metalness: 0.04,
    emissive: options.emissive ?? 0x000000,
    emissiveIntensity: options.emissive ? 0.22 : 0,
  });

  const mesh = new THREE.Mesh(geometry, material);
  mesh.position.z = options.z ?? 0;
  mesh.castShadow = true;
  mesh.receiveShadow = true;
  return mesh;
}

function rect(x: number, y: number, width: number, height: number) {
  const shape = new THREE.Shape();
  shape.moveTo(x, y);
  shape.lineTo(x + width, y);
  shape.lineTo(x + width, y + height);
  shape.lineTo(x, y + height);
  shape.closePath();
  return shape;
}

function ridge(points: [number, number][]) {
  const shape = new THREE.Shape();
  shape.moveTo(points[0][0], points[0][1]);
  for (const [x, y] of points.slice(1)) shape.lineTo(x, y);
  shape.closePath();
  return shape;
}

function waveBand(halfWidth: number, amplitude: number, thickness: number) {
  const shape = new THREE.Shape();
  const step = 0.1;

  shape.moveTo(-halfWidth, 0);
  for (let x = -halfWidth; x <= halfWidth; x += step) {
    shape.lineTo(x, Math.sin((x + halfWidth) * 1.45) * amplitude);
  }
  shape.lineTo(halfWidth, -thickness);
  for (let x = halfWidth; x >= -halfWidth; x -= step) {
    shape.lineTo(x, -thickness + Math.sin((x + halfWidth) * 1.45) * amplitude * 0.6);
  }
  shape.closePath();
  return shape;
}

function doorShape() {
  const shape = new THREE.Shape();
  shape.moveTo(-0.42, -0.02);
  shape.lineTo(-0.42, 0.5);
  shape.absarc(0, 0.5, 0.42, Math.PI, 0, true);
  shape.lineTo(0.42, -0.02);
  shape.closePath();

  const hole = new THREE.Path();
  hole.moveTo(-0.27, -0.02);
  hole.lineTo(-0.27, 0.46);
  hole.absarc(0, 0.46, 0.27, Math.PI, 0, true);
  hole.lineTo(0.27, -0.02);
  hole.closePath();
  shape.holes.push(hole);

  return shape;
}

function leafShape() {
  const shape = new THREE.Shape();
  shape.moveTo(0, 0);
  shape.bezierCurveTo(0.18, 0.2, 0.55, 0.24, 0.86, 0.06);
  shape.bezierCurveTo(0.55, -0.05, 0.18, -0.04, 0, 0);
  shape.closePath();
  return shape;
}

export function initEmblem() {
  const stage = document.querySelector<HTMLElement>('[data-emblem]');
  const fallback = document.querySelector<HTMLElement>('[data-emblem-fallback]');
  if (!stage) return;

  let renderer: THREE.WebGLRenderer;

  try {
    renderer = new THREE.WebGLRenderer({ antialias: true, alpha: true, powerPreference: 'high-performance' });
  } catch {
    fallback?.removeAttribute('hidden');
    return;
  }

  const reduce = window.matchMedia('(prefers-reduced-motion: reduce)').matches;

  renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
  renderer.setClearAlpha(0);
  renderer.toneMapping = THREE.ACESFilmicToneMapping;
  renderer.toneMappingExposure = 1.1;
  renderer.outputColorSpace = THREE.SRGBColorSpace;
  stage.appendChild(renderer.domElement);
  stage.dataset.ready = 'true';

  const scene = new THREE.Scene();
  const camera = new THREE.PerspectiveCamera(34, 1, 0.1, 100);

  const ambient = new THREE.HemisphereLight(0xffffff, 0x476056, 1.25);
  scene.add(ambient);

  const key = new THREE.DirectionalLight(0xfff4df, 2.35);
  key.position.set(-4, 9, 8);
  scene.add(key);

  const rim = new THREE.DirectionalLight(0xcfe8ff, 1.1);
  rim.position.set(7, 4, -6);
  scene.add(rim);

  const group = new THREE.Group();
  scene.add(group);

  /* Sun ------------------------------------------------------------- */

  const sun = new THREE.Group();
  sun.position.set(0.25, 2.05, -0.72);

  const disc = new THREE.Mesh(
    new THREE.CircleGeometry(0.95, 64),
    new THREE.MeshStandardMaterial({
      color: COLORS.gold,
      roughness: 0.38,
      metalness: 0.12,
      emissive: COLORS.gold,
      emissiveIntensity: 0.28,
    })
  );
  disc.position.z = 0.02;
  sun.add(disc);

  const rays = new THREE.Group();
  for (let index = 0; index < 8; index += 1) {
    const ray = new THREE.Mesh(
      new THREE.BoxGeometry(0.14, 0.5, 0.13),
      new THREE.MeshStandardMaterial({ color: COLORS.gold, roughness: 0.42, metalness: 0.1 })
    );
    const angle = (index / 8) * Math.PI * 2;
    const radius = 1.38;
    ray.position.set(Math.cos(angle) * radius, Math.sin(angle) * radius, 0);
    ray.rotation.z = angle - Math.PI / 2;
    rays.add(ray);
  }
  sun.add(rays);
  group.add(sun);

  /* Ridges ---------------------------------------------------------- */

  group.add(
    extrude(ridge([[-3.35, -0.6], [-1.6, 1.4], [-0.3, -0.6]]), {
      depth: 0.4,
      color: COLORS.hillDark,
      z: -0.42,
    })
  );

  group.add(
    extrude(ridge([[-0.95, -0.6], [0.7, 1.06], [2.6, -0.6]]), {
      depth: 0.42,
      color: COLORS.hill,
      z: -0.34,
    })
  );

  /* Hall ------------------------------------------------------------ */

  const hall = new THREE.Group();
  hall.position.z = 0.06;

  hall.add(extrude(rect(-2.3, -0.62, 4.6, 0.4), { depth: 0.42, color: COLORS.paper, z: 0 }));
  hall.add(extrude(rect(-1.58, -0.22, 3.16, 1.02), { depth: 0.34, color: COLORS.paper, z: 0.1 }));
  hall.add(extrude(rect(-1.76, 0.8, 3.52, 0.15), { depth: 0.4, color: COLORS.paper, z: 0.08 }));

  const wingGeometry = rect(0, 0, 0.82, 0.62);
  hall.add(
    extrude(wingGeometry, { depth: 0.3, color: COLORS.paperShade, z: 0.06 }).translateX(-2.32).translateY(-0.44)
  );
  hall.add(
    extrude(wingGeometry, { depth: 0.3, color: COLORS.paperShade, z: 0.06 }).translateX(1.5).translateY(-0.44)
  );

  for (const x of [-1.35, -0.95, -0.55, 0.55, 0.95, 1.35]) {
    hall.add(
      extrude(rect(x - 0.07, -0.18, 0.14, 0.92), {
        depth: 0.2,
        color: COLORS.paper,
        z: 0.46,
        bevel: 0.012,
      })
    );
  }

  hall.add(extrude(doorShape(), { depth: 0.16, color: COLORS.paper, z: 0.48, bevel: 0.012 }));

  // Three shallow steps in front of the facade.
  for (const [index, width] of [2.55, 2.9, 3.25].entries()) {
    hall.add(
      extrude(rect(-width / 2, -0.72 - index * 0.055, width, 0.06), {
        depth: 0.5,
        color: COLORS.paper,
        z: 0.1 + index * 0.06,
        bevel: 0.008,
      })
    );
  }

  // Doors in the wings.
  hall.add(extrude(rect(-2.2, -0.52, 0.36, 0.42), { depth: 0.06, color: COLORS.door, z: 0.4, bevel: 0 }));
  hall.add(extrude(rect(1.84, -0.52, 0.36, 0.42), { depth: 0.06, color: COLORS.door, z: 0.4, bevel: 0 }));

  group.add(hall);

  /* Palm ------------------------------------------------------------ */

  const palm = new THREE.Group();
  palm.position.set(-2.82, -0.5, 0.12);

  const trunkCurve = new THREE.CatmullRomCurve3([
    new THREE.Vector3(0, 0, 0),
    new THREE.Vector3(0.16, 0.5, 0.02),
    new THREE.Vector3(0.08, 1.0, 0.03),
    new THREE.Vector3(-0.18, 1.42, 0.02),
  ]);

  const trunk = new THREE.Mesh(
    new THREE.TubeGeometry(trunkCurve, 24, 0.055, 7, false),
    new THREE.MeshStandardMaterial({ color: 0x3e5a3a, roughness: 0.9 })
  );
  palm.add(trunk);

  const leaves = new THREE.Group();
  leaves.position.set(-0.18, 1.42, 0.02);

  for (let index = 0; index < 7; index += 1) {
    const leaf = extrude(leafShape(), {
      depth: 0.04,
      color: index % 2 === 0 ? COLORS.hill : COLORS.hillLight,
      z: 0,
      bevel: 0.006,
    });
    leaf.rotation.z = (index / 7) * Math.PI * 2 - Math.PI / 2;
    leaf.rotation.x = index % 2 === 0 ? 0.12 : -0.06;
    leaf.scale.setScalar(1 + (index % 3) * 0.08);
    leaves.add(leaf);
  }

  palm.add(leaves);
  group.add(palm);

  /* Terraces -------------------------------------------------------- */

  const terraces = new THREE.Group();
  for (const [index, y] of [-0.5, -0.24, 0.02].entries()) {
    const shape = new THREE.Shape();
    shape.moveTo(1.35, y);
    shape.quadraticCurveTo(2.3, y + 0.5, 3.15, y + 0.1);
    shape.quadraticCurveTo(2.3, y + 0.2, 1.35, y - 0.14);
    shape.closePath();

    terraces.add(
      extrude(shape, {
        depth: 0.14,
        color: index === 1 ? COLORS.terrace : COLORS.hillLight,
        z: 0.18 - index * 0.03,
        bevel: 0.012,
      })
    );
  }
  group.add(terraces);

  /* Sea ------------------------------------------------------------- */

  const waves: THREE.Mesh[] = [];
  const waveConfigs: { y: number; z: number; color: number; scale: number }[] = [
    { y: -0.86, z: 0.62, color: COLORS.seaLight, scale: 1 },
    { y: -1.06, z: 0.74, color: COLORS.sea, scale: 1.03 },
    { y: -1.26, z: 0.86, color: COLORS.seaDeep, scale: 1.06 },
  ];

  for (const [index, config] of waveConfigs.entries()) {
    const mesh = extrude(waveBand(3.5, 0.16 + index * 0.02, 0.24), {
      depth: 0.1,
      color: config.color,
      z: config.z,
      bevel: 0.015,
    });
    mesh.position.y = config.y;
    mesh.scale.x = config.scale;
    mesh.userData.baseY = config.y;
    waves.push(mesh);
    group.add(mesh);
  }

  /* Dust ------------------------------------------------------------ */

  const dustCount = 42;
  const positions = new Float32Array(dustCount * 3);
  for (let index = 0; index < dustCount; index += 1) {
    const radius = 2.4 + Math.random() * 2.2;
    const angle = Math.random() * Math.PI * 2;
    positions[index * 3] = Math.cos(angle) * radius;
    positions[index * 3 + 1] = -1.4 + Math.random() * 4.2;
    positions[index * 3 + 2] = -2 + Math.random() * 3;
  }

  const dustGeometry = new THREE.BufferGeometry();
  dustGeometry.setAttribute('position', new THREE.BufferAttribute(positions, 3));
  const dust = new THREE.Points(
    dustGeometry,
    new THREE.PointsMaterial({
      color: COLORS.gold,
      size: 0.035,
      transparent: true,
      opacity: 0.55,
      depthWrite: false,
    })
  );
  group.add(dust);

  /* Camera fit ------------------------------------------------------ */

  const bounds = new THREE.Box3().setFromObject(group);
  const size = bounds.getSize(new THREE.Vector3());
  const center = bounds.getCenter(new THREE.Vector3());

  function fit() {
    const width = stage!.clientWidth;
    const height = stage!.clientHeight;
    if (!width || !height) return;

    renderer.setSize(width, height, false);

    const aspect = width / height;
    camera.aspect = aspect;
    const vertical = THREE.MathUtils.degToRad(camera.fov);
    const horizontal = 2 * Math.atan(Math.tan(vertical / 2) * aspect);

    const byHeight = size.y / 2 / Math.tan(vertical / 2);
    const byWidth = size.x / 2 / Math.tan(horizontal / 2);
    const distance = Math.max(byHeight, byWidth) * 1.16;

    camera.position.set(center.x, center.y + 0.15, center.z + distance);
    camera.lookAt(center.x, center.y - 0.05, center.z);
    camera.updateProjectionMatrix();
  }

  /* Interaction ----------------------------------------------------- */

  let targetX = 0;
  let targetY = 0;
  let pointerX = 0;
  let pointerY = 0;

  stage.addEventListener('pointermove', (event) => {
    const rect = stage.getBoundingClientRect();
    targetX = ((event.clientX - rect.left) / rect.width) * 2 - 1;
    targetY = ((event.clientY - rect.top) / rect.height) * 2 - 1;
  });

  stage.addEventListener('pointerleave', () => {
    targetX = 0;
    targetY = 0;
  });

  const applyTheme = () => {
    const dark = document.documentElement.dataset.theme === 'dark';
    renderer.toneMappingExposure = dark ? 0.94 : 1.1;
    ambient.intensity = dark ? 1.05 : 1.25;
    key.intensity = dark ? 2.6 : 2.35;
    rim.intensity = dark ? 1.4 : 1.1;
  };

  applyTheme();
  window.addEventListener('bb:themechange', applyTheme as EventListener);

  /* Loop ------------------------------------------------------------ */

  const startedAt = performance.now();
  let visible = true;

  const observer = new IntersectionObserver((entries) => {
    visible = entries[0]?.isIntersecting ?? true;
  });
  observer.observe(stage);

  let scrollRatio = 0;
  const readScroll = () => {
    const rect = stage.getBoundingClientRect();
    scrollRatio = Math.min(1, Math.max(0, 1 - (rect.top + rect.height) / (window.innerHeight + rect.height)));
  };
  window.addEventListener('scroll', readScroll, { passive: true });
  readScroll();

  let frame = 0;

  function render(now: number) {
    const t = (now - startedAt) / 1000;
    pointerX += (targetX - pointerX) * 0.06;
    pointerY += (targetY - pointerY) * 0.06;

    if (!reduce) {
      group.rotation.y = -0.06 + pointerX * 0.26 + Math.sin(t * 0.32) * 0.03 + scrollRatio * 0.35;
      group.rotation.x = -0.015 + pointerY * 0.1;
      group.position.y = Math.sin(t * 0.68) * 0.055 - scrollRatio * 0.25;
      rays.rotation.z = t * 0.07;

      for (const [index, wave] of waves.entries()) {
        wave.position.y = (wave.userData.baseY as number) + Math.sin(t * 0.85 + index * 1.1) * 0.035;
        wave.rotation.z = Math.sin(t * 0.4 + index) * 0.004;
      }

      dust.rotation.y = t * 0.04;
      dust.position.y = Math.sin(t * 0.3) * 0.04;

      // A short assembly at first paint.
      const entrance = Math.min(1, t / 1.1);
      const eased = 1 - Math.pow(1 - entrance, 3);
      group.scale.setScalar(0.86 + 0.14 * eased);
    }

    renderer.render(scene, camera);
  }

  function loop(now: number) {
    if (visible) render(now);
    frame = requestAnimationFrame(loop);
  }

  fit();
  new ResizeObserver(() => {
    fit();
    if (reduce) render(performance.now());
  }).observe(stage);
  render(startedAt);

  if (!reduce) {
    frame = requestAnimationFrame(loop);
    window.addEventListener('pagehide', () => cancelAnimationFrame(frame), { once: true });
  }
}
