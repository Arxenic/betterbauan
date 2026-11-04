/**
 * The Bauan Assistant's launcher: a small procedural robot, not the supplied
 * illustration.
 *
 * The design borrows the reference's cues — white shell, dark visor, two blue
 * eyes, green scarf, gold badge, a municipal-hall crown and a Philippine flag —
 * but everything is geometry. The eyes and head follow the cursor across the
 * viewport. The actual Sangguniang Bayan seal sits on the chest.
 *
 * The scene is deliberately tiny (a 96px launcher), so detail is reduced to
 * silhouettes. It is loaded lazily by Assistant.astro, after the page is idle.
 */
import * as THREE from 'three';
import { RoundedBoxGeometry } from 'three/examples/jsm/geometries/RoundedBoxGeometry.js';

const SEAL_URL = '/assets/bauan-seal-1024.png';

function flagTexture(): THREE.CanvasTexture {
  const canvas = document.createElement('canvas');
  canvas.width = 192;
  canvas.height = 120;
  const context = canvas.getContext('2d');
  if (!context) return new THREE.CanvasTexture(canvas);

  context.fillStyle = '#0038a8';
  context.fillRect(0, 0, 192, 60);
  context.fillStyle = '#ce1126';
  context.fillRect(0, 60, 192, 60);

  context.fillStyle = '#ffffff';
  context.beginPath();
  context.moveTo(0, 0);
  context.lineTo(84, 60);
  context.lineTo(0, 120);
  context.closePath();
  context.fill();

  // A small sun and three stars, enough to read at launcher scale.
  context.fillStyle = '#fcd116';
  context.beginPath();
  context.arc(25, 60, 9, 0, Math.PI * 2);
  context.fill();
  for (const [x, y] of [
    [18, 30],
    [18, 90],
    [45, 60],
  ]) {
    context.beginPath();
    context.arc(x, y, 3.2, 0, Math.PI * 2);
    context.fill();
  }

  const texture = new THREE.CanvasTexture(canvas);
  texture.colorSpace = THREE.SRGBColorSpace;
  return texture;
}

export function initBot() {
  const host = document.querySelector<HTMLElement>('[data-bot-canvas]');
  const root = document.querySelector<HTMLElement>('[data-assistant]');
  if (!host || !root) return;
  if (host.dataset.ready === 'true') return;

  let renderer: THREE.WebGLRenderer;
  try {
    renderer = new THREE.WebGLRenderer({ antialias: true, alpha: true, powerPreference: 'low-power' });
  } catch {
    root.removeAttribute('data-bot-ready');
    return;
  }

  const reduce = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
  renderer.setClearAlpha(0);
  renderer.outputColorSpace = THREE.SRGBColorSpace;
  renderer.toneMapping = THREE.ACESFilmicToneMapping;
  renderer.toneMappingExposure = 1.05;
  host.appendChild(renderer.domElement);
  host.dataset.ready = 'true';
  root.setAttribute('data-bot-ready', '');
  window.dispatchEvent(new CustomEvent('bb:botready'));

  const scene = new THREE.Scene();
  const camera = new THREE.PerspectiveCamera(30, 1, 0.1, 30);
  camera.position.set(0, 0.18, 5.55);
  camera.lookAt(0, 0.12, 0);

  const ambient = new THREE.HemisphereLight(0xffffff, 0x31473e, 1.55);
  scene.add(ambient);

  const key = new THREE.DirectionalLight(0xfff6e6, 3.1);
  key.position.set(-2.5, 4.5, 4);
  scene.add(key);

  const rim = new THREE.DirectionalLight(0x9fd8ff, 1.4);
  rim.position.set(3.2, 2.5, -3.5);
  scene.add(rim);

  const warm = new THREE.PointLight(0xe8a317, 1.1, 8);
  warm.position.set(0.8, -0.7, 2.2);
  scene.add(warm);

  const bot = new THREE.Group();
  scene.add(bot);

  const shell = new THREE.MeshPhysicalMaterial({
    color: 0xf7faf7,
    roughness: 0.34,
    metalness: 0.02,
    clearcoat: 0.45,
    clearcoatRoughness: 0.3,
  });

  const shellShade = new THREE.MeshPhysicalMaterial({
    color: 0xdfe8e1,
    roughness: 0.44,
    metalness: 0.03,
    clearcoat: 0.25,
  });

  const green = new THREE.MeshStandardMaterial({ color: 0x0e5537, roughness: 0.58, metalness: 0.05 });
  const greenLight = new THREE.MeshStandardMaterial({ color: 0x2e7d46, roughness: 0.5, metalness: 0.04 });
  const gold = new THREE.MeshStandardMaterial({ color: 0xe8a317, roughness: 0.28, metalness: 0.55 });
  const dark = new THREE.MeshPhysicalMaterial({
    color: 0x071013,
    roughness: 0.12,
    metalness: 0.45,
    clearcoat: 1,
    clearcoatRoughness: 0.08,
  });

  /* Head and visor --------------------------------------------------- */

  const head = new THREE.Group();
  head.position.y = 0.18;
  bot.add(head);

  const skull = new THREE.Mesh(new RoundedBoxGeometry(1.38, 1.14, 1.0, 6, 0.28), shell);
  skull.castShadow = true;
  head.add(skull);

  const visor = new THREE.Mesh(new RoundedBoxGeometry(1.08, 0.52, 0.16, 6, 0.15), dark);
  visor.position.set(0, 0.08, 0.48);
  head.add(visor);

  const visorLip = new THREE.Mesh(new RoundedBoxGeometry(1.12, 0.055, 0.18, 4, 0.02), shellShade);
  visorLip.position.set(0, 0.36, 0.5);
  head.add(visorLip);

  const eyes = new THREE.Group();
  eyes.position.set(0, 0.08, 0.57);
  head.add(eyes);

  const eyeMaterial = new THREE.MeshStandardMaterial({
    color: 0x8fe2ff,
    emissive: 0x3cb8ee,
    emissiveIntensity: 1.8,
    roughness: 0.2,
    metalness: 0.1,
  });

  for (const x of [-0.23, 0.23]) {
    const eye = new THREE.Mesh(new THREE.SphereGeometry(0.085, 20, 16), eyeMaterial);
    eye.scale.set(1, 1.25, 0.6);
    eye.position.x = x;
    eyes.add(eye);

    const glint = new THREE.Mesh(
      new THREE.SphereGeometry(0.026, 12, 10),
      new THREE.MeshBasicMaterial({ color: 0xffffff })
    );
    glint.position.set(x + 0.025, 0.045, 0.055);
    eyes.add(glint);
  }

  // Ears: a green disc inside a gold ring.
  for (const x of [-0.73, 0.73]) {
    const ear = new THREE.Mesh(new THREE.CylinderGeometry(0.17, 0.17, 0.1, 24), green);
    ear.rotation.z = Math.PI / 2;
    ear.position.set(x, 0.12, 0);
    head.add(ear);

    const ring = new THREE.Mesh(new THREE.TorusGeometry(0.125, 0.022, 8, 28), gold);
    ring.rotation.y = Math.PI / 2;
    ring.position.set(x + (x > 0 ? 0.055 : -0.055), 0.12, 0);
    head.add(ring);
  }

  /* Municipal hall crown and flag ------------------------------------ */

  const crown = new THREE.Group();
  crown.position.set(0, 0.86, -0.04);
  crown.scale.setScalar(0.78);
  bot.add(crown);

  const base = new THREE.Mesh(new THREE.BoxGeometry(1.16, 0.1, 0.28), shellShade);
  crown.add(base);

  for (const x of [-0.42, 0, 0.42]) {
    const column = new THREE.Mesh(new THREE.CylinderGeometry(0.05, 0.055, 0.36, 12), shell);
    column.position.set(x, 0.22, 0.03);
    crown.add(column);
  }

  const lintel = new THREE.Mesh(new THREE.BoxGeometry(1.05, 0.09, 0.24), shell);
  lintel.position.set(0, 0.42, 0.02);
  crown.add(lintel);

  const pedimentShape = new THREE.Shape();
  pedimentShape.moveTo(-0.64, 0);
  pedimentShape.lineTo(0, 0.34);
  pedimentShape.lineTo(0.64, 0);
  pedimentShape.closePath();
  const pediment = new THREE.Mesh(
    new THREE.ExtrudeGeometry(pedimentShape, { depth: 0.2, bevelEnabled: false }),
    gold
  );
  pediment.position.set(0, 0.46, -0.08);
  crown.add(pediment);

  const crownSeal = new THREE.Mesh(new THREE.CircleGeometry(0.075, 24), gold);
  crownSeal.position.set(0, 0.62, 0.03);
  crown.add(crownSeal);

  const flagPole = new THREE.Mesh(new THREE.CylinderGeometry(0.012, 0.012, 1.1, 8), gold);
  flagPole.position.set(0.79, 0.4, -0.05);
  crown.add(flagPole);

  const flag = new THREE.Mesh(
    new THREE.PlaneGeometry(0.36, 0.225),
    new THREE.MeshStandardMaterial({ map: flagTexture(), side: THREE.DoubleSide, roughness: 0.7 })
  );
  flag.position.set(1.0, 0.7, -0.04);
  crown.add(flag);

  /* Scarf, body, badge ----------------------------------------------- */

  const scarf = new THREE.Mesh(new THREE.TorusGeometry(0.5, 0.105, 12, 40), green);
  scarf.rotation.x = Math.PI / 2;
  scarf.position.y = -0.43;
  scarf.scale.z = 0.78;
  bot.add(scarf);

  const scarfTail = new THREE.Mesh(new THREE.BoxGeometry(0.18, 0.42, 0.08), greenLight);
  scarfTail.position.set(0.32, -0.64, 0.24);
  scarfTail.rotation.z = -0.25;
  bot.add(scarfTail);

  const body = new THREE.Mesh(new RoundedBoxGeometry(1.02, 0.84, 0.72, 6, 0.22), shell);
  body.position.y = -0.82;
  bot.add(body);

  const chest = new THREE.Mesh(new THREE.CircleGeometry(0.24, 40), gold);
  chest.position.set(0, -0.78, 0.37);
  bot.add(chest);

  const chestInner = new THREE.Mesh(
    new THREE.CircleGeometry(0.2, 40),
    new THREE.MeshStandardMaterial({ color: 0x0e5537, roughness: 0.45, metalness: 0.08 })
  );
  chestInner.position.set(0, -0.78, 0.375);
  bot.add(chestInner);

  const sealTexture = new THREE.TextureLoader().load(SEAL_URL, (texture) => {
    texture.colorSpace = THREE.SRGBColorSpace;
    texture.anisotropy = renderer.capabilities.getMaxAnisotropy();
    const badge = new THREE.Mesh(
      new THREE.CircleGeometry(0.185, 40),
      new THREE.MeshStandardMaterial({ map: texture, transparent: true, roughness: 0.5 })
    );
    badge.position.set(0, -0.78, 0.382);
    bot.add(badge);
  });
  sealTexture.colorSpace = THREE.SRGBColorSpace;

  const baseRing = new THREE.Mesh(new THREE.TorusGeometry(0.92, 0.025, 8, 72), gold);
  baseRing.rotation.x = Math.PI / 2;
  baseRing.position.y = -1.28;
  bot.add(baseRing);

  const dust = new THREE.Points(
    new THREE.BufferGeometry(),
    new THREE.PointsMaterial({ color: 0xe8a317, size: 0.03, transparent: true, opacity: 0.55 })
  );
  const dustPositions = new Float32Array(26 * 3);
  for (let index = 0; index < 26; index += 1) {
    const angle = Math.random() * Math.PI * 2;
    const radius = 1.1 + Math.random() * 0.9;
    dustPositions[index * 3] = Math.cos(angle) * radius;
    dustPositions[index * 3 + 1] = -0.6 + Math.random() * 1.9;
    dustPositions[index * 3 + 2] = -0.5 + Math.random() * 0.4;
  }
  dust.geometry.setAttribute('position', new THREE.BufferAttribute(dustPositions, 3));
  bot.add(dust);

  /* Eye tracking ----------------------------------------------------- */

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
    renderer.toneMappingExposure = isDark ? 0.92 : 1.05;
    ambient.intensity = isDark ? 1.2 : 1.55;
    key.intensity = isDark ? 2.7 : 3.1;
    rim.intensity = isDark ? 1.7 : 1.4;
  };
  applyTheme();
  window.addEventListener('bb:themechange', applyTheme as EventListener);

  /* Sizing and loop -------------------------------------------------- */

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
  let nextBlink = 2600 + Math.random() * 3200;
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
    const delta = now - startedAt;

    lookX += (pointerX - lookX) * 0.08;
    lookY += (pointerY - lookY) * 0.08;

    if (!reduce) {
      head.rotation.y = lookX * 0.3 + Math.sin(t * 0.52) * 0.025;
      head.rotation.x = lookY * 0.16 + Math.sin(t * 0.38) * 0.015;
      eyes.position.x = lookX * 0.045;
      eyes.position.y = 0.08 - lookY * 0.032;
      bot.position.y = Math.sin(t * 0.95) * 0.035;
      bot.rotation.z = Math.sin(t * 0.4) * 0.008;
      dust.rotation.y = t * 0.08;

      if (delta > nextBlink) {
        blinkingUntil = now + 110;
        nextBlink = delta + 2600 + Math.random() * 3600;
      }
      const blink = now < blinkingUntil ? 0.12 : 1;
      eyes.scale.y += (blink - eyes.scale.y) * 0.45;
    }

    flag.rotation.y = reduce ? 0 : Math.sin(t * 1.4) * 0.12;

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
    sealTexture.dispose();
    renderer.dispose();
  });
}
