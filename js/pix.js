/**
 * 像素绘制工具 — 统一像素风格渲染
 */
const TILE = 16; // 设计瓦片大小（像素）

const COLORS = {
  // 地表提亮，暗部减淡
  grass: ['#4f9a48', '#5aad52', '#459440', '#56a34c', '#3d8538'],
  dirt: ['#a07a28', '#8f6c1c', '#b08930'],
  stone: ['#7e7e7e', '#6e6e6e', '#8e8e8e', '#5e5e5e'],
  water: ['#3a7eae', '#4a8ebe', '#2a6e9e', '#5a9ece'],
  nest: ['#6e5040', '#5c4232', '#7a5a42', '#4e3828'],
  wood: ['#9a6a38', '#7a5428', '#b07a42'],
  gold: '#e8bc3a',
  // UI：稍亮深棕/蓝灰，对比更清晰
  panel: 'rgba(48, 42, 36, 0.9)',
  panelBorder: '#a88840',
  text: '#fff6e0',
  textDim: '#c8b090',
  hp: '#d94a3a',
  mp: '#3a90c8',
  xp: '#36c070',
  danger: '#e74c3c',
  night: 'rgba(15, 22, 48, 0.28)',
  dusk: 'rgba(90, 50, 30, 0.18)',
  dawn: 'rgba(255, 190, 120, 0.1)'
};

/** 填充圆角矩形 */
function roundRect(ctx, x, y, w, h, r) {
  const rr = Math.min(r, w / 2, h / 2);
  ctx.beginPath();
  ctx.moveTo(x + rr, y);
  ctx.arcTo(x + w, y, x + w, y + h, rr);
  ctx.arcTo(x + w, y + h, x, y + h, rr);
  ctx.arcTo(x, y + h, x, y, rr);
  ctx.arcTo(x, y, x + w, y, rr);
  ctx.closePath();
}

/** 绘制木质风格面板 */
function drawPanel(ctx, x, y, w, h, opts) {
  opts = opts || {};
  const r = opts.radius != null ? opts.radius : 8;
  ctx.save();
  roundRect(ctx, x, y, w, h, r);
  ctx.fillStyle = opts.fill || COLORS.panel;
  ctx.fill();
  if (opts.border !== false) {
    ctx.strokeStyle = opts.borderColor || COLORS.panelBorder;
    ctx.lineWidth = opts.borderWidth || 2;
    ctx.stroke();
  }
  // 金色内描边标题感
  if (opts.gold) {
    roundRect(ctx, x + 3, y + 3, w - 6, h - 6, Math.max(0, r - 2));
    ctx.strokeStyle = COLORS.gold;
    ctx.lineWidth = 1;
    ctx.stroke();
  }
  ctx.restore();
}

/** 木质按钮 */
function drawButton(ctx, x, y, w, h, label, opts) {
  opts = opts || {};
  const pressed = opts.pressed;
  const disabled = opts.disabled;
  ctx.save();
  roundRect(ctx, x, y + (pressed ? 1 : 0), w, h, 6);
  ctx.fillStyle = disabled ? '#4a3a28' : pressed ? '#6b4a20' : '#8b5a2b';
  ctx.fill();
  ctx.strokeStyle = disabled ? '#3a2a18' : '#c9a227';
  ctx.lineWidth = 1.5;
  ctx.stroke();
  // 高光
  if (!disabled && !pressed) {
    ctx.fillStyle = 'rgba(255,220,150,0.15)';
    roundRect(ctx, x + 2, y + 2, w - 4, h * 0.4, 4);
    ctx.fill();
  }
  ctx.fillStyle = disabled ? '#887766' : COLORS.text;
  ctx.font = opts.font || 'bold 13px "PingFang SC","Microsoft YaHei",sans-serif';
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  ctx.fillText(label, x + w / 2, y + h / 2 + (pressed ? 1 : 0));
  ctx.restore();
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

/** 进度条 */
function drawBar(ctx, x, y, w, h, ratio, color, bg) {
  ratio = Math.max(0, Math.min(1, ratio));
  ctx.save();
  roundRect(ctx, x, y, w, h, h / 2);
  ctx.fillStyle = bg || 'rgba(0,0,0,0.45)';
  ctx.fill();
  if (ratio > 0) {
    roundRect(ctx, x, y, Math.max(h, w * ratio), h, h / 2);
    ctx.fillStyle = color;
    ctx.fill();
  }
  ctx.strokeStyle = 'rgba(255,255,255,0.2)';
  ctx.lineWidth = 1;
  roundRect(ctx, x, y, w, h, h / 2);
  ctx.stroke();
  ctx.restore();
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

/** 椭圆阴影（减淡） */
function drawShadow(ctx, x, y, rx, ry) {
  ctx.save();
  ctx.fillStyle = 'rgba(0,0,0,0.18)';
  ctx.beginPath();
  ctx.ellipse(x, y, rx, ry || rx * 0.45, 0, 0, Math.PI * 2);
  ctx.fill();
  ctx.restore();
}

/** 命中点检测 */
function hitTest(px, py, x, y, w, h) {
  return px >= x && px <= x + w && py >= y && py <= y + h;
}

/** 缓动 */
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
  TILE, COLORS, roundRect, drawPanel, drawButton, drawText, drawBar,
  seededRand, noise2, drawShadow, hitTest, lerp, clamp, dist, wrapText
};
