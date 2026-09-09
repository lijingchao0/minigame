/**
 * 草丛草原 — 开篇区域
 */
const { createTilemap, T } = require('../../engine/tilemap.js');
const { TILE } = require('../../pix.js');

function createGrassland() {
  const cols = 64;
  const rows = 48;
  const map = createTilemap(cols, rows, 42);

  map.fill(T.GRASS);
  // 草地色调变化
  for (let y = 0; y < rows; y++) {
    for (let x = 0; x < cols; x++) {
      if (map.rand() > 0.55) map.set(x, y, T.GRASS2);
    }
  }
  // 边界岩石
  map.border(T.STONE, 1);
  // 中央小路
  for (let y = 8; y < rows - 4; y++) {
    map.set(30, y, T.PATH);
    map.set(31, y, T.PATH);
    if (map.rand() > 0.7) map.set(29, y, T.DIRT);
  }
  // 花丛区
  map.fillRect(8, 10, 12, 10, T.FLOWER_BED);
  // 小水洼
  map.ellipse(48, 20, 5, 4, T.DEW);
  map.ellipse(48, 20, 3, 2, T.WATER);
  // 灌木丛区
  map.fillRect(10, 32, 14, 8, T.GRASS2);
  // 通往王国入口（北）
  map.addPortal(30, 2, 'kingdom_gate', 20 * TILE, 36 * TILE, '通往王国');
  map.addPortal(31, 2, 'kingdom_gate', 20 * TILE, 36 * TILE, '通往王国');
  // 通往露珠池塘（东）
  map.addPortal(cols - 2, 24, 'dew_pond', 3 * TILE, 20 * TILE, '通往池塘');
  // 通往蘑菇森林（西，需解锁）
  map.addPortal(2, 24, 'mushroom_forest', 58 * TILE, 22 * TILE, '通往蘑菇林');

  // 装饰
  for (let i = 0; i < 35; i++) {
    const x = (4 + map.rand() * (cols - 8)) * TILE + TILE / 2;
    const y = (4 + map.rand() * (rows - 8)) * TILE + TILE / 2;
    if (!map.isSolidAt(x, y)) map.addDecor('tree', x, y);
  }
  for (let i = 0; i < 40; i++) {
    const x = (3 + map.rand() * (cols - 6)) * TILE + TILE / 2;
    const y = (3 + map.rand() * (rows - 6)) * TILE + TILE / 2;
    map.addDecor('flower', x, y);
  }
  for (let i = 0; i < 25; i++) {
    const x = (5 + map.rand() * (cols - 10)) * TILE + TILE / 2;
    const y = (5 + map.rand() * (rows - 10)) * TILE + TILE / 2;
    map.addDecor('bush', x, y, { hasBerry: map.rand() > 0.5 });
  }
  for (let i = 0; i < 50; i++) {
    map.addDecor('grass_tuft',
      (2 + map.rand() * (cols - 4)) * TILE,
      (2 + map.rand() * (rows - 4)) * TILE);
  }
  for (let i = 0; i < 12; i++) {
    map.addDecor('rock',
      (4 + map.rand() * (cols - 8)) * TILE + TILE / 2,
      (4 + map.rand() * (rows - 8)) * TILE + TILE / 2);
  }

  // 可采集点
  const gatherables = [];
  for (let i = 0; i < 18; i++) {
    gatherables.push({
      id: 'g_grass_' + i,
      type: 'berry',
      x: (6 + map.rand() * (cols - 12)) * TILE,
      y: (6 + map.rand() * (rows - 12)) * TILE,
      itemId: 'berry',
      amount: 1 + (map.rand() * 2) | 0,
      respawn: 60,
      taken: false,
      timer: 0
    });
  }
  for (let i = 0; i < 10; i++) {
    gatherables.push({
      id: 'g_herb_' + i,
      type: 'herb',
      x: (8 + map.rand() * (cols - 16)) * TILE,
      y: (8 + map.rand() * (rows - 16)) * TILE,
      itemId: 'spirit_herb',
      amount: 1,
      respawn: 90,
      taken: false,
      timer: 0
    });
  }

  // NPC 落点（相对本区域）
  const npcs = [
    { defId: 'ladybug_merchant', x: 22 * TILE, y: 18 * TILE },
    { defId: 'grasshopper', x: 40 * TILE, y: 30 * TILE },
    { defId: 'scout_ant', x: 32 * TILE, y: 8 * TILE }
  ];

  // 敌人
  const enemies = [
    { type: 'spider', x: 50 * TILE, y: 35 * TILE },
    { type: 'spider', x: 55 * TILE, y: 12 * TILE },
    { type: 'spider', x: 15 * TILE, y: 40 * TILE }
  ];

  return {
    name: '草丛草原',
    map,
    spawn: { x: 31 * TILE, y: 40 * TILE },
    gatherables,
    npcs,
    enemies,
    leaves: true,
    opportunities: [
      { id: 'gl_fairy_stone', name: '仙缘石', x: 48 * TILE, y: 22 * TILE, color: '#f1c40f' },
      { id: 'gl_hidden_spring', name: '隐秘灵泉', x: 12 * TILE, y: 28 * TILE, color: '#4ecfff' }
    ]
  };
}

module.exports = { createGrassland };
