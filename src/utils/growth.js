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

  const growthRate    = plot.watered ? 1.0 : 0.0;
  const minutesPerStage = cropDef.growTime / 4;

  const newProgress = (plot.growthProgress || 0) + deltaMinutes * growthRate;
  const newStage    = Math.min(4, Math.floor(newProgress / minutesPerStage));

  // Water depletes gradually — every full in-game hour
  const waterDepleted = plot.watered && (newProgress % 60 < deltaMinutes);

  return {
    ...plot,
    growthProgress: newProgress,
    growthStage:    newStage,
    watered:        plot.watered && !waterDepleted,
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

/**
 * Compute how much bonus yield a plot gets based on its zone.
 * Coastal plots (high z) get a tide bonus when tide is LOW.
 */
export function harvestYield(plot, tideLevel) {
  let qty = 1;
  // Coastal bonus: extra yield when tide is below 0.35
  if (plot.z > 4 && tideLevel < 0.35) qty = 2;
  // Inland bonus: consistent yield regardless of tide
  if (plot.z < -2) qty = 1;
  return qty;
}
