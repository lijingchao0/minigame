/**
 * 像素点阵精灵系统 — 预渲染缓存 + 锐利缩放
 * 精灵以字符串行 / 二维索引定义，. = 透明
 * 每帧只 drawImage，禁止逐像素 fillRect 重画
 */

const { INDEX, charIndex, byIndex, P } = require('./palette.js');

/** 离屏画布（微信 / 浏览器双路径） */
function createOffscreen(w, h) {
  if (typeof wx !== 'undefined' && wx.createCanvas) {
    const c = wx.createCanvas();
    c.width = w;
    c.height = h;
    return c;
  }
  if (typeof document !== 'undefined' && document.createElement) {
    const c = document.createElement('canvas');
    c.width = w;
    c.height = h;
    return c;
  }
  // Node 语法检查回退：最小 stub（无真实绘制）
  return {
    width: w,
    height: h,
    getContext() {
      return {
        fillStyle: '',
        clearRect() {},
        fillRect() {},
        drawImage() {},
        getImageData() { return { data: new Uint8ClampedArray(w * h * 4) }; },
        putImageData() {},
        imageSmoothingEnabled: false
      };
    }
  };
}

/**
 * 解析字符串点阵 → { w, h, data: Int16Array }（-1 透明）
 * rows: ["..11..", "..22.."]
 */
function parseGrid(rows) {
  const h = rows.length;
  const w = rows.reduce((m, r) => Math.max(m, r.length), 0);
  const data = new Int16Array(w * h);
  data.fill(-1);
  for (let y = 0; y < h; y++) {
    const row = rows[y];
    for (let x = 0; x < row.length; x++) {
      data[y * w + x] = charIndex(row[x]);
    }
  }
  return { w, h, data };
}

/** 从二维数字数组创建（-1 透明，或 palette 索引） */
function fromMatrix(matrix) {
  const h = matrix.length;
  const w = matrix[0] ? matrix[0].length : 0;
  const data = new Int16Array(w * h);
  for (let y = 0; y < h; y++) {
    for (let x = 0; x < w; x++) {
      const v = matrix[y][x];
      data[y * w + x] = v == null ? -1 : v;
    }
  }
  return { w, h, data };
}

/** 空白网格 */
function blank(w, h) {
  const data = new Int16Array(w * h);
  data.fill(-1);
  return { w, h, data };
}

function setPx(grid, x, y, idx) {
  if (x < 0 || y < 0 || x >= grid.w || y >= grid.h) return;
  grid.data[y * grid.w + x] = idx;
}

function getPx(grid, x, y) {
  if (x < 0 || y < 0 || x >= grid.w || y >= grid.h) return -1;
  return grid.data[y * grid.w + x];
}

/** 矩形填充 */
function fillRect(grid, x, y, w, h, idx) {
  for (let j = 0; j < h; j++)
    for (let i = 0; i < w; i++) setPx(grid, x + i, y + j, idx);
}

/** 像素椭圆（硬边，写入网格） */
function fillEllipse(grid, cx, cy, rx, ry, idx) {
  const rx2 = rx * rx || 0.25;
  const ry2 = ry * ry || 0.25;
  for (let y = Math.floor(cy - ry); y <= Math.ceil(cy + ry); y++) {
    for (let x = Math.floor(cx - rx); x <= Math.ceil(cx + rx); x++) {
      const dx = x - cx;
      const dy = y - cy;
      if ((dx * dx) / rx2 + (dy * dy) / ry2 <= 1.05) setPx(grid, x, y, idx);
    }
  }
}

/** 1px 深色轮廓（仅对非透明像素的透明邻接加描边） */
function addOutline(grid, outlineIdx) {
  outlineIdx = outlineIdx == null ? 0 : outlineIdx;
  const { w, h, data } = grid;
  const mark = [];
  for (let y = 0; y < h; y++) {
    for (let x = 0; x < w; x++) {
      if (data[y * w + x] >= 0) continue;
      let border = false;
      for (let dy = -1; dy <= 1 && !border; dy++) {
        for (let dx = -1; dx <= 1; dx++) {
          if (!dx && !dy) continue;
          const nx = x + dx;
          const ny = y + dy;
          if (nx < 0 || ny < 0 || nx >= w || ny >= h) continue;
          if (data[ny * w + nx] >= 0 && data[ny * w + nx] !== outlineIdx) {
            border = true;
            break;
          }
        }
      }
      if (border) mark.push(y * w + x);
    }
  }
  for (let i = 0; i < mark.length; i++) data[mark[i]] = outlineIdx;
  return grid;
}

/** 左右镜像 */
function mirrorH(grid) {
  const out = blank(grid.w, grid.h);
  for (let y = 0; y < grid.h; y++) {
    for (let x = 0; x < grid.w; x++) {
      setPx(out, grid.w - 1 - x, y, getPx(grid, x, y));
    }
  }
  return out;
}

/** 调色板替换：map { fromIdx: toIdx } */
function remap(grid, map) {
  const out = blank(grid.w, grid.h);
  for (let i = 0; i < grid.data.length; i++) {
    const v = grid.data[i];
    if (v < 0) out.data[i] = -1;
    else out.data[i] = map[v] != null ? map[v] : v;
  }
  return out;
}

/** 用颜色数组替换默认 INDEX（palette 为 hex 数组，与索引对齐） */
function resolvePalette(palette) {
  if (!palette) return INDEX;
  return palette;
}

// —— 预渲染缓存 ——
const _cache = Object.create(null);

function cacheKey(id, scale, flip, flash) {
  return id + '|s' + scale + (flip ? '|f' : '') + (flash ? '|w' : '');
}

/**
 * 将点阵渲染为离屏 canvas（整数 scale，关闭平滑）
 * @param {object} sprite {w,h,data} 或已 parse 的网格
 * @param {string[]} [palette] 颜色表
 * @param {number} [scale=1]
 * @returns {HTMLCanvasElement}
 */
function renderToCanvas(sprite, palette, scale) {
  scale = scale | 0;
  if (scale < 1) scale = 1;
  const pal = resolvePalette(palette);
  const w = sprite.w * scale;
  const h = sprite.h * scale;
  const c = createOffscreen(w, h);
  const ctx = c.getContext('2d');
  ctx.imageSmoothingEnabled = false;
  ctx.clearRect(0, 0, w, h);
  // 用 ImageData 一次写入，避免逐格 fillRect
  const img = ctx.createImageData ? ctx.createImageData(w, h) : null;
  if (img) {
    const d = img.data;
    for (let y = 0; y < sprite.h; y++) {
      for (let x = 0; x < sprite.w; x++) {
        const idx = sprite.data[y * sprite.w + x];
        if (idx < 0) continue;
        const hex = pal[idx] || byIndex(idx);
        if (!hex) continue;
        const rgb = hexToRgb(hex);
        for (let sy = 0; sy < scale; sy++) {
          for (let sx = 0; sx < scale; sx++) {
            const p = ((y * scale + sy) * w + (x * scale + sx)) * 4;
            d[p] = rgb[0];
            d[p + 1] = rgb[1];
            d[p + 2] = rgb[2];
            d[p + 3] = 255;
          }
        }
      }
    }
    ctx.putImageData(img, 0, 0);
  } else {
    for (let y = 0; y < sprite.h; y++) {
      for (let x = 0; x < sprite.w; x++) {
        const idx = sprite.data[y * sprite.w + x];
        if (idx < 0) continue;
        const hex = pal[idx] || byIndex(idx);
        if (!hex) continue;
        ctx.fillStyle = hex;
        ctx.fillRect(x * scale, y * scale, scale, scale);
      }
    }
  }
  return c;
}

function hexToRgb(hex) {
  if (!hex || hex[0] !== '#') return [0, 0, 0];
  const n = hex.length === 4
    ? parseInt(hex[1] + hex[1] + hex[2] + hex[2] + hex[3] + hex[3], 16)
    : parseInt(hex.slice(1), 16);
  return [(n >> 16) & 255, (n >> 8) & 255, n & 255];
}

/**
 * 获取缓存的预渲染精灵
 * @param {string} id 唯一键
 * @param {object|string[]} spriteData 网格或字符串行
 * @param {string[]} [palette]
 * @param {number} [scale=2]
 */
function getSprite(id, spriteData, palette, scale) {
  scale = scale == null ? 2 : scale;
  const key = cacheKey(id, scale, false, false);
  if (_cache[key]) return _cache[key];
  const grid = Array.isArray(spriteData) ? parseGrid(spriteData) : spriteData;
  const canvas = renderToCanvas(grid, palette, scale);
  _cache[key] = canvas;
  return canvas;
}

/** 闪白版本（受击） */
function getFlashSprite(id, spriteData, scale) {
  scale = scale == null ? 2 : scale;
  const key = cacheKey(id, scale, false, true);
  if (_cache[key]) return _cache[key];
  const grid = Array.isArray(spriteData) ? parseGrid(spriteData) : spriteData;
  const whitePal = INDEX.map(() => P.white);
  const canvas = renderToCanvas(grid, whitePal, scale);
  _cache[key] = canvas;
  return canvas;
}

/**
 * 绘制预渲染精灵（中心锚点默认在脚底中心偏上）
 * ax/ay: 锚点相对精灵左上的比例，默认 0.5 / 1.0（脚底）
 */
function drawCached(ctx, canvas, x, y, opts) {
  opts = opts || {};
  if (!canvas) return;
  const ax = opts.ax != null ? opts.ax : 0.5;
  const ay = opts.ay != null ? opts.ay : 0.85;
  let dw = canvas.width;
  let dh = canvas.height;
  if (opts.scale && opts.scale !== 1) {
    dw = Math.round(canvas.width * opts.scale);
    dh = Math.round(canvas.height * opts.scale);
  }
  const dx = Math.round(x - dw * ax);
  const dy = Math.round(y - dh * ay);
  ctx.save();
  if (opts.alpha != null) ctx.globalAlpha = opts.alpha;
  ctx.imageSmoothingEnabled = false;
  if (opts.flip) {
    ctx.translate(Math.round(x), 0);
    ctx.scale(-1, 1);
    ctx.drawImage(canvas, Math.round(-dw * ax), dy, dw, dh);
  } else {
    ctx.drawImage(canvas, dx, dy, dw, dh);
  }
  ctx.restore();
}

/** 像素投影（脚下压扁椭圆，点阵） */
const _shadowCache = Object.create(null);
function drawPixelShadow(ctx, x, y, rx, ry) {
  rx = Math.max(2, Math.round(rx));
  ry = Math.max(1, Math.round(ry || rx * 0.4));
  const key = rx + 'x' + ry;
  let c = _shadowCache[key];
  if (!c) {
    const g = blank(rx * 2 + 2, ry * 2 + 2);
    fillEllipse(g, rx + 0.5, ry + 0.5, rx, ry, 1); // shadow
    // 半透明：单独渲染为深色
    c = createOffscreen(g.w, g.h);
    const cctx = c.getContext('2d');
    cctx.imageSmoothingEnabled = false;
    cctx.fillStyle = 'rgba(0,0,0,0.28)';
    for (let j = 0; j < g.h; j++) {
      for (let i = 0; i < g.w; i++) {
        if (g.data[j * g.w + i] >= 0) cctx.fillRect(i, j, 1, 1);
      }
    }
    _shadowCache[key] = c;
  }
  ctx.save();
  ctx.imageSmoothingEnabled = false;
  ctx.drawImage(c, Math.round(x - c.width / 2), Math.round(y - c.height / 2));
  ctx.restore();
}

/** 帧动画：按 fps 取帧 */
function animFrame(t, fps, count) {
  const f = Math.floor(t * fps) % count;
  return f < 0 ? f + count : f;
}

/** 清空缓存（热重载用） */
function clearCache() {
  for (const k of Object.keys(_cache)) delete _cache[k];
  for (const k of Object.keys(_shadowCache)) delete _shadowCache[k];
}

/**
 * 九宫格面板：用 中心色块 + 边框像素风格绘制
 * 不依赖图片，用点阵边框规则
 */
function drawNineSlicePanel(ctx, x, y, w, h, style) {
  style = style || {};
  const fill = style.fill || P.woodDk;
  const border = style.border || P.gold;
  const inner = style.inner || P.woodMd;
  const bevel = style.bevel !== false;
  x = Math.round(x);
  y = Math.round(y);
  w = Math.round(w);
  h = Math.round(h);
  ctx.save();
  ctx.imageSmoothingEnabled = false;
  // 外框（像素斜角：四角切 2px）
  ctx.fillStyle = border;
  ctx.fillRect(x + 2, y, w - 4, h);
  ctx.fillRect(x, y + 2, w, h - 4);
  ctx.fillRect(x + 1, y + 1, w - 2, h - 2);
  // 内填
  ctx.fillStyle = fill;
  ctx.fillRect(x + 3, y + 3, w - 6, h - 6);
  // 内金边
  if (style.gold) {
    ctx.fillStyle = P.goldDk;
    ctx.fillRect(x + 4, y + 4, w - 8, 1);
    ctx.fillRect(x + 4, y + h - 5, w - 8, 1);
    ctx.fillRect(x + 4, y + 4, 1, h - 8);
    ctx.fillRect(x + w - 5, y + 4, 1, h - 8);
  }
  // 顶高光
  if (bevel) {
    ctx.fillStyle = 'rgba(255,230,180,0.12)';
    ctx.fillRect(x + 4, y + 4, w - 8, 3);
    ctx.fillStyle = 'rgba(0,0,0,0.18)';
    ctx.fillRect(x + 4, y + h - 6, w - 8, 2);
  }
  // 木纹细线
  if (style.wood !== false) {
    ctx.fillStyle = 'rgba(0,0,0,0.08)';
    for (let i = 10; i < h - 8; i += 5) {
      ctx.fillRect(x + 5, y + i, w - 10, 1);
    }
  }
  ctx.restore();
}

/** 像素按钮三态 */
function drawPixelButton(ctx, x, y, w, h, label, opts) {
  opts = opts || {};
  const pressed = opts.pressed;
  const disabled = opts.disabled;
  const hi = opts.highlight;
  x = Math.round(x);
  y = Math.round(y) + (pressed ? 1 : 0);
  w = Math.round(w);
  h = Math.round(h);
  const border = disabled ? P.shade : (hi ? P.goldLt : P.gold);
  const fill = disabled ? P.shadow : pressed ? P.woodDk : hi ? P.woodLt : P.woodMd;
  ctx.save();
  ctx.imageSmoothingEnabled = false;
  ctx.fillStyle = border;
  ctx.fillRect(x + 1, y, w - 2, h);
  ctx.fillRect(x, y + 1, w, h - 2);
  ctx.fillStyle = fill;
  ctx.fillRect(x + 2, y + 2, w - 4, h - 4);
  if (!disabled && !pressed) {
    ctx.fillStyle = 'rgba(255,220,150,0.2)';
    ctx.fillRect(x + 2, y + 2, w - 4, Math.max(2, (h / 3) | 0));
  }
  // 底阴影条
  ctx.fillStyle = 'rgba(0,0,0,0.25)';
  ctx.fillRect(x + 2, y + h - 3, w - 4, 1);
  // 文字（内联，避免与 pix.js 循环依赖）
  const lx = x + w / 2;
  const ly = y + h / 2;
  ctx.font = opts.font || 'bold 12px "PingFang SC","Microsoft YaHei",sans-serif';
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  ctx.lineWidth = 2.5;
  ctx.strokeStyle = 'rgba(20,14,8,0.72)';
  ctx.lineJoin = 'round';
  ctx.strokeText(label, lx, ly);
  ctx.fillStyle = disabled ? '#887766' : P.ivory;
  ctx.fillText(label, lx, ly);
  ctx.restore();
}

/** 像素状态条 */
function drawPixelBar(ctx, x, y, w, h, ratio, color, bg) {
  ratio = Math.max(0, Math.min(1, ratio));
  x = Math.round(x);
  y = Math.round(y);
  w = Math.round(w);
  h = Math.max(4, Math.round(h));
  ctx.save();
  ctx.imageSmoothingEnabled = false;
  ctx.fillStyle = P.ink;
  ctx.fillRect(x, y, w, h);
  ctx.fillStyle = bg || 'rgba(0,0,0,0.55)';
  ctx.fillRect(x + 1, y + 1, w - 2, h - 2);
  const fw = Math.max(0, Math.floor((w - 2) * ratio));
  if (fw > 0) {
    ctx.fillStyle = color;
    ctx.fillRect(x + 1, y + 1, fw, h - 2);
    // 高光
    ctx.fillStyle = 'rgba(255,255,255,0.28)';
    ctx.fillRect(x + 1, y + 1, fw, Math.max(1, ((h - 2) / 3) | 0));
  }
  // 金边
  ctx.fillStyle = P.goldDk;
  ctx.fillRect(x, y, w, 1);
  ctx.fillRect(x, y + h - 1, w, 1);
  ctx.fillRect(x, y, 1, h);
  ctx.fillRect(x + w - 1, y, 1, h);
  ctx.restore();
}

module.exports = {
  createOffscreen,
  parseGrid,
  fromMatrix,
  blank,
  setPx,
  getPx,
  fillRect,
  fillEllipse,
  addOutline,
  mirrorH,
  remap,
  renderToCanvas,
  getSprite,
  getFlashSprite,
  drawCached,
  drawPixelShadow,
  animFrame,
  clearCache,
  drawNineSlicePanel,
  drawPixelButton,
  drawPixelBar,
  hexToRgb
};
