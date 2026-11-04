/**
 * The actual Sangguniang Bayan seal, struck as a two-sided medallion.
 *
 * The front is the seal supplied by the project (a local, committed PNG); the
 * back is a drawn record mark. The object is a real cylinder with a gold bezel,
 * so it has an edge, a front and a back — not a flat image pretending to turn.
 *
 * Drag to turn it, press the flip control, or double-click the coin. No network
 * request is made after the page loads; the seal is a bundled asset.
 */
import * as THREE from 'three';
import { RoomEnvironment } from 'three/examples/jsm/environments/RoomEnvironment.js';

const SEAL_URL = '/assets/bauan-seal-1024.png';

function drawBack() {
  const size = 1024;
  const canvas = document.createElement('canvas');
  canvas.width = size;
  canvas.height = size;
  const context = canvas.getContext('2d');
  if (!context) return canvas;

  const cx = size / 2;
  const cy = size / 2;

  context.fillStyle = '#0e5537';
  context.fillRect(0, 0, size, size);

  const wash = context.createRadialGradient(cx, cy * 0.72, 20, cx, cy, size * 0.7);
  wash.addColorStop(0, '#1d7652');
  wash.addColorStop(0.55, '#0e5537');
  wash.addColorStop(1, '#083a26');
  context.fillStyle = wash;
  context.fillRect(0, 0, size, size);

  // A thin record rule, then the sun and the two ridges.
  context.strokeStyle = 'rgba(232,163,23,0.55)';
  context.lineWidth = 3;
  context.beginPath();
  context.arc(cx, cy, 468, 0, Math.PI * 2);
  context.stroke();

  context.save();
  context.translate(cx, cy - 214);
  context.fillStyle = '#e8a317';
  context.beginPath();
  context.arc(0, 0, 78, 0, Math.PI * 2);
  context.fill();
  for (let index = 0; index < 16; index += 1) {
    const angle = (index / 16) * Math.PI * 2;
    context.save();
    context.rotate(angle);
    context.fillRect(-6, -132, 12, 32);
    context.restore();
  }
  context.restore();

  context.fillStyle = '#1f6b3a';
  context.beginPath();
  context.moveTo(116, 478);
  context.quadraticCurveTo(272, 300, 430, 478);
  context.closePath();
  context.fill();

  context.fillStyle = '#57a45f';
  context.beginPath();
  context.moveTo(360, 478);
  context.quadraticCurveTo(588, 268, 888, 478);
  context.closePath();
  context.fill();

  context.fillStyle = 'rgba(255,255,255,0.92)';
  context.textAlign = 'center';
  context.textBaseline = 'middle';

  context.font = '400 104px "Archivo Black", "Arial Black", Arial, sans-serif';
  context.fillText('BETTER', cx, 566);
  context.fillStyle = '#f3be4f';
  context.fillText('BAUAN', cx, 672);

  context.fillStyle = 'rgba(255,255,255,0.82)';
  context.font = 'italic 42px "Newsreader Variable", Georgia, serif';
  context.fillText('We are One in Bauan.', cx, 760);

  context.fillStyle = 'rgba(232,163,23,0.86)';
  context.font = '600 25px "Public Sans Variable", Arial, sans-serif';
  context.fillText('OPEN RECORD  ·  2026', cx, 826);

  // Three sea bands, the same gesture as the seal.
  context.strokeStyle = 'rgba(255,255,255,0.24)';
  context.lineWidth = 4;
  for (const [index, y] of [864, 886, 908].entries()) {
    context.beginPath();
    context.moveTo(210, y);
    context.bezierCurveTo(340, y - 12 + index * 3, 450, y + 12, 590, y);
    context.bezierCurveTo(700, y - 9, 770, y + 5, 814, y);
    context.stroke();
  }

  return canvas;
}

export function initSeal() {
  const stage = document.querySelector<HTMLElement>('[data-seal]');
  const fallback = document.querySelector<HTMLElement>('[data-seal-fallback]');
  if (!stage) return;

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

  const reduce = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
  renderer.setClearAlpha(0);
  renderer.toneMapping = THREE.ACESFilmicToneMapping;
  renderer.toneMappingExposure = 1.04;
  renderer.outputColorSpace = THREE.SRGBColorSpace;
  stage.appendChild(renderer.domElement);

  const scene = new THREE.Scene();
  const camera = new THREE.PerspectiveCamera(30, 1, 0.1, 80);
  camera.position.set(0, 0.08, 7.4);

  const ambient = new THREE.HemisphereLight(0xffffff, 0x385448, 0.9);
  scene.add(ambient);

  const key = new THREE.DirectionalLight(0xfff3dc, 3.1);
  key.position.set(-4.5, 6.5, 7);
  scene.add(key);

  const fill = new THREE.DirectionalLight(0xb9e3d2, 1.15);
  fill.position.set(5, 2, 5);
  scene.add(fill);

  const rim = new THREE.DirectionalLight(0xffd98a, 1.8);
  rim.position.set(0, 4, -7);
  scene.add(rim);

  const pmrem = new THREE.PMREMGenerator(renderer);
  const environment = pmrem.fromScene(new RoomEnvironment(), 0.04).texture;
  scene.environment = environment;

  const coin = new THREE.Group();
  scene.add(coin);

  const radius = 2.16;
  const thickness = 0.36;

  const gold = new THREE.MeshStandardMaterial({
    color: 0xbf9550,
    metalness: 0.82,
    roughness: 0.27,
  });

  const goldDeep = new THREE.MeshStandardMaterial({
    color: 0x8a642d,
    metalness: 0.78,
    roughness: 0.34,
  });

  const body = new THREE.Mesh(new THREE.CylinderGeometry(radius, radius, thickness, 128, 1, false), gold);
  body.rotation.x = Math.PI / 2;
  body.castShadow = true;
  coin.add(body);

  // Recessed beds keep the paper of the seal slightly below the bezel.
  const bed = new THREE.Mesh(
    new THREE.CylinderGeometry(radius - 0.075, radius - 0.075, thickness + 0.012, 128),
    new THREE.MeshStandardMaterial({ color: 0xf1eadc, roughness: 0.72, metalness: 0.02 })
  );
  bed.rotation.x = Math.PI / 2;
  coin.add(bed);

  // The seal is printed artwork, not a lit object. Basic material keeps the
  // supplied colours exact; the gold body and bezel around it carry the depth.
  const frontMaterial = new THREE.MeshBasicMaterial({
    color: 0xffffff,
    transparent: true,
    alphaTest: 0.02,
    toneMapped: false,
  });

  const front = new THREE.Mesh(new THREE.CircleGeometry(radius - 0.085, 128), frontMaterial);
  front.position.z = thickness / 2 + 0.012;
  front.rotation.z = 0;
  coin.add(front);

  const backTexture = new THREE.CanvasTexture(drawBack());
  backTexture.colorSpace = THREE.SRGBColorSpace;
  const backMaterial = new THREE.MeshBasicMaterial({
    map: backTexture,
    toneMapped: false,
  });

  const back = new THREE.Mesh(new THREE.CircleGeometry(radius - 0.085, 128), backMaterial);
  back.position.z = -thickness / 2 - 0.012;
  back.rotation.y = Math.PI;
  coin.add(back);

  for (const z of [thickness / 2 + 0.006, -thickness / 2 - 0.006]) {
    const bezel = new THREE.Mesh(new THREE.TorusGeometry(radius - 0.055, 0.042, 18, 160), gold);
    bezel.position.z = z;
    coin.add(bezel);

    const inner = new THREE.Mesh(new THREE.TorusGeometry(radius - 0.11, 0.012, 10, 160), goldDeep);
    inner.position.z = z;
    coin.add(inner);
  }

  // A few milled marks along the edge, so the medal reads as struck metal.
  for (let index = 0; index < 96; index += 1) {
    const angle = (index / 96) * Math.PI * 2;
    const mark = new THREE.Mesh(new THREE.BoxGeometry(0.012, 0.018, thickness * 0.7), goldDeep);
    mark.position.set(Math.cos(angle) * (radius + 0.001), Math.sin(angle) * (radius + 0.001), 0);
    mark.rotation.z = angle;
    coin.add(mark);
  }

  coin.rotation.x = -0.055;

  const loader = new THREE.TextureLoader();
  loader.load(
    SEAL_URL,
    (texture) => {
      texture.colorSpace = THREE.SRGBColorSpace;
      texture.anisotropy = renderer.capabilities.getMaxAnisotropy();
      frontMaterial.map = texture;
      frontMaterial.needsUpdate = true;
      stage.dataset.ready = 'true';
      fallback?.setAttribute('hidden', '');
      document.querySelectorAll<HTMLElement>('[data-seal-loading]').forEach((node) => {
        node.hidden = true;
      });
    },
    undefined,
    () => {
      fallback?.removeAttribute('hidden');
    }
  );

  /* ---------------------------------------------------------------- */
  /* interaction                                                       */
  /* ---------------------------------------------------------------- */

  let baseYaw = 0;
  let yaw = 0;
  let targetYaw = 0;
  let pitch = -0.055;
  let targetPitch = -0.055;
  let dragging = false;
  let lastX = 0;
  let lastY = 0;
  let moved = 0;
  let releaseAt = 0;
  let hover = 0;

  const clampPitch = (value: number) => THREE.MathUtils.clamp(value, -0.55, 0.55);

  stage.addEventListener('pointerdown', (event) => {
    dragging = true;
    moved = 0;
    lastX = event.clientX;
    lastY = event.clientY;
    stage.setPointerCapture(event.pointerId);
    stage.classList.add('is-dragging');
  });

  stage.addEventListener('pointermove', (event) => {
    if (!dragging) return;
    const dx = event.clientX - lastX;
    const dy = event.clientY - lastY;
    lastX = event.clientX;
    lastY = event.clientY;
    moved += Math.abs(dx) + Math.abs(dy);
    targetYaw += dx * 0.009;
    targetPitch = clampPitch(targetPitch + dy * 0.004);
  });

  const endDrag = () => {
    if (!dragging) return;
    dragging = false;
    baseYaw = targetYaw;
    releaseAt = performance.now();
    stage.classList.remove('is-dragging');
  };

  stage.addEventListener('pointerup', endDrag);
  stage.addEventListener('pointercancel', endDrag);
  stage.addEventListener('pointerleave', () => {
    if (dragging) endDrag();
    hover = 0;
  });
  stage.addEventListener('pointerenter', () => {
    hover = 1;
  });

  function flip() {
    targetYaw += Math.PI;
    baseYaw = targetYaw;
    releaseAt = performance.now();
  }

  stage.addEventListener('dblclick', flip);
  document.querySelectorAll<HTMLElement>('[data-seal-flip]').forEach((button) => {
    button.addEventListener('click', flip);
  });

  const applyTheme = () => {
    const dark = document.documentElement.dataset.theme === 'dark';
    renderer.toneMappingExposure = dark ? 0.9 : 1.04;
    ambient.intensity = dark ? 0.72 : 0.9;
    key.intensity = dark ? 2.7 : 3.1;
    fill.intensity = dark ? 0.9 : 1.15;
    rim.intensity = dark ? 2.2 : 1.8;
  };

  applyTheme();
  window.addEventListener('bb:themechange', applyTheme as EventListener);

  /* ---------------------------------------------------------------- */
  /* fit, loop                                                         */
  /* ---------------------------------------------------------------- */

  function fit() {
    const width = stage!.clientWidth;
    const height = stage!.clientHeight;
    if (!width || !height) return;
    renderer.setSize(width, height, false);
    camera.aspect = width / height;
    camera.updateProjectionMatrix();

    // Pull the camera back enough for the whole medal, with a little air for
    // the bezel and the tilt.
    const vertical = THREE.MathUtils.degToRad(camera.fov);
    const desired = Math.max(2.55 / Math.tan(vertical / 2), 2.55 / (Math.tan(vertical / 2) * camera.aspect));
    camera.position.z = Math.min(9.5, desired * 1.04);
    camera.updateProjectionMatrix();
  }

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
    const idle = now - releaseAt > 3400;

    if (!dragging && !reduce) {
      // A slow tilt, not a full carousel: the seal stays readable.
      const sway = Math.sin(t * 0.38) * 0.12 + Math.sin(t * 0.17) * 0.05;
      const target = baseYaw + sway + hover * 0.08;
      targetYaw += (target - targetYaw) * 0.012;
      targetPitch += (-0.055 + scrollRatio * 0.08 - 0.02 * hover - targetPitch) * 0.02;
    }

    yaw += (targetYaw - yaw) * 0.11;
    pitch += (targetPitch - pitch) * 0.11;

    coin.rotation.y = yaw;
    coin.rotation.x = pitch;
    coin.position.y = (reduce ? 0 : Math.sin(t * 0.6) * 0.045) - scrollRatio * 0.16;
    coin.position.x = reduce ? 0 : Math.sin(t * 0.24) * 0.025;

    // A barely-there counter-rotation on the camera keeps the light moving.
    if (!reduce && idle) camera.position.x = Math.sin(t * 0.21) * 0.06;
    else camera.position.x += (0 - camera.position.x) * 0.05;
    camera.lookAt(0, 0, 0);

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

  window.addEventListener('pagehide', () => {
    pmrem.dispose();
    environment.dispose();
    backTexture.dispose();
  });
}
