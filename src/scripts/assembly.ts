import * as THREE from 'three';
import { RoomEnvironment } from 'three/addons/environments/RoomEnvironment.js';
import { makeBladeGeometry, makeRotorDisc } from '../geometry/turbine-mesh';
import { bladeSpec } from '../geometry/turbine';

// Give the browser a chance to handle input and paint between the expensive setup steps,
// so building the scene never blocks the page for long.
const yieldToMain = () =>
  new Promise<void>((resolve) => {
    const s = (globalThis as { scheduler?: { yield?: () => Promise<void> } }).scheduler;
    if (s?.yield) s.yield().then(resolve);
    else setTimeout(resolve, 0);
  });

// Shared, dimensioned concept model; all blades have identical roots.
export async function mountAssembly(host: HTMLElement) {
  let renderer: THREE.WebGLRenderer;
  try {
    renderer = new THREE.WebGLRenderer({
      alpha: true,
      antialias: true,
      powerPreference: 'low-power',
    });
  } catch {
    throw new Error('WebGL is not available');
  }
  renderer.setPixelRatio(
    Math.min(devicePixelRatio, innerWidth < 700 ? 1.5 : 2),
  );
  renderer.setClearColor(0, 0);
  renderer.outputColorSpace = THREE.SRGBColorSpace;
  renderer.domElement.setAttribute('aria-hidden', 'true');
  host.append(renderer.domElement);
  let ready = false;
  await yieldToMain();
  const reduced = matchMedia('(prefers-reduced-motion: reduce)');
  const scene = new THREE.Scene(),
    story = new THREE.Group();
  scene.add(story);
  const camera = new THREE.OrthographicCamera(-3.4, 3.4, 3.4, -3.4, 0.1, 100);
  camera.position.z = 15;
  renderer.toneMapping = THREE.ACESFilmicToneMapping;
  renderer.toneMappingExposure = 1.0;
  const environment = new RoomEnvironment();
  const pmrem = new THREE.PMREMGenerator(renderer);
  const environmentMap = pmrem.fromScene(environment, 0.04);
  scene.environment = environmentMap.texture;
  environment.dispose();
  pmrem.dispose();
  await yieldToMain();
  scene.add(new THREE.HemisphereLight(0xffffff, 0x72787f, 0.7));
  const key = new THREE.DirectionalLight(0xffffff, 2);
  key.position.set(-3, 5, 6);
  scene.add(key);
  const silver = new THREE.MeshStandardMaterial({
    color: 0x9c9c97,
    metalness: 0.92,
    roughness: 0.29,
    envMapIntensity: 1.2,
    transparent: true,
    side: THREE.DoubleSide,
  });
  const selectedMaterial = silver.clone();
  const geometries = makeBladeGeometry();
  await yieldToMain();
  const rotor = new THREE.Group();
  story.add(rotor);
  rotor.rotation.set(0.18, -0.65, 0.12);
  const disc = new THREE.Mesh(makeRotorDisc(), silver);
  rotor.add(disc);
  // Concentric machining rings and an open bore replace the decorative spinner.
  for (const radius of [0.32, 0.38, 0.81]) {
    const ring = new THREE.Mesh(
      new THREE.TorusGeometry(radius, 0.008, 8, 96),
      silver,
    );
    ring.position.z = 0.221;
    rotor.add(ring);
  }
  let chosen: THREE.Group | undefined;
  for (let i = 0; i < bladeSpec.count; i++) {
    const blade = new THREE.Group();
    for (const geometry of Object.values(geometries))
      blade.add(new THREE.Mesh(geometry, i === 0 ? selectedMaterial : silver));
    const a = (i * Math.PI * 2) / bladeSpec.count;
    blade.position.set(
      (-Math.sin(a) * bladeSpec.rotorRadius) / 100,
      (Math.cos(a) * bladeSpec.rotorRadius) / 100,
      0,
    );
    blade.rotation.z = a;
    rotor.add(blade);
    if (i === 0) chosen = blade;
  }
  rotor.updateMatrixWorld(true);
  const selected = chosen!;
  story.attach(selected);
  const initialPosition = selected.position.clone(),
    initialRotation = selected.quaternion.clone();
  // The final front projection maps (-z,y) directly onto Drawing.astro's front view.
  const finalPosition = new THREE.Vector3(
    (210 - 410) / 100,
    (270 - 340) / 100,
    1,
  );
  const finalRotation = new THREE.Quaternion().setFromEuler(
    new THREE.Euler(0, -Math.PI / 2, 0),
  );
  const drawing = host.querySelector<SVGElement>('[data-blade-sheet]');
  let warmed = false;
  let start = performance.now(),
    raf = 0,
    visible = true,
    staticPose = reduced.matches;
  let targetX = 0,
    targetY = 0,
    tiltX = 0,
    tiltY = 0;
  const ease = (n: number) => {
    const t = Math.max(0, Math.min(1, n));
    return t * t * (3 - 2 * t);
  };
  function render(now: number) {
    raf = 0;
    if (!visible || document.hidden) return;
    const t = staticPose ? 10 : warmed ? (now - start) / 1000 : 0;
    const extract = ease((t - 0.8) / 1.7),
      flatten = ease((t - 3.5) / 1.3);
    // Slide axially out of the actual dovetail slot before enlarging the same part.
    const slide = ease((t - 0.7) / 0.65);
    const travel = ease((t - 1.35) / 1.15);
    const exit = initialPosition
      .clone()
      .add(new THREE.Vector3(0, 0, 0.75).applyQuaternion(initialRotation));
    const detailPosition = new THREE.Vector3(0, -0.7, 1);
    selected.position
      .lerpVectors(initialPosition, exit, slide)
      .lerp(detailPosition, travel)
      .lerp(finalPosition, flatten);
    const detailRotation = new THREE.Quaternion().setFromEuler(
      new THREE.Euler(-0.14, -0.95, 0.12),
    );
    selected.quaternion
      .slerpQuaternions(initialRotation, detailRotation, travel)
      .slerp(finalRotation, flatten);
    selected.scale.setScalar(1 + travel * (2.6 - 1.1 * flatten));
    camera.zoom = 1.45 - 0.45 * travel;
    camera.updateProjectionMatrix();
    rotor.scale.setScalar(1 - travel * 0.65);
    rotor.position.set(2.2 * travel, -1.4 * travel, 0);
    silver.opacity = 1 - flatten;
    selectedMaterial.opacity = 1 - flatten;
    if (drawing) {
      drawing.style.opacity = String(flatten);
    }
    tiltX += (targetX - tiltX) * 0.08;
    tiltY += (targetY - tiltY) * 0.08;
    story.rotation.set(tiltY * (1 - flatten), tiltX * (1 - flatten), 0);
    host.dataset.phase =
      flatten === 1 ? 'drawing' : extract > 0 ? 'detail' : 'turbine';
    renderer.render(scene, camera);
    if (!warmed) { warmed = true; start = performance.now(); }
    if (
      t < 4.8 ||
      Math.abs(targetX - tiltX) + Math.abs(targetY - tiltY) > 0.001
    )
      raf = requestAnimationFrame(render);
  }
  const draw = () => {
    if (ready && !raf && visible && !document.hidden)
      raf = requestAnimationFrame(render);
  };
  const resize = new ResizeObserver(() => {
    const { width, height } = host.getBoundingClientRect();
    if (!width || !height) return;
    renderer.setSize(width, height);
    const aspect = width / height;
    const heightWorld = Math.max(5.4, 8.2 / aspect);
    camera.top = heightWorld / 2;
    camera.bottom = -heightWorld / 2;
    camera.left = (-heightWorld * aspect) / 2;
    camera.right = (heightWorld * aspect) / 2;
    camera.updateProjectionMatrix();
    draw();
  });
  resize.observe(host);
  // Compile shaders in the background (parallel compile where the GPU driver supports it).
  await yieldToMain();
  await renderer.compileAsync(scene, camera);
  ready = true;
  host.dataset.state = 'ready';
  draw();
  host.addEventListener('pointermove', (e) => {
    if (reduced.matches || e.pointerType === 'touch') return;
    const r = host.getBoundingClientRect();
    targetX = ((e.clientX - r.left) / r.width - 0.5) * 0.2;
    targetY = ((e.clientY - r.top) / r.height - 0.5) * 0.15;
    draw();
  });
  host.addEventListener('pointerleave', () => {
    targetX = targetY = 0;
    draw();
  });
  const replay = host.parentElement?.querySelector<HTMLButtonElement>(
    '[data-assembly-replay]',
  );
  if (replay) {
    replay.hidden = reduced.matches;
    replay.addEventListener('click', () => {
      staticPose = false;
      start = performance.now();
      draw();
    });
  }
  reduced.addEventListener('change', () => {
    staticPose = true;
    targetX = targetY = tiltX = tiltY = 0;
    if (replay) replay.hidden = reduced.matches;
    draw();
  });
  const observer = new IntersectionObserver(([entry]) => {
    visible = entry.isIntersecting;
    if (visible) draw();
  });
  observer.observe(host);
  document.addEventListener('visibilitychange', draw);
  renderer.domElement.addEventListener('webglcontextlost', (e) => {
    e.preventDefault();
    host.dataset.state = 'sheet';
    host.dataset.phase = 'drawing';
    if (drawing) drawing.style.removeProperty('opacity');
    if (replay) replay.hidden = true;
    cancelAnimationFrame(raf);
  });
  window.addEventListener(
    'pagehide',
    () => {
      cancelAnimationFrame(raf);
      observer.disconnect();
      resize.disconnect();
      scene.traverse((o) => {
        if (o instanceof THREE.Mesh || o instanceof THREE.Line) {
          o.geometry.dispose();
          (Array.isArray(o.material) ? o.material : [o.material]).forEach((m) =>
            m.dispose(),
          );
        }
      });
      environmentMap.dispose();
      renderer.dispose();
    },
    { once: true },
  );
  draw();
}
