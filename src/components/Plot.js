// ═══════════════════════════════════════════════════════
// PLOT — farm tile with realistic soil, crop, water VFX
// ═══════════════════════════════════════════════════════
import * as THREE from 'three';
import { CROPS } from '../store/gameState.js';

const COL_UNTILLED = 0x7a5c34;
const COL_TILLED   = 0x4a2e12;
const COL_WATERED  = 0x2e1a08;

export class Plot {
  constructor(scene, data) {
    this.scene     = scene;
    this.id        = data.id;
    this.x         = data.x;
    this.z         = data.z;
    this.isCoastal = data.isCoastal || false;

    this.group = new THREE.Group();
    this.group.position.set(this.x, 0, this.z);
    scene.add(this.group);

    this._buildBase();
    this._cropGroup       = null;
    this._waterIndicator  = null;
    this._readyGlow       = null;
    this._lastKey         = '';
  }

  _buildBase() {
    // Main soil slab
    const geo  = new THREE.BoxGeometry(0.98, 0.14, 0.98);
    this._mat  = new THREE.MeshLambertMaterial({ color: COL_UNTILLED });
    this._base = new THREE.Mesh(geo, this._mat);
    this._base.position.y = 0.07;
    this._base.receiveShadow = true;
    this._base.castShadow    = true;
    this.group.add(this._base);

    // Raised border (four thin strips)
    const edgeMat = new THREE.MeshLambertMaterial({ color: 0x5a3a18 });
    const strips  = [
      [0.98, 0.06, 0.06, 0,     0.14,  0.46],
      [0.98, 0.06, 0.06, 0,     0.14, -0.46],
      [0.06, 0.06, 0.98, 0.46,  0.14,  0],
      [0.06, 0.06, 0.98,-0.46,  0.14,  0],
    ];
    for (const [w,h,d, ex,ey,ez] of strips) {
      const eg  = new THREE.BoxGeometry(w, h, d);
      const em  = new THREE.Mesh(eg, edgeMat);
      em.position.set(ex, ey, ez);
      em.castShadow = true;
      this.group.add(em);
    }

    // Coastal water-edge shimmer
    if (this.isCoastal) {
      const shimGeo = new THREE.BoxGeometry(1.06, 0.04, 1.06);
      const shimMat = new THREE.MeshLambertMaterial({ color: 0x4488ff, transparent: true, opacity: 0.45 });
      const shim    = new THREE.Mesh(shimGeo, shimMat);
      shim.position.y = 0.02;
      this.group.add(shim);
    }

    // Soil furrows (parallel ridges) — visible when tilled
    this._furrows = [];
    const furrowMat = new THREE.MeshLambertMaterial({ color: 0x3a2010 });
    for (let i = -1; i <= 1; i++) {
      const fg  = new THREE.BoxGeometry(0.9, 0.04, 0.1);
      const fm  = new THREE.Mesh(fg, furrowMat);
      fm.position.set(0, 0.145, i * 0.26);
      fm.visible = false;
      this.group.add(fm);
      this._furrows.push(fm);
    }
  }

  update(plotData, tideBlocked = false) {
    this.group.visible = !(this.isCoastal && tideBlocked);

    // Soil color
    let targetColor = COL_UNTILLED;
    if (plotData.tilled)  targetColor = COL_TILLED;
    if (plotData.watered) targetColor = COL_WATERED;
    this._mat.color.setHex(targetColor);

    // Furrows visible when tilled
    for (const f of this._furrows) f.visible = plotData.tilled;

    const stateKey = `${plotData.cropType}|${plotData.growthStage}|${isReadyToHarvest(plotData)}`;
    if (stateKey !== this._lastKey) {
      this._rebuildCrop(plotData);
      this._lastKey = stateKey;
    }

    // Animate water indicator
    if (this._waterIndicator) {
      const show = plotData.tilled && plotData.cropType && !plotData.watered && plotData.growthStage < 4;
      this._waterIndicator.visible = show;
      if (show) {
        const t = Date.now() * 0.003;
        this._waterIndicator.position.y = 0.75 + Math.sin(t) * 0.12;
        this._waterIndicator.rotation.y += 0.04;
        this._waterIndicator.rotation.x = 0.8 + Math.sin(t * 0.7) * 0.2;
      }
    }

    // Ready-to-harvest glow pulse
    if (this._readyGlow) {
      const t = Date.now() * 0.004;
      const pulse = 0.6 + 0.4 * Math.sin(t);
      this._readyGlow.material.opacity   = pulse * 0.55;
      this._readyGlow.material.emissiveIntensity = pulse * 0.8;
      this._readyGlow.scale.setScalar(1 + 0.08 * Math.sin(t));
    }
  }

  _rebuildCrop(plotData) {
    if (this._cropGroup)      { this.group.remove(this._cropGroup); this._cropGroup = null; }
    if (this._waterIndicator) { this.group.remove(this._waterIndicator); this._waterIndicator = null; }
    if (this._readyGlow)      { this.group.remove(this._readyGlow); this._readyGlow = null; }

    if (!plotData.cropType || plotData.growthStage === 0) return;

    const cropDef = CROPS[plotData.cropType];
    if (!cropDef) return;

    this._cropGroup = this._buildCropMesh(cropDef, plotData.growthStage);
    this.group.add(this._cropGroup);

    // Water droplet ring
    const ringGeo = new THREE.TorusGeometry(0.22, 0.035, 6, 14);
    const ringMat = new THREE.MeshLambertMaterial({ color: 0x44aaff, transparent: true, opacity: 0.85 });
    this._waterIndicator = new THREE.Mesh(ringGeo, ringMat);
    this._waterIndicator.position.y = 0.75;
    this._waterIndicator.visible    = false;
    this.group.add(this._waterIndicator);

    // Ready-to-harvest glow sphere
    if (plotData.growthStage >= 4) {
      const glowGeo = new THREE.SphereGeometry(0.35, 8, 6);
      const glowMat = new THREE.MeshLambertMaterial({
        color: cropDef.color,
        emissive: new THREE.Color(cropDef.color),
        emissiveIntensity: 0.6,
        transparent: true,
        opacity: 0.35,
      });
      this._readyGlow = new THREE.Mesh(glowGeo, glowMat);
      this._readyGlow.position.y = 0.5;
      this.group.add(this._readyGlow);
    }
  }

  _buildCropMesh(cropDef, stage) {
    const scale = [0, 0.28, 0.52, 0.76, 1.0][Math.min(stage, 4)];
    const g     = new THREE.Group();

    // Stem
    const stemH   = 0.42 * scale;
    const stemGeo = new THREE.CylinderGeometry(0.025, 0.035, stemH, 6);
    const stemMat = new THREE.MeshLambertMaterial({ color: 0x3a7a18 });
    const stem    = new THREE.Mesh(stemGeo, stemMat);
    stem.position.y = 0.14 + stemH / 2;
    stem.castShadow = true;
    g.add(stem);

    const topY = 0.14 + stemH;

    if (cropDef.name === 'Carrot') {
      // Carrot — orange cone + green fronds
      const cGeo = new THREE.ConeGeometry(0.11 * scale, 0.3 * scale, 6);
      const cMat = new THREE.MeshLambertMaterial({ color: 0xff7f20 });
      const cone = new THREE.Mesh(cGeo, cMat);
      cone.position.y = topY + 0.15 * scale;
      cone.rotation.x = Math.PI;
      cone.castShadow = true;
      g.add(cone);
      if (stage >= 2) {
        for (let i = 0; i < 3; i++) {
          const fGeo = new THREE.ConeGeometry(0.04, 0.2 * scale, 4);
          const fMat = new THREE.MeshLambertMaterial({ color: 0x3ab820 });
          const f    = new THREE.Mesh(fGeo, fMat);
          f.position.set(Math.cos(i*2.1)*0.07*scale, topY + 0.3*scale, Math.sin(i*2.1)*0.07*scale);
          f.castShadow = true;
          g.add(f);
        }
      }

    } else if (cropDef.name === 'Tomato') {
      // Tomato — red sphere with green calyx
      const tGeo = new THREE.SphereGeometry(0.13 * scale, 8, 6);
      const tMat = new THREE.MeshLambertMaterial({ color: stage >= 4 ? 0xff2a2a : 0xdd6622 });
      const tom  = new THREE.Mesh(tGeo, tMat);
      tom.position.y = topY + 0.13 * scale;
      tom.castShadow = true;
      g.add(tom);
      const calGeo = new THREE.ConeGeometry(0.07*scale, 0.09*scale, 5);
      const calMat = new THREE.MeshLambertMaterial({ color: 0x2a8a18 });
      const cal    = new THREE.Mesh(calGeo, calMat);
      cal.position.y = topY + 0.24*scale;
      g.add(cal);
      if (stage >= 2) {
        for (let i = 0; i < 4; i++) {
          const lGeo = new THREE.SphereGeometry(0.07*scale, 5, 4);
          lGeo.scale(1, 0.3, 1);
          const lMat = new THREE.MeshLambertMaterial({ color: 0x3a9a20 });
          const leaf = new THREE.Mesh(lGeo, lMat);
          leaf.position.set(
            Math.cos(i*1.57+0.3)*0.14*scale, topY*0.5,
            Math.sin(i*1.57+0.3)*0.14*scale,
          );
          leaf.rotation.z = 0.5;
          g.add(leaf);
        }
      }

    } else if (cropDef.name === 'Coconut') {
      // Coconut palm mini
      const cGeo = new THREE.SphereGeometry(0.15 * scale, 7, 6);
      cGeo.scale(1, 1.1, 1);
      const cMat = new THREE.MeshLambertMaterial({ color: 0x6b4a10 });
      const coc  = new THREE.Mesh(cGeo, cMat);
      coc.position.y = topY + 0.15 * scale;
      coc.castShadow = true;
      g.add(coc);
      if (stage >= 3) {
        for (let i = 0; i < 5; i++) {
          const frondGeo = new THREE.PlaneGeometry(0.1, 0.35 * scale, 1, 3);
          const frondMat = new THREE.MeshLambertMaterial({ color: 0x2d7a1a, side: THREE.DoubleSide });
          const frond    = new THREE.Mesh(frondGeo, frondMat);
          frond.position.y = topY + 0.3*scale;
          frond.rotation.y = (i/5)*Math.PI*2;
          frond.rotation.z = -0.6;
          g.add(frond);
        }
      }

    } else if (cropDef.name === 'Melon') {
      // Melon — striped sphere
      const mGeo = new THREE.SphereGeometry(0.18 * scale, 10, 7);
      mGeo.scale(1.15, 0.85, 1.15);
      const mMat = new THREE.MeshLambertMaterial({ color: 0x7ac840 });
      const mel  = new THREE.Mesh(mGeo, mMat);
      mel.position.y = topY + 0.17 * scale;
      mel.castShadow = true;
      g.add(mel);
      // Stripe lines
      for (let i = 0; i < 5; i++) {
        const sGeo = new THREE.TorusGeometry(0.17*scale, 0.013*scale, 4, 14, Math.PI);
        const sMat = new THREE.MeshLambertMaterial({ color: 0x4a8020 });
        const str  = new THREE.Mesh(sGeo, sMat);
        str.position.y = topY + 0.17*scale;
        str.rotation.y = (i/5)*Math.PI*2;
        str.rotation.z = Math.PI/2;
        g.add(str);
      }
      if (stage >= 2) {
        const vineGeo = new THREE.CylinderGeometry(0.018, 0.018, 0.3*scale, 4);
        const vineMat = new THREE.MeshLambertMaterial({ color: 0x4a8020 });
        const vine    = new THREE.Mesh(vineGeo, vineMat);
        vine.rotation.z = 0.5;
        vine.position.set(0.12*scale, topY*0.4, 0.05*scale);
        g.add(vine);
      }
    }

    return g;
  }

  dispose() { this.scene.remove(this.group); }
}

function isReadyToHarvest(plot) {
  return plot.tilled && plot.cropType && plot.growthStage >= 4;
}
