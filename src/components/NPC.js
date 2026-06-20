// ═══════════════════════════════════════════════════════
// NPC — friendly character with cycling dialogue
// Add more dialogues array entries to extend story content
// ═══════════════════════════════════════════════════════
import * as THREE from 'three';

const DIALOGUES = [
  "Welcome to Lagoon Valley! Tap a plot, then use the action button to till, plant, and water your crops.",
  "When the tide is high, coastal plots flood — plan your harvests accordingly!",
  "Carrots grow fastest. Coconuts take longer but sell for a great price!",
  "Water your crops every day — they won't grow without it.",
  "Sell your harvest at the shop. The more you grow, the more you earn!",
  "Did you know? Melons love the tropical soil here — good yield!",
  "Each new day brings a fresh tide cycle. The lagoon is always changing.",
  "Keep planting! A full farm means a full wallet. 🌴",
];

export class NPC {
  constructor(scene) {
    this.scene = scene;
    this.x     = 6;
    this.z     = -3;
    this.dialogueIndex = 0;

    this.mesh = this._buildMesh();
    scene.add(this.mesh);

    // Floating name label (canvas texture)
    this._label = this._buildLabel();
    scene.add(this._label);
  }

  _buildMesh() {
    const group = new THREE.Group();
    group.position.set(this.x, 0.9, this.z);

    // Body
    const bodyGeo = new THREE.CylinderGeometry(0.22, 0.25, 0.65, 8);
    const bodyMat = new THREE.MeshLambertMaterial({ color: 0xff8fab });
    const body    = new THREE.Mesh(bodyGeo, bodyMat);
    body.castShadow = true;
    group.add(body);

    // Head
    const headGeo = new THREE.SphereGeometry(0.22, 8, 6);
    const headMat = new THREE.MeshLambertMaterial({ color: 0xffd8a8 });
    const head    = new THREE.Mesh(headGeo, headMat);
    head.position.y = 0.48;
    head.castShadow = true;
    group.add(head);

    // Hair — flat cylinder
    const hairGeo = new THREE.CylinderGeometry(0.24, 0.24, 0.08, 8);
    const hairMat = new THREE.MeshLambertMaterial({ color: 0x4a2800 });
    const hair    = new THREE.Mesh(hairGeo, hairMat);
    hair.position.y = 0.62;
    hair.castShadow = true;
    group.add(hair);

    // Apron (flat box in front)
    const apronGeo = new THREE.BoxGeometry(0.28, 0.4, 0.06);
    const apronMat = new THREE.MeshLambertMaterial({ color: 0xffffff });
    const apron    = new THREE.Mesh(apronGeo, apronMat);
    apron.position.set(0, -0.05, 0.2);
    group.add(apron);

    return group;
  }

  _buildLabel() {
    // Canvas texture "Mira"
    const canvas  = document.createElement('canvas');
    canvas.width  = 128; canvas.height = 32;
    const ctx     = canvas.getContext('2d');
    ctx.fillStyle = 'rgba(0,0,0,0)';
    ctx.clearRect(0, 0, 128, 32);
    ctx.font      = 'bold 18px sans-serif';
    ctx.fillStyle = '#4fc';
    ctx.textAlign = 'center';
    ctx.fillText('Mira', 64, 22);

    const tex     = new THREE.CanvasTexture(canvas);
    const geo     = new THREE.PlaneGeometry(1.2, 0.3);
    const mat     = new THREE.MeshBasicMaterial({ map: tex, transparent: true, depthWrite: false });
    const mesh    = new THREE.Mesh(geo, mat);
    mesh.position.set(this.x, 2.5, this.z);
    return mesh;
  }

  /** Billboard label faces camera each frame */
  update(cameraPosition) {
    // Bob animation
    this.mesh.position.y = 0.9 + Math.sin(Date.now() * 0.002) * 0.04;

    // Label billboard
    this._label.lookAt(cameraPosition);
    this._label.position.y = 2.5 + Math.sin(Date.now() * 0.002) * 0.04;
  }

  getNextDialogue() {
    const line = DIALOGUES[this.dialogueIndex % DIALOGUES.length];
    this.dialogueIndex++;
    return line;
  }
}
