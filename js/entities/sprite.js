/**
 * 程序化像素精灵 — 部件表 + 姿态关键帧
 * 玩家 / NPC / 敌人共用绘制骨架，保持视锥外零绘制成本
 */
const { drawShadow } = require('../pix.js');

/** 动画帧采样：t 秒 → 帧索引 */
function animFrame(t, fps, frameCount) {
  const f = Math.floor(t * fps) % frameCount;
  return f < 0 ? f + frameCount : f;
}

/** 方向角 → 四向 */
function dirFromVec(dx, dy) {
  if (Math.abs(dx) > Math.abs(dy)) return dx >= 0 ? 'right' : 'left';
  return dy >= 0 ? 'down' : 'up';
}

/** 六足交替摆动量 */
function legPose(frame, side, pair) {
  // side: -1 left / 1 right; pair 0..2
  const phase = frame * 1.2 + pair * 2.1 + (side < 0 ? 0 : Math.PI);
  return Math.sin(phase) * 3.2;
}

/**
 * 绘制通用蚂蚁（三节体 + 触角 + 六足 + 大颚）
 * opts: { scale, colors, dir, pose, frame, breath, blink, jawOpen, eyes, dead, flash, equip, crown, glowEyes }
 */
function drawAntSprite(ctx, opts) {
  const s = opts.scale || 1.35;
  const col = opts.colors || {};
  const abdomenDark = col.abdomenDark || '#1a1008';
  const abdomenLight = col.abdomenLight || '#3a2814';
  const thoraxDark = col.thoraxDark || '#2a1a0c';
  const thoraxLight = col.thoraxLight || '#4a3020';
  const headDark = col.headDark || '#2a1a0c';
  const headLight = col.headLight || '#5a3a24';
  const accent = col.accent || '#d4a017';
  const outline = col.outline || 'rgba(8,4,2,0.72)';
  const pose = opts.pose || 'idle'; // idle | walk | attack | hurt | die | windup
  const frame = opts.frame || 0;
  const dir = opts.dir || 'down';
  const breath = opts.breath != null ? opts.breath : 0;
  const bob = opts.bob != null ? opts.bob : 0;
  const jawOpen = opts.jawOpen || 0;
  const blink = opts.blink;
  const dead = opts.dead;
  const flash = opts.flash;
  const equip = opts.equip || {};

  // 面向偏移
  let faceX = 0;
  if (dir === 'left') faceX = -1.2;
  else if (dir === 'right') faceX = 1.2;

  // 攻击前扑 / 受击后仰
  let lean = 0;
  let stretch = 0;
  if (pose === 'attack') {
    lean = dir === 'left' ? -0.18 : dir === 'right' ? 0.18 : 0;
    stretch = 1.8 + frame * 0.4;
  } else if (pose === 'windup') {
    lean = dir === 'left' ? 0.12 : dir === 'right' ? -0.12 : 0;
    stretch = -1.2;
  } else if (pose === 'hurt') {
    lean = (frame % 2 ? 0.1 : -0.1);
  }

  ctx.save();
  if (dead) {
    ctx.rotate(Math.min(1.25, (opts.deadT || 0) * 1.6));
  }
  ctx.rotate(lean);
  if (flash) ctx.globalAlpha = Math.min(ctx.globalAlpha, 0.55);

  drawShadow(ctx, 0, 8 * s, 10 * s, 3.6);

  // —— 六足（先画，压在身下）——
  if (!dead || (opts.deadT || 0) < 0.35) {
    ctx.strokeStyle = headDark;
    ctx.lineWidth = 1.35 * s;
    ctx.lineCap = 'round';
    const walking = pose === 'walk';
    for (let pair = 0; pair < 3; pair++) {
      const baseY = (-2 + pair * 2.4) * s + bob;
      for (const side of [-1, 1]) {
        const swing = walking ? legPose(frame, side, pair) : Math.sin(breath * 2 + pair) * 0.4;
        const lx0 = side * 3.2 * s;
        const ly0 = baseY;
        const lx1 = side * (7.5 + pair * 0.4) * s + faceX * 0.3;
        const ly1 = baseY + 5.5 * s + swing * side * 0.15 + Math.abs(swing) * 0.2;
        const lx2 = side * (9.2 + pair * 0.35) * s;
        const ly2 = baseY + 8.2 * s - swing * 0.35;
        ctx.beginPath();
        ctx.moveTo(lx0, ly0);
        ctx.quadraticCurveTo(lx1, ly1, lx2, ly2);
        ctx.stroke();
      }
    }
  }

  // —— 腹节 ——
  const abY = (4.2 + bob) * 1 + breath * 0.35 * s;
  const abRx = 5.8 * s;
  const abRy = (4.6 + breath * 0.25) * s;
  ctx.fillStyle = abdomenDark;
  ctx.beginPath();
  ctx.ellipse(faceX * 0.3, abY, abRx, abRy, 0, 0, Math.PI * 2);
  ctx.fill();
  ctx.fillStyle = abdomenLight;
  ctx.beginPath();
  ctx.ellipse(faceX * 0.3 - 0.6 * s, abY - 1.6 * s, abRx * 0.72, abRy * 0.48, 0, 0, Math.PI * 2);
  ctx.fill();
  // 腹部分节线
  ctx.strokeStyle = 'rgba(0,0,0,0.25)';
  ctx.lineWidth = 1;
  ctx.beginPath();
  ctx.ellipse(faceX * 0.3, abY + 0.5 * s, abRx * 0.75, abRy * 0.55, 0, 0.2, Math.PI - 0.2);
  ctx.stroke();
  // 金纹
  ctx.fillStyle = accent;
  ctx.fillRect(-2 * s + faceX * 0.2, abY - 0.5 * s, 4 * s, 1.8 * s);

  // 护甲覆盖腹/胸
  if (equip.armor) {
    ctx.strokeStyle = equip.armor.shell || accent;
    ctx.lineWidth = 1.4 * s;
    ctx.beginPath();
    ctx.arc(faceX * 0.2, abY - 4 * s, 5 * s, 0.25, Math.PI - 0.25);
    ctx.stroke();
    if (equip.armor.plates) {
      ctx.fillStyle = equip.armor.plates;
      ctx.fillRect(-3.2 * s, abY - 6 * s, 6.4 * s, 2 * s);
    }
  }

  // —— 胸节 ——
  const thY = (-1.5 + bob) * 1 - stretch * 0.15;
  ctx.fillStyle = thoraxDark;
  ctx.beginPath();
  ctx.ellipse(faceX * 0.5, thY, 4.6 * s, 4.1 * s, 0, 0, Math.PI * 2);
  ctx.fill();
  ctx.fillStyle = thoraxLight;
  ctx.beginPath();
  ctx.ellipse(faceX * 0.5 - 0.5 * s, thY - 1.5 * s, 3.1 * s, 2.1 * s, 0, 0, Math.PI * 2);
  ctx.fill();

  // —— 头 ——
  const hdY = (-8.2 + bob) * 1 - stretch * 0.35;
  ctx.fillStyle = headDark;
  ctx.beginPath();
  ctx.ellipse(faceX, hdY, 5.1 * s, 4.6 * s, 0, 0, Math.PI * 2);
  ctx.fill();
  ctx.fillStyle = headLight;
  ctx.beginPath();
  ctx.ellipse(faceX - 0.4 * s, hdY - 1.6 * s, 3.6 * s, 2.3 * s, 0, 0, Math.PI * 2);
  ctx.fill();

  // 大颚
  const jaw = 1.8 * s + jawOpen * 2.2 * s;
  ctx.fillStyle = '#2a1810';
  ctx.beginPath();
  ctx.moveTo(faceX - 2.2 * s, hdY + 2.5 * s);
  ctx.lineTo(faceX - 5.5 * s - jaw * 0.15, hdY + 5.5 * s + jaw * 0.2);
  ctx.lineTo(faceX - 1.2 * s, hdY + 4 * s);
  ctx.closePath();
  ctx.fill();
  ctx.beginPath();
  ctx.moveTo(faceX + 2.2 * s, hdY + 2.5 * s);
  ctx.lineTo(faceX + 5.5 * s + jaw * 0.15, hdY + 5.5 * s + jaw * 0.2);
  ctx.lineTo(faceX + 1.2 * s, hdY + 4 * s);
  ctx.closePath();
  ctx.fill();

  // 项链
  if (equip.neck) {
    ctx.strokeStyle = equip.neck.chain || '#27ae60';
    ctx.lineWidth = 1.5 * s;
    ctx.beginPath();
    ctx.arc(faceX * 0.4, thY + 2.5 * s, 4.2 * s, 0.2, Math.PI - 0.2);
    ctx.stroke();
    ctx.fillStyle = equip.neck.gem || '#2ecc71';
    ctx.beginPath();
    ctx.ellipse(faceX * 0.3, thY + 5.5 * s, (equip.neck.w || 2.5) * s, (equip.neck.h || 3) * s, 0, 0, Math.PI * 2);
    ctx.fill();
  }

  // 触角（微动）
  const antWiggle = Math.sin((opts.animT || 0) * 3.5) * 1.5;
  ctx.strokeStyle = headDark;
  ctx.lineWidth = 1.45 * s;
  ctx.beginPath();
  ctx.moveTo(faceX - 2.2 * s, hdY - 2.5 * s);
  ctx.quadraticCurveTo(faceX - 5.5 * s + antWiggle, hdY - 8 * s, faceX - 3.2 * s, hdY - 11 * s + antWiggle * 0.3);
  ctx.moveTo(faceX + 2.2 * s, hdY - 2.5 * s);
  ctx.quadraticCurveTo(faceX + 5.5 * s - antWiggle, hdY - 8 * s, faceX + 3.2 * s, hdY - 11 * s - antWiggle * 0.3);
  ctx.stroke();
  ctx.fillStyle = accent;
  ctx.beginPath();
  ctx.arc(faceX - 3.2 * s, hdY - 11 * s + antWiggle * 0.3, 1.7 * s, 0, Math.PI * 2);
  ctx.arc(faceX + 3.2 * s, hdY - 11 * s - antWiggle * 0.3, 1.7 * s, 0, Math.PI * 2);
  ctx.fill();

  // 眼睛
  const eyeY = hdY - 0.6 * s;
  const eyeCol = opts.glowEyes ? '#7df9ff' : (opts.eyeColor || '#f1c40f');
  if (dead) {
    ctx.strokeStyle = '#e74c3c';
    ctx.lineWidth = 1.4 * s;
    ctx.beginPath();
    ctx.moveTo(faceX - 3.5 * s, eyeY - 1.5 * s); ctx.lineTo(faceX - 1 * s, eyeY + 1.5 * s);
    ctx.moveTo(faceX - 1 * s, eyeY - 1.5 * s); ctx.lineTo(faceX - 3.5 * s, eyeY + 1.5 * s);
    ctx.moveTo(faceX + 1 * s, eyeY - 1.5 * s); ctx.lineTo(faceX + 3.5 * s, eyeY + 1.5 * s);
    ctx.moveTo(faceX + 3.5 * s, eyeY - 1.5 * s); ctx.lineTo(faceX + 1 * s, eyeY + 1.5 * s);
    ctx.stroke();
  } else if (blink) {
    ctx.strokeStyle = '#1a1008';
    ctx.lineWidth = 1.2 * s;
    if (dir === 'left') {
      ctx.beginPath(); ctx.moveTo(faceX - 3.8 * s, eyeY); ctx.lineTo(faceX - 1.2 * s, eyeY); ctx.stroke();
    } else if (dir === 'right') {
      ctx.beginPath(); ctx.moveTo(faceX + 1.2 * s, eyeY); ctx.lineTo(faceX + 3.8 * s, eyeY); ctx.stroke();
    } else {
      ctx.beginPath();
      ctx.moveTo(faceX - 3.2 * s, eyeY); ctx.lineTo(faceX - 0.8 * s, eyeY);
      ctx.moveTo(faceX + 0.8 * s, eyeY); ctx.lineTo(faceX + 3.2 * s, eyeY);
      ctx.stroke();
    }
  } else {
    if (opts.glowEyes) {
      ctx.fillStyle = 'rgba(125,249,255,0.35)';
      ctx.beginPath();
      ctx.arc(faceX, eyeY, 5 * s, 0, Math.PI * 2);
      ctx.fill();
    }
    ctx.fillStyle = eyeCol;
    if (dir === 'left') {
      ctx.fillRect(faceX - 3.6 * s, eyeY - 1.2 * s, 2.4 * s, 2.4 * s);
    } else if (dir === 'right') {
      ctx.fillRect(faceX + 1.2 * s, eyeY - 1.2 * s, 2.4 * s, 2.4 * s);
    } else {
      ctx.fillRect(faceX - 3 * s, eyeY - 1.2 * s, 2.4 * s, 2.4 * s);
      ctx.fillRect(faceX + 0.6 * s, eyeY - 1.2 * s, 2.4 * s, 2.4 * s);
    }
  }

  // 皇冠（蚁后）
  if (opts.crown) {
    ctx.fillStyle = '#f1c40f';
    ctx.fillRect(faceX - 5 * s, hdY - 5.5 * s, 10 * s, 2.2 * s);
    ctx.fillRect(faceX - 4 * s, hdY - 8 * s, 2 * s, 2.8 * s);
    ctx.fillRect(faceX - 0.8 * s, hdY - 9 * s, 1.6 * s, 3.6 * s);
    ctx.fillRect(faceX + 2 * s, hdY - 8 * s, 2 * s, 2.8 * s);
  }

  // 武器
  if (equip.weapon) {
    const handX = (dir === 'left' ? -1 : 1) * (8 + (pose === 'attack' ? 3 : 0)) * s + faceX;
    const handY = thY + 1 * s;
    ctx.strokeStyle = equip.weapon.shaft || '#6b4420';
    ctx.lineWidth = 2 * s;
    ctx.beginPath();
    ctx.moveTo(faceX * 0.5, handY);
    ctx.lineTo(handX, handY + 3 * s);
    ctx.stroke();
    ctx.fillStyle = equip.weapon.tip || '#95a5a6';
    ctx.beginPath();
    ctx.moveTo(handX, handY + 1 * s);
    ctx.lineTo(handX + (dir === 'left' ? -4.5 : 4.5) * s, handY + 4 * s);
    ctx.lineTo(handX, handY + 6.5 * s);
    ctx.closePath();
    ctx.fill();
  }

  // 深描边轮廓
  ctx.strokeStyle = outline;
  ctx.lineWidth = 1.35 * s;
  ctx.beginPath();
  ctx.ellipse(faceX * 0.3, abY, abRx + 0.3 * s, abRy + 0.3 * s, 0, 0, Math.PI * 2);
  ctx.stroke();
  ctx.beginPath();
  ctx.ellipse(faceX, hdY, 5.3 * s, 4.8 * s, 0, 0, Math.PI * 2);
  ctx.stroke();

  // 受击闪白
  if (flash) {
    ctx.globalAlpha = 0.5;
    ctx.fillStyle = '#ffffff';
    ctx.beginPath();
    ctx.ellipse(faceX * 0.2, thY, 7 * s, 9 * s, 0, 0, Math.PI * 2);
    ctx.fill();
  }

  ctx.restore();
}

/** 绘制挥击弧线（世界屏幕坐标，已 translate 到角色中心） */
function drawSwingArc(ctx, dir, progress, radius, color) {
  const ang = dir === 'left' ? Math.PI : dir === 'right' ? 0 : dir === 'up' ? -Math.PI / 2 : Math.PI / 2;
  const spread = 1.1;
  const start = ang - spread / 2;
  const end = ang - spread / 2 + spread * spread;
  ctx.save();
  ctx.strokeStyle = color || 'rgba(255,230,160,0.85)';
  ctx.lineWidth = 3;
  ctx.lineCap = 'round';
  ctx.beginPath();
  ctx.arc(0, -2, radius, start, end);
  ctx.stroke();
  ctx.strokeStyle = 'rgba(255,255,255,0.35)';
  ctx.lineWidth = 1.5;
  ctx.beginPath();
  ctx.arc(0, -2, radius * 0.72, start, end);
  ctx.stroke();
  ctx.restore();
}

/** 敌人前摇预警环 */
function drawWindupWarn(ctx, radius, progress, color) {
  const p = Math.max(0, Math.min(1, progress));
  ctx.save();
  ctx.strokeStyle = color || 'rgba(231,76,60,0.85)';
  ctx.lineWidth = 2.2;
  ctx.setLineDash([4, 3]);
  ctx.beginPath();
  ctx.arc(0, 0, radius, 0, Math.PI * 2);
  ctx.stroke();
  ctx.setLineDash([]);
  // 蓄力扇形
  ctx.fillStyle = color ? color.replace('0.85', String(0.15 + p * 0.25)) : `rgba(231,76,60,${0.15 + p * 0.28})`;
  ctx.beginPath();
  ctx.moveTo(0, 0);
  ctx.arc(0, 0, radius * (0.55 + p * 0.45), -Math.PI / 2, -Math.PI / 2 + p * Math.PI * 2);
  ctx.closePath();
  ctx.fill();
  ctx.restore();
}

module.exports = {
  animFrame, dirFromVec, legPose,
  drawAntSprite, drawSwingArc, drawWindupWarn
};
