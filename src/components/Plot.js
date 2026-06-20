// ═══════════════════════════════════════════════════════
// PLOT — a single farm tile (soil + crop visual + water VFX)
// State is stored in gameState; this class manages only visuals
// ═══════════════════════════════════════════════════════
import * as THREE from 'three';
import { CROPS } from '../store/gameState.js';

const SOIL_COLOR    = 0x8B5A2B;
const TILLED_COLOR  = 0x5C3A1E;
const WATERED_COLOR = 0x3a2010;
const PLOT_SIZE     = 1.0;

export class Plot {
  /**
   * @param {THREE.Scene} scene
   * @param {object} data - plot data from gameState
   */
  constructor(scene, data) {
    this.scene = scene;
    this.id    = data.id;
    this.x     = data.x;
    this.z     = data.z;
    this.isCoastal = data.isCoastal || false;

    this.group = new THREE.Group();
    this.group.position.set(this.x, 0, this.z);
    scene.add(this.group);

    this._buildBase();
    this._cropMesh = null;
    this._waterIndicator = null;
    this._lastState = null;
  }

  _buildBase() {
    const geo = new THREE.BoxGeometry(PLOT_SIZE, 0.12, PLOT_SIZE);
    this._mat = new THREE.MeshLambertMaterial({ color: SOIL_COLOR });
    this._base = new THREE.Mesh(geo, this._mat);
    this._base.position.y = 0.06;
    this._base.receiveShadow = true;
    this.group.add(this._base);

    // Coastal marker — blue tint border
    if (this.isCoastal) {
      const borderGeo = new THREE.BoxGeometry(PLOT_SIZE + 0.06, 0.03, PLOT_SIZE + 0.06);
      const borderMat = new THREE.MeshLambertMaterial({ color: 0x4488ff, transparent: true, opacity: 0.5 });
      const border    = new THREE.Mesh(borderGeo, borderMat);
      border.position.y = 0.01;
      this.group.add(border);
    }
  }

  /**
   * Sync visuals to plot state object from gameState.
   * @param {object} plotData
   * @param {boolean} tideBlocked - hide if tide is high and coastal
   */
  update(plotData, tideBlocked = false) {
    // Hide coastal plots during high tide
    this.group.visible = !(this.isCoastal && tideBlocked);

    // Soil color
    if (plotData.watered) {
      this._mat.color.setHex(WATERED_COLOR);
    } else if (plotData.tilled) {
      this._mat.color.setHex(TILLED_COLOR);
    } else {
      this._mat.color.setHex(SOIL_COLOR);
    }

    // Rebuild crop mesh if state changed
    const stateKey = `${plotData.cropType}|${plotData.growthStage}`;
    if (stateKey !== this._lastState) {
      this._rebuildCrop(plotData);
      this._lastState = stateKey;
    }

    // Water droplet indicator
    if (this._waterIndicator) {
      this._waterIndicator.visible = plotData.tilled && plotData.cropType && !plotData.watered && plotData.growthStage < 4;
      if (this._waterIndicator.visible) {
        this._waterIndicator.position.y = 0.7 + Math.sin(Date.now() * 0.004) * 0.1;
        this._waterIndicator.rotation.y += 0.03;
      }
    }
  }

  _rebuildCrop(plotData) {
    // Remove old crop mesh
    if (this._cropMesh) { this.group.remove(this._cropMesh); this._cropMesh = null; }
    if (this._waterIndicator) { this.group.remove(this._waterIndicator); this._waterIndicator = null; }

    if (!plotData.cropType || plotData.growthStage === 0) return;

    const cropDef = CROPS[plotData.cropType];
    if (!cropDef) return;

    const stage = plotData.growthStage; // 1..4
    this._cropMesh = this._buildCropMesh(cropDef, stage);
    this.group.add(this._cropMesh);

    // Water indicator (small rotating ring)
    const ringGeo = new THREE.TorusGeometry(0.2, 0.03, 6, 12);
    const ringMat = new THREE.MeshLambertMaterial({ color: 0x44aaff, transparent: true, opacity: 0.8 });
    this._waterIndicator = new THREE.Mesh(ringGeo, ringMat);
    this._waterIndicator.position.y = 0.7;
    this._waterIndicator.rotation.x = Math.PI / 3;
    this._waterIndicator.visible = false;
    this.group.add(this._waterIndicator);
  }

  _buildCropMesh(cropDef, stage) {
    // Scale: tiny (1) → medium (2,3) → full (4)
    const scale = [0, 0.3, 0.55, 0.75, 1.0][stage];
    const group = new THREE.Group();

    // Stem — cylinder
    const stemH  = 0.4 * scale;
    const stemGeo = new THREE.CylinderGeometry(0.03, 0.04, stemH, 5);
    const stemMat = new THREE.MeshLambertMaterial({ color: 0x4a8c20 });
    const stem    = new THREE.Mesh(stemGeo, stemMat);
    stem.position.y = 0.12 + stemH / 2;
    stem.castShadow = true;
    group.add(stem);

    // Crop head
    let headGeo;
    if (cropDef.name === 'Coconut') {
      headGeo = new THREE.SphereGeometry(0.18 * scale, 6, 5);
    } else if (cropDef.name === 'Tomato') {
      headGeo = new THREE.SphereGeometry(0.15 * scale, 6, 5);
    } else if (cropDef.name === 'Melon') {
      headGeo = new THREE.SphereGeometry(0.22 * scale, 7, 5);
    } else {
      // Carrot — cone
      headGeo = new THREE.ConeGeometry(0.1 * scale, 0.28 * scale, 5);
    }

    const headMat  = new THREE.MeshLambertMaterial({ color: cropDef.color });
    const cropHead = new THREE.Mesh(headGeo, headMat);
    cropHead.position.y = 0.12 + stemH + 0.15 * scale;
    cropHead.castShadow = true;
    group.add(cropHead);

    // Leaves (small flat cones) for non-root crops
    if (cropDef.name !== 'Carrot' && stage >= 2) {
      [-0.12, 0.12].forEach(offset => {
        const leafGeo = new THREE.ConeGeometry(0.1 * scale, 0.2 * scale, 4);
        const leafMat = new THREE.MeshLambertMaterial({ color: 0x5bc840 });
        const leaf    = new THREE.Mesh(leafGeo, leafMat);
        leaf.position.set(offset * scale, 0.12 + stemH * 0.6, 0);
        leaf.rotation.z = offset > 0 ? 0.5 : -0.5;
        leaf.castShadow = true;
        group.add(leaf);
      });
    }

    return group;
  }

  dispose() {
    this.scene.remove(this.group);
  }
}
