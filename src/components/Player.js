// ═══════════════════════════════════════════════════════
// PLAYER — detailed 3D character with walking animation
// Swap group for .glb without changing move logic
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

    // References to animated parts
    this._leftArm  = null;
    this._rightArm = null;
    this._leftLeg  = null;
    this._rightLeg = null;

    this.mesh = this._buildMesh();
    scene.add(this.mesh);
  }

  _buildMesh() {
    const root = new THREE.Group();

    // ── Legs ──────────────────────────────────
    const legGeo = new THREE.CylinderGeometry(0.085, 0.09, 0.38, 7);
    const legMat = new THREE.MeshLambertMaterial({ color: 0x2244aa });

    this._leftLeg  = new THREE.Mesh(legGeo, legMat);
    this._rightLeg = new THREE.Mesh(legGeo, legMat);
    this._leftLeg.position.set(-0.12, -0.57, 0);
    this._rightLeg.position.set( 0.12, -0.57, 0);
    this._leftLeg.castShadow  = true;
    this._rightLeg.castShadow = true;
    root.add(this._leftLeg);
    root.add(this._rightLeg);

    // Feet (shoes)
    const shoeGeo = new THREE.BoxGeometry(0.15, 0.08, 0.22);
    const shoeMat = new THREE.MeshLambertMaterial({ color: 0x1a1a1a });
    [-0.12, 0.12].forEach((ox, i) => {
      const shoe = new THREE.Mesh(shoeGeo, shoeMat);
      shoe.position.set(ox, -0.78, 0.04);
      shoe.castShadow = true;
      root.add(shoe);
    });

    // ── Body ──────────────────────────────────
    const bodyGeo = new THREE.BoxGeometry(0.42, 0.46, 0.26);
    const bodyMat = new THREE.MeshLambertMaterial({ color: 0x4ecdc4 });
    const body    = new THREE.Mesh(bodyGeo, bodyMat);
    body.position.y = -0.18;
    body.castShadow = true;
    root.add(body);

    // Shirt detail stripes
    const stripeGeo = new THREE.BoxGeometry(0.44, 0.04, 0.27);
    const stripeMat = new THREE.MeshLambertMaterial({ color: 0x2aabaa });
    [-0.06, 0.06].forEach(oy => {
      const s = new THREE.Mesh(stripeGeo, stripeMat);
      s.position.set(0, -0.18 + oy, 0);
      root.add(s);
    });

    // ── Arms ──────────────────────────────────
    const armGeo = new THREE.CylinderGeometry(0.07, 0.08, 0.34, 6);
    const armMat = new THREE.MeshLambertMaterial({ color: 0x4ecdc4 });

    this._leftArm  = new THREE.Group();
    this._rightArm = new THREE.Group();
    const lArmMesh = new THREE.Mesh(armGeo, armMat);
    const rArmMesh = new THREE.Mesh(armGeo, armMat);
    lArmMesh.position.y = -0.17;
    rArmMesh.position.y = -0.17;
    this._leftArm.add(lArmMesh);
    this._rightArm.add(rArmMesh);
    this._leftArm.position.set(-0.26, -0.07, 0);
    this._rightArm.position.set( 0.26, -0.07, 0);
    this._leftArm.castShadow  = true;
    this._rightArm.castShadow = true;
    root.add(this._leftArm);
    root.add(this._rightArm);

    // Hands
    const handGeo = new THREE.SphereGeometry(0.075, 6, 5);
    const handMat = new THREE.MeshLambertMaterial({ color: 0xffcba4 });
    [-1, 1].forEach((side, i) => {
      const hand = new THREE.Mesh(handGeo, handMat);
      hand.position.set(side * 0.26, -0.42, 0);
      hand.castShadow = true;
      root.add(hand);
    });

    // ── Head ──────────────────────────────────
    const headGeo = new THREE.BoxGeometry(0.34, 0.32, 0.3);
    const headMat = new THREE.MeshLambertMaterial({ color: 0xffcba4 });
    const head    = new THREE.Mesh(headGeo, headMat);
    head.position.y = 0.18;
    head.castShadow = true;
    root.add(head);

    // Eyes
    const eyeGeo = new THREE.SphereGeometry(0.038, 5, 4);
    const eyeMat = new THREE.MeshLambertMaterial({ color: 0x1a1a1a });
    [-0.09, 0.09].forEach(ox => {
      const eye = new THREE.Mesh(eyeGeo, eyeMat);
      eye.position.set(ox, 0.2, 0.15);
      root.add(eye);
    });

    // Smile
    const smileGeo = new THREE.TorusGeometry(0.06, 0.012, 4, 8, Math.PI);
    const smileMat = new THREE.MeshLambertMaterial({ color: 0x884444 });
    const smile    = new THREE.Mesh(smileGeo, smileMat);
    smile.position.set(0, 0.09, 0.155);
    smile.rotation.z = Math.PI;
    root.add(smile);

    // ── Hat ──────────────────────────────────
    // Brim
    const brimGeo = new THREE.CylinderGeometry(0.28, 0.28, 0.04, 10);
    const brimMat = new THREE.MeshLambertMaterial({ color: 0xc8860a });
    const brim    = new THREE.Mesh(brimGeo, brimMat);
    brim.position.y = 0.35;
    brim.castShadow = true;
    root.add(brim);

    // Crown
    const crownGeo = new THREE.CylinderGeometry(0.19, 0.21, 0.28, 8);
    const crownMat = new THREE.MeshLambertMaterial({ color: 0xd4920e });
    const crown    = new THREE.Mesh(crownGeo, crownMat);
    crown.position.y = 0.51;
    crown.castShadow = true;
    root.add(crown);

    // Hat band
    const bandGeo = new THREE.CylinderGeometry(0.22, 0.22, 0.055, 8);
    const bandMat = new THREE.MeshLambertMaterial({ color: 0x3a3a2a });
    const band    = new THREE.Mesh(bandGeo, bandMat);
    band.position.y = 0.385;
    root.add(band);

    // ── Tool (hoe handle) ────────────────────
    const hoeGeo = new THREE.CylinderGeometry(0.025, 0.025, 0.6, 5);
    const hoeMat = new THREE.MeshLambertMaterial({ color: 0x7a4a1a });
    const hoe    = new THREE.Mesh(hoeGeo, hoeMat);
    hoe.position.set(0.35, -0.28, 0.05);
    hoe.rotation.z = -0.4;
    hoe.castShadow = true;
    root.add(hoe);

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
      if (!blocked) {
        this.position.x = bx;
        this.position.z = bz;
      }
      this.facing = Math.atan2(dx, dz);
      this._walkTime += dt * 7;
    } else {
      // Decelerate walk cycle
      this._walkTime += dt * 0.5;
    }

    // Walk animation — arms and legs swing
    const swing = moving ? Math.sin(this._walkTime) * 0.45 : 0;
    if (this._leftArm)  this._leftArm.rotation.x  =  swing;
    if (this._rightArm) this._rightArm.rotation.x  = -swing;
    if (this._leftLeg)  this._leftLeg.rotation.x  = -swing * 0.8;
    if (this._rightLeg) this._rightLeg.rotation.x  =  swing * 0.8;

    // Bob up/down while walking
    const bob = moving ? Math.abs(Math.sin(this._walkTime)) * 0.04 : 0;

    this.mesh.position.copy(this.position);
    this.mesh.position.y += bob;
    this.mesh.rotation.y = this.facing;
  }

  getPosition() { return this.position.clone(); }

  isNear(x, z, range = 2.2) {
    return Math.hypot(this.position.x - x, this.position.z - z) < range;
  }
}
