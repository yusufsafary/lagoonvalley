// ═══════════════════════════════════════════════════════
// GAME STATE — central source of truth for all game data
// ═══════════════════════════════════════════════════════

export const CROPS = {
  carrot:    { name: 'Carrot',    icon: '🥕', growTime: 60,  waterNeeded: 2, seedCost: 20,  sellPrice: 45,   stages: 4, color: 0xff7f3f },
  tomato:    { name: 'Tomato',    icon: '🍅', growTime: 90,  waterNeeded: 3, seedCost: 30,  sellPrice: 70,   stages: 4, color: 0xff3333 },
  coconut:   { name: 'Coconut',   icon: '🥥', growTime: 150, waterNeeded: 2, seedCost: 50,  sellPrice: 130,  stages: 4, color: 0x8B6914 },
  melon:     { name: 'Melon',     icon: '🍈', growTime: 120, waterNeeded: 3, seedCost: 40,  sellPrice: 100,  stages: 4, color: 0x88cc44 },
  pineapple: { name: 'Pineapple', icon: '🍍', growTime: 180, waterNeeded: 2, seedCost: 65,  sellPrice: 180,  stages: 4, color: 0xffcc00 },
  mango:     { name: 'Mango',     icon: '🥭', growTime: 130, waterNeeded: 3, seedCost: 55,  sellPrice: 140,  stages: 4, color: 0xff9900 },
  banana:    { name: 'Banana',    icon: '🍌', growTime: 75,  waterNeeded: 2, seedCost: 25,  sellPrice: 55,   stages: 4, color: 0xffee44 },
  corn:      { name: 'Corn',      icon: '🌽', growTime: 100, waterNeeded: 2, seedCost: 35,  sellPrice: 80,   stages: 4, color: 0xffcc22 },
  pumpkin:   { name: 'Pumpkin',   icon: '🎃', growTime: 160, waterNeeded: 3, seedCost: 60,  sellPrice: 155,  stages: 4, color: 0xff7722 },
  pepper:    { name: 'Pepper',    icon: '🌶️', growTime: 85,  waterNeeded: 3, seedCost: 32,  sellPrice: 75,   stages: 4, color: 0xff2222 },
};

// Game time: 1 real second = 30 in-game seconds (each day = ~48 real seconds)
export const TIME_SCALE = 30;
export const DAY_LENGTH  = 24 * 60; // in-game minutes per day

const DEFAULT_STATE = {
  gameMinute:  360, // start at 06:00
  day:         1,
  money:       150,
  inventory:   { carrot: 3, banana: 2 },
  selectedItem:'carrot',
  plots:       [],
  tide:        0.1,
  tideRising:  true,
  npcDialogueIndex: 0,
  shopOpen:    false,
  dialogueOpen:false,
};

class GameState {
  constructor() {
    this._state     = this._load() || structuredClone(DEFAULT_STATE);
    this._listeners = [];
  }

  get()   { return this._state; }

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
    try { localStorage.setItem('lagoonvalley_save', JSON.stringify(this._state)); } catch (_) {}
  }

  _load() {
    try {
      const raw = localStorage.getItem('lagoonvalley_save');
      if (!raw) return null;
      const data = JSON.parse(raw);
      // Migrate old saves missing new crops in inventory structure
      return data;
    } catch (_) { return null; }
  }

  reset() {
    this._state = structuredClone(DEFAULT_STATE);
    this.save();
    this._notify();
  }
}

export const gameState = new GameState();
