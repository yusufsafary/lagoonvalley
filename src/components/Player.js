// ═══════════════════════════════════════════════════════
// PLAYER — 3D mesh + movement controller
// Swap the mesh group for a .glb model without changing move logic
// ═══════════════════════════════════════════════════════
import * as THREE from 'three';

const PLAYER_SPEED   = 5;   // units/sec
const PLAYER_HEIGHT  = 0.9; // above ground
const PLAYER_RADIUS  = 0.35;

export class Player {
  constructor(scene) {
    this.scene    = scene;
    this.velocity = new THREE.Vector3();
    this.position = new THREE.Vector3(0, PLAYER_HEIGHT, 0);
    this.facing   = 0; // Y-axis rotation radians

    this.mesh = this._buildMesh();
    scene.add(this.mesh);
  }

  /** Build player out of Three.js primitives (capsule = cylinder + 2 spheres) */
  _buildMesh() {
    const group = new THREE.Group();

    // Body — cylinder
    const bodyGeo = new THREE.CylinderGeometry(0.22, 0.25, 0.7, 8);
    const bodyMat = new THREE.MeshLambertMaterial({ color: 0x4ecdc4 });
    const body    = new THREE.Mesh(bodyGeo, bodyMat);
    body.position.y = 0;
    body.castShadow = true;
    group.add(body);

    // Head — sphere
    const headGeo = new THREE.SphereGeometry(0.22, 8, 6);
    const headMat = new THREE.MeshLambertMaterial({ color: 0xffd8a8 });
    const head    = new THREE.Mesh(headGeo, headMat);
    head.position.y = 0.5;
    head.castShadow = true;
    group.add(head);

    // Hat — cone
    const hatGeo = new THREE.ConeGeometry(0.22, 0.3, 8);
    const hatMat = new THREE.MeshLambertMaterial({ color: 0xf7971e });
    const hat    = new THREE.Mesh(hatGeo, hatMat);
    hat.position.y = 0.82;
    hat.castShadow = true;
    group.add(hat);

    // Feet
    const footGeo = new THREE.SphereGeometry(0.14, 6, 4);
    const footMat = new THREE.MeshLambertMaterial({ color: 0x333 });
    [-0.12, 0.12].forEach(x => {
      const foot = new THREE.Mesh(footGeo, footMat);
      foot.position.set(x, -0.42, 0);
      foot.castShadow = true;
      group.add(foot);
    });

    group.position.copy(this.position);
    return group;
  }

  /**
   * Move player based on joystick input.
   * @param {number} dx - joystick X (-1..1)
   * @param {number} dz - joystick Z (-1..1)
   * @param {number} dt - delta time seconds
   * @param {Array}  obstacles - array of {x,z,radius} to collide against
   * @param {number} worldHalfSize - keep player inside map bounds
   */
  update(dx, dz, dt, obstacles = [], worldHalfSize = 18) {
    if (dx === 0 && dz === 0) return;

    const speed = PLAYER_SPEED * dt;
    const nx    = this.position.x + dx * speed;
    const nz    = this.position.z + dz * speed;

    // Boundary clamp
    const bx = Math.max(-worldHalfSize, Math.min(worldHalfSize, nx));
    const bz = Math.max(-worldHalfSize, Math.min(worldHalfSize, nz));

    // Simple circle collision
    let blocked = false;
    for (const obs of obstacles) {
      const dist = Math.hypot(bx - obs.x, bz - obs.z);
      if (dist < PLAYER_RADIUS + obs.radius) { blocked = true; break; }
    }

    if (!blocked) {
      this.position.x = bx;
      this.position.z = bz;
    }

    // Face movement direction
    if (dx !== 0 || dz !== 0) {
      this.facing = Math.atan2(dx, dz);
    }

    this.mesh.position.copy(this.position);
    this.mesh.rotation.y = this.facing;

    // Simple walk bob
    const bob = Math.sin(Date.now() * 0.01) * 0.03;
    this.mesh.position.y = this.position.y + bob;
  }

  getPosition() { return this.position.clone(); }

  /** Check if player is within range of a world position */
  isNear(x, z, range = 2.2) {
    return Math.hypot(this.position.x - x, this.position.z - z) < range;
  }
}
