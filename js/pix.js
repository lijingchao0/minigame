/**
 * 像素绘制工具 — 统一像素风格渲染（点阵面板 / 按钮 / 状态条）
 */
const { P } = require('./gfx/palette.js');
const {
  drawNineSlicePanel, drawPixelButton, drawPixelBar, drawPixelShadow, animFrame
} = require('./gfx/pixelsprite.js');

const TILE = 16; // 设计瓦片大小（像素）

/** 兼容旧 COLORS 引用，全部走统一调色板 */
const COLORS = {
  grass: [P.mossLt, P.moss, P.mossDk, P.leaf, P.moss],
  dirt: [P.soil, P.soilLt, P.woodMd],
  stone: [P.stone, P.stoneDk, P.stoneLt, '#5e5e5e'],
  water: [P.water, P.waterLt, '#2a6e9e', '#5a9ece'],
  nest: [P.woodMd, P.woodDk, P.woodLt, P.shade],
  wood: [P.woodLt, P.woodMd, P.woodHi],
  gold: P.gold,
  panel: 'rgba(42, 30, 20, 0.92)',
  panelBorder: P.gold,
  text: P.ivory,
  textDim: P.cream,
  hp: P.hp,
  mp: P.mpLt,
  xp: P.gold,
  danger: P.danger,
  night: 'rgba(15, 22, 48, 0.28)',
  dusk: 'rgba(90, 50, 30, 0.18)',
  dawn: 'rgba(255, 190, 120, 0.1)'
};

/** 像素斜角矩形路径（非平滑圆角） */
function roundRect(ctx, x, y, w, h, r) {
  r = Math.min(r || 2, 4, w / 2, h / 2);
  // 像素斜角：切角矩形
  ctx.beginPath();
  ctx.moveTo(x + r, y);
  ctx.lineTo(x + w - r, y);
  ctx.lineTo(x + w, y + r);
  ctx.lineTo(x + w, y + h - r);
  ctx.lineTo(x + w - r, y + h);
  ctx.lineTo(x + r, y + h);
  ctx.lineTo(x, y + h - r);
  ctx.lineTo(x, y + r);
  ctx.closePath();
}

/** 木质+玉色+金边像素九宫格面板 */
function drawPanel(ctx, x, y, w, h, opts) {
  opts = opts || {};
  drawNineSlicePanel(ctx, x, y, w, h, {
    fill: opts.fill || COLORS.panel,
    border: opts.borderColor || COLORS.panelBorder,
    gold: opts.gold,
    wood: opts.wood !== false,
    bevel: true
  });
}

/** 三态像素按钮 */
function drawButton(ctx, x, y, w, h, label, opts) {
  drawPixelButton(ctx, x, y, w, h, label, opts || {});
}

/** 像素风文字 — 默认浅描边保证任意背景可读 */
function drawText(ctx, text, x, y, opts) {
  opts = opts || {};
  ctx.save();
  ctx.font = opts.font || '13px "PingFang SC","Microsoft YaHei",sans-serif';
  ctx.fillStyle = opts.color || COLORS.text;
  ctx.textAlign = opts.align || 'left';
  ctx.textBaseline = opts.baseline || 'top';
  if (opts.shadow !== false) {
    ctx.lineWidth = opts.strokeWidth || 2.5;
    ctx.strokeStyle = opts.stroke || 'rgba(20,14,8,0.72)';
    ctx.lineJoin = 'round';
    ctx.strokeText(text, x, y);
  }
  if (opts.shadow === true) {
    ctx.fillStyle = 'rgba(0,0,0,0.45)';
    ctx.fillText(text, x + 1, y + 1);
    ctx.fillStyle = opts.color || COLORS.text;
  }
  ctx.fillText(text, x, y);
  ctx.restore();
}

/** 像素状态条 */
function drawBar(ctx, x, y, w, h, ratio, color, bg) {
  drawPixelBar(ctx, x, y, w, h, ratio, color, bg);
}

/** 伪随机（种子） */
function seededRand(seed) {
  let s = seed | 0;
  return function () {
    s = (s * 16807 + 0) % 2147483647;
    if (s <= 0) s += 2147483646;
    return (s - 1) / 2147483646;
  };
}

/** 简易噪声 */
function noise2(x, y) {
  const n = Math.sin(x * 12.9898 + y * 78.233) * 43758.5453;
  return n - Math.floor(n);
}

/** 像素投影 */
function drawShadow(ctx, x, y, rx, ry) {
  drawPixelShadow(ctx, x, y, rx, ry);
}

/** 命中点检测 */
function hitTest(px, py, x, y, w, h) {
  return px >= x && px <= x + w && py >= y && py <= y + h;
}

function lerp(a, b, t) {
  return a + (b - a) * t;
}

function clamp(v, lo, hi) {
  return Math.max(lo, Math.min(hi, v));
}

function dist(ax, ay, bx, by) {
  const dx = ax - bx;
  const dy = ay - by;
  return Math.sqrt(dx * dx + dy * dy);
}

function wrapText(ctx, text, maxWidth) {
  const lines = [];
  let line = '';
  for (let i = 0; i < text.length; i++) {
    const ch = text[i];
    if (ch === '\n') {
      lines.push(line);
      line = '';
      continue;
    }
    const test = line + ch;
    if (ctx.measureText(test).width > maxWidth && line) {
      lines.push(line);
      line = ch;
    } else {
      line = test;
    }
  }
  if (line) lines.push(line);
  return lines;
}

module.exports = {
  TILE, COLORS, P, roundRect, drawPanel, drawButton, drawText, drawBar,
  seededRand, noise2, drawShadow, hitTest, lerp, clamp, dist, wrapText, animFrame
};
