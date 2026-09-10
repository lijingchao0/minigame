/**
 * 地皮瓦片 + 装饰物像素点阵（16×16 瓦片，装饰 16~32）
 */
const {
  blank, setPx, fillRect, fillEllipse, addOutline,
  getSprite, drawCached, drawPixelShadow
} = require('../pixelsprite.js');
const { P } = require('../palette.js');

// 索引
const I = {
  ink: 0, shadow: 1, shade: 2,
  woodDk: 3, woodMd: 4, woodLt: 5,
  soil: 7, soilLt: 8, sand: 9,
  mossDk: 10, moss: 11, mossLt: 12, leaf: 13,
  gold: 15, goldLt: 16, cream: 19,
  red: 28, pink: 29, blue: 30, purple: 31, cyan: 32, yellow: 33, white: 34, black: 35
};

const _tileCache = Object.create(null);
const _decorCache = Object.create(null);

/** 瓦片基色索引映射（对应 tilemap T.*） */
const TILE_BASE_IDX = {
  0: I.moss,      // GRASS
  1: I.mossLt,    // GRASS2
  2: I.soil,      // DIRT
  3: 13,          // STONE — will use special
  4: 30,          // WATER blue
  5: I.sand,      // SAND
  6: I.woodMd,    // NEST_FLOOR
  7: I.woodDk,    // NEST_WALL
  8: I.purple,    // MUSHROOM_FLOOR
  9: I.mossDk,    // DARK_GRASS
  10: I.soilLt,   // PATH
  11: I.moss,     // FLOWER_BED
  12: I.cyan,     // DEW
  13: I.black     // VOID
};

function paintTile(t, variant) {
  const g = blank(16, 16);
  const base = TILE_BASE_IDX[t] != null ? TILE_BASE_IDX[t] : I.moss;
  fillRect(g, 0, 0, 16, 16, base);

  if (t === 0 || t === 1 || t === 9) {
    // 极弱草叶
    if (variant === 1) {
      setPx(g, 4, 6, I.mossDk);
      setPx(g, 5, 5, I.mossDk);
      setPx(g, 10, 8, I.mossDk);
    } else if (variant === 2) {
      setPx(g, 7, 10, I.leaf);
      setPx(g, 12, 4, I.mossDk);
    }
  } else if (t === 3) {
    // 石
    fillRect(g, 0, 0, 16, 16, 13); // leaf index wrong — use shade tones
    // 手动石色：用 shadow/shade/cream 点
    for (let y = 0; y < 16; y++)
      for (let x = 0; x < 16; x++) setPx(g, x, y, I.shade);
    setPx(g, 3, 3, I.shadow);
    setPx(g, 4, 3, I.shadow);
    setPx(g, 8, 9, I.cream);
    setPx(g, 9, 9, I.cream);
  } else if (t === 4 || t === 12) {
    for (let y = 0; y < 16; y++)
      for (let x = 0; x < 16; x++) setPx(g, x, y, t === 12 ? I.cyan : I.blue);
    // 波纹条
    const wy = 6 + (variant % 3);
    for (let x = 2; x < 12; x++) setPx(g, x, wy, I.cream);
  } else if (t === 7) {
    for (let y = 0; y < 16; y++)
      for (let x = 0; x < 16; x++) setPx(g, x, y, I.woodDk);
    fillRect(g, 0, 0, 16, 3, I.ink);
    setPx(g, 3, 5, I.gold);
  } else if (t === 6) {
    for (let y = 0; y < 16; y++)
      for (let x = 0; x < 16; x++) setPx(g, x, y, I.woodMd);
    if (variant) setPx(g, 5, 5, I.woodDk);
  } else if (t === 10) {
    for (let y = 0; y < 16; y++)
      for (let x = 0; x < 16; x++) setPx(g, x, y, I.soilLt);
    setPx(g, 4, 4, I.soil);
    setPx(g, 11, 10, I.soil);
  } else if (t === 8) {
    for (let y = 0; y < 16; y++)
      for (let x = 0; x < 16; x++) setPx(g, x, y, I.purple);
    setPx(g, 6, 6, 31);
  }
  return g;
}

function getTileCanvas(t, variant, shadeMul) {
  // shadeMul 量化到 3 档，避免缓存爆炸
  const shade = shadeMul < 0.98 ? 0 : shadeMul > 1.02 ? 2 : 1;
  const key = 'tile:' + t + ':' + (variant | 0) + ':' + shade;
  if (_tileCache[key]) return _tileCache[key];
  const grid = paintTile(t, variant | 0);
  // 明暗：替换部分像素
  if (shade !== 1) {
    const target = shade === 0 ? I.shadow : I.mossLt;
    for (let i = 0; i < 8; i++) {
      const x = (i * 5) % 16;
      const y = (i * 7) % 16;
      if (grid.data[y * 16 + x] >= 0) grid.data[y * 16 + x] = target;
    }
  }
  const c = getSprite(key, grid, null, 1); // 1:1 瓦片
  _tileCache[key] = c;
  return c;
}

function drawPixelTile(ctx, t, sx, sy, variant, shadeMul) {
  const c = getTileCanvas(t, variant, shadeMul || 1);
  ctx.save();
  ctx.imageSmoothingEnabled = false;
  ctx.drawImage(c, Math.round(sx), Math.round(sy));
  ctx.restore();
}

// —— 装饰 ——
function paintDecor(type, variant, frame) {
  const g = blank(32, 32);
  switch (type) {
    case 'tree': {
      fillRect(g, 14, 16, 4, 12, I.woodDk);
      fillEllipse(g, 16, 12, 9, 8, I.moss);
      fillEllipse(g, 12, 16, 6, 5, I.mossLt);
      fillEllipse(g, 20, 16, 6, 5, I.moss);
      if (frame % 2) setPx(g, 24, 14, I.leaf);
      addOutline(g, I.ink);
      break;
    }
    case 'rock': {
      fillEllipse(g, 16, 22, 8, 4, I.shade);
      setPx(g, 12, 20, I.shadow);
      setPx(g, 18, 18, I.cream);
      addOutline(g, I.ink);
      break;
    }
    case 'flower': {
      const cols = [I.red, I.yellow, I.purple, I.blue, I.gold];
      setPx(g, 16, 24, I.moss);
      setPx(g, 16, 23, I.moss);
      setPx(g, 16, 22, I.moss);
      fillEllipse(g, 16, 20, 2.5, 2.5, cols[variant % cols.length]);
      setPx(g, 16, 20, I.yellow);
      break;
    }
    case 'bush': {
      fillEllipse(g, 12, 22, 6, 5, I.moss);
      fillEllipse(g, 20, 22, 6, 5, I.mossLt);
      fillEllipse(g, 16, 18, 5, 4, I.moss);
      if (variant % 2) {
        setPx(g, 14, 20, I.red);
        setPx(g, 19, 21, I.red);
      }
      addOutline(g, I.ink);
      break;
    }
    case 'mushroom': {
      fillRect(g, 15, 20, 3, 8, I.cream);
      fillEllipse(g, 16, 18, 7, 4, variant ? I.pink : I.red);
      if (variant) setPx(g, 16, 16, I.cyan);
      addOutline(g, I.ink);
      break;
    }
    case 'crystal': {
      setPx(g, 16, 12, I.cyan);
      setPx(g, 15, 14, I.blue);
      setPx(g, 16, 14, I.cyan);
      setPx(g, 17, 14, I.blue);
      setPx(g, 14, 16, I.blue);
      setPx(g, 15, 16, I.cyan);
      setPx(g, 16, 16, I.white);
      setPx(g, 17, 16, I.cyan);
      setPx(g, 18, 16, I.blue);
      setPx(g, 15, 18, I.blue);
      setPx(g, 16, 18, I.cyan);
      setPx(g, 17, 18, I.blue);
      setPx(g, 16, 20, I.blue);
      break;
    }
    case 'grass_tuft': {
      setPx(g, 14, 26, I.moss);
      setPx(g, 14, 24, I.mossLt);
      setPx(g, 13, 22, I.leaf);
      setPx(g, 16, 26, I.moss);
      setPx(g, 17, 24, I.moss);
      setPx(g, 18, 22, I.leaf);
      setPx(g, 15, 25, I.mossLt);
      setPx(g, 15, 23, I.leaf);
      break;
    }
    case 'egg': {
      fillEllipse(g, 16, 22, 4, 6, I.cream);
      setPx(g, 15, 20, I.white);
      addOutline(g, I.ink);
      break;
    }
    case 'storage': {
      fillRect(g, 10, 16, 12, 10, I.woodMd);
      fillRect(g, 10, 14, 12, 3, I.woodLt);
      fillRect(g, 14, 18, 4, 5, I.gold);
      addOutline(g, I.ink);
      break;
    }
    case 'throne': {
      fillRect(g, 8, 20, 16, 6, I.gold);
      fillRect(g, 6, 10, 4, 16, I.gold);
      fillRect(g, 22, 10, 4, 16, I.gold);
      fillRect(g, 12, 16, 8, 6, I.red);
      addOutline(g, I.ink);
      break;
    }
    case 'portal_marker': {
      fillEllipse(g, 16, 16, 6 + (frame % 2), 6, I.gold);
      fillEllipse(g, 16, 16, 3, 3, I.goldLt);
      break;
    }
    case 'spring': {
      fillEllipse(g, 16, 18, 8, 6, I.cyan);
      fillEllipse(g, 16, 18, 5, 4, I.blue);
      setPx(g, 14, 16, I.white);
      break;
    }
    case 'shrine': {
      fillRect(g, 12, 18, 8, 8, I.woodDk);
      fillRect(g, 10, 16, 12, 3, I.woodMd);
      setPx(g, 16, 14, I.gold);
      setPx(g, 16, 12, I.goldLt);
      addOutline(g, I.ink);
      break;
    }
    case 'sign': {
      fillRect(g, 15, 18, 2, 10, I.woodDk);
      fillRect(g, 10, 14, 12, 6, I.woodLt);
      setPx(g, 13, 16, I.ink);
      setPx(g, 16, 16, I.ink);
      addOutline(g, I.ink);
      break;
    }
    default:
      setPx(g, 16, 16, I.moss);
  }
  return g;
}

function drawPixelDecor(ctx, type, x, y, variant, frame, opts) {
  opts = opts || {};
  const id = 'decor:' + type + ':' + (variant | 0) + ':' + ((frame | 0) % 2);
  if (!_decorCache[id]) {
    const grid = paintDecor(type, variant | 0, frame | 0);
    _decorCache[id] = getSprite(id, grid, null, 1);
  }
  if (type !== 'grass_tuft' && type !== 'flower' && type !== 'portal_marker') {
    drawPixelShadow(ctx, x, y + 2, 6, 2);
  }
  drawCached(ctx, _decorCache[id], x, y, { ax: 0.5, ay: 0.9, alpha: opts.alpha });
}

module.exports = {
  drawPixelTile, drawPixelDecor, getTileCanvas, paintTile, paintDecor, P
};
