/**
 * 玩家实体 — 蚂蚁修仙者（精灵部件 + 饥荒式短前摇攻击）
 */
const { clamp } = require('../pix.js');
const { ITEM_DEFS } = require('./item.js');
const { animFrame, drawAntSprite, drawSwingArc } = require('./sprite.js');

function createPlayer(x, y) {
  return {
    x, y,
    w: 16,
    h: 16,
    vx: 0,
    vy: 0,
    speed: 72,
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
    attackState: 'idle', // idle | windup | swing | recover
    attackTimer: 0,
    swingProgress: 0,
    invuln: 0,
    flash: 0,
    shake: 0,
    buffs: {},
    interactRange: 28,
    dead: false,
    deadT: 0,
    blinkT: 0,
    getEquip: null,

    getCenter() {
      return { x: this.x + this.w / 2, y: this.y + this.h / 2 };
    },

    getSpeed() {
      let s = this.speed;
      if (this._rootSpeedMul) s *= this._rootSpeedMul;
      if (this.buffs.lingbu > 0) s *= 1.55;
      // 攻击收招略减速
      if (this.attackState === 'swing' || this.attackState === 'recover') s *= 0.72;
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
      if (this.shake > 0) this.shake -= dt;
      this.blinkT -= dt;
      if (this.blinkT < -2.5 - Math.random()) this.blinkT = 0.12;

      for (const k of Object.keys(this.buffs)) {
        this.buffs[k] -= dt;
        if (this.buffs[k] <= 0) delete this.buffs[k];
      }
      const regen = 4 * (this._mpRegenMul || 1);
      this.mp = Math.min(this.maxMp, this.mp + regen * dt);

      this.moving = moveVec.active;
      if (moveVec.active) {
        const sp = this.getSpeed();
        this.vx = moveVec.x * sp;
        this.vy = moveVec.y * sp;
        // 挥击中保持面向
        if (this.attackState !== 'swing' && this.attackState !== 'windup') {
          if (Math.abs(moveVec.x) > Math.abs(moveVec.y)) {
            this.dir = moveVec.x > 0 ? 'right' : 'left';
          } else {
            this.dir = moveVec.y > 0 ? 'down' : 'up';
          }
        }
        this.animT += dt * 9;
      } else {
        this.vx = 0;
        this.vy = 0;
        this.animT += dt * 2;
      }

      const nx = this.x + this.vx * dt;
      const ny = this.y + this.vy * dt;
      if (!this._collides(map, nx, this.y)) this.x = nx;
      if (!this._collides(map, this.x, ny)) this.y = ny;

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
      this.invuln = 0.55;
      this.flash = 0.22;
      this.shake = 0.28;
      // 受击取消攻击前摇
      if (this.attackState === 'windup') {
        this.attackState = 'idle';
        this.swingProgress = 0;
      }
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

    _equipLooks() {
      const eq = this.getEquip ? this.getEquip() : null;
      if (!eq) return { neck: null, armor: null, weapon: null };
      return {
        neck: eq.neck && ITEM_DEFS[eq.neck] ? ITEM_DEFS[eq.neck].look : null,
        armor: eq.armor && ITEM_DEFS[eq.armor] ? ITEM_DEFS[eq.armor].look : null,
        weapon: eq.weapon && ITEM_DEFS[eq.weapon] ? ITEM_DEFS[eq.weapon].look : null
      };
    },

    draw(ctx, cam, time) {
      const c = this.getCenter();
      const sp = cam.worldToScreen(c.x, c.y);
      if (!cam.inView(c.x, c.y, 36)) return;
      const look = this._equipLooks();
      let shakeX = 0;
      if (this.shake > 0) shakeX = Math.sin(this.shake * 60) * 2.8;

      ctx.save();
      ctx.translate(sp.x + shakeX, sp.y);

      if (this.flash > 0 && Math.floor(this.flash * 20) % 2 === 0) {
        ctx.globalAlpha = 0.55;
      }
      if (this.buffs.jiaqiao > 0) {
        ctx.strokeStyle = 'rgba(180,180,220,0.75)';
        ctx.lineWidth = 2.5;
        ctx.beginPath();
        ctx.arc(0, -2, 16, 0, Math.PI * 2);
        ctx.stroke();
      }
      if (this.buffs.lingbu > 0) {
        ctx.fillStyle = 'rgba(100,200,255,0.22)';
        ctx.beginPath();
        ctx.arc(0, 0, 18, 0, Math.PI * 2);
        ctx.fill();
      }

      // 挥击弧线可视化
      if (this.attackState === 'swing' || (this.attackState === 'windup' && this.swingProgress > 0.05)) {
        drawSwingArc(ctx, this.dir, Math.max(0.15, this.swingProgress), 30, 'rgba(255,230,150,0.9)');
      }

      let pose = 'idle';
      if (this.dead) pose = 'die';
      else if (this.attackState === 'windup') pose = 'windup';
      else if (this.attackState === 'swing') pose = 'attack';
      else if (this.flash > 0.1) pose = 'hurt';
      else if (this.moving) pose = 'walk';

      const colors = {
        abdomenDark: '#1a1008',
        abdomenLight: '#3a2814',
        thoraxDark: '#2a1a0c',
        thoraxLight: '#4a3020',
        headDark: '#2a1a0c',
        headLight: '#5a3a24',
        accent: '#d4a017'
      };
      if (look.armor) {
        colors.abdomenDark = look.armor.dark || colors.abdomenDark;
        colors.abdomenLight = look.armor.light || colors.abdomenLight;
        colors.thoraxDark = look.armor.dark || colors.thoraxDark;
        colors.thoraxLight = look.armor.light || colors.thoraxLight;
      }

      const jawOpen = this.attackState === 'swing' ? 1 : (this.attackState === 'windup' ? 0.4 : 0);
      drawAntSprite(ctx, {
        scale: 1.42,
        colors,
        dir: this.dir,
        pose,
        frame: animFrame(this.animT, 8, 4),
        breath: Math.sin(time * 2.4),
        bob: this.moving ? Math.sin(this.animT) * 1.6 : Math.sin(time * 2) * 0.55,
        jawOpen,
        blink: this.blinkT > 0 && this.blinkT < 0.12,
        dead: this.dead,
        deadT: this.deadT,
        flash: this.flash > 0 && Math.floor(this.flash * 18) % 2 === 0,
        glowEyes: true,
        animT: this.animT,
        equip: {
          neck: look.neck,
          armor: look.armor,
          weapon: look.weapon
        }
      });

      ctx.restore();
    }
  };
}

module.exports = { createPlayer };
