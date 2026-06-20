// ═══════════════════════════════════════════════════════
// GROWTH LOGIC — tick-driven crop progression
// ═══════════════════════════════════════════════════════
import { CROPS } from '../store/gameState.js';

/**
 * Advance crop growth by deltaMinutes of in-game time.
 * Returns updated plot object (immutable-style).
 */
export function tickCrop(plot, deltaMinutes) {
  if (!plot.tilled || !plot.cropType || plot.growthStage >= 4) return plot;

  const cropDef = CROPS[plot.cropType];
  if (!cropDef) return plot;

  // Growth only progresses when watered
  const growthRate = plot.watered ? 1.0 : 0.0;
  const minutesPerStage = cropDef.growTime / 4;

  const newProgress = (plot.growthProgress || 0) + deltaMinutes * growthRate;
  const newStage = Math.min(4, Math.floor(newProgress / minutesPerStage));

  return {
    ...plot,
    growthProgress: newProgress,
    growthStage: newStage,
    // Water depletes over time
    watered: plot.watered && newProgress % 60 < deltaMinutes ? false : plot.watered,
  };
}

/** Returns true if a crop is ready to harvest */
export function isReadyToHarvest(plot) {
  return plot.tilled && plot.cropType && plot.growthStage >= 4;
}

/** Returns true if a plot needs water */
export function needsWater(plot) {
  return plot.tilled && plot.cropType && !plot.watered && plot.growthStage < 4;
}
