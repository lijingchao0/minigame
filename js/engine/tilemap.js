/**
 * 瓦片地图 — 图层 / 碰撞 / 视锥渲染 / 装饰
 */
const { TILE, COLORS, noise2, seededRand, drawShadow } = require('../pix.js');

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

  // —— 渲染 ——
  function tileColor(t, tx, ty) {
    const n = noise2(tx * 0.37, ty * 0.41);
    switch (t) {
      case T.GRASS: return COLORS.grass[(n * COLORS.grass.length) | 0];
      case T.GRASS2: return COLORS.grass[((n * 3 + 1) | 0) % COLORS.grass.length];
      case T.DIRT: return COLORS.dirt[(n * COLORS.dirt.length) | 0];
      case T.STONE: return COLORS.stone[(n * COLORS.stone.length) | 0];
      case T.WATER: return COLORS.water[(n * COLORS.water.length) | 0];
      case T.SAND: return n > 0.5 ? '#c2b280' : '#b8a66a';
      case T.NEST_FLOOR: return COLORS.nest[(n * COLORS.nest.length) | 0];
      case T.NEST_WALL: return '#2a1a12';
      case T.MUSHROOM_FLOOR: return n > 0.5 ? '#3a2a4a' : '#2a1a3a';
      case T.DARK_GRASS: return n > 0.5 ? '#1a3a1a' : '#143014';
      case T.PATH: return '#9a7a40';
      case T.FLOWER_BED: return '#4a7a3a';
      case T.DEW: return '#5a9aba';
      default: return '#111';
    }
  }

  function drawTile(ctx, t, sx, sy, tx, ty, time) {
    ctx.fillStyle = tileColor(t, tx, ty);
    ctx.fillRect(sx, sy, TILE + 0.5, TILE + 0.5);

    // 细节
    if (t === T.GRASS || t === T.GRASS2 || t === T.DARK_GRASS) {
      const n = noise2(tx, ty + 9);
      if (n > 0.7) {
        ctx.fillStyle = 'rgba(20,60,20,0.35)';
        ctx.fillRect(sx + 4, sy + 6, 2, 5);
        ctx.fillRect(sx + 10, sy + 4, 2, 6);
      }
    }
    if (t === T.WATER || t === T.DEW) {
      const wave = Math.sin(time * 2 + tx * 0.5 + ty * 0.3) * 2;
      ctx.fillStyle = 'rgba(180,220,255,0.25)';
      ctx.fillRect(sx + 2, sy + 6 + wave, 10, 2);
    }
    if (t === T.NEST_WALL) {
      ctx.fillStyle = '#1a1008';
      ctx.fillRect(sx, sy, TILE, 3);
      ctx.fillStyle = 'rgba(255,200,100,0.06)';
      ctx.fillRect(sx + 2, sy + 4, 4, 4);
    }
    if (t === T.STONE) {
      ctx.fillStyle = 'rgba(0,0,0,0.2)';
      ctx.fillRect(sx + 2, sy + 2, 5, 4);
      ctx.fillStyle = 'rgba(255,255,255,0.08)';
      ctx.fillRect(sx + 8, sy + 8, 4, 3);
    }
    if (t === T.PATH) {
      ctx.fillStyle = 'rgba(0,0,0,0.1)';
      ctx.fillRect(sx + 3, sy + 3, 3, 3);
    }
  }

  function drawDecor(ctx, d, cam, time) {
    const sp = cam.worldToScreen(d.x, d.y);
    if (!cam.inView(d.x, d.y, 40)) return;
    ctx.save();
    switch (d.type) {
      case 'tree': {
        drawShadow(ctx, sp.x, sp.y + 4, 10, 4);
        ctx.fillStyle = '#4a3020';
        ctx.fillRect(sp.x - 3, sp.y - 18, 6, 20);
        ctx.fillStyle = d.variant === 0 ? '#2d6b2a' : d.variant === 1 ? '#3a7a35' : '#256020';
        ctx.beginPath();
        ctx.arc(sp.x, sp.y - 22, 14, 0, Math.PI * 2);
        ctx.fill();
        ctx.beginPath();
        ctx.arc(sp.x - 8, sp.y - 16, 10, 0, Math.PI * 2);
        ctx.fill();
        ctx.beginPath();
        ctx.arc(sp.x + 8, sp.y - 16, 10, 0, Math.PI * 2);
        ctx.fill();
        // 落叶粒子由 particles 处理，这里偶尔画小叶
        if ((time + d.x) % 3 < 0.05) {
          ctx.fillStyle = '#6aaa40';
          ctx.fillRect(sp.x + 12, sp.y - 10, 3, 3);
        }
        break;
      }
      case 'rock': {
        drawShadow(ctx, sp.x, sp.y + 2, 8, 3);
        ctx.fillStyle = '#6a6a6a';
        ctx.beginPath();
        ctx.moveTo(sp.x - 8, sp.y);
        ctx.lineTo(sp.x - 4, sp.y - 10);
        ctx.lineTo(sp.x + 6, sp.y - 8);
        ctx.lineTo(sp.x + 9, sp.y);
        ctx.closePath();
        ctx.fill();
        ctx.fillStyle = 'rgba(255,255,255,0.12)';
        ctx.fillRect(sp.x - 2, sp.y - 7, 4, 3);
        break;
      }
      case 'flower': {
        const cols = ['#e74c6a', '#f1c40f', '#9b59b6', '#3498db', '#e67e22'];
        ctx.fillStyle = '#2d6b2a';
        ctx.fillRect(sp.x, sp.y - 4, 2, 6);
        ctx.fillStyle = cols[d.variant % cols.length];
        ctx.beginPath();
        ctx.arc(sp.x + 1, sp.y - 6, 3, 0, Math.PI * 2);
        ctx.fill();
        break;
      }
      case 'bush': {
        drawShadow(ctx, sp.x, sp.y + 2, 9, 3);
        ctx.fillStyle = '#2a5a28';
        ctx.beginPath();
        ctx.arc(sp.x - 4, sp.y - 2, 7, 0, Math.PI * 2);
        ctx.arc(sp.x + 4, sp.y - 2, 7, 0, Math.PI * 2);
        ctx.arc(sp.x, sp.y - 6, 6, 0, Math.PI * 2);
        ctx.fill();
        if (d.hasBerry) {
          ctx.fillStyle = '#c0392b';
          ctx.beginPath();
          ctx.arc(sp.x - 2, sp.y - 4, 2, 0, Math.PI * 2);
          ctx.arc(sp.x + 3, sp.y - 2, 2, 0, Math.PI * 2);
          ctx.fill();
        }
        break;
      }
      case 'mushroom': {
        drawShadow(ctx, sp.x, sp.y + 2, 6, 2);
        ctx.fillStyle = '#d0c8b0';
        ctx.fillRect(sp.x - 2, sp.y - 8, 4, 10);
        ctx.fillStyle = d.glow ? '#e74c9a' : '#c0392b';
        ctx.beginPath();
        ctx.ellipse(sp.x, sp.y - 10, 8, 5, 0, Math.PI, 0);
        ctx.fill();
        if (d.glow) {
          ctx.fillStyle = 'rgba(231,76,154,0.25)';
          ctx.beginPath();
          ctx.arc(sp.x, sp.y - 10, 14 + Math.sin(time * 3) * 2, 0, Math.PI * 2);
          ctx.fill();
        }
        break;
      }
      case 'crystal': {
        const pulse = 0.5 + Math.sin(time * 2.5 + d.x) * 0.5;
        ctx.fillStyle = `rgba(100,200,255,${0.3 + pulse * 0.3})`;
        ctx.beginPath();
        ctx.arc(sp.x, sp.y - 6, 10 + pulse * 3, 0, Math.PI * 2);
        ctx.fill();
        ctx.fillStyle = '#7ec8e3';
        ctx.beginPath();
        ctx.moveTo(sp.x, sp.y - 16);
        ctx.lineTo(sp.x - 5, sp.y);
        ctx.lineTo(sp.x + 5, sp.y);
        ctx.closePath();
        ctx.fill();
        break;
      }
      case 'grass_tuft': {
        ctx.strokeStyle = '#3a7a30';
        ctx.lineWidth = 1.5;
        ctx.beginPath();
        ctx.moveTo(sp.x, sp.y);
        ctx.quadraticCurveTo(sp.x - 3, sp.y - 6, sp.x - 1, sp.y - 10);
        ctx.moveTo(sp.x + 2, sp.y);
        ctx.quadraticCurveTo(sp.x + 4, sp.y - 5, sp.x + 3, sp.y - 9);
        ctx.stroke();
        break;
      }
      case 'egg': {
        ctx.fillStyle = '#e8dcc8';
        ctx.beginPath();
        ctx.ellipse(sp.x, sp.y - 4, 5, 7, 0, 0, Math.PI * 2);
        ctx.fill();
        break;
      }
      case 'storage': {
        ctx.fillStyle = '#6b4420';
        ctx.fillRect(sp.x - 8, sp.y - 12, 16, 14);
        ctx.fillStyle = '#8b5a2b';
        ctx.fillRect(sp.x - 8, sp.y - 14, 16, 4);
        ctx.fillStyle = '#d4a017';
        ctx.fillRect(sp.x - 2, sp.y - 8, 4, 6);
        break;
      }
      case 'throne': {
        ctx.fillStyle = '#c9a227';
        ctx.fillRect(sp.x - 12, sp.y - 6, 24, 10);
        ctx.fillRect(sp.x - 14, sp.y - 20, 6, 24);
        ctx.fillRect(sp.x + 8, sp.y - 20, 6, 24);
        ctx.fillStyle = '#e74c3c';
        ctx.fillRect(sp.x - 6, sp.y - 10, 12, 8);
        break;
      }
      case 'portal_marker': {
        const a = 0.4 + Math.sin(time * 4) * 0.3;
        ctx.fillStyle = `rgba(212,160,23,${a})`;
        ctx.beginPath();
        ctx.arc(sp.x, sp.y, 8, 0, Math.PI * 2);
        ctx.fill();
        ctx.strokeStyle = '#d4a017';
        ctx.lineWidth = 2;
        ctx.stroke();
        break;
      }
      case 'spring': {
        const pulse = Math.sin(time * 2) * 3;
        ctx.fillStyle = 'rgba(100,220,255,0.35)';
        ctx.beginPath();
        ctx.arc(sp.x, sp.y, 16 + pulse, 0, Math.PI * 2);
        ctx.fill();
        ctx.fillStyle = '#4ecfff';
        ctx.beginPath();
        ctx.arc(sp.x, sp.y, 10, 0, Math.PI * 2);
        ctx.fill();
        break;
      }
    }
    ctx.restore();
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
