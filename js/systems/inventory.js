/**
 * 背包 / 装备
 */
const { ITEM_DEFS } = require('../entities/item.js');

function createInventory() {
  const state = {
    slots: [], // {id, amount}
    capacity: 30,
    gold: 20,
    equip: { neck: null, armor: null }
  };

  function count(id) {
    let n = 0;
    for (let i = 0; i < state.slots.length; i++) {
      if (state.slots[i].id === id) n += state.slots[i].amount;
    }
    return n;
  }

  function add(id, amount) {
    amount = amount || 1;
    if (!ITEM_DEFS[id]) return false;
    for (let i = 0; i < state.slots.length; i++) {
      if (state.slots[i].id === id) {
        state.slots[i].amount += amount;
        return true;
      }
    }
    if (state.slots.length >= state.capacity) return false;
    state.slots.push({ id, amount });
    return true;
  }

  function remove(id, amount) {
    amount = amount || 1;
    for (let i = 0; i < state.slots.length; i++) {
      if (state.slots[i].id === id) {
        if (state.slots[i].amount < amount) return false;
        state.slots[i].amount -= amount;
        if (state.slots[i].amount <= 0) state.slots.splice(i, 1);
        return true;
      }
    }
    return false;
  }

  function has(id, amount) {
    return count(id) >= (amount || 1);
  }

  function byCategory(cat) {
    return state.slots.filter((s) => ITEM_DEFS[s.id] && ITEM_DEFS[s.id].cat === cat);
  }

  function useItem(id, player, cultivation, particles) {
    const def = ITEM_DEFS[id];
    if (!def || !has(id)) return false;
    if (def.use === 'heal') {
      remove(id, 1);
      player.heal(def.value);
      if (particles) particles.floatText(player.x, player.y - 14, '+' + def.value + 'HP', '#e74c3c');
      return true;
    }
    if (def.use === 'mp') {
      remove(id, 1);
      player.mp = Math.min(player.maxMp, player.mp + def.value);
      if (particles) particles.floatText(player.x, player.y - 14, '+' + def.value + '灵力', '#3498db');
      return true;
    }
    if (def.use === 'xp') {
      remove(id, 1);
      cultivation.addXp(def.value, player, particles);
      return true;
    }
    if (def.equip) {
      // 装备
      const slot = def.equip;
      // 卸下旧的
      if (state.equip[slot]) {
        add(state.equip[slot], 1);
        _unequipStat(player, ITEM_DEFS[state.equip[slot]]);
      }
      remove(id, 1);
      state.equip[slot] = id;
      _equipStat(player, def);
      if (particles) particles.floatText(player.x, player.y - 14, '装备 ' + def.name, '#f1c40f');
      return true;
    }
    return false;
  }

  function _equipStat(player, def) {
    if (def.stat === 'speed') player.speed *= (1 + def.value);
    if (def.stat === 'def') player.def += def.value;
  }

  function _unequipStat(player, def) {
    if (!def) return;
    if (def.stat === 'speed') player.speed /= (1 + def.value);
    if (def.stat === 'def') player.def -= def.value;
  }

  function serialize() {
    return {
      slots: state.slots.map((s) => ({ id: s.id, amount: s.amount })),
      gold: state.gold,
      equip: Object.assign({}, state.equip)
    };
  }

  function deserialize(data, player) {
    if (!data) return;
    state.slots = (data.slots || []).map((s) => ({ id: s.id, amount: s.amount }));
    state.gold = data.gold != null ? data.gold : 20;
    state.equip = data.equip || { neck: null, armor: null };
    // 重新应用装备属性
    if (state.equip.neck && ITEM_DEFS[state.equip.neck]) _equipStat(player, ITEM_DEFS[state.equip.neck]);
    if (state.equip.armor && ITEM_DEFS[state.equip.armor]) _equipStat(player, ITEM_DEFS[state.equip.armor]);
  }

  return { state, count, add, remove, has, byCategory, useItem, serialize, deserialize, ITEM_DEFS };
}

module.exports = { createInventory };
