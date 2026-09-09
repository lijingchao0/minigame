/**
 * 区域管理器 — 大世界多区域切换
 */
const { createGrassland } = require('../world/regions/grassland.js');
const { createNestCave } = require('../world/regions/nest_cave.js');
const { createKingdomGate } = require('../world/regions/kingdom_gate.js');
const { createDewPond } = require('../world/regions/dew_pond.js');
const { createMushroomForest } = require('../world/regions/mushroom_forest.js');
const { createBorderlands } = require('../world/regions/borderlands.js');

const REGION_BUILDERS = {
  grassland: createGrassland,
  nest_cave: createNestCave,
  kingdom_gate: createKingdomGate,
  dew_pond: createDewPond,
  mushroom_forest: createMushroomForest,
  borderlands: createBorderlands
};

const REGION_META = {
  grassland: { id: 'grassland', name: '草丛草原', safe: false, unlock: true },
  nest_cave: { id: 'nest_cave', name: '蚁巢洞窟', safe: true, unlock: true },
  kingdom_gate: { id: 'kingdom_gate', name: '王国入口', safe: true, unlock: true },
  dew_pond: { id: 'dew_pond', name: '露珠池塘', safe: false, unlock: false },
  mushroom_forest: { id: 'mushroom_forest', name: '蘑菇森林', safe: false, unlock: false },
  borderlands: { id: 'borderlands', name: '天敌边境', safe: false, unlock: false }
};

function createRegionManager() {
  const cache = {};
  let current = null;
  let currentId = null;

  function getOrBuild(id) {
    if (!cache[id]) {
      const builder = REGION_BUILDERS[id];
      if (!builder) throw new Error('未知区域: ' + id);
      cache[id] = builder();
      cache[id].id = id;
      cache[id].meta = REGION_META[id];
    }
    return cache[id];
  }

  function enter(id, spawnX, spawnY) {
    current = getOrBuild(id);
    currentId = id;
    return {
      region: current,
      x: spawnX != null ? spawnX : current.spawn.x,
      y: spawnY != null ? spawnY : current.spawn.y
    };
  }

  function getCurrent() { return current; }
  function getCurrentId() { return currentId; }

  function unlock(id) {
    if (REGION_META[id]) REGION_META[id].unlock = true;
  }

  function isUnlocked(id) {
    return !!(REGION_META[id] && REGION_META[id].unlock);
  }

  function listMeta() {
    return Object.keys(REGION_META).map((k) => Object.assign({}, REGION_META[k]));
  }

  return { enter, getCurrent, getCurrentId, unlock, isUnlocked, listMeta, REGION_META, getOrBuild };
}

module.exports = { createRegionManager, REGION_META };
