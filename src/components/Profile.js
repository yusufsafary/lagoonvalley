// ═══════════════════════════════════════════════════════
// PROFILE — localStorage-based user profile & auth system
// ═══════════════════════════════════════════════════════
import { gameState } from '../store/gameState.js';

const STORAGE_KEY  = 'lagoonvalley_profile';
const AVATARS = ['👨‍🌾','👩‍🌾','🧑‍🌾','🌾','🌴','🐠','🦜','🐚','🦀','🐬'];

class ProfileManager {
  constructor() {
    this._profile = this._load();
    this._modal   = null;
    this._onReady = null;
  }

  _load() {
    try {
      const raw = localStorage.getItem(STORAGE_KEY);
      return raw ? JSON.parse(raw) : null;
    } catch (_) { return null; }
  }

  _save(profile) {
    try { localStorage.setItem(STORAGE_KEY, JSON.stringify(profile)); } catch (_) {}
  }

  isLoggedIn() { return !!this._profile; }
  get()        { return this._profile; }

  /** Show login modal; resolves when user submits */
  showLoginModal(onReady) {
    this._onReady = onReady;
    document.getElementById('profile-modal').style.display = 'flex';
    this._setupModalUI();
  }

  _setupModalUI() {
    // Render avatar options
    const grid = document.getElementById('avatar-grid');
    grid.innerHTML = '';
    let selectedAvatar = AVATARS[0];

    AVATARS.forEach((av, i) => {
      const btn = document.createElement('button');
      btn.className = 'av-btn' + (i === 0 ? ' av-selected' : '');
      btn.textContent = av;
      btn.addEventListener('click', () => {
        selectedAvatar = av;
        document.querySelectorAll('.av-btn').forEach(b => b.classList.remove('av-selected'));
        btn.classList.add('av-selected');
      });
      grid.appendChild(btn);
    });

    document.getElementById('profile-submit').addEventListener('click', () => {
      const name = (document.getElementById('profile-name').value || '').trim();
      if (!name) { document.getElementById('profile-name').focus(); return; }
      this._createProfile(name, selectedAvatar);
    }, { once: true });

    document.getElementById('profile-name').addEventListener('keydown', e => {
      if (e.key === 'Enter') document.getElementById('profile-submit').click();
    });
  }

  _createProfile(name, avatar) {
    this._profile = {
      name,
      avatar,
      createdAt:   Date.now(),
      sessions:    1,
      lastSession: Date.now(),
    };
    this._save(this._profile);
    document.getElementById('profile-modal').style.display = 'none';
    this._updateHUDBadge();
    if (this._onReady) this._onReady();
  }

  incrementSession() {
    if (!this._profile) return;
    const now = Date.now();
    const daysSinceLast = (now - (this._profile.lastSession || now)) / 86400000;
    if (daysSinceLast > 0.1) this._profile.sessions++;
    this._profile.lastSession = now;
    this._save(this._profile);
  }

  logout() {
    this._profile = null;
    try { localStorage.removeItem(STORAGE_KEY); } catch (_) {}
    location.reload();
  }

  _updateHUDBadge() {
    const badge = document.getElementById('profile-badge');
    if (!badge || !this._profile) return;
    badge.innerHTML = `<span class="pb-av">${this._profile.avatar}</span><span class="pb-name">${this._profile.name}</span>`;
    badge.style.display = 'flex';
  }

  updateDashboard() {
    if (!this._profile) return;
    const state  = gameState.get();
    const el     = document.getElementById('profile-dashboard');
    if (!el) return;

    const joined = new Date(this._profile.createdAt).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });

    el.innerHTML = `
      <div class="pd-header">
        <span class="pd-avatar">${this._profile.avatar}</span>
        <div>
          <div class="pd-name">${this._profile.name}</div>
          <div class="pd-sub">Farmer · Joined ${joined}</div>
        </div>
      </div>
      <div class="pd-stats">
        <div class="pd-stat"><span class="pd-val">💰${state.money}g</span><span class="pd-key">Gold</span></div>
        <div class="pd-stat"><span class="pd-val">📅 Day ${state.day}</span><span class="pd-key">In-game day</span></div>
        <div class="pd-stat"><span class="pd-val">🌾 ${state.plots.filter(p=>p.cropType).length}</span><span class="pd-key">Plots planted</span></div>
        <div class="pd-stat"><span class="pd-val">🎮 ${this._profile.sessions}</span><span class="pd-key">Sessions</span></div>
      </div>
    `;
  }

  init(onReady) {
    this._updateHUDBadge();
    if (!this.isLoggedIn()) {
      this.showLoginModal(onReady);
    } else {
      this.incrementSession();
      this._updateHUDBadge();
      onReady();
    }
  }
}

export const profile = new ProfileManager();
