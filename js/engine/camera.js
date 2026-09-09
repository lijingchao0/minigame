/**
 * 摄像机 — 平滑跟随 + 边界 clamp + 震动
 */
const { lerp, clamp } = require('../pix.js');

function createCamera() {
  return {
    x: 0,
    y: 0,
    targetX: 0,
    targetY: 0,
    shakeT: 0,
    shakeMag: 0,
    viewW: 0,
    viewH: 0,
    worldW: 0,
    worldH: 0,
    smooth: 8,

    setView(vw, vh) {
      this.viewW = vw;
      this.viewH = vh;
    },

    setWorld(ww, wh) {
      this.worldW = ww;
      this.worldH = wh;
      this._clamp();
    },

    follow(tx, ty, immediate) {
      this.targetX = tx - this.viewW / 2;
      this.targetY = ty - this.viewH / 2;
      if (immediate) {
        this.x = this.targetX;
        this.y = this.targetY;
        this._clamp();
      }
    },

    shake(mag, dur) {
      this.shakeMag = Math.max(this.shakeMag, mag);
      this.shakeT = Math.max(this.shakeT, dur);
    },

    update(dt) {
      this.x = lerp(this.x, this.targetX, Math.min(1, this.smooth * dt));
      this.y = lerp(this.y, this.targetY, Math.min(1, this.smooth * dt));
      this._clamp();
      if (this.shakeT > 0) {
        this.shakeT -= dt;
        if (this.shakeT <= 0) this.shakeMag = 0;
      }
    },

    _clamp() {
      const maxX = Math.max(0, this.worldW - this.viewW);
      const maxY = Math.max(0, this.worldH - this.viewH);
      this.x = clamp(this.x, 0, maxX);
      this.y = clamp(this.y, 0, maxY);
      this.targetX = clamp(this.targetX, 0, maxX);
      this.targetY = clamp(this.targetY, 0, maxY);
    },

    /** 实际绘制偏移（含震动） */
    getOffset() {
      let ox = this.x;
      let oy = this.y;
      if (this.shakeT > 0 && this.shakeMag > 0) {
        ox += (Math.random() - 0.5) * 2 * this.shakeMag;
        oy += (Math.random() - 0.5) * 2 * this.shakeMag;
      }
      return { x: ox, y: oy };
    },

    /** 世界坐标是否在视锥内（带边距） */
    inView(wx, wy, margin) {
      margin = margin || 32;
      const o = this.getOffset();
      return wx > o.x - margin && wx < o.x + this.viewW + margin &&
             wy > o.y - margin && wy < o.y + this.viewH + margin;
    },

    worldToScreen(wx, wy) {
      const o = this.getOffset();
      return { x: wx - o.x, y: wy - o.y };
    },

    screenToWorld(sx, sy) {
      const o = this.getOffset();
      return { x: sx + o.x, y: sy + o.y };
    }
  };
}

module.exports = { createCamera };
