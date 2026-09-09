/**
 * 敌人实体 — 饥荒式战斗（前摇→挥击命中→硬直）+ 强化像素造型
 * 无接触伤害；可贴身绕圈；可走 A 风筝
 */
const { dist } = require('../pix.js');
const { animFrame, drawWindupWarn } = require('./sprite.js');

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
      const bob = this.dead ? 0 : Math.sin(this.animT * 3) * 1.2;
      const s = def.size;
      let alpha = 1;
      let fallY = 0;
      let rot = 0;
      if (this.dead) {
        alpha = Math.max(0, 1 - this.deadT / 1.15);
        fallY = this.deadT * 10;
        rot = Math.min(1.2, this.deadT * 1.8);
      }
      const shakeX = this.shake > 0 ? Math.sin(this.shake * 70) * 3 : 0;
      const light = def.light || def.color;
      const dark = def.dark || '#111';
      const frame = animFrame(this.animT, 6, 4);
      const windupProg = this.state === 'windup' ? 1 - this.windupT / this.windupMax : 0;

      // 前摇后仰 / 挥击前扑
      let leanX = 0;
      let leanY = 0;
      if (this.state === 'windup') {
        leanX = -this.strikeFacing.x * 5 * windupProg;
        leanY = -this.strikeFacing.y * 5 * windupProg;
      } else if (this.state === 'strike' || (this.state === 'recover' && this.recoverT > def.recover * 0.6)) {
        leanX = this.strikeFacing.x * 7;
        leanY = this.strikeFacing.y * 7;
      }

      ctx.save();
      ctx.translate(sp.x + shakeX + leanX, sp.y + fallY + leanY);
      ctx.rotate(rot);
      ctx.globalAlpha = alpha;

      // 预警环
      if (this.state === 'windup') {
        drawWindupWarn(ctx, def.attackRange, windupProg, 'rgba(231,76,60,0.9)');
        // 抬爪/发光提示
        ctx.fillStyle = `rgba(255,80,60,${0.25 + windupProg * 0.5})`;
        ctx.beginPath();
        ctx.arc(0, -4, 10 * s * (0.7 + windupProg * 0.4), 0, Math.PI * 2);
        ctx.fill();
      }

      ctx.fillStyle = 'rgba(0,0,0,0.2)';
      ctx.beginPath();
      ctx.ellipse(0, 7 * s, 9 * s, 3.2, 0, 0, Math.PI * 2);
      ctx.fill();

      if (type === 'spider') this._drawSpider(ctx, s, bob, light, dark, frame, windupProg);
      else if (type === 'wasp') this._drawWasp(ctx, s, bob, light, dark, frame, windupProg);
      else if (type === 'anteater') this._drawAnteater(ctx, s, bob, light, dark, frame, windupProg);
      else if (type === 'shadow_scorpion') this._drawScorpion(ctx, s, bob, light, dark, frame, windupProg);
      else if (type === 'heart_demon') this._drawDemon(ctx, s, bob, light, dark, frame, windupProg);

      if (this.flash > 0 && !this.dead) {
        ctx.globalAlpha = alpha * 0.55;
        ctx.fillStyle = '#ffffff';
        ctx.beginPath();
        ctx.arc(0, bob, 9 * s, 0, Math.PI * 2);
        ctx.fill();
      }

      if (this.hp < this.maxHp && !this.dead) {
        ctx.globalAlpha = alpha;
        const bw = 24 * s;
        ctx.fillStyle = 'rgba(0,0,0,0.55)';
        ctx.fillRect(-bw / 2, -20 * s, bw, 3.5);
        ctx.fillStyle = '#e74c3c';
        ctx.fillRect(-bw / 2, -20 * s, bw * (this.hp / this.maxHp), 3.5);
        ctx.strokeStyle = 'rgba(255,255,255,0.25)';
        ctx.strokeRect(-bw / 2, -20 * s, bw, 3.5);
      }
      ctx.restore();
    },

    _drawSpider(ctx, s, bob, light, dark, frame, wp) {
      // 多足 + 多眼
      ctx.strokeStyle = dark;
      ctx.lineWidth = 1.8;
      for (let i = 0; i < 4; i++) {
        const sw = Math.sin(this.animT * 6 + i) * 3 + (this.state === 'windup' ? -2 - wp * 4 : 0);
        ctx.beginPath();
        ctx.moveTo(-3 * s, bob);
        ctx.lineTo(-12 * s - i, bob + sw);
        ctx.moveTo(3 * s, bob);
        ctx.lineTo(12 * s + i, bob - sw);
        ctx.stroke();
      }
      ctx.fillStyle = dark;
      ctx.beginPath();
      ctx.ellipse(0, 1.5 + bob, 9 * s, 7.5 * s, 0, 0, Math.PI * 2);
      ctx.fill();
      ctx.fillStyle = def.color;
      ctx.beginPath();
      ctx.ellipse(0, bob, 8 * s, 6.5 * s, 0, 0, Math.PI * 2);
      ctx.fill();
      ctx.fillStyle = light;
      ctx.beginPath();
      ctx.ellipse(-1.5 * s, -2.5 * s + bob, 4 * s, 2.8 * s, 0, 0, Math.PI * 2);
      ctx.fill();
      // 前爪抬起（前摇）
      if (this.state === 'windup' || this.state === 'strike') {
        ctx.strokeStyle = '#2c1e14';
        ctx.lineWidth = 2.4;
        const lift = this.state === 'windup' ? -8 - wp * 6 : 4;
        ctx.beginPath();
        ctx.moveTo(-4 * s, bob - 2);
        ctx.lineTo(-10 * s, bob + lift);
        ctx.moveTo(4 * s, bob - 2);
        ctx.lineTo(10 * s, bob + lift);
        ctx.stroke();
      }
      // 复眼
      ctx.fillStyle = this.flash > 0 ? '#fff' : '#e74c3c';
      for (const ex of [-3.5, -1.2, 1.2, 3.5]) {
        ctx.fillRect(ex * s, -3 * s + bob, 2 * s, 2 * s);
      }
      ctx.strokeStyle = 'rgba(8,4,2,0.7)';
      ctx.lineWidth = 1.6;
      ctx.beginPath();
      ctx.ellipse(0, bob, 8.4 * s, 6.9 * s, 0, 0, Math.PI * 2);
      ctx.stroke();
    },

    _drawWasp(ctx, s, bob, light, dark, frame) {
      const wing = Math.sin(this.animT * 18) * 3;
      ctx.fillStyle = 'rgba(255,255,255,0.45)';
      ctx.beginPath();
      ctx.ellipse(-7 * s, -4 * s + bob + wing, 6 * s, 3.2 * s, -0.4, 0, Math.PI * 2);
      ctx.ellipse(7 * s, -4 * s + bob - wing, 6 * s, 3.2 * s, 0.4, 0, Math.PI * 2);
      ctx.fill();
      ctx.fillStyle = dark;
      ctx.beginPath();
      ctx.ellipse(0, 1 + bob, 6 * s, 5 * s, 0, 0, Math.PI * 2);
      ctx.fill();
      ctx.fillStyle = '#f1c40f';
      ctx.beginPath();
      ctx.ellipse(0, bob, 5.4 * s, 4.4 * s, 0, 0, Math.PI * 2);
      ctx.fill();
      ctx.fillStyle = light;
      ctx.beginPath();
      ctx.ellipse(-1 * s, -1.8 * s + bob, 3.2 * s, 2 * s, 0, 0, Math.PI * 2);
      ctx.fill();
      ctx.fillStyle = '#2c3e50';
      ctx.fillRect(-5.5 * s, -1.2 * s + bob, 11 * s, 2);
      ctx.fillRect(-5.5 * s, 2 * s + bob, 11 * s, 2);
      // 毒刺
      ctx.fillStyle = '#2c3e50';
      ctx.beginPath();
      ctx.moveTo(0, 4 * s + bob);
      ctx.lineTo(-2 * s, 9 * s + bob);
      ctx.lineTo(2 * s, 9 * s + bob);
      ctx.fill();
      if (this.state === 'windup') {
        ctx.fillStyle = 'rgba(241,196,15,0.5)';
        ctx.beginPath();
        ctx.arc(0, bob, 8 * s, 0, Math.PI * 2);
        ctx.fill();
      }
      ctx.strokeStyle = 'rgba(8,4,2,0.6)';
      ctx.lineWidth = 1.5;
      ctx.beginPath();
      ctx.ellipse(0, bob, 5.7 * s, 4.7 * s, 0, 0, Math.PI * 2);
      ctx.stroke();
    },

    _drawAnteater(ctx, s, bob, light, dark, frame, wp) {
      ctx.fillStyle = dark;
      ctx.beginPath();
      ctx.ellipse(0, 2 + bob, 14 * s, 9.5 * s, 0, 0, Math.PI * 2);
      ctx.fill();
      ctx.fillStyle = def.color;
      ctx.beginPath();
      ctx.ellipse(0, bob, 13 * s, 8.5 * s, 0, 0, Math.PI * 2);
      ctx.fill();
      ctx.fillStyle = light;
      ctx.beginPath();
      ctx.ellipse(-2 * s, -3.5 * s + bob, 7.5 * s, 3.8 * s, 0, 0, Math.PI * 2);
      ctx.fill();
      // 长吻（前摇后仰再戳）
      const snout = this.state === 'windup' ? -4 - wp * 6 : (this.state === 'strike' ? 8 : 0);
      ctx.strokeStyle = '#6b4420';
      ctx.lineWidth = 3.8;
      ctx.beginPath();
      ctx.moveTo(10 * s, bob);
      ctx.quadraticCurveTo(18 * s + snout, 3 + bob, 24 * s + snout, bob - snout * 0.2);
      ctx.stroke();
      // 爪抬起
      if (this.state === 'windup') {
        ctx.strokeStyle = dark;
        ctx.lineWidth = 3;
        ctx.beginPath();
        ctx.moveTo(-6 * s, 2 * s + bob);
        ctx.lineTo(-12 * s, -8 * s - wp * 5 + bob);
        ctx.stroke();
      }
      ctx.fillStyle = '#2c3e50';
      ctx.fillRect(-4 * s, -4.5 * s + bob, 3.5 * s, 3.5 * s);
      ctx.strokeStyle = 'rgba(8,4,2,0.65)';
      ctx.lineWidth = 1.7;
      ctx.beginPath();
      ctx.ellipse(0, bob, 13.4 * s, 8.9 * s, 0, 0, Math.PI * 2);
      ctx.stroke();
    },

    _drawScorpion(ctx, s, bob, light, dark, frame, wp) {
      ctx.fillStyle = dark;
      ctx.beginPath();
      ctx.ellipse(0, 1.5 + bob, 9.5 * s, 7.5 * s, 0, 0, Math.PI * 2);
      ctx.fill();
      ctx.fillStyle = def.color;
      ctx.beginPath();
      ctx.ellipse(0, bob, 8.5 * s, 6.5 * s, 0, 0, Math.PI * 2);
      ctx.fill();
      ctx.fillStyle = light;
      ctx.beginPath();
      ctx.ellipse(-1.2 * s, -2.5 * s + bob, 4.2 * s, 2.6 * s, 0, 0, Math.PI * 2);
      ctx.fill();
      // 尾刺蓄力抬高
      const tailLift = this.state === 'windup' ? -4 - wp * 10 : (this.state === 'strike' ? 6 : 0);
      ctx.strokeStyle = '#9b59b6';
      ctx.lineWidth = 2.8;
      ctx.beginPath();
      ctx.moveTo(-5 * s, bob);
      ctx.quadraticCurveTo(-14 * s, -12 * s + bob + tailLift * 0.3, -5 * s, -16 * s + bob + tailLift);
      ctx.stroke();
      ctx.fillStyle = '#e74c3c';
      ctx.beginPath();
      ctx.arc(-5 * s, -16 * s + bob + tailLift, 3.8 * s, 0, Math.PI * 2);
      ctx.fill();
      // 钳
      ctx.strokeStyle = light;
      ctx.lineWidth = 2.2;
      const claw = this.state === 'windup' ? -3 - wp * 4 : 0;
      ctx.beginPath();
      ctx.moveTo(5 * s, bob);
      ctx.lineTo(12 * s, -4 * s + bob + claw);
      ctx.lineTo(14 * s, 2 * s + bob);
      ctx.stroke();
      ctx.strokeStyle = 'rgba(8,4,2,0.7)';
      ctx.lineWidth = 1.6;
      ctx.beginPath();
      ctx.ellipse(0, bob, 9 * s, 7 * s, 0, 0, Math.PI * 2);
      ctx.stroke();
    },

    _drawDemon(ctx, s, bob, light, dark, frame, wp) {
      const pulse = 1 + Math.sin(this.animT * 4) * 0.1 + (this.state === 'windup' ? wp * 0.15 : 0);
      ctx.fillStyle = `rgba(142,4,67,${0.25 + Math.sin(this.animT * 3) * 0.1})`;
      ctx.beginPath();
      ctx.arc(0, bob, 14 * s * pulse, 0, Math.PI * 2);
      ctx.fill();
      ctx.fillStyle = dark;
      ctx.beginPath();
      ctx.arc(0, 1 + bob, 11.5 * s * pulse, 0, Math.PI * 2);
      ctx.fill();
      ctx.fillStyle = def.color;
      ctx.beginPath();
      ctx.arc(0, bob, 10.5 * s * pulse, 0, Math.PI * 2);
      ctx.fill();
      ctx.fillStyle = light;
      ctx.beginPath();
      ctx.arc(-2 * s, -3 * s + bob, 4.2 * s, 0, Math.PI * 2);
      ctx.fill();
      // 空洞眼 / 受伤变 X
      if (this.hp < this.maxHp * 0.35) {
        ctx.strokeStyle = '#fff';
        ctx.lineWidth = 1.5;
        ctx.beginPath();
        ctx.moveTo(-6 * s, -4 * s + bob); ctx.lineTo(-2 * s, bob);
        ctx.moveTo(-2 * s, -4 * s + bob); ctx.lineTo(-6 * s, bob);
        ctx.moveTo(2 * s, -4 * s + bob); ctx.lineTo(6 * s, bob);
        ctx.moveTo(6 * s, -4 * s + bob); ctx.lineTo(2 * s, bob);
        ctx.stroke();
      } else {
        ctx.fillStyle = 'rgba(0,0,0,0.65)';
        ctx.beginPath();
        ctx.arc(-4 * s, -2.5 * s + bob, 3.4 * s, 0, Math.PI * 2);
        ctx.arc(4 * s, -2.5 * s + bob, 3.4 * s, 0, Math.PI * 2);
        ctx.fill();
        ctx.fillStyle = '#ff6b9d';
        ctx.beginPath();
        ctx.arc(-4 * s, -2.5 * s + bob, 1.4 * s, 0, Math.PI * 2);
        ctx.arc(4 * s, -2.5 * s + bob, 1.4 * s, 0, Math.PI * 2);
        ctx.fill();
      }
      if (this.state === 'windup') {
        ctx.strokeStyle = `rgba(255,100,150,${0.4 + wp * 0.5})`;
        ctx.lineWidth = 2.5;
        ctx.beginPath();
        ctx.arc(0, bob, 13 * s * pulse, 0, Math.PI * 2);
        ctx.stroke();
      }
    }
  };
}

module.exports = { ENEMY_DEFS, createEnemy };
