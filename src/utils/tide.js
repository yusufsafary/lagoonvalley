// ═══════════════════════════════════════════════════════
// TIDE SYSTEM — sinusoidal tide based on in-game time
// Coastal plots (marked isCoastal) are inaccessible at high tide
// ═══════════════════════════════════════════════════════

/**
 * Compute tide level [0..1] from gameMinute.
 * Two tide cycles per in-game day.
 */
export function computeTide(gameMinute) {
  const dayProgress = gameMinute / (24 * 60); // 0..1
  // Two full cycles per day
  return 0.5 + 0.5 * Math.sin(dayProgress * 4 * Math.PI);
}

export function isHighTide(tideLevel) {
  return tideLevel > 0.65;
}

export function tideName(tideLevel) {
  if (tideLevel > 0.75) return '🌊 High Tide';
  if (tideLevel > 0.65) return '🌊 Rising Tide';
  if (tideLevel > 0.35) return '🌊 Mid Tide';
  return '🌊 Low Tide';
}
