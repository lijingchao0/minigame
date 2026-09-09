/**
 * 经济 / 商店
 */
const { ITEM_DEFS } = require('../entities/item.js');

const SHOP_STOCK = [
  { id: 'seed_pack', price: 10 },
  { id: 'hp_pill', price: 20 },
  { id: 'mp_pill', price: 20 },
  { id: 'xp_pill', price: 35 },
  { id: 'herb_necklace', price: 100 },
  { id: 'wood_armor', price: 70 },
  { id: 'stone_armor', price: 120 },
  { id: 'iron_armor', price: 180 },
  { id: 'jaw_blade', price: 110 },
  { id: 'spirit_herb', price: 8 }
];

function createEconomy() {
  function buy(inv, itemId) {
    const stock = SHOP_STOCK.find((s) => s.id === itemId);
    if (!stock) return { ok: false, msg: '无此商品' };
    if (inv.state.gold < stock.price) return { ok: false, msg: '金币不足' };
    if (!inv.add(itemId, 1)) return { ok: false, msg: '背包已满' };
    inv.state.gold -= stock.price;
    return { ok: true, msg: '购得 ' + ITEM_DEFS[itemId].name };
  }

  function sell(inv, itemId, amount) {
    amount = amount || 1;
    const def = ITEM_DEFS[itemId];
    if (!def || def.quest) return { ok: false, msg: '无法出售' };
    if (!inv.has(itemId, amount)) return { ok: false, msg: '数量不足' };
    inv.remove(itemId, amount);
    const gain = def.sell * amount;
    inv.state.gold += gain;
    return { ok: true, msg: '出售 +' + gain + '金' };
  }

  return { SHOP_STOCK, buy, sell };
}

module.exports = { createEconomy, SHOP_STOCK };
