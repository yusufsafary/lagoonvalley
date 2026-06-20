// ═══════════════════════════════════════════════════════
// PLOT — farm tile with realistic soil, crop, water VFX
// Supports all 10 crop types
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
    const geo  = new THREE.BoxGeometry(0.98, 0.14, 0.98);
    this._mat  = new THREE.MeshLambertMaterial({ color: COL_UNTILLED });
    this._base = new THREE.Mesh(geo, this._mat);
    this._base.position.y = 0.07;
    this._base.receiveShadow = true;
    this._base.castShadow    = true;
    this.group.add(this._base);

    const edgeMat = new THREE.MeshLambertMaterial({ color: 0x5a3a18 });
    const strips  = [
      [0.98, 0.06, 0.06, 0,     0.14,  0.46],
      [0.98, 0.06, 0.06, 0,     0.14, -0.46],
      [0.06, 0.06, 0.98, 0.46,  0.14,  0],
      [0.06, 0.06, 0.98,-0.46,  0.14,  0],
    ];
    for (const [w,h,d, ex,ey,ez] of strips) {
      const em = new THREE.Mesh(new THREE.BoxGeometry(w,h,d), edgeMat);
      em.position.set(ex, ey, ez);
      em.castShadow = true;
      this.group.add(em);
    }

    if (this.isCoastal) {
      const shimMat = new THREE.MeshLambertMaterial({ color: 0x4488ff, transparent: true, opacity: 0.45 });
      const shim    = new THREE.Mesh(new THREE.BoxGeometry(1.06, 0.04, 1.06), shimMat);
      shim.position.y = 0.02;
      this.group.add(shim);
    }

    this._furrows = [];
    const furrowMat = new THREE.MeshLambertMaterial({ color: 0x3a2010 });
    for (let i = -1; i <= 1; i++) {
      const fm = new THREE.Mesh(new THREE.BoxGeometry(0.9, 0.04, 0.1), furrowMat);
      fm.position.set(0, 0.145, i * 0.26);
      fm.visible = false;
      this.group.add(fm);
      this._furrows.push(fm);
    }
  }

  update(plotData, tideBlocked = false) {
    this.group.visible = !(this.isCoastal && tideBlocked);

    let targetColor = COL_UNTILLED;
    if (plotData.tilled)  targetColor = COL_TILLED;
    if (plotData.watered) targetColor = COL_WATERED;
    this._mat.color.setHex(targetColor);

    for (const f of this._furrows) f.visible = plotData.tilled;

    const stateKey = `${plotData.cropType}|${plotData.growthStage}|${isReadyToHarvest(plotData)}`;
    if (stateKey !== this._lastKey) {
      this._rebuildCrop(plotData);
      this._lastKey = stateKey;
    }

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

    if (this._readyGlow) {
      const t = Date.now() * 0.004;
      const pulse = 0.6 + 0.4 * Math.sin(t);
      this._readyGlow.material.opacity = pulse * 0.55;
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

    this._cropGroup = this._buildCropMesh(cropDef, plotData.growthStage, plotData.cropType);
    this.group.add(this._cropGroup);

    const ringMat = new THREE.MeshLambertMaterial({ color: 0x44aaff, transparent: true, opacity: 0.85 });
    this._waterIndicator = new THREE.Mesh(new THREE.TorusGeometry(0.22, 0.035, 6, 14), ringMat);
    this._waterIndicator.position.y = 0.75;
    this._waterIndicator.visible    = false;
    this.group.add(this._waterIndicator);

    if (plotData.growthStage >= 4) {
      const glowMat = new THREE.MeshLambertMaterial({
        color: cropDef.color,
        emissive: new THREE.Color(cropDef.color),
        emissiveIntensity: 0.6,
        transparent: true,
        opacity: 0.35,
      });
      this._readyGlow = new THREE.Mesh(new THREE.SphereGeometry(0.35, 8, 6), glowMat);
      this._readyGlow.position.y = 0.5;
      this.group.add(this._readyGlow);
    }
  }

  _buildCropMesh(cropDef, stage, cropKey) {
    const scale = [0, 0.28, 0.52, 0.76, 1.0][Math.min(stage, 4)];
    const g     = new THREE.Group();

    // ── Generic stem ──────────────────────────
    const stemH   = 0.42 * scale;
    const stem    = new THREE.Mesh(
      new THREE.CylinderGeometry(0.025, 0.035, stemH, 6),
      new THREE.MeshLambertMaterial({ color: 0x3a7a18 })
    );
    stem.position.y = 0.14 + stemH / 2;
    stem.castShadow = true;
    g.add(stem);
    const topY = 0.14 + stemH;

    // ── Crop-specific meshes ──────────────────
    switch (cropKey) {

      case 'carrot': {
        const cone = new THREE.Mesh(
          new THREE.ConeGeometry(0.11 * scale, 0.3 * scale, 6),
          new THREE.MeshLambertMaterial({ color: 0xff7f20 })
        );
        cone.position.y = topY + 0.15 * scale;
        cone.rotation.x = Math.PI;
        cone.castShadow = true;
        g.add(cone);
        if (stage >= 2) {
          for (let i = 0; i < 3; i++) {
            const f = new THREE.Mesh(
              new THREE.ConeGeometry(0.04, 0.2 * scale, 4),
              new THREE.MeshLambertMaterial({ color: 0x3ab820 })
            );
            f.position.set(Math.cos(i*2.1)*0.07*scale, topY+0.3*scale, Math.sin(i*2.1)*0.07*scale);
            g.add(f);
          }
        }
        break;
      }

      case 'tomato': {
        const tom = new THREE.Mesh(
          new THREE.SphereGeometry(0.13 * scale, 8, 6),
          new THREE.MeshLambertMaterial({ color: stage >= 4 ? 0xff2a2a : 0xdd6622 })
        );
        tom.position.y = topY + 0.13 * scale;
        tom.castShadow = true;
        g.add(tom);
        const cal = new THREE.Mesh(
          new THREE.ConeGeometry(0.07*scale, 0.09*scale, 5),
          new THREE.MeshLambertMaterial({ color: 0x2a8a18 })
        );
        cal.position.y = topY + 0.24*scale;
        g.add(cal);
        if (stage >= 2) {
          for (let i = 0; i < 4; i++) {
            const geo = new THREE.SphereGeometry(0.07*scale, 5, 4);
            geo.scale(1, 0.3, 1);
            const leaf = new THREE.Mesh(geo, new THREE.MeshLambertMaterial({ color: 0x3a9a20 }));
            leaf.position.set(Math.cos(i*1.57+0.3)*0.14*scale, topY*0.5, Math.sin(i*1.57+0.3)*0.14*scale);
            leaf.rotation.z = 0.5;
            g.add(leaf);
          }
        }
        break;
      }

      case 'coconut': {
        const coc = new THREE.Mesh(
          new THREE.SphereGeometry(0.15 * scale, 7, 6),
          new THREE.MeshLambertMaterial({ color: 0x6b4a10 })
        );
        coc.scale.y = 1.1;
        coc.position.y = topY + 0.15 * scale;
        coc.castShadow = true;
        g.add(coc);
        if (stage >= 3) {
          for (let i = 0; i < 5; i++) {
            const frond = new THREE.Mesh(
              new THREE.PlaneGeometry(0.1, 0.35 * scale, 1, 3),
              new THREE.MeshLambertMaterial({ color: 0x2d7a1a, side: THREE.DoubleSide })
            );
            frond.position.y = topY + 0.3*scale;
            frond.rotation.y = (i/5)*Math.PI*2;
            frond.rotation.z = -0.6;
            g.add(frond);
          }
        }
        break;
      }

      case 'melon': {
        const geo = new THREE.SphereGeometry(0.18 * scale, 10, 7);
        geo.scale(1.15, 0.85, 1.15);
        const mel = new THREE.Mesh(geo, new THREE.MeshLambertMaterial({ color: 0x7ac840 }));
        mel.position.y = topY + 0.17 * scale;
        mel.castShadow = true;
        g.add(mel);
        for (let i = 0; i < 5; i++) {
          const str = new THREE.Mesh(
            new THREE.TorusGeometry(0.17*scale, 0.013*scale, 4, 14, Math.PI),
            new THREE.MeshLambertMaterial({ color: 0x4a8020 })
          );
          str.position.y = topY + 0.17*scale;
          str.rotation.y = (i/5)*Math.PI*2;
          str.rotation.z = Math.PI/2;
          g.add(str);
        }
        if (stage >= 2) {
          const vine = new THREE.Mesh(
            new THREE.CylinderGeometry(0.018, 0.018, 0.3*scale, 4),
            new THREE.MeshLambertMaterial({ color: 0x4a8020 })
          );
          vine.rotation.z = 0.5;
          vine.position.set(0.12*scale, topY*0.4, 0.05*scale);
          g.add(vine);
        }
        break;
      }

      case 'pineapple': {
        // Body
        const body = new THREE.Mesh(
          new THREE.CylinderGeometry(0.09*scale, 0.11*scale, 0.28*scale, 8),
          new THREE.MeshLambertMaterial({ color: stage >= 4 ? 0xffcc00 : 0xe8b800 })
        );
        body.position.y = topY + 0.14*scale;
        body.castShadow = true;
        g.add(body);
        // Diamond pattern bumps
        if (stage >= 2) {
          for (let row = 0; row < 3; row++) {
            for (let col = 0; col < 5; col++) {
              const bump = new THREE.Mesh(
                new THREE.SphereGeometry(0.025*scale, 4, 3),
                new THREE.MeshLambertMaterial({ color: 0xcc9900 })
              );
              const ang = (col / 5) * Math.PI * 2;
              bump.position.set(
                Math.cos(ang) * 0.098*scale,
                topY + (0.04 + row*0.085)*scale,
                Math.sin(ang) * 0.098*scale
              );
              g.add(bump);
            }
          }
        }
        // Crown leaves
        if (stage >= 3) {
          for (let i = 0; i < 6; i++) {
            const leaf = new THREE.Mesh(
              new THREE.ConeGeometry(0.022*scale, 0.22*scale, 4),
              new THREE.MeshLambertMaterial({ color: 0x2a7a10 })
            );
            leaf.position.y = topY + 0.32*scale;
            leaf.rotation.y = (i/6)*Math.PI*2;
            leaf.rotation.z = 0.55;
            g.add(leaf);
          }
        }
        break;
      }

      case 'mango': {
        // Kidney-shaped fruit
        const fruit = new THREE.Mesh(
          new THREE.SphereGeometry(0.14*scale, 9, 7),
          new THREE.MeshLambertMaterial({ color: stage >= 4 ? 0xff8800 : 0xffaa00 })
        );
        fruit.scale.set(1.1, 1.3, 0.85);
        fruit.position.y = topY + 0.18*scale;
        fruit.castShadow = true;
        g.add(fruit);
        // Red blush on ripe mango
        if (stage >= 4) {
          const blush = new THREE.Mesh(
            new THREE.SphereGeometry(0.09*scale, 7, 5),
            new THREE.MeshLambertMaterial({ color: 0xff4400, transparent: true, opacity: 0.6 })
          );
          blush.position.set(0.06*scale, topY + 0.24*scale, 0.05*scale);
          g.add(blush);
        }
        // Leaf
        if (stage >= 2) {
          for (let i = 0; i < 3; i++) {
            const leaf = new THREE.Mesh(
              new THREE.PlaneGeometry(0.1*scale, 0.22*scale),
              new THREE.MeshLambertMaterial({ color: 0x3a8a18, side: THREE.DoubleSide })
            );
            leaf.position.set(Math.cos(i*2.1)*0.08*scale, topY*0.6, Math.sin(i*2.1)*0.08*scale);
            leaf.rotation.z = -0.4 + i*0.2;
            g.add(leaf);
          }
        }
        break;
      }

      case 'banana': {
        // Bunch of bananas
        const bunch = new THREE.Group();
        bunch.position.y = topY + 0.1*scale;
        const count = stage >= 3 ? 4 : 2;
        for (let i = 0; i < count; i++) {
          const geo = new THREE.CylinderGeometry(0.032*scale, 0.028*scale, 0.22*scale, 5);
          const ban = new THREE.Mesh(geo, new THREE.MeshLambertMaterial({ color: stage >= 4 ? 0xffee00 : 0xddcc00 }));
          const ang = (i / count) * Math.PI * 2;
          ban.position.set(Math.cos(ang)*0.08*scale, 0, Math.sin(ang)*0.08*scale);
          ban.rotation.z = 0.5;
          ban.rotation.y = ang;
          ban.castShadow = true;
          bunch.add(ban);
        }
        g.add(bunch);
        // Stem bunch connector
        const conn = new THREE.Mesh(
          new THREE.SphereGeometry(0.055*scale, 6, 5),
          new THREE.MeshLambertMaterial({ color: 0x886600 })
        );
        conn.position.y = topY + 0.1*scale;
        g.add(conn);
        // Leaf
        if (stage >= 2) {
          const leaf = new THREE.Mesh(
            new THREE.PlaneGeometry(0.18*scale, 0.35*scale),
            new THREE.MeshLambertMaterial({ color: 0x2d8a15, side: THREE.DoubleSide })
          );
          leaf.position.y = topY + 0.25*scale;
          leaf.rotation.z = -0.4;
          g.add(leaf);
        }
        break;
      }

      case 'corn': {
        // Tall stalk
        const stalkH = 0.55*scale;
        const stalk = new THREE.Mesh(
          new THREE.CylinderGeometry(0.03*scale, 0.04*scale, stalkH, 6),
          new THREE.MeshLambertMaterial({ color: 0x4a9020 })
        );
        stalk.position.y = 0.14 + stalkH/2;
        g.add(stalk);

        // Corn cob
        if (stage >= 2) {
          const cobY = 0.14 + stalkH * 0.55;
          const cob = new THREE.Mesh(
            new THREE.CylinderGeometry(0.07*scale, 0.05*scale, 0.22*scale, 8),
            new THREE.MeshLambertMaterial({ color: stage >= 4 ? 0xffcc00 : 0xddaa00 })
          );
          cob.position.y = cobY;
          cob.rotation.z = 0.4;
          cob.castShadow = true;
          g.add(cob);
          // Corn kernel rows
          if (stage >= 3) {
            for (let r = 0; r < 4; r++) {
              for (let k = 0; k < 5; k++) {
                const kernel = new THREE.Mesh(
                  new THREE.SphereGeometry(0.018*scale, 4, 3),
                  new THREE.MeshLambertMaterial({ color: 0xffe050 })
                );
                const ang = (k/5)*Math.PI*2;
                kernel.position.set(
                  cobY + (r*0.05 - 0.07)*scale,
                  cobY + Math.cos(ang)*0.072*scale,
                  Math.sin(ang)*0.072*scale
                );
                // Adjust for cob rotation
                const kGroup = new THREE.Group();
                kGroup.position.set(Math.cos(ang)*0.065*scale, cobY + (r*0.045-0.05)*scale, Math.sin(ang)*0.065*scale);
                kGroup.add(kernel);
                kernel.position.set(0,0,0);
                g.add(kGroup);
              }
            }
          }
          // Husk leaves
          const husk = new THREE.Mesh(
            new THREE.PlaneGeometry(0.12*scale, 0.28*scale),
            new THREE.MeshLambertMaterial({ color: 0x5ab030, side: THREE.DoubleSide })
          );
          husk.position.set(0.05*scale, cobY + 0.04*scale, 0);
          husk.rotation.z = -0.7;
          g.add(husk);
        }

        // Top tassel
        if (stage >= 3) {
          const tassH = 0.18*scale;
          const tass = new THREE.Mesh(
            new THREE.ConeGeometry(0.03*scale, tassH, 5),
            new THREE.MeshLambertMaterial({ color: 0xdddd44 })
          );
          tass.position.y = 0.14 + stalkH + tassH/2;
          g.add(tass);
        }
        // Remove default stem (replaced by stalk)
        if (g.children[0] === stem) g.remove(stem);
        break;
      }

      case 'pumpkin': {
        // Ribbed pumpkin sphere
        const geo = new THREE.SphereGeometry(0.17*scale, 10, 7);
        geo.scale(1.2, 0.88, 1.2);
        const pump = new THREE.Mesh(geo, new THREE.MeshLambertMaterial({ color: stage >= 4 ? 0xff6600 : 0xee8800 }));
        pump.position.y = topY + 0.17*scale;
        pump.castShadow = true;
        g.add(pump);
        // Ribs
        for (let i = 0; i < 6; i++) {
          const rib = new THREE.Mesh(
            new THREE.TorusGeometry(0.165*scale, 0.022*scale, 4, 14, Math.PI),
            new THREE.MeshLambertMaterial({ color: stage >= 4 ? 0xdd5500 : 0xcc7700 })
          );
          rib.position.y = topY + 0.17*scale;
          rib.rotation.y = (i/6)*Math.PI*2;
          rib.rotation.z = Math.PI/2;
          g.add(rib);
        }
        // Stem on top
        const pStem = new THREE.Mesh(
          new THREE.CylinderGeometry(0.018*scale, 0.025*scale, 0.10*scale, 5),
          new THREE.MeshLambertMaterial({ color: 0x3a6010 })
        );
        pStem.position.y = topY + 0.35*scale;
        g.add(pStem);
        // Leaves
        if (stage >= 2) {
          for (let i = 0; i < 3; i++) {
            const leaf = new THREE.Mesh(
              new THREE.SphereGeometry(0.08*scale, 5, 4),
              new THREE.MeshLambertMaterial({ color: 0x3a8a18 })
            );
            leaf.scale.set(1.4, 0.3, 1.4);
            leaf.position.set(
              Math.cos(i*2.1)*0.16*scale, topY*0.5,
              Math.sin(i*2.1)*0.16*scale
            );
            g.add(leaf);
          }
        }
        break;
      }

      case 'pepper': {
        // Red tapered chili pepper
        const geo = new THREE.CylinderGeometry(0.0, 0.07*scale, 0.28*scale, 6);
        const pep = new THREE.Mesh(geo, new THREE.MeshLambertMaterial({ color: stage >= 4 ? 0xff1a00 : 0xff6600 }));
        pep.position.y = topY + 0.14*scale;
        pep.rotation.z = 0.3;
        pep.castShadow = true;
        g.add(pep);
        // Cap
        const cap = new THREE.Mesh(
          new THREE.CylinderGeometry(0.035*scale, 0.07*scale, 0.06*scale, 6),
          new THREE.MeshLambertMaterial({ color: 0x2a7a10 })
        );
        cap.position.y = topY + 0.26*scale;
        cap.rotation.z = 0.3;
        g.add(cap);
        // Small stem leaves
        if (stage >= 2) {
          for (let i = 0; i < 3; i++) {
            const leaf = new THREE.Mesh(
              new THREE.PlaneGeometry(0.08*scale, 0.14*scale),
              new THREE.MeshLambertMaterial({ color: 0x3a8818, side: THREE.DoubleSide })
            );
            leaf.position.set(Math.cos(i*2.1)*0.07*scale, topY*0.55, Math.sin(i*2.1)*0.07*scale);
            leaf.rotation.z = -0.5 + i*0.3;
            g.add(leaf);
          }
        }
        break;
      }

      default: {
        // Generic fallback fruit
        const ball = new THREE.Mesh(
          new THREE.SphereGeometry(0.12*scale, 8, 6),
          new THREE.MeshLambertMaterial({ color: cropDef.color })
        );
        ball.position.y = topY + 0.12*scale;
        ball.castShadow = true;
        g.add(ball);
      }
    }

    return g;
  }

  dispose() { this.scene.remove(this.group); }
}

function isReadyToHarvest(plot) {
  return plot.tilled && plot.cropType && plot.growthStage >= 4;
}
