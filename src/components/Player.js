// ═══════════════════════════════════════════════════════
// PLAYER — detailed realistic 3D farmer character
// Overalls + plaid shirt + straw hat + face + animation
// ═══════════════════════════════════════════════════════
import * as THREE from 'three';

const PLAYER_SPEED  = 5.2;
const PLAYER_HEIGHT = 0.92;
const PLAYER_RADIUS = 0.32;

export class Player {
  constructor(scene) {
    this.scene    = scene;
    this.position = new THREE.Vector3(0, PLAYER_HEIGHT, 0);
    this.facing   = 0;
    this._walkTime = 0;
    this._idleTime = 0;

    this._leftArmGroup  = null;
    this._rightArmGroup = null;
    this._leftLegGroup  = null;
    this._rightLegGroup = null;
    this._headGroup     = null;
    this._toolRef       = null;

    this.mesh = this._buildMesh();
    scene.add(this.mesh);
  }

  _m(color, roughness = 0.88, metalness = 0.0) {
    return new THREE.MeshStandardMaterial({ color, roughness, metalness });
  }

  _buildMesh() {
    const root = new THREE.Group();

    // ── Material palette ──────────────────────
    const skin   = this._m(0xffb480, 0.84);
    const dkSkin = this._m(0xe0965a, 0.88);
    const denim  = this._m(0x2c4880, 0.96);
    const overal = this._m(0x1e3464, 0.96);
    const shirt  = this._m(0xb83030, 0.92);
    const shAlt  = this._m(0x8c2222, 0.93);
    const hair   = this._m(0x2a1604, 0.97);
    const bootC  = this._m(0x231208, 0.80);
    const sole   = this._m(0x100a04, 0.70);
    const straw  = this._m(0xd09e2a, 0.90);
    const band   = this._m(0x18120a, 0.88);
    const wood   = this._m(0x7a3e14, 0.88);
    const metal  = this._m(0x8888a0, 0.45, 0.65);
    const gold   = this._m(0xcc9900, 0.45, 0.80);
    const eyeW   = this._m(0xf2f2f2, 0.95);
    const eyeD   = this._m(0x181828, 0.90);
    const brow   = this._m(0x2a1604, 0.97);
    const lip    = this._m(0xcc7060, 0.88);

    // ══ BOOTS ═══════════════════════════════
    [-0.13, 0.13].forEach(ox => {
      const boot = new THREE.Mesh(new THREE.BoxGeometry(0.17, 0.13, 0.27), bootC);
      boot.position.set(ox, -0.755, 0.045);
      root.add(boot);
      const soleMesh = new THREE.Mesh(new THREE.BoxGeometry(0.185, 0.032, 0.29), sole);
      soleMesh.position.set(ox, -0.822, 0.045);
      root.add(soleMesh);
      const heel = new THREE.Mesh(new THREE.BoxGeometry(0.155, 0.065, 0.085), sole);
      heel.position.set(ox, -0.775, -0.095);
      root.add(heel);
      // Laces
      [0.01, -0.04].forEach(lz => {
        const laceGeo = new THREE.BoxGeometry(0.155, 0.01, 0.01);
        const lace    = new THREE.Mesh(laceGeo, this._m(0xddccaa, 0.90));
        lace.position.set(ox, -0.705 + lz * 0.5, 0.135);
        root.add(lace);
      });
    });

    // ══ LEGS ════════════════════════════════
    this._leftLegGroup  = new THREE.Group();
    this._rightLegGroup = new THREE.Group();
    [this._leftLegGroup, this._rightLegGroup].forEach((g, i) => {
      const leg = new THREE.Mesh(new THREE.CylinderGeometry(0.09, 0.10, 0.39, 8), denim);
      leg.position.y = -0.195;
      g.add(leg);
      // Crease
      const cr = new THREE.Mesh(new THREE.BoxGeometry(0.012, 0.37, 0.012), this._m(0x1a2c58, 0.97));
      cr.position.set(0, -0.195, 0.088);
      g.add(cr);
    });
    this._leftLegGroup.position.set(-0.115, -0.385, 0);
    this._rightLegGroup.position.set( 0.115, -0.385, 0);
    root.add(this._leftLegGroup, this._rightLegGroup);

    // ══ TORSO / OVERALLS ════════════════════
    // Shirt body underneath
    const torso = new THREE.Mesh(new THREE.BoxGeometry(0.42, 0.46, 0.27), shirt);
    torso.position.y = -0.18;
    root.add(torso);
    // Plaid stripes
    [-0.22, -0.09, 0.04, 0.17].forEach(oy => {
      const s = new THREE.Mesh(new THREE.BoxGeometry(0.43, 0.034, 0.28), shAlt);
      s.position.set(0, -0.18 + oy, 0);
      root.add(s);
    });
    // Overalls bib
    const bib = new THREE.Mesh(new THREE.BoxGeometry(0.27, 0.33, 0.04), overal);
    bib.position.set(0, -0.055, 0.145);
    root.add(bib);
    // Bib pocket stitching
    const pkt = new THREE.Mesh(new THREE.BoxGeometry(0.10, 0.09, 0.025), denim);
    pkt.position.set(0, -0.015, 0.168);
    root.add(pkt);
    // Straps
    [-0.10, 0.10].forEach((ox, i) => {
      const strap = new THREE.Mesh(new THREE.BoxGeometry(0.068, 0.20, 0.038), overal);
      strap.position.set(ox, 0.10, 0.125);
      strap.rotation.z = i === 0 ? 0.14 : -0.14;
      root.add(strap);
      // Metal clip
      const clip = new THREE.Mesh(new THREE.BoxGeometry(0.062, 0.042, 0.03), gold);
      clip.position.set(ox, 0.215, 0.145);
      root.add(clip);
    });
    // Back panel
    const back = new THREE.Mesh(new THREE.BoxGeometry(0.37, 0.34, 0.038), overal);
    back.position.set(0, -0.09, -0.142);
    root.add(back);
    // Belt area
    const belt = new THREE.Mesh(new THREE.BoxGeometry(0.44, 0.055, 0.28), overal);
    belt.position.set(0, -0.395, 0);
    root.add(belt);
    const buckle = new THREE.Mesh(new THREE.BoxGeometry(0.082, 0.05, 0.03), gold);
    buckle.position.set(0, -0.395, 0.148);
    root.add(buckle);

    // ══ NECK ════════════════════════════════
    const neck = new THREE.Mesh(new THREE.CylinderGeometry(0.088, 0.098, 0.13, 8), skin);
    neck.position.y = 0.08;
    root.add(neck);
    // Collar
    const collar = new THREE.Mesh(new THREE.TorusGeometry(0.10, 0.022, 4, 8, Math.PI * 1.3), shirt);
    collar.position.set(0, 0.055, 0.018);
    collar.rotation.x = -0.25;
    root.add(collar);

    // ══ HEAD GROUP ══════════════════════════
    this._headGroup = new THREE.Group();
    this._headGroup.position.y = 0.235;

    // Head - slightly oval sphere
    const headMesh = new THREE.Mesh(new THREE.SphereGeometry(0.195, 12, 9), skin);
    headMesh.scale.set(1.0, 1.09, 0.96);
    headMesh.castShadow = true;
    this._headGroup.add(headMesh);

    // Ears
    [-1, 1].forEach(s => {
      const ear = new THREE.Mesh(new THREE.SphereGeometry(0.058, 7, 5), dkSkin);
      ear.position.set(s * 0.198, 0.005, 0);
      ear.scale.set(0.42, 0.72, 0.62);
      this._headGroup.add(ear);
      // Inner ear
      const inner = new THREE.Mesh(new THREE.SphereGeometry(0.030, 5, 4), this._m(0xc47048, 0.92));
      inner.position.set(s * 0.204, 0.005, 0);
      inner.scale.set(0.28, 0.52, 0.4);
      this._headGroup.add(inner);
    });

    // Eye whites
    [-0.073, 0.073].forEach(ox => {
      const white = new THREE.Mesh(new THREE.SphereGeometry(0.044, 8, 6), eyeW);
      white.position.set(ox, 0.042, 0.176);
      white.scale.set(1, 0.86, 0.68);
      this._headGroup.add(white);
      // Iris
      const iris = new THREE.Mesh(new THREE.SphereGeometry(0.028, 7, 5), this._m(0x3a6e3a, 0.6));
      iris.position.set(ox, 0.042, 0.195);
      iris.scale.set(1, 1, 0.4);
      this._headGroup.add(iris);
      // Pupil
      const pupil = new THREE.Mesh(new THREE.SphereGeometry(0.016, 6, 4), eyeD);
      pupil.position.set(ox, 0.042, 0.200);
      pupil.scale.set(1, 1, 0.3);
      this._headGroup.add(pupil);
      // Eyebrow
      const br = new THREE.Mesh(new THREE.BoxGeometry(0.068, 0.018, 0.01), brow);
      br.position.set(ox, 0.098, 0.184);
      br.rotation.z = ox < 0 ? 0.20 : -0.20;
      this._headGroup.add(br);
      // Eyelash hint
      const lash = new THREE.Mesh(new THREE.BoxGeometry(0.074, 0.010, 0.008), this._m(0x1a1020, 0.98));
      lash.position.set(ox, 0.02, 0.190);
      this._headGroup.add(lash);
    });

    // Nose bridge
    const nose = new THREE.Mesh(new THREE.SphereGeometry(0.034, 6, 5), dkSkin);
    nose.position.set(0, -0.005, 0.191);
    nose.scale.set(1.15, 0.82, 0.88);
    this._headGroup.add(nose);
    // Nostrils
    [-0.024, 0.024].forEach(ox => {
      const n = new THREE.Mesh(new THREE.SphereGeometry(0.013, 5, 4), this._m(0xb86838, 0.92));
      n.position.set(ox, -0.025, 0.196);
      n.scale.set(1, 0.58, 0.5);
      this._headGroup.add(n);
    });

    // Lips
    const uLip = new THREE.Mesh(new THREE.BoxGeometry(0.072, 0.018, 0.014), lip);
    uLip.position.set(0, -0.065, 0.191);
    this._headGroup.add(uLip);
    const lLip = new THREE.Mesh(new THREE.BoxGeometry(0.060, 0.015, 0.013), lip);
    lLip.position.set(0, -0.085, 0.190);
    this._headGroup.add(lLip);

    // Cheek blush
    [-0.125, 0.125].forEach(ox => {
      const bl = new THREE.Mesh(new THREE.SphereGeometry(0.048, 6, 4), this._m(0xffaa8a, 0.97));
      bl.position.set(ox, -0.012, 0.162);
      bl.scale.set(1.2, 0.56, 0.38);
      this._headGroup.add(bl);
    });

    root.add(this._headGroup);

    // ══ HAIR ════════════════════════════════
    const hairCap = new THREE.Mesh(
      new THREE.SphereGeometry(0.202, 10, 7, 0, Math.PI*2, 0, Math.PI*0.55), hair
    );
    hairCap.position.set(0, 0.235, -0.010);
    hairCap.castShadow = true;
    root.add(hairCap);
    // Back hair longer
    const hairBack = new THREE.Mesh(new THREE.CylinderGeometry(0.14, 0.10, 0.14, 8, 1, true, 0, Math.PI), hair);
    hairBack.position.set(0, 0.178, -0.13);
    hairBack.rotation.x = 0.3;
    root.add(hairBack);
    // Sideburns
    [-1, 1].forEach(s => {
      const sb = new THREE.Mesh(new THREE.BoxGeometry(0.04, 0.10, 0.04), hair);
      sb.position.set(s * 0.188, 0.13, 0.025);
      root.add(sb);
    });

    // ══ STRAW HAT ═══════════════════════════
    const brimMesh = new THREE.Mesh(new THREE.CylinderGeometry(0.31, 0.32, 0.045, 12), straw);
    brimMesh.position.y = 0.405;
    brimMesh.castShadow = true;
    root.add(brimMesh);
    const crownMesh = new THREE.Mesh(new THREE.CylinderGeometry(0.188, 0.215, 0.31, 10), straw);
    crownMesh.position.y = 0.565;
    crownMesh.castShadow = true;
    root.add(crownMesh);
    // Top plate
    const topPlate = new THREE.Mesh(new THREE.CylinderGeometry(0.175, 0.188, 0.032, 10), this._m(0xb88c24, 0.92));
    topPlate.position.y = 0.727;
    root.add(topPlate);
    // Hat band
    const hatBand = new THREE.Mesh(new THREE.CylinderGeometry(0.218, 0.218, 0.058, 10), band);
    hatBand.position.y = 0.418;
    root.add(hatBand);
    // Buckle on band
    const hbuckle = new THREE.Mesh(new THREE.BoxGeometry(0.055, 0.044, 0.025), gold);
    hbuckle.position.set(0.208, 0.418, 0.05);
    root.add(hbuckle);
    // Straw texture lines on brim (radial lines)
    for (let i = 0; i < 8; i++) {
      const a = (i / 8) * Math.PI * 2;
      const sl = new THREE.Mesh(new THREE.CylinderGeometry(0.005, 0.005, 0.30, 3), this._m(0xb8881e, 0.95));
      sl.position.set(Math.sin(a) * 0.2, 0.405, Math.cos(a) * 0.2);
      sl.rotation.z = Math.PI * 0.5;
      sl.rotation.y = a;
      root.add(sl);
    }

    // ══ ARMS ════════════════════════════════
    const makeArm = (side) => {
      const g = new THREE.Group();
      // Upper arm (shirt sleeve)
      const up = new THREE.Mesh(new THREE.CylinderGeometry(0.076, 0.082, 0.21, 7), shirt);
      up.position.y = -0.105;
      g.add(up);
      // Elbow
      const el = new THREE.Mesh(new THREE.SphereGeometry(0.074, 7, 5), shirt);
      el.position.y = -0.215;
      g.add(el);
      // Forearm (skin)
      const fo = new THREE.Mesh(new THREE.CylinderGeometry(0.062, 0.072, 0.17, 7), skin);
      fo.position.y = -0.325;
      g.add(fo);
      // Wrist
      const wr = new THREE.Mesh(new THREE.SphereGeometry(0.056, 6, 5), skin);
      wr.position.y = -0.41;
      wr.scale.set(1.12, 0.58, 1.02);
      g.add(wr);
      // Palm
      const palm = new THREE.Mesh(new THREE.SphereGeometry(0.072, 8, 6), skin);
      palm.position.y = -0.482;
      palm.scale.set(1.1, 0.83, 0.92);
      g.add(palm);
      // Thumb
      const th = new THREE.Mesh(new THREE.CylinderGeometry(0.022, 0.027, 0.075, 5), skin);
      th.position.set(side * 0.068, -0.495, 0.026);
      th.rotation.z = side * -0.72;
      th.rotation.x = 0.42;
      g.add(th);
      // Fingers (3 bumps)
      [-0.022, 0, 0.022].forEach(fx => {
        const fi = new THREE.Mesh(new THREE.CylinderGeometry(0.016, 0.018, 0.065, 5), skin);
        fi.position.set(fx, -0.535, 0.012);
        fi.rotation.x = 0.2;
        g.add(fi);
      });
      g.position.set(side * 0.272, -0.038, 0);
      return g;
    };
    this._leftArmGroup  = makeArm(-1);
    this._rightArmGroup = makeArm( 1);
    root.add(this._leftArmGroup, this._rightArmGroup);

    // ══ HOE / TOOL ══════════════════════════
    this._toolRef = new THREE.Group();
    const handle = new THREE.Mesh(new THREE.CylinderGeometry(0.022, 0.025, 0.70, 5), wood);
    handle.position.y = -0.35;
    this._toolRef.add(handle);
    // Hoe head
    const blade  = new THREE.Mesh(new THREE.BoxGeometry(0.20, 0.04, 0.065), metal);
    blade.position.set(0, -0.70, 0.03);
    blade.rotation.x = 0.38;
    this._toolRef.add(blade);
    const edge = new THREE.Mesh(new THREE.BoxGeometry(0.20, 0.008, 0.018), this._m(0xbbbbcc, 0.28, 0.85));
    edge.position.set(0, -0.70, 0.058);
    edge.rotation.x = 0.38;
    this._toolRef.add(edge);
    // Connector
    const conn = new THREE.Mesh(new THREE.CylinderGeometry(0.028, 0.028, 0.06, 6), metal);
    conn.position.y = -0.685;
    this._toolRef.add(conn);

    this._toolRef.position.set(0.36, -0.195, 0.055);
    this._toolRef.rotation.z = -0.32;
    root.add(this._toolRef);

    // Apply shadows to all meshes
    root.traverse(c => { if (c.isMesh) { c.castShadow = true; c.receiveShadow = false; } });
    root.position.copy(this.position);
    return root;
  }

  update(dx, dz, dt, obstacles = [], worldHalfSize = 19) {
    const moving = dx !== 0 || dz !== 0;

    if (moving) {
      const speed = PLAYER_SPEED * dt;
      const nx = this.position.x + dx * speed;
      const nz = this.position.z + dz * speed;
      const bx = Math.max(-worldHalfSize, Math.min(worldHalfSize, nx));
      const bz = Math.max(-worldHalfSize, Math.min(worldHalfSize, nz));

      let blocked = false;
      for (const obs of obstacles) {
        if (Math.hypot(bx - obs.x, bz - obs.z) < PLAYER_RADIUS + obs.radius) { blocked = true; break; }
      }
      if (!blocked) { this.position.x = bx; this.position.z = bz; }
      this.facing = Math.atan2(dx, dz);
      this._walkTime += dt * 7.5;
      this._idleTime  = 0;
    } else {
      this._walkTime += dt * 0.35;
      this._idleTime += dt;
    }

    // Walk swing
    const swing = moving ? Math.sin(this._walkTime) * 0.52 : 0;
    if (this._leftArmGroup)  this._leftArmGroup.rotation.x  =  swing;
    if (this._rightArmGroup) this._rightArmGroup.rotation.x = -swing;
    if (this._leftLegGroup)  this._leftLegGroup.rotation.x  = -swing * 0.86;
    if (this._rightLegGroup) this._rightLegGroup.rotation.x  =  swing * 0.86;

    // Tool sways with right arm
    if (this._toolRef) this._toolRef.rotation.x = -swing * 0.28;

    // Idle head sway
    if (this._headGroup) {
      if (!moving) {
        this._headGroup.rotation.y = Math.sin(this._idleTime * 0.45) * 0.10;
        this._headGroup.rotation.x = Math.sin(this._idleTime * 0.28) * 0.04;
      } else {
        this._headGroup.rotation.y *= 0.88;
        this._headGroup.rotation.x *= 0.88;
      }
    }

    // Vertical bob + breathing
    const bob    = moving ? Math.abs(Math.sin(this._walkTime)) * 0.044 : 0;
    const breath = !moving ? Math.sin(this._idleTime * 1.1) * 0.005 : 0;

    this.mesh.position.copy(this.position);
    this.mesh.position.y += bob + breath;
    this.mesh.rotation.y  = this.facing;
  }

  getPosition() { return this.position.clone(); }
  isNear(x, z, range = 2.2) {
    return Math.hypot(this.position.x - x, this.position.z - z) < range;
  }
}
