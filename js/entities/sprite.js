/**
 * 角色精灵接口 — 点阵预渲染蚂蚁 + 战斗特效
 * 彻底抛弃 ellipse / quadraticCurveTo 实时矢量绘制
 */
const { drawAntPixel, animFrame: antAnim } = require('../gfx/sprites/ants.js');
const { animFrame } = require('../gfx/pixelsprite.js');
const { P } = require('../gfx/palette.js');

function dirFromVec(dx, dy) {
  if (Math.abs(dx) > Math.abs(dy)) return dx >= 0 ? 'right' : 'left';
  return dy >= 0 ? 'down' : 'up';
}

function legPose() { return 0; } // 兼容旧导出

/**
 * 绘制通用蚂蚁（像素点阵）
 * opts 保持与旧版兼容
 */
function drawAntSprite(ctx, opts) {
  opts = opts || {};
  const poseMap = {
    idle: 'idle',
    walk: 'walk',
    attack: 'attack',
    windup: 'windup',
    hurt: 'hurt',
    die: 'die'
  };
  let pose = poseMap[opts.pose] || 'idle';
  if (opts.dead) pose = 'die';

  const who = opts.who || 'player';
  const frame = opts.frame || 0;
  const bob = opts.bob || 0;

  // 死亡消散透明度
  let alpha = 1;
  if (opts.dead && opts.deadT != null) {
    alpha = Math.max(0, 1 - opts.deadT / 1.2);
  }

  drawAntPixel(ctx, 0, 0, {
    who,
    dir: opts.dir || 'down',
    pose,
    frame,
    bob,
    flash: opts.flash,
    alpha,
    equip: opts.equip,
    drawScale: opts.scale && opts.scale > 1.5 ? 1.15 : 1
  });
}

/** 像素挥击弧（用短矩形段近似，避免平滑 arc） */
function drawSwingArc(ctx, dir, progress, radius, color) {
  const ang0 = dir === 'left' ? Math.PI : dir === 'right' ? 0 : dir === 'up' ? -Math.PI / 2 : Math.PI / 2;
  const spread = 1.1;
  const p = Math.max(0, Math.min(1, progress));
  ctx.save();
  ctx.imageSmoothingEnabled = false;
  ctx.fillStyle = color || 'rgba(255,230,160,0.9)';
  const steps = Math.max(3, Math.floor(8 * p));
  for (let i = 0; i < steps; i++) {
    const t = i / 8;
    const a = ang0 - spread / 2 + t * spread;
    const x = Math.round(Math.cos(a) * radius);
    const y = Math.round(Math.sin(a) * radius - 2);
    ctx.fillRect(x - 1, y - 1, 3, 3);
    if (i > 0) {
      const a2 = ang0 - spread / 2 + (i - 1) / 8 * spread;
      const x2 = Math.round(Math.cos(a2) * radius * 0.72);
      const y2 = Math.round(Math.sin(a2) * radius * 0.72 - 2);
      ctx.fillStyle = 'rgba(255,255,255,0.35)';
      ctx.fillRect(x2, y2, 2, 2);
      ctx.fillStyle = color || 'rgba(255,230,160,0.9)';
    }
  }
  ctx.restore();
}

/** 敌人前摇预警（像素环） */
function drawWindupWarn(ctx, radius, progress, color) {
  const p = Math.max(0, Math.min(1, progress));
  const r = Math.round(radius);
  ctx.save();
  ctx.imageSmoothingEnabled = false;
  ctx.strokeStyle = color || 'rgba(231,76,60,0.85)';
  ctx.lineWidth = 2;
  // 像素风虚线圆：用点近似
  const n = Math.max(12, (r * 1.5) | 0);
  for (let i = 0; i < n; i++) {
    if (i % 2 === 0) continue;
    const a = (i / n) * Math.PI * 2;
    const x = Math.round(Math.cos(a) * r);
    const y = Math.round(Math.sin(a) * r);
    ctx.fillStyle = color || P.danger;
    ctx.fillRect(x - 1, y - 1, 2, 2);
  }
  // 蓄力扇形点
  const fillN = Math.floor(n * p);
  ctx.fillStyle = `rgba(231,76,60,${0.2 + p * 0.35})`;
  for (let i = 0; i < fillN; i++) {
    const a = -Math.PI / 2 + (i / n) * Math.PI * 2;
    for (let rr = 2; rr < r * (0.55 + p * 0.45); rr += 2) {
      const x = Math.round(Math.cos(a) * rr);
      const y = Math.round(Math.sin(a) * rr);
      ctx.fillRect(x, y, 1, 1);
    }
  }
  ctx.restore();
}

module.exports = {
  animFrame, dirFromVec, legPose,
  drawAntSprite, drawSwingArc, drawWindupWarn
};
