/**
 * 修仙体系 — 境界 / 灵根 / 功法神通 / 渡劫
 */
const REALMS = [
  { id: 'fan', name: '凡蚁', stages: ['初期', '中期', '后期', '圆满'], baseXp: 50, hp: 100, mp: 50, atk: 10 },
  { id: 'ling', name: '灵蚁', stages: ['初期', '中期', '后期', '圆满'], baseXp: 120, hp: 130, mp: 70, atk: 16 },
  { id: 'yao', name: '妖蚁', stages: ['初期', '中期', '后期', '圆满'], baseXp: 250, hp: 170, mp: 95, atk: 24 },
  { id: 'jiang', name: '蚁将', stages: ['初期', '中期', '后期', '圆满'], baseXp: 450, hp: 220, mp: 120, atk: 34 },
  { id: 'wang', name: '蚁王', stages: ['初期', '中期', '后期', '圆满'], baseXp: 800, hp: 280, mp: 160, atk: 48 },
  { id: 'xian', name: '蚁仙', stages: ['初期', '中期', '后期', '圆满'], baseXp: 1500, hp: 360, mp: 200, atk: 65 }
];

const ROOTS = [
  { id: 'jin', name: '金', color: '#f1c40f', cultivateMul: 1.1, skillBonus: 'jiaqiao' },
  { id: 'mu', name: '木', color: '#27ae60', cultivateMul: 1.15, skillBonus: null },
  { id: 'shui', name: '水', color: '#3498db', cultivateMul: 1.1, skillBonus: null },
  { id: 'huo', name: '火', color: '#e74c3c', cultivateMul: 1.05, skillBonus: null },
  { id: 'tu', name: '土', color: '#8b6914', cultivateMul: 1.2, skillBonus: 'jiaqiao' },
  { id: 'feng', name: '风', color: '#1abc9c', cultivateMul: 1.1, skillBonus: 'lingbu' },
  { id: 'lei', name: '雷', color: '#9b59b6', cultivateMul: 1.0, skillBonus: 'leifa' }
];

const SKILLS = [
  {
    id: 'lingbu', name: '灵步', desc: '身法骤增，短时间加速 55%',
    mpCost: 12, cd: 8, duration: 3.5,
    unlockRealm: 1, // 灵蚁
    icon: 'lingbu'
  },
  {
    id: 'jiaqiao', name: '甲壳护体', desc: '灵力凝甲，短暂无敌',
    mpCost: 18, cd: 12, duration: 2.5,
    unlockRealm: 1,
    icon: 'jiaqiao'
  },
  {
    id: 'tusi', name: '吐丝缚敌', desc: '喷出灵丝，定身附近敌人 2 秒',
    mpCost: 15, cd: 10, duration: 2,
    unlockRealm: 2,
    icon: 'tusi'
  },
  {
    id: 'leifa', name: '微雷指', desc: '以雷灵根激发，对单体造成高额伤害',
    mpCost: 22, cd: 9, duration: 0,
    unlockRealm: 2,
    icon: 'leifa',
    damage: 45
  }
];

function createCultivation() {
  const state = {
    realm: 0,       // 0-5
    stage: 0,       // 0-3
    xp: 0,
    root: null,     // ROOTS item
    learned: [],    // skill ids
    skillCd: {},    // id -> remaining
    meditating: false,
    meditateT: 0,
    // 渡劫小游戏
    tribulation: null
  };

  function randomRoot() {
    state.root = ROOTS[(Math.random() * ROOTS.length) | 0];
    return state.root;
  }

  function xpNeeded() {
    const r = REALMS[state.realm];
    return Math.floor(r.baseXp * (1 + state.stage * 0.55));
  }

  function realmName() {
    const r = REALMS[state.realm];
    return r.name + '·' + r.stages[state.stage];
  }

  function applyStats(player) {
    const r = REALMS[state.realm];
    const stageBonus = state.stage * 0.12;
    player.maxHp = Math.floor(r.hp * (1 + stageBonus));
    player.maxMp = Math.floor(r.mp * (1 + stageBonus));
    player.atk = Math.floor(r.atk * (1 + stageBonus));
    player.hp = Math.min(player.hp, player.maxHp);
    player.mp = Math.min(player.mp, player.maxMp);
  }

  function addXp(amount, player, particles, onBreakthrough) {
    const mul = state.root ? state.root.cultivateMul : 1;
    const gained = Math.floor(amount * mul);
    state.xp += gained;
    if (particles) particles.floatText(player.x, player.y - 20, '+' + gained + '修为', '#27ae60');

    while (state.xp >= xpNeeded()) {
      state.xp -= xpNeeded();
      // 小境界提升
      if (state.stage < 3) {
        state.stage++;
        applyStats(player);
        player.hp = player.maxHp;
        player.mp = player.maxMp;
        if (particles) particles.breakthrough(player.x + 6, player.y);
        if (onBreakthrough) onBreakthrough('stage', realmName());
      } else {
        // 大境界需要渡劫
        state.xp = xpNeeded() - 1; // 卡在圆满
        if (state.realm < REALMS.length - 1) {
          if (onBreakthrough) onBreakthrough('need_tribulation', REALMS[state.realm + 1].name);
        }
        break;
      }
    }
    return gained;
  }

  function canTribulate() {
    return state.stage === 3 && state.realm < REALMS.length - 1 && state.xp >= xpNeeded() - 1;
  }

  function startTribulation() {
    state.tribulation = {
      t: 0,
      duration: 12,
      bolts: [],
      nextBolt: 0.8,
      dodged: 0,
      hit: 0,
      maxHit: 3,
      needed: 5,
      done: false,
      success: false,
      playerX: 0.5, // 0-1 归一化位置
      warnFlash: 0
    };
    return state.tribulation;
  }

  function updateTribulation(dt, moveX) {
    const tb = state.tribulation;
    if (!tb || tb.done) return tb;
    tb.t += dt;
    tb.playerX = clamp01(tb.playerX + moveX * dt * 1.2);
    if (tb.warnFlash > 0) tb.warnFlash -= dt;

    tb.nextBolt -= dt;
    if (tb.nextBolt <= 0 && tb.t < tb.duration - 1) {
      const lane = Math.random();
      tb.bolts.push({
        x: lane,
        y: -0.1,
        warn: 0.55,
        warned: true,
        speed: 0.55 + Math.random() * 0.35,
        alive: true,
        hitChecked: false
      });
      tb.nextBolt = 0.7 + Math.random() * 0.6;
      tb.warnFlash = 0.3;
    }

    for (let i = tb.bolts.length - 1; i >= 0; i--) {
      const b = tb.bolts[i];
      if (b.warn > 0) {
        b.warn -= dt;
        continue;
      }
      b.y += b.speed * dt;
      // 命中检测
      if (!b.hitChecked && b.y > 0.72 && b.y < 0.92) {
        b.hitChecked = true;
        if (Math.abs(b.x - tb.playerX) < 0.1) {
          tb.hit++;
          b.alive = false;
        } else {
          tb.dodged++;
        }
      }
      if (b.y > 1.2 || !b.alive) tb.bolts.splice(i, 1);
    }

    if (tb.hit >= tb.maxHit) {
      tb.done = true;
      tb.success = false;
    } else if (tb.dodged >= tb.needed || tb.t >= tb.duration) {
      tb.done = true;
      tb.success = tb.dodged >= tb.needed && tb.hit < tb.maxHit;
    }
    return tb;
  }

  function finishTribulation(player, particles, onResult) {
    const tb = state.tribulation;
    if (!tb) return;
    if (tb.success) {
      state.realm++;
      state.stage = 0;
      state.xp = 0;
      applyStats(player);
      player.hp = player.maxHp;
      player.mp = player.maxMp;
      // 自动领悟技能
      for (let i = 0; i < SKILLS.length; i++) {
        const sk = SKILLS[i];
        if (sk.unlockRealm <= state.realm && state.learned.indexOf(sk.id) < 0) {
          // 风灵根优先灵步，金土优先甲壳
          state.learned.push(sk.id);
        }
      }
      if (particles) particles.breakthrough(player.x + 6, player.y);
      if (onResult) onResult(true, realmName());
    } else {
      // 失败：扣修为 + 喜剧文案
      state.xp = Math.max(0, state.xp - Math.floor(xpNeeded() * 0.3));
      player.hp = Math.max(1, Math.floor(player.maxHp * 0.3));
      if (onResult) onResult(false, '雷劫烧成焦炭……修为倒退，灰头土脸逃回巢穴。');
    }
    state.tribulation = null;
  }

  function learnSkill(id) {
    if (state.learned.indexOf(id) < 0) state.learned.push(id);
  }

  function canUseSkill(id, player) {
    const sk = SKILLS.find((s) => s.id === id);
    if (!sk) return false;
    if (state.learned.indexOf(id) < 0) return false;
    if ((state.skillCd[id] || 0) > 0) return false;
    if (player.mp < sk.mpCost) return false;
    return true;
  }

  function useSkill(id, player, enemies, particles) {
    const sk = SKILLS.find((s) => s.id === id);
    if (!canUseSkill(id, player)) return false;
    player.mp -= sk.mpCost;
    state.skillCd[id] = sk.cd;

    if (id === 'lingbu') {
      player.buffs.lingbu = sk.duration;
      if (particles) particles.floatText(player.x, player.y - 16, '灵步！', '#1abc9c');
    } else if (id === 'jiaqiao') {
      player.buffs.jiaqiao = sk.duration;
      if (particles) particles.floatText(player.x, player.y - 16, '甲壳护体！', '#bdc3c7');
    } else if (id === 'tusi') {
      const pc = player.getCenter();
      for (let i = 0; i < enemies.length; i++) {
        const e = enemies[i];
        if (e.dead) continue;
        const ec = e.getCenter();
        const dx = ec.x - pc.x;
        const dy = ec.y - pc.y;
        if (dx * dx + dy * dy < 70 * 70) {
          e.stunned = sk.duration;
          if (particles) particles.floatText(ec.x, ec.y - 10, '束缚！', '#ecf0f1');
        }
      }
    } else if (id === 'leifa') {
      // 打最近敌人
      let best = null;
      let bestD = 90;
      const pc = player.getCenter();
      for (let i = 0; i < enemies.length; i++) {
        const e = enemies[i];
        if (e.dead) continue;
        const ec = e.getCenter();
        const d = Math.sqrt((ec.x - pc.x) ** 2 + (ec.y - pc.y) ** 2);
        if (d < bestD) { bestD = d; best = e; }
      }
      if (best) {
        const dmg = best.takeDamage(sk.damage + player.atk * 0.5);
        if (particles) {
          particles.hitSpark(best.getCenter().x, best.getCenter().y);
          particles.floatText(best.x, best.y - 12, '-' + dmg, '#9b59b6');
        }
      }
    }
    return true;
  }

  function updateCds(dt) {
    for (const k of Object.keys(state.skillCd)) {
      state.skillCd[k] -= dt;
      if (state.skillCd[k] <= 0) delete state.skillCd[k];
    }
    if (state.meditating) {
      state.meditateT += dt;
    }
  }

  function clamp01(v) { return Math.max(0, Math.min(1, v)); }

  function serialize() {
    return {
      realm: state.realm, stage: state.stage, xp: state.xp,
      rootId: state.root ? state.root.id : null,
      learned: state.learned.slice()
    };
  }

  function deserialize(data, player) {
    if (!data) return;
    state.realm = data.realm || 0;
    state.stage = data.stage || 0;
    state.xp = data.xp || 0;
    state.learned = data.learned || [];
    if (data.rootId) state.root = ROOTS.find((r) => r.id === data.rootId) || randomRoot();
    else if (!state.root) randomRoot();
    applyStats(player);
  }

  return {
    state, REALMS, ROOTS, SKILLS,
    randomRoot, xpNeeded, realmName, applyStats, addXp,
    canTribulate, startTribulation, updateTribulation, finishTribulation,
    learnSkill, canUseSkill, useSkill, updateCds,
    serialize, deserialize
  };
}

module.exports = { createCultivation, REALMS, ROOTS, SKILLS };
