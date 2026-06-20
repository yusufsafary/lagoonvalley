// ═══════════════════════════════════════════════════════
// FARM — creates and manages all Plot objects
// ═══════════════════════════════════════════════════════
import * as THREE from 'three';
import { Plot } from './Plot.js';
import { gameState } from '../store/gameState.js';

// Layout: a 4×3 grid of plots (non-coastal) + 1×3 coastal row
const PLOT_LAYOUT = [
  // inland plots
  ...generateGrid(-3.5, -1, 4, 3, false),
  // coastal row (near water's edge at z = 5)
  ...generateGrid(-1.5, 4.5, 3, 1, true),
];

function generateGrid(startX, startZ, cols, rows, isCoastal) {
  const plots = [];
  for (let r = 0; r < rows; r++) {
    for (let c = 0; c < cols; c++) {
      plots.push({
        x: startX + c * 1.4,
        z: startZ + r * 1.4,
        isCoastal,
      });
    }
  }
  return plots;
}

export class Farm {
  constructor(scene) {
    this.scene   = scene;
    this.plots   = []; // Plot instances

    this._initPlots();
  }

  _initPlots() {
    const state  = gameState.get();
    let savedPlots = state.plots;

    // First run — initialize from layout
    if (!savedPlots.length) {
      savedPlots = PLOT_LAYOUT.map((layout, i) => ({
        id:            i,
        x:             layout.x,
        z:             layout.z,
        isCoastal:     layout.isCoastal,
        tilled:        false,
        cropType:      null,
        growthProgress: 0,
        growthStage:   0,
        watered:       false,
      }));
      gameState.set({ plots: savedPlots });
    }

    // Create Plot meshes
    for (const pd of savedPlots) {
      this.plots.push(new Plot(this.scene, pd));
    }
  }

  /**
   * Called every frame — sync visuals to game state.
   * @param {number} tideLevel
   */
  update(tideLevel) {
    const { plots } = gameState.get();
    const highTide  = tideLevel > 0.65;

    for (let i = 0; i < this.plots.length; i++) {
      const plotMesh = this.plots[i];
      const plotData = plots[i];
      if (plotData) plotMesh.update(plotData, highTide);
    }
  }

  /**
   * Find plot closest to world position, within range.
   * @returns {object|null} { index, plotData, plotMesh }
   */
  getPlotNear(x, z, range = 1.0) {
    const { plots } = gameState.get();
    let best = null, bestDist = Infinity;

    for (let i = 0; i < this.plots.length; i++) {
      const pm   = this.plots[i];
      const dist = Math.hypot(x - pm.x, z - pm.z);
      if (dist < range && dist < bestDist) {
        bestDist = dist;
        best = { index: i, plotData: plots[i], plotMesh: pm };
      }
    }
    return best;
  }

  /** Get all plot obstacle circles (for player collision) */
  getObstacles() { return []; } // plots are flat — no collision needed
}
