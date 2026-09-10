/**
 * 瓦片地图 — 图层 / 碰撞 / 视锥渲染 / 像素装饰
 */
const { TILE, noise2, seededRand } = require('../pix.js');
const { drawPixelTile, drawPixelDecor } = require('../gfx/sprites/tiles.js');

// 瓦片类型
const T = {
  GRASS: 0,
  GRASS2: 1,
  DIRT: 2,
  STONE: 3,
  WATER: 4,
  SAND: 5,
  NEST_FLOOR: 6,
  NEST_WALL: 7,
  MUSHROOM_FLOOR: 8,
  DARK_GRASS: 9,
  PATH: 10,
  FLOWER_BED: 11,
  DEW: 12, // 浅水/露珠
  VOID: 13
};

const SOLID = {
  [T.STONE]: true,
  [T.WATER]: true,
  [T.NEST_WALL]: true,
  [T.VOID]: true
};

function createTilemap(cols, rows, seed) {
  const rand = seededRand(seed || 1);
  const tiles = new Uint8Array(cols * rows);
  const decor = []; // {type, x, y, variant, ...}
  const portals = []; // {tx, ty, toRegion, toX, toY, label}

  function idx(x, y) { return y * cols + x; }

  function set(x, y, t) {
    if (x >= 0 && y >= 0 && x < cols && y < rows) tiles[idx(x, y)] = t;
  }

  function get(x, y) {
    if (x < 0 || y < 0 || x >= cols || y >= rows) return T.VOID;
    return tiles[idx(x, y)];
  }

  function fill(t) {
    for (let i = 0; i < tiles.length; i++) tiles[i] = t;
  }

  function fillRect(x, y, w, h, t) {
    for (let j = y; j < y + h; j++)
      for (let i = x; i < x + w; i++) set(i, j, t);
  }

  function ellipse(cx, cy, rx, ry, t) {
    for (let j = cy - ry; j <= cy + ry; j++)
      for (let i = cx - rx; i <= cx + rx; i++) {
        const dx = (i - cx) / rx;
        const dy = (j - cy) / ry;
        if (dx * dx + dy * dy <= 1) set(i, j, t);
      }
  }

  function border(t, thickness) {
    thickness = thickness || 1;
    for (let k = 0; k < thickness; k++) {
      for (let i = 0; i < cols; i++) { set(i, k, t); set(i, rows - 1 - k, t); }
      for (let j = 0; j < rows; j++) { set(k, j, t); set(cols - 1 - k, j, t); }
    }
  }

  function isSolidAt(wx, wy) {
    const tx = Math.floor(wx / TILE);
    const ty = Math.floor(wy / TILE);
    return !!SOLID[get(tx, ty)];
  }

  function isSolidTile(tx, ty) {
    return !!SOLID[get(tx, ty)];
  }

  function addDecor(type, x, y, extra) {
    decor.push(Object.assign({ type, x, y, variant: (rand() * 4) | 0 }, extra || {}));
  }

  function addPortal(tx, ty, toRegion, toX, toY, label) {
    portals.push({ tx, ty, toRegion, toX, toY, label: label || '' });
    // 标记路径瓦片便于识别
    set(tx, ty, T.PATH);
  }

  function getPortalAt(wx, wy) {
    const tx = Math.floor(wx / TILE);
    const ty = Math.floor(wy / TILE);
    for (let i = 0; i < portals.length; i++) {
      const p = portals[i];
      if (Math.abs(p.tx - tx) <= 1 && Math.abs(p.ty - ty) <= 1) return p;
    }
    return null;
  }

  // —— 渲染：同种地皮统一基色 + 极弱区域明暗（3%~5%），消除马赛克斑块 ——
  const TILE_BASE = {
    [T.GRASS]: [79, 154, 72],
    [T.GRASS2]: [74, 148, 68],
    [T.DIRT]: [160, 122, 40],
    [T.STONE]: [110, 110, 110],
    [T.WATER]: [58, 126, 174],
    [T.SAND]: [194, 178, 128],
    [T.NEST_FLOOR]: [100, 74, 58],
    [T.NEST_WALL]: [58, 40, 24],
    [T.MUSHROOM_FLOOR]: [66, 52, 82],
    [T.DARK_GRASS]: [42, 90, 42],
    [T.PATH]: [176, 144, 80],
    [T.FLOWER_BED]: [90, 154, 72],
    [T.DEW]: [106, 172, 200],
    [T.VOID]: [34, 34, 34]
  };

  function shadeRgb(rgb, mul) {
    return 'rgb(' +
      Math.max(0, Math.min(255, (rgb[0] * mul) | 0)) + ',' +
      Math.max(0, Math.min(255, (rgb[1] * mul) | 0)) + ',' +
      Math.max(0, Math.min(255, (rgb[2] * mul) | 0)) + ')';
  }

  /** 低频区域明暗：同区域平滑，对比度约 ±4% */
  function regionShade(tx, ty) {
    const n = noise2(tx * 0.045, ty * 0.045);
    return 0.96 + n * 0.08; // 0.96~1.04
  }

  function tileColor(t, tx, ty) {
    const base = TILE_BASE[t] || TILE_BASE[T.VOID];
    return shadeRgb(base, regionShade(tx, ty));
  }

  /** 邻接异种地皮时画极淡过渡边，柔化拼缝 */
  function blendEdge(ctx, t, sx, sy, tx, ty) {
    const dirs = [[1, 0], [-1, 0], [0, 1], [0, -1]];
    for (let i = 0; i < dirs.length; i++) {
      const nt = get(tx + dirs[i][0], ty + dirs[i][1]);
      if (nt === t || nt === T.VOID) continue;
      const nb = TILE_BASE[nt];
      if (!nb) continue;
      ctx.fillStyle = shadeRgb(nb, regionShade(tx, ty) * 0.55);
      ctx.globalAlpha = 0.22;
      if (dirs[i][0] === 1) ctx.fillRect(sx + TILE - 3, sy, 3.5, TILE);
      else if (dirs[i][0] === -1) ctx.fillRect(sx, sy, 3.5, TILE);
      else if (dirs[i][1] === 1) ctx.fillRect(sx, sy + TILE - 3, TILE, 3.5);
      else ctx.fillRect(sx, sy, TILE, 3.5);
      ctx.globalAlpha = 1;
    }
  }

  function drawTile(ctx, t, sx, sy, tx, ty, time) {
    const variant = (noise2(tx, ty) * 4) | 0;
    const shade = regionShade(tx, ty);
    drawPixelTile(ctx, t, sx, sy, variant, shade);
    // 邻接过渡（像素条）
    blendEdge(ctx, t, sx, sy, tx, ty);
    // 水面波纹动画帧
    if (t === T.WATER || t === T.DEW) {
      const wave = Math.floor(time * 2 + tx * 0.5 + ty * 0.3) % 3;
      ctx.fillStyle = 'rgba(245,230,200,0.22)';
      ctx.fillRect(Math.round(sx + 2 + wave), Math.round(sy + 6 + wave), 8, 1);
      ctx.fillRect(Math.round(sx + 5), Math.round(sy + 10 - wave), 6, 1);
    }
  }

  function drawDecor(ctx, d, cam, time) {
    const sp = cam.worldToScreen(d.x, d.y);
    if (!cam.inView(d.x, d.y, 40)) return;
    const frame = Math.floor(time * 3 + d.x * 0.1) % 2;
    let type = d.type;
    if (type === 'bush' && d.hasBerry) {
      // variant 奇数带浆果
      drawPixelDecor(ctx, type, sp.x, sp.y, 1, frame);
      return;
    }
    if (type === 'mushroom' && d.glow) {
      drawPixelDecor(ctx, type, sp.x, sp.y, 1, frame);
      // 发光底
      ctx.save();
      ctx.globalAlpha = 0.25 + Math.sin(time * 3) * 0.1;
      ctx.fillStyle = '#e74c9a';
      const r = Math.round(8 + Math.sin(time * 3));
      ctx.fillRect(Math.round(sp.x - r), Math.round(sp.y - 14 - r), r * 2, r * 2);
      ctx.restore();
      return;
    }
    if (type === 'portal_marker') {
      const bob = Math.sin(time * 2.5) * 2;
      drawPixelDecor(ctx, type, sp.x, sp.y + bob, 0, frame);
      return;
    }
    // 树叶轻摇：交替帧
    drawPixelDecor(ctx, type, sp.x, sp.y, d.variant || 0, frame);
  }

  function render(ctx, cam, time) {
    const o = cam.getOffset();
    const x0 = Math.max(0, Math.floor(o.x / TILE) - 1);
    const y0 = Math.max(0, Math.floor(o.y / TILE) - 1);
    const x1 = Math.min(cols - 1, Math.ceil((o.x + cam.viewW) / TILE) + 1);
    const y1 = Math.min(rows - 1, Math.ceil((o.y + cam.viewH) / TILE) + 1);

    for (let ty = y0; ty <= y1; ty++) {
      for (let tx = x0; tx <= x1; tx++) {
        const t = get(tx, ty);
        const sx = tx * TILE - o.x;
        const sy = ty * TILE - o.y;
        drawTile(ctx, t, sx, sy, tx, ty, time);
      }
    }

    // 装饰按 y 粗略排序（与实体一起由上层做深度排序更佳，这里先画）
    for (let i = 0; i < decor.length; i++) {
      drawDecor(ctx, decor[i], cam, time);
    }

    // 传送点标记
    for (let i = 0; i < portals.length; i++) {
      const p = portals[i];
      drawDecor(ctx, {
        type: 'portal_marker',
        x: p.tx * TILE + TILE / 2,
        y: p.ty * TILE + TILE / 2
      }, cam, time);
    }
  }

  return {
    cols, rows, tiles, decor, portals, TILE,
    T, SOLID, get, set, fill, fillRect, ellipse, border,
    isSolidAt, isSolidTile, addDecor, addPortal, getPortalAt,
    render, rand,
    pixelW() { return cols * TILE; },
    pixelH() { return rows * TILE; }
  };
}

module.exports = { createTilemap, T, SOLID, TILE };
