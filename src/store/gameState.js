// ═══════════════════════════════════════════════════════
// GAME STATE — central source of truth for all game data
// Add new crops/items here without touching game logic
// ═══════════════════════════════════════════════════════

export const CROPS = {
  carrot:  { name: 'Carrot',  icon: '🥕', growTime: 60, waterNeeded: 2, seedCost: 20, sellPrice: 45,  stages: 4, color: 0xff7f3f },
  tomato:  { name: 'Tomato',  icon: '🍅', growTime: 90, waterNeeded: 3, seedCost: 30, sellPrice: 70,  stages: 4, color: 0xff3333 },
  coconut: { name: 'Coconut', icon: '🥥', growTime: 150,waterNeeded: 2, seedCost: 50, sellPrice: 130, stages: 4, color: 0x8B6914 },
  melon:   { name: 'Melon',   icon: '🍈', growTime: 120,waterNeeded: 3, seedCost: 40, sellPrice: 100, stages: 4, color: 0x88cc44 },
};

// Game time: 1 real second = 30 in-game seconds (each day = ~48 real seconds)
export const TIME_SCALE = 30;
export const DAY_LENGTH  = 24 * 60; // in-game minutes per day

const DEFAULT_STATE = {
  // Time
  gameMinute: 360, // start at 06:00
  day: 1,

  // Economy
  money: 100,

  // Inventory: { itemId: count } — seeds and harvested crops
  inventory: { carrot: 3 },

  // Selected inventory slot (item key or null)
  selectedItem: 'carrot',

  // Plots: array of plot objects
  plots: [],

  // Tide: 0–1 (0=low, 1=high); coastal plots locked when tide > 0.6
  tide: 0.1,
  tideRising: true,

  // NPC dialogue index
  npcDialogueIndex: 0,

  // Flags
  shopOpen: false,
  dialogueOpen: false,
};

// Simple reactive state with listener support
class GameState {
  constructor() {
    this._state = this._load() || structuredClone(DEFAULT_STATE);
    this._listeners = [];
  }

  get() { return this._state; }

  set(patch) {
    Object.assign(this._state, patch);
    this._notify();
  }

  subscribe(fn) {
    this._listeners.push(fn);
    return () => { this._listeners = this._listeners.filter(l => l !== fn); };
  }

  _notify() { this._listeners.forEach(fn => fn(this._state)); }

  save() {
    try {
      localStorage.setItem('lagoonvalley_save', JSON.stringify(this._state));
    } catch (_) {}
  }

  _load() {
    try {
      const raw = localStorage.getItem('lagoonvalley_save');
      return raw ? JSON.parse(raw) : null;
    } catch (_) { return null; }
  }

  reset() {
    this._state = structuredClone(DEFAULT_STATE);
    this.save();
    this._notify();
  }
}

export const gameState = new GameState();
