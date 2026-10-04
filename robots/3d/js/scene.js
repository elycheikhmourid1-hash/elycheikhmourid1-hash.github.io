/* AICore Robotics Ops 3D — Three.js scene (SIMULATION). Procedural VSAT ground station + procedural quadruped robots.
   Everything is generated in code: no external models or textures and the scene makes no network requests. The dish orientation follows the geometry-computed look angles. */
import * as THREE from '../vendor/three.module.min.js';
import { OrbitControls } from '../vendor/OrbitControls.js';

import { LAYOUT } from './layout.js';
export { LAYOUT };
const PRESETS = {
  overview: { p: [21, 13.5, 23], t: [0, 1.2, 0] },
  dish: { p: [16.5, 6.2, 8.5], t: [7, 3.3, -3] },
  cabinets: { p: [-1.5, 4.2, 7.5], t: [-5.5, 1.3, -5] }
};
const CAB_H = 2.3;

function heatColor(temp) {                       // 30 °C blue → 50 yellow → 66 red
  const k = Math.max(0, Math.min(1, (temp - 30) / 36));
  const stops = [[0, [30, 60, 255]], [0.3, [0, 220, 255]], [0.55, [255, 230, 40]], [0.8, [255, 120, 20]], [1, [255, 30, 30]]];
  for (let i = 1; i < stops.length; i++) if (k <= stops[i][0]) {
    const a = stops[i - 1], b = stops[i], f = (k - a[0]) / (b[0] - a[0]);
    return a[1].map((v, j) => Math.round(v + (b[1][j] - v) * f));
  }
  return stops[stops.length - 1][1];
}

export async function createScene(container, opts = {}) {
  { const probe = document.createElement('canvas'); let ctx = null; try { ctx = probe.getContext('webgl2') || probe.getContext('webgl'); } catch (e) { ctx = null; }
    if (!ctx) throw new Error('WebGL not available'); }
  const canvas = document.createElement('canvas');
  canvas.className = 'gl'; canvas.setAttribute('aria-label', opts.ariaLabel || '3D scene'); canvas.setAttribute('role', 'img');
  container.prepend(canvas);
  let renderer;
  try {
    renderer = new THREE.WebGLRenderer({ canvas, antialias: true, powerPreference: 'high-performance', preserveDrawingBuffer: false });
  } catch (e) { canvas.remove(); throw e; }
  if (!renderer.getContext()) { canvas.remove(); throw new Error('no webgl'); }
  renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, 2));
  renderer.shadowMap.enabled = true; renderer.shadowMap.type = THREE.PCFSoftShadowMap;
  renderer.toneMapping = THREE.ACESFilmicToneMapping; renderer.toneMappingExposure = 1.15;

  const scene = new THREE.Scene();
  const BG = new THREE.Color(0x07070f);
  scene.background = BG.clone();
  scene.fog = new THREE.Fog(0x07070f, 38, 95);

  const camera = new THREE.PerspectiveCamera(42, 16 / 9, 0.1, 400);
  camera.position.set(...PRESETS.overview.p);
  const controls = new OrbitControls(camera, canvas);
  controls.target.set(...PRESETS.overview.t);
  controls.enableDamping = true; controls.dampingFactor = 0.08;
  controls.minDistance = 7; controls.maxDistance = 55; controls.maxPolarAngle = Math.PI * 0.48;
  controls.autoRotateSpeed = 0.7;
  if (window.matchMedia('(max-width: 900px)').matches) canvas.style.touchAction = 'pan-y';   // phones: vertical swipe scrolls the page
  controls.update();

  /* ---------------- lights ---------------- */
  const hemi = new THREE.HemisphereLight(0x9a8cff, 0x0b0b1c, 0.75); scene.add(hemi);
  const sun = new THREE.DirectionalLight(0xc9c2ff, 1.25); sun.position.set(10, 18, 12);
  sun.castShadow = true; sun.shadow.mapSize.set(2048, 2048);
  Object.assign(sun.shadow.camera, { left: -22, right: 22, top: 18, bottom: -18, near: 1, far: 60 }); sun.shadow.bias = -0.0004;
  scene.add(sun);
  const pPurple = new THREE.PointLight(0xa24aff, 90, 26, 1.6); pPurple.position.set(-5.5, 3.2, -1.5); scene.add(pPurple);
  const pCyan = new THREE.PointLight(0x22d3ee, 70, 24, 1.6); pCyan.position.set(7, 4.5, 1); scene.add(pCyan);
  const pMag = new THREE.PointLight(0xc21fdc, 40, 20, 1.6); pMag.position.set(0, 2.5, 8); scene.add(pMag);

  /* ---------------- ground ---------------- */
  const ground = new THREE.Mesh(new THREE.CircleGeometry(90, 64), new THREE.MeshStandardMaterial({ color: 0x0c0c1a, roughness: 0.92, metalness: 0.05 }));
  ground.rotation.x = -Math.PI / 2; ground.receiveShadow = true; scene.add(ground);
  const grid = new THREE.GridHelper(80, 80, 0x7c3aed, 0x23234a);
  grid.position.y = 0.02; grid.material.transparent = true; grid.material.opacity = 0.55; scene.add(grid);
  const pad = new THREE.Mesh(new THREE.BoxGeometry(LAYOUT.fence.hx * 2 + 1.2, 0.12, LAYOUT.fence.hz * 2 + 1.2), new THREE.MeshStandardMaterial({ color: 0x14142c, roughness: 0.8, metalness: 0.2 }));
  pad.position.y = 0.05; pad.receiveShadow = true; scene.add(pad);
  const padEdge = new THREE.LineSegments(new THREE.EdgesGeometry(pad.geometry), new THREE.LineBasicMaterial({ color: 0xa24aff }));
  padEdge.position.copy(pad.position); scene.add(padEdge);
  const padGrid = new THREE.GridHelper(28, 28, 0x3b3b78, 0x24244c); padGrid.position.y = 0.115; scene.add(padGrid);

  /* ring glow on the ground around the compound */
  const ringTex = (() => { const c = document.createElement('canvas'); c.width = c.height = 256; const g = c.getContext('2d');
    const gr = g.createRadialGradient(128, 128, 20, 128, 128, 128); gr.addColorStop(0, 'rgba(162,74,255,0.0)'); gr.addColorStop(0.6, 'rgba(162,74,255,0.16)'); gr.addColorStop(1, 'rgba(34,211,238,0)'); g.fillStyle = gr; g.fillRect(0, 0, 256, 256);
    const t = new THREE.CanvasTexture(c); t.colorSpace = THREE.SRGBColorSpace; return t; })();
  const halo = new THREE.Mesh(new THREE.PlaneGeometry(90, 90), new THREE.MeshBasicMaterial({ map: ringTex, transparent: true, depthWrite: false, blending: THREE.AdditiveBlending }));
  halo.rotation.x = -Math.PI / 2; halo.position.y = 0.03; scene.add(halo);

  /* stars */
  { const n = 400, pos = new Float32Array(n * 3);
    for (let i = 0; i < n; i++) { const a = Math.random() * Math.PI * 2, e = 0.12 + Math.random() * 1.1, r = 160;
      pos[i * 3] = Math.cos(a) * Math.cos(e) * r; pos[i * 3 + 1] = Math.sin(e) * r * 0.9 + 6; pos[i * 3 + 2] = Math.sin(a) * Math.cos(e) * r; }
    const g = new THREE.BufferGeometry(); g.setAttribute('position', new THREE.BufferAttribute(pos, 3));
    scene.add(new THREE.Points(g, new THREE.PointsMaterial({ color: 0xcfd0ff, size: 0.9, sizeAttenuation: false, transparent: true, opacity: 0.7, fog: false }))); }

  /* ---------------- fence + gate ---------------- */
  const meshTex = (() => { const c = document.createElement('canvas'); c.width = c.height = 64; const g = c.getContext('2d');
    g.strokeStyle = 'rgba(255,255,255,0.95)'; g.lineWidth = 3; g.beginPath(); g.moveTo(0, 0); g.lineTo(64, 64); g.moveTo(64, 0); g.lineTo(0, 64); g.stroke();
    const t = new THREE.CanvasTexture(c); t.wrapS = t.wrapT = THREE.RepeatWrapping; t.anisotropy = 4; return t; })();
  const fenceMat = new THREE.MeshStandardMaterial({ color: 0x9d6bff, emissive: 0x5b21b6, emissiveIntensity: 0.9, metalness: 0.6, roughness: 0.4 });
  const fenceH = 2.2;
  function wall(x1, z1, x2, z2) {
    const L = Math.hypot(x2 - x1, z2 - z1), cx = (x1 + x2) / 2, cz = (z1 + z2) / 2, ang = Math.atan2(-(z2 - z1), x2 - x1);
    const tex = meshTex.clone(); tex.needsUpdate = true; tex.repeat.set(L / 0.6, fenceH / 0.6);
    const m = new THREE.Mesh(new THREE.PlaneGeometry(L, fenceH), new THREE.MeshBasicMaterial({ map: tex, color: 0xb18cff, transparent: true, opacity: 0.42, side: THREE.DoubleSide, depthWrite: false }));
    m.position.set(cx, fenceH / 2 + 0.1, cz); m.rotation.y = ang; scene.add(m);
    for (const y of [0.35, fenceH]) { const r = new THREE.Mesh(new THREE.BoxGeometry(L, 0.07, 0.07), fenceMat); r.position.set(cx, y + 0.1, cz); r.rotation.y = ang; scene.add(r); }
    const n = Math.max(1, Math.round(L / 2));
    for (let i = 0; i <= n; i++) { const px = x1 + (x2 - x1) * i / n, pz = z1 + (z2 - z1) * i / n;
      const p = new THREE.Mesh(new THREE.CylinderGeometry(0.07, 0.07, fenceH + 0.1, 8), fenceMat); p.position.set(px, fenceH / 2 + 0.1, pz); p.castShadow = true; scene.add(p); }
  }
  const F = LAYOUT.fence, GW = 2.6;
  wall(-F.hx, -F.hz, F.hx, -F.hz);
  wall(-F.hx, -F.hz, -F.hx, F.hz);
  wall(F.hx, -F.hz, F.hx, F.hz);
  wall(-F.hx, F.hz, -GW, F.hz);
  wall(GW, F.hz, F.hx, F.hz);
  const gateGroup = new THREE.Group(); scene.add(gateGroup);
  for (const s of [-1, 1]) {
    const post = new THREE.Mesh(new THREE.BoxGeometry(0.4, 3, 0.4), new THREE.MeshStandardMaterial({ color: 0x2a2a52, metalness: 0.7, roughness: 0.35 }));
    post.position.set(s * GW, 1.6, F.hz); post.castShadow = true; gateGroup.add(post);
    const cap = new THREE.Mesh(new THREE.SphereGeometry(0.22, 16, 12), new THREE.MeshBasicMaterial({ color: s < 0 ? 0x22d3ee : 0xc084fc })); cap.position.set(s * GW, 3.25, F.hz); gateGroup.add(cap);
    const leaf = new THREE.Mesh(new THREE.BoxGeometry(GW * 0.92, 1.7, 0.06), new THREE.MeshStandardMaterial({ color: 0x3b2a78, emissive: 0x4c1d95, emissiveIntensity: 0.55, metalness: 0.6, roughness: 0.4 }));
    leaf.position.set(s * GW * 0.5, 1.05, F.hz); gateGroup.add(leaf);
  }
  const lintel = new THREE.Mesh(new THREE.BoxGeometry(GW * 2 + 0.4, 0.14, 0.14), new THREE.MeshBasicMaterial({ color: 0xa24aff })); lintel.position.set(0, 3.0, F.hz); gateGroup.add(lintel);

  /* light poles */
  for (const [x, z] of [[-13.2, -8.2], [13.2, -8.2], [13.2, 8.2], [-13.2, 8.2]]) {
    const pole = new THREE.Mesh(new THREE.CylinderGeometry(0.06, 0.09, 4, 8), new THREE.MeshStandardMaterial({ color: 0x30305c, metalness: 0.7, roughness: 0.4 })); pole.position.set(x, 2.1, z); pole.castShadow = true; scene.add(pole);
    const head = new THREE.Mesh(new THREE.SphereGeometry(0.2, 12, 10), new THREE.MeshBasicMaterial({ color: 0x67e8f9 })); head.position.set(x, 4.2, z); scene.add(head);
  }

  /* ---------------- labels (sprites as plain canvases) ---------------- */
  function plateTex(text) {
    const c = document.createElement('canvas'); c.width = c.height = 128; const g = c.getContext('2d');
    g.fillStyle = '#0b0b1e'; g.fillRect(0, 0, 128, 128); g.strokeStyle = '#a24aff'; g.lineWidth = 8; g.strokeRect(6, 6, 116, 116);
    g.fillStyle = '#ffffff'; g.font = '700 84px Space Grotesk, Inter, Arial, sans-serif'; g.textAlign = 'center'; g.textBaseline = 'middle'; g.fillText(text, 64, 70);
    const t = new THREE.CanvasTexture(c); t.colorSpace = THREE.SRGBColorSpace; return t;
  }

  /* ---------------- equipment cabinets ---------------- */
  const cabinets = {}, leds = [];
  for (const id of ['A', 'B', 'C']) {
    const { x, z } = LAYOUT.cab[id];
    const g = new THREE.Group(); g.position.set(x, 0.11, z); scene.add(g);
    const body = new THREE.Mesh(new THREE.BoxGeometry(1.3, CAB_H, 0.9), new THREE.MeshStandardMaterial({ color: 0x23264a, metalness: 0.65, roughness: 0.38 }));
    body.position.y = CAB_H / 2; body.castShadow = true; body.receiveShadow = true; g.add(body);
    const door = new THREE.Mesh(new THREE.BoxGeometry(1.14, CAB_H - 0.3, 0.04), new THREE.MeshStandardMaterial({ color: 0x2f3366, metalness: 0.5, roughness: 0.45 }));
    door.position.set(0, CAB_H / 2, 0.47); g.add(door);
    for (let i = 0; i < 7; i++) { const v = new THREE.Mesh(new THREE.BoxGeometry(0.9, 0.035, 0.03), new THREE.MeshStandardMaterial({ color: 0x0a0a18 })); v.position.set(0, 0.35 + i * 0.1, 0.5); g.add(v); }
    for (let i = 0; i < 6; i++) {
      const col = [0x34d399, 0x22d3ee, 0xc084fc][i % 3];
      const l = new THREE.Mesh(new THREE.BoxGeometry(0.07, 0.07, 0.03), new THREE.MeshBasicMaterial({ color: col }));
      l.position.set(-0.4 + i * 0.16, 1.55 + (i % 2) * 0.12, 0.5); l.userData.phase = Math.random() * 6; l.userData.col = col; g.add(l); leds.push(l);
    }
    const plate = new THREE.Mesh(new THREE.PlaneGeometry(0.46, 0.46), new THREE.MeshBasicMaterial({ map: plateTex(id) }));
    plate.position.set(0, 2.0, 0.495); g.add(plate);
    const fan = new THREE.Mesh(new THREE.CylinderGeometry(0.22, 0.22, 0.08, 20), new THREE.MeshStandardMaterial({ color: 0x151530, metalness: 0.8, roughness: 0.3 })); fan.position.set(0, CAB_H + 0.04, 0); g.add(fan);
    const strip = new THREE.Mesh(new THREE.BoxGeometry(1.32, 0.04, 0.92), new THREE.MeshBasicMaterial({ color: 0xa24aff })); strip.position.y = 0.04; g.add(strip);
    cabinets[id] = { group: g, body };
  }

  /* ---------------- VSAT dish ---------------- */
  const dishRoot = new THREE.Group(); dishRoot.position.set(LAYOUT.dish.x, 0.11, LAYOUT.dish.z); scene.add(dishRoot);
  const metal = new THREE.MeshStandardMaterial({ color: 0x3a3d70, metalness: 0.75, roughness: 0.32 });
  const base = new THREE.Mesh(new THREE.CylinderGeometry(1.35, 1.6, 0.4, 28), metal); base.position.y = 0.2; base.castShadow = base.receiveShadow = true; dishRoot.add(base);
  const ped = new THREE.Mesh(new THREE.CylinderGeometry(0.34, 0.5, 2.9, 24), metal); ped.position.y = 1.85; ped.castShadow = true; dishRoot.add(ped);
  const azRing = new THREE.Mesh(new THREE.TorusGeometry(0.62, 0.07, 10, 36), new THREE.MeshBasicMaterial({ color: 0x22d3ee })); azRing.rotation.x = Math.PI / 2; azRing.position.y = 3.35; dishRoot.add(azRing);
  const azGroup = new THREE.Group(); azGroup.position.y = 3.35; dishRoot.add(azGroup);
  const yoke = new THREE.Mesh(new THREE.BoxGeometry(1.5, 0.28, 0.28), metal); yoke.position.y = 0.25; azGroup.add(yoke);
  for (const s of [-1, 1]) { const arm = new THREE.Mesh(new THREE.BoxGeometry(0.2, 1.2, 0.2), metal); arm.position.set(s * 0.75, 0.8, 0); arm.castShadow = true; azGroup.add(arm); }
  const elGroup = new THREE.Group(); elGroup.position.y = 1.2; azGroup.add(elGroup);
  const DISH_R = 2.3, DISH_F = 1.55;
  const prof = []; for (let i = 0; i <= 28; i++) { const r = DISH_R * i / 28; prof.push(new THREE.Vector2(r, r * r / (4 * DISH_F))); }
  const bowl = new THREE.Mesh(new THREE.LatheGeometry(prof, 56), new THREE.MeshStandardMaterial({ color: 0xe8e8ff, metalness: 0.35, roughness: 0.28, side: THREE.DoubleSide, emissive: 0x1b1b44, emissiveIntensity: 0.5 }));
  bowl.castShadow = true; bowl.receiveShadow = true;
  const dishTilt = new THREE.Group(); dishTilt.add(bowl); elGroup.add(dishTilt);
  const rim = new THREE.Mesh(new THREE.TorusGeometry(DISH_R, 0.045, 10, 64), new THREE.MeshBasicMaterial({ color: 0xc084fc })); rim.rotation.x = Math.PI / 2; rim.position.y = DISH_R * DISH_R / (4 * DISH_F); dishTilt.add(rim);
  const feedY = DISH_F;
  for (let i = 0; i < 3; i++) { const a = i * Math.PI * 2 / 3 + 0.4;
    const strut = new THREE.Mesh(new THREE.CylinderGeometry(0.025, 0.025, 1, 6), metal);
    const p1 = new THREE.Vector3(Math.cos(a) * DISH_R * 0.92, DISH_R * DISH_R * 0.85 / (4 * DISH_F), Math.sin(a) * DISH_R * 0.92), p2 = new THREE.Vector3(0, feedY, 0);
    strut.position.copy(p1).add(p2).multiplyScalar(0.5); strut.scale.y = p1.distanceTo(p2); strut.quaternion.setFromUnitVectors(new THREE.Vector3(0, 1, 0), p2.clone().sub(p1).normalize()); dishTilt.add(strut); }
  const feed = new THREE.Mesh(new THREE.CylinderGeometry(0.1, 0.17, 0.34, 16), new THREE.MeshStandardMaterial({ color: 0x151530, metalness: 0.7, roughness: 0.3 })); feed.position.y = feedY; dishTilt.add(feed);
  const feedLed = new THREE.Mesh(new THREE.SphereGeometry(0.09, 10, 8), new THREE.MeshBasicMaterial({ color: 0x34d399 })); feedLed.position.y = feedY + 0.22; dishTilt.add(feedLed);
  /* Pointing: scene north = −Z, east = +X. Compass azimuth az (clockwise from north) ↔ azGroup.rotation.y = π − az. Elevation el ↔ dishTilt.rotation.x = π/2 − el.
     The initial values are only a neutral parked pose; app3d.js calls setDishPointing() with the geometry-computed look angles (assets/js/geo.js). */
  const D2R = Math.PI / 180;
  let dishAz = Math.PI - 180 * D2R, dishEl = 42 * D2R, dishAzT = dishAz, dishElT = dishEl;     // current / target (radians)
  dishTilt.rotation.x = Math.PI / 2 - dishEl;      // bowl axis → (0, sin el, cos el)
  azGroup.rotation.y = dishAz;
  const dishAnchor = new THREE.Vector3(LAYOUT.dish.x, 5.7, LAYOUT.dish.z);
  const kuAnchor = new THREE.Vector3(LAYOUT.dish.x + 2.5, 3.15, LAYOUT.dish.z + 1.7);
  const dishCenter = new THREE.Vector3(LAYOUT.dish.x, 4.7, LAYOUT.dish.z);

  /* ---------------- fiber-glow lines ---------------- */
  const fiberCurves = [];
  function fiber(points, color) {
    const curve = new THREE.CatmullRomCurve3(points.map(p => new THREE.Vector3(p[0], 0.17, p[1])), false, 'catmullrom', 0.2);
    const tube = new THREE.Mesh(new THREE.TubeGeometry(curve, 80, 0.05, 6, false), new THREE.MeshBasicMaterial({ color, transparent: true, opacity: 0.85 })); scene.add(tube);
    const pulses = []; for (let i = 0; i < 3; i++) { const s = new THREE.Mesh(new THREE.SphereGeometry(0.16, 10, 8), new THREE.MeshBasicMaterial({ color: 0xffffff, transparent: true, opacity: 0.95, blending: THREE.AdditiveBlending })); s.userData.t = i / 3; scene.add(s); pulses.push(s); }
    fiberCurves.push({ curve, pulses, speed: 0.07 + Math.random() * 0.05 });
  }
  fiber([[7, -3], [4, -1], [0, -1.5], [-3, -3], [-5.5, -4]], 0xa24aff);
  fiber([[-8, -4], [-5.5, -4], [-3, -4]], 0x22d3ee);
  fiber([[-5.5, -4], [-8, 0], [-10.5, 2.5]], 0xc21fdc);
  fiber([[7, -3], [8, 3], [4, 7], [0, 9.3]], 0x22d3ee);
  fiber([[-5.5, -4], [-3, 1.5], [0, 5], [0, 9.3]], 0xa24aff);

  /* docks */
  const dockLeds = {};
  for (const id of Object.keys(LAYOUT.docks)) {
    const d = LAYOUT.docks[id];
    const m = new THREE.Mesh(new THREE.CylinderGeometry(1.3, 1.3, 0.06, 32), new THREE.MeshStandardMaterial({ color: 0x1c1c3c, emissive: 0x0a3a44, emissiveIntensity: 0.9, metalness: 0.5, roughness: 0.5 })); m.position.set(d.x, 0.15, d.z); m.receiveShadow = true; scene.add(m);
    const ring = new THREE.Mesh(new THREE.TorusGeometry(1.3, 0.04, 8, 48), new THREE.MeshBasicMaterial({ color: 0x22d3ee })); ring.rotation.x = Math.PI / 2; ring.position.set(d.x, 0.19, d.z); scene.add(ring); dockLeds[id] = ring;
  }

  /* ---------------- robot ---------------- */
  const ROBOT_SCALE = 1.7;
  function buildRobot(id) {
    const root = new THREE.Group(), rig = new THREE.Group(); rig.scale.setScalar(ROBOT_SCALE); root.add(rig);
    const bodyM = new THREE.MeshStandardMaterial({ color: 0x2a2d58, metalness: 0.7, roughness: 0.3 });
    const darkM = new THREE.MeshStandardMaterial({ color: 0x11122a, metalness: 0.8, roughness: 0.35 });
    const accent = id === 'R-01' ? 0xc084fc : 0x22d3ee;
    const accM = new THREE.MeshBasicMaterial({ color: accent });
    const body = new THREE.Group(); body.position.y = 0.54; rig.add(body);
    const torso = new THREE.Mesh(new THREE.BoxGeometry(0.9, 0.24, 0.4), bodyM); torso.castShadow = true; body.add(torso);
    const belly = new THREE.Mesh(new THREE.BoxGeometry(0.7, 0.08, 0.34), darkM); belly.position.y = -0.14; body.add(belly);
    for (const s of [-1, 1]) { const st = new THREE.Mesh(new THREE.BoxGeometry(0.72, 0.035, 0.012), accM); st.position.set(0, 0.02, s * 0.206); body.add(st); }
    const head = new THREE.Group(); head.position.set(0.56, 0.08, 0); body.add(head);
    const hb = new THREE.Mesh(new THREE.BoxGeometry(0.3, 0.2, 0.28), bodyM); hb.castShadow = true; head.add(hb);
    const visor = new THREE.Mesh(new THREE.BoxGeometry(0.02, 0.09, 0.22), new THREE.MeshBasicMaterial({ color: 0x67e8f9 })); visor.position.set(0.155, 0.01, 0); head.add(visor);
    const pod = new THREE.Mesh(new THREE.CylinderGeometry(0.075, 0.09, 0.12, 14), darkM); pod.position.set(0.08, 0.18, 0); body.add(pod);
    const lens = new THREE.Mesh(new THREE.SphereGeometry(0.05, 10, 8), new THREE.MeshBasicMaterial({ color: 0xff5ad1 })); lens.position.set(0.12, 0.2, 0); body.add(lens);
    const led = new THREE.Mesh(new THREE.SphereGeometry(0.045, 10, 8), new THREE.MeshBasicMaterial({ color: 0x34d399 })); led.position.set(-0.3, 0.16, 0); body.add(led);
    const legs = [];
    [[0.34, 0.2, 0], [0.34, -0.2, Math.PI], [-0.34, 0.2, Math.PI], [-0.34, -0.2, 0]].forEach(([x, z, ph]) => {
      const hip = new THREE.Group(); hip.position.set(x, -0.04, z); body.add(hip);
      const up = new THREE.Mesh(new THREE.BoxGeometry(0.11, 0.27, 0.1), bodyM); up.position.y = -0.135; up.castShadow = true; hip.add(up);
      const knee = new THREE.Group(); knee.position.y = -0.27; hip.add(knee);
      const lo = new THREE.Mesh(new THREE.BoxGeometry(0.08, 0.27, 0.08), darkM); lo.position.y = -0.135; lo.castShadow = true; knee.add(lo);
      const ft = new THREE.Mesh(new THREE.SphereGeometry(0.055, 8, 6), accM); ft.position.y = -0.28; knee.add(ft);
      legs.push({ hip, knee, ph });
    });
    const headlight = new THREE.SpotLight(0xdff6ff, 0, 22, 0.55, 0.5, 1.2);
    headlight.position.set(0.7, 0.1, 0); const hlT = new THREE.Object3D(); hlT.position.set(6, -0.25, 0); head.add(headlight); head.add(hlT); headlight.target = hlT;
    const glow = new THREE.Mesh(new THREE.CircleGeometry(1.3, 32), new THREE.MeshBasicMaterial({ color: accent, transparent: true, opacity: 0.22, blending: THREE.AdditiveBlending, depthWrite: false }));
    glow.rotation.x = -Math.PI / 2; glow.position.y = 0.04; root.add(glow);
    return { id, root, rig, body, head, legs, led, lens, headlight, glow, phase: 0, speed: 0, mode: 'idle', yaw: 0, scan: 0, walk: null, dockYaw: 0 };
  }
  const robots = {};
  for (const id of Object.keys(LAYOUT.docks)) {
    const r = buildRobot(id), d = LAYOUT.docks[id];
    r.root.position.set(d.x, 0.11, d.z); r.yaw = r.dockYaw = LAYOUT.dockYaw; r.root.rotation.y = r.yaw; scene.add(r.root); robots[id] = r;
  }

  /* ---------------- effects: scan beam, heat overlays ---------------- */
  const beam = new THREE.Mesh(new THREE.ConeGeometry(1, 1, 24, 1, true), new THREE.MeshBasicMaterial({ color: 0x22d3ee, transparent: true, opacity: 0.2, side: THREE.DoubleSide, blending: THREE.AdditiveBlending, depthWrite: false }));
  beam.visible = false; scene.add(beam);
  const beamLine = new THREE.Line(new THREE.BufferGeometry().setFromPoints([new THREE.Vector3(), new THREE.Vector3(0, 0, 1)]), new THREE.LineBasicMaterial({ color: 0x67e8f9 })); beamLine.visible = false; scene.add(beamLine);
  const lockRing = new THREE.Mesh(new THREE.TorusGeometry(2.55, 0.04, 8, 64), new THREE.MeshBasicMaterial({ color: 0x34d399, transparent: true, opacity: 0.8 })); lockRing.visible = false; scene.add(lockRing);

  const heatTexCache = {};
  function heatTex(temp) {
    const key = Math.round(temp); if (heatTexCache[key]) return heatTexCache[key];
    const c = document.createElement('canvas'); c.width = 64; c.height = 128; const g = c.getContext('2d');
    const base = heatColor(temp - 14), mid = heatColor(temp - 4), hot = heatColor(temp);
    g.fillStyle = `rgb(${base})`; g.fillRect(0, 0, 64, 128);
    const gr = g.createRadialGradient(32, 40, 4, 32, 44, 70); gr.addColorStop(0, `rgb(${hot})`); gr.addColorStop(0.45, `rgb(${mid})`); gr.addColorStop(1, `rgba(${base},0)`);
    g.fillStyle = gr; g.fillRect(0, 0, 64, 128);
    const gr2 = g.createRadialGradient(32, 100, 2, 32, 100, 40); gr2.addColorStop(0, `rgba(${heatColor(temp - 8)},0.9)`); gr2.addColorStop(1, `rgba(${base},0)`); g.fillStyle = gr2; g.fillRect(0, 0, 64, 128);
    const t = new THREE.CanvasTexture(c); t.colorSpace = THREE.SRGBColorSpace; return (heatTexCache[key] = t);
  }
  const glowTex = (() => { const c = document.createElement('canvas'); c.width = c.height = 128; const g = c.getContext('2d');
    const gr = g.createRadialGradient(64, 64, 2, 64, 64, 64); gr.addColorStop(0, 'rgba(255,255,255,1)'); gr.addColorStop(0.25, 'rgba(255,160,60,0.75)'); gr.addColorStop(1, 'rgba(255,40,20,0)');
    g.fillStyle = gr; g.fillRect(0, 0, 128, 128); const t = new THREE.CanvasTexture(c); t.colorSpace = THREE.SRGBColorSpace; return t; })();
  const heat = {};
  for (const id of ['A', 'B', 'C']) {
    const pl = new THREE.Mesh(new THREE.PlaneGeometry(1.3, CAB_H), new THREE.MeshBasicMaterial({ transparent: true, opacity: 0, blending: THREE.AdditiveBlending, depthWrite: false }));
    pl.position.set(LAYOUT.cab[id].x, 0.11 + CAB_H / 2, LAYOUT.cab[id].z + 0.5); pl.visible = false; scene.add(pl);
    const sp = new THREE.Sprite(new THREE.SpriteMaterial({ map: glowTex, transparent: true, opacity: 0, blending: THREE.AdditiveBlending, depthWrite: false }));
    sp.position.set(LAYOUT.cab[id].x, CAB_H + 0.55, LAYOUT.cab[id].z + 0.45); sp.scale.setScalar(1.5); sp.visible = false; scene.add(sp);
    heat[id] = { plane: pl, sprite: sp, temp: 0, on: false, amt: 0, hot: false };
  }

  /* ---------------- state + loop ---------------- */
  const clock = new THREE.Clock();
  const labels = [];
  let cinematic = false, followId = null, tween = null, heatOn = false, beamOn = null, nightAmt = 0, nightTarget = 0, driftAmp = 0.012, locked = false, speedMul = opts.speed || 1;
  const tmp = new THREE.Vector3(), tmp2 = new THREE.Vector3(), up = new THREE.Vector3(0, 1, 0);
  let viewW = 800, viewH = 450;

  function resize() {
    const w = Math.max(2, container.clientWidth), h = Math.max(2, container.clientHeight);
    viewW = w; viewH = h; renderer.setSize(w, h, false); camera.aspect = w / h;
    camera.fov = w / h < 1 ? 62 : 42; camera.updateProjectionMatrix();
  }
  const ro = new ResizeObserver(resize); ro.observe(container); resize();

  controls.addEventListener('start', () => { tween = null; if (followId) { followId = null; api.onFollowChange && api.onFollowChange(null); } });

  function walkStep(r, dt) {
    const w = r.walk; let moving = false;
    if (w) {
      const p = r.root.position, sp = Math.min(speedMul, 3);
      if (w.i < w.pts.length) {
        const tgt = w.pts[w.i], dx = tgt.x - p.x, dz = tgt.z - p.z, dist = Math.hypot(dx, dz);
        if (dist > 0.06) {
          const want = Math.atan2(-dz, dx); let dy = want - r.yaw; dy = Math.atan2(Math.sin(dy), Math.cos(dy));
          const turnRate = 3.4 * dt * sp; r.yaw += Math.abs(dy) < turnRate ? dy : Math.sign(dy) * turnRate;
          const align = Math.max(0, Math.cos(dy)), spd = w.speed * speedMul * (0.12 + 0.88 * align * align * align);
          const step = Math.min(dist, spd * dt); p.x += dx / dist * step; p.z += dz / dist * step; w.done += step; r.speed = spd; moving = true;
          if (w.onProgress) w.onProgress(Math.min(1, w.done / w.total));
        } else w.i++;
      } else {
        let d2 = (w.finalYaw == null ? r.yaw : w.finalYaw) - r.yaw; d2 = Math.atan2(Math.sin(d2), Math.cos(d2));
        if (Math.abs(d2) < 0.05) { const res = w.resolve; r.walk = null; r.speed = 0; if (w.onProgress) w.onProgress(1); res && res(true); }
        else r.yaw += Math.sign(d2) * Math.min(Math.abs(d2), 3.4 * dt * sp);
      }
    }
    if (!moving) r.speed *= 0.8;
    r.root.rotation.y = r.yaw;
  }

  function animateRobot(r, t, dt) {
    walkStep(r, dt);
    const spd = r.speed, moving = spd > 0.2;
    r.phase += dt * (moving ? 6.2 + spd * 1.3 : 0) * Math.min(1.6, 0.6 + speedMul * 0.4);
    const amp = moving ? Math.min(1, spd / 2.4) : 0;
    const docked = r.mode === 'docked';
    r.legs.forEach(l => {
      const ph = r.phase + l.ph, front = l.hip.position.x > 0 ? 1 : -1;
      if (docked) { l.hip.rotation.z = front * 0.7; l.knee.rotation.z = -1.5; }
      else { l.hip.rotation.z = 0.5 * amp * Math.sin(ph); l.knee.rotation.z = -(0.15 + 0.9 * amp * Math.max(0, Math.cos(ph))); }
    });
    const crouchY = docked ? -0.2 : 0;
    r.body.position.y = 0.54 + crouchY + 0.025 * amp * Math.abs(Math.sin(r.phase * 2)) + (!moving ? Math.sin(t * 1.6 + r.id.length) * 0.008 : 0);
    r.body.rotation.z = 0.04 * amp * Math.sin(r.phase * 2); r.body.rotation.x = 0.03 * amp * Math.sin(r.phase);
    const scanning = r.mode === 'scan';
    r.head.rotation.y = scanning ? Math.sin(t * 1.9) * 0.55 : r.head.rotation.y * 0.9;
    r.head.rotation.z = scanning ? -0.12 : r.head.rotation.z * 0.9;
    r.led.material.color.set(scanning ? 0xfbbf24 : moving ? 0x22d3ee : docked ? 0x34d399 : 0xc084fc);
    r.glow.material.opacity = 0.16 + 0.1 * Math.sin(t * 3 + (scanning ? 0 : 1)) + (moving ? 0.1 : 0);
    r.lens.material.color.set(scanning ? 0xff3b6b : 0xff5ad1);
  }

  const api = {
    renderer, scene, camera, controls, robots, LAYOUT, THREE,
    onFollowChange: null,
    get speedMul() { return speedMul; }, set speedMul(v) { speedMul = v; },
    addLabel(el, fn) { labels.push({ el, fn }); },
    removeLabel(el) { const i = labels.findIndex(l => l.el === el); if (i >= 0) labels.splice(i, 1); },
    walk(id, pts, o = {}) {
      return new Promise(res => {
        const r = robots[id], p = r.root.position; let total = 0, px = p.x, pz = p.z;
        pts.forEach(q => { total += Math.hypot(q.x - px, q.z - pz); px = q.x; pz = q.z; });
        r.walk = { pts: pts.slice(), i: 0, speed: o.speed || 2.5, total: Math.max(0.1, total), done: 0, onProgress: o.onProgress, resolve: res, finalYaw: o.finalYaw };
      });
    },
    setMode(id, m) { robots[id].mode = m; },
    cancelWalk(id) { const r = robots[id]; r.walk = null; r.speed = 0; },
    resetRobots() { Object.keys(robots).forEach(id => { const r = robots[id], d = LAYOUT.docks[id]; r.walk = null; r.speed = 0; r.root.position.set(d.x, 0.11, d.z); r.yaw = r.dockYaw; r.mode = 'docked'; }); },
    robotPos(id) { return robots[id].root.position; },
    headWorld(id, out) { return robots[id].head.getWorldPosition(out || new THREE.Vector3()); },
    setHeat(temps, hotLimit = 55) {           // temps: {A:41,B:63,...} or null to hide
      heatOn = !!temps;
      for (const id of ['A', 'B', 'C']) {
        const h = heat[id];
        if (temps && temps[id] != null) { h.on = true; h.temp = temps[id]; h.hot = temps[id] >= hotLimit; h.plane.material.map = heatTex(temps[id]); h.plane.material.needsUpdate = true; h.plane.visible = h.sprite.visible = true; }
        else h.on = false;
      }
    },
    setBeam(id) { beamOn = id; },             // robot id to point scan beam at the dish, or null
    setLocked(v) { locked = v; },
    setNight(v) { nightTarget = v ? 1 : 0; },
    setDriftAmp(v) { driftAmp = v; },
    dishAzimuth() { return azGroup.rotation.y; },
    setDishPointing(azDeg, elDeg) { dishAzT = Math.PI - azDeg * D2R; dishElT = Math.max(0, Math.min(90, elDeg)) * D2R; },
    dishPointing() { const az = ((180 - (dishAz * 180 / Math.PI)) % 360 + 360) % 360; return { az, el: dishEl * 180 / Math.PI, target: { az: (((180 - dishAzT * 180 / Math.PI) % 360) + 360) % 360, el: dishElT * 180 / Math.PI } }; },
    setCinematic(v) { cinematic = !!v; controls.autoRotate = cinematic; },
    get cinematic() { return cinematic; },
    follow(id) { followId = id; tween = null; },
    get following() { return followId; },
    flyTo(name) {
      const p = PRESETS[name]; if (!p) return; followId = null;
      tween = { t: 0, dur: 1.5, p0: camera.position.clone(), t0: controls.target.clone(), p1: new THREE.Vector3(...p.p), t1: new THREE.Vector3(...p.t) };
    },
    project(v3) { tmp2.copy(v3).project(camera); return { x: (tmp2.x * 0.5 + 0.5) * viewW, y: (-tmp2.y * 0.5 + 0.5) * viewH, z: tmp2.z }; },
    dishAnchor, kuAnchor, cabAnchor(id) { return new THREE.Vector3(LAYOUT.cab[id].x, CAB_H + 0.35, LAYOUT.cab[id].z + 0.2); },
    cabFront(id) { return new THREE.Vector3(LAYOUT.cab[id].x, 1.4, LAYOUT.cab[id].z + 0.6); },
    gateAnchor: new THREE.Vector3(0, 3.7, LAYOUT.gate.z),
    robotAnchor(id, out) { const p = robots[id].root.position; return (out || new THREE.Vector3()).set(p.x, 2.55, p.z); },
    get size() { return { w: viewW, h: viewH }; },
    stats() { return { calls: renderer.info.render.calls, tris: renderer.info.render.triangles, frames: frames }
    },
    dispose() { ro.disconnect(); renderer.dispose(); }
  };
  let frames = 0;

  const nightCol = new THREE.Color(0x03030a), dayCol = new THREE.Color(0x07070f);
  function loop() {
    requestAnimationFrame(loop);
    const dt = Math.min(0.06, clock.getDelta()), t = clock.elapsedTime;
    frames++;
    /* tween camera */
    if (tween) {
      tween.t += dt / tween.dur; const k = Math.min(1, tween.t), e = k < 0.5 ? 4 * k * k * k : 1 - Math.pow(-2 * k + 2, 3) / 2;
      camera.position.lerpVectors(tween.p0, tween.p1, e); controls.target.lerpVectors(tween.t0, tween.t1, e); if (k >= 1) tween = null;
    }
    if (followId) {
      const rp = robots[followId].root.position; tmp.set(rp.x, 1.0, rp.z); tmp2.copy(tmp).sub(controls.target);
      camera.position.add(tmp2.multiplyScalar(Math.min(1, dt * 3))); controls.target.lerp(tmp, Math.min(1, dt * 3));
    }
    if (cinematic) { const k = 0.5 + 0.5 * Math.sin(t * 0.15); camera.position.y += (6 + k * 10 - camera.position.y) * dt * 0.4; }
    controls.update();
    /* robots */
    for (const id in robots) animateRobot(robots[id], t, dt);
    /* night */
    nightAmt += (nightTarget - nightAmt) * Math.min(1, dt * 2.2);
    hemi.intensity = 0.75 - 0.5 * nightAmt; sun.intensity = 1.25 - 1.0 * nightAmt; scene.background.copy(dayCol).lerp(nightCol, nightAmt); scene.fog.color.copy(scene.background);
    for (const id in robots) robots[id].headlight.intensity = nightAmt > 0.4 && robots[id].mode !== 'docked' ? 220 * nightAmt : 0;
    /* dish tracking wobble (ambient drift) */
    { let da = dishAzT - dishAz; da = Math.atan2(Math.sin(da), Math.cos(da)); dishAz += da * Math.min(1, dt * 2.2); dishEl += (dishElT - dishEl) * Math.min(1, dt * 2.2); dishTilt.rotation.x = Math.PI / 2 - dishEl; }
    const wob = Math.sin(t * 0.35) * driftAmp + Math.sin(t * 0.9) * driftAmp * 0.4;
    azGroup.rotation.y = dishAz + (locked ? 0 : wob * (driftAmp > 0.03 ? 6 : 3));
    feedLed.material.color.set(driftAmp > 0.03 && !locked ? 0xfbbf24 : 0x34d399);
    /* leds + fibers */
    leds.forEach(l => { const on = Math.sin(t * 3 + l.userData.phase) > -0.3; l.material.color.set(on ? l.userData.col : 0x111122); });
    fiberCurves.forEach(f => f.pulses.forEach(s => { s.userData.t = (s.userData.t + dt * f.speed) % 1; f.curve.getPointAt(s.userData.t, s.position); s.position.y += 0.05; }));
    Object.values(dockLeds).forEach((rg, i) => rg.material.color.setHSL(0.5 + 0.05 * Math.sin(t * 2 + i), 0.9, 0.55));
    /* scan beam */
    if (beamOn && robots[beamOn]) {
      api.headWorld(beamOn, tmp); const to = dishCenter, len = tmp.distanceTo(to);
      beam.visible = beamLine.visible = lockRing.visible = true;
      beam.position.copy(tmp).add(to).multiplyScalar(0.5); beam.scale.set(0.9 + 0.2 * Math.sin(t * 6), len, 0.9 + 0.2 * Math.sin(t * 6));
      beam.quaternion.setFromUnitVectors(up, tmp2.copy(tmp).sub(to).normalize());     // cone tip (+y) at robot head
      const pos = beamLine.geometry.attributes.position; pos.setXYZ(0, tmp.x, tmp.y, tmp.z); pos.setXYZ(1, to.x, to.y, to.z); pos.needsUpdate = true;
      lockRing.position.set(LAYOUT.dish.x, 4.6, LAYOUT.dish.z); lockRing.lookAt(camera.position); lockRing.scale.setScalar(1 + 0.04 * Math.sin(t * 5));
    } else { beam.visible = beamLine.visible = lockRing.visible = false; }
    /* heat */
    for (const id of ['A', 'B', 'C']) {
      const h = heat[id], target = h.on && heatOn ? 1 : 0; h.amt += (target - h.amt) * Math.min(1, dt * 3);
      h.plane.material.opacity = h.amt * 0.88; h.sprite.material.opacity = h.hot ? h.amt * (0.7 + 0.3 * Math.sin(t * 5)) : 0;
      h.sprite.scale.setScalar(h.hot ? 1.6 + 0.3 * Math.sin(t * 5) : 1);
      if (h.amt < 0.01 && !target) h.plane.visible = h.sprite.visible = false;
    }
    renderer.render(scene, camera);
    /* labels */
    for (const l of labels) {
      const v = l.fn(); if (!v) { l.el.style.visibility = 'hidden'; continue; }
      const q = api.project(v);
      if (q.z > 1 || q.x < -80 || q.x > viewW + 80 || q.y < -40 || q.y > viewH + 80) { l.el.style.visibility = 'hidden'; continue; }
      l.el.style.visibility = 'visible'; l.el.style.transform = `translate(${q.x.toFixed(1)}px, ${q.y.toFixed(1)}px) translate(-50%, -100%)`;
    }
  }
  api.resetRobots();
  clock.start(); loop();
  return api;
}
