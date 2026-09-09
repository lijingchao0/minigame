/**
 * 蘑菇森林 — 暗区，高阶
 */
const { createTilemap, T } = require('../../engine/tilemap.js');
const { TILE } = require('../../pix.js');

function createMushroomForest() {
  const cols = 62;
  const rows = 46;
  const map = createTilemap(cols, rows, 133);

  map.fill(T.DARK_GRASS);
  for (let y = 0; y < rows; y++)
    for (let x = 0; x < cols; x++)
      if (map.rand() > 0.6) map.set(x, y, T.MUSHROOM_FLOOR);
  map.border(T.STONE, 2);

  // 灵泉中心
  map.ellipse(30, 22, 5, 4, T.DEW);
  map.ellipse(30, 22, 3, 2, T.WATER);
  map.addDecor('spring', 30 * TILE + 8, 22 * TILE + 8);

  // 蘑菇群落
  map.fillRect(8, 8, 16, 12, T.MUSHROOM_FLOOR);
  map.fillRect(40, 28, 14, 10, T.MUSHROOM_FLOOR);

  map.addPortal(cols - 2, 22, 'grassland', 4 * TILE, 24 * TILE, '通往草原');
  map.addPortal(30, rows - 3, 'borderlands', 28 * TILE, 4 * TILE, '通往边境');

  for (let i = 0; i < 40; i++) {
    map.addDecor('mushroom',
      (4 + map.rand() * (cols - 8)) * TILE,
      (4 + map.rand() * (rows - 8)) * TILE,
      { glow: map.rand() > 0.55 });
  }
  for (let i = 0; i < 15; i++) {
    map.addDecor('crystal',
      (6 + map.rand() * (cols - 12)) * TILE,
      (6 + map.rand() * (rows - 12)) * TILE);
  }
  for (let i = 0; i < 10; i++) {
    map.addDecor('rock',
      (5 + map.rand() * (cols - 10)) * TILE,
      (5 + map.rand() * (rows - 10)) * TILE);
  }
  for (let i = 0; i < 8; i++) {
    map.addDecor('tree',
      (8 + map.rand() * (cols - 16)) * TILE,
      (8 + map.rand() * (rows - 16)) * TILE);
  }

  const gatherables = [];
  for (let i = 0; i < 15; i++) {
    gatherables.push({
      id: 'mush_' + i,
      type: 'mushroom',
      x: (6 + map.rand() * (cols - 12)) * TILE,
      y: (6 + map.rand() * (rows - 12)) * TILE,
      itemId: 'glow_mushroom',
      amount: 1,
      respawn: 100,
      taken: false,
      timer: 0
    });
  }
  gatherables.push({
    id: 'spirit_spring',
    type: 'spring',
    x: 30 * TILE,
    y: 20 * TILE,
    itemId: 'spirit_water',
    amount: 1,
    respawn: 200,
    taken: false,
    timer: 0
  });

  const npcs = [
    { defId: 'firefly_guide', x: 25 * TILE, y: 30 * TILE }
  ];

  const enemies = [
    { type: 'shadow_scorpion', x: 45 * TILE, y: 15 * TILE },
    { type: 'shadow_scorpion', x: 12 * TILE, y: 35 * TILE },
    { type: 'spider', x: 50 * TILE, y: 35 * TILE },
    { type: 'spider', x: 18 * TILE, y: 12 * TILE },
    { type: 'wasp', x: 35 * TILE, y: 38 * TILE }
  ];

  return {
    name: '蘑菇森林',
    map,
    spawn: { x: 55 * TILE, y: 22 * TILE },
    gatherables,
    npcs,
    enemies,
    ambientDark: 0.35,
    needUnlock: true
  };
}

module.exports = { createMushroomForest };
