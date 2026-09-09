/**
 * 蚁巢洞窟 — 地下巢穴（幼虫室/粮仓/蚁后大殿/育婴室）
 */
const { createTilemap, T } = require('../../engine/tilemap.js');
const { TILE } = require('../../pix.js');

function createNestCave() {
  const cols = 60;
  const rows = 44;
  const map = createTilemap(cols, rows, 77);

  map.fill(T.NEST_WALL);
  // 主通道
  map.fillRect(4, 18, 52, 8, T.NEST_FLOOR);
  // 入口大厅（东，接王国入口）
  map.fillRect(48, 14, 10, 16, T.NEST_FLOOR);
  // 蚁后大殿（西）
  map.fillRect(4, 8, 18, 20, T.NEST_FLOOR);
  map.fillRect(6, 4, 14, 8, T.NEST_FLOOR);
  // 粮仓（北支）
  map.fillRect(24, 4, 14, 16, T.NEST_FLOOR);
  // 育婴/幼虫室（南支）
  map.fillRect(24, 24, 16, 16, T.NEST_FLOOR);
  // 修炼密室
  map.fillRect(42, 4, 12, 12, T.NEST_FLOOR);

  // 路径装饰
  for (let x = 5; x < 55; x++) {
    if (map.rand() > 0.6) map.set(x, 21, T.PATH);
  }

  // 出口 → 王国入口
  map.addPortal(cols - 2, 21, 'kingdom_gate', 8 * TILE, 20 * TILE, '通往王国入口');

  // 装饰
  map.addDecor('throne', 10 * TILE, 10 * TILE);
  map.addDecor('storage', 28 * TILE, 8 * TILE);
  map.addDecor('storage', 32 * TILE, 8 * TILE);
  map.addDecor('storage', 30 * TILE, 12 * TILE);
  for (let i = 0; i < 12; i++) {
    map.addDecor('egg',
      (26 + map.rand() * 12) * TILE,
      (28 + map.rand() * 10) * TILE);
  }
  for (let i = 0; i < 8; i++) {
    map.addDecor('crystal',
      (44 + map.rand() * 8) * TILE,
      (6 + map.rand() * 8) * TILE);
  }
  for (let i = 0; i < 15; i++) {
    map.addDecor('rock',
      (5 + map.rand() * 50) * TILE,
      (5 + map.rand() * 35) * TILE);
  }

  const gatherables = [
    { id: 'nest_food_1', type: 'food', x: 28 * TILE, y: 10 * TILE, itemId: 'ant_food', amount: 2, respawn: 45, taken: false, timer: 0 },
    { id: 'nest_food_2', type: 'food', x: 33 * TILE, y: 11 * TILE, itemId: 'ant_food', amount: 2, respawn: 45, taken: false, timer: 0 },
    { id: 'nest_crystal', type: 'crystal', x: 48 * TILE, y: 8 * TILE, itemId: 'spirit_stone', amount: 1, respawn: 120, taken: false, timer: 0 }
  ];

  const npcs = [
    { defId: 'queen', x: 10 * TILE, y: 12 * TILE },
    { defId: 'king_ant', x: 46 * TILE, y: 10 * TILE },
    { defId: 'worker_elder', x: 30 * TILE, y: 14 * TILE },
    { defId: 'nurse_ant', x: 30 * TILE, y: 30 * TILE },
    { defId: 'soldier_captain', x: 50 * TILE, y: 20 * TILE }
  ];

  return {
    name: '蚁巢洞窟',
    map,
    spawn: { x: 52 * TILE, y: 21 * TILE },
    gatherables,
    npcs,
    enemies: [], // 安全区
    ambientDark: 0.15,
    opportunities: [
      { id: 'nest_heritage', name: '传承之地', x: 48 * TILE, y: 8 * TILE, color: '#9b59b6' }
    ]
  };
}

module.exports = { createNestCave };
