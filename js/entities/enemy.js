/**
 * 敌人实体 — 立体像素 / 受击震动 / 倒地消失
 */
const { drawShadow, dist } = require('../pix.js');

const ENEMY_DEFS = {
  spider: {
    name: '草蛛', hp: 40, atk: 8, def: 1, speed: 35, size: 1.15,
    color: '#4a3728', light: '#6d5340', dark: '#2c1e14',
    aggro: 80, attackRange: 18, attackCd: 1.2, xp: 15, nightBonus: 1.3
  },
  wasp: {
    name: '毒蜂', hp: 30, atk: 10, def: 0, speed: 55, size: 1.05,
    color: '#f1c40f', light: '#f7dc6f', dark: '#b7950b',
    aggro: 90, attackRange: 16, attackCd: 1.0, xp: 18, nightBonus: 1.0
  },
  anteater: {
    name: '食蚁兽', hp: 120, atk: 18, def: 4, speed: 28, size: 1.75,
    color: '#8b6914', light: '#b8956a', dark: '#5a4010',
    aggro: 70, attackRange: 24, attackCd: 1.8, xp: 50, nightBonus: 1.1
  },
  shadow_scorpion: {
    name: '暗影蝎', hp: 80, atk: 14, def: 3, speed: 40, size: 1.35,
    color: '#2c1654', light: '#6c3483', dark: '#1a0a30',
    aggro: 100, attackRange: 20, attackCd: 1.3, xp: 35, nightBonus: 1.5
  },
  heart_demon: {
    name: '心魔', hp: 200, atk: 22, def: 5, speed: 45, size: 1.55,
    color: '#8e0443', light: '#c0396b', dark: '#4a0222',
    aggro: 200, attackRange: 22, attackCd: 1.1, xp: 100, nightBonus: 1.0
  }
};

function createEnemy(type, x, y) {
  const def = ENEMY_DEFS[type];
  if (!def) throw new Error('未知敌人: ' + type);
  return {
    type, def,
    x, y,
    w: 16 * def.size,
    h: 16 * def.size,
    hp: def.hp,
    maxHp: def.hp,
    state: 'patrol', // patrol | chase | windup | attack | dead
    patrolOrigin: { x, y },
    patrolAngle: Math.random() * Math.PI * 2,
    animT: Math.random() * 10,
    attackTimer: 0,
    windupT: 0,
    flash: 0,
    shake: 0,
    stunned: 0,
    dead: false,
    deadT: 0,
    nightMult: 1,

    getCenter() {
      return { x: this.x + this.w / 2, y: this.y + this.h / 2 };
    },

    update(dt, player, map, isNight) {
      if (this.dead) { this.deadT += dt; return; }
      this.animT += dt;
      if (this.flash > 0) this.flash -= dt;
      if (this.shake > 0) this.shake -= dt;
      if (this.stunned > 0) { this.stunned -= dt; return; }
      if (this.attackTimer > 0) this.attackTimer -= dt;

      this.nightMult = isNight ? def.nightBonus : 1;
      const pc = player.getCenter();
      const ec = this.getCenter();
      const d = dist(ec.x, ec.y, pc.x, pc.y);
      const aggro = def.aggro * (isNight && type === 'shadow_scorpion' ? 1.3 : 1);

      if (this.state === 'windup') {
        this.windupT -= dt;
        if (this.windupT <= 0) {
          this.state = 'attack';
          this.attackTimer = def.attackCd;
        }
        return { attacked: false };
      }

      if (d < def.attackRange && this.attackTimer <= 0) {
        this.state = 'windup';
        this.windupT = 0.35;
        return { attacked: false };
      }

      if (this.state === 'attack') {
        this.state = d < aggro ? 'chase' : 'patrol';
        if (d < def.attackRange + 6) {
          return { attacked: true, damage: Math.floor(def.atk * this.nightMult) };
        }
        return { attacked: false };
      }

      if (d < aggro && !player.dead) {
        this.state = 'chase';
        const dx = pc.x - ec.x;
        const dy = pc.y - ec.y;
        const len = Math.sqrt(dx * dx + dy * dy) || 1;
        const sp = def.speed * (isNight ? 1.1 : 1);
        const nx = this.x + (dx / len) * sp * dt;
        const ny = this.y + (dy / len) * sp * dt;
        if (!map.isSolidAt(nx + this.w / 2, this.y + this.h / 2)) this.x = nx;
        if (!map.isSolidAt(this.x + this.w / 2, ny + this.h / 2)) this.y = ny;
      } else {
        this.state = 'patrol';
        this.patrolAngle += (Math.random() - 0.5) * 2 * dt;
        const sp = def.speed * 0.4;
        const nx = this.x + Math.cos(this.patrolAngle) * sp * dt;
        const ny = this.y + Math.sin(this.patrolAngle) * sp * dt;
        if (dist(nx, ny, this.patrolOrigin.x, this.patrolOrigin.y) < 60) {
          if (!map.isSolidAt(nx + this.w / 2, this.y + this.h / 2)) this.x = nx;
          if (!map.isSolidAt(this.x + this.w / 2, ny + this.h / 2)) this.y = ny;
        } else {
          this.patrolAngle += Math.PI;
        }
      }
      return { attacked: false };
    },

    takeDamage(amount) {
      if (this.dead) return 0;
      const dmg = Math.max(1, amount - def.def);
      this.hp -= dmg;
      this.flash = 0.18;
      this.shake = 0.28;
      if (this.hp <= 0) {
        this.hp = 0;
        this.dead = true;
        this.deadT = 0;
      }
      return dmg;
    },

    draw(ctx, cam) {
      if (this.dead && this.deadT > 1.2) return;
      const c = this.getCenter();
      if (!cam.inView(c.x, c.y, 36)) return;
      const sp = cam.worldToScreen(c.x, c.y);
      const bob = this.dead ? 0 : Math.sin(this.animT * 3) * 1;
      const s = def.size;
      // 倒地：下沉 + 旋转 + 淡出
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

      ctx.save();
      ctx.translate(sp.x + shakeX, sp.y + fallY);
      ctx.rotate(rot);
      ctx.globalAlpha = alpha;
      if (this.flash > 0) {
        ctx.globalAlpha = alpha * 0.45;
        // 闪白层稍后叠加
      }

      drawShadow(ctx, 0, 6 * s, 8 * s, 3);

      if (this.state === 'windup') {
        ctx.strokeStyle = 'rgba(231,76,60,0.75)';
        ctx.lineWidth = 2;
        ctx.beginPath();
        ctx.arc(0, 0, def.attackRange, 0, Math.PI * 2);
        ctx.stroke();
      }

      if (type === 'spider') {
        ctx.fillStyle = dark;
        ctx.beginPath();
        ctx.arc(0, 1 + bob, 8 * s, 0, Math.PI * 2);
        ctx.fill();
        ctx.fillStyle = def.color;
        ctx.beginPath();
        ctx.arc(0, bob, 7 * s, 0, Math.PI * 2);
        ctx.fill();
        ctx.fillStyle = light;
        ctx.beginPath();
        ctx.arc(-1.5, -2 + bob, 3.5 * s, 0, Math.PI * 2);
        ctx.fill();
        ctx.strokeStyle = dark;
        ctx.lineWidth = 1.8;
        for (let i = 0; i < 4; i++) {
          ctx.beginPath();
          ctx.moveTo(-4, bob);
          ctx.lineTo(-13, Math.sin(this.animT * 5 + i) * 3 + bob);
          ctx.moveTo(4, bob);
          ctx.lineTo(13, Math.sin(this.animT * 5 + i + 1) * 3 + bob);
          ctx.stroke();
        }
        ctx.fillStyle = this.flash > 0 ? '#fff' : '#e74c3c';
        ctx.fillRect(-3, -2 + bob, 2.5, 2.5);
        ctx.fillRect(1, -2 + bob, 2.5, 2.5);
        ctx.strokeStyle = 'rgba(8,4,2,0.65)';
        ctx.lineWidth = 1.5;
        ctx.beginPath();
        ctx.arc(0, bob, 7.5 * s, 0, Math.PI * 2);
        ctx.stroke();
      } else if (type === 'wasp') {
        ctx.fillStyle = dark;
        ctx.beginPath();
        ctx.ellipse(0, 1 + bob, 5.5 * s, 4.5 * s, 0, 0, Math.PI * 2);
        ctx.fill();
        ctx.fillStyle = '#f1c40f';
        ctx.beginPath();
        ctx.ellipse(0, bob, 5 * s, 4 * s, 0, 0, Math.PI * 2);
        ctx.fill();
        ctx.fillStyle = light;
        ctx.beginPath();
        ctx.ellipse(-1, -1.5 + bob, 3 * s, 1.8 * s, 0, 0, Math.PI * 2);
        ctx.fill();
        ctx.fillStyle = '#2c3e50';
        ctx.fillRect(-5 * s, -1 + bob, 10 * s, 2);
        ctx.fillStyle = 'rgba(255,255,255,0.45)';
        ctx.beginPath();
        ctx.ellipse(-7, -4 + bob, 5, 3, 0, 0, Math.PI * 2);
        ctx.fill();
        ctx.strokeStyle = 'rgba(8,4,2,0.55)';
        ctx.lineWidth = 1.4;
        ctx.beginPath();
        ctx.ellipse(0, bob, 5.3 * s, 4.3 * s, 0, 0, Math.PI * 2);
        ctx.stroke();
      } else if (type === 'anteater') {
        ctx.fillStyle = dark;
        ctx.beginPath();
        ctx.ellipse(0, 2 + bob, 13 * s, 9 * s, 0, 0, Math.PI * 2);
        ctx.fill();
        ctx.fillStyle = def.color;
        ctx.beginPath();
        ctx.ellipse(0, bob, 12 * s, 8 * s, 0, 0, Math.PI * 2);
        ctx.fill();
        ctx.fillStyle = light;
        ctx.beginPath();
        ctx.ellipse(-2, -3 + bob, 7 * s, 3.5 * s, 0, 0, Math.PI * 2);
        ctx.fill();
        ctx.strokeStyle = '#6b4420';
        ctx.lineWidth = 3.5;
        ctx.beginPath();
        ctx.moveTo(10 * s, bob);
        ctx.quadraticCurveTo(20 * s, 4 + bob, 23 * s, bob);
        ctx.stroke();
        ctx.fillStyle = '#2c3e50';
        ctx.fillRect(-4, -4 + bob, 3.5, 3.5);
        ctx.strokeStyle = 'rgba(8,4,2,0.6)';
        ctx.lineWidth = 1.6;
        ctx.beginPath();
        ctx.ellipse(0, bob, 12.5 * s, 8.5 * s, 0, 0, Math.PI * 2);
        ctx.stroke();
      } else if (type === 'shadow_scorpion') {
        ctx.fillStyle = dark;
        ctx.beginPath();
        ctx.ellipse(0, 1 + bob, 9 * s, 7 * s, 0, 0, Math.PI * 2);
        ctx.fill();
        ctx.fillStyle = def.color;
        ctx.beginPath();
        ctx.ellipse(0, bob, 8 * s, 6 * s, 0, 0, Math.PI * 2);
        ctx.fill();
        ctx.fillStyle = light;
        ctx.beginPath();
        ctx.ellipse(-1, -2 + bob, 4 * s, 2.5 * s, 0, 0, Math.PI * 2);
        ctx.fill();
        ctx.strokeStyle = '#9b59b6';
        ctx.lineWidth = 2.5;
        ctx.beginPath();
        ctx.moveTo(-6, bob);
        ctx.quadraticCurveTo(-15, -13 + bob, -4, -15 + bob);
        ctx.stroke();
        ctx.fillStyle = '#e74c3c';
        ctx.beginPath();
        ctx.arc(-4, -15 + bob, 3.5, 0, Math.PI * 2);
        ctx.fill();
        ctx.strokeStyle = 'rgba(8,4,2,0.65)';
        ctx.lineWidth = 1.5;
        ctx.beginPath();
        ctx.ellipse(0, bob, 8.5 * s, 6.5 * s, 0, 0, Math.PI * 2);
        ctx.stroke();
      } else if (type === 'heart_demon') {
        const pulse = 1 + Math.sin(this.animT * 4) * 0.1;
        ctx.fillStyle = dark;
        ctx.beginPath();
        ctx.arc(0, 1 + bob, 11 * s * pulse, 0, Math.PI * 2);
        ctx.fill();
        ctx.fillStyle = def.color;
        ctx.beginPath();
        ctx.arc(0, bob, 10 * s * pulse, 0, Math.PI * 2);
        ctx.fill();
        ctx.fillStyle = light;
        ctx.beginPath();
        ctx.arc(-2, -3 + bob, 4 * s, 0, Math.PI * 2);
        ctx.fill();
        ctx.fillStyle = 'rgba(0,0,0,0.55)';
        ctx.beginPath();
        ctx.arc(-4, -2 + bob, 3.2, 0, Math.PI * 2);
        ctx.arc(4, -2 + bob, 3.2, 0, Math.PI * 2);
        ctx.fill();
        ctx.strokeStyle = 'rgba(255,100,150,0.5)';
        ctx.lineWidth = 2;
        ctx.beginPath();
        ctx.arc(0, bob, 11 * s * pulse, 0, Math.PI * 2);
        ctx.stroke();
      }

      // 受击闪白叠层
      if (this.flash > 0 && !this.dead) {
        ctx.globalAlpha = alpha * 0.55;
        ctx.fillStyle = '#ffffff';
        ctx.beginPath();
        ctx.arc(0, bob, 8 * s, 0, Math.PI * 2);
        ctx.fill();
      }

      // 血条
      if (this.hp < this.maxHp && !this.dead) {
        ctx.globalAlpha = alpha;
        const bw = 22 * s;
        ctx.fillStyle = 'rgba(0,0,0,0.55)';
        ctx.fillRect(-bw / 2, -18 * s, bw, 3.5);
        ctx.fillStyle = '#e74c3c';
        ctx.fillRect(-bw / 2, -18 * s, bw * (this.hp / this.maxHp), 3.5);
        ctx.strokeStyle = 'rgba(255,255,255,0.25)';
        ctx.strokeRect(-bw / 2, -18 * s, bw, 3.5);
      }
      ctx.restore();
    }
  };
}

module.exports = { ENEMY_DEFS, createEnemy };
