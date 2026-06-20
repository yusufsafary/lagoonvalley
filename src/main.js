// ═══════════════════════════════════════════════════════
// MAIN — game entry point, scene setup, game loop
// ═══════════════════════════════════════════════════════
import * as THREE from 'three';
import { gameState, TIME_SCALE, DAY_LENGTH, CROPS } from './store/gameState.js';
import { tickCrop, isReadyToHarvest, needsWater } from './utils/growth.js';
import { computeTide } from './utils/tide.js';
import { Player }      from './components/Player.js';
import { Farm }        from './components/Farm.js';
import { NPC }         from './components/NPC.js';
import { Joystick }    from './components/Joystick.js';
import { HUD }         from './components/HUD.js';
import { DialogueBox } from './components/DialogueBox.js';
import { InventoryBar }from './components/InventoryBar.js';
import { Shop }        from './components/Shop.js';

// ── Toast helper (exported so Shop.js can use it) ────────
let _toastTimer = null;
export function showToast(msg) {
  const el = document.getElementById('toast');
  el.textContent = msg;
  el.classList.add('show');
  clearTimeout(_toastTimer);
  _toastTimer = setTimeout(() => el.classList.remove('show'), 2200);
}

// ── Three.js scene ───────────────────────────────────────
const container = document.getElementById('canvas-container');
const renderer  = new THREE.WebGLRenderer({ antialias: true, powerPreference: 'high-performance' });
renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
renderer.setSize(window.innerWidth, window.innerHeight);
renderer.shadowMap.enabled = true;
renderer.shadowMap.type    = THREE.PCFSoftShadowMap;
renderer.toneMapping       = THREE.ACESFilmicToneMapping;
renderer.toneMappingExposure = 0.9;
container.appendChild(renderer.domElement);

const scene  = new THREE.Scene();
scene.fog    = new THREE.Fog(0x87ceeb, 20, 55);
scene.background = new THREE.Color(0x87ceeb);

// ── Camera (isometric-ish top-down perspective) ──────────
const camera = new THREE.PerspectiveCamera(55, window.innerWidth / window.innerHeight, 0.1, 100);
const CAM_OFFSET = new THREE.Vector3(0, 10, 8);
camera.position.copy(CAM_OFFSET);
camera.lookAt(0, 0, 0);

// ── Lighting ─────────────────────────────────────────────
const ambientLight = new THREE.AmbientLight(0xffeedd, 0.6);
scene.add(ambientLight);

const sunLight = new THREE.DirectionalLight(0xfff5e0, 1.2);
sunLight.position.set(8, 14, 6);
sunLight.castShadow = true;
sunLight.shadow.mapSize.width  = 1024;
sunLight.shadow.mapSize.height = 1024;
sunLight.shadow.camera.near   = 0.5;
sunLight.shadow.camera.far    = 60;
sunLight.shadow.camera.left   = -20;
sunLight.shadow.camera.right  =  20;
sunLight.shadow.camera.top    =  20;
sunLight.shadow.camera.bottom = -20;
scene.add(sunLight);

const moonLight = new THREE.DirectionalLight(0x5577bb, 0.0);
moonLight.position.set(-8, 10, -4);
scene.add(moonLight);

// ── World geometry ───────────────────────────────────────
function buildWorld() {
  // Ground
  const groundGeo = new THREE.PlaneGeometry(50, 50, 1, 1);
  const groundMat = new THREE.MeshLambertMaterial({ color: 0x6ab04c });
  const ground    = new THREE.Mesh(groundGeo, groundMat);
  ground.rotation.x = -Math.PI / 2;
  ground.receiveShadow = true;
  scene.add(ground);

  // Sandy beach strip
  const beachGeo = new THREE.PlaneGeometry(50, 6);
  const beachMat = new THREE.MeshLambertMaterial({ color: 0xf0d898 });
  const beach    = new THREE.Mesh(beachGeo, beachMat);
  beach.rotation.x = -Math.PI / 2;
  beach.position.set(0, 0.01, 6);
  beach.receiveShadow = true;
  scene.add(beach);

  // Ocean plane (animated by shader color change)
  const oceanGeo = new THREE.PlaneGeometry(50, 14);
  const oceanMat = new THREE.MeshLambertMaterial({ color: 0x1e90ff, transparent: true, opacity: 0.85 });
  const ocean    = new THREE.Mesh(oceanGeo, oceanMat);
  ocean.rotation.x = -Math.PI / 2;
  ocean.position.set(0, 0.02, 13);
  scene.add(ocean);
  window._oceanMat = oceanMat; // update opacity for tide

  // Path
  const pathGeo = new THREE.PlaneGeometry(1.2, 20);
  const pathMat = new THREE.MeshLambertMaterial({ color: 0xd4a96a });
  const path    = new THREE.Mesh(pathGeo, pathMat);
  path.rotation.x = -Math.PI / 2;
  path.position.set(5.5, 0.015, 0);
  scene.add(path);

  // Trees (cone + cylinder)
  const treePositions = [
    [-8,-6],[-9,-4],[-7,-8],[-10,-2],[9,-6],[10,-4],[8,-8],[11,-2],
    [-8,7],[9,8],[-5,10],[6,10],
  ];
  for (const [tx, tz] of treePositions) {
    buildTree(tx, tz);
  }

  // Rocks
  const rockPositions = [[-5,-5],[5.5,-5],[-4,2],[7,1]];
  for (const [rx, rz] of rockPositions) {
    buildRock(rx, rz);
  }

  // Fence around farm area
  buildFence();
}

function buildTree(x, z) {
  const group = new THREE.Group();
  group.position.set(x, 0, z);

  const trunkGeo = new THREE.CylinderGeometry(0.18, 0.25, 1.4, 6);
  const trunkMat = new THREE.MeshLambertMaterial({ color: 0x8B4513 });
  const trunk    = new THREE.Mesh(trunkGeo, trunkMat);
  trunk.position.y = 0.7;
  trunk.castShadow = true;
  group.add(trunk);

  // Layered cones for canopy (low-poly tropical look)
  const leafColors = [0x2d8a1f, 0x3aaa2a, 0x45c834];
  const sizes      = [[0.9, 1.0], [0.75, 0.8], [0.55, 0.65]];
  sizes.forEach(([r, h], i) => {
    const coneGeo = new THREE.ConeGeometry(r, h, 7);
    const coneMat = new THREE.MeshLambertMaterial({ color: leafColors[i] });
    const cone    = new THREE.Mesh(coneGeo, coneMat);
    cone.position.y = 1.4 + i * 0.5;
    cone.castShadow = true;
    group.add(cone);
  });

  scene.add(group);
  return group;
}

function buildRock(x, z) {
  const geo  = new THREE.DodecahedronGeometry(0.35, 0);
  const mat  = new THREE.MeshLambertMaterial({ color: 0x9e9e9e });
  const mesh = new THREE.Mesh(geo, mat);
  mesh.position.set(x, 0.2, z);
  mesh.rotation.y = Math.random() * Math.PI;
  mesh.castShadow = true;
  scene.add(mesh);
}

function buildFence() {
  const postGeo = new THREE.BoxGeometry(0.1, 0.6, 0.1);
  const railGeo = new THREE.BoxGeometry(1.3, 0.08, 0.06);
  const mat     = new THREE.MeshLambertMaterial({ color: 0xc8a96e });

  const positions = [];
  for (let i = -4; i <= 3; i++) positions.push([i * 1.3, -2.5, 'z']);
  for (let i = -4; i <= 3; i++) positions.push([i * 1.3,  2.8, 'z']);
  for (let j = -2; j <= 2; j++) positions.push([-5.2, j * 1.0, 'x']);

  for (const [x, z] of positions) {
    const post = new THREE.Mesh(postGeo, mat);
    post.position.set(x, 0.3, z);
    post.castShadow = true;
    scene.add(post);

    const rail = new THREE.Mesh(railGeo, mat);
    rail.position.set(x, 0.42, z);
    if (z === -2.5 || z === 2.8) rail.rotation.y = Math.PI / 2;
    scene.add(rail);
  }
}

// ── Obstacle list (trees, rocks, NPC) for collision ─────
const OBSTACLES = [
  // trees
  ...[ [-8,-6],[-9,-4],[-7,-8],[-10,-2],[9,-6],[10,-4],[8,-8],[11,-2],
       [-8,7],[9,8],[-5,10],[6,10] ].map(([x,z]) => ({ x, z, radius: 0.7 })),
  // rocks
  ...[ [-5,-5],[5.5,-5],[-4,2],[7,1] ].map(([x,z]) => ({ x, z, radius: 0.5 })),
  // NPC
  { x: 6, z: -3, radius: 0.7 },
  // shop building (right side)
  { x: 8, z: 2, radius: 1.0 },
];

// ── Shop building mesh ───────────────────────────────────
function buildShopBuilding() {
  const g = new THREE.Group();
  const wallMat = new THREE.MeshLambertMaterial({ color: 0xffeedd });
  const roofMat = new THREE.MeshLambertMaterial({ color: 0xff6b35 });

  const wall = new THREE.Mesh(new THREE.BoxGeometry(2.5, 2, 2.5), wallMat);
  wall.position.y = 1;
  wall.castShadow = true;
  g.add(wall);

  const roof = new THREE.Mesh(new THREE.ConeGeometry(1.9, 1.2, 4), roofMat);
  roof.position.y = 2.6;
  roof.rotation.y = Math.PI / 4;
  roof.castShadow = true;
  g.add(roof);

  // Sign
  const signGeo = new THREE.BoxGeometry(1.4, 0.5, 0.1);
  const signMat = new THREE.MeshLambertMaterial({ color: 0xffe066 });
  const sign    = new THREE.Mesh(signGeo, signMat);
  sign.position.set(0, 1.3, 1.26);
  g.add(sign);

  g.position.set(8, 0, 2);
  scene.add(g);
}

// ── System: day/night lighting update ───────────────────
function updateDayNight(gameMinute) {
  const hour = (gameMinute / 60) % 24;

  // Sun angle: rises at 6, sets at 20
  const sunAngle   = ((hour - 6) / 14) * Math.PI; // 0..PI during day
  const isDaytime  = hour >= 5.5 && hour <= 20.5;
  const dawnDusk   = Math.max(0, 1 - Math.abs(hour - 6) / 2) + Math.max(0, 1 - Math.abs(hour - 20) / 2);

  if (isDaytime) {
    const t = Math.sin(sunAngle);

    // Sky
    const skyColor = new THREE.Color().lerpColors(
      new THREE.Color(0xff7043), new THREE.Color(0x87ceeb), t
    );
    scene.background.copy(skyColor);
    scene.fog.color.copy(skyColor);

    // Sun
    sunLight.intensity = 0.3 + t * 1.0;
    sunLight.position.set(
      Math.cos(sunAngle) * 12,
      Math.sin(sunAngle) * 12,
      6
    );

    // Sun color: dawn/dusk = orange, noon = white
    sunLight.color.lerpColors(
      new THREE.Color(0xff8844), new THREE.Color(0xfff5e0),
      Math.sin(sunAngle)
    );

    ambientLight.intensity = 0.3 + t * 0.45;
    ambientLight.color.lerpColors(new THREE.Color(0xff9966), new THREE.Color(0xffeedd), t);

    moonLight.intensity = 0;
  } else {
    // Night
    scene.background.setHex(0x0a0a1a);
    scene.fog.color.setHex(0x0a0a1a);
    sunLight.intensity    = 0;
    moonLight.intensity   = 0.25;
    ambientLight.intensity = 0.15;
    ambientLight.color.setHex(0x334488);
  }
}

// ── Action system ────────────────────────────────────────
let _actionLocked = false;

function handleAction(player, farm, npc, dialogueBox, hud) {
  if (_actionLocked) return;
  const state = gameState.get();
  if (state.shopOpen || state.dialogueOpen) return;

  const px = player.getPosition().x;
  const pz = player.getPosition().z;

  // NPC interaction
  if (player.isNear(npc.x, npc.z, 2.5)) {
    const line = npc.getNextDialogue();
    dialogueBox.show('🌺 Mira', line, () => gameState.set({ dialogueOpen: false }));
    gameState.set({ dialogueOpen: true });
    _actionLocked = true;
    setTimeout(() => { _actionLocked = false; }, 600);
    return;
  }

  // Plot interaction — find nearest plot
  const nearPlot = farm.getPlotNear(px, pz, 1.0);
  if (!nearPlot) {
    showToast('Move closer to a plot or Mira!');
    return;
  }

  const { index, plotData } = nearPlot;
  const plots = [...state.plots];

  // Coastal blocked by tide
  if (plotData.isCoastal && state.tide > 0.65) {
    showToast("🌊 Flooded! Wait for low tide.");
    return;
  }

  // Step 1: Till
  if (!plotData.tilled) {
    plots[index] = { ...plotData, tilled: true };
    gameState.set({ plots });
    showToast('✅ Plot tilled!');
    _actionLocked = true;
    setTimeout(() => { _actionLocked = false; }, 500);
    return;
  }

  // Step 2: Plant (needs selected seed)
  if (plotData.tilled && !plotData.cropType) {
    const sel = state.selectedItem;
    if (!sel || !CROPS[sel]) { showToast('Select a seed in your inventory!'); return; }
    const inv = { ...state.inventory };
    if (!inv[sel] || inv[sel] <= 0) { showToast(`No ${CROPS[sel].name} seeds!`); return; }
    inv[sel]--;
    plots[index] = { ...plotData, cropType: sel, growthProgress: 0, growthStage: 0, watered: false };
    gameState.set({ plots, inventory: inv });
    showToast(`🌱 Planted ${CROPS[sel].name}!`);
    _actionLocked = true;
    setTimeout(() => { _actionLocked = false; }, 500);
    return;
  }

  // Step 3: Water
  if (plotData.tilled && plotData.cropType && !plotData.watered && plotData.growthStage < 4) {
    plots[index] = { ...plotData, watered: true };
    gameState.set({ plots });
    showToast('💧 Watered!');
    _actionLocked = true;
    setTimeout(() => { _actionLocked = false; }, 500);
    return;
  }

  // Step 4: Harvest
  if (isReadyToHarvest(plotData)) {
    const cropDef = CROPS[plotData.cropType];
    const inv     = { ...state.inventory };
    inv[plotData.cropType] = (inv[plotData.cropType] || 0) + 1;
    plots[index] = {
      ...plotData, cropType: null, growthProgress: 0, growthStage: 0,
      watered: false, tilled: true, // keep tilled after harvest
    };
    gameState.set({ plots, inventory: inv });
    showToast(`🎉 Harvested ${cropDef.name}! Sell it at the shop.`);
    _actionLocked = true;
    setTimeout(() => { _actionLocked = false; }, 500);
    return;
  }

  // Already watered / growing
  if (plotData.watered) {
    const cropDef = CROPS[plotData.cropType];
    showToast(`${cropDef.icon} ${cropDef.name}: Stage ${plotData.growthStage}/4`);
  }
}

// ── Determine action label for current context ───────────
function updateActionLabel(player, farm, npc, hud) {
  const state = gameState.get();
  if (state.shopOpen || state.dialogueOpen) {
    hud.setActionLabel('', '');
    return;
  }

  const px = player.getPosition().x;
  const pz = player.getPosition().z;

  if (player.isNear(npc.x, npc.z, 2.5)) {
    hud.setActionLabel('Talk', '💬');
    return;
  }

  const nearPlot = farm.getPlotNear(px, pz, 1.0);
  if (nearPlot) {
    const pd = nearPlot.plotData;
    if (!pd.tilled)                                   hud.setActionLabel('Till', '⛏️');
    else if (!pd.cropType)                            hud.setActionLabel('Plant', '🌱');
    else if (isReadyToHarvest(pd))                    hud.setActionLabel('Harvest', '🧺');
    else if (needsWater(pd))                          hud.setActionLabel('Water', '💧');
    else                                              hud.setActionLabel('Growing...', '⏳');
    return;
  }

  hud.setActionLabel('Interact', '⚡');
}

// ── Init all systems ─────────────────────────────────────
function init() {
  // Loading bar progress
  const bar = document.getElementById('loading-bar');
  let progress = 0;
  const tick = setInterval(() => {
    progress = Math.min(95, progress + 15);
    bar.style.width = progress + '%';
  }, 80);

  buildWorld();
  buildShopBuilding();

  const farm        = new Farm(scene);
  const player      = new Player(scene);
  const npc         = new NPC(scene);
  const joystick    = new Joystick();
  const hud         = new HUD();
  const dialogueBox = new DialogueBox();
  const shop        = new Shop();

  // Inventory bar
  const invBar = new InventoryBar(key => {
    const state = gameState.get();
    gameState.set({ selectedItem: key });
    invBar.update(state.inventory, key);
  });

  // Initial inventory render
  const initialState = gameState.get();
  invBar.update(initialState.inventory, initialState.selectedItem);

  // Action button
  const actionBtn = document.getElementById('action-btn');
  actionBtn.addEventListener('click',    () => handleAction(player, farm, npc, dialogueBox, hud));
  actionBtn.addEventListener('touchend', e => { e.preventDefault(); handleAction(player, farm, npc, dialogueBox, hud); });

  // Subscribe to state changes — keep inventory bar fresh
  gameState.subscribe(state => {
    invBar.update(state.inventory, state.selectedItem);
  });

  // Resize handler
  window.addEventListener('resize', () => {
    camera.aspect = window.innerWidth / window.innerHeight;
    camera.updateProjectionMatrix();
    renderer.setSize(window.innerWidth, window.innerHeight);
  });

  // Auto-save every 30 seconds
  setInterval(() => { gameState.save(); }, 30_000);

  // Hide loading after a tick
  clearInterval(tick);
  bar.style.width = '100%';
  setTimeout(() => {
    document.getElementById('loading-screen').style.display = 'none';
    showToast('🌴 Welcome to Lagoon Valley! Tap a plot to start farming.');
  }, 400);

  // ── Game loop ─────────────────────────────────────────
  let lastTime = performance.now();

  function gameLoop(now) {
    requestAnimationFrame(gameLoop);

    const dt     = Math.min((now - lastTime) / 1000, 0.1); // cap at 100ms
    lastTime = now;

    const state = gameState.get();

    // Advance game time
    const deltaGameMinutes = dt * TIME_SCALE / 60;
    let newMinute = state.gameMinute + deltaGameMinutes;
    let newDay    = state.day;

    if (newMinute >= DAY_LENGTH) {
      newMinute -= DAY_LENGTH;
      newDay++;
      showToast(`🌅 Day ${newDay} begins!`);
      // De-water all plots at day end
      const plots = state.plots.map(p => ({ ...p, watered: false }));
      gameState.set({ plots });
    }

    // Tide
    const tideLevel = computeTide(newMinute);

    // Tick all crops
    const plots = state.plots.map(p => tickCrop(p, deltaGameMinutes));

    gameState.set({
      gameMinute: newMinute,
      day: newDay,
      tide: tideLevel,
      plots,
    });

    // Player movement (skip if dialogue/shop open)
    if (!state.shopOpen && !state.dialogueOpen) {
      player.update(joystick.dx, joystick.dz, dt, OBSTACLES, 18);
    }

    // Camera follow player smoothly
    const targetCam = player.getPosition().clone().add(CAM_OFFSET);
    camera.position.lerp(targetCam, 0.08);
    camera.lookAt(player.getPosition());

    // Systems update
    farm.update(tideLevel);
    npc.update(camera.position);
    hud.update({ ...state, tide: tideLevel });
    updateActionLabel(player, farm, npc, hud);

    // Ocean opacity varies with tide
    if (window._oceanMat) {
      window._oceanMat.opacity = 0.6 + tideLevel * 0.35;
      window._oceanMat.color.setHex(tideLevel > 0.65 ? 0x0055cc : 0x1e90ff);
    }

    // Day/night lighting
    updateDayNight(newMinute);

    renderer.render(scene, camera);
  }

  requestAnimationFrame(gameLoop);
}

// ── Start ────────────────────────────────────────────────
init();
