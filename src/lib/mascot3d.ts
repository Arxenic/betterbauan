/**
 * The BetterBauan mascot: a small sun-keeper built from the municipal mark.
 *
 * The gold sun and the green ridges are the two shapes residents already read on
 * the town's emblem. Here they become a character: a smiling sun with leaf rays
 * and a cream barong, holding the public ledger above a blue-green wave. It is
 * deliberately not the Sangguniang Bayan seal, and it is not a robot.
 *
 * Everything is procedural geometry, so there is no model download and no
 * third-party request. A supplied GLB can replace it by adding
 * `data-model="/assets/your-file.glb"` to `[data-bot-canvas]`; the loader will
 * find a node whose name contains "head" and turn only that node toward the
 * cursor. Without a rig, the whole model turns.
 *
 * Loaded lazily by Assistant.astro after the page is idle, and the head follows
 * the pointer across the viewport.
 */
import * as THREE from 'three';
import { RoundedBoxGeometry } from 'three/examples/jsm/geometries/RoundedBoxGeometry.js';

type MascotRig = {
  root: THREE.Object3D;
  head: THREE.Object3D;
  baseY: number;
  eyes?: THREE.Group;
  eyesBase?: THREE.Vector3;
  wave?: THREE.Object3D;
  ledger?: THREE.Object3D;
  particles?: THREE.Points;
  supplied?: boolean;
};

const COLORS = {
  gold: 0xf0b02a,
  goldLight: 0xffd35f,
  goldDeep: 0xd88a0b,
  leaf: 0x2f8f5b,
  leafDeep: 0x176b45,
  cream: 0xfffbf1,
  creamShade: 0xece4d0,
  coral: 0xef6b4f,
  sea: 0x2a9bc4,
  seaDeep: 0x14708f,
  ink: 0x123a2b,
};

function leafGeometry() {
  const shape = new THREE.Shape();
  shape.moveTo(0, 0);
  shape.bezierCurveTo(0.17, 0.2, 0.2, 0.56, 0, 0.84);
  shape.bezierCurveTo(-0.2, 0.56, -0.17, 0.2, 0, 0);
  return new THREE.ExtrudeGeometry(shape, {
    depth: 0.07,
    bevelEnabled: true,
    bevelSize: 0.022,
    bevelThickness: 0.018,
    bevelSegments: 2,
    curveSegments: 14,
  });
}

function buildMascot(): MascotRig {
  const root = new THREE.Group();

  const gold = new THREE.MeshStandardMaterial({
    color: COLORS.gold,
    roughness: 0.32,
    metalness: 0.32,
  });
  const goldLight = new THREE.MeshStandardMaterial({
    color: COLORS.goldLight,
    roughness: 0.26,
    metalness: 0.38,
  });
  const leaf = new THREE.MeshStandardMaterial({
    color: COLORS.leaf,
    roughness: 0.5,
    metalness: 0.04,
  });
  const leafDeep = new THREE.MeshStandardMaterial({
    color: COLORS.leafDeep,
    roughness: 0.55,
    metalness: 0.03,
  });
  const cream = new THREE.MeshPhysicalMaterial({
    color: COLORS.cream,
    roughness: 0.42,
    metalness: 0.02,
    clearcoat: 0.35,
    clearcoatRoughness: 0.35,
  });
  const creamShade = new THREE.MeshStandardMaterial({
    color: COLORS.creamShade,
    roughness: 0.55,
    metalness: 0.02,
  });
  const sea = new THREE.MeshStandardMaterial({
    color: COLORS.sea,
    roughness: 0.42,
    metalness: 0.08,
  });
  const seaDeep = new THREE.MeshStandardMaterial({
    color: COLORS.seaDeep,
    roughness: 0.5,
    metalness: 0.05,
  });
  const ink = new THREE.MeshStandardMaterial({
    color: COLORS.ink,
    roughness: 0.3,
    metalness: 0.05,
  });
  const white = new THREE.MeshBasicMaterial({ color: 0xffffff });

  /* Head: the gold sun ------------------------------------------------ */

  const head = new THREE.Group();
  head.position.y = 0.6;
  root.add(head);

  const face = new THREE.Mesh(new THREE.SphereGeometry(0.61, 48, 36), gold);
  face.scale.set(1, 0.97, 0.92);
  face.castShadow = true;
  head.add(face);

  // A warm inner glow along the lower face, so the head reads as a sun rather
  // than a yellow ball.
  const faceWash = new THREE.Mesh(
    new THREE.SphereGeometry(0.555, 36, 28),
    new THREE.MeshBasicMaterial({ color: 0xffdf82, transparent: true, opacity: 0.18 })
  );
  faceWash.position.set(0, -0.12, 0.08);
  faceWash.scale.set(1, 0.86, 0.9);
  head.add(faceWash);

  const eyes = new THREE.Group();
  eyes.position.set(0, 0.06, 0.545);
  head.add(eyes);

  for (const x of [-0.215, 0.215]) {
    const eye = new THREE.Mesh(new THREE.SphereGeometry(0.062, 22, 18), ink);
    eye.scale.set(1, 1.25, 0.62);
    eye.position.x = x;
    eyes.add(eye);

    const glint = new THREE.Mesh(new THREE.SphereGeometry(0.019, 10, 8), white);
    glint.position.set(x + 0.022, 0.032, 0.05);
    eyes.add(glint);
  }

  const smile = new THREE.Mesh(
    new THREE.TorusGeometry(0.155, 0.024, 8, 28, Math.PI),
    ink
  );
  smile.position.set(0, -0.115, 0.56);
  smile.rotation.z = Math.PI;
  head.add(smile);

  for (const x of [-0.34, 0.34]) {
    const cheek = new THREE.Mesh(
      new THREE.CircleGeometry(0.052, 20),
      new THREE.MeshBasicMaterial({ color: COLORS.coral, transparent: true, opacity: 0.72 })
    );
    cheek.position.set(x, -0.035, 0.535);
    cheek.scale.set(1, 0.62, 1);
    head.add(cheek);
  }

  // The rays are leaves: six gold for the sun, six green for the ridges.
  const ray = leafGeometry();
  for (let index = 0; index < 12; index += 1) {
    const angle = (index / 12) * Math.PI * 2;
    const pivot = new THREE.Group();
    pivot.rotation.z = angle;
    pivot.position.z = -0.02;
    head.add(pivot);

    const blade = new THREE.Mesh(ray, index % 2 === 0 ? gold : leaf);
    blade.position.y = 0.55;
    blade.position.z = -0.035;
    blade.rotation.z = 0.02;
    blade.scale.setScalar(index % 2 === 0 ? 0.56 : 0.62);
    blade.castShadow = true;
    pivot.add(blade);
  }

  // A thin halo catches the light behind the sun without becoming a logo ring.
  const halo = new THREE.Mesh(
    new THREE.TorusGeometry(0.905, 0.012, 8, 72),
    new THREE.MeshBasicMaterial({ color: COLORS.goldLight, transparent: true, opacity: 0.42 })
  );
  halo.position.set(0, 0.52, -0.14);
  root.add(halo);

  /* Body: a cream barong and the public ledger ----------------------- */

  const body = new THREE.Group();
  body.position.y = -0.47;
  root.add(body);

  const torso = new THREE.Mesh(new RoundedBoxGeometry(0.8, 0.74, 0.5, 6, 0.2), cream);
  torso.castShadow = true;
  body.add(torso);

  const collar = new THREE.Mesh(new THREE.TorusGeometry(0.245, 0.048, 10, 36), leaf);
  collar.rotation.x = Math.PI / 2;
  collar.position.y = 0.34;
  body.add(collar);

  const collarLeaf = new THREE.Mesh(ray);
  collarLeaf.material = leafDeep;
  collarLeaf.scale.setScalar(0.28);
  collarLeaf.position.set(0.21, 0.28, 0.25);
  collarLeaf.rotation.z = -0.8;
  body.add(collarLeaf);

  const badgeRing = new THREE.Mesh(new THREE.CircleGeometry(0.145, 32), gold);
  badgeRing.position.set(0, -0.03, 0.262);
  body.add(badgeRing);

  const badge = new THREE.Mesh(new THREE.CircleGeometry(0.105, 32), leafDeep);
  badge.position.set(0, -0.03, 0.268);
  body.add(badge);

  const badgeSun = new THREE.Mesh(new THREE.CircleGeometry(0.045, 24), goldLight);
  badgeSun.position.set(0, -0.03, 0.272);
  body.add(badgeSun);

  // Shoulder leaves, a quiet callback to the ridges in the mark.
  for (const direction of [-1, 1]) {
    const shoulder = new THREE.Mesh(ray, direction < 0 ? leaf : leafDeep);
    shoulder.scale.setScalar(0.34);
    shoulder.position.set(direction * 0.33, 0.31, 0.02);
    shoulder.rotation.z = direction * 1.05;
    body.add(shoulder);
  }

  const armGeometry = new THREE.CapsuleGeometry(0.085, 0.26, 6, 14);
  for (const direction of [-1, 1]) {
    const arm = new THREE.Mesh(armGeometry, cream);
    arm.position.set(direction * 0.44, -0.06, 0.04);
    arm.rotation.z = direction * 0.38;
    arm.castShadow = true;
    body.add(arm);

    const cuff = new THREE.Mesh(new THREE.TorusGeometry(0.088, 0.022, 8, 20), leaf);
    cuff.rotation.x = Math.PI / 2;
    cuff.position.set(direction * 0.49, -0.02, 0.04);
    body.add(cuff);

    const hand = new THREE.Mesh(new THREE.SphereGeometry(0.091, 18, 14), goldLight);
    hand.position.set(direction * 0.52, -0.2, 0.1);
    body.add(hand);
  }

  const ledger = new THREE.Group();
  ledger.position.set(0.32, -0.3, 0.31);
  ledger.rotation.set(-0.18, -0.35, -0.16);
  body.add(ledger);

  const cover = new THREE.Mesh(new RoundedBoxGeometry(0.34, 0.42, 0.1, 4, 0.035), leafDeep);
  cover.castShadow = true;
  ledger.add(cover);

  const pages = new THREE.Mesh(new RoundedBoxGeometry(0.29, 0.36, 0.045, 4, 0.018), creamShade);
  pages.position.set(0.035, 0, 0.04);
  ledger.add(pages);

  for (let line = 0; line < 3; line += 1) {
    const rule = new THREE.Mesh(new THREE.BoxGeometry(0.18, 0.018, 0.012), gold);
    rule.position.set(-0.015, 0.08 - line * 0.075, 0.068);
    ledger.add(rule);
  }

  /* Wave base -------------------------------------------------------- */

  const wave = new THREE.Group();
  wave.position.y = -1.04;
  root.add(wave);

  const waveRing = new THREE.Mesh(new THREE.TorusGeometry(0.72, 0.035, 8, 64), sea);
  waveRing.rotation.x = Math.PI / 2;
  waveRing.scale.z = 0.48;
  wave.add(waveRing);

  const waveInner = new THREE.Mesh(new THREE.TorusGeometry(0.51, 0.024, 8, 56), seaDeep);
  waveInner.rotation.x = Math.PI / 2;
  waveInner.scale.z = 0.42;
  waveInner.position.y = 0.035;
  wave.add(waveInner);

  const crest = new THREE.Mesh(new THREE.TorusGeometry(0.17, 0.032, 8, 24, Math.PI), leaf);
  crest.rotation.set(0, 0.2, 0.1);
  crest.position.set(-0.42, 0.06, 0.24);
  wave.add(crest);

  const crest2 = new THREE.Mesh(new THREE.TorusGeometry(0.13, 0.026, 8, 20, Math.PI), sea);
  crest2.rotation.set(0, -0.2, -0.2);
  crest2.position.set(0.44, 0.1, 0.18);
  wave.add(crest2);

  /* Floating leaves --------------------------------------------------- */

  const particleCount = 18;
  const particlePositions = new Float32Array(particleCount * 3);
  for (let index = 0; index < particleCount; index += 1) {
    const angle = Math.random() * Math.PI * 2;
    const radius = 0.95 + Math.random() * 0.8;
    particlePositions[index * 3] = Math.cos(angle) * radius;
    particlePositions[index * 3 + 1] = -0.55 + Math.random() * 2.2;
    particlePositions[index * 3 + 2] = -0.55 + Math.random() * 0.45;
  }

  const particles = new THREE.Points(
    new THREE.BufferGeometry().setAttribute(
      'position',
      new THREE.BufferAttribute(particlePositions, 3)
    ),
    new THREE.PointsMaterial({
      color: COLORS.goldLight,
      size: 0.035,
      transparent: true,
      opacity: 0.6,
      depthWrite: false,
    })
  );
  root.add(particles);

  return {
    root,
    head,
    baseY: 0,
    eyes,
    eyesBase: eyes.position.clone(),
    wave,
    ledger,
    particles,
  };
}

async function loadSuppliedModel(url: string): Promise<MascotRig | null> {
  try {
    const { GLTFLoader } = await import('three/examples/jsm/loaders/GLTFLoader.js');
    const gltf = await new GLTFLoader().loadAsync(url);
    const root = gltf.scene;

    root.updateMatrixWorld(true);
    const bounds = new THREE.Box3().setFromObject(root);
    const size = bounds.getSize(new THREE.Vector3());
    if (!Number.isFinite(size.y) || size.y <= 0.001) return null;

    root.scale.multiplyScalar(2.65 / size.y);
    root.updateMatrixWorld(true);

    const scaled = new THREE.Box3().setFromObject(root);
    const center = scaled.getCenter(new THREE.Vector3());
    root.position.x -= center.x;
    root.position.z -= center.z;
    root.position.y -= scaled.min.y + 1.12;

    let headNode: THREE.Object3D | null = null;
    root.traverse((node) => {
      if (!headNode && node !== root && /(^|[_\s.-])head($|[_\s.-])/i.test(node.name)) {
        headNode = node;
      }
      if (node instanceof THREE.Mesh) {
        node.castShadow = true;
        node.receiveShadow = true;
      }
    });

    return {
      root,
      head: headNode ?? root,
      baseY: root.position.y,
      supplied: true,
    };
  } catch {
    return null;
  }
}

export async function initMascot() {
  const host = document.querySelector<HTMLElement>('[data-bot-canvas]');
  const root = document.querySelector<HTMLElement>('[data-assistant]');
  if (!host || !root) return;
  if (host.dataset.ready === 'true') return;

  let renderer: THREE.WebGLRenderer;
  try {
    renderer = new THREE.WebGLRenderer({
      antialias: true,
      alpha: true,
      powerPreference: 'low-power',
    });
  } catch {
    root.removeAttribute('data-bot-ready');
    return;
  }

  const reduce = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
  renderer.setClearAlpha(0);
  renderer.outputColorSpace = THREE.SRGBColorSpace;
  renderer.toneMapping = THREE.ACESFilmicToneMapping;
  renderer.toneMappingExposure = 1.06;
  host.appendChild(renderer.domElement);

  const scene = new THREE.Scene();
  const camera = new THREE.PerspectiveCamera(30, 1, 0.1, 30);
  camera.position.set(0, 0.16, 6.35);
  camera.lookAt(0, 0.12, 0);

  const ambient = new THREE.HemisphereLight(0xfff4d9, 0x1d5d3a, 1.6);
  scene.add(ambient);

  const key = new THREE.DirectionalLight(0xfff2d4, 3.2);
  key.position.set(-3, 5, 5);
  scene.add(key);

  const rim = new THREE.DirectionalLight(0x78d7ff, 1.55);
  rim.position.set(3.2, 2.8, -4);
  scene.add(rim);

  const warm = new THREE.PointLight(0xffb84d, 1.8, 9);
  warm.position.set(0.7, -1.1, 2.6);
  scene.add(warm);

  const bot = new THREE.Group();
  scene.add(bot);

  const supplied = host.dataset.model;
  const suppliedRig = supplied ? await loadSuppliedModel(supplied) : null;
  const rig = suppliedRig ?? buildMascot();
  bot.add(rig.root);
  host.dataset.ready = 'true';
  root.setAttribute('data-bot-ready', '');
  window.dispatchEvent(new CustomEvent('bb:botready'));

  /* Look at the cursor ------------------------------------------------- */

  let pointerX = 0;
  let pointerY = 0;
  let lookX = 0;
  let lookY = 0;

  window.addEventListener(
    'pointermove',
    (event) => {
      pointerX = (event.clientX / window.innerWidth) * 2 - 1;
      pointerY = (event.clientY / window.innerHeight) * 2 - 1;
    },
    { passive: true }
  );

  const applyTheme = () => {
    const isDark = document.documentElement.dataset.theme === 'dark';
    renderer.toneMappingExposure = isDark ? 0.92 : 1.06;
    ambient.intensity = isDark ? 1.2 : 1.6;
    key.intensity = isDark ? 2.75 : 3.2;
    rim.intensity = isDark ? 1.85 : 1.55;
    warm.intensity = isDark ? 1.45 : 1.8;
  };
  applyTheme();
  window.addEventListener('bb:themechange', applyTheme as EventListener);

  /* Sizing and loop ---------------------------------------------------- */

  function fit() {
    const width = host!.clientWidth;
    const height = host!.clientHeight;
    if (!width || !height) return;
    renderer.setSize(width, height, false);
    camera.aspect = width / height;
    camera.updateProjectionMatrix();
  }

  const startedAt = performance.now();
  let frame = 0;
  let nextBlink = 2300 + Math.random() * 3000;
  let blinkingUntil = 0;
  let visible = true;

  const observer = new IntersectionObserver((entries) => {
    visible = entries[0]?.isIntersecting ?? true;
  });
  observer.observe(host);

  document.addEventListener('visibilitychange', () => {
    visible = !document.hidden;
  });

  function render(now: number) {
    const t = (now - startedAt) / 1000;
    const elapsed = now - startedAt;

    lookX += (pointerX - lookX) * 0.09;
    lookY += (pointerY - lookY) * 0.09;

    if (!reduce) {
      const yaw = rig.supplied ? 0.4 : 0.62;
      const pitch = rig.supplied ? 0.2 : 0.32;
      rig.head.rotation.y = lookX * yaw;
      rig.head.rotation.x = lookY * pitch;
      rig.head.rotation.z = -lookX * 0.055;

      rig.root.position.y = rig.baseY + Math.sin(t * 0.92) * 0.03;
      rig.root.rotation.z = Math.sin(t * 0.44) * 0.008;

      if (rig.eyes && rig.eyesBase) {
        rig.eyes.position.x = rig.eyesBase.x + lookX * 0.03;
        rig.eyes.position.y = rig.eyesBase.y - lookY * 0.022;
      }

      if (rig.wave) rig.wave.rotation.y = t * 0.28;
      if (rig.ledger) rig.ledger.rotation.z = -0.16 + Math.sin(t * 1.15) * 0.018;
      if (rig.particles) rig.particles.rotation.y = t * 0.075;

      if (rig.eyes) {
        if (elapsed > nextBlink) {
          blinkingUntil = now + 105;
          nextBlink = elapsed + 2400 + Math.random() * 3400;
        }
        const blink = now < blinkingUntil ? 0.12 : 1;
        rig.eyes.scale.y += (blink - rig.eyes.scale.y) * 0.45;
      }
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
  }).observe(host);
  render(startedAt);

  if (!reduce) {
    frame = requestAnimationFrame(loop);
  }

  window.addEventListener('pagehide', () => {
    cancelAnimationFrame(frame);
    renderer.dispose();
  });
}
