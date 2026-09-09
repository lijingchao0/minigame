/**
 * 露珠池塘 — 水域区
 */
const { createTilemap, T } = require('../../engine/tilemap.js');
const { TILE } = require('../../pix.js');

function createDewPond() {
  const cols = 56;
  const rows = 42;
  const map = createTilemap(cols, rows, 99);

  map.fill(T.GRASS);
  for (let y = 0; y < rows; y++)
    for (let x = 0; x < cols; x++)
      if (map.rand() > 0.5) map.set(x, y, T.GRASS2);
  map.border(T.STONE, 1);

  // 大池塘
  map.ellipse(28, 20, 14, 10, T.DEW);
  map.ellipse(28, 20, 10, 7, T.WATER);
  map.ellipse(28, 20, 6, 4, T.WATER);
  // 岸边沙滩
  map.ellipse(28, 20, 15, 11, T.SAND);
  map.ellipse(28, 20, 14, 10, T.DEW);
  map.ellipse(28, 20, 10, 7, T.WATER);

  // 小岛
  map.ellipse(28, 20, 3, 2, T.GRASS);

  map.addPortal(2, 20, 'grassland', 60 * TILE, 24 * TILE, '通往草原');
  map.addPortal(2, 18, 'kingdom_gate', 44 * TILE, 20 * TILE, '通往王国');
  map.addPortal(cols - 2, 30, 'borderlands', 4 * TILE, 20 * TILE, '通往边境');

  for (let i = 0; i < 20; i++) {
    map.addDecor('flower', (4 + map.rand() * 48) * TILE, (4 + map.rand() * 34) * TILE);
  }
  for (let i = 0; i < 12; i++) {
    map.addDecor('bush', (5 + map.rand() * 46) * TILE, (5 + map.rand() * 32) * TILE, { hasBerry: map.rand() > 0.4 });
  }
  for (let i = 0; i < 8; i++) {
    map.addDecor('tree', (6 + map.rand() * 20) * TILE, (4 + map.rand() * 12) * TILE);
  }
  // 萤火虫会在夜晚由系统生成；白天放几颗露珠装饰
  for (let i = 0; i < 6; i++) {
    map.addDecor('crystal',
      (18 + map.rand() * 20) * TILE,
      (12 + map.rand() * 16) * TILE);
  }

  const gatherables = [];
  for (let i = 0; i < 12; i++) {
    gatherables.push({
      id: 'dew_' + i,
      type: 'dew',
      x: (12 + map.rand() * 32) * TILE,
      y: (10 + map.rand() * 22) * TILE,
      itemId: 'dew_drop',
      amount: 1,
      respawn: 70,
      taken: false,
      timer: 0
    });
  }
  for (let i = 0; i < 6; i++) {
    gatherables.push({
      id: 'reed_' + i,
      type: 'herb',
      x: (8 + map.rand() * 40) * TILE,
      y: (6 + map.rand() * 30) * TILE,
      itemId: 'spirit_herb',
      amount: 1,
      respawn: 80,
      taken: false,
      timer: 0
    });
  }

  const npcs = [
    { defId: 'firefly_guide', x: 20 * TILE, y: 28 * TILE },
    { defId: 'ladybug_merchant', x: 40 * TILE, y: 12 * TILE }
  ];

  const enemies = [
    { type: 'wasp', x: 42 * TILE, y: 32 * TILE },
    { type: 'wasp', x: 15 * TILE, y: 10 * TILE },
    { type: 'spider', x: 45 * TILE, y: 22 * TILE }
  ];

  return {
    name: '露珠池塘',
    map,
    spawn: { x: 8 * TILE, y: 20 * TILE },
    gatherables,
    npcs,
    enemies,
    waterAnim: true
  };
}

module.exports = { createDewPond };
