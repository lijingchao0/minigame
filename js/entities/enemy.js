/**
 * 敌人实体 — 饥荒式战斗（前摇→挥击命中→硬直）+ 强化像素造型
 * 无接触伤害；可贴身绕圈；可走 A 风筝
 */
const { dist, drawBar } = require('../pix.js');
const { P } = require('../gfx/palette.js');
const { animFrame, drawWindupWarn } = require('./sprite.js');
const { drawEnemyPixel } = require('../gfx/sprites/creatures.js');

const ENEMY_DEFS = {
  spider: {
    name: '草蛛', hp: 40, atk: 8, def: 1, speed: 38, size: 1.35,
    color: '#4a3728', light: '#6d5340', dark: '#2c1e14',
    aggro: 95, leash: 150, attackRange: 22, windup: 0.65, recover: 0.45, attackCd: 1.35,
    xp: 15, nightBonus: 1.3, interruptible: true, preferDist: 18
  },
  wasp: {
    name: '毒蜂', hp: 30, atk: 10, def: 0, speed: 52, size: 1.25,
    color: '#f1c40f', light: '#f7dc6f', dark: '#b7950b',
    aggro: 100, leash: 160, attackRange: 20, windup: 0.55, recover: 0.4, attackCd: 1.15,
    xp: 18, nightBonus: 1.0, interruptible: true, preferDist: 28, ranged: true
  },
  anteater: {
    name: '食蚁兽', hp: 120, atk: 18, def: 4, speed: 26, size: 1.95,
    color: '#8b6914', light: '#b8956a', dark: '#5a4010',
    aggro: 85, leash: 140, attackRange: 28, windup: 0.8, recover: 0.55, attackCd: 1.9,
    xp: 50, nightBonus: 1.1, interruptible: false, preferDist: 22
  },
  shadow_scorpion: {
    name: '暗影蝎', hp: 80, atk: 14, def: 3, speed: 36, size: 1.55,
    color: '#2c1654', light: '#6c3483', dark: '#1a0a30',
    aggro: 110, leash: 170, attackRange: 24, windup: 0.7, recover: 0.48, attackCd: 1.4,
    xp: 35, nightBonus: 1.5, interruptible: true, preferDist: 20
  },
  heart_demon: {
    name: '心魔', hp: 200, atk: 22, def: 5, speed: 42, size: 1.75,
    color: '#8e0443', light: '#c0396b', dark: '#4a0222',
    aggro: 220, leash: 280, attackRange: 26, windup: 0.6, recover: 0.4, attackCd: 1.2,
    xp: 100, nightBonus: 1.0, interruptible: false, preferDist: 24
  }
};

function createEnemy(type, x, y) {
  const def = ENEMY_DEFS[type];
  if (!def) throw new Error('未知敌人: ' + type);
  return {
    type, def,
    x, y,
    w: 18 * def.size,
    h: 18 * def.size,
    hp: def.hp,
    maxHp: def.hp,
    // patrol | chase | windup | strike | recover | dead
    state: 'patrol',
    patrolOrigin: { x, y },
    patrolAngle: Math.random() * Math.PI * 2,
    animT: Math.random() * 10,
    attackTimer: 0,
    windupT: 0,
    windupMax: def.windup,
    recoverT: 0,
    strikeFacing: { x: 1, y: 0 },
    flash: 0,
    shake: 0,
    stunned: 0,
    dead: false,
    deadT: 0,
    nightMult: 1,
    sepId: Math.random(),

    getCenter() {
      return { x: this.x + this.w / 2, y: this.y + this.h / 2 };
    },

    /**
     * @returns {{ attacked?: boolean, damage?: number, projectile?: object }}
     */
    update(dt, player, map, isNight, allies) {
      if (this.dead) { this.deadT += dt; return {}; }
      this.animT += dt;
      if (this.flash > 0) this.flash -= dt;
      if (this.shake > 0) this.shake -= dt;
      if (this.stunned > 0) {
        this.stunned -= dt;
        // 受击硬直打断前摇
        if (this.state === 'windup') this.state = 'chase';
        return {};
      }
      if (this.attackTimer > 0) this.attackTimer -= dt;

      this.nightMult = isNight ? def.nightBonus : 1;
      const pc = player.getCenter();
      const ec = this.getCenter();
      const d = dist(ec.x, ec.y, pc.x, pc.y);
      const aggro = def.aggro * (isNight && type === 'shadow_scorpion' ? 1.3 : 1);
      const leash = def.leash || aggro * 1.5;
      const fromHome = dist(ec.x, ec.y, this.patrolOrigin.x, this.patrolOrigin.y);

      // —— 前摇：明显蓄力，不造成伤害 ——
      if (this.state === 'windup') {
        this.windupT -= dt;
        // 面向锁定玩家
        const dx = pc.x - ec.x;
        const dy = pc.y - ec.y;
        const len = Math.sqrt(dx * dx + dy * dy) || 1;
        this.strikeFacing = { x: dx / len, y: dy / len };
        if (this.windupT <= 0) {
          this.state = 'strike';
        }
        return {};
      }

      // —— 挥击瞬间：仅此刻结算伤害 ——
      if (this.state === 'strike') {
        this.state = 'recover';
        this.recoverT = def.recover;
        this.attackTimer = def.attackCd;
        // 远程毒蜂：发射可见弹道而非近战
        if (def.ranged) {
          return {
            attacked: false,
            projectile: {
              x: ec.x, y: ec.y,
              vx: this.strikeFacing.x * 110,
              vy: this.strikeFacing.y * 110,
              damage: Math.floor(def.atk * this.nightMult),
              life: 1.2,
              color: '#f1c40f',
              r: 4
            }
          };
        }
        // 近战：判定范围 = attackRange，玩家需在挥击扇形内
        const hitRange = def.attackRange + 4;
        if (!player.dead && d <= hitRange) {
          const dx = pc.x - ec.x;
          const dy = pc.y - ec.y;
          const len = Math.sqrt(dx * dx + dy * dy) || 1;
          const dot = (dx / len) * this.strikeFacing.x + (dy / len) * this.strikeFacing.y;
          if (dot > 0.25 || d < 14) {
            return { attacked: true, damage: Math.floor(def.atk * this.nightMult) };
          }
        }
        return {}; // 挥空
      }

      // —— 收招硬直 ——
      if (this.state === 'recover') {
        this.recoverT -= dt;
        if (this.recoverT <= 0) {
          this.state = (d < aggro && !player.dead) ? 'chase' : 'patrol';
        }
        return {};
      }

      // 离开仇恨 / 过远 → 回巡逻（不接触伤害）
      if (player.dead || d > aggro || fromHome > leash) {
        this.state = 'patrol';
        this._movePatrol(dt, map);
        this._separate(dt, allies, map);
        return {};
      }

      // 进入攻击距离且 CD 好 → 前摇
      if (d <= def.attackRange && this.attackTimer <= 0) {
        this.state = 'windup';
        this.windupMax = def.windup * (0.92 + Math.random() * 0.16);
        this.windupT = this.windupMax;
        return {};
      }

      // 追击（保持 preferDist，避免重叠贴死）
      this.state = 'chase';
      const prefer = def.preferDist || 18;
      const dx = pc.x - ec.x;
      const dy = pc.y - ec.y;
      const len = Math.sqrt(dx * dx + dy * dy) || 1;
      let sp = def.speed * (isNight ? 1.08 : 1);
      // 太近则侧向绕圈，便于玩家走 A
      let mx = dx / len;
      let my = dy / len;
      if (d < prefer - 4) {
        const bx = -mx * 0.35 + (-my) * 0.9;
        const by = -my * 0.35 + mx * 0.9;
        const ml = Math.sqrt(bx * bx + by * by) || 1;
        mx = bx / ml; my = by / ml;
      } else if (d > prefer + 8) {
        // 正常接近
      } else {
        // 环绕
        const ox = -my;
        const oy = mx;
        const side = this.sepId > 0.5 ? 1 : -1;
        const bx = mx * 0.2 + ox * side;
        const by = my * 0.2 + oy * side;
        const ml = Math.sqrt(bx * bx + by * by) || 1;
        mx = bx / ml; my = by / ml;
        sp *= 0.85;
      }
      const nx = this.x + mx * sp * dt;
      const ny = this.y + my * sp * dt;
      if (!map.isSolidAt(nx + this.w / 2, this.y + this.h / 2)) this.x = nx;
      if (!map.isSolidAt(this.x + this.w / 2, ny + this.h / 2)) this.y = ny;
      this._separate(dt, allies, map);
      return {};
    },

    _movePatrol(dt, map) {
      this.patrolAngle += (Math.random() - 0.5) * 2 * dt;
      const sp = def.speed * 0.38;
      const nx = this.x + Math.cos(this.patrolAngle) * sp * dt;
      const ny = this.y + Math.sin(this.patrolAngle) * sp * dt;
      if (dist(nx, ny, this.patrolOrigin.x, this.patrolOrigin.y) < 70) {
        if (!map.isSolidAt(nx + this.w / 2, this.y + this.h / 2)) this.x = nx;
        if (!map.isSolidAt(this.x + this.w / 2, ny + this.h / 2)) this.y = ny;
      } else {
        this.patrolAngle += Math.PI;
      }
    },

    /** 多敌分离，避免叠罗汉围殴 */
    _separate(dt, allies, map) {
      if (!allies || allies.length < 2) return;
      const ec = this.getCenter();
      let sx = 0, sy = 0, n = 0;
      const minD = 22 * def.size;
      for (let i = 0; i < allies.length; i++) {
        const o = allies[i];
        if (o === this || o.dead) continue;
        const oc = o.getCenter();
        const d = dist(ec.x, ec.y, oc.x, oc.y);
        if (d < minD && d > 0.1) {
          sx += (ec.x - oc.x) / d;
          sy += (ec.y - oc.y) / d;
          n++;
        }
      }
      if (!n) return;
      sx /= n; sy /= n;
      const nx = this.x + sx * 28 * dt;
      const ny = this.y + sy * 28 * dt;
      if (!map.isSolidAt(nx + this.w / 2, this.y + this.h / 2)) this.x = nx;
      if (!map.isSolidAt(this.x + this.w / 2, ny + this.h / 2)) this.y = ny;
    },

    takeDamage(amount, opts) {
      opts = opts || {};
      if (this.dead) return 0;
      const dmg = Math.max(1, amount - def.def);
      this.hp -= dmg;
      this.flash = 0.18;
      this.shake = 0.28;
      // 小怪可被打断前摇并进入硬直
      if (opts.interrupt && def.interruptible) {
        if (this.state === 'windup' || this.state === 'strike') {
          this.state = 'recover';
          this.recoverT = 0.35;
        }
        this.stunned = Math.max(this.stunned, 0.28);
      } else if (opts.interrupt && !def.interruptible) {
        // 精英仅短硬直，不取消已进入的 strike
        this.stunned = Math.max(this.stunned, 0.12);
      }
      if (opts.knockback && this.state !== 'strike') {
        // knock 由外部位移处理
      }
      if (this.hp <= 0) {
        this.hp = 0;
        this.dead = true;
        this.deadT = 0;
        this.state = 'dead';
      }
      return dmg;
    },

    draw(ctx, cam) {
      if (this.dead && this.deadT > 1.2) return;
      const c = this.getCenter();
      if (!cam.inView(c.x, c.y, 48)) return;
      const sp = cam.worldToScreen(c.x, c.y);
      const s = def.size;
      let alpha = 1;
      let fallY = 0;
      if (this.dead) {
        alpha = Math.max(0, 1 - this.deadT / 1.15);
        fallY = this.deadT * 8;
      }
      const shakeX = this.shake > 0 ? Math.sin(this.shake * 70) * 3 : 0;
      const frame = animFrame(this.animT, 6, 4);
      const windupProg = this.state === 'windup' ? 1 - this.windupT / this.windupMax : 0;

      let leanX = 0;
      let leanY = 0;
      if (this.state === 'windup') {
        leanX = -this.strikeFacing.x * 5 * windupProg;
        leanY = -this.strikeFacing.y * 5 * windupProg;
      } else if (this.state === 'strike' || (this.state === 'recover' && this.recoverT > def.recover * 0.6)) {
        leanX = this.strikeFacing.x * 7;
        leanY = this.strikeFacing.y * 7;
      }

      let pose = 'idle';
      if (this.dead) pose = 'die';
      else if (this.state === 'windup') pose = 'windup';
      else if (this.state === 'strike') pose = 'attack';
      else if (this.state === 'chase' || this.state === 'patrol') pose = 'walk';

      ctx.save();
      ctx.translate(sp.x + shakeX + leanX, sp.y + fallY + leanY);
      ctx.imageSmoothingEnabled = false;
      ctx.globalAlpha = alpha;

      if (this.state === 'windup') {
        drawWindupWarn(ctx, def.attackRange, windupProg, 'rgba(231,76,60,0.9)');
        // 像素蓄力提示块
        const pr = Math.round(6 * s * (0.7 + windupProg * 0.4));
        ctx.fillStyle = `rgba(255,80,60,${0.25 + windupProg * 0.5})`;
        ctx.fillRect(-pr, -4 - pr, pr * 2, pr * 2);
      }

      drawEnemyPixel(ctx, type, 0, 0, {
        pose,
        frame,
        flash: this.flash > 0 && !this.dead && Math.floor(this.flash * 18) % 2 === 0,
        alpha: 1,
        dead: this.dead,
        drawScale: s > 1.6 ? 1.25 : (s > 1.3 ? 1.1 : 1)
      });

      if (this.hp < this.maxHp && !this.dead) {
        const bw = Math.round(24 * s);
        drawBar(ctx, -bw / 2, -20 * s, bw, 4, this.hp / this.maxHp, P.hp);
      }
      ctx.restore();
    }
  };
}

module.exports = { ENEMY_DEFS, createEnemy };
