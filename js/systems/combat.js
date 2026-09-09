/**
 * 战斗系统 — 近战攻击 / 命中反馈
 */
const { dist } = require('../pix.js');

function createCombat() {
  function tryAttack(player, enemies, particles, vibrate) {
    if (player.attackCd > 0 || player.dead) return null;
    const pc = player.getCenter();
    const range = 28;
    let best = null;
    let bestD = range;
    for (let i = 0; i < enemies.length; i++) {
      const e = enemies[i];
      if (e.dead) continue;
      const ec = e.getCenter();
      // 面向优先
      let facing = true;
      const dx = ec.x - pc.x;
      const dy = ec.y - pc.y;
      if (player.dir === 'left' && dx > 4) facing = false;
      if (player.dir === 'right' && dx < -4) facing = false;
      if (player.dir === 'up' && dy > 4) facing = false;
      if (player.dir === 'down' && dy < -4) facing = false;
      const d = dist(pc.x, pc.y, ec.x, ec.y);
      if (d < bestD && (facing || d < 18)) {
        bestD = d;
        best = e;
      }
    }
    player.attackCd = 0.38;
    if (!best) return null;

    const dmg = best.takeDamage(player.atk + ((Math.random() * 4) | 0));
    // 击退
    const ec = best.getCenter();
    const dx = ec.x - pc.x;
    const dy = ec.y - pc.y;
    const len = Math.sqrt(dx * dx + dy * dy) || 1;
    best.x += (dx / len) * 10;
    best.y += (dy / len) * 10;

    if (particles) {
      particles.hitSpark(ec.x, ec.y);
      particles.floatText(ec.x, ec.y - 14, '-' + dmg, '#ffeaa7');
    }
    if (vibrate) vibrate();
    return { enemy: best, dmg };
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

  return { tryAttack, dropLoot };
}

module.exports = { createCombat };
