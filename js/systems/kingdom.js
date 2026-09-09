/**
 * 蚂蚁王国 — 繁荣度 / 建设 / 称号
 */
const TITLES = [
  { id: 'worker', name: '工蚁', needMain: 0 },
  { id: 'ling_guard', name: '灵蚁卫', needMain: 3 },
  { id: 'nation_gen', name: '护国蚁将', needMain: 7 },
  { id: 'xian_guard', name: '守界蚁仙', needMain: 12 }
];

const KINGDOM_LEVELS = [
  { level: 1, name: '初建蚁巢', need: 0, unlock: [] },
  { level: 2, name: '兴旺小巢', need: 30, unlock: ['育婴室扩建'] },
  { level: 3, name: '中型蚁国', need: 80, unlock: ['dew_pond', '兵营'] },
  { level: 4, name: '强盛蚁国', need: 150, unlock: ['mushroom_forest', '修炼密室'] },
  { level: 5, name: '蚁仙圣地', need: 250, unlock: ['borderlands', '仙殿'] }
];

function createKingdom() {
  const state = {
    prosperity: 0,
    level: 1,
    titleIdx: 0,
    buildings: ['蚁后大殿', '粮仓'],
    lastEvent: null
  };

  function titleName() {
    return TITLES[state.titleIdx].name;
  }

  function levelName() {
    return KINGDOM_LEVELS[state.level - 1].name;
  }

  function addProsperity(n, onLevelUp) {
    state.prosperity += n;
    while (state.level < KINGDOM_LEVELS.length &&
           state.prosperity >= KINGDOM_LEVELS[state.level].need) {
      state.level++;
      const info = KINGDOM_LEVELS[state.level - 1];
      for (let i = 0; i < info.unlock.length; i++) {
        const u = info.unlock[i];
        if (u.indexOf('_') >= 0) {
          // 区域解锁由外部处理
        } else if (state.buildings.indexOf(u) < 0) {
          state.buildings.push(u);
        }
      }
      if (onLevelUp) onLevelUp(info);
    }
  }

  function updateTitle(mainQuestDone) {
    for (let i = TITLES.length - 1; i >= 0; i--) {
      if (mainQuestDone >= TITLES[i].needMain) {
        state.titleIdx = i;
        break;
      }
    }
  }

  function unlocksForRegions() {
    const list = [];
    for (let i = 0; i < state.level; i++) {
      const u = KINGDOM_LEVELS[i].unlock;
      for (let j = 0; j < u.length; j++) {
        if (u[j].indexOf('_') >= 0) list.push(u[j]);
      }
    }
    // 繁荣度也直接解锁
    if (state.prosperity >= 40) list.push('dew_pond');
    if (state.prosperity >= 100) list.push('mushroom_forest');
    if (state.prosperity >= 180) list.push('borderlands');
    return list;
  }

  function serialize() {
    return {
      prosperity: state.prosperity,
      level: state.level,
      titleIdx: state.titleIdx,
      buildings: state.buildings.slice()
    };
  }

  function deserialize(data) {
    if (!data) return;
    state.prosperity = data.prosperity || 0;
    state.level = data.level || 1;
    state.titleIdx = data.titleIdx || 0;
    state.buildings = data.buildings || ['蚁后大殿', '粮仓'];
  }

  return {
    state, TITLES, KINGDOM_LEVELS,
    titleName, levelName, addProsperity, updateTitle, unlocksForRegions,
    serialize, deserialize
  };
}

module.exports = { createKingdom, TITLES, KINGDOM_LEVELS };
