// ═══════════════════════════════════════════════════════
// HUD — heads-up display: time, money, tide, action label
// ═══════════════════════════════════════════════════════
import { tideName } from '../utils/tide.js';

export class HUD {
  constructor() {
    this._timeEl   = document.getElementById('hud-time');
    this._moneyEl  = document.getElementById('hud-money');
    this._dayEl    = document.getElementById('hud-day');
    this._tideEl   = document.getElementById('tide-indicator');
    this._labelEl  = document.getElementById('action-label');
    this._actionEl = document.getElementById('action-btn');
  }

  /** @param {object} state — gameState snapshot */
  update(state) {
    const { gameMinute, day, money, tide } = state;

    // Time display
    const h   = Math.floor(gameMinute / 60) % 24;
    const m   = Math.floor(gameMinute % 60);
    const ampm = h >= 12 ? 'PM' : 'AM';
    const h12  = h % 12 || 12;
    this._timeEl.textContent  = `${String(h12).padStart(2,'0')}:${String(m).padStart(2,'0')} ${ampm}`;
    this._dayEl.textContent   = `Day ${day}`;
    this._moneyEl.textContent = `💰 ${money}g`;
    this._tideEl.textContent  = tideName(tide);

    // Color tide indicator
    const tideColor = tide > 0.65 ? 'rgba(0,40,180,.75)' : 'rgba(0,80,180,.55)';
    this._tideEl.style.background = tideColor;
  }

  setActionLabel(text, icon = '⚡') {
    this._labelEl.textContent   = text;
    this._actionEl.textContent  = icon;
  }
}
