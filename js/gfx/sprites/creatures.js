/**
 * 非蚁 NPC + 怪物像素精灵 — 24×24 / 32×32 点阵预渲染
 */
const {
  blank, setPx, getPx, fillRect, fillEllipse, addOutline, mirrorH,
  getSprite, getFlashSprite, drawCached, drawPixelShadow
} = require('../pixelsprite.js');

const I = {
  ink: 0, shadow: 1, shade: 2,
  woodMd: 4, woodLt: 5,
  moss: 11, mossLt: 12, leaf: 13,
  gold: 15, goldLt: 16, cream: 19,
  antDk: 21, antMd: 22, antLt: 23,
  red: 28, pink: 29, blue: 30, purple: 31, cyan: 32, yellow: 33, white: 34, black: 35
};

const _built = Object.create(null);

function ensure(id, builder, scale) {
  scale = scale || 2;
  if (_built[id]) return _built[id];
  const grid = builder();
  _built[id] = grid;
  getSprite(id, grid, null, scale);
  getFlashSprite(id, grid, scale);
  return grid;
}

// ========== 瓢虫商人 ==========
function paintLadybug(frame) {
  const g = blank(24, 24);
  // 足
  for (const sx of [-5, -2, 2, 5]) {
    setPx(g, 12 + sx, 18 + (frame % 2), I.ink);
    setPx(g, 12 + sx, 19 + (frame % 2), I.ink);
  }
  fillEllipse(g, 12, 13, 8, 7, I.red);
  fillEllipse(g, 11, 11, 5, 3, 28); // highlight area
  // 中线
  for (let y = 8; y < 19; y++) setPx(g, 12, y, I.ink);
  // 黑点
  const spots = [[8, 10], [16, 11], [9, 15], [15, 16], [12, 13]];
  for (const s of spots) fillEllipse(g, s[0], s[1], 1.4, 1.4, I.ink);
  // 头
  fillEllipse(g, 12, 7, 4, 3.5, I.ink);
  fillEllipse(g, 11, 6, 2, 1.5, I.shade);
  setPx(g, 10, 6, I.yellow);
  setPx(g, 13, 6, I.yellow);
  // 行囊
  fillRect(g, 18, 12, 4, 5, I.woodMd);
  setPx(g, 19, 13, I.gold);
  addOutline(g, I.ink);
  return g;
}

// ========== 蚂蚱旅人 ==========
function paintGrasshopper(frame) {
  const g = blank(28, 24);
  const hop = frame % 2;
  fillEllipse(g, 12, 13 + hop, 7, 4.5, I.moss);
  fillEllipse(g, 11, 11 + hop, 4, 2, I.mossLt);
  // 长后足
  setPx(g, 16, 13 + hop, I.leaf);
  setPx(g, 19, 8 + hop, I.leaf);
  setPx(g, 22, 14 + hop, I.leaf);
  setPx(g, 21, 17 + hop, I.moss);
  setPx(g, 8, 16 + hop, I.moss);
  setPx(g, 6, 18 + hop, I.moss);
  // 头
  fillEllipse(g, 7, 9 + hop, 3.5, 3, I.moss);
  setPx(g, 5, 8 + hop, I.ink);
  // 叶帽
  fillEllipse(g, 7, 6 + hop, 4, 2, I.leaf);
  setPx(g, 7, 5 + hop, I.mossLt);
  // 触角
  setPx(g, 5, 6 + hop, I.ink);
  setPx(g, 3, 4 + hop, I.ink);
  setPx(g, 8, 6 + hop, I.ink);
  setPx(g, 9, 3 + hop, I.ink);
  addOutline(g, I.ink);
  return g;
}

// ========== 蜜蜂信使 ==========
function paintBee(frame) {
  const g = blank(28, 24);
  const wing = frame % 2;
  // 翅
  fillEllipse(g, 6, 8 + wing, 5, 3, I.cream);
  fillEllipse(g, 22, 8 - wing, 5, 3, I.cream);
  fillEllipse(g, 12, 12, 6, 5, I.yellow);
  fillEllipse(g, 11, 10, 3, 2, I.goldLt);
  // 条纹
  fillRect(g, 7, 10, 11, 2, I.ink);
  fillRect(g, 7, 14, 11, 2, I.ink);
  // 头
  fillEllipse(g, 12, 6, 3.5, 3, I.yellow);
  setPx(g, 10, 5, I.ink);
  setPx(g, 13, 5, I.ink);
  // 信包
  fillRect(g, 18, 11, 5, 4, I.woodMd);
  setPx(g, 19, 12, I.cream);
  setPx(g, 20, 12, I.cream);
  // 螫针
  setPx(g, 12, 17, I.ink);
  setPx(g, 12, 18, I.ink);
  addOutline(g, I.ink);
  return g;
}

// ========== 萤火虫 ==========
function paintFirefly(frame) {
  const g = blank(24, 24);
  const glow = frame % 2;
  fillEllipse(g, 12, 11, 4, 3.5, I.shade);
  fillEllipse(g, 12, 10, 3, 2.5, I.cream);
  // 发光尾
  fillEllipse(g, 12, 16, 3 + glow, 2.5 + glow, I.yellow);
  setPx(g, 12, 16, I.goldLt);
  setPx(g, 11, 9, I.ink);
  setPx(g, 13, 9, I.ink);
  // 翅
  fillEllipse(g, 7, 10, 3, 2, I.cream);
  fillEllipse(g, 17, 10, 3, 2, I.cream);
  // 提灯
  setPx(g, 18, 12, I.woodMd);
  setPx(g, 18, 13, I.woodMd);
  setPx(g, 18, 14, I.yellow);
  setPx(g, 18, 15, I.goldLt);
  addOutline(g, I.ink);
  return g;
}

// ========== 蜘蛛 ==========
function paintSpider(frame, pose) {
  const g = blank(28, 24);
  const bob = pose === 'walk' ? (frame % 2) : 0;
  const windup = pose === 'windup';
  const attack = pose === 'attack';
  // 8 足
  for (let i = 0; i < 4; i++) {
    const sw = ((frame + i) % 2) ? 1 : 0;
    const lift = windup ? -3 - i : (attack ? 2 : 0);
    setPx(g, 8 - i, 12 + bob + sw + lift, I.antDk);
    setPx(g, 5 - i, 14 + bob - sw, I.antDk);
    setPx(g, 3 - i, 16 + bob + sw, I.ink);
    setPx(g, 20 + i, 12 + bob - sw + lift, I.antDk);
    setPx(g, 23 + i, 14 + bob + sw, I.antDk);
    setPx(g, 25 + i, 16 + bob - sw, I.ink);
  }
  fillEllipse(g, 14, 12 + bob, 7, 5.5, I.antMd);
  fillEllipse(g, 13, 10 + bob, 4, 2.5, I.antLt);
  // 红眼
  for (const ex of [10, 12, 15, 17]) {
    setPx(g, ex, 9 + bob, I.red);
  }
  if (pose === 'die') {
    for (let i = 0; i < 30; i++) setPx(g, (i * 3) % 28, (i * 5) % 24, -1);
  }
  addOutline(g, I.ink);
  return g;
}

// ========== 毒蜂 ==========
function paintWasp(frame, pose) {
  const g = blank(24, 24);
  const wing = frame % 2;
  fillEllipse(g, 6, 8 + wing, 5, 2.5, I.cream);
  fillEllipse(g, 18, 8 - wing, 5, 2.5, I.cream);
  fillEllipse(g, 12, 12, 5, 4.5, I.yellow);
  fillRect(g, 8, 10, 9, 2, I.ink);
  fillRect(g, 8, 14, 9, 2, I.ink);
  fillEllipse(g, 12, 6, 3, 2.5, I.yellow);
  setPx(g, 10, 5, I.ink);
  setPx(g, 13, 5, I.ink);
  // 螫针
  const sting = pose === 'attack' ? 3 : (pose === 'windup' ? -1 : 1);
  setPx(g, 12, 17 + sting, I.ink);
  setPx(g, 11, 18 + sting, I.ink);
  setPx(g, 13, 18 + sting, I.ink);
  if (pose === 'windup') {
    fillEllipse(g, 12, 12, 7, 6, I.gold); // 蓄力发光感用金色层
    // 重画身体
    fillEllipse(g, 12, 12, 5, 4.5, I.yellow);
    fillRect(g, 8, 10, 9, 2, I.ink);
  }
  addOutline(g, I.ink);
  return g;
}

// ========== 食蚁兽 ==========
function paintAnteater(frame, pose) {
  const g = blank(36, 28);
  const bob = frame % 2;
  fillEllipse(g, 16, 15 + bob, 12, 8, I.woodMd);
  fillEllipse(g, 14, 12 + bob, 7, 4, I.woodLt);
  // 长吻
  const snout = pose === 'windup' ? -3 : (pose === 'attack' ? 6 : 0);
  for (let i = 0; i < 10; i++) {
    setPx(g, 26 + i + snout, 14 + bob + (i > 5 ? 1 : 0), I.woodMd);
    setPx(g, 26 + i + snout, 15 + bob, I.antDk);
  }
  // 爪
  if (pose === 'windup') {
    setPx(g, 8, 10 + bob, I.ink);
    setPx(g, 6, 7 + bob, I.ink);
    setPx(g, 5, 5 + bob, I.cream);
  } else {
    setPx(g, 8, 20 + bob, I.ink);
    setPx(g, 6, 22 + bob, I.ink);
  }
  setPx(g, 12, 11 + bob, I.ink);
  addOutline(g, I.ink);
  return g;
}

// ========== 暗影蝎 ==========
function paintScorpion(frame, pose) {
  const g = blank(28, 28);
  const bob = frame % 2;
  fillEllipse(g, 14, 16 + bob, 8, 6, I.purple);
  fillEllipse(g, 13, 14 + bob, 4, 2.5, 31);
  // 尾
  const lift = pose === 'windup' ? -6 : (pose === 'attack' ? 2 : 0);
  setPx(g, 8, 14 + bob, I.purple);
  setPx(g, 5, 10 + bob + lift / 2, 31);
  setPx(g, 6, 6 + bob + lift, I.cyan);
  setPx(g, 7, 5 + bob + lift, I.red);
  // 钳
  const claw = pose === 'windup' ? -2 : 0;
  setPx(g, 20, 14 + bob, 31);
  setPx(g, 23, 11 + bob + claw, I.purple);
  setPx(g, 25, 13 + bob, I.ink);
  setPx(g, 22, 16 + bob, I.purple);
  setPx(g, 24, 18 + bob, I.ink);
  // 足
  for (let i = 0; i < 3; i++) {
    setPx(g, 10 - i, 20 + bob, I.ink);
    setPx(g, 18 + i, 20 + bob, I.ink);
  }
  addOutline(g, I.ink);
  return g;
}

// ========== 心魔 ==========
function paintDemon(frame, pose) {
  const g = blank(28, 28);
  const pulse = pose === 'windup' ? 1 : 0;
  fillEllipse(g, 14, 14, 9 + pulse, 9 + pulse, I.red);
  fillEllipse(g, 14, 14, 7 + pulse, 7 + pulse, 28);
  fillEllipse(g, 12, 11, 3, 2, I.pink);
  // 白眼
  fillEllipse(g, 10, 12, 2.2, 2.2, I.white);
  fillEllipse(g, 18, 12, 2.2, 2.2, I.white);
  setPx(g, 10, 12, I.ink);
  setPx(g, 18, 12, I.ink);
  if (pose === 'attack') {
    for (let i = 0; i < 6; i++) {
      setPx(g, 14 + i, 8 - i, I.pink);
      setPx(g, 14 - i, 8 - i, I.pink);
    }
  }
  if (pose === 'die') {
    for (let i = 0; i < 40; i++) setPx(g, (i * 7) % 28, (i * 3) % 28, -1);
  }
  addOutline(g, I.ink);
  return g;
}

const NPC_BUILDERS = {
  ladybug_merchant: (f) => paintLadybug(f),
  grasshopper: (f) => paintGrasshopper(f),
  bee_messenger: (f) => paintBee(f),
  firefly_guide: (f) => paintFirefly(f)
};

const ENEMY_BUILDERS = {
  spider: paintSpider,
  wasp: paintWasp,
  anteater: paintAnteater,
  shadow_scorpion: paintScorpion,
  heart_demon: paintDemon
};

function drawNpcCreature(ctx, defId, x, y, opts) {
  opts = opts || {};
  const frame = opts.frame || 0;
  const id = 'npc:' + defId + ':' + (frame % 2);
  const builder = NPC_BUILDERS[defId];
  if (!builder) return false;
  ensure(id, () => builder(frame), 2);
  drawPixelShadow(ctx, x, y + 2, 7, 3);
  const canvas = getSprite(id, _built[id], null, 2);
  drawCached(ctx, canvas, x, y + (opts.bob || 0), { ax: 0.5, ay: 0.9, alpha: opts.alpha });
  return true;
}

function drawEnemyPixel(ctx, type, x, y, opts) {
  opts = opts || {};
  const pose = opts.pose || 'idle';
  const frame = opts.frame || 0;
  const id = 'enemy:' + type + ':' + pose + ':' + (frame % 4);
  const builder = ENEMY_BUILDERS[type];
  if (!builder) return;
  ensure(id, () => builder(frame, pose), 2);
  if (!opts.dead) drawPixelShadow(ctx, x, y + 2, 9, 3);
  const canvas = opts.flash
    ? getFlashSprite(id, _built[id], 2)
    : getSprite(id, _built[id], null, 2);
  drawCached(ctx, canvas, x, y, {
    ax: 0.5, ay: 0.88,
    alpha: opts.alpha,
    scale: opts.drawScale || 1
  });
}

module.exports = {
  drawNpcCreature, drawEnemyPixel, NPC_BUILDERS, ENEMY_BUILDERS
};
