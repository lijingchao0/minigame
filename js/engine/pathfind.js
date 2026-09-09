/**
 * 简易格子 BFS 寻路（直线优先回退）
 */
const { TILE } = require('../pix.js');

function findPath(map, fromX, fromY, toX, toY) {
  const cols = map.cols;
  const rows = map.rows;
  const sx = clampTile(Math.floor(fromX / TILE), cols);
  const sy = clampTile(Math.floor(fromY / TILE), rows);
  let gx = clampTile(Math.floor(toX / TILE), cols);
  let gy = clampTile(Math.floor(toY / TILE), rows);

  // 目标若不可走，向外找最近可走格
  if (map.isSolidTile(gx, gy)) {
    const alt = nearestWalkable(map, gx, gy, 6);
    if (!alt) return straightFallback(fromX, fromY, toX, toY);
    gx = alt.x;
    gy = alt.y;
  }
  if (map.isSolidTile(sx, sy)) {
    return straightFallback(fromX, fromY, toX, toY);
  }
  if (sx === gx && sy === gy) {
    return [{ x: toX, y: toY }];
  }

  const key = (x, y) => y * cols + x;
  const visited = new Uint8Array(cols * rows);
  const parent = new Int32Array(cols * rows);
  parent.fill(-1);
  const qx = new Int16Array(cols * rows);
  const qy = new Int16Array(cols * rows);
  let qh = 0;
  let qt = 0;
  qx[qt] = sx;
  qy[qt] = sy;
  qt++;
  visited[key(sx, sy)] = 1;

  const dirs = [[1, 0], [-1, 0], [0, 1], [0, -1], [1, 1], [1, -1], [-1, 1], [-1, -1]];
  let found = false;
  while (qh < qt) {
    const cx = qx[qh];
    const cy = qy[qh];
    qh++;
    if (cx === gx && cy === gy) {
      found = true;
      break;
    }
    for (let i = 0; i < dirs.length; i++) {
      const nx = cx + dirs[i][0];
      const ny = cy + dirs[i][1];
      if (nx < 0 || ny < 0 || nx >= cols || ny >= rows) continue;
      const k = key(nx, ny);
      if (visited[k]) continue;
      if (map.isSolidTile(nx, ny)) continue;
      // 对角禁止穿角
      if (dirs[i][0] !== 0 && dirs[i][1] !== 0) {
        if (map.isSolidTile(cx + dirs[i][0], cy) || map.isSolidTile(cx, cy + dirs[i][1])) continue;
      }
      visited[k] = 1;
      parent[k] = key(cx, cy);
      qx[qt] = nx;
      qy[qt] = ny;
      qt++;
    }
  }

  if (!found) return straightFallback(fromX, fromY, gx * TILE + TILE / 2, gy * TILE + TILE / 2);

  const tiles = [];
  let cur = key(gx, gy);
  while (cur >= 0) {
    const tx = cur % cols;
    const ty = (cur / cols) | 0;
    tiles.push({ x: tx * TILE + TILE / 2, y: ty * TILE + TILE / 2 });
    cur = parent[cur];
  }
  tiles.reverse();
  // 去掉起点
  if (tiles.length > 1) tiles.shift();
  // 最终精确落点
  if (tiles.length) {
    tiles[tiles.length - 1] = { x: gx * TILE + TILE / 2, y: gy * TILE + TILE / 2 };
  }
  return tiles;
}

function nearestWalkable(map, tx, ty, radius) {
  for (let r = 1; r <= radius; r++) {
    for (let dy = -r; dy <= r; dy++) {
      for (let dx = -r; dx <= r; dx++) {
        if (Math.abs(dx) !== r && Math.abs(dy) !== r) continue;
        const x = tx + dx;
        const y = ty + dy;
        if (x < 0 || y < 0 || x >= map.cols || y >= map.rows) continue;
        if (!map.isSolidTile(x, y)) return { x, y };
      }
    }
  }
  return null;
}

function straightFallback(fx, fy, tx, ty) {
  return [{ x: tx, y: ty }];
}

function clampTile(v, max) {
  return Math.max(0, Math.min(max - 1, v));
}

module.exports = { findPath };
