/**
 * 修仙体系 — 境界 / 灵根（数量+品阶） / 功法神通 / 渡劫
 */
const REALMS = [
  { id: 'fan', name: '凡蚁', stages: ['初期', '中期', '后期', '圆满'], baseXp: 50, hp: 100, mp: 50, atk: 10 },
  { id: 'ling', name: '灵蚁', stages: ['初期', '中期', '后期', '圆满'], baseXp: 120, hp: 130, mp: 70, atk: 16 },
  { id: 'yao', name: '妖蚁', stages: ['初期', '中期', '后期', '圆满'], baseXp: 250, hp: 170, mp: 95, atk: 24 },
  { id: 'jiang', name: '蚁将', stages: ['初期', '中期', '后期', '圆满'], baseXp: 450, hp: 220, mp: 120, atk: 34 },
  { id: 'wang', name: '蚁王', stages: ['初期', '中期', '后期', '圆满'], baseXp: 800, hp: 280, mp: 160, atk: 48 },
  { id: 'xian', name: '蚁仙', stages: ['初期', '中期', '后期', '圆满'], baseXp: 1500, hp: 360, mp: 200, atk: 65 }
];

/** 灵根类型（金木水火土风雷） */
const ROOTS = [
  {
    id: 'jin', name: '金', color: '#f1c40f', skillBonus: 'jiaqiao',
    mutation: { id: 'jin_body', name: '金刚体', desc: '防御 +3' }
  },
  {
    id: 'mu', name: '木', color: '#27ae60', skillBonus: null,
    mutation: { id: 'mu_body', name: '生生不息', desc: '生命上限 +20' }
  },
  {
    id: 'shui', name: '水', color: '#3498db', skillBonus: null,
    mutation: { id: 'shui_body', name: '灵泉体', desc: '灵力回复 +50%' }
  },
  {
    id: 'huo', name: '火', color: '#e74c3c', skillBonus: null,
    mutation: { id: 'huo_body', name: '烈阳体', desc: '攻击 +12%' }
  },
  {
    id: 'tu', name: '土', color: '#8b6914', skillBonus: 'jiaqiao',
    mutation: { id: 'tu_body', name: '厚土体', desc: '生命上限 +25' }
  },
  {
    id: 'feng', name: '风', color: '#1abc9c', skillBonus: 'lingbu',
    mutation: { id: 'feng_body', name: '疾风体', desc: '移速 +12%' }
  },
  {
    id: 'lei', name: '雷', color: '#9b59b6', skillBonus: 'leifa',
    mutation: { id: 'lei_body', name: '雷灵体', desc: '微雷指伤害 +30%' }
  }
];

/** 品阶：下品→中品→上品→极品→变异 */
const QUALITIES = [
  { id: 'xia', name: '下品', mul: 1.0, rank: 0 },
  { id: 'zhong', name: '中品', mul: 1.15, rank: 1 },
  { id: 'shang', name: '上品', mul: 1.32, rank: 2 },
  { id: 'ji', name: '极品', mul: 1.5, rank: 3 },
  { id: 'bianyi', name: '变异', mul: 1.72, rank: 4 }
];

const QUALITY_ROLL_WEIGHTS = [
  { id: 'xia', w: 40 },
  { id: 'zhong', w: 30 },
  { id: 'shang', w: 18 },
  { id: 'ji', w: 7 },
  { id: 'bianyi', w: 5 }
];

/** 升级所需材料（升到下一阶） */
const UPGRADE_COST = {
  xia: { ling_sui: 2 },
  zhong: { ling_sui: 3, yao_dan: 1 },
  shang: { ling_sui: 2, yao_dan: 2 },
  ji: { ling_sui: 3, yao_dan: 2, xisui_pill: 1 }
};

const SKILLS = [
  {
    id: 'lingbu', name: '灵步', desc: '身法骤增，短时间加速 55%',
    mpCost: 12, cd: 8, duration: 3.5,
    unlockRealm: 1,
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

function getRootDef(id) {
  return ROOTS.find((r) => r.id === id) || ROOTS[0];
}

function getQuality(id) {
  return QUALITIES.find((q) => q.id === id) || QUALITIES[0];
}

function nextQualityId(id) {
  const q = getQuality(id);
  if (q.rank >= QUALITIES.length - 1) return null;
  return QUALITIES[q.rank + 1].id;
}

function weightedPick(list) {
  let total = 0;
  for (let i = 0; i < list.length; i++) total += list[i].w;
  let r = Math.random() * total;
  for (let i = 0; i < list.length; i++) {
    r -= list[i].w;
    if (r <= 0) return list[i].id;
  }
  return list[list.length - 1].id;
}

function rollRootCount() {
  const r = Math.random();
  if (r < 0.4) return 1; // 单灵根 40%
  if (r < 0.8) return 2; // 双灵根 40%
  return 3; // 三灵根 20%
}

function createCultivation() {
  const state = {
    realm: 0,
    stage: 0,
    xp: 0,
    /** @deprecated 兼容旧逻辑：指向主灵根定义 */
    root: null,
    /** [{ typeId, quality }] 最多 3 */
    roots: [],
    /** 已触发机缘 id */
    triggeredOpps: [],
    learned: [],
    skillCd: {},
    meditating: false,
    meditateT: 0,
    tribulation: null
  };

  function syncLegacyRoot() {
    if (state.roots.length) {
      state.root = getRootDef(state.roots[0].typeId);
    } else {
      state.root = null;
    }
  }

  function rollQuality() {
    return weightedPick(QUALITY_ROLL_WEIGHTS);
  }

  /** 开局 / 补生成：1~3 灵根 + 品阶 */
  function generateRandomRoots() {
    const count = rollRootCount();
    const pool = ROOTS.map((r) => r.id);
    const picked = [];
    for (let i = 0; i < count; i++) {
      const idx = (Math.random() * pool.length) | 0;
      picked.push({ typeId: pool[idx], quality: rollQuality() });
      pool.splice(idx, 1);
    }
    state.roots = picked;
    syncLegacyRoot();
    return state.roots;
  }

  /** @deprecated 保留 API，改为多灵根随机 */
  function randomRoot() {
    generateRandomRoots();
    return state.root;
  }

  function cultivateMul() {
    if (!state.roots.length) return 1;
    let sum = 0;
    for (let i = 0; i < state.roots.length; i++) {
      sum += getQuality(state.roots[i].quality).mul;
    }
    const avg = sum / state.roots.length;
    // 单灵根纯净加成，三灵根略杂
    const purity = state.roots.length === 1 ? 1.18 : state.roots.length === 2 ? 1.0 : 0.88;
    return avg * purity;
  }

  function hasMutation(typeId) {
    return state.roots.some((r) => r.typeId === typeId && r.quality === 'bianyi');
  }

  function rootsLabel() {
    if (!state.roots.length) return '无灵根';
    return state.roots.map((r) => {
      const t = getRootDef(r.typeId);
      const q = getQuality(r.quality);
      return q.name + t.name;
    }).join('·');
  }

  function rootsDescLines() {
    return state.roots.map((r) => {
      const t = getRootDef(r.typeId);
      const q = getQuality(r.quality);
      let line = q.name + t.name + '灵根（修炼×' + q.mul.toFixed(2) + '）';
      if (r.quality === 'bianyi' && t.mutation) {
        line += ' · ' + t.mutation.name + '：' + t.mutation.desc;
      }
      return line;
    });
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
    let maxHp = Math.floor(r.hp * (1 + stageBonus));
    let maxMp = Math.floor(r.mp * (1 + stageBonus));
    let atk = Math.floor(r.atk * (1 + stageBonus));
    let defBonus = 0;
    let speedMul = 1;

    if (hasMutation('mu')) maxHp += 20;
    if (hasMutation('tu')) maxHp += 25;
    if (hasMutation('jin')) defBonus += 3;
    if (hasMutation('huo')) atk = Math.floor(atk * 1.12);
    if (hasMutation('feng')) speedMul *= 1.12;
    if (hasMutation('shui')) player._mpRegenMul = 1.5;
    else player._mpRegenMul = 1;

    player.maxHp = maxHp;
    player.maxMp = maxMp;
    player.atk = atk;
    player._rootDefBonus = defBonus;
    player._rootSpeedMul = speedMul;
    player.hp = Math.min(player.hp, player.maxHp);
    player.mp = Math.min(player.mp, player.maxMp);
  }

  function addXp(amount, player, particles, onBreakthrough) {
    const mul = cultivateMul();
    const gained = Math.floor(amount * mul);
    state.xp += gained;
    if (particles) particles.floatText(player.x, player.y - 20, '+' + gained + '修为', '#27ae60');

    while (state.xp >= xpNeeded()) {
      state.xp -= xpNeeded();
      if (state.stage < 3) {
        state.stage++;
        applyStats(player);
        player.hp = player.maxHp;
        player.mp = player.maxMp;
        if (particles) particles.breakthrough(player.x + 6, player.y);
        if (onBreakthrough) onBreakthrough('stage', realmName());
      } else {
        state.xp = xpNeeded() - 1;
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
      playerX: 0.5,
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
        x: lane, y: -0.1, warn: 0.55, warned: true,
        speed: 0.55 + Math.random() * 0.35, alive: true, hitChecked: false
      });
      tb.nextBolt = 0.7 + Math.random() * 0.6;
      tb.warnFlash = 0.3;
    }

    for (let i = tb.bolts.length - 1; i >= 0; i--) {
      const b = tb.bolts[i];
      if (b.warn > 0) { b.warn -= dt; continue; }
      b.y += b.speed * dt;
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
      for (let i = 0; i < SKILLS.length; i++) {
        const sk = SKILLS[i];
        if (sk.unlockRealm <= state.realm && state.learned.indexOf(sk.id) < 0) {
          state.learned.push(sk.id);
        }
      }
      if (particles) particles.breakthrough(player.x + 6, player.y);
      if (onResult) onResult(true, realmName());
    } else {
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

  function leifaDamageBonus() {
    return hasMutation('lei') ? 1.3 : 1;
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
        const dmg = best.takeDamage((sk.damage + player.atk * 0.5) * leifaDamageBonus());
        if (particles) {
          particles.hitSpark(best.getCenter().x, best.getCenter().y);
          particles.floatText(best.x, best.y - 12, '-' + Math.floor(dmg), '#9b59b6');
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
    if (state.meditating) state.meditateT += dt;
  }

  function clamp01(v) { return Math.max(0, Math.min(1, v)); }

  /** 提升指定索引灵根一阶；成功返回消息 */
  function upgradeRootAt(index, inventory) {
    if (index < 0 || index >= state.roots.length) return { ok: false, msg: '无效灵根' };
    const root = state.roots[index];
    const next = nextQualityId(root.quality);
    if (!next) return { ok: false, msg: '已达变异，无法再升' };
    const cost = UPGRADE_COST[root.quality];
    if (!cost) return { ok: false, msg: '无法升级' };
    for (const id of Object.keys(cost)) {
      if (!inventory.has(id, cost[id])) {
        return { ok: false, msg: '材料不足' };
      }
    }
    for (const id of Object.keys(cost)) inventory.remove(id, cost[id]);
    root.quality = next;
    syncLegacyRoot();
    const t = getRootDef(root.typeId);
    const q = getQuality(next);
    let msg = t.name + '灵根升至' + q.name;
    if (next === 'bianyi' && t.mutation) msg += '！觉醒' + t.mutation.name;
    return { ok: true, msg };
  }

  /** 洗髓丹：指定或随机升一阶（不耗材料表，只耗丹药本身由外部 remove） */
  function applyXisui(index) {
    let idx = index;
    if (idx == null || idx < 0 || idx >= state.roots.length) {
      // 优先升最低品阶
      let best = 0;
      let bestRank = 99;
      for (let i = 0; i < state.roots.length; i++) {
        const rk = getQuality(state.roots[i].quality).rank;
        if (rk < bestRank) { bestRank = rk; best = i; }
      }
      idx = best;
    }
    const root = state.roots[idx];
    const next = nextQualityId(root.quality);
    if (!next) return { ok: false, msg: '灵根已是变异' };
    root.quality = next;
    syncLegacyRoot();
    const t = getRootDef(root.typeId);
    return { ok: true, msg: t.name + '灵根洗髓为' + getQuality(next).name, index: idx };
  }

  /** 觉醒丹：点亮新灵根位 */
  function awakenNewRoot() {
    if (state.roots.length >= 3) return { ok: false, msg: '灵根位已满（最多3）' };
    const used = {};
    for (let i = 0; i < state.roots.length; i++) used[state.roots[i].typeId] = true;
    const pool = ROOTS.filter((r) => !used[r.id]);
    if (!pool.length) return { ok: false, msg: '无剩余灵根类型' };
    const pick = pool[(Math.random() * pool.length) | 0];
    const q = Math.random() < 0.7 ? 'xia' : (Math.random() < 0.7 ? 'zhong' : 'shang');
    state.roots.push({ typeId: pick.id, quality: q });
    syncLegacyRoot();
    return { ok: true, msg: '觉醒' + getQuality(q).name + pick.name + '灵根！' };
  }

  /** 机缘：随机提升/新根/变异 */
  function applyOpportunityBoost() {
    const roll = Math.random();
    if (roll < 0.45 && state.roots.length) {
      const r = applyXisui(-1);
      return r.ok ? '机缘：' + r.msg : '机缘掠过，灵根未变';
    }
    if (roll < 0.75) {
      const r = awakenNewRoot();
      return r.ok ? '机缘：' + r.msg : '机缘：灵根位已满，化为修为暖流';
    }
    // 强制尝试变异最低品阶的一根
    if (state.roots.length) {
      let idx = 0;
      let bestRank = 99;
      for (let i = 0; i < state.roots.length; i++) {
        const rk = getQuality(state.roots[i].quality).rank;
        if (rk < bestRank) { bestRank = rk; idx = i; }
      }
      if (state.roots[idx].quality !== 'bianyi' && Math.random() < 0.55) {
        state.roots[idx].quality = 'bianyi';
        syncLegacyRoot();
        const t = getRootDef(state.roots[idx].typeId);
        return '机缘大爆发！' + t.name + '灵根觉醒变异·' + (t.mutation ? t.mutation.name : '异象');
      }
      const r = applyXisui(idx);
      return r.ok ? '机缘：' + r.msg : '机缘悄然消散';
    }
    generateRandomRoots();
    return '机缘：体内忽然生出灵根！' + rootsLabel();
  }

  function markOpportunity(id) {
    if (state.triggeredOpps.indexOf(id) < 0) state.triggeredOpps.push(id);
  }

  function hasOpportunity(id) {
    return state.triggeredOpps.indexOf(id) >= 0;
  }

  function serialize() {
    return {
      realm: state.realm,
      stage: state.stage,
      xp: state.xp,
      rootId: state.root ? state.root.id : null,
      roots: state.roots.map((r) => ({ typeId: r.typeId, quality: r.quality })),
      triggeredOpps: state.triggeredOpps.slice(),
      learned: state.learned.slice()
    };
  }

  function deserialize(data, player) {
    if (!data) {
      generateRandomRoots();
      if (player) applyStats(player);
      return;
    }
    state.realm = data.realm || 0;
    state.stage = data.stage || 0;
    state.xp = data.xp || 0;
    state.learned = data.learned || [];
    state.triggeredOpps = data.triggeredOpps || [];

    if (data.roots && data.roots.length) {
      state.roots = data.roots.map((r) => ({
        typeId: r.typeId || r.id,
        quality: r.quality || 'xia'
      })).slice(0, 3);
      // 校验类型
      state.roots = state.roots.filter((r) => ROOTS.some((t) => t.id === r.typeId));
      if (!state.roots.length) generateRandomRoots();
      else syncLegacyRoot();
    } else if (data.rootId) {
      // 旧存档：单 rootId → 中品单灵根
      const def = ROOTS.find((r) => r.id === data.rootId);
      state.roots = [{ typeId: def ? def.id : ROOTS[0].id, quality: 'zhong' }];
      syncLegacyRoot();
    } else {
      generateRandomRoots();
    }
    if (player) applyStats(player);
  }

  return {
    state, REALMS, ROOTS, SKILLS, QUALITIES, UPGRADE_COST,
    getRootDef, getQuality, nextQualityId,
    randomRoot, generateRandomRoots, cultivateMul, rootsLabel, rootsDescLines,
    hasMutation, xpNeeded, realmName, applyStats, addXp,
    canTribulate, startTribulation, updateTribulation, finishTribulation,
    learnSkill, canUseSkill, useSkill, updateCds,
    upgradeRootAt, applyXisui, awakenNewRoot, applyOpportunityBoost,
    markOpportunity, hasOpportunity,
    serialize, deserialize
  };
}

module.exports = {
  createCultivation, REALMS, ROOTS, SKILLS, QUALITIES, UPGRADE_COST
};
