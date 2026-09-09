/**
 * 战斗系统 — 饥荒式：短前摇挥击、弧线判定、强反馈
 */
const { dist } = require('../pix.js');

function createCombat() {
  /**
   * 尝试发动玩家攻击（短前摇 → 挥击瞬间结算）
   * 返回 null | { started: true } | { enemy, dmg }
   */
  function tryAttack(player, enemies, particles, vibrate, camera) {
    if (player.dead) return null;
    if (player.attackState && player.attackState !== 'idle') return null;
    if (player.attackCd > 0) return null;

    // 进入短前摇
    player.attackState = 'windup';
    player.attackTimer = 0.1;
    player.attackCd = 0.42;
    player.swingProgress = 0;
    player._pendingHit = { enemies, particles, vibrate, camera };
    return { started: true };
  }

  /** 每帧推进玩家攻击状态机 */
  function updatePlayerAttack(player, dt, enemies, particles, vibrate, camera) {
    if (!player.attackState || player.attackState === 'idle') {
      player.swingProgress = 0;
      return null;
    }
    player.attackTimer -= dt;

    if (player.attackState === 'windup') {
      player.swingProgress = Math.min(0.25, 0.25 * (1 - player.attackTimer / 0.1));
      if (player.attackTimer <= 0) {
        player.attackState = 'swing';
        player.attackTimer = 0.14;
        // 命中瞬间结算
        return resolveSwing(player, enemies || (player._pendingHit && player._pendingHit.enemies) || [],
          particles || (player._pendingHit && player._pendingHit.particles),
          vibrate || (player._pendingHit && player._pendingHit.vibrate),
          camera || (player._pendingHit && player._pendingHit.camera));
      }
      return null;
    }

    if (player.attackState === 'swing') {
      player.swingProgress = 0.25 + 0.75 * (1 - Math.max(0, player.attackTimer) / 0.14);
      if (player.attackTimer <= 0) {
        player.attackState = 'recover';
        player.attackTimer = 0.12;
      }
      return null;
    }

    if (player.attackState === 'recover') {
      player.swingProgress = Math.max(0, 1 - (0.12 - player.attackTimer) / 0.12);
      if (player.attackTimer <= 0) {
        player.attackState = 'idle';
        player.swingProgress = 0;
        player._pendingHit = null;
      }
      return null;
    }
    return null;
  }

  function resolveSwing(player, enemies, particles, vibrate, camera) {
    const pc = player.getCenter();
    const range = 34;
    const arcHalf = 1.05; // 弧半角（弧度）
    let facingAng = Math.PI / 2; // down
    if (player.dir === 'left') facingAng = Math.PI;
    else if (player.dir === 'right') facingAng = 0;
    else if (player.dir === 'up') facingAng = -Math.PI / 2;

    let best = null;
    let bestD = range;
    const hits = [];

    for (let i = 0; i < enemies.length; i++) {
      const e = enemies[i];
      if (e.dead) continue;
      const ec = e.getCenter();
      const dx = ec.x - pc.x;
      const dy = ec.y - pc.y;
      const d = Math.sqrt(dx * dx + dy * dy);
      if (d > range) continue;
      let ang = Math.atan2(dy, dx);
      let diff = ang - facingAng;
      while (diff > Math.PI) diff -= Math.PI * 2;
      while (diff < -Math.PI) diff += Math.PI * 2;
      // 近身全向可打
      if (Math.abs(diff) > arcHalf && d > 16) continue;
      hits.push({ e, d, dx, dy });
      if (d < bestD) {
        bestD = d;
        best = e;
      }
    }

    if (!hits.length) return { miss: true };

    let last = null;
    for (let i = 0; i < hits.length; i++) {
      const { e, d, dx, dy } = hits[i];
      const dmg = e.takeDamage(player.atk + ((Math.random() * 4) | 0), {
        interrupt: true,
        knockback: 14
      });
      const len = d || 1;
      e.x += (dx / len) * 12;
      e.y += (dy / len) * 12;
      if (particles) {
        particles.hitSpark(e.getCenter().x, e.getCenter().y);
        particles.floatText(e.getCenter().x, e.getCenter().y - 16, '-' + dmg, '#ffeaa7');
      }
      last = { enemy: e, dmg };
    }
    if (camera) camera.shake(5, 0.18);
    if (vibrate) vibrate();
    return last;
  }

  function dropLoot(enemy, drops) {
    if (!enemy.dead) return;
    const table = {
      spider: [['silk', 0.6], ['berry', 0.3], ['ling_sui', 0.08]],
      wasp: [['spirit_herb', 0.4], ['dew_drop', 0.3], ['ling_sui', 0.1]],
      anteater: [['spirit_stone', 0.5], ['hp_pill', 0.3], ['yao_dan', 0.28], ['ling_sui', 0.4]],
      shadow_scorpion: [['glow_mushroom', 0.4], ['spirit_stone', 0.4], ['mp_pill', 0.2], ['ling_sui', 0.35], ['yao_dan', 0.18]],
      heart_demon: [['spirit_water', 0.8], ['xp_pill', 0.5], ['tribulation_herb', 0.4], ['yao_dan', 0.65], ['ling_sui', 0.8], ['xisui_pill', 0.45]]
    };
    const t = table[enemy.type] || [];
    for (let i = 0; i < t.length; i++) {
      if (Math.random() < t[i][1]) {
        drops.push({
          itemId: t[i][0],
          x: enemy.x + 4,
          y: enemy.y + 4,
          amount: 1,
          life: 60,
          bob: Math.random() * 5,
          taken: false
        });
      }
    }
  }

  return { tryAttack, updatePlayerAttack, resolveSwing, dropLoot };
}

module.exports = { createCombat };
