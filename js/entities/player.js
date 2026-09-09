/**
 * 玩家实体 — 蚂蚁修仙者（立体像素 + 装备外观）
 */
const { drawShadow, clamp } = require('../pix.js');
const { ITEM_DEFS } = require('./item.js');

function createPlayer(x, y) {
  return {
    x, y,
    w: 14,
    h: 14,
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
    shake: 0,
    // 技能状态
    buffs: {}, // {lingbu: t, jiaqiao: t, ...}
    // 交互
    interactRange: 28,
    dead: false,
    deadT: 0,
    /** 外部注入：() => inventory.state.equip */
    getEquip: null,

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
      if (this.shake > 0) this.shake -= dt;
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
      this.shake = 0.25;
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
      if (!cam.inView(c.x, c.y, 24)) return;
      const scale = 1.15;
      const look = this._equipLooks();
      let shakeX = 0;
      if (this.shake > 0) shakeX = Math.sin(this.shake * 60) * 2.5;

      ctx.save();
      ctx.translate(sp.x + shakeX, sp.y);
      ctx.scale(scale, scale);

      if (this.flash > 0 && Math.floor(this.flash * 20) % 2 === 0) {
        ctx.globalAlpha = 0.55;
      }
      if (this.buffs.jiaqiao > 0) {
        ctx.strokeStyle = 'rgba(180,180,220,0.75)';
        ctx.lineWidth = 2.5;
        ctx.beginPath();
        ctx.arc(0, -2, 13, 0, Math.PI * 2);
        ctx.stroke();
      }
      if (this.buffs.lingbu > 0) {
        ctx.fillStyle = 'rgba(100,200,255,0.22)';
        ctx.beginPath();
        ctx.arc(0, 0, 15, 0, Math.PI * 2);
        ctx.fill();
      }

      // 投影
      drawShadow(ctx, 0, 7, 9, 3.5);

      const bob = this.moving ? Math.sin(this.animT) * 1.5 : Math.sin(time * 2) * 0.5;
      const breath = Math.sin(time * 2.5) * 0.5;

      // 躯干基色（护甲可覆盖）
      let abdomenDark = '#1a1008';
      let abdomenLight = '#3a2814';
      let thoraxDark = '#2a1a0c';
      let thoraxLight = '#4a3020';
      let headDark = '#2a1a0c';
      let headLight = '#5a3a24';
      if (look.armor) {
        abdomenDark = look.armor.dark || abdomenDark;
        abdomenLight = look.armor.light || abdomenLight;
        thoraxDark = look.armor.dark || thoraxDark;
        thoraxLight = look.armor.light || thoraxLight;
      }

      // 腹：暗底 + 亮顶
      ctx.fillStyle = abdomenDark;
      ctx.beginPath();
      ctx.ellipse(0, 3 + bob, 5.5, 4.5 + breath * 0.3, 0, 0, Math.PI * 2);
      ctx.fill();
      ctx.fillStyle = abdomenLight;
      ctx.beginPath();
      ctx.ellipse(0, 1.5 + bob, 4, 2.2, 0, 0, Math.PI * 2);
      ctx.fill();
      // 金纹（灵智）
      ctx.fillStyle = '#d4a017';
      ctx.fillRect(-2, 1 + bob, 4, 2);

      // 胸
      ctx.fillStyle = thoraxDark;
      ctx.beginPath();
      ctx.ellipse(0, -2 + bob, 4.5, 4, 0, 0, Math.PI * 2);
      ctx.fill();
      ctx.fillStyle = thoraxLight;
      ctx.beginPath();
      ctx.ellipse(-0.5, -3.5 + bob, 3, 2, 0, 0, Math.PI * 2);
      ctx.fill();

      // 甲壳纹理叠加
      if (look.armor && look.armor.shell) {
        ctx.strokeStyle = look.armor.shell;
        ctx.lineWidth = 1.2;
        ctx.beginPath();
        ctx.arc(0, -1 + bob, 4, 0.2, Math.PI - 0.2);
        ctx.stroke();
        if (look.armor.plates) {
          ctx.fillStyle = look.armor.plates;
          ctx.fillRect(-3, -3 + bob, 6, 2);
        }
      }

      // 头
      ctx.fillStyle = headDark;
      ctx.beginPath();
      ctx.ellipse(0, -8 + bob, 5, 4.5, 0, 0, Math.PI * 2);
      ctx.fill();
      ctx.fillStyle = headLight;
      ctx.beginPath();
      ctx.ellipse(-0.5, -9.5 + bob, 3.5, 2.2, 0, 0, Math.PI * 2);
      ctx.fill();

      // 项链饰品
      if (look.neck) {
        ctx.strokeStyle = look.neck.chain || '#27ae60';
        ctx.lineWidth = 1.5;
        ctx.beginPath();
        ctx.arc(0, -5 + bob, 4.5, 0.15, Math.PI - 0.15);
        ctx.stroke();
        ctx.fillStyle = look.neck.gem || '#2ecc71';
        ctx.beginPath();
        ctx.ellipse(0, -1 + bob, look.neck.w || 2.5, look.neck.h || 3, 0, 0, Math.PI * 2);
        ctx.fill();
        if (look.neck.leaf) {
          ctx.fillStyle = look.neck.leaf;
          ctx.beginPath();
          ctx.ellipse(-3, -2 + bob, 2, 3, -0.4, 0, Math.PI * 2);
          ctx.ellipse(3, -2 + bob, 2, 3, 0.4, 0, Math.PI * 2);
          ctx.fill();
        }
      }

      // 触角
      ctx.strokeStyle = '#1a1008';
      ctx.lineWidth = 1.4;
      ctx.beginPath();
      const antOff = this.dir === 'left' ? -1 : this.dir === 'right' ? 1 : 0;
      ctx.moveTo(-2, -10 + bob);
      ctx.quadraticCurveTo(-5 + antOff, -16 + bob, -3, -18 + bob);
      ctx.moveTo(2, -10 + bob);
      ctx.quadraticCurveTo(5 + antOff, -16 + bob, 3, -18 + bob);
      ctx.stroke();
      ctx.fillStyle = '#d4a017';
      ctx.beginPath();
      ctx.arc(-3, -18 + bob, 1.6, 0, Math.PI * 2);
      ctx.arc(3, -18 + bob, 1.6, 0, Math.PI * 2);
      ctx.fill();

      // 眼睛
      ctx.fillStyle = '#f1c40f';
      if (this.dir === 'left') {
        ctx.fillRect(-3.5, -9 + bob, 2.2, 2.2);
      } else if (this.dir === 'right') {
        ctx.fillRect(1.2, -9 + bob, 2.2, 2.2);
      } else {
        ctx.fillRect(-2.5, -9 + bob, 2.2, 2.2);
        ctx.fillRect(1, -9 + bob, 2.2, 2.2);
      }

      // 武器持物
      if (look.weapon) {
        const handX = this.dir === 'left' ? -8 : 8;
        ctx.strokeStyle = look.weapon.shaft || '#6b4420';
        ctx.lineWidth = 2;
        ctx.beginPath();
        ctx.moveTo(handX * 0.4, -1 + bob);
        ctx.lineTo(handX, 2 + bob);
        ctx.stroke();
        ctx.fillStyle = look.weapon.tip || '#95a5a6';
        ctx.beginPath();
        ctx.moveTo(handX, 0 + bob);
        ctx.lineTo(handX + (this.dir === 'left' ? -4 : 4), 3 + bob);
        ctx.lineTo(handX, 5 + bob);
        ctx.fill();
      }

      // 腿
      ctx.strokeStyle = '#1a1008';
      ctx.lineWidth = 1.2;
      const legSwing = this.moving ? Math.sin(this.animT) * 3 : 0;
      ctx.beginPath();
      ctx.moveTo(-4, bob); ctx.lineTo(-8, 5 + legSwing);
      ctx.moveTo(4, bob); ctx.lineTo(8, 5 - legSwing);
      ctx.moveTo(-3, 2 + bob); ctx.lineTo(-7, 7 - legSwing);
      ctx.moveTo(3, 2 + bob); ctx.lineTo(7, 7 + legSwing);
      ctx.stroke();

      // 深色轮廓让角色弹出
      ctx.strokeStyle = 'rgba(10,6,2,0.55)';
      ctx.lineWidth = 1.2;
      ctx.beginPath();
      ctx.ellipse(0, 3 + bob, 5.7, 4.7, 0, 0, Math.PI * 2);
      ctx.stroke();
      ctx.beginPath();
      ctx.ellipse(0, -8 + bob, 5.2, 4.7, 0, 0, Math.PI * 2);
      ctx.stroke();

      ctx.restore();
    }
  };
}

module.exports = { createPlayer };
