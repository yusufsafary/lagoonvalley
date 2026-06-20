// ═══════════════════════════════════════════════════════
// DIALOGUE BOX — shows NPC speech with tap-to-close
// ═══════════════════════════════════════════════════════

export class DialogueBox {
  constructor() {
    this._box   = document.getElementById('dialogue-box');
    this._text  = document.getElementById('dialogue-text');
    this._name  = document.getElementById('npc-name');
    this._close = document.getElementById('dialogue-close');

    this._closeCallback = null;

    this._close.addEventListener('click',     () => this.hide());
    this._close.addEventListener('touchend',  e  => { e.preventDefault(); this.hide(); });
  }

  show(npcName, text, onClose) {
    this._name.textContent  = npcName;
    this._text.textContent  = text;
    this._box.style.display = 'block';
    this._closeCallback     = onClose;
  }

  hide() {
    this._box.style.display = 'none';
    if (this._closeCallback) { this._closeCallback(); this._closeCallback = null; }
  }

  isVisible() { return this._box.style.display !== 'none'; }
}
