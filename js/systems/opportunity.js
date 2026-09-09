/**
 * 机缘点 — 地图稀有触发（灵泉/仙缘石/传承之地）
 */
const { dist } = require('../pix.js');

function drawOpportunity(ctx, opp, cam, time, triggered) {
  if (triggered) return;
  if (!cam.inView(opp.x, opp.y, 24)) return;
  const sp = cam.worldToScreen(opp.x, opp.y);
  const pulse = 10 + Math.sin(time * 3 + opp.x) * 3;
  ctx.save();
  ctx.globalAlpha = 0.35 + Math.sin(time * 2.5) * 0.15;
  ctx.fillStyle = opp.color || '#7ec8e3';
  ctx.beginPath();
  ctx.arc(sp.x, sp.y, pulse, 0, Math.PI * 2);
  ctx.fill();
  ctx.globalAlpha = 0.85;
  ctx.strokeStyle = '#f5e6c8';
  ctx.lineWidth = 1.5;
  ctx.beginPath();
  ctx.arc(sp.x, sp.y, pulse + 2, 0, Math.PI * 2);
  ctx.stroke();
  // 小旗帜感
  ctx.fillStyle = '#d4a017';
  ctx.fillRect(sp.x - 1, sp.y - pulse - 8, 2, 10);
  ctx.beginPath();
  ctx.moveTo(sp.x + 1, sp.y - pulse - 8);
  ctx.lineTo(sp.x + 8, sp.y - pulse - 5);
  ctx.lineTo(sp.x + 1, sp.y - pulse - 2);
  ctx.fill();
  ctx.restore();
}

function findNearbyOpportunity(list, x, y, range, cultivation) {
  range = range || 22;
  let best = null;
  let bestD = range;
  for (let i = 0; i < list.length; i++) {
    const o = list[i];
    if (cultivation.hasOpportunity(o.id)) continue;
    const d = dist(x, y, o.x, o.y);
    if (d < bestD) { bestD = d; best = o; }
  }
  return best;
}

/**
 * 触发机缘事件
 * @returns {{msg:string, xp?:number}}
 */
function triggerOpportunity(opp, game) {
  const cul = game.cultivation;
  if (cul.hasOpportunity(opp.id)) return null;
  cul.markOpportunity(opp.id);

  const msg = cul.applyOpportunityBoost();
  // 若灵根未变，补偿修为
  let xp = 0;
  if (msg.indexOf('未变') >= 0 || msg.indexOf('消散') >= 0 || msg.indexOf('已满') >= 0) {
    xp = 25 + cul.state.realm * 10;
    cul.addXp(xp, game.player, game.particles);
  }
  cul.applyStats(game.player);

  if (game.particles) {
    game.particles.breakthrough(opp.x, opp.y);
    game.particles.floatText(opp.x, opp.y - 16, '机缘！', '#7ec8e3');
  }
  return { msg, xp, name: opp.name };
}

module.exports = {
  drawOpportunity, findNearbyOpportunity, triggerOpportunity
};
