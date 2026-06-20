// ═══════════════════════════════════════════════════════
// JOYSTICK — virtual thumbstick for mobile movement
// Returns dx/dz in [-1, 1] range each frame
// ═══════════════════════════════════════════════════════

export class Joystick {
  constructor() {
    this.zone  = document.getElementById('joystick-zone');
    this.base  = document.getElementById('joystick-base');
    this.stick = document.getElementById('joystick-stick');

    this.dx = 0;
    this.dz = 0;

    this._active    = false;
    this._touchId   = null;
    this._baseRect  = null;
    this._maxRadius = 36; // px max stick travel

    this._bind();
  }

  _bind() {
    this.zone.addEventListener('touchstart', e => this._onStart(e), { passive: false });
    document.addEventListener('touchmove',  e => this._onMove(e),  { passive: false });
    document.addEventListener('touchend',   e => this._onEnd(e),   { passive: false });

    // Mouse fallback for desktop testing
    this.zone.addEventListener('mousedown', e => this._onMouseStart(e));
    document.addEventListener('mousemove',  e => this._onMouseMove(e));
    document.addEventListener('mouseup',    ()  => this._reset());
  }

  _onStart(e) {
    e.preventDefault();
    const touch = e.changedTouches[0];
    this._touchId  = touch.identifier;
    this._active   = true;
    this._baseRect = this.base.getBoundingClientRect();
    this._updateFromTouch(touch.clientX, touch.clientY);
  }

  _onMove(e) {
    if (!this._active) return;
    e.preventDefault();
    for (const touch of e.changedTouches) {
      if (touch.identifier === this._touchId) {
        this._updateFromTouch(touch.clientX, touch.clientY);
        return;
      }
    }
  }

  _onEnd(e) {
    for (const touch of e.changedTouches) {
      if (touch.identifier === this._touchId) { this._reset(); return; }
    }
  }

  _onMouseStart(e) {
    this._active   = true;
    this._baseRect = this.base.getBoundingClientRect();
    this._updateFromTouch(e.clientX, e.clientY);
  }

  _onMouseMove(e) {
    if (!this._active) return;
    this._updateFromTouch(e.clientX, e.clientY);
  }

  _updateFromTouch(cx, cy) {
    const rect   = this._baseRect;
    const centerX = rect.left + rect.width  / 2;
    const centerY = rect.top  + rect.height / 2;

    let offX = cx - centerX;
    let offY = cy - centerY;
    const dist = Math.hypot(offX, offY);

    if (dist > this._maxRadius) {
      offX = (offX / dist) * this._maxRadius;
      offY = (offY / dist) * this._maxRadius;
    }

    this.dx = offX / this._maxRadius;
    this.dz = offY / this._maxRadius;

    this.stick.style.transform = `translate(calc(-50% + ${offX}px), calc(-50% + ${offY}px))`;
  }

  _reset() {
    this._active  = false;
    this._touchId = null;
    this.dx = 0;
    this.dz = 0;
    this.stick.style.transform = 'translate(-50%, -50%)';
  }
}
