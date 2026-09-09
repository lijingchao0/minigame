/**
 * 存档系统 — wx.setStorageSync
 */
const SAVE_KEY = 'ant_xian_v2_save';
const SETTINGS_KEY = 'ant_xian_v2_settings';

function storageSet(key, val) {
  try {
    if (typeof wx !== 'undefined' && wx.setStorageSync) {
      wx.setStorageSync(key, val);
      return true;
    }
    if (typeof localStorage !== 'undefined') {
      localStorage.setItem(key, JSON.stringify(val));
      return true;
    }
  } catch (e) {
    console.warn('存档失败', e);
  }
  return false;
}

function storageGet(key) {
  try {
    if (typeof wx !== 'undefined' && wx.getStorageSync) {
      const v = wx.getStorageSync(key);
      return v || null;
    }
    if (typeof localStorage !== 'undefined') {
      const s = localStorage.getItem(key);
      return s ? JSON.parse(s) : null;
    }
  } catch (e) {
    console.warn('读档失败', e);
  }
  return null;
}

function createSave() {
  function hasSave() {
    return !!storageGet(SAVE_KEY);
  }

  function save(game) {
    const data = {
      version: 3,
      time: Date.now(),
      player: {
        x: game.player.x,
        y: game.player.y,
        hp: game.player.hp,
        mp: game.player.mp,
        region: game.regions.getCurrentId()
      },
      cultivation: game.cultivation.serialize(),
      inventory: game.inventory.serialize(),
      kingdom: game.kingdom.serialize(),
      quests: game.quests.serialize(),
      daycycle: game.daycycle.serialize(),
      unlocked: game.regions.listMeta().filter((m) => m.unlock).map((m) => m.id)
    };
    return storageSet(SAVE_KEY, data);
  }

  function load() {
    return storageGet(SAVE_KEY);
  }

  function clear() {
    storageSet(SAVE_KEY, null);
    try {
      if (typeof wx !== 'undefined' && wx.removeStorageSync) wx.removeStorageSync(SAVE_KEY);
      else if (typeof localStorage !== 'undefined') localStorage.removeItem(SAVE_KEY);
    } catch (e) { /* ignore */ }
  }

  function getSettings() {
    return storageGet(SETTINGS_KEY) || { vibrate: true, volume: 0.7 };
  }

  function setSettings(s) {
    storageSet(SETTINGS_KEY, s);
  }

  return { hasSave, save, load, clear, getSettings, setSettings, SAVE_KEY };
}

module.exports = { createSave };
