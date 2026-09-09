/**
 * 投射物（预留扩展）
 */
function createProjectile(x, y, vx, vy, opts) {
  opts = opts || {};
  return {
    x, y, vx, vy,
    life: opts.life || 1.5,
    damage: opts.damage || 10,
    color: opts.color || '#f1c40f',
    r: opts.r || 3,
    dead: false,
    update(dt) {
      this.x += this.vx * dt;
      this.y += this.vy * dt;
      this.life -= dt;
      if (this.life <= 0) this.dead = true;
    },
    draw(ctx, cam) {
      if (this.dead) return;
      const sp = cam.worldToScreen(this.x, this.y);
      ctx.save();
      ctx.fillStyle = this.color;
      ctx.beginPath();
      ctx.arc(sp.x, sp.y, this.r, 0, Math.PI * 2);
      ctx.fill();
      ctx.restore();
    }
  };
}

module.exports = { createProjectile };
