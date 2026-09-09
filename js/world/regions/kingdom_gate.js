/**
 * 王国地面入口区
 */
const { createTilemap, T } = require('../../engine/tilemap.js');
const { TILE } = require('../../pix.js');

function createKingdomGate() {
  const cols = 48;
  const rows = 40;
  const map = createTilemap(cols, rows, 55);

  map.fill(T.DIRT);
  for (let y = 0; y < rows; y++) {
    for (let x = 0; x < cols; x++) {
      if (map.rand() > 0.7) map.set(x, y, T.GRASS);
      if (map.rand() > 0.85) map.set(x, y, T.GRASS2);
    }
  }
  map.border(T.STONE, 1);

  // 蚁丘入口（西）
  map.ellipse(8, 20, 6, 5, T.NEST_FLOOR);
  map.fillRect(6, 18, 6, 6, T.NEST_FLOOR);
  // 广场
  map.fillRect(16, 14, 18, 14, T.PATH);
  // 南向草原大道
  for (let y = 28; y < rows - 1; y++) {
    map.set(20, y, T.PATH);
    map.set(21, y, T.PATH);
  }
  // 岗哨区
  map.fillRect(34, 10, 8, 8, T.DIRT);

  map.addPortal(8, 20, 'nest_cave', 55 * TILE, 21 * TILE, '进入蚁巢');
  map.addPortal(20, rows - 2, 'grassland', 31 * TILE, 4 * TILE, '通往草原');
  map.addPortal(21, rows - 2, 'grassland', 31 * TILE, 4 * TILE, '通往草原');
  map.addPortal(cols - 2, 20, 'dew_pond', 3 * TILE, 18 * TILE, '通往池塘');

  // 装饰：旗帜/石头/花
  for (let i = 0; i < 10; i++) {
    map.addDecor('rock', (4 + map.rand() * 40) * TILE, (4 + map.rand() * 32) * TILE);
  }
  for (let i = 0; i < 20; i++) {
    map.addDecor('flower', (5 + map.rand() * 38) * TILE, (5 + map.rand() * 30) * TILE);
  }
  for (let i = 0; i < 8; i++) {
    map.addDecor('bush', (10 + map.rand() * 30) * TILE, (6 + map.rand() * 28) * TILE, { hasBerry: false });
  }
  // 岗哨柱
  map.addDecor('storage', 36 * TILE, 12 * TILE);
  map.addDecor('storage', 40 * TILE, 12 * TILE);

  const gatherables = [
    { id: 'gate_berry', type: 'berry', x: 28 * TILE, y: 8 * TILE, itemId: 'berry', amount: 1, respawn: 50, taken: false, timer: 0 }
  ];

  const npcs = [
    { defId: 'soldier_captain', x: 36 * TILE, y: 16 * TILE },
    { defId: 'bee_messenger', x: 22 * TILE, y: 18 * TILE },
    { defId: 'scout_ant', x: 18 * TILE, y: 26 * TILE }
  ];

  return {
    name: '王国入口',
    map,
    spawn: { x: 20 * TILE, y: 22 * TILE },
    gatherables,
    npcs,
    enemies: [],
    flags: true
  };
}

module.exports = { createKingdomGate };
