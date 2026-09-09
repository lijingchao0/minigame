/**
 * 掉落物 / 可采集点 绘制与逻辑
 */
const { drawShadow, dist } = require('../pix.js');

const ITEM_DEFS = {
  berry: { name: '浆果', icon: 'berry', cat: '材料', desc: '酸甜的野浆果，可食用或上交。', sell: 2 },
  spirit_herb: { name: '灵草', icon: 'herb', cat: '材料', desc: '蕴含微弱灵气的草药。', sell: 5 },
  ant_food: { name: '蚁粮', icon: 'food', cat: '材料', desc: '巢穴储备的食物。', sell: 3 },
  spirit_stone: { name: '灵石碎屑', icon: 'stone', cat: '材料', desc: '修炼时可吸收的矿石碎片。', sell: 10 },
  dew_drop: { name: '露珠', icon: 'dew', cat: '材料', desc: '清晨凝结的纯净露水。', sell: 4 },
  glow_mushroom: { name: '荧光菇', icon: 'mushroom', cat: '材料', desc: '蘑菇林特有的发光菌类。', sell: 12 },
  spirit_water: { name: '灵泉水', icon: 'spring', cat: '材料', desc: '灵泉中取出的仙液，渡劫必需。', sell: 50 },
  tribulation_herb: { name: '渡劫草', icon: 'herb2', cat: '材料', desc: '传说中助人渡劫的奇草。', sell: 40 },
  // 丹药
  hp_pill: { name: '回血丹', icon: 'pill_r', cat: '丹药', desc: '恢复 40 点生命。', sell: 15, use: 'heal', value: 40 },
  mp_pill: { name: '回灵丹', icon: 'pill_b', cat: '丹药', desc: '恢复 30 点灵力。', sell: 15, use: 'mp', value: 30 },
  xp_pill: { name: '聚气丹', icon: 'pill_g', cat: '丹药', desc: '增加 30 点修为。', sell: 25, use: 'xp', value: 30 },
  // 灵根培养
  xisui_pill: { name: '洗髓丹', icon: 'pill_gold', cat: '丹药', desc: '提升一根灵根品阶（优先最低）。', sell: 80, use: 'root_xisui' },
  root_awaken_pill: { name: '灵根觉醒丹', icon: 'pill_purple', cat: '丹药', desc: '点亮一个空余灵根位（最多3）。', sell: 120, use: 'root_awaken' },
  yao_dan: { name: '妖丹', icon: 'yao_dan', cat: '材料', desc: '高阶妖兽内丹，用于灵根进阶。', sell: 35 },
  ling_sui: { name: '灵髓', icon: 'ling_sui', cat: '材料', desc: '凝练灵根的精华，用于灵根进阶。', sell: 20 },
  // 装备（含外观 look：player 绘制时叠加）
  herb_necklace: {
    name: '灵草项链', icon: 'neck', cat: '装备', desc: '移速 +15%。颈部绿叶饰。',
    sell: 80, equip: 'neck', stat: 'speed', value: 0.15,
    look: { chain: '#27ae60', gem: '#2ecc71', leaf: '#58d68d', w: 2.2, h: 3.2 }
  },
  stone_armor: {
    name: '石甲片', icon: 'armor', cat: '装备', desc: '防御 +5。灰石甲壳披身。',
    sell: 100, equip: 'armor', stat: 'def', value: 5,
    look: { dark: '#4a4a4a', light: '#9a9a9a', shell: '#bdc3c7', plates: 'rgba(189,195,199,0.5)' }
  },
  wood_armor: {
    name: '木甲', icon: 'armor', cat: '装备', desc: '防御 +3。棕色甲壳。',
    sell: 60, equip: 'armor', stat: 'def', value: 3,
    look: { dark: '#3d2814', light: '#8b5a2b', shell: '#a07040', plates: 'rgba(160,112,64,0.45)' }
  },
  iron_armor: {
    name: '铁甲', icon: 'armor', cat: '装备', desc: '防御 +8。金属亮色甲壳。',
    sell: 160, equip: 'armor', stat: 'def', value: 8,
    look: { dark: '#2c3e50', light: '#85929e', shell: '#d5dbdb', plates: 'rgba(213,219,219,0.55)' }
  },
  jaw_blade: {
    name: '颚刃', icon: 'weapon', cat: '装备', desc: '攻击 +4。手持短刃。',
    sell: 90, equip: 'weapon', stat: 'atk', value: 4,
    look: { shaft: '#6b4420', tip: '#bdc3c7' }
  },
  // 任务品
  stolen_goods: { name: '被盗货物', icon: 'box', cat: '任务品', desc: '瓢虫商人丢失的货箱。', sell: 0, quest: true },
  queen_letter: { name: '蚁后手谕', icon: 'letter', cat: '任务品', desc: '瑶光蚁后的亲笔信。', sell: 0, quest: true },
  scout_report: { name: '侦察报告', icon: 'letter', cat: '任务品', desc: '疾风带回的边境情报。', sell: 0, quest: true },
  seed_pack: { name: '灵种袋', icon: 'seed', cat: '材料', desc: '可种植的灵草种子。', sell: 8 },
  wood: { name: '枯枝', icon: 'wood', cat: '材料', desc: '建造用的材料。', sell: 2 },
  silk: { name: '蛛丝', icon: 'silk', cat: '材料', desc: '蜘蛛身上剥下的丝。', sell: 6 }
};

function drawItemIcon(ctx, icon, x, y, size) {
  size = size || 12;
  ctx.save();
  switch (icon) {
    case 'berry':
      ctx.fillStyle = '#c0392b';
      ctx.beginPath(); ctx.arc(x - 2, y, size * 0.3, 0, Math.PI * 2); ctx.fill();
      ctx.beginPath(); ctx.arc(x + 2, y - 1, size * 0.28, 0, Math.PI * 2); ctx.fill();
      ctx.fillStyle = '#27ae60';
      ctx.fillRect(x - 1, y - size * 0.4, 2, 4);
      break;
    case 'herb':
    case 'herb2':
      ctx.strokeStyle = icon === 'herb2' ? '#9b59b6' : '#27ae60';
      ctx.lineWidth = 2;
      ctx.beginPath();
      ctx.moveTo(x, y + 4); ctx.quadraticCurveTo(x - 4, y - 2, x, y - 6);
      ctx.moveTo(x, y + 4); ctx.quadraticCurveTo(x + 4, y - 2, x + 2, y - 5);
      ctx.stroke();
      break;
    case 'food':
      ctx.fillStyle = '#d4a017';
      ctx.fillRect(x - 5, y - 4, 10, 8);
      break;
    case 'stone':
      ctx.fillStyle = '#7ec8e3';
      ctx.beginPath();
      ctx.moveTo(x, y - 6); ctx.lineTo(x - 5, y + 4); ctx.lineTo(x + 5, y + 4);
      ctx.fill();
      break;
    case 'dew':
      ctx.fillStyle = '#5dade2';
      ctx.beginPath();
      ctx.moveTo(x, y - 6); ctx.quadraticCurveTo(x + 5, y, x, y + 5);
      ctx.quadraticCurveTo(x - 5, y, x, y - 6);
      ctx.fill();
      break;
    case 'mushroom':
      ctx.fillStyle = '#e8d5b7';
      ctx.fillRect(x - 2, y - 2, 4, 6);
      ctx.fillStyle = '#e74c9a';
      ctx.beginPath(); ctx.ellipse(x, y - 4, 6, 4, 0, Math.PI, 0); ctx.fill();
      break;
    case 'spring':
      ctx.fillStyle = '#4ecfff';
      ctx.beginPath(); ctx.arc(x, y, 5, 0, Math.PI * 2); ctx.fill();
      break;
    case 'pill_r':
      ctx.fillStyle = '#e74c3c';
      ctx.beginPath(); ctx.arc(x, y, 5, 0, Math.PI * 2); ctx.fill();
      break;
    case 'pill_b':
      ctx.fillStyle = '#3498db';
      ctx.beginPath(); ctx.arc(x, y, 5, 0, Math.PI * 2); ctx.fill();
      break;
    case 'pill_g':
      ctx.fillStyle = '#27ae60';
      ctx.beginPath(); ctx.arc(x, y, 5, 0, Math.PI * 2); ctx.fill();
      break;
    case 'pill_gold':
      ctx.fillStyle = '#f1c40f';
      ctx.beginPath(); ctx.arc(x, y, 5, 0, Math.PI * 2); ctx.fill();
      ctx.strokeStyle = '#fff8dc';
      ctx.lineWidth = 1;
      ctx.stroke();
      break;
    case 'pill_purple':
      ctx.fillStyle = '#9b59b6';
      ctx.beginPath(); ctx.arc(x, y, 5, 0, Math.PI * 2); ctx.fill();
      ctx.fillStyle = '#e8d5ff';
      ctx.beginPath(); ctx.arc(x - 1, y - 1, 1.5, 0, Math.PI * 2); ctx.fill();
      break;
    case 'yao_dan':
      ctx.fillStyle = '#c0392b';
      ctx.beginPath(); ctx.arc(x, y, 5, 0, Math.PI * 2); ctx.fill();
      ctx.fillStyle = '#f39c12';
      ctx.beginPath(); ctx.arc(x, y, 2, 0, Math.PI * 2); ctx.fill();
      break;
    case 'ling_sui':
      ctx.fillStyle = '#7ec8e3';
      ctx.beginPath();
      ctx.moveTo(x, y - 6); ctx.lineTo(x + 4, y); ctx.lineTo(x, y + 6); ctx.lineTo(x - 4, y);
      ctx.closePath(); ctx.fill();
      break;
    case 'neck':
      ctx.strokeStyle = '#f1c40f';
      ctx.lineWidth = 2;
      ctx.beginPath(); ctx.arc(x, y, 5, 0, Math.PI * 2); ctx.stroke();
      break;
    case 'armor':
      ctx.fillStyle = '#7f8c8d';
      ctx.fillRect(x - 5, y - 5, 10, 10);
      ctx.fillStyle = '#bdc3c7';
      ctx.fillRect(x - 3, y - 3, 6, 6);
      break;
    case 'weapon':
      ctx.strokeStyle = '#6b4420';
      ctx.lineWidth = 2;
      ctx.beginPath();
      ctx.moveTo(x - 4, y + 4);
      ctx.lineTo(x + 4, y - 4);
      ctx.stroke();
      ctx.fillStyle = '#bdc3c7';
      ctx.beginPath();
      ctx.moveTo(x + 2, y - 5);
      ctx.lineTo(x + 6, y - 2);
      ctx.lineTo(x + 3, y);
      ctx.fill();
      break;
    case 'box':
      ctx.fillStyle = '#8b5a2b';
      ctx.fillRect(x - 5, y - 4, 10, 8);
      ctx.strokeStyle = '#d4a017';
      ctx.strokeRect(x - 5, y - 4, 10, 8);
      break;
    case 'letter':
      ctx.fillStyle = '#f5e6c8';
      ctx.fillRect(x - 5, y - 4, 10, 8);
      ctx.strokeStyle = '#8b6914';
      ctx.strokeRect(x - 5, y - 4, 10, 8);
      break;
    case 'seed':
      ctx.fillStyle = '#27ae60';
      ctx.beginPath(); ctx.ellipse(x, y, 4, 3, 0, 0, Math.PI * 2); ctx.fill();
      break;
    case 'wood':
      ctx.fillStyle = '#6b4420';
      ctx.fillRect(x - 5, y - 2, 10, 4);
      break;
    case 'silk':
      ctx.strokeStyle = '#ecf0f1';
      ctx.lineWidth = 1;
      ctx.beginPath();
      ctx.moveTo(x - 5, y - 3); ctx.lineTo(x + 5, y + 3);
      ctx.moveTo(x - 5, y + 3); ctx.lineTo(x + 5, y - 3);
      ctx.stroke();
      break;
    default:
      ctx.fillStyle = '#aaa';
      ctx.fillRect(x - 4, y - 4, 8, 8);
  }
  ctx.restore();
}

function drawGatherable(ctx, g, cam, time) {
  if (g.taken) return;
  if (!cam.inView(g.x, g.y, 20)) return;
  const sp = cam.worldToScreen(g.x, g.y);
  const bob = Math.sin(time * 2.4 + g.x) * 2.2;
  ctx.save();
  drawShadow(ctx, sp.x, sp.y + 4, 5, 2);
  const def = ITEM_DEFS[g.itemId];
  if (def) drawItemIcon(ctx, def.icon, sp.x, sp.y + bob, 14);
  // 亮边 + 浮动光圈，一眼可辨
  const pulse = 11 + Math.sin(time * 3.2) * 2.5;
  ctx.strokeStyle = 'rgba(241,196,15,0.75)';
  ctx.lineWidth = 1.8;
  ctx.beginPath();
  ctx.arc(sp.x, sp.y + bob, pulse, 0, Math.PI * 2);
  ctx.stroke();
  ctx.strokeStyle = 'rgba(255,255,200,0.35)';
  ctx.lineWidth = 3;
  ctx.beginPath();
  ctx.arc(sp.x, sp.y + bob, pulse + 2, 0, Math.PI * 2);
  ctx.stroke();
  ctx.restore();
}

function findNearestGatherable(list, x, y, range) {
  let best = null;
  let bestD = range || 22;
  for (let i = 0; i < list.length; i++) {
    const g = list[i];
    if (g.taken) continue;
    const d = dist(x, y, g.x, g.y);
    if (d < bestD) { bestD = d; best = g; }
  }
  return best;
}

/** 地面掉落物 */
function createDrop(itemId, x, y, amount) {
  return {
    itemId, x, y, amount: amount || 1,
    life: 60, bob: Math.random() * 10,
    taken: false
  };
}

function drawDrop(ctx, d, cam, time) {
  if (d.taken) return;
  if (!cam.inView(d.x, d.y, 16)) return;
  const sp = cam.worldToScreen(d.x, d.y);
  const bob = Math.sin(time * 3 + d.bob) * 2;
  const def = ITEM_DEFS[d.itemId];
  if (def) drawItemIcon(ctx, def.icon, sp.x, sp.y + bob, 12);
}

module.exports = {
  ITEM_DEFS, drawItemIcon, drawGatherable, findNearestGatherable,
  createDrop, drawDrop
};
