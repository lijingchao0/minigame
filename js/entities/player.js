/**
 * 玩家实体 — 蚂蚁修仙者
 */
const { TILE, drawShadow, clamp } = require('../pix.js');

const DIRS = ['down', 'left', 'right', 'up'];

function createPlayer(x, y) {
  return {
    x, y,
    w: 12,
    h: 12,
    vx: 0,
    vy: 0,
    speed: 70,
    dir: 'down',
    animT: 0,
    moving: false,
    // 战斗
    hp: 100,
    maxHp: 100,
    mp: 50,
    maxMp: 50,
    atk: 12,
    def: 3,
    attackCd: 0,
    invuln: 0,
    flash: 0,
    // 技能状态
    buffs: {}, // {lingbu: t, jiaqiao: t, ...}
    // 交互
    interactRange: 28,
    dead: false,
    deadT: 0,

    getCenter() {
      return { x: this.x + this.w / 2, y: this.y + this.h / 2 };
    },

    getSpeed() {
      let s = this.speed;
      if (this._rootSpeedMul) s *= this._rootSpeedMul;
      if (this.buffs.lingbu > 0) s *= 1.55;
      return s;
    },

    isInvincible() {
      return this.invuln > 0 || (this.buffs.jiaqiao > 0);
    },

    update(dt, moveVec, map) {
      if (this.dead) {
        this.deadT += dt;
        return;
      }
      if (this.attackCd > 0) this.attackCd -= dt;
      if (this.invuln > 0) this.invuln -= dt;
      if (this.flash > 0) this.flash -= dt;
      // buff 计时
      for (const k of Object.keys(this.buffs)) {
        this.buffs[k] -= dt;
        if (this.buffs[k] <= 0) delete this.buffs[k];
      }
      // 灵力缓慢回复
      const regen = 4 * (this._mpRegenMul || 1);
      this.mp = Math.min(this.maxMp, this.mp + regen * dt);

      this.moving = moveVec.active;
      if (moveVec.active) {
        const sp = this.getSpeed();
        this.vx = moveVec.x * sp;
        this.vy = moveVec.y * sp;
        if (Math.abs(moveVec.x) > Math.abs(moveVec.y)) {
          this.dir = moveVec.x > 0 ? 'right' : 'left';
        } else {
          this.dir = moveVec.y > 0 ? 'down' : 'up';
        }
        this.animT += dt * 8;
      } else {
        this.vx = 0;
        this.vy = 0;
      }

      // 碰撞分离轴
      const nx = this.x + this.vx * dt;
      const ny = this.y + this.vy * dt;
      if (!this._collides(map, nx, this.y)) this.x = nx;
      if (!this._collides(map, this.x, ny)) this.y = ny;

      // 边界
      this.x = clamp(this.x, 0, map.pixelW() - this.w);
      this.y = clamp(this.y, 0, map.pixelH() - this.h);
    },

    _collides(map, x, y) {
      const points = [
        [x + 2, y + 2],
        [x + this.w - 2, y + 2],
        [x + 2, y + this.h - 2],
        [x + this.w - 2, y + this.h - 2]
      ];
      for (let i = 0; i < points.length; i++) {
        if (map.isSolidAt(points[i][0], points[i][1])) return true;
      }
      return false;
    },

    takeDamage(amount) {
      if (this.dead || this.isInvincible()) return 0;
      const dmg = Math.max(1, amount - this.def - (this._rootDefBonus || 0));
      this.hp -= dmg;
      this.invuln = 0.6;
      this.flash = 0.2;
      if (this.hp <= 0) {
        this.hp = 0;
        this.dead = true;
        this.deadT = 0;
      }
      return dmg;
    },

    heal(amount) {
      this.hp = Math.min(this.maxHp, this.hp + amount);
    },

    draw(ctx, cam, time) {
      const c = this.getCenter();
      const sp = cam.worldToScreen(c.x, c.y);
      if (!cam.inView(c.x, c.y, 20)) return;

      ctx.save();
      if (this.flash > 0 && Math.floor(this.flash * 20) % 2 === 0) {
        ctx.globalAlpha = 0.5;
      }
      if (this.buffs.jiaqiao > 0) {
        ctx.strokeStyle = 'rgba(180,180,220,0.7)';
        ctx.lineWidth = 2;
        ctx.beginPath();
        ctx.arc(sp.x, sp.y - 2, 12, 0, Math.PI * 2);
        ctx.stroke();
      }
      if (this.buffs.lingbu > 0) {
        ctx.fillStyle = 'rgba(100,200,255,0.2)';
        ctx.beginPath();
        ctx.arc(sp.x, sp.y, 14, 0, Math.PI * 2);
        ctx.fill();
      }

      drawShadow(ctx, sp.x, sp.y + 6, 7, 3);

      // 身体（工蚁像素）
      const bob = this.moving ? Math.sin(this.animT) * 1.5 : Math.sin(time * 2) * 0.5;
      const breath = Math.sin(time * 2.5) * 0.5;

      // 腹
      ctx.fillStyle = '#2a1a0a';
      ctx.beginPath();
      ctx.ellipse(sp.x, sp.y + 3 + bob, 5, 4 + breath * 0.3, 0, 0, Math.PI * 2);
      ctx.fill();
      // 金纹（灵智）
      ctx.fillStyle = '#d4a017';
      ctx.fillRect(sp.x - 2, sp.y + 1 + bob, 4, 2);

      // 胸
      ctx.fillStyle = '#3d2814';
      ctx.beginPath();
      ctx.ellipse(sp.x, sp.y - 2 + bob, 4, 3.5, 0, 0, Math.PI * 2);
      ctx.fill();

      // 头
      ctx.fillStyle = '#4a3020';
      ctx.beginPath();
      ctx.ellipse(sp.x, sp.y - 8 + bob, 4.5, 4, 0, 0, Math.PI * 2);
      ctx.fill();

      // 触角
      ctx.strokeStyle = '#2a1a0a';
      ctx.lineWidth = 1.2;
      ctx.beginPath();
      const antOff = this.dir === 'left' ? -1 : this.dir === 'right' ? 1 : 0;
      ctx.moveTo(sp.x - 2, sp.y - 10 + bob);
      ctx.quadraticCurveTo(sp.x - 5 + antOff, sp.y - 16 + bob, sp.x - 3, sp.y - 18 + bob);
      ctx.moveTo(sp.x + 2, sp.y - 10 + bob);
      ctx.quadraticCurveTo(sp.x + 5 + antOff, sp.y - 16 + bob, sp.x + 3, sp.y - 18 + bob);
      ctx.stroke();
      ctx.fillStyle = '#d4a017';
      ctx.beginPath();
      ctx.arc(sp.x - 3, sp.y - 18 + bob, 1.5, 0, Math.PI * 2);
      ctx.arc(sp.x + 3, sp.y - 18 + bob, 1.5, 0, Math.PI * 2);
      ctx.fill();

      // 眼睛
      ctx.fillStyle = '#f1c40f';
      if (this.dir === 'left') {
        ctx.fillRect(sp.x - 3, sp.y - 9 + bob, 2, 2);
      } else if (this.dir === 'right') {
        ctx.fillRect(sp.x + 1, sp.y - 9 + bob, 2, 2);
      } else {
        ctx.fillRect(sp.x - 2, sp.y - 9 + bob, 2, 2);
        ctx.fillRect(sp.x + 1, sp.y - 9 + bob, 2, 2);
      }

      // 腿（简化）
      ctx.strokeStyle = '#1a1008';
      ctx.lineWidth = 1;
      const legSwing = this.moving ? Math.sin(this.animT) * 3 : 0;
      ctx.beginPath();
      ctx.moveTo(sp.x - 4, sp.y + bob); ctx.lineTo(sp.x - 8, sp.y + 5 + legSwing);
      ctx.moveTo(sp.x + 4, sp.y + bob); ctx.lineTo(sp.x + 8, sp.y + 5 - legSwing);
      ctx.moveTo(sp.x - 3, sp.y + 2 + bob); ctx.lineTo(sp.x - 7, sp.y + 7 - legSwing);
      ctx.moveTo(sp.x + 3, sp.y + 2 + bob); ctx.lineTo(sp.x + 7, sp.y + 7 + legSwing);
      ctx.stroke();

      ctx.restore();
    }
  };
}

module.exports = { createPlayer };
