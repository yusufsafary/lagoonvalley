// ═══════════════════════════════════════════════════════
// MAIN — game entry point, scene setup, visual systems, game loop
// ═══════════════════════════════════════════════════════
import * as THREE from 'three';
import { gameState, TIME_SCALE, DAY_LENGTH, CROPS } from './store/gameState.js';
import { tickCrop, isReadyToHarvest, needsWater } from './utils/growth.js';
import { computeTide } from './utils/tide.js';
import { Player }       from './components/Player.js';
import { Farm }         from './components/Farm.js';
import { NPC }          from './components/NPC.js';
import { Joystick }     from './components/Joystick.js';
import { HUD }          from './components/HUD.js';
import { DialogueBox }  from './components/DialogueBox.js';
import { InventoryBar } from './components/InventoryBar.js';
import { Shop }         from './components/Shop.js';

// ── Toast ────────────────────────────────────────────
let _toastTimer = null;
export function showToast(msg) {
  const el = document.getElementById('toast');
  el.textContent = msg;
  el.classList.add('show');
  clearTimeout(_toastTimer);
  _toastTimer = setTimeout(() => el.classList.remove('show'), 2400);
}

// ── Renderer ─────────────────────────────────────────
const container = document.getElementById('canvas-container');
const renderer  = new THREE.WebGLRenderer({ antialias: true, powerPreference: 'high-performance' });
renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
renderer.setSize(window.innerWidth, window.innerHeight);
renderer.shadowMap.enabled     = true;
renderer.shadowMap.type        = THREE.PCFSoftShadowMap;
renderer.toneMapping           = THREE.ACESFilmicToneMapping;
renderer.toneMappingExposure   = 1.25;
renderer.outputColorSpace      = THREE.SRGBColorSpace;
container.appendChild(renderer.domElement);

const scene = new THREE.Scene();

// ── Camera ───────────────────────────────────────────
const camera = new THREE.PerspectiveCamera(55, window.innerWidth / window.innerHeight, 0.1, 200);
const CAM_OFFSET = new THREE.Vector3(0, 13, 10);
camera.position.copy(CAM_OFFSET);
camera.lookAt(0, 0, 0);

// ═══════════════════════════════════════════════════
// SKY SYSTEM — gradient hemisphere + sun disc + stars
// ═══════════════════════════════════════════════════

// Sky sphere with custom shader
const skyGeo = new THREE.SphereGeometry(90, 32, 16);
const skyMat = new THREE.ShaderMaterial({
  side: THREE.BackSide,
  uniforms: {
    uTopColor:    { value: new THREE.Color(0x0e3a6e) },
    uMidColor:    { value: new THREE.Color(0x87ceeb) },
    uHorizonColor:{ value: new THREE.Color(0xffe0b2) },
    uTime:        { value: 0 },
    uSunDir:      { value: new THREE.Vector3(0, 1, 0) },
    uNight:       { value: 0.0 },
  },
  vertexShader: `
    varying vec3 vWorldPos;
    void main() {
      vWorldPos = (modelMatrix * vec4(position, 1.0)).xyz;
      gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
    }
  `,
  fragmentShader: `
    uniform vec3 uTopColor;
    uniform vec3 uMidColor;
    uniform vec3 uHorizonColor;
    uniform vec3 uSunDir;
    uniform float uNight;
    uniform float uTime;
    varying vec3 vWorldPos;
    void main() {
      vec3 dir = normalize(vWorldPos);
      float t = clamp(dir.y * 1.5, 0.0, 1.0);
      float haze = 1.0 - clamp(dir.y * 4.0, 0.0, 1.0);

      // Day sky gradient
      vec3 daySky = mix(uHorizonColor, uMidColor, t * 0.6);
      daySky      = mix(daySky, uTopColor, t * t);

      // Night sky
      vec3 nightSky = mix(vec3(0.01, 0.01, 0.06), vec3(0.0, 0.0, 0.02), t);

      vec3 sky = mix(daySky, nightSky, uNight);

      // Sun disc (only in day)
      float sunDot  = dot(dir, normalize(uSunDir));
      float sunDisc = smoothstep(0.9985, 0.9999, sunDot);
      float sunGlow = pow(max(0.0, sunDot), 64.0) * (1.0 - uNight) * 0.4;
      vec3 sunColor = mix(vec3(1.0, 0.6, 0.2), vec3(1.0, 1.0, 0.9),
                         clamp(uSunDir.y, 0.0, 1.0));
      sky += sunColor * sunGlow;
      sky = mix(sky, vec3(1.0, 0.98, 0.9), sunDisc * (1.0 - uNight));

      // Moon (simple disc opposite sun at night)
      vec3 moonDir = -normalize(uSunDir);
      float moonDot = dot(dir, moonDir);
      float moonDisc = smoothstep(0.9993, 0.9999, moonDot) * uNight;
      sky = mix(sky, vec3(0.92, 0.94, 1.0), moonDisc);

      gl_FragColor = vec4(sky, 1.0);
    }
  `,
  depthWrite: false,
});
const skyMesh = new THREE.Mesh(skyGeo, skyMat);
scene.add(skyMesh);

// Stars (Points, visible at night)
let starsMesh;
(function buildStars() {
  const count  = 1200;
  const pos    = new Float32Array(count * 3);
  const sizes  = new Float32Array(count);
  for (let i = 0; i < count; i++) {
    const theta  = Math.random() * Math.PI * 2;
    const phi    = Math.acos(2 * Math.random() - 1);
    const r      = 80;
    pos[i*3]     = r * Math.sin(phi) * Math.cos(theta);
    pos[i*3+1]   = Math.abs(r * Math.cos(phi)) + 5; // upper hemisphere
    pos[i*3+2]   = r * Math.sin(phi) * Math.sin(theta);
    sizes[i]     = Math.random() * 2.5 + 0.5;
  }
  const geo = new THREE.BufferGeometry();
  geo.setAttribute('position',  new THREE.BufferAttribute(pos,   3));
  geo.setAttribute('aSize',     new THREE.BufferAttribute(sizes, 1));

  const mat = new THREE.ShaderMaterial({
    uniforms: { uOpacity: { value: 0 } },
    vertexShader: `
      attribute float aSize;
      uniform float uOpacity;
      varying float vOp;
      void main() {
        vOp = uOpacity;
        vec4 mv = modelViewMatrix * vec4(position, 1.0);
        gl_PointSize = aSize * (300.0 / -mv.z);
        gl_Position = projectionMatrix * mv;
      }
    `,
    fragmentShader: `
      varying float vOp;
      void main() {
        float d = length(gl_PointCoord - 0.5) * 2.0;
        float a = 1.0 - smoothstep(0.0, 1.0, d);
        gl_FragColor = vec4(0.95, 0.97, 1.0, a * vOp);
      }
    `,
    transparent: true,
    depthWrite:  false,
    blending:    THREE.AdditiveBlending,
  });
  starsMesh = new THREE.Points(geo, mat);
  scene.add(starsMesh);
})();

// ═══════════════════════════════════════════════════
// OCEAN SHADER — animated waves with foam + caustics
// ═══════════════════════════════════════════════════
const oceanUniforms = {
  uTime:         { value: 0 },
  uDeepColor:    { value: new THREE.Color(0x014a8f) },
  uShallowColor: { value: new THREE.Color(0x1ab8e8) },
  uFoamColor:    { value: new THREE.Color(0xe8f8ff) },
  uTide:         { value: 0.1 },
};

const oceanGeo = new THREE.PlaneGeometry(60, 22, 80, 40);
const oceanMat = new THREE.ShaderMaterial({
  uniforms: oceanUniforms,
  vertexShader: `
    uniform float uTime;
    uniform float uTide;
    varying float vElevation;
    varying vec2  vUv;
    varying vec3  vWorldPos;
    void main() {
      vUv = uv;
      vec4 mp = modelMatrix * vec4(position, 1.0);
      float e =
        sin(mp.x * 0.7  + uTime * 0.9)  * 0.32 +
        cos(mp.z * 0.55 + uTime * 0.75) * 0.26 +
        sin(mp.x * 1.4  + mp.z * 1.1 + uTime * 1.6) * 0.13 +
        cos(mp.x * 2.2  - mp.z * 0.9 + uTime * 2.3) * 0.07 +
        sin(mp.x * 3.5  + uTime * 3.1) * 0.04;
      mp.y += e + uTide * 0.4 - 0.1;
      vElevation = e;
      vWorldPos  = mp.xyz;
      gl_Position = projectionMatrix * viewMatrix * mp;
    }
  `,
  fragmentShader: `
    uniform vec3  uDeepColor;
    uniform vec3  uShallowColor;
    uniform vec3  uFoamColor;
    uniform float uTime;
    varying float vElevation;
    varying vec2  vUv;
    varying vec3  vWorldPos;
    void main() {
      // Depth-based color
      vec3 col = mix(uDeepColor, uShallowColor, clamp(vElevation * 1.8 + 0.55, 0.0, 1.0));

      // Foam at crests
      float foam = smoothstep(0.18, 0.28, vElevation);
      col = mix(col, uFoamColor, foam * 0.75);

      // Animated caustic shimmer
      float cx = sin(vWorldPos.x * 4.0 + uTime * 2.0) * cos(vWorldPos.z * 3.5 + uTime * 1.8);
      float caustic = smoothstep(0.75, 1.0, cx) * 0.18;
      col += vec3(caustic * 0.6, caustic * 0.8, caustic);

      // Edge froth near shore
      float shoreFroth = smoothstep(1.0, 0.0, vUv.y) * 0.5;
      col = mix(col, uFoamColor, shoreFroth * 0.4);

      gl_FragColor = vec4(col, 0.88);
    }
  `,
  transparent: true,
  side: THREE.FrontSide,
});
const oceanMesh = new THREE.Mesh(oceanGeo, oceanMat);
oceanMesh.rotation.x = -Math.PI / 2;
oceanMesh.position.set(0, 0.05, 14);
scene.add(oceanMesh);

// ═══════════════════════════════════════════════════
// LIGHTING — sun + fill + rim
// ═══════════════════════════════════════════════════
const ambientLight = new THREE.AmbientLight(0xffe8d0, 0.55);
scene.add(ambientLight);

const sunLight = new THREE.DirectionalLight(0xfff5e0, 1.5);
sunLight.position.set(10, 18, 8);
sunLight.castShadow = true;
sunLight.shadow.mapSize.set(2048, 2048);
sunLight.shadow.camera.near   = 0.5;
sunLight.shadow.camera.far    = 60;
sunLight.shadow.camera.left   = -22;
sunLight.shadow.camera.right  =  22;
sunLight.shadow.camera.top    =  22;
sunLight.shadow.camera.bottom = -22;
sunLight.shadow.bias = -0.0008;
scene.add(sunLight);

const moonLight  = new THREE.DirectionalLight(0x6688cc, 0);
moonLight.position.set(-10, 12, -6);
scene.add(moonLight);

// Warm fill light (from below, tropical bounce)
const fillLight  = new THREE.HemisphereLight(0xfff0cc, 0x448844, 0.4);
scene.add(fillLight);

// ═══════════════════════════════════════════════════
// PARTICLE SYSTEMS
// ═══════════════════════════════════════════════════

// ── Fireflies (night) ────────────────────────────
let fireflySystem;
(function buildFireflies() {
  const count = 60;
  const pos   = new Float32Array(count * 3);
  const phase = new Float32Array(count);
  for (let i = 0; i < count; i++) {
    pos[i*3]   = (Math.random() - 0.5) * 24;
    pos[i*3+1] = Math.random() * 2.5 + 0.4;
    pos[i*3+2] = (Math.random() - 0.5) * 18;
    phase[i]   = Math.random() * Math.PI * 2;
  }
  const geo = new THREE.BufferGeometry();
  geo.setAttribute('position', new THREE.BufferAttribute(pos, 3));
  geo.setAttribute('aPhase',   new THREE.BufferAttribute(phase, 1));
  const mat = new THREE.ShaderMaterial({
    uniforms: {
      uTime:    { value: 0 },
      uOpacity: { value: 0 },
    },
    vertexShader: `
      attribute float aPhase;
      uniform float uTime;
      varying float vGlow;
      void main() {
        vec3 p = position;
        p.x += sin(uTime * 0.6 + aPhase) * 0.9;
        p.y += sin(uTime * 0.8 + aPhase * 1.3) * 0.5;
        p.z += cos(uTime * 0.5 + aPhase * 0.9) * 0.9;
        vGlow = 0.5 + 0.5 * sin(uTime * 3.0 + aPhase * 2.0);
        vec4 mv = modelViewMatrix * vec4(p, 1.0);
        gl_PointSize = (6.0 + vGlow * 8.0) * (200.0 / -mv.z);
        gl_Position  = projectionMatrix * mv;
      }
    `,
    fragmentShader: `
      uniform float uOpacity;
      varying float vGlow;
      void main() {
        float d = length(gl_PointCoord - 0.5) * 2.0;
        float a = 1.0 - smoothstep(0.0, 1.0, d);
        vec3 col = mix(vec3(0.6, 1.0, 0.3), vec3(1.0, 1.0, 0.5), vGlow);
        gl_FragColor = vec4(col, a * uOpacity * (0.5 + vGlow * 0.5));
      }
    `,
    transparent: true,
    depthWrite:  false,
    blending:    THREE.AdditiveBlending,
  });
  fireflySystem = new THREE.Points(geo, mat);
  scene.add(fireflySystem);
})();

// ── Floating petals (day ambient) ───────────────
let petalSystem;
(function buildPetals() {
  const count = 40;
  const pos   = new Float32Array(count * 3);
  const phase = new Float32Array(count);
  for (let i = 0; i < count; i++) {
    pos[i*3]   = (Math.random() - 0.5) * 28;
    pos[i*3+1] = Math.random() * 4 + 0.5;
    pos[i*3+2] = (Math.random() - 0.5) * 20;
    phase[i]   = Math.random() * Math.PI * 2;
  }
  const geo = new THREE.BufferGeometry();
  geo.setAttribute('position', new THREE.BufferAttribute(pos, 3));
  geo.setAttribute('aPhase',   new THREE.BufferAttribute(phase, 1));
  const mat = new THREE.ShaderMaterial({
    uniforms: {
      uTime:    { value: 0 },
      uOpacity: { value: 0.7 },
    },
    vertexShader: `
      attribute float aPhase;
      uniform float uTime;
      varying float vCol;
      void main() {
        vec3 p = position;
        float drift = mod(uTime * 0.15 + aPhase * 0.5, 1.0);
        p.x += sin(uTime * 0.4 + aPhase) * 1.2;
        p.y  = position.y + sin(uTime * 0.7 + aPhase * 1.4) * 0.4
               - drift * 1.5;
        p.z += cos(uTime * 0.35 + aPhase * 0.8) * 0.8;
        vCol = aPhase;
        vec4 mv = modelViewMatrix * vec4(p, 1.0);
        gl_PointSize = 5.0 * (180.0 / -mv.z);
        gl_Position  = projectionMatrix * mv;
      }
    `,
    fragmentShader: `
      uniform float uOpacity;
      varying float vCol;
      void main() {
        float d = length(gl_PointCoord - 0.5) * 2.0;
        float a = 1.0 - smoothstep(0.4, 1.0, d);
        vec3 col = mix(vec3(1.0, 0.5, 0.7), vec3(1.0, 0.9, 0.3), fract(vCol));
        gl_FragColor = vec4(col, a * uOpacity * 0.75);
      }
    `,
    transparent: true,
    depthWrite:  false,
    blending:    THREE.AdditiveBlending,
  });
  petalSystem = new THREE.Points(geo, mat);
  scene.add(petalSystem);
})();

// ── Harvest burst (spawned on demand) ───────────
const harvestBursts = [];
export function spawnHarvestBurst(x, z, cropColor) {
  const count  = 22;
  const pos    = new Float32Array(count * 3);
  const vel    = [];
  for (let i = 0; i < count; i++) {
    pos[i*3] = x; pos[i*3+1] = 0.5; pos[i*3+2] = z;
    vel.push(new THREE.Vector3(
      (Math.random() - 0.5) * 4,
      Math.random() * 5 + 2,
      (Math.random() - 0.5) * 4,
    ));
  }
  const geo = new THREE.BufferGeometry();
  geo.setAttribute('position', new THREE.BufferAttribute(pos, 3));
  const mat = new THREE.PointsMaterial({
    color: cropColor || 0xffe066,
    size: 0.18,
    transparent: true,
    depthWrite: false,
    blending: THREE.AdditiveBlending,
  });
  const pts  = new THREE.Points(geo, mat);
  scene.add(pts);
  harvestBursts.push({ pts, vel, pos, life: 1.2 });
}

function tickHarvestBursts(dt) {
  for (let i = harvestBursts.length - 1; i >= 0; i--) {
    const b = harvestBursts[i];
    b.life -= dt;
    if (b.life <= 0) {
      scene.remove(b.pts);
      b.pts.geometry.dispose();
      harvestBursts.splice(i, 1);
      continue;
    }
    const count = b.vel.length;
    for (let j = 0; j < count; j++) {
      b.vel[j].y -= 7 * dt;
      b.pos[j*3]   += b.vel[j].x * dt;
      b.pos[j*3+1] += b.vel[j].y * dt;
      b.pos[j*3+2] += b.vel[j].z * dt;
    }
    b.pts.geometry.attributes.position.needsUpdate = true;
    b.pts.material.opacity = Math.max(0, b.life / 1.2);
  }
}

// ── Water splash on coastal plots when tide rises ──
const waterSplashes = [];

// ═══════════════════════════════════════════════════
// WORLD GEOMETRY
// ═══════════════════════════════════════════════════

function buildWorld() {
  // ── Ground layers ─────────────────────────────
  // Grass base
  const groundGeo = new THREE.PlaneGeometry(54, 30, 1, 1);
  const groundMat = new THREE.MeshLambertMaterial({ color: 0x4caa28 });
  const ground    = new THREE.Mesh(groundGeo, groundMat);
  ground.rotation.x = -Math.PI / 2;
  ground.receiveShadow = true;
  scene.add(ground);

  // Dirt path dirt strip under farm
  const dirtGeo = new THREE.PlaneGeometry(14, 8);
  const dirtMat = new THREE.MeshLambertMaterial({ color: 0x5c4220 });
  const dirt    = new THREE.Mesh(dirtGeo, dirtMat);
  dirt.rotation.x = -Math.PI / 2;
  dirt.position.set(-1, 0.005, 0);
  dirt.receiveShadow = true;
  scene.add(dirt);

  // Sandy beach
  const beachGeo = new THREE.PlaneGeometry(54, 8);
  const beachMat = new THREE.MeshLambertMaterial({ color: 0xf2e3aa });
  const beach    = new THREE.Mesh(beachGeo, beachMat);
  beach.rotation.x = -Math.PI / 2;
  beach.position.set(0, 0.01, 7.5);
  beach.receiveShadow = true;
  scene.add(beach);

  // Beach pebbles (tiny random dark spheres)
  const pebbleGeo = new THREE.SphereGeometry(0.07, 4, 3);
  const pebbleMat = new THREE.MeshLambertMaterial({ color: 0x9a8870 });
  for (let i = 0; i < 60; i++) {
    const p = new THREE.Mesh(pebbleGeo, pebbleMat);
    p.position.set(
      (Math.random() - 0.5) * 50,
      0.04,
      5.5 + Math.random() * 3.5,
    );
    p.rotation.y = Math.random() * Math.PI;
    scene.add(p);
  }

  // Stone path
  const pathStones = [
    [5.5,2],[5.5,1],[5.5,0],[5.5,-1],[5.5,-2],
    [5.5,-3],[5.5,-4],[5.5,-5],
  ];
  const stoneGeo = new THREE.CylinderGeometry(0.42, 0.44, 0.08, 7);
  const stoneMat = new THREE.MeshLambertMaterial({ color: 0xb8a898 });
  for (const [px, pz] of pathStones) {
    const s = new THREE.Mesh(stoneGeo, stoneMat);
    s.position.set(px + (Math.random()-0.5)*0.3, 0.04, pz + (Math.random()-0.5)*0.3);
    s.rotation.y = Math.random() * Math.PI;
    s.receiveShadow = true;
    scene.add(s);
  }

  // Grass clumps for ground detail
  buildGrassClumps();

  // Flowers scattered around
  buildFlowers();

  // Trees
  const treePositions = [
    [-8,-7],[-9.5,-5],[-7,-9],[-11,-2],
    [9,-7],[10.5,-5],[8,-9],[11,-2],
    [-8.5,7],[9.5,8],[-5,11],[6,10],
    [-12, 0],[12, 0],[-6, -8],[6,-8],
  ];
  for (const [tx, tz] of treePositions) buildPalmTree(tx, tz);

  // Rocks
  buildRock(-5,-5,0.55); buildRock(5.5,-5,0.42);
  buildRock(-4,2,0.38);  buildRock(7,1,0.5);
  buildRock(-9, 3, 0.45); buildRock(10, 4, 0.48);

  // Fence
  buildFence();

  // Shop building
  buildShopBuilding();

  // Well
  buildWell(-5.5, -1.5);

  // Tide pool
  buildTidePool(3, 5.5);
}

// ── Tropical Palm Tree (much more realistic) ─────
function buildPalmTree(x, z) {
  const group = new THREE.Group();
  group.position.set(x, 0, z);
  scene.add(group);

  // Curved trunk — stack of slightly offset cylinders
  const trunkSegs = 7;
  const trunkMat  = new THREE.MeshLambertMaterial({ color: 0x7a5c28 });
  let   ty = 0;
  let   tiltX = (Math.random()-0.5)*0.12, tiltZ = (Math.random()-0.5)*0.12;
  for (let i = 0; i < trunkSegs; i++) {
    const r    = 0.16 - i * 0.012;
    const segH = 0.45;
    const geo  = new THREE.CylinderGeometry(r, r+0.025, segH, 7);
    const seg  = new THREE.Mesh(geo, trunkMat);
    seg.position.set(tiltX*i*0.6, ty + segH/2, tiltZ*i*0.6);
    seg.castShadow = true;
    group.add(seg);
    ty += segH - 0.02;

    // Bark ring detail
    if (i % 2 === 0) {
      const ringGeo = new THREE.TorusGeometry(r+0.01, 0.025, 4, 8);
      const ringMat = new THREE.MeshLambertMaterial({ color: 0x5c4018 });
      const ring    = new THREE.Mesh(ringGeo, ringMat);
      ring.rotation.x = Math.PI/2;
      ring.position.set(tiltX*i*0.6, ty - segH*0.3, tiltZ*i*0.6);
      group.add(ring);
    }
  }

  const topY  = ty + 0.2;
  const topX  = tiltX * (trunkSegs-1) * 0.6;
  const topZ  = tiltZ * (trunkSegs-1) * 0.6;

  // Palm fronds — flat angled planes
  const frondCount  = 8;
  const frondColors = [0x2d7a1a, 0x3a9e25, 0x4ab830, 0x28661a];
  for (let f = 0; f < frondCount; f++) {
    const angle    = (f / frondCount) * Math.PI * 2;
    const frondGeo = new THREE.PlaneGeometry(0.28, 1.8, 1, 5);
    const frondMat = new THREE.MeshLambertMaterial({
      color: frondColors[f % frondColors.length],
      side:  THREE.DoubleSide,
    });
    const frond = new THREE.Mesh(frondGeo, frondMat);
    frond.position.set(topX, topY, topZ);
    frond.rotation.y = angle;
    frond.rotation.z = -0.55 - Math.random() * 0.25;
    frond.rotation.x = (Math.random()-0.5)*0.3;
    frond.castShadow = true;

    // Slight curve using morph — skip for perf; rotation approximates curve
    group.add(frond);

    // Coconuts under fronds (on mature trees)
    if (Math.random() > 0.5) {
      const cGeo = new THREE.SphereGeometry(0.1, 6, 5);
      const cMat = new THREE.MeshLambertMaterial({ color: 0x5c3a10 });
      const coc  = new THREE.Mesh(cGeo, cMat);
      coc.position.set(
        topX + Math.cos(angle)*0.25,
        topY - 0.18,
        topZ + Math.sin(angle)*0.25,
      );
      coc.castShadow = true;
      group.add(coc);
    }
  }

  return group;
}

// ── Grass clumps ──────────────────────────────────
function buildGrassClumps() {
  const mat = new THREE.MeshLambertMaterial({ color: 0x4dbb30, side: THREE.DoubleSide });
  const positions = [];
  for (let i = 0; i < 80; i++) {
    positions.push([
      (Math.random()-0.5)*40,
      (Math.random()-0.5)*22,
    ]);
  }
  for (const [gx, gz] of positions) {
    // Skip farm area
    if (gx > -6 && gx < 4 && gz > -3 && gz < 3) continue;
    const blades = 3 + Math.floor(Math.random()*3);
    for (let b = 0; b < blades; b++) {
      const h   = 0.18 + Math.random()*0.22;
      const geo = new THREE.ConeGeometry(0.04, h, 3);
      const m   = new THREE.Mesh(geo, mat);
      m.position.set(
        gx + (Math.random()-0.5)*0.3,
        h/2,
        gz + (Math.random()-0.5)*0.3,
      );
      m.rotation.y = Math.random()*Math.PI;
      m.rotation.z = (Math.random()-0.5)*0.25;
      scene.add(m);
    }
  }
}

// ── Scattered flowers ────────────────────────────
function buildFlowers() {
  const colors = [0xff6eb4, 0xff4444, 0xffdd44, 0xff8c00, 0xaa44ff];
  for (let i = 0; i < 55; i++) {
    const fx = (Math.random()-0.5)*38;
    const fz = (Math.random()-0.5)*20;
    if (fx > -6 && fx < 4 && fz > -3 && fz < 3) continue;
    if (fz > 5) continue; // no flowers on beach

    const stemGeo = new THREE.CylinderGeometry(0.015, 0.02, 0.25, 4);
    const stemMat = new THREE.MeshLambertMaterial({ color: 0x3a8a1a });
    const stem    = new THREE.Mesh(stemGeo, stemMat);
    stem.position.set(fx, 0.125, fz);
    scene.add(stem);

    const petGeo = new THREE.SphereGeometry(0.08, 5, 4);
    const petMat = new THREE.MeshLambertMaterial({ color: colors[i % colors.length] });
    const pet    = new THREE.Mesh(petGeo, petMat);
    pet.scale.y  = 0.5;
    pet.position.set(fx, 0.27, fz);
    scene.add(pet);
  }
}

// ── Rock ─────────────────────────────────────────
function buildRock(x, z, r = 0.4) {
  const geo  = new THREE.DodecahedronGeometry(r, 0);
  const mat  = new THREE.MeshLambertMaterial({ color: 0x8c8070 });
  const mesh = new THREE.Mesh(geo, mat);
  mesh.position.set(x, r*0.5, z);
  mesh.rotation.set(
    Math.random()*Math.PI,
    Math.random()*Math.PI,
    Math.random()*Math.PI,
  );
  mesh.castShadow    = true;
  mesh.receiveShadow = true;
  scene.add(mesh);
  return mesh;
}

// ── Fence ────────────────────────────────────────
function buildFence() {
  const mat = new THREE.MeshLambertMaterial({ color: 0xc8a96e });
  const postGeo = new THREE.CylinderGeometry(0.06, 0.07, 0.65, 6);
  const railGeo = new THREE.CylinderGeometry(0.03, 0.03, 1.3, 5);

  const zRows = [-2.7, 3.0];
  for (const fz of zRows) {
    for (let i = -4; i <= 3; i++) {
      const fx = i * 1.3;
      const post = new THREE.Mesh(postGeo, mat); post.position.set(fx, 0.325, fz); post.castShadow=true; scene.add(post);
      if (i < 3) {
        const rail = new THREE.Mesh(railGeo, mat);
        rail.rotation.z = Math.PI/2;
        rail.position.set(fx+0.65, 0.45, fz);
        scene.add(rail);
        const rail2 = new THREE.Mesh(railGeo, mat);
        rail2.rotation.z = Math.PI/2;
        rail2.position.set(fx+0.65, 0.2, fz);
        scene.add(rail2);
      }
    }
  }
  // Side fence
  for (let j = -2; j <= 2; j++) {
    const fz = j * 1.0;
    const post = new THREE.Mesh(postGeo, mat); post.position.set(-5.4, 0.325, fz); post.castShadow=true; scene.add(post);
  }
}

// ── Shop building ────────────────────────────────
function buildShopBuilding() {
  const g = new THREE.Group();

  // Walls
  const wallMat = new THREE.MeshLambertMaterial({ color: 0xfff0dd });
  const wall    = new THREE.Mesh(new THREE.BoxGeometry(3, 2.2, 3), wallMat);
  wall.position.y = 1.1; wall.castShadow = true; wall.receiveShadow = true;
  g.add(wall);

  // Thatched roof (stacked cones)
  const roofMat = new THREE.MeshLambertMaterial({ color: 0xc8960a });
  const roof1   = new THREE.Mesh(new THREE.ConeGeometry(2.4, 0.9, 4), roofMat);
  roof1.position.y = 2.65; roof1.rotation.y = Math.PI/4; roof1.castShadow = true;
  g.add(roof1);
  const roof2 = new THREE.Mesh(new THREE.ConeGeometry(1.5, 0.6, 4), roofMat);
  roof2.position.y = 3.3; roof2.rotation.y = Math.PI/4; g.add(roof2);

  // Overhang posts
  const postMat = new THREE.MeshLambertMaterial({ color: 0x8c5a20 });
  const postGeo = new THREE.CylinderGeometry(0.07, 0.09, 1.5, 6);
  for (const [px,pz] of [[-1.3,-1.3],[1.3,-1.3],[-1.3,1.3],[1.3,1.3]]) {
    const p = new THREE.Mesh(postGeo, postMat); p.position.set(px,0.75,pz); p.castShadow=true; g.add(p);
  }

  // Sign
  const signBack = new THREE.Mesh(new THREE.BoxGeometry(1.6, 0.55, 0.1),
    new THREE.MeshLambertMaterial({ color: 0x8c5a20 }));
  signBack.position.set(0, 1.5, 1.51); g.add(signBack);
  const signFace = new THREE.Mesh(new THREE.BoxGeometry(1.4, 0.38, 0.06),
    new THREE.MeshLambertMaterial({ color: 0xffe066 }));
  signFace.position.set(0, 1.5, 1.565); g.add(signFace);

  // Door
  const doorMat = new THREE.MeshLambertMaterial({ color: 0x6b3a1a });
  const door    = new THREE.Mesh(new THREE.BoxGeometry(0.55, 1.1, 0.08), doorMat);
  door.position.set(0, 0.55, 1.54); g.add(door);

  g.position.set(8, 0, 2);
  scene.add(g);
}

// ── Well ─────────────────────────────────────────
function buildWell(x, z) {
  const g = new THREE.Group();
  g.position.set(x, 0, z);

  const stoneMat = new THREE.MeshLambertMaterial({ color: 0x9e9080 });
  const baseCyl  = new THREE.CylinderGeometry(0.45, 0.5, 0.5, 10);
  const base     = new THREE.Mesh(baseCyl, stoneMat);
  base.position.y = 0.25; base.castShadow = true; g.add(base);

  const innerGeo = new THREE.CylinderGeometry(0.33, 0.35, 0.25, 10);
  const inner    = new THREE.Mesh(innerGeo, new THREE.MeshLambertMaterial({ color: 0x1a3a5c }));
  inner.position.y = 0.62; g.add(inner);

  // Arch
  const woodMat = new THREE.MeshLambertMaterial({ color: 0x7a4e1a });
  const archPost = new THREE.CylinderGeometry(0.04, 0.04, 0.9, 5);
  [-0.35, 0.35].forEach(ox => {
    const p = new THREE.Mesh(archPost, woodMat);
    p.position.set(ox, 0.95, 0); p.castShadow = true; g.add(p);
  });
  const beam = new THREE.Mesh(new THREE.CylinderGeometry(0.035, 0.035, 0.9, 5), woodMat);
  beam.rotation.z = Math.PI/2; beam.position.y = 1.38; beam.castShadow = true; g.add(beam);

  // Bucket
  const bucketGeo = new THREE.CylinderGeometry(0.08, 0.07, 0.15, 8);
  const bucket    = new THREE.Mesh(bucketGeo, new THREE.MeshLambertMaterial({ color: 0x4a3010 }));
  bucket.position.set(0, 0.9, 0); g.add(bucket);

  scene.add(g);
}

// ── Tide pool ────────────────────────────────────
function buildTidePool(x, z) {
  const poolGeo = new THREE.CylinderGeometry(0.9, 1.0, 0.12, 12);
  const poolMat = new THREE.MeshLambertMaterial({ color: 0x6a8a70 });
  const pool    = new THREE.Mesh(poolGeo, poolMat);
  pool.position.set(x, 0.06, z);
  pool.receiveShadow = true;
  scene.add(pool);

  const waterGeo = new THREE.CylinderGeometry(0.78, 0.78, 0.04, 12);
  const waterMat = new THREE.MeshLambertMaterial({ color: 0x2288cc, transparent: true, opacity: 0.75 });
  const water    = new THREE.Mesh(waterGeo, waterMat);
  water.position.set(x, 0.14, z);
  scene.add(water);
}

// ── Obstacles for player collision ───────────────
const OBSTACLES = [
  ...[ [-8,-7],[-9.5,-5],[-7,-9],[-11,-2],[9,-7],[10.5,-5],[8,-9],[11,-2],
       [-8.5,7],[9.5,8],[-5,11],[6,10],[-12,0],[12,0],[-6,-8],[6,-8] ]
    .map(([x,z]) => ({ x, z, radius: 0.75 })),
  { x: 6,   z: -3, radius: 0.75 }, // NPC
  { x: 8,   z: 2,  radius: 1.3  }, // shop
  { x: -5.5,z: -1.5, radius: 0.8},  // well
];

// ═══════════════════════════════════════════════════
// DAY / NIGHT — dramatic lighting updates
// ═══════════════════════════════════════════════════

const skyColors = {
  deep:    new THREE.Color(0x0e3a6e),
  mid:     new THREE.Color(0x5abaee),
  horizon: new THREE.Color(0xffe0b2),
  dawnD:   new THREE.Color(0xff7043),
  dawnM:   new THREE.Color(0xffab40),
  dawnH:   new THREE.Color(0xff8f00),
};

function updateDayNight(gameMinute) {
  const hour = (gameMinute / 60) % 24;
  const t    = Math.sin(Math.max(0, Math.min(1, (hour - 5.5) / 14)) * Math.PI); // 0→1→0 during day
  const isDay = hour >= 5.5 && hour <= 20.5;
  const nightBlend = isDay ? 0 : 1;

  // Dawn/dusk factor
  const dawn = Math.max(0, 1 - Math.abs(hour - 6)   / 1.8);
  const dusk = Math.max(0, 1 - Math.abs(hour - 19.5) / 1.8);
  const dd   = Math.max(dawn, dusk);

  // Sun position
  const sunAngle = ((hour - 6) / 14) * Math.PI;
  const sunDir   = new THREE.Vector3(
    Math.cos(sunAngle) * 12,
    Math.sin(Math.max(0, sunAngle)) * 16,
    6,
  ).normalize();

  // Update sky shader
  skyMat.uniforms.uSunDir.value.copy(sunDir.clone().multiplyScalar(80));
  skyMat.uniforms.uNight.value  = nightBlend;
  skyMat.uniforms.uTime.value  += 0.001;

  // Sky colors driven by time
  if (isDay) {
    const topCol = skyColors.deep.clone().lerp(skyColors.mid, t * 0.7).lerp(skyColors.dawnD, dd * 0.4);
    const midCol = skyColors.mid.clone().lerp(new THREE.Color(0x87ceeb), t).lerp(skyColors.dawnM, dd*0.5);
    const horCol = skyColors.horizon.clone().lerp(new THREE.Color(0xffd0a0), dd);
    skyMat.uniforms.uTopColor.value.copy(topCol);
    skyMat.uniforms.uMidColor.value.copy(midCol);
    skyMat.uniforms.uHorizonColor.value.copy(horCol);
  }

  // Stars and fireflies
  starsMesh.material.uniforms.uOpacity.value = THREE.MathUtils.lerp(
    starsMesh.material.uniforms.uOpacity.value,
    nightBlend, 0.02
  );
  fireflySystem.material.uniforms.uOpacity.value = THREE.MathUtils.lerp(
    fireflySystem.material.uniforms.uOpacity.value,
    nightBlend * 0.9, 0.015
  );
  petalSystem.material.uniforms.uOpacity.value = THREE.MathUtils.lerp(
    petalSystem.material.uniforms.uOpacity.value,
    isDay ? 0.7 : 0.0, 0.02
  );

  // Sun light
  if (isDay) {
    sunLight.position.set(sunDir.x*20, sunDir.y*20, sunDir.z*20);
    sunLight.intensity = 0.1 + t * 1.6;
    sunLight.color.setHSL(0.08 + t * 0.04, 0.5 + t*0.3, 0.8 + t*0.15);
    moonLight.intensity = 0;
    ambientLight.intensity = 0.25 + t * 0.5;
    ambientLight.color.lerpColors(
      new THREE.Color(0xff8844), new THREE.Color(0xfff0e0), t
    );
    fillLight.intensity = 0.2 + t * 0.35;
  } else {
    sunLight.intensity = 0;
    moonLight.intensity = 0.3;
    ambientLight.intensity = 0.1;
    ambientLight.color.setHex(0x3355aa);
    fillLight.intensity = 0.08;
  }

  // Fog — color follows sky
  const fogColor = isDay
    ? new THREE.Color(0x87ceeb).lerp(new THREE.Color(0xffd0a0), dd)
    : new THREE.Color(0x050510);
  scene.fog = new THREE.Fog(fogColor, 18, 52);
}

// ═══════════════════════════════════════════════════
// ACTION SYSTEM
// ═══════════════════════════════════════════════════

let _actionLocked = false;

function handleAction(player, farm, npc, dialogueBox, hud) {
  if (_actionLocked) return;
  const state = gameState.get();
  if (state.shopOpen || state.dialogueOpen) return;

  const px = player.getPosition().x;
  const pz = player.getPosition().z;

  if (player.isNear(npc.x, npc.z, 2.5)) {
    dialogueBox.show('🌺 Mira', npc.getNextDialogue(), () => gameState.set({ dialogueOpen: false }));
    gameState.set({ dialogueOpen: true });
    _actionLocked = true;
    setTimeout(() => { _actionLocked = false; }, 600);
    return;
  }

  const nearPlot = farm.getPlotNear(px, pz, 1.0);
  if (!nearPlot) { showToast('Move closer to a plot or Mira!'); return; }

  const { index, plotData } = nearPlot;
  const plots = [...state.plots];

  if (plotData.isCoastal && state.tide > 0.65) {
    showToast('🌊 Flooded! Wait for low tide.');
    return;
  }

  if (!plotData.tilled) {
    plots[index] = { ...plotData, tilled: true };
    gameState.set({ plots });
    showToast('✅ Plot tilled!');
    _actionLocked = true; setTimeout(() => { _actionLocked = false; }, 500);
    return;
  }

  if (!plotData.cropType) {
    const sel = state.selectedItem;
    if (!sel || !CROPS[sel]) { showToast('Select a seed in your inventory!'); return; }
    const inv = { ...state.inventory };
    if (!inv[sel] || inv[sel] <= 0) { showToast(`No ${CROPS[sel].name} seeds!`); return; }
    inv[sel]--;
    plots[index] = { ...plotData, cropType: sel, growthProgress: 0, growthStage: 0, watered: false };
    gameState.set({ plots, inventory: inv });
    showToast(`🌱 Planted ${CROPS[sel].name}!`);
    _actionLocked = true; setTimeout(() => { _actionLocked = false; }, 500);
    return;
  }

  if (!plotData.watered && plotData.growthStage < 4) {
    plots[index] = { ...plotData, watered: true };
    gameState.set({ plots });
    showToast('💧 Watered!');
    _actionLocked = true; setTimeout(() => { _actionLocked = false; }, 500);
    return;
  }

  if (isReadyToHarvest(plotData)) {
    const cropDef = CROPS[plotData.cropType];
    const inv     = { ...state.inventory };
    inv[plotData.cropType] = (inv[plotData.cropType] || 0) + 1;
    plots[index] = { ...plotData, cropType: null, growthProgress: 0, growthStage: 0, watered: false, tilled: true };
    gameState.set({ plots, inventory: inv });
    spawnHarvestBurst(plotData.x, plotData.z, cropDef.color);
    showToast(`🎉 Harvested ${cropDef.name}!`);
    _actionLocked = true; setTimeout(() => { _actionLocked = false; }, 500);
    return;
  }

  if (plotData.watered) {
    const cropDef = CROPS[plotData.cropType];
    showToast(`${cropDef.icon} Growing: Stage ${plotData.growthStage}/4`);
  }
}

function updateActionLabel(player, farm, npc, hud) {
  const state = gameState.get();
  if (state.shopOpen || state.dialogueOpen) { hud.setActionLabel('', ''); return; }
  const px = player.getPosition().x;
  const pz = player.getPosition().z;
  if (player.isNear(npc.x, npc.z, 2.5)) { hud.setActionLabel('Talk', '💬'); return; }
  const n = farm.getPlotNear(px, pz, 1.0);
  if (n) {
    const pd = n.plotData;
    if (!pd.tilled)               hud.setActionLabel('Till', '⛏️');
    else if (!pd.cropType)        hud.setActionLabel('Plant', '🌱');
    else if (isReadyToHarvest(pd))hud.setActionLabel('Harvest', '🧺');
    else if (needsWater(pd))      hud.setActionLabel('Water', '💧');
    else                          hud.setActionLabel('Growing...', '⏳');
    return;
  }
  hud.setActionLabel('Interact', '⚡');
}

// ═══════════════════════════════════════════════════
// INIT
// ═══════════════════════════════════════════════════


// ═══════════════════════════════════════════════════
// MINI-MAP — top-left canvas showing world overview
// ═══════════════════════════════════════════════════
const _mmCanvas = document.getElementById('minimap');
const _mmCtx    = _mmCanvas ? _mmCanvas.getContext('2d') : null;
const MM_WORLD  = 18;

function _mm(wx, wz) {
  const W = _mmCanvas.width, H = _mmCanvas.height;
  return [((wx + MM_WORLD) / (MM_WORLD*2)) * W, ((wz + MM_WORLD) / (MM_WORLD*2)) * H];
}

function drawMinimap(playerPos, plotsData, npcX, npcZ) {
  if (!_mmCtx || !_mmCanvas) return;
  const W = _mmCanvas.width, H = _mmCanvas.height;
  const ctx = _mmCtx;
  ctx.save();
  ctx.clearRect(0, 0, W, H);
  ctx.beginPath(); ctx.arc(W/2, H/2, W/2, 0, Math.PI*2); ctx.clip();

  ctx.fillStyle = 'rgba(38,86,24,0.94)'; ctx.fillRect(0,0,W,H);
  const beachY = ((6 + MM_WORLD) / (MM_WORLD*2)) * H;
  ctx.fillStyle = 'rgba(220,195,120,0.75)'; ctx.fillRect(0, beachY, W, H*0.09);
  ctx.fillStyle = 'rgba(5,55,155,0.72)'; ctx.fillRect(0, beachY+H*0.08, W, H);

  ctx.strokeStyle = 'rgba(255,255,255,0.07)'; ctx.lineWidth = 0.5;
  for (let i=1; i<4; i++) {
    ctx.beginPath(); ctx.moveTo(W*i/4,0); ctx.lineTo(W*i/4,H); ctx.stroke();
    ctx.beginPath(); ctx.moveTo(0,H*i/4); ctx.lineTo(W,H*i/4); ctx.stroke();
  }

  for (const plot of plotsData) {
    const [sx,sy] = _mm(plot.x, plot.z);
    const col = plot.growthStage>=4 ? '#ffe066' : plot.cropType ? (plot.watered?'#4ecdc4':'#ff9944') : plot.tilled ? '#7a5030' : 'rgba(100,70,40,0.5)';
    const sz  = plot.growthStage>=4 ? 5 : 3.5;
    ctx.fillStyle = col; ctx.fillRect(sx-sz/2, sy-sz/2, sz, sz);
  }

  const [nx,ny] = _mm(npcX, npcZ);
  ctx.fillStyle='#ff88cc'; ctx.beginPath(); ctx.arc(nx,ny,3.5,0,Math.PI*2); ctx.fill();
  ctx.strokeStyle='#fff'; ctx.lineWidth=1; ctx.stroke();

  const [px2,py2] = _mm(playerPos.x, playerPos.z);
  ctx.fillStyle='#fff'; ctx.beginPath(); ctx.arc(px2,py2,4.5,0,Math.PI*2); ctx.fill();
  ctx.strokeStyle='#4ecdc4'; ctx.lineWidth=2; ctx.stroke();
  ctx.restore();

  ctx.strokeStyle='rgba(78,205,196,0.4)'; ctx.lineWidth=1.5;
  ctx.beginPath(); ctx.arc(W/2,H/2,W/2-1,0,Math.PI*2); ctx.stroke();
}

function init() {
  const bar = document.getElementById('loading-bar');
  let progress = 0;
  const loadTick = setInterval(() => {
    progress = Math.min(95, progress + 12);
    bar.style.width = progress + '%';
  }, 70);

  buildWorld();

  const farm        = new Farm(scene);
  const player      = new Player(scene);
  const npc         = new NPC(scene);
  const joystick    = new Joystick();
  const hud         = new HUD();
  const dialogueBox = new DialogueBox();
  const shop        = new Shop();

  const invBar = new InventoryBar(key => {
    gameState.set({ selectedItem: key });
    invBar.update(gameState.get().inventory, key);
  });
  invBar.update(gameState.get().inventory, gameState.get().selectedItem);

  document.getElementById('action-btn').addEventListener('click', () => handleAction(player, farm, npc, dialogueBox, hud));
  document.getElementById('action-btn').addEventListener('touchend', e => { e.preventDefault(); handleAction(player, farm, npc, dialogueBox, hud); });

  gameState.subscribe(state => invBar.update(state.inventory, state.selectedItem));

  window.addEventListener('resize', () => {
    camera.aspect = window.innerWidth / window.innerHeight;
    camera.updateProjectionMatrix();
    renderer.setSize(window.innerWidth, window.innerHeight);
  });

  setInterval(() => gameState.save(), 30_000);

  clearInterval(loadTick);
  bar.style.width = '100%';
  setTimeout(() => {
    document.getElementById('loading-screen').style.display = 'none';
    showToast('🌴 Welcome to Lagoon Valley!');
  }, 350);

  // ── Game loop ──────────────────────────────────
  let lastTime = performance.now();

  function gameLoop(now) {
    requestAnimationFrame(gameLoop);

    const dt   = Math.min((now - lastTime) / 1000, 0.1);
    lastTime   = now;
    const t    = now * 0.001;

    const state = gameState.get();

    // Advance time
    const delta = dt * TIME_SCALE / 60;
    let newMin = state.gameMinute + delta;
    let newDay = state.day;
    if (newMin >= DAY_LENGTH) {
      newMin -= DAY_LENGTH;
      newDay++;
      showToast(`🌅 Day ${newDay} begins!`);
      const plots = state.plots.map(p => ({ ...p, watered: false }));
      gameState.set({ plots });
    }

    const tideLevel = computeTide(newMin);
    const plots     = state.plots.map(p => tickCrop(p, delta));
    gameState.set({ gameMinute: newMin, day: newDay, tide: tideLevel, plots });

    // Player movement
    if (!state.shopOpen && !state.dialogueOpen) {
      player.update(joystick.dx, joystick.dz, dt, OBSTACLES, 19);
    }

    // Camera follow
    const targetCam = player.getPosition().clone().add(CAM_OFFSET);
    camera.position.lerp(targetCam, 0.09);
    camera.lookAt(player.getPosition());

    // Animated ocean
    oceanUniforms.uTime.value  = t;
    oceanUniforms.uTide.value  = tideLevel;

    // Particle systems time
    fireflySystem.material.uniforms.uTime.value = t;
    petalSystem.material.uniforms.uTime.value   = t;

    // Sky follows camera (always centered)
    skyMesh.position.copy(camera.position);

    // Stars follow camera too
    starsMesh.position.copy(camera.position);

    // Systems
    farm.update(tideLevel);
    npc.update(camera.position);
    hud.update({ ...state, tide: tideLevel });
    updateActionLabel(player, farm, npc, hud);

    // Day/night visuals
    updateDayNight(newMin);

    // Harvest bursts
    tickHarvestBursts(dt);

    // Draw mini-map overlay
  drawMinimap(player.getPosition(), gameState.get().plots, npc.x, npc.z);
  renderer.render(scene, camera);
  }

  requestAnimationFrame(gameLoop);
}

init();
