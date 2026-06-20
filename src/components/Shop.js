// ═══════════════════════════════════════════════════════
// SHOP — buy seeds / sell crops modal UI
// Add new entries to CROPS in gameState.js to extend shop
// ═══════════════════════════════════════════════════════
import { gameState, CROPS } from '../store/gameState.js';
import { showToast } from '../main.js';

export class Shop {
  constructor() {
    this._modal    = document.getElementById('shop-modal');
    this._items    = document.getElementById('shop-items');
    this._moneyEl  = document.getElementById('shop-money');
    this._closeBtn = document.getElementById('shop-close');
    this._tabs     = document.querySelectorAll('.shop-tab');

    this._activeTab = 'buy';

    this._closeBtn.addEventListener('click',    () => this.close());
    this._closeBtn.addEventListener('touchend', e  => { e.preventDefault(); this.close(); });

    this._tabs.forEach(tab => {
      tab.addEventListener('click', () => {
        this._activeTab = tab.dataset.tab;
        this._tabs.forEach(t => t.classList.remove('active'));
        tab.classList.add('active');
        this._render();
      });
    });

    document.getElementById('shop-btn').addEventListener('click',    () => this.open());
    document.getElementById('shop-btn').addEventListener('touchend', e => { e.preventDefault(); this.open(); });
  }

  open() {
    this._modal.classList.add('open');
    gameState.set({ shopOpen: true });
    this._render();
  }

  close() {
    this._modal.classList.remove('open');
    gameState.set({ shopOpen: false });
  }

  _render() {
    const state = gameState.get();
    this._moneyEl.textContent = `💰 ${state.money}g`;
    this._items.innerHTML = '';

    if (this._activeTab === 'buy') {
      this._renderBuy(state);
    } else {
      this._renderSell(state);
    }
  }

  _renderBuy(state) {
    for (const [key, crop] of Object.entries(CROPS)) {
      const div = document.createElement('div');
      div.className = 'shop-item';

      const owned = state.inventory[key] || 0;
      div.innerHTML = `
        <div class="shop-item-info">
          <div class="item-name">${crop.icon} ${crop.name} Seeds</div>
          <div class="item-desc">Grows in ${crop.growTime}min · Owned: ${owned}</div>
        </div>
        <div style="display:flex;align-items:center;">
          <span class="shop-item-price">${crop.seedCost}g</span>
          <button class="shop-btn-buy" data-key="${key}">Buy</button>
        </div>
      `;

      div.querySelector('.shop-btn-buy').addEventListener('click', () => {
        this._buy(key, crop.seedCost);
      });

      this._items.appendChild(div);
    }
  }

  _renderSell(state) {
    let hasAnything = false;

    for (const [key, crop] of Object.entries(CROPS)) {
      const count = state.inventory[key] || 0;
      // Only show harvested crops (they are in inventory after harvest with same key)
      // We track seeds separately — seeds are bought, harvests are returned with same key
      // Check if this item was harvested (growthStage logic handled in main.js)
      if (count <= 0) continue;
      hasAnything = true;

      const div = document.createElement('div');
      div.className = 'shop-item';
      div.innerHTML = `
        <div class="shop-item-info">
          <div class="item-name">${crop.icon} ${crop.name}</div>
          <div class="item-desc">In bag: ${count} · Each: ${crop.sellPrice}g</div>
        </div>
        <div style="display:flex;align-items:center;">
          <span class="shop-item-price">${crop.sellPrice}g</span>
          <button class="shop-btn-sell" data-key="${key}">Sell All</button>
        </div>
      `;

      div.querySelector('.shop-btn-sell').addEventListener('click', () => {
        this._sellAll(key, crop.sellPrice, count);
      });

      this._items.appendChild(div);
    }

    if (!hasAnything) {
      this._items.innerHTML = '<div style="color:#888;text-align:center;padding:20px;">Nothing to sell yet — harvest your crops first!</div>';
    }
  }

  _buy(key, cost) {
    const state = gameState.get();
    if (state.money < cost) { showToast("Not enough gold! 💸"); return; }
    const inv = { ...state.inventory };
    inv[key] = (inv[key] || 0) + 1;
    gameState.set({ money: state.money - cost, inventory: inv });
    showToast(`Bought ${CROPS[key].name} seed! 🌱`);
    this._render();
  }

  _sellAll(key, price, count) {
    const state = gameState.get();
    const earned = price * count;
    const inv = { ...state.inventory };
    inv[key] = 0;
    gameState.set({ money: state.money + earned, inventory: inv });
    showToast(`Sold ${count}× ${CROPS[key].name} for ${earned}g! 💰`);
    this._render();
  }
}
