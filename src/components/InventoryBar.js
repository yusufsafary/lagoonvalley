// ═══════════════════════════════════════════════════════
// INVENTORY BAR — bottom slot strip showing seeds + crops
// ═══════════════════════════════════════════════════════
import { CROPS } from '../store/gameState.js';

export class InventoryBar {
  constructor(onSelect) {
    this._bar      = document.getElementById('inventory-bar');
    this._onSelect = onSelect;
    this._slots    = {};
  }

  update(inventory, selectedItem) {
    this._bar.innerHTML = '';
    this._slots = {};

    const items = Object.entries(inventory).filter(([, count]) => count > 0);

    if (items.length === 0) {
      const empty = document.createElement('div');
      empty.className = 'inv-slot';
      empty.style.opacity = '0.5';
      empty.innerHTML = '<span class="slot-icon">🌱</span><span class="slot-name">Empty</span>';
      this._bar.appendChild(empty);
      return;
    }

    for (const [key, count] of items) {
      const cropDef = CROPS[key];
      // Use icon directly from CROPS definition — covers all crops
      const icon = cropDef ? cropDef.icon : '📦';
      const name = cropDef ? cropDef.name : key;

      const slot = document.createElement('div');
      slot.className = 'inv-slot' + (key === selectedItem ? ' selected' : '');
      slot.innerHTML = `
        <span class="slot-icon">${icon}</span>
        <span class="slot-count">×${count}</span>
        <span class="slot-name">${name}</span>
      `;
      slot.addEventListener('click',    () => this._onSelect(key));
      slot.addEventListener('touchend', e  => { e.preventDefault(); this._onSelect(key); });
      this._bar.appendChild(slot);
      this._slots[key] = slot;
    }
  }
}
