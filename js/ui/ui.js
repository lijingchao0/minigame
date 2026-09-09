/**
 * UI 绘制 — HUD / 对话 / 背包 / 任务日志 / 标题 / 特效
 */
const { COLORS, drawPanel, drawButton, drawText, drawBar, roundRect, hitTest, wrapText, dist } = require('../pix.js');
const { drawItemIcon, ITEM_DEFS } = require('../entities/item.js');
const { SKILLS } = require('../systems/cultivation.js');
const { SHOP_STOCK } = require('../systems/economy.js');

/** 全局 HUD 缩放（横屏紧凑） */
const HUD_SCALE = 0.72;

function createUI(screen) {
  const ui = {
    panel: null, // 'inventory' | 'quests' | 'shop' | 'settings' | 'root_select' | null
    invTab: '材料',
    invScroll: 0,
    selectedSlot: -1,
    toast: null,
    toastT: 0,
    bannerAnim: 0,
    titlePhase: 'title', // title | root | loading | game
    rootChoices: null,
    rootPick: 0,
    breakFx: null, // {text, t}
    menuButtons: [],
    hotbarHint: true,
    hotbarAlpha: 0
  };

  function toast(msg) {
    ui.toast = msg;
    ui.toastT = 2.2;
  }

  function update(dt) {
    if (ui.toastT > 0) {
      ui.toastT -= dt;
      if (ui.toastT <= 0) ui.toast = null;
    }
    if (ui.breakFx) {
      ui.breakFx.t += dt;
      if (ui.breakFx.t > 2.5) ui.breakFx = null;
    }
  }

  function showBreakthrough(text) {
    ui.breakFx = { text, t: 0 };
  }

  // —— 标题画面（横屏） ——
  function drawTitle(ctx, hasSave, settings) {
    const w = screen.designW;
    const h = screen.designH;
    const g = ctx.createLinearGradient(0, 0, w, h);
    g.addColorStop(0, '#1a3a1a');
    g.addColorStop(0.45, '#2d5a28');
    g.addColorStop(1, '#0f1f12');
    ctx.fillStyle = g;
    ctx.fillRect(0, 0, w, h);

    // 底部草影
    ctx.fillStyle = '#143018';
    for (let i = 0; i < 36; i++) {
      const x = i * 28;
      ctx.beginPath();
      ctx.moveTo(x, h);
      ctx.quadraticCurveTo(x + 10, h - 28 - (i % 5) * 6, x + 20, h);
      ctx.fill();
    }

    // 左侧蚂蚁剪影
    ctx.save();
    ctx.translate(w * 0.28, h * 0.48);
    ctx.scale(1.15, 1.15);
    ctx.fillStyle = '#1a1008';
    ctx.beginPath(); ctx.ellipse(0, 12, 20, 15, 0, 0, Math.PI * 2); ctx.fill();
    ctx.beginPath(); ctx.ellipse(0, -4, 15, 13, 0, 0, Math.PI * 2); ctx.fill();
    ctx.beginPath(); ctx.ellipse(0, -22, 17, 15, 0, 0, Math.PI * 2); ctx.fill();
    ctx.strokeStyle = '#d4a017';
    ctx.lineWidth = 2.2;
    ctx.beginPath();
    ctx.moveTo(-6, -28); ctx.quadraticCurveTo(-18, -46, -10, -52);
    ctx.moveTo(6, -28); ctx.quadraticCurveTo(18, -46, 10, -52);
    ctx.stroke();
    ctx.fillStyle = '#d4a017';
    ctx.beginPath(); ctx.arc(-10, -52, 3.2, 0, Math.PI * 2); ctx.arc(10, -52, 3.2, 0, Math.PI * 2); ctx.fill();
    ctx.restore();

    // 右侧标题与按钮
    const tx = w * 0.62;
    drawText(ctx, '蚂蚁修仙', tx, h * 0.22, {
      align: 'center', font: 'bold 40px "PingFang SC","KaiTi",serif', color: '#f5e6c8', shadow: true
    });
    drawText(ctx, 'v2.4 · 横屏修仙 · 饥荒式战斗', tx, h * 0.22 + 44, {
      align: 'center', font: '13px "PingFang SC",sans-serif', color: COLORS.gold
    });

    const bw = 170;
    const bh = 36;
    const bx = tx - bw / 2;
    let by = h * 0.42;
    drawButton(ctx, bx, by, bw, bh, '开始旅程');
    ui._titleBtns = [{ id: 'new', x: bx, y: by, w: bw, h: bh }];
    by += 44;
    if (hasSave) {
      drawButton(ctx, bx, by, bw, bh, '继续修仙');
      ui._titleBtns.push({ id: 'continue', x: bx, y: by, w: bw, h: bh });
      by += 44;
    }
    drawButton(ctx, bx, by, bw, bh, '设  置');
    ui._titleBtns.push({ id: 'settings', x: bx, y: by, w: bw, h: bh });

    drawText(ctx, '点触地图移动 · WASD · 右下角攻击', w / 2, h - 18, {
      align: 'center', font: '11px sans-serif', color: COLORS.textDim
    });
  }

  function hitTitle(x, y) {
    const btns = ui._titleBtns || [];
    for (let i = 0; i < btns.length; i++) {
      const b = btns[i];
      if (hitTest(x, y, b.x, b.y, b.w, b.h)) return b.id;
    }
    return null;
  }

  // —— 主 HUD（横屏） ——
  function drawHUD(ctx, game) {
    const w = screen.designW;
    const h = screen.designH;
    const p = game.player;
    const cul = game.cultivation;
    const S = HUD_SCALE;
    const padL = Math.max(6, (screen.safeLeft || 0) * 0.3);

    // 左上状态（紧凑横条）
    const lpW = 168;
    const lpH = 54;
    drawPanel(ctx, padL, 6, lpW, lpH, { radius: 6 });
    ctx.fillStyle = '#4a3420';
    ctx.beginPath();
    ctx.arc(padL + 18, 28, 11, 0, Math.PI * 2);
    ctx.fill();
    ctx.fillStyle = '#e8bc3a';
    ctx.beginPath();
    ctx.arc(padL + 18, 24, 4.2, 0, Math.PI * 2);
    ctx.fill();

    drawText(ctx, cul.realmName(), padL + 34, 8, { font: 'bold 11px sans-serif', color: COLORS.gold });
    drawText(ctx, cul.rootsLabel(), padL + 34, 21, { font: '8px sans-serif', color: COLORS.textDim });
    drawBar(ctx, padL + 34, 34, lpW - 44, 5, p.hp / p.maxHp, COLORS.hp);
    drawBar(ctx, padL + 34, 41, lpW - 44, 5, p.mp / p.maxMp, COLORS.mp);
    drawBar(ctx, padL + 34, 48, lpW - 44, 4, cul.state.xp / cul.xpNeeded(), COLORS.xp);
    ui._hudLeft = { x: padL, y: 6, w: lpW, h: lpH };

    // 右上：倍速 | 资源 | 小地图（分区）
    const mmW = 88;
    const mmH = 64;
    const mmX = w - mmW - 6;
    drawMinimap(ctx, game, mmX, 6, mmW, mmH);

    const rpW = 108;
    const rpX = mmX - rpW - 6;
    drawPanel(ctx, rpX, 6, rpW, 40, { radius: 6 });
    drawText(ctx, '金 ' + game.inventory.state.gold, rpX + 8, 10, { font: '10px sans-serif' });
    drawText(ctx, game.daycycle.timeLabel(), rpX + 8, 22, { font: '9px sans-serif', color: COLORS.textDim });
    drawText(ctx, '繁 ' + game.kingdom.state.prosperity, rpX + 8, 32, { font: '9px sans-serif', color: '#e67e22' });

    const spLabel = game.daycycle.speedLabel();
    drawButton(ctx, rpX - 42, 6, 38, 28, spLabel, { font: 'bold 11px sans-serif' });
    ui._speedBtn = { x: rpX - 42, y: 6, w: 38, h: 28 };
    ui._hudRight = { x: rpX - 42, y: 6, w: rpW + mmW + 54, h: mmH };
    ui._minimapHit = { x: mmX, y: 6, w: mmW, h: mmH };

    // 任务简讯（左上状态下方）
    drawQuestBrief(ctx, game, w);

    drawQuestGuide(ctx, game, w, h);

    // 右下：技能+攻击区（右手拇指）
    drawHotbar(ctx, game, w, h);

    // 功能按钮：技能区左侧竖排
    const btnW = Math.round(36 * S);
    const btnH = Math.round(30 * S);
    const gap = btnH + 6;
    const funcs = [
      { id: 'bag', label: '包' },
      { id: 'quest', label: '志' },
      { id: 'meditate', label: '修' },
      { id: 'menu', label: '菜' }
    ];
    ui._funcBtns = [];
    // 放在热键区左侧
    const hot = ui._hotbarBox;
    let fbx = w - 200;
    let fy = h - 16 - funcs.length * gap;
    if (hot) {
      fbx = hot.x - btnW - 8;
      fy = hot.y + 4;
    }
    for (let i = 0; i < funcs.length; i++) {
      const f = funcs[i];
      const by = fy + i * gap;
      drawButton(ctx, fbx, by, btnW, btnH, f.label, { font: 'bold 12px sans-serif' });
      ui._funcBtns.push({ id: f.id, x: fbx, y: by, w: btnW, h: btnH });
    }

    if (game._interactHint) {
      drawText(ctx, game._interactHint, w / 2, h - 28, {
        align: 'center', font: '12px sans-serif', color: '#f1c40f', shadow: true
      });
    }

    const banners = game.quests.state.banners;
    for (let i = 0; i < banners.length; i++) {
      const b = banners[i];
      const a = b.t < 0.3 ? b.t / 0.3 : b.t > b.life - 0.4 ? (b.life - b.t) / 0.4 : 1;
      ctx.save();
      ctx.globalAlpha = a;
      drawPanel(ctx, w / 2 - 130, 8 + i * 30, 260, 26, { gold: true, radius: 6 });
      drawText(ctx, b.text, w / 2, 13 + i * 30, {
        align: 'center', font: 'bold 12px sans-serif', color: COLORS.gold
      });
      ctx.restore();
    }

    if (ui.toast) {
      ctx.save();
      ctx.globalAlpha = Math.min(1, ui.toastT);
      drawPanel(ctx, w / 2 - 110, h / 2 - 18, 220, 36, { radius: 8 });
      drawText(ctx, ui.toast, w / 2, h / 2 - 6, {
        align: 'center', font: '13px sans-serif'
      });
      ctx.restore();
    }

    if (ui.breakFx) {
      const t = ui.breakFx.t;
      const a = t < 0.3 ? t / 0.3 : t > 2 ? (2.5 - t) / 0.5 : 1;
      ctx.save();
      ctx.globalAlpha = a * 0.85;
      ctx.fillStyle = '#000';
      ctx.fillRect(0, 0, w, h);
      ctx.globalAlpha = a;
      drawText(ctx, '境 界 突 破', w / 2, h / 2 - 30, {
        align: 'center', font: 'bold 28px "PingFang SC",serif', color: COLORS.gold
      });
      drawText(ctx, ui.breakFx.text, w / 2, h / 2 + 10, {
        align: 'center', font: '16px sans-serif', color: COLORS.text
      });
      ctx.restore();
    }
  }

  function nearestEnemyDist(game) {
    if (!game.player || !game.enemies) return Infinity;
    const pc = game.player.getCenter();
    let best = Infinity;
    for (let i = 0; i < game.enemies.length; i++) {
      const e = game.enemies[i];
      if (e.dead) continue;
      const d = dist(pc.x, pc.y, e.x, e.y);
      if (d < best) best = d;
    }
    return best;
  }

  function drawHotbar(ctx, game, w, h) {
    const near = nearestEnemyDist(game);
    const tutCombat = game.tutorial && game.tutorial.state.active &&
      game.tutorial.current() && game.tutorial.current().id === 'combat';
    const wantShow = tutCombat || near < 160;
    const targetA = wantShow ? 0.95 : (near < 240 ? 0.45 : 0.2);
    ui.hotbarAlpha += (targetA - ui.hotbarAlpha) * 0.15;
    ui._hotbtns = [];
    ui._hotbarBox = null;

    // 横屏：右下角技能+攻击区（始终保留可点区域，半透明）
    const skills = game.cultivation.state.learned;
    const slotN = 1 + Math.min(4, Math.max(skills.length, 2));
    const R = 17;
    const gap = 7;
    const barW = slotN * (R * 2 + gap) + 14;
    const barH = 46;
    const barX = w - barW - 10;
    const barY = h - barH - 8;
    const cy = barY + barH / 2;
    ui._hotbarBox = { x: barX, y: barY, w: barW, h: barH };

    if (ui.hotbarAlpha < 0.08) {
      // 仍注册攻击键便于教程高亮
      ui._hotbtns.push({ id: 'attack', x: barX + 8, y: barY + 6, w: R * 2, h: R * 2 });
      return;
    }

    ctx.save();
    ctx.globalAlpha = ui.hotbarAlpha;
    drawPanel(ctx, barX, barY, barW, barH, {
      radius: 12,
      fill: wantShow ? 'rgba(48,42,36,0.82)' : 'rgba(48,42,36,0.48)'
    });

    function drawSkillCircle(cx, cy, label, opts) {
      opts = opts || {};
      const disabled = opts.disabled;
      const cd = opts.cd || 0;
      const cdMax = opts.cdMax || 1;
      const noMp = opts.noMp;
      ctx.beginPath();
      ctx.arc(cx, cy, R, 0, Math.PI * 2);
      ctx.fillStyle = disabled || noMp ? '#3a3228' : '#6b4a28';
      ctx.fill();
      ctx.strokeStyle = disabled ? '#4a4030' : COLORS.gold;
      ctx.lineWidth = 2;
      ctx.stroke();
      if (!disabled && !noMp) {
        ctx.fillStyle = 'rgba(255,220,150,0.18)';
        ctx.beginPath();
        ctx.arc(cx, cy - 4, R * 0.55, Math.PI, 0);
        ctx.fill();
      }
      drawText(ctx, label, cx, cy - 5, {
        align: 'center', font: 'bold 10px sans-serif',
        color: disabled || noMp ? '#776655' : COLORS.text
      });
      if (cd > 0 && cdMax > 0) {
        ctx.fillStyle = 'rgba(0,0,0,0.55)';
        ctx.beginPath();
        ctx.moveTo(cx, cy);
        ctx.arc(cx, cy, R, -Math.PI / 2, -Math.PI / 2 + (cd / cdMax) * Math.PI * 2);
        ctx.closePath();
        ctx.fill();
        drawText(ctx, Math.ceil(cd) + '', cx, cy - 5, {
          align: 'center', font: 'bold 11px sans-serif', color: '#fff'
        });
      }
      if (noMp && !disabled) {
        drawText(ctx, '灵', cx, cy + 8, {
          align: 'center', font: '8px sans-serif', color: '#5dade2'
        });
      }
    }

    const ax = barX + 10 + R;
    drawSkillCircle(ax, cy, '攻', {});
    ui._hotbtns.push({ id: 'attack', x: ax - R, y: cy - R, w: R * 2, h: R * 2 });

    const SKILL_SHORT = { lingbu: '步', jiaqiao: '甲', tusi: '丝', leifa: '雷' };
    for (let i = 0; i < Math.min(4, slotN - 1); i++) {
      const sx = barX + 10 + (i + 1) * (R * 2 + gap) + R;
      const sk = SKILLS.find((s) => s.id === skills[i]);
      const label = sk ? (SKILL_SHORT[sk.id] || sk.name.slice(0, 1)) : '—';
      const cd = sk ? (game.cultivation.state.skillCd[sk.id] || 0) : 0;
      const noMp = sk && game.player.mp < sk.mpCost;
      drawSkillCircle(sx, cy, label, {
        disabled: !sk,
        cd,
        cdMax: sk ? sk.cd : 1,
        noMp
      });
      ui._hotbtns.push({
        id: 'skill' + i, x: sx - R, y: cy - R, w: R * 2, h: R * 2,
        skillId: sk ? sk.id : null
      });
    }
    ctx.restore();
  }

  function drawQuestBrief(ctx, game, w) {
    ui._questBriefHit = null;
    const track = game.quests.trackingInfo(game);
    const bx = 6;
    const by = 64;
    const bw = Math.min(280, w * 0.38);
    if (!track) {
      drawPanel(ctx, bx, by, bw, 26, { radius: 5, fill: 'rgba(48,42,36,0.75)' });
      drawText(ctx, '无事可做，沿主线指引推进', bx + 8, by + 7, {
        font: '10px sans-serif', color: COLORS.textDim
      });
      ui._questBriefHit = { x: bx, y: by, w: bw, h: 26 };
      return;
    }
    const lines = track.brief || ('[' + track.kind + '] ' + track.name + ' · ' + track.stepText);
    drawPanel(ctx, bx, by, bw, 32, { radius: 5, fill: 'rgba(48,42,36,0.82)', borderColor: COLORS.gold });
    drawText(ctx, lines.length > 28 ? lines.slice(0, 28) + '…' : lines, bx + 8, by + 5, {
      font: 'bold 10px sans-serif', color: COLORS.gold
    });
    drawText(ctx, track.stepText, bx + 8, by + 18, {
      font: '9px sans-serif', color: COLORS.text
    });
    ui._questBriefHit = { x: bx, y: by, w: bw, h: 32 };
  }

  function drawQuestGuide(ctx, game, w, h) {
    const track = game.quests.trackingInfo(game);
    if (!track || !track.target) return;
    const t = track.target;
    if (t.locked) return; // 不显示死箭头，文案已在简讯

    const cam = game.camera;
    if (!cam) return;
    const sp = cam.worldToScreen(t.x, t.y);
    const margin = 22;
    const onScreen = sp.x >= margin && sp.x <= w - margin && sp.y >= margin + 40 && sp.y <= h - margin - 50;

    ctx.save();
    if (onScreen && !t.viaPortal) {
      // 目标头顶标记
      const pulse = 6 + Math.sin((game.time || 0) * 5) * 2;
      ctx.strokeStyle = '#f1c40f';
      ctx.lineWidth = 2;
      ctx.beginPath();
      ctx.arc(sp.x, sp.y - 18, pulse, 0, Math.PI * 2);
      ctx.stroke();
      ctx.fillStyle = 'rgba(241,196,15,0.35)';
      ctx.beginPath();
      ctx.arc(sp.x, sp.y - 18, pulse * 0.5, 0, Math.PI * 2);
      ctx.fill();
      // 向下小箭头
      ctx.fillStyle = '#f1c40f';
      ctx.beginPath();
      ctx.moveTo(sp.x, sp.y - 6);
      ctx.lineTo(sp.x - 5, sp.y - 14);
      ctx.lineTo(sp.x + 5, sp.y - 14);
      ctx.closePath();
      ctx.fill();
    } else {
      // 屏幕边缘方向箭头
      const cx = w / 2;
      const cy = h / 2;
      let dx = sp.x - cx;
      let dy = sp.y - cy;
      const len = Math.sqrt(dx * dx + dy * dy) || 1;
      dx /= len; dy /= len;
      const edgePad = 28;
      // 与矩形边界求交
      const sx = dx > 0 ? (w - edgePad - cx) / dx : (edgePad - cx) / (dx || 0.0001);
      const sy = dy > 0 ? (h - edgePad - 40 - cy) / dy : (edgePad + 50 - cy) / (dy || 0.0001);
      const tHit = Math.min(Math.abs(sx), Math.abs(sy));
      const ax = cx + dx * tHit;
      const ay = cy + dy * tHit;
      const ang = Math.atan2(dy, dx);
      ctx.translate(ax, ay);
      ctx.rotate(ang);
      ctx.fillStyle = 'rgba(241,196,15,0.9)';
      ctx.beginPath();
      ctx.moveTo(10, 0);
      ctx.lineTo(-8, 7);
      ctx.lineTo(-4, 0);
      ctx.lineTo(-8, -7);
      ctx.closePath();
      ctx.fill();
      ctx.strokeStyle = 'rgba(40,28,10,0.7)';
      ctx.lineWidth = 1.5;
      ctx.stroke();
    }
    ctx.restore();
  }

  function drawMinimap(ctx, game, x, y, mw, mh) {
    drawPanel(ctx, x, y, mw, mh, { radius: 6 });
    const region = game.regions.getCurrent();
    if (!region) return;
    const map = region.map;
    const scaleX = (mw - 8) / map.pixelW();
    const scaleY = (mh - 8) / map.pixelH();
    const sc = Math.min(scaleX, scaleY);
    ctx.fillStyle = '#1a2a1a';
    ctx.fillRect(x + 4, y + 4, mw - 8, mh - 8);

    // 玩家
    const px = x + 4 + game.player.x * sc;
    const py = y + 4 + game.player.y * sc;
    ctx.fillStyle = '#f1c40f';
    ctx.fillRect(px - 1.5, py - 1.5, 3, 3);

    // NPC
    for (let i = 0; i < game.npcs.length; i++) {
      const n = game.npcs[i];
      ctx.fillStyle = '#3498db';
      ctx.fillRect(x + 4 + n.x * sc, y + 4 + n.y * sc, 2, 2);
    }
    // 敌人
    for (let i = 0; i < game.enemies.length; i++) {
      const e = game.enemies[i];
      if (e.dead) continue;
      ctx.fillStyle = '#e74c3c';
      ctx.fillRect(x + 4 + e.x * sc, y + 4 + e.y * sc, 2, 2);
    }
    drawText(ctx, region.name, x + mw / 2, y + mh - 12, {
      align: 'center', font: '9px sans-serif', color: COLORS.textDim
    });
  }

  // —— 对话面板 ——
  function drawDialog(ctx, dialog) {
    if (!dialog.state.open) return;
    const st = dialog.state;
    const L = dialog.layout(screen.designW, screen.designH);

    drawPanel(ctx, L.px, L.py, L.pw, L.panelH - 4, { gold: true, radius: 10 });

    // 立绘圆
    ctx.fillStyle = st.color;
    ctx.beginPath();
    ctx.arc(L.px + 38, L.py + 42, 24, 0, Math.PI * 2);
    ctx.fill();
    ctx.fillStyle = 'rgba(0,0,0,0.2)';
    ctx.beginPath();
    ctx.arc(L.px + 38, L.py + 42, 16, 0, Math.PI * 2);
    ctx.fill();

    // 名字牌
    drawPanel(ctx, L.px + 70, L.py + 8, 130, 20, {
      radius: 4, fill: 'rgba(0,0,0,0.35)', borderColor: COLORS.gold
    });
    drawText(ctx, st.speaker, L.px + 78, L.py + 11, {
      font: 'bold 11px sans-serif', color: COLORS.gold
    });
    if (st.role) {
      drawText(ctx, st.role, L.px + 206, L.py + 12, {
        font: '10px sans-serif', color: COLORS.textDim
      });
    }

    // 文本区（安全区，不侵入底部按键）
    ctx.save();
    ctx.beginPath();
    ctx.rect(L.textX - 2, L.textY, L.textW + 4, L.textH - 4);
    ctx.clip();
    ctx.font = '13px "PingFang SC",sans-serif';
    const lines = wrapText(ctx, dialog.visibleText(), L.textW);
    const maxLines = Math.floor((L.textH - 4) / 17);
    for (let i = 0; i < Math.min(lines.length, maxLines); i++) {
      drawText(ctx, lines[i], L.textX, L.textY + 2 + i * 17, {
        font: '13px "PingFang SC",sans-serif'
      });
    }
    ctx.restore();

    // 选项区 / 下一页按键（固定下部）
    if (L.hasChoices) {
      for (let i = 0; i < L.choices.length; i++) {
        const c = L.choices[i];
        drawButton(ctx, c.x, c.y, c.w, c.h, c.label, { font: 'bold 12px sans-serif' });
      }
    } else if (st.full && L.nextBtn) {
      drawButton(ctx, L.nextBtn.x, L.nextBtn.y, L.nextBtn.w, L.nextBtn.h,
        st.pageIdx < st.pages.length - 1 ? '下一页' : '关闭',
        { font: 'bold 11px sans-serif' });
    } else if (!st.full && L.nextBtn) {
      drawText(ctx, '…', L.nextBtn.x + L.nextBtn.w / 2, L.nextBtn.y + 6, {
        align: 'center', font: '12px sans-serif', color: COLORS.gold
      });
    }
  }

  // —— 背包（横屏：左列表 / 右详情） ——
  function drawInventory(ctx, game) {
    const w = screen.designW;
    const h = screen.designH;
    ctx.fillStyle = 'rgba(0,0,0,0.45)';
    ctx.fillRect(0, 0, w, h);
    const pw = Math.min(760, w - 40);
    const ph = h - 36;
    const px = (w - pw) / 2;
    const py = 16;
    drawPanel(ctx, px, py, pw, ph, { gold: true, radius: 10 });
    drawText(ctx, '背 包', px + 16, py + 10, { font: 'bold 16px serif', color: COLORS.gold });
    drawText(ctx, '金币 ' + game.inventory.state.gold, px + 90, py + 14, { font: '12px sans-serif' });

    const tabs = ['材料', '装备', '丹药', '任务品', '灵根'];
    ui._invTabs = [];
    for (let i = 0; i < tabs.length; i++) {
      const tx = px + 8 + i * 72;
      const active = ui.invTab === tabs[i];
      drawButton(ctx, tx, py + 34, 66, 26, tabs[i], { pressed: active });
      ui._invTabs.push({ tab: tabs[i], x: tx, y: py + 34, w: 66, h: 26 });
    }

    ui._rootUpgradeBtns = [];
    ui._rootItemBtns = [];

    const leftW = Math.floor(pw * 0.55);
    const rightX = px + leftW + 8;
    const rightW = pw - leftW - 20;

    if (ui.invTab === '灵根') {
      drawRootPanel(ctx, game, px, py, pw, ph);
    } else {
      const items = game.inventory.byCategory(ui.invTab);
      const cols = 6;
      const cell = 44;
      const startY = py + 68;
      ui._invCells = [];
      for (let i = 0; i < items.length; i++) {
        const col = i % cols;
        const row = (i / cols) | 0;
        const cx = px + 14 + col * (cell + 6);
        const cy = startY + row * (cell + 6);
        if (cy + cell > py + ph - 12) break;
        drawPanel(ctx, cx, cy, cell, cell, { radius: 6, borderColor: ui.selectedSlot === i ? COLORS.gold : COLORS.panelBorder });
        const def = ITEM_DEFS[items[i].id];
        if (def) drawItemIcon(ctx, def.icon, cx + cell / 2, cy + cell / 2 - 4, 15);
        drawText(ctx, '×' + items[i].amount, cx + cell - 4, cy + cell - 13, {
          align: 'right', font: '10px sans-serif'
        });
        ui._invCells.push({ i, item: items[i], x: cx, y: cy, w: cell, h: cell });
      }

      // 右侧详情栏
      drawPanel(ctx, rightX, py + 68, rightW, ph - 84, { radius: 8 });
      if (ui.selectedSlot >= 0 && items[ui.selectedSlot]) {
        const it = items[ui.selectedSlot];
        const def = ITEM_DEFS[it.id];
        if (def) {
          drawText(ctx, def.name, rightX + 14, py + 80, { font: 'bold 14px sans-serif', color: COLORS.gold });
          ctx.font = '12px "PingFang SC",sans-serif';
          const descLines = wrapText(ctx, def.desc || '', rightW - 28);
          for (let i = 0; i < Math.min(descLines.length, 6); i++) {
            drawText(ctx, descLines[i], rightX + 14, py + 104 + i * 16, {
              font: '12px sans-serif', color: COLORS.textDim
            });
          }
          drawButton(ctx, rightX + 14, py + ph - 70, 90, 30, def.use || def.equip ? '使用' : '出售');
          ui._invUse = { x: rightX + 14, y: py + ph - 70, w: 90, h: 30, item: it };
          drawButton(ctx, rightX + 114, py + ph - 70, 90, 30, '出售');
          ui._invSell = { x: rightX + 114, y: py + ph - 70, w: 90, h: 30, item: it };
        }
      } else {
        drawText(ctx, '选择左侧物品查看详情', rightX + 14, py + 100, {
          font: '12px sans-serif', color: COLORS.textDim
        });
        ui._invUse = null;
        ui._invSell = null;
      }
    }

    drawButton(ctx, px + pw - 70, py + 8, 54, 28, '关闭');
    ui._invClose = { x: px + pw - 70, y: py + 8, w: 54, h: 28 };
  }

  function drawRootPanel(ctx, game, px, py, pw, ph) {
    const cul = game.cultivation;
    const roots = cul.state.roots || [];
    ui._invCells = [];
    ui._invUse = null;
    ui._invSell = null;

    drawText(ctx, '修炼系数 ×' + cul.cultivateMul().toFixed(2) + '（单灵根纯净加成更高）', px + 16, py + 68, {
      font: '11px sans-serif', color: COLORS.textDim
    });

    const colW = Math.floor((pw - 36) / Math.max(1, Math.min(3, Math.max(roots.length, 1))));
    let x0 = px + 12;
    const y0 = py + 88;
    for (let i = 0; i < roots.length; i++) {
      const r = roots[i];
      const def = cul.getRootDef(r.typeId);
      const q = cul.getQuality(r.quality);
      const cardW = Math.min(220, colW - 8);
      const cx = x0 + i * (cardW + 10);
      drawPanel(ctx, cx, y0, cardW, 100, { radius: 6, borderColor: def.color });
      ctx.fillStyle = def.color;
      ctx.beginPath();
      ctx.arc(cx + 22, y0 + 28, 12, 0, Math.PI * 2);
      ctx.fill();
      drawText(ctx, q.name + def.name + '灵根', cx + 42, y0 + 14, {
        font: 'bold 12px sans-serif', color: COLORS.gold
      });
      let desc = '品阶加成 ×' + q.mul.toFixed(2);
      if (r.quality === 'bianyi' && def.mutation) {
        desc = def.mutation.name + '：' + def.mutation.desc;
      }
      drawText(ctx, desc.length > 18 ? desc.slice(0, 18) + '…' : desc, cx + 42, y0 + 34, {
        font: '10px sans-serif', color: COLORS.textDim
      });

      const next = cul.nextQualityId(r.quality);
      if (next) {
        drawButton(ctx, cx + 14, y0 + 60, 70, 28, '进阶');
        ui._rootUpgradeBtns.push({ i, x: cx + 14, y: y0 + 60, w: 70, h: 28 });
      } else {
        drawText(ctx, '已满', cx + 24, y0 + 68, { font: '11px sans-serif', color: COLORS.gold });
      }
    }

    const y = py + ph - 100;
    drawPanel(ctx, px + 12, y, pw - 24, 88, { radius: 6 });
    drawText(ctx, '培养道具', px + 24, y + 8, { font: 'bold 12px sans-serif', color: COLORS.gold });
    const pills = [
      { id: 'xisui_pill', label: '洗髓' },
      { id: 'root_awaken_pill', label: '觉醒' },
      { id: 'ling_sui', label: '灵髓' },
      { id: 'yao_dan', label: '妖丹' }
    ];
    ui._rootItemBtns = [];
    for (let i = 0; i < pills.length; i++) {
      const n = game.inventory.count(pills[i].id);
      const bx = px + 24 + i * 100;
      const by = y + 34;
      drawButton(ctx, bx, by, 88, 40, pills[i].label);
      drawText(ctx, '×' + n, bx + 44, by + 24, { align: 'center', font: '10px sans-serif', color: COLORS.textDim });
      ui._rootItemBtns.push({ id: pills[i].id, x: bx, y: by, w: 88, h: 40 });
    }
  }

  /** 点击行走目标标记 */
  function drawWalkMarker(ctx, game) {
    const wt = game.input && game.input.state.walkTarget;
    if (!wt || !game.camera) return;
    const sp = game.camera.worldToScreen(wt.x, wt.y);
    const t = game.time || 0;
    const pulse = 8 + Math.sin(t * 6) * 2;
    ctx.save();
    ctx.strokeStyle = 'rgba(241,196,15,0.85)';
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.arc(sp.x, sp.y, pulse, 0, Math.PI * 2);
    ctx.stroke();
    ctx.globalAlpha = 0.35;
    ctx.fillStyle = '#f1c40f';
    ctx.beginPath();
    ctx.arc(sp.x, sp.y, pulse * 0.55, 0, Math.PI * 2);
    ctx.fill();
    // 小旗
    ctx.globalAlpha = 0.9;
    ctx.fillStyle = '#d4a017';
    ctx.fillRect(sp.x - 1, sp.y - pulse - 10, 2, 12);
    ctx.beginPath();
    ctx.moveTo(sp.x + 1, sp.y - pulse - 10);
    ctx.lineTo(sp.x + 9, sp.y - pulse - 6);
    ctx.lineTo(sp.x + 1, sp.y - pulse - 2);
    ctx.fill();
    ctx.restore();
  }

  // —— 任务日志（横屏左右分栏感） ——
  function drawQuestLog(ctx, game) {
    const w = screen.designW;
    const h = screen.designH;
    ctx.fillStyle = 'rgba(0,0,0,0.4)';
    ctx.fillRect(0, 0, w, h);
    const pw = Math.min(760, w - 40);
    const ph = h - 32;
    const px = (w - pw) / 2;
    const py = 14;
    drawPanel(ctx, px, py, pw, ph, { gold: true, radius: 10 });
    drawText(ctx, '任务日志', px + 16, py + 10, { font: 'bold 16px serif', color: COLORS.gold });
    drawText(ctx, '主线不可放弃 · 点击追踪', px + 110, py + 14, { font: '10px sans-serif', color: COLORS.textDim });
    drawButton(ctx, px + pw - 70, py + 8, 54, 28, '关闭');
    ui._qClose = { x: px + pw - 70, y: py + 8, w: 54, h: 28 };

    const mid = px + pw / 2;
    let yL = py + 44;
    let yR = py + 44;
    ui._qTrackBtns = [];
    const activeIds = Object.keys(game.quests.state.active);
    const mainActive = activeIds.filter((id) => id.charAt(0) === 'm');
    const sideActive = activeIds.filter((id) => id.charAt(0) !== 'm');
    const completedIds = Object.keys(game.quests.state.completed);

    function drawSection(title, ids, color, left) {
      let y = left ? yL : yR;
      const x = left ? px : mid;
      const colW = pw / 2 - 16;
      if (y > py + ph - 40) return;
      drawText(ctx, title, x + 16, y, { font: 'bold 12px sans-serif', color });
      y += 16;
      if (!ids.length) {
        drawText(ctx, '（空）', x + 16, y, { font: '10px sans-serif', color: COLORS.textDim });
        y += 16;
      } else {
        for (let i = 0; i < ids.length; i++) {
          if (y > py + ph - 50) break;
          const id = ids[i];
          const q = game.quests.getDef(id);
          if (!q) continue;
          const step = game.quests.currentStep(id);
          const tracking = game.quests.state.tracking === id;
          const done = !!game.quests.state.completed[id];
          drawPanel(ctx, x + 12, y, colW - 8, done ? 32 : 44, {
            radius: 6, borderColor: tracking ? COLORS.gold : COLORS.panelBorder
          });
          const tag = q.chapter ? '主线' : '支线';
          drawText(ctx, tag + '·' + q.name + (tracking ? ' 〔追踪〕' : '') + (done ? ' ✓' : ''), x + 20, y + 5, {
            font: 'bold 11px sans-serif', color: done ? COLORS.textDim : COLORS.gold
          });
          if (!done) {
            const st = step ? step.text : '…';
            drawText(ctx, st.length > 26 ? st.slice(0, 26) + '…' : st, x + 20, y + 22, { font: '10px sans-serif' });
            ui._qTrackBtns.push({ id, x: x + 12, y, w: colW - 8, h: 44 });
            y += 50;
          } else {
            y += 38;
          }
        }
      }
      y += 4;
      if (left) yL = y; else yR = y;
    }

    drawSection('主线', mainActive, '#f1c40f', true);
    drawSection('支线', sideActive, '#5dade2', false);
    const doneShow = completedIds.slice(-5);
    drawSection('已完成 ' + completedIds.length, doneShow, '#95a5a6', true);
  }

  // —— 商店 ——
  function drawShop(ctx, game) {
    const w = screen.designW;
    const h = screen.designH;
    ctx.fillStyle = 'rgba(0,0,0,0.45)';
    ctx.fillRect(0, 0, w, h);
    const pw = Math.min(560, w - 80);
    const ph = h - 40;
    const px = (w - pw) / 2;
    const py = 18;
    drawPanel(ctx, px, py, pw, ph, { gold: true, radius: 10 });
    drawText(ctx, '瓢虫杂货铺', px + 16, py + 12, { font: 'bold 16px serif', color: COLORS.gold });
    drawText(ctx, '金币 ' + game.inventory.state.gold, px + 16, py + 36, { font: '12px sans-serif' });
    drawButton(ctx, px + pw - 70, py + 8, 54, 28, '关闭');
    ui._shopClose = { x: px + pw - 70, y: py + 8, w: 54, h: 28 };

    ui._shopItems = [];
    let y = py + 56;
    const cols = 2;
    const cardW = (pw - 40) / cols;
    for (let i = 0; i < SHOP_STOCK.length; i++) {
      const s = SHOP_STOCK[i];
      const def = ITEM_DEFS[s.id];
      const col = i % cols;
      const row = (i / cols) | 0;
      const cx = px + 14 + col * (cardW + 8);
      const cy = y + row * 48;
      drawPanel(ctx, cx, cy, cardW, 42, { radius: 6 });
      if (def) drawItemIcon(ctx, def.icon, cx + 20, cy + 21, 14);
      drawText(ctx, def ? def.name : s.id, cx + 38, cy + 8, { font: '12px sans-serif' });
      drawText(ctx, s.price + ' 金', cx + 38, cy + 24, { font: '10px sans-serif', color: COLORS.gold });
      drawButton(ctx, cx + cardW - 70, cy + 7, 58, 28, '购买');
      ui._shopItems.push({ id: s.id, x: cx + cardW - 70, y: cy + 7, w: 58, h: 28 });
    }
  }

  // —— 设置 ——
  function drawSettings(ctx, settings, daycycle) {
    const w = screen.designW;
    const h = screen.designH;
    ctx.fillStyle = 'rgba(0,0,0,0.45)';
    ctx.fillRect(0, 0, w, h);
    const pw = 420;
    const ph = 240;
    const px = (w - pw) / 2;
    const py = (h - ph) / 2;
    drawPanel(ctx, px, py, pw, ph, { gold: true, radius: 10 });
    drawText(ctx, '设 置', w / 2, py + 16, {
      align: 'center', font: 'bold 18px serif', color: COLORS.gold
    });

    drawText(ctx, '震动反馈：' + (settings.vibrate ? '开' : '关'), px + 24, py + 60, {
      font: '14px sans-serif'
    });
    drawButton(ctx, px + pw - 100, py + 52, 70, 32, '切换');
    ui._setVibrate = { x: px + pw - 100, y: py + 52, w: 70, h: 32 };

    drawText(ctx, '音量（占位）：' + Math.round(settings.volume * 100) + '%', px + 24, py + 105, {
      font: '14px sans-serif'
    });
    drawButton(ctx, px + pw - 100, py + 97, 70, 32, '+/-');
    ui._setVol = { x: px + pw - 100, y: py + 97, w: 70, h: 32 };

    const sp = daycycle ? daycycle.speedLabel() : '1×';
    drawText(ctx, '时间倍速：' + sp + '（1天≈12现实分）', px + 24, py + 150, {
      font: '14px sans-serif'
    });
    drawButton(ctx, px + pw - 100, py + 142, 70, 32, sp);
    ui._setSpeed = { x: px + pw - 100, y: py + 142, w: 70, h: 32 };

    drawButton(ctx, (w - 100) / 2, py + ph - 48, 100, 36, '关闭');
    ui._setClose = { x: (w - 100) / 2, y: py + ph - 48, w: 100, h: 36 };
  }

  // —— 渡劫界面 ——
  function drawTribulation(ctx, tb) {
    if (!tb) return;
    const w = screen.designW;
    const h = screen.designH;
    ctx.fillStyle = 'rgba(10,5,30,0.85)';
    ctx.fillRect(0, 0, w, h);

    // 预警闪白
    if (tb.warnFlash > 0) {
      ctx.fillStyle = `rgba(255,255,200,${tb.warnFlash})`;
      ctx.fillRect(0, 0, w, h);
    }

    drawText(ctx, '渡 劫 · 躲避天雷', w / 2, 40, {
      align: 'center', font: 'bold 22px serif', color: COLORS.gold
    });
    drawText(ctx, '躲避 ' + tb.dodged + '/' + tb.needed + '  受伤 ' + tb.hit + '/' + tb.maxHit, w / 2, 70, {
      align: 'center', font: '13px sans-serif'
    });

    // 雷电
    for (let i = 0; i < tb.bolts.length; i++) {
      const b = tb.bolts[i];
      const bx = b.x * w;
      if (b.warn > 0) {
        ctx.fillStyle = `rgba(255,50,50,${0.3 + b.warn})`;
        ctx.fillRect(bx - 16, 0, 32, h);
        ctx.strokeStyle = '#e74c3c';
        ctx.setLineDash([6, 4]);
        ctx.beginPath();
        ctx.moveTo(bx, 80);
        ctx.lineTo(bx, h - 80);
        ctx.stroke();
        ctx.setLineDash([]);
      } else {
        ctx.strokeStyle = '#f1c40f';
        ctx.shadowColor = '#9b59b6';
        ctx.shadowBlur = 12;
        ctx.lineWidth = 3;
        ctx.beginPath();
        let y = b.y * h;
        ctx.moveTo(bx, y - 80);
        for (let k = 0; k < 6; k++) {
          ctx.lineTo(bx + (k % 2 ? 12 : -12), y - 80 + k * 20);
        }
        ctx.stroke();
        ctx.shadowBlur = 0;
      }
    }

    // 玩家
    const px = tb.playerX * w;
    const py = h * 0.82;
    ctx.fillStyle = '#d4a017';
    ctx.beginPath();
    ctx.arc(px, py, 14, 0, Math.PI * 2);
    ctx.fill();
    ctx.fillStyle = '#3d2814';
    ctx.beginPath();
    ctx.arc(px, py - 4, 8, 0, Math.PI * 2);
    ctx.fill();

    drawText(ctx, '左右滑动 / 方向键躲避', w / 2, h - 30, {
      align: 'center', font: '11px sans-serif', color: COLORS.textDim
    });
  }

  // —— 萤火虫解谜 ——
  function drawFireflyGame(ctx, mg) {
    if (!mg) return;
    const w = screen.designW;
    const h = screen.designH;
    ctx.fillStyle = 'rgba(5,10,30,0.9)';
    ctx.fillRect(0, 0, w, h);
    drawText(ctx, '点亮微光', w / 2, 50, { align: 'center', font: 'bold 20px serif', color: COLORS.gold });
    drawText(ctx, mg.phase === 'show' ? '记住顺序…' : '请按相同顺序点击', w / 2, 80, {
      align: 'center', font: '12px sans-serif'
    });

    ui._ffBtns = [];
    const positions = [
      { x: w / 2 - 60, y: h / 2 - 40 },
      { x: w / 2 + 60, y: h / 2 - 40 },
      { x: w / 2 - 60, y: h / 2 + 50 },
      { x: w / 2 + 60, y: h / 2 + 50 }
    ];
    for (let i = 0; i < 4; i++) {
      const p = positions[i];
      let glow = 0.3;
      if (mg.phase === 'show' && mg.seq[mg.showIdx] === i) glow = 1;
      if (mg.phase === 'input' && mg._flash === i) glow = 1;
      ctx.fillStyle = `rgba(241,196,15,${glow})`;
      ctx.beginPath();
      ctx.arc(p.x, p.y, 28, 0, Math.PI * 2);
      ctx.fill();
      ctx.strokeStyle = '#f1c40f';
      ctx.lineWidth = 2;
      ctx.stroke();
      ui._ffBtns.push({ i, x: p.x - 28, y: p.y - 28, w: 56, h: 56 });
    }
  }

  // —— 守卫波次 ——
  function drawDefend(ctx, def) {
    if (!def) return;
    const w = screen.designW;
    drawPanel(ctx, w / 2 - 80, 30, 160, 36, { gold: true });
    drawText(ctx, '守卫 波次 ' + def.wave + '/' + def.maxWaves, w / 2, 40, {
      align: 'center', font: 'bold 13px sans-serif', color: COLORS.gold
    });
  }

  return {
    ui, toast, update, showBreakthrough,
    drawTitle, hitTitle,
    drawHUD, drawDialog, drawInventory, drawQuestLog, drawShop, drawSettings,
    drawTribulation, drawFireflyGame, drawDefend, drawWalkMarker
  };
}

module.exports = { createUI };
