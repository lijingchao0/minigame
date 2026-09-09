/**
 * 天敌边境 — 食蚁兽/蜘蛛出没的险地
 */
const { createTilemap, T } = require('../../engine/tilemap.js');
const { TILE } = require('../../pix.js');

function createBorderlands() {
  const cols = 64;
  const rows = 44;
  const map = createTilemap(cols, rows, 201);

  map.fill(T.DIRT);
  for (let y = 0; y < rows; y++)
    for (let x = 0; x < cols; x++) {
      const n = map.rand();
      if (n > 0.7) map.set(x, y, T.STONE);
      else if (n > 0.4) map.set(x, y, T.DARK_GRASS);
    }
  // 清空可走通道
  map.fillRect(2, 16, 60, 10, T.DIRT);
  map.fillRect(20, 2, 10, 40, T.DIRT);
  map.border(T.STONE, 1);

  // 危地标记
  map.fillRect(40, 6, 18, 14, T.DARK_GRASS);

  map.addPortal(2, 20, 'dew_pond', 50 * TILE, 30 * TILE, '通往池塘');
  map.addPortal(24, 2, 'mushroom_forest', 30 * TILE, 40 * TILE, '通往蘑菇林');
  map.addPortal(24, rows - 2, 'grassland', 50 * TILE, 8 * TILE, '通往草原');

  for (let i = 0; i < 25; i++) {
    map.addDecor('rock',
      (4 + map.rand() * (cols - 8)) * TILE,
      (4 + map.rand() * (rows - 8)) * TILE);
  }
  for (let i = 0; i < 10; i++) {
    map.addDecor('bush',
      (6 + map.rand() * (cols - 12)) * TILE,
      (6 + map.rand() * (rows - 12)) * TILE,
      { hasBerry: false });
  }
  for (let i = 0; i < 6; i++) {
    map.addDecor('bone' in {} ? 'rock' : 'rock',
      (30 + map.rand() * 25) * TILE,
      (8 + map.rand() * 20) * TILE);
  }

  const gatherables = [
    { id: 'border_stone', type: 'ore', x: 48 * TILE, y: 12 * TILE, itemId: 'spirit_stone', amount: 1, respawn: 150, taken: false, timer: 0 },
    { id: 'border_herb', type: 'herb', x: 15 * TILE, y: 30 * TILE, itemId: 'tribulation_herb', amount: 1, respawn: 180, taken: false, timer: 0 }
  ];

  const npcs = [
    { defId: 'scout_ant', x: 10 * TILE, y: 22 * TILE }
  ];

  const enemies = [
    { type: 'anteater', x: 45 * TILE, y: 20 * TILE },
    { type: 'anteater', x: 52 * TILE, y: 10 * TILE },
    { type: 'spider', x: 30 * TILE, y: 32 * TILE },
    { type: 'spider', x: 38 * TILE, y: 8 * TILE },
    { type: 'shadow_scorpion', x: 55 * TILE, y: 30 * TILE },
    { type: 'wasp', x: 20 * TILE, y: 8 * TILE }
  ];

  return {
    name: '天敌边境',
    map,
    spawn: { x: 6 * TILE, y: 20 * TILE },
    gatherables,
    npcs,
    enemies,
    danger: true,
    needUnlock: true
  };
}

module.exports = { createBorderlands };
