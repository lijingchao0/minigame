/**
 * 蚂蚁族像素精灵生成器 — 24×24 点阵
 * 四向 × 待机/行走/攻击/受击/死亡；预渲染后仅 drawImage
 */
const {
  blank, setPx, getPx, fillRect, fillEllipse, addOutline, mirrorH, remap,
  getSprite, getFlashSprite, drawCached, drawPixelShadow, animFrame
} = require('../pixelsprite.js');

// 调色板索引（与 palette.INDEX 对齐）
const I = {
  ink: 0, shadow: 1, shade: 2,
  antDk: 21, antMd: 22, antLt: 23, antHi: 24, // L M N O
  gold: 15, goldLt: 16, cream: 19, white: 34,
  red: 28, cyan: 32, pink: 29, blue: 30
};

function paintAnt(opts) {
  opts = opts || {};
  const W = 24;
  const H = 24;
  const g = blank(W, H);
  const dir = opts.dir || 'down'; // down | up | left | right（right=镜像 left）
  const pose = opts.pose || 'idle';
  const frame = opts.frame || 0;
  const jaw = opts.jaw || 0;
  const crown = opts.crown;
  const staff = opts.staff;
  const helmet = opts.helmet;
  const horn = opts.horn;
  const baby = opts.baby;
  const goggles = opts.goggles;
  const pack = opts.pack;
  const colors = opts.colors || {};

  // 颜色：暗/中/亮
  const dk = colors.dk != null ? colors.dk : I.antDk;
  const md = colors.md != null ? colors.md : I.antMd;
  const lt = colors.lt != null ? colors.lt : I.antLt;
  const hi = colors.hi != null ? colors.hi : I.antHi;
  const accent = colors.accent != null ? colors.accent : I.gold;
  const eye = colors.eye != null ? colors.eye : I.cyan;

  // 姿态偏移
  let lean = 0;
  let stretch = 0;
  let bob = 0;
  if (pose === 'walk') {
    bob = (frame % 2 === 0) ? 0 : -1;
  } else if (pose === 'attack' || pose === 'windup') {
    lean = pose === 'windup' ? 1 : -1;
    stretch = pose === 'attack' ? -2 : 1;
  } else if (pose === 'hurt') {
    lean = frame % 2 ? 1 : -1;
  } else if (pose === 'die') {
    bob = Math.min(3, frame);
  }

  const cx = 12 + (dir === 'left' ? -1 : dir === 'right' ? 1 : 0);
  const face = dir === 'up' ? -1 : 1;

  // —— 六足 ——
  if (pose !== 'die' || frame < 2) {
    const walkSwing = pose === 'walk' ? (frame % 4) : 0;
    for (let pair = 0; pair < 3; pair++) {
      const baseY = 10 + pair * 3 + bob;
      for (const side of [-1, 1]) {
        const phase = (walkSwing + pair + (side < 0 ? 0 : 2)) % 4;
        const sy = phase === 0 || phase === 1 ? 1 : 2;
        const sx = 4 + pair;
        const lx = cx + side * (3 + pair);
        const ly = baseY;
        setPx(g, lx, ly, dk);
        setPx(g, lx + side, ly + 1, dk);
        setPx(g, lx + side * sx / 2, ly + sy, dk);
        setPx(g, lx + side * (sx - 1), ly + sy + 1, dk);
        if (pose === 'attack' && pair === 0) {
          // 前足前伸
          setPx(g, lx + side * 2, ly - 1 + stretch, dk);
          setPx(g, lx + side * 4, ly - 2 + stretch, dk);
        }
        if (pose === 'windup' && pair === 0) {
          setPx(g, lx + side, ly - 2, dk);
          setPx(g, lx + side * 2, ly - 4, dk);
        }
      }
    }
  }

  // —— 腹节 ——
  const abY = 16 + bob + (pose === 'die' ? frame : 0);
  fillEllipse(g, cx + lean, abY, 5, 4, md);
  fillEllipse(g, cx + lean - 1, abY - 1, 3, 2, lt);
  // 金纹
  setPx(g, cx + lean, abY, accent);
  setPx(g, cx + lean - 1, abY, accent);
  setPx(g, cx + lean + 1, abY, accent);

  // —— 胸节 ——
  const thY = 11 + bob + stretch;
  fillEllipse(g, cx + lean, thY, 4, 3.2, md);
  fillEllipse(g, cx + lean - 1, thY - 1, 2.5, 1.5, lt);

  // —— 头 ——
  const hdY = 6 + bob + stretch * 0.5;
  fillEllipse(g, cx + lean * 0.5, hdY, 4.5, 4, md);
  fillEllipse(g, cx + lean * 0.5 - 1, hdY - 1, 3, 2, hi);

  // 大颚
  const j = jaw > 0 ? 1 + (jaw > 0.5 ? 1 : 0) : 0;
  if (dir !== 'up') {
    setPx(g, cx - 2, hdY + 2, dk);
    setPx(g, cx - 3 - j, hdY + 3 + j, dk);
    setPx(g, cx - 2, hdY + 3, dk);
    setPx(g, cx + 2, hdY + 2, dk);
    setPx(g, cx + 3 + j, hdY + 3 + j, dk);
    setPx(g, cx + 2, hdY + 3, dk);
  }

  // 触角
  const wig = (frame % 2);
  setPx(g, cx - 2, hdY - 2, dk);
  setPx(g, cx - 3, hdY - 4 - wig, dk);
  setPx(g, cx - 2, hdY - 5 - wig, accent);
  setPx(g, cx + 2, hdY - 2, dk);
  setPx(g, cx + 3, hdY - 4 + wig, dk);
  setPx(g, cx + 2, hdY - 5 + wig, accent);

  // 眼睛
  if (pose === 'die' && frame >= 1) {
    // X 眼
    setPx(g, cx - 2, hdY - 1, I.red);
    setPx(g, cx - 1, hdY, I.red);
    setPx(g, cx - 2, hdY, I.red);
    setPx(g, cx - 1, hdY - 1, I.red);
    setPx(g, cx + 1, hdY - 1, I.red);
    setPx(g, cx + 2, hdY, I.red);
    setPx(g, cx + 1, hdY, I.red);
    setPx(g, cx + 2, hdY - 1, I.red);
  } else if (dir === 'left') {
    setPx(g, cx - 3, hdY - 1, eye);
    setPx(g, cx - 3, hdY, I.white);
  } else if (dir === 'right') {
    setPx(g, cx + 2, hdY - 1, eye);
    setPx(g, cx + 2, hdY, I.white);
  } else if (dir === 'up') {
    setPx(g, cx - 2, hdY - 1, dk);
    setPx(g, cx + 1, hdY - 1, dk);
  } else {
    setPx(g, cx - 2, hdY - 1, eye);
    setPx(g, cx - 2, hdY, I.white);
    setPx(g, cx + 1, hdY - 1, eye);
    setPx(g, cx + 1, hdY, I.white);
  }

  // 附件
  if (crown) {
    fillRect(g, cx - 4, hdY - 4, 8, 2, I.gold);
    setPx(g, cx - 3, hdY - 5, I.gold);
    setPx(g, cx, hdY - 6, I.goldLt);
    setPx(g, cx + 2, hdY - 5, I.gold);
  }
  if (helmet) {
    fillEllipse(g, cx, hdY - 1, 5, 3, I.shade);
    setPx(g, cx - 1, hdY - 3, accent);
    setPx(g, cx, hdY - 3, accent);
    setPx(g, cx + 1, hdY - 3, accent);
  }
  if (horn) {
    setPx(g, cx - 3, hdY - 3, I.red);
    setPx(g, cx - 4, hdY - 5, I.red);
    setPx(g, cx + 3, hdY - 3, I.red);
    setPx(g, cx + 4, hdY - 5, I.red);
  }
  if (staff) {
    for (let i = 0; i < 8; i++) setPx(g, cx + 6, thY - 2 + i, 4); // woodMd
    setPx(g, cx + 6, thY - 3, I.gold);
    setPx(g, cx + 5, thY - 4, I.cyan);
    setPx(g, cx + 7, thY - 4, I.cyan);
  }
  if (baby) {
    fillEllipse(g, cx - 6, abY, 3, 2.5, I.cream);
    setPx(g, cx - 7, abY - 1, I.pink);
  }
  if (goggles) {
    setPx(g, cx - 3, hdY - 1, I.blue);
    setPx(g, cx - 2, hdY - 1, I.cyan);
    setPx(g, cx + 1, hdY - 1, I.cyan);
    setPx(g, cx + 2, hdY - 1, I.blue);
    setPx(g, cx - 1, hdY - 1, dk);
    setPx(g, cx, hdY - 1, dk);
  }
  if (pack) {
    fillRect(g, cx + 4, thY - 1, 4, 5, 4);
    setPx(g, cx + 5, thY, accent);
  }
  // 装备覆盖
  if (opts.armor) {
    fillEllipse(g, cx, abY - 2, 5, 2, opts.armor.shell || accent);
  }
  if (opts.neck) {
    setPx(g, cx - 2, thY + 2, opts.neck.gem || 14);
    setPx(g, cx, thY + 3, opts.neck.gem || 14);
    setPx(g, cx + 2, thY + 2, opts.neck.gem || 14);
  }
  if (opts.weapon) {
    const wx = cx + (dir === 'left' ? -7 : 7);
    for (let i = 0; i < 6; i++) setPx(g, wx, thY + i - 1, 4);
    setPx(g, wx, thY - 2, 13); // leaf as tip stand-in / metal
    setPx(g, wx - 1, thY - 1, 13);
    setPx(g, wx + 1, thY - 1, 13);
  }

  addOutline(g, I.ink);

  // die 消散：擦除像素
  if (pose === 'die' && frame >= 1) {
    const erase = frame * 18;
    for (let i = 0; i < erase; i++) {
      const ex = (i * 7 + frame * 3) % W;
      const ey = (i * 11 + frame * 5) % H;
      if (getPx(g, ex, ey) >= 0 && ((i + frame) % 3) !== 0) setPx(g, ex, ey, -1);
    }
  }

  if (dir === 'right') return mirrorH(g);
  return g;
}

/** NPC / 玩家配色方案 */
const ANT_PALETTES = {
  player: { dk: I.antDk, md: I.antMd, lt: I.antLt, hi: I.antHi, accent: I.gold, eye: I.cyan },
  queen: { dk: 28, md: 28, lt: 28, hi: 19, accent: I.gold, eye: I.cyan }, // red-ish via remap later
  king_ant: { dk: 1, md: 2, lt: 30, hi: 31, accent: 30, eye: I.cyan },
  worker_elder: { dk: 3, md: 4, lt: 5, hi: 6, accent: I.gold, eye: I.gold },
  soldier_captain: { dk: 1, md: 2, lt: 28, hi: 28, accent: I.red, eye: I.red },
  nurse_ant: { dk: 29, md: 29, lt: 19, hi: 34, accent: 19, eye: 34 },
  scout_ant: { dk: 10, md: 11, lt: 12, hi: 13, accent: 13, eye: I.cyan }
};

// 预建所有帧缓存表
const _built = Object.create(null);

function frameId(who, dir, pose, frame, extra) {
  return 'ant:' + who + ':' + dir + ':' + pose + ':' + frame + (extra || '');
}

function buildAntFrames(who, extras) {
  extras = extras || {};
  const dirs = ['down', 'up', 'left', 'right'];
  const poses = {
    idle: 2,
    walk: 4,
    attack: 3,
    windup: 2,
    hurt: 1,
    die: 3
  };
  const colors = ANT_PALETTES[who] || ANT_PALETTES.player;
  for (let d = 0; d < dirs.length; d++) {
    const dir = dirs[d];
    for (const pose of Object.keys(poses)) {
      const n = poses[pose];
      for (let f = 0; f < n; f++) {
        const id = frameId(who, dir, pose, f, extras.tag);
        if (_built[id]) continue;
        const grid = paintAnt({
          dir, pose, frame: f,
          jaw: pose === 'attack' ? 0.8 : (who === 'soldier_captain' ? 0.35 : 0),
          colors,
          crown: extras.crown || who === 'queen',
          staff: extras.staff || who === 'king_ant',
          helmet: extras.helmet || who === 'worker_elder',
          horn: extras.horn || who === 'soldier_captain',
          baby: extras.baby || who === 'nurse_ant',
          goggles: extras.goggles || who === 'scout_ant',
          pack: extras.pack || who === 'scout_ant'
        });
        _built[id] = grid;
        getSprite(id, grid, null, 2);
        getFlashSprite(id, grid, 2);
      }
    }
  }
}

function ensureAnt(who) {
  const key = 'ready:' + who;
  if (_built[key]) return;
  buildAntFrames(who);
  _built[key] = true;
}

/**
 * 绘制蚂蚁精灵
 * opts: { who, dir, pose, frame, flash, alpha, scale, equip, bob }
 */
function drawAntPixel(ctx, x, y, opts) {
  opts = opts || {};
  const who = opts.who || 'player';
  ensureAnt(who);
  let pose = opts.pose || 'idle';
  if (pose === 'windup') pose = 'windup';
  const dir = opts.dir || 'down';
  const frames = { idle: 2, walk: 4, attack: 3, windup: 2, hurt: 1, die: 3 };
  const fc = frames[pose] || 2;
  const frame = (opts.frame || 0) % fc;
  let id = frameId(who, dir, pose, frame);

  // 装备变体：额外 tag
  if (opts.equip && (opts.equip.armor || opts.equip.weapon || opts.equip.neck)) {
    const tag = 'eq' +
      (opts.equip.armor ? 'A' : '') +
      (opts.equip.weapon ? 'W' : '') +
      (opts.equip.neck ? 'N' : '');
    id = frameId(who, dir, pose, frame, tag);
    if (!_built[id]) {
      const colors = ANT_PALETTES[who] || ANT_PALETTES.player;
      const grid = paintAnt({
        dir, pose, frame,
        jaw: pose === 'attack' ? 0.8 : 0,
        colors,
        armor: opts.equip.armor,
        weapon: opts.equip.weapon,
        neck: opts.equip.neck
      });
      _built[id] = grid;
      getSprite(id, grid, null, 2);
      getFlashSprite(id, grid, 2);
    }
  }

  const bob = opts.bob || 0;
  drawPixelShadow(ctx, x, y + 2, 8, 3);
  const canvas = opts.flash
    ? getFlashSprite(id, _built[id], 2)
    : getSprite(id, _built[id], null, 2);
  drawCached(ctx, canvas, x, y + bob, {
    ax: 0.5,
    ay: 0.88,
    alpha: opts.alpha,
    scale: opts.drawScale || 1
  });
}

module.exports = {
  paintAnt, drawAntPixel, ensureAnt, buildAntFrames, ANT_PALETTES, animFrame, I
};
