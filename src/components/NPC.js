// ═══════════════════════════════════════════════════════
// NPC — Mira: detailed tropical shopkeeper character
// ═══════════════════════════════════════════════════════
import * as THREE from 'three';

const DIALOGUES = [
  "Welcome to Lagoon Valley! 🌴 Tap a plot, then use the action button to till, plant, and water your crops.",
  "When the tide is HIGH, coastal plots flood — plan your harvests before the water rises!",
  "Carrots grow fastest, but Pineapples sell for the highest price. Balance is key!",
  "Water your crops every day — they won't grow a single millimetre without it!",
  "Sell your harvest at the shop. The more you grow, the wealthier you become!",
  "Did you know? Mangoes love the tropical heat here — great yield for the effort!",
  "Each new day brings a fresh tide cycle. The lagoon is always changing — stay alert!",
  "Keep planting! A full farm means a full wallet. This valley rewards patience. 🌴",
  "Pumpkins take time but sell for great gold. Plant them near the highlands to avoid flooding!",
  "I've heard there are treasure chests hidden near the old hut dock... Have you explored yet?",
  "The stars over the lagoon are beautiful tonight. Don't forget to harvest before the tide rises!",
  "Bananas grow quickly and need less water. Good for beginners who are just starting out!",
  "The ancient palms here have roots that go down to the lagoon floor. This land is magical.",
  "Corn sells well in bulk — plant a whole field and watch the gold flow in!",
  "My grandmother taught me this valley's secrets. The tide rises twice each in-game day.",
];

export class NPC {
  constructor(scene) {
    this.scene = scene;
    this.x     = 6;
    this.z     = -3;
    this.dialogueIndex = 0;
    this._time = 0;

    this.mesh  = this._buildMesh();
    scene.add(this.mesh);

    this._label = this._buildLabel();
    scene.add(this._label);
  }

  _m(color, roughness = 0.85, metalness = 0.0) {
    return new THREE.MeshStandardMaterial({ color, roughness, metalness });
  }

  _buildMesh() {
    const root = new THREE.Group();
    root.position.set(this.x, 0, this.z);

    // ── Shoes / Sandals ──────────────────────
    const sandalMat = this._m(0x5c3a10, 0.82);
    const soleMat   = this._m(0x2a1206, 0.75);
    [-0.12, 0.12].forEach(ox => {
      const shoe = new THREE.Mesh(new THREE.BoxGeometry(0.15, 0.10, 0.24), sandalMat);
      shoe.position.set(ox, 0.05, 0.03);
      root.add(shoe);
      const sole = new THREE.Mesh(new THREE.BoxGeometry(0.16, 0.025, 0.26), soleMat);
      sole.position.set(ox, -0.003, 0.03);
      root.add(sole);
      // Strap
      const strap = new THREE.Mesh(new THREE.BoxGeometry(0.16, 0.018, 0.018), this._m(0x8c5a20, 0.85));
      strap.position.set(ox, 0.085, 0.06);
      root.add(strap);
    });

    // ── Legs (tropical skirt / pants) ────────
    const skirtMat = this._m(0xff8fab, 0.90);
    const legMat   = this._m(0xffb87a, 0.85);

    // Flowing skirt
    const skirt = new THREE.Mesh(new THREE.CylinderGeometry(0.26, 0.34, 0.50, 10), skirtMat);
    skirt.position.y = 0.30;
    root.add(skirt);

    // Skirt pattern bands
    [0.12, 0.22, 0.32].forEach((oy, i) => {
      const band = new THREE.Mesh(new THREE.CylinderGeometry(0.26 + i*0.02, 0.28 + i*0.02, 0.025, 10), this._m(0xff6699, 0.92));
      band.position.y = oy;
      root.add(band);
    });

    // Exposed calves
    [-0.10, 0.10].forEach(ox => {
      const calf = new THREE.Mesh(new THREE.CylinderGeometry(0.072, 0.082, 0.22, 8), legMat);
      calf.position.set(ox, 0.112, 0);
      root.add(calf);
    });

    // ── Torso ────────────────────────────────
    const bodyMat  = this._m(0xff8fab, 0.88);
    const topMat   = this._m(0xffffff, 0.90);
    const trimMat  = this._m(0xff6699, 0.90);
    const skinMat  = this._m(0xffb87a, 0.85);
    const dkSkin   = this._m(0xe09a58, 0.88);

    const torso = new THREE.Mesh(new THREE.BoxGeometry(0.42, 0.45, 0.26), bodyMat);
    torso.position.y = 0.79;
    root.add(torso);

    // Apron / blouse detail
    const apron = new THREE.Mesh(new THREE.BoxGeometry(0.28, 0.36, 0.05), topMat);
    apron.position.set(0, 0.80, 0.145);
    root.add(apron);

    // Apron floral trim
    const apronTrim = new THREE.Mesh(new THREE.BoxGeometry(0.30, 0.04, 0.052), trimMat);
    apronTrim.position.set(0, 0.625, 0.145);
    root.add(apronTrim);

    // Shoulder decorations
    [-0.21, 0.21].forEach(ox => {
      const cap = new THREE.Mesh(new THREE.SphereGeometry(0.085, 7, 5), bodyMat);
      cap.position.set(ox, 0.965, 0);
      cap.scale.set(1.2, 0.65, 1.05);
      root.add(cap);

      // Flower pin
      const pin = new THREE.Mesh(new THREE.SphereGeometry(0.038, 6, 4), this._m(0xffee44, 0.8));
      pin.position.set(ox, 1.005, 0.08);
      root.add(pin);
      // Petals
      for (let p = 0; p < 5; p++) {
        const angle = (p / 5) * Math.PI * 2;
        const petal = new THREE.Mesh(new THREE.SphereGeometry(0.022, 5, 4), this._m(0xff99cc, 0.85));
        petal.position.set(ox + Math.cos(angle)*0.04, 1.005, 0.085 + Math.sin(angle)*0.04);
        root.add(petal);
      }
    });

    // Waist sash
    const sash = new THREE.Mesh(new THREE.CylinderGeometry(0.225, 0.22, 0.055, 10), this._m(0xffcc00, 0.85));
    sash.position.y = 0.56;
    root.add(sash);

    // ── Neck ─────────────────────────────────
    const neck = new THREE.Mesh(new THREE.CylinderGeometry(0.082, 0.094, 0.12, 8), skinMat);
    neck.position.y = 1.045;
    root.add(neck);

    // Necklace
    const necklaceGeo = new THREE.TorusGeometry(0.088, 0.012, 5, 14);
    const necklace    = new THREE.Mesh(necklaceGeo, this._m(0xffcc00, 0.5, 0.8));
    necklace.position.set(0, 1.025, 0.012);
    necklace.rotation.x = -0.35;
    root.add(necklace);
    // Pendant
    const pendant = new THREE.Mesh(new THREE.SphereGeometry(0.020, 6, 5), this._m(0x4ecdc4, 0.4, 0.6));
    pendant.position.set(0, 0.985, 0.088);
    root.add(pendant);

    // ── Head ─────────────────────────────────
    this._headGroup = new THREE.Group();
    this._headGroup.position.y = 1.22;

    const headMesh = new THREE.Mesh(new THREE.SphereGeometry(0.195, 12, 9), skinMat);
    headMesh.scale.set(1.0, 1.08, 0.96);
    headMesh.castShadow = true;
    this._headGroup.add(headMesh);

    // Ears with earrings
    [-1, 1].forEach(s => {
      const ear = new THREE.Mesh(new THREE.SphereGeometry(0.050, 7, 5), dkSkin);
      ear.position.set(s * 0.195, 0.005, 0);
      ear.scale.set(0.45, 0.72, 0.58);
      this._headGroup.add(ear);

      // Earring drop
      const ring = new THREE.Mesh(new THREE.TorusGeometry(0.020, 0.007, 5, 8), this._m(0xffcc00, 0.45, 0.85));
      ring.position.set(s * 0.213, -0.045, 0.010);
      ring.rotation.y = Math.PI * 0.5;
      this._headGroup.add(ring);
      const gem = new THREE.Mesh(new THREE.SphereGeometry(0.012, 6, 5), this._m(0x4ecdc4, 0.3, 0.5));
      gem.position.set(s * 0.214, -0.072, 0.012);
      this._headGroup.add(gem);
    });

    // Eyes
    const eyeWhite = this._m(0xf5f5f8, 0.95);
    const eyeDark  = this._m(0x1a1020, 0.92);
    const iris     = this._m(0x5c3a10, 0.65);
    [-0.068, 0.068].forEach(ox => {
      const white = new THREE.Mesh(new THREE.SphereGeometry(0.042, 8, 6), eyeWhite);
      white.position.set(ox, 0.044, 0.177);
      white.scale.set(1, 0.86, 0.68);
      this._headGroup.add(white);
      const irisM = new THREE.Mesh(new THREE.SphereGeometry(0.027, 7, 5), iris);
      irisM.position.set(ox, 0.044, 0.195);
      irisM.scale.set(1, 1, 0.4);
      this._headGroup.add(irisM);
      const pupil = new THREE.Mesh(new THREE.SphereGeometry(0.015, 6, 4), eyeDark);
      pupil.position.set(ox, 0.044, 0.201);
      pupil.scale.set(1, 1, 0.35);
      this._headGroup.add(pupil);
      // Eyebrow (arched)
      const brow = new THREE.Mesh(new THREE.BoxGeometry(0.060, 0.015, 0.008), this._m(0x3c1a08, 0.97));
      brow.position.set(ox, 0.098, 0.185);
      brow.rotation.z = ox < 0 ? 0.18 : -0.18;
      this._headGroup.add(brow);
      // Long lashes
      for (let l = 0; l < 4; l++) {
        const lash = new THREE.Mesh(new THREE.BoxGeometry(0.006, 0.022, 0.005), eyeDark);
        lash.position.set(ox - 0.022 + l*0.015, 0.022, 0.190);
        lash.rotation.z = (l - 1.5) * 0.14;
        this._headGroup.add(lash);
      }
      // Highlight dot
      const hl = new THREE.Mesh(new THREE.SphereGeometry(0.008, 5, 4), eyeWhite);
      hl.position.set(ox + 0.010, 0.056, 0.204);
      this._headGroup.add(hl);
    });

    // Nose
    const noseMesh = new THREE.Mesh(new THREE.SphereGeometry(0.028, 7, 5), dkSkin);
    noseMesh.position.set(0, -0.008, 0.191);
    noseMesh.scale.set(1.1, 0.78, 0.82);
    this._headGroup.add(noseMesh);

    // Lips (fuller)
    const lipMat = this._m(0xe05880, 0.82);
    const uLip   = new THREE.Mesh(new THREE.SphereGeometry(0.040, 7, 5), lipMat);
    uLip.position.set(0, -0.060, 0.192);
    uLip.scale.set(1.5, 0.62, 0.72);
    this._headGroup.add(uLip);
    const lLip = new THREE.Mesh(new THREE.SphereGeometry(0.036, 7, 5), lipMat);
    lLip.position.set(0, -0.082, 0.191);
    lLip.scale.set(1.6, 0.52, 0.7);
    this._headGroup.add(lLip);

    // Cheeks (rosy)
    [-0.118, 0.118].forEach(ox => {
      const blush = new THREE.Mesh(new THREE.SphereGeometry(0.044, 6, 4), this._m(0xff9999, 0.97));
      blush.position.set(ox, -0.010, 0.164);
      blush.scale.set(1.3, 0.52, 0.38);
      this._headGroup.add(blush);
    });

    root.add(this._headGroup);

    // ── Hair ─────────────────────────────────
    const hairMat  = this._m(0x1e0e04, 0.96);
    const hairMat2 = this._m(0x2a1206, 0.95);

    // Base cap
    const hairCap = new THREE.Mesh(
      new THREE.SphereGeometry(0.202, 11, 8, 0, Math.PI*2, 0, Math.PI*0.5), hairMat
    );
    hairCap.position.set(0, 1.22, -0.008);
    root.add(hairCap);

    // Long hair back
    const hairBack = new THREE.Mesh(new THREE.CylinderGeometry(0.16, 0.08, 0.44, 9, 1, true, 0, Math.PI * 1.12), hairMat2);
    hairBack.position.set(0, 1.04, -0.128);
    hairBack.rotation.x = 0.28;
    root.add(hairBack);

    // Side braids
    [-1, 1].forEach(s => {
      const braid = new THREE.Mesh(new THREE.CylinderGeometry(0.040, 0.030, 0.42, 6), hairMat2);
      braid.position.set(s * 0.20, 0.92, 0.010);
      braid.rotation.z = s * 0.35;
      root.add(braid);
      // Bead at braid end
      const bead = new THREE.Mesh(new THREE.SphereGeometry(0.030, 6, 5), this._m(0xffcc00, 0.5, 0.7));
      bead.position.set(s * 0.245, 0.73, 0.012);
      root.add(bead);
    });

    // Hair flower accessory (left)
    const flowerCenter = new THREE.Mesh(new THREE.SphereGeometry(0.030, 6, 5), this._m(0xffee22, 0.7));
    flowerCenter.position.set(-0.17, 1.365, 0.092);
    root.add(flowerCenter);
    for (let p = 0; p < 6; p++) {
      const angle  = (p / 6) * Math.PI * 2;
      const petal2 = new THREE.Mesh(new THREE.SphereGeometry(0.024, 5, 4), this._m(0xff88aa, 0.88));
      petal2.position.set(-0.17 + Math.cos(angle)*0.048, 1.365, 0.092 + Math.sin(angle)*0.048);
      root.add(petal2);
    }

    // ── Arms ─────────────────────────────────
    const makeArm = (side) => {
      const g = new THREE.Group();
      const uArm = new THREE.Mesh(new THREE.CylinderGeometry(0.070, 0.078, 0.22, 7), bodyMat);
      uArm.position.y = -0.11;
      g.add(uArm);
      const elbow = new THREE.Mesh(new THREE.SphereGeometry(0.068, 7, 5), bodyMat);
      elbow.position.y = -0.225;
      g.add(elbow);
      const fArm = new THREE.Mesh(new THREE.CylinderGeometry(0.056, 0.065, 0.18, 7), skinMat);
      fArm.position.y = -0.335;
      g.add(fArm);
      // Wrist bangle
      const bangle = new THREE.Mesh(new THREE.TorusGeometry(0.060, 0.012, 5, 10), this._m(0xffcc00, 0.45, 0.85));
      bangle.position.y = -0.42;
      bangle.rotation.x = Math.PI * 0.5;
      g.add(bangle);
      const palm = new THREE.Mesh(new THREE.SphereGeometry(0.065, 8, 6), skinMat);
      palm.position.y = -0.490;
      palm.scale.set(1.08, 0.80, 0.90);
      g.add(palm);
      // Fingers
      [-0.020, 0, 0.020].forEach(fx => {
        const fi = new THREE.Mesh(new THREE.CylinderGeometry(0.014, 0.016, 0.060, 5), skinMat);
        fi.position.set(fx, -0.538, 0.010);
        fi.rotation.x = 0.18;
        g.add(fi);
      });
      g.position.set(side * 0.265, 0.740, 0);
      return g;
    };
    this._leftArm  = makeArm(-1);
    this._rightArm = makeArm( 1);
    root.add(this._leftArm, this._rightArm);

    // ── Basket (in right arm) ─────────────────
    const basketGroup = new THREE.Group();
    basketGroup.position.set(0.30, 0.58, 0.10);
    const basketMat = this._m(0xc8902a, 0.88);
    const basket    = new THREE.Mesh(new THREE.CylinderGeometry(0.10, 0.08, 0.14, 8), basketMat);
    basketGroup.add(basket);
    // Weave rings
    [-0.02, 0.02, 0.055].forEach(oy => {
      const ring2 = new THREE.Mesh(new THREE.TorusGeometry(0.10, 0.010, 5, 10), this._m(0xa07020, 0.90));
      ring2.position.y = oy;
      ring2.rotation.x = Math.PI * 0.5;
      basketGroup.add(ring2);
    });
    // Handle
    const handleGeo = new THREE.TorusGeometry(0.08, 0.012, 5, 8, Math.PI);
    const handle    = new THREE.Mesh(handleGeo, basketMat);
    handle.position.y = 0.10;
    handle.rotation.x = Math.PI;
    basketGroup.add(handle);
    // Fruits visible in basket
    [0x4ecdc4, 0xffe066, 0xff6699].forEach((col, i) => {
      const fruit = new THREE.Mesh(new THREE.SphereGeometry(0.030, 6, 5), this._m(col, 0.75));
      fruit.position.set((i-1)*0.045, 0.10, 0);
      basketGroup.add(fruit);
    });
    root.add(basketGroup);

    // Shadows
    root.traverse(c => { if (c.isMesh) { c.castShadow = true; c.receiveShadow = false; } });

    return root;
  }

  _buildLabel() {
    const canvas  = document.createElement('canvas');
    canvas.width  = 256; canvas.height = 64;
    const ctx     = canvas.getContext('2d');
    ctx.clearRect(0, 0, 256, 64);

    // Background pill
    ctx.fillStyle = 'rgba(6,18,38,0.82)';
    ctx.beginPath();
    ctx.roundRect(4, 4, 248, 56, 14);
    ctx.fill();

    // Name
    ctx.font      = 'bold 26px sans-serif';
    ctx.fillStyle = '#4ecdc4';
    ctx.textAlign = 'center';
    ctx.fillText('✿ Mira ✿', 128, 36);

    // Subtitle
    ctx.font      = '14px sans-serif';
    ctx.fillStyle = 'rgba(255,224,102,0.8)';
    ctx.fillText('Valley Merchant', 128, 54);

    const tex  = new THREE.CanvasTexture(canvas);
    const geo  = new THREE.PlaneGeometry(1.6, 0.4);
    const mat  = new THREE.MeshBasicMaterial({ map: tex, transparent: true, depthWrite: false });
    const mesh = new THREE.Mesh(geo, mat);
    mesh.position.set(this.x, 2.8, this.z);
    return mesh;
  }

  update(cameraPosition) {
    this._time = Date.now() * 0.002;

    // Gentle floating bob
    this.mesh.position.y = Math.sin(this._time * 1.1) * 0.045;

    // Subtle idle rotation sway
    this.mesh.rotation.y = Math.sin(this._time * 0.42) * 0.06;

    // Arm gentle wave
    if (this._leftArm) {
      this._leftArm.rotation.x = Math.sin(this._time * 0.8) * 0.14;
      this._leftArm.rotation.z = Math.sin(this._time * 0.6) * 0.06;
    }
    if (this._rightArm) {
      this._rightArm.rotation.x = Math.sin(this._time * 0.9 + 1.2) * 0.12;
    }

    // Head look toward camera slightly
    if (this._headGroup) {
      const dx = cameraPosition.x - (this.x + this.mesh.position.x);
      const dz = cameraPosition.z - (this.z + this.mesh.position.z);
      const targetY = Math.atan2(dx, dz);
      this._headGroup.rotation.y += (targetY - this._headGroup.rotation.y) * 0.04;
      this._headGroup.rotation.x = Math.sin(this._time * 0.5) * 0.025;
    }

    // Label billboard
    this._label.lookAt(cameraPosition);
    this._label.position.y = 2.8 + Math.sin(this._time * 1.1) * 0.045;
  }

  getNextDialogue() {
    const line = DIALOGUES[this.dialogueIndex % DIALOGUES.length];
    this.dialogueIndex++;
    return line;
  }
}
