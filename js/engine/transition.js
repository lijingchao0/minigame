/**
 * 区域过渡 — 淡入淡出切图
 */
function createTransition() {
  return {
    active: false,
    phase: 'idle', // out | hold | in | idle
    t: 0,
    duration: 0.35,
    holdDur: 0.12,
    alpha: 0,
    onMid: null,
    onDone: null,
    color: '#0a0806',

    start(onMid, onDone, opts) {
      opts = opts || {};
      this.active = true;
      this.phase = 'out';
      this.t = 0;
      this.duration = opts.duration || 0.35;
      this.holdDur = opts.hold || 0.12;
      this.onMid = onMid || null;
      this.onDone = onDone || null;
      this.color = opts.color || '#0a0806';
      this._midDone = false;
    },

    update(dt) {
      if (!this.active) return;
      this.t += dt;
      if (this.phase === 'out') {
        this.alpha = Math.min(1, this.t / this.duration);
        if (this.t >= this.duration) {
          this.phase = 'hold';
          this.t = 0;
          this.alpha = 1;
          if (!this._midDone && this.onMid) {
            this._midDone = true;
            this.onMid();
          }
        }
      } else if (this.phase === 'hold') {
        this.alpha = 1;
        if (this.t >= this.holdDur) {
          this.phase = 'in';
          this.t = 0;
        }
      } else if (this.phase === 'in') {
        this.alpha = 1 - Math.min(1, this.t / this.duration);
        if (this.t >= this.duration) {
          this.active = false;
          this.phase = 'idle';
          this.alpha = 0;
          if (this.onDone) this.onDone();
        }
      }
    },

    draw(ctx, w, h) {
      if (!this.active && this.alpha <= 0) return;
      ctx.save();
      ctx.globalAlpha = this.alpha;
      ctx.fillStyle = this.color;
      ctx.fillRect(0, 0, w, h);
      ctx.restore();
    },

    blocking() {
      return this.active && this.phase !== 'in';
    }
  };
}

module.exports = { createTransition };
