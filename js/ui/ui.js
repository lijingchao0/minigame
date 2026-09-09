/**
 * UI 绘制 — HUD / 对话 / 背包 / 任务日志 / 标题 / 特效
 */
const { COLORS, drawPanel, drawButton, drawText, drawBar, roundRect, hitTest, wrapText } = require('../pix.js');
const { drawItemIcon, ITEM_DEFS } = require('../entities/item.js');
const { SKILLS } = require('../systems/cultivation.js');
const { SHOP_STOCK } = require('../systems/economy.js');

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
    hotbarHint: true
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

  // —— 标题画面 ——
  function drawTitle(ctx, hasSave, settings) {
    const w = screen.designW;
    const h = screen.designH;
    // 背景氛围
    const g = ctx.createLinearGradient(0, 0, 0, h);
    g.addColorStop(0, '#1a3a1a');
    g.addColorStop(0.5, '#2d5a28');
    g.addColorStop(1, '#0f1f12');
    ctx.fillStyle = g;
    ctx.fillRect(0, 0, w, h);

    // 装饰草地剪影
    ctx.fillStyle = '#143018';
    for (let i = 0; i < 20; i++) {
      const x = i * 30;
      ctx.beginPath();
      ctx.moveTo(x, h);
      ctx.quadraticCurveTo(x + 10, h - 40 - (i % 5) * 8, x + 20, h);
      ctx.fill();
    }

    // 像素蚂蚁剪影
    ctx.save();
    ctx.translate(w / 2, h * 0.38);
    ctx.fillStyle = '#1a1008';
    ctx.beginPath(); ctx.ellipse(0, 10, 18, 14, 0, 0, Math.PI * 2); ctx.fill();
    ctx.beginPath(); ctx.ellipse(0, -5, 14, 12, 0, 0, Math.PI * 2); ctx.fill();
    ctx.beginPath(); ctx.ellipse(0, -22, 16, 14, 0, 0, Math.PI * 2); ctx.fill();
    ctx.strokeStyle = '#d4a017';
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.moveTo(-6, -28); ctx.quadraticCurveTo(-18, -45, -10, -50);
    ctx.moveTo(6, -28); ctx.quadraticCurveTo(18, -45, 10, -50);
    ctx.stroke();
    ctx.fillStyle = '#d4a017';
    ctx.beginPath(); ctx.arc(-10, -50, 3, 0, Math.PI * 2); ctx.arc(10, -50, 3, 0, Math.PI * 2); ctx.fill();
    ctx.restore();

    drawText(ctx, '蚂蚁修仙', w / 2, h * 0.52, {
      align: 'center', font: 'bold 42px "PingFang SC","KaiTi",serif', color: '#f5e6c8', shadow: true
    });
    drawText(ctx, 'v2.1 · 灵智初开', w / 2, h * 0.52 + 48, {
      align: 'center', font: '14px "PingFang SC",sans-serif', color: COLORS.gold
    });

    const bw = 180;
    const bh = 40;
    const bx = (w - bw) / 2;
    let by = h * 0.68;
    drawButton(ctx, bx, by, bw, bh, '开始旅程');
    ui._titleBtns = [{ id: 'new', x: bx, y: by, w: bw, h: bh }];
    by += 50;
    if (hasSave) {
      drawButton(ctx, bx, by, bw, bh, '继续修仙');
      ui._titleBtns.push({ id: 'continue', x: bx, y: by, w: bw, h: bh });
      by += 50;
    }
    drawButton(ctx, bx, by, bw, bh, '设  置');
    ui._titleBtns.push({ id: 'settings', x: bx, y: by, w: bw, h: bh });

    drawText(ctx, '点触地图移动 · WASD', w / 2, h - 36, {
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

  // —— 主 HUD ——
  function drawHUD(ctx, game) {
    const w = screen.designW;
    const h = screen.designH;
    const p = game.player;
    const cul = game.cultivation;

    // 左上状态
    drawPanel(ctx, 8, 8, 150, 78, { radius: 8 });
    // 头像
    ctx.fillStyle = '#3d2814';
    ctx.beginPath();
    ctx.arc(28, 36, 14, 0, Math.PI * 2);
    ctx.fill();
    ctx.fillStyle = '#d4a017';
    ctx.beginPath();
    ctx.arc(28, 30, 5, 0, Math.PI * 2);
    ctx.fill();

    drawText(ctx, cul.realmName(), 48, 14, { font: 'bold 11px sans-serif', color: COLORS.gold });
    drawText(ctx, cul.rootsLabel(), 48, 28, { font: '9px sans-serif', color: COLORS.textDim });
    drawBar(ctx, 48, 44, 100, 8, p.hp / p.maxHp, COLORS.hp);
    drawBar(ctx, 48, 56, 100, 8, p.mp / p.maxMp, COLORS.mp);
    drawBar(ctx, 48, 68, 100, 6, cul.state.xp / cul.xpNeeded(), COLORS.xp);

    // 右上资源 + 时间
    drawPanel(ctx, w - 118, 8, 110, 52, { radius: 8 });
    drawText(ctx, '金 ' + game.inventory.state.gold, w - 108, 14, { font: '11px sans-serif' });
    drawText(ctx, game.daycycle.timeLabel(), w - 108, 30, { font: '10px sans-serif', color: COLORS.textDim });
    drawText(ctx, '繁 ' + game.kingdom.state.prosperity, w - 108, 44, { font: '10px sans-serif', color: '#e67e22' });

    // 小地图
    drawMinimap(ctx, game, w - 118, 66, 110, 80);

    // 任务追踪
    const track = game.quests.trackingInfo(game);
    if (track) {
      drawPanel(ctx, 8, 94, 168, 48, { radius: 6 });
      drawText(ctx, track.name, 14, 100, { font: 'bold 11px sans-serif', color: COLORS.gold });
      drawText(ctx, track.stepText, 14, 116, { font: '10px sans-serif', color: COLORS.text });
    }

    // 底部快捷栏
    const barY = h - 58;
    const skills = cul.state.learned;
    const slotW = 44;
    const slots = Math.min(3, Math.max(skills.length, 3));
    const barW = slotW * 4 + 20;
    const barX = (w - barW) / 2;
    drawPanel(ctx, barX, barY, barW, 50, { radius: 8 });

    ui._hotbtns = [];
    // 攻击键
    const ax = barX + 8;
    drawButton(ctx, ax, barY + 8, slotW - 4, 34, '攻');
    ui._hotbtns.push({ id: 'attack', x: ax, y: barY + 8, w: slotW - 4, h: 34 });

    for (let i = 0; i < 3; i++) {
      const sx = barX + 8 + (i + 1) * slotW;
      const sk = SKILLS.find((s) => s.id === skills[i]);
      const label = sk ? sk.name.slice(0, 2) : '—';
      const cd = sk ? (cul.state.skillCd[sk.id] || 0) : 0;
      drawButton(ctx, sx, barY + 8, slotW - 4, 34, label, { disabled: !sk });
      if (cd > 0) {
        ctx.fillStyle = 'rgba(0,0,0,0.55)';
        roundRect(ctx, sx, barY + 8, slotW - 4, 34, 6);
        ctx.fill();
        drawText(ctx, cd.toFixed(0), sx + (slotW - 4) / 2, barY + 22, {
          align: 'center', font: '12px sans-serif', color: '#fff'
        });
      }
      ui._hotbtns.push({ id: 'skill' + i, x: sx, y: barY + 8, w: slotW - 4, h: 34, skillId: sk ? sk.id : null });
    }

    // 右侧功能按钮
    const fbx = w - 48;
    ui._funcBtns = [];
    const funcs = [
      { id: 'bag', label: '包', y: h - 200 },
      { id: 'quest', label: '志', y: h - 155 },
      { id: 'meditate', label: '修', y: h - 110 },
      { id: 'menu', label: '菜', y: h - 65 }
    ];
    for (let i = 0; i < funcs.length; i++) {
      const f = funcs[i];
      drawButton(ctx, fbx, f.y, 40, 38, f.label);
      ui._funcBtns.push({ id: f.id, x: fbx, y: f.y, w: 40, h: 38 });
    }

    // 交互提示
    if (game._interactHint) {
      drawText(ctx, game._interactHint, w / 2, h - 75, {
        align: 'center', font: '12px sans-serif', color: '#f1c40f', shadow: true
      });
    }

    // 横幅
    const banners = game.quests.state.banners;
    for (let i = 0; i < banners.length; i++) {
      const b = banners[i];
      const a = b.t < 0.3 ? b.t / 0.3 : b.t > b.life - 0.4 ? (b.life - b.t) / 0.4 : 1;
      ctx.save();
      ctx.globalAlpha = a;
      drawPanel(ctx, w / 2 - 120, 40 + i * 36, 240, 30, { gold: true, radius: 6 });
      drawText(ctx, b.text, w / 2, 48 + i * 36, {
        align: 'center', font: 'bold 13px sans-serif', color: COLORS.gold
      });
      ctx.restore();
    }

    if (ui.toast) {
      ctx.save();
      ctx.globalAlpha = Math.min(1, ui.toastT);
      drawPanel(ctx, w / 2 - 100, h / 2 - 20, 200, 36, { radius: 8 });
      drawText(ctx, ui.toast, w / 2, h / 2 - 8, {
        align: 'center', font: '13px sans-serif'
      });
      ctx.restore();
    }

    // 突破特效
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
    const w = screen.designW;
    const h = screen.designH;
    const st = dialog.state;
    const slide = Math.min(1, st.anim * 4);
    const panelH = st.choices && st.full && st.pageIdx >= st.pages.length - 1
      ? 160 + st.choices.length * 36 : 150;
    const py = h - panelH * slide;

    drawPanel(ctx, 10, py, w - 20, panelH - 10, { gold: true, radius: 10 });

    // 立绘圆
    ctx.fillStyle = st.color;
    ctx.beginPath();
    ctx.arc(48, py + 50, 28, 0, Math.PI * 2);
    ctx.fill();
    ctx.fillStyle = 'rgba(0,0,0,0.25)';
    ctx.beginPath();
    ctx.arc(48, py + 50, 20, 0, Math.PI * 2);
    ctx.fill();

    // 名字牌
    drawPanel(ctx, 82, py + 12, 120, 22, { radius: 4, fill: 'rgba(0,0,0,0.45)', borderColor: COLORS.gold });
    drawText(ctx, st.speaker, 92, py + 16, { font: 'bold 12px sans-serif', color: COLORS.gold });
    if (st.role) {
      drawText(ctx, st.role, 210, py + 18, { font: '10px sans-serif', color: COLORS.textDim });
    }

    // 文本
    ctx.font = '13px "PingFang SC",sans-serif';
    const lines = wrapText(ctx, dialog.visibleText(), w - 100);
    for (let i = 0; i < lines.length; i++) {
      drawText(ctx, lines[i], 82, py + 44 + i * 18, { font: '13px "PingFang SC",sans-serif' });
    }

    if (st.full && !(st.choices && st.pageIdx >= st.pages.length - 1)) {
      drawText(ctx, '▼', w - 36, py + panelH - 28, {
        font: '12px sans-serif', color: COLORS.gold
      });
    }

    // 选项
    if (st.full && st.choices && st.pageIdx >= st.pages.length - 1) {
      for (let i = 0; i < st.choices.length; i++) {
        const by = py + 70 + i * 36;
        drawButton(ctx, 40, by, w - 80, 30, st.choices[i].label);
      }
    }
  }

  // —— 背包 ——
  function drawInventory(ctx, game) {
    const w = screen.designW;
    const h = screen.designH;
    ctx.fillStyle = 'rgba(0,0,0,0.45)';
    ctx.fillRect(0, 0, w, h);
    const pw = w - 30;
    const ph = h - 100;
    const px = 15;
    const py = 50;
    drawPanel(ctx, px, py, pw, ph, { gold: true, radius: 10 });
    drawText(ctx, '背 包', px + 16, py + 12, { font: 'bold 16px serif', color: COLORS.gold });
    drawText(ctx, '金币 ' + game.inventory.state.gold, px + pw - 90, py + 14, { font: '12px sans-serif' });

    const tabs = ['材料', '装备', '丹药', '任务品', '灵根'];
    ui._invTabs = [];
    for (let i = 0; i < tabs.length; i++) {
      const tx = px + 8 + i * 58;
      const active = ui.invTab === tabs[i];
      drawButton(ctx, tx, py + 36, 54, 26, tabs[i], { pressed: active });
      ui._invTabs.push({ tab: tabs[i], x: tx, y: py + 36, w: 54, h: 26 });
    }

    ui._rootUpgradeBtns = [];
    ui._rootItemBtns = [];

    if (ui.invTab === '灵根') {
      drawRootPanel(ctx, game, px, py, pw, ph);
    } else {
      const items = game.inventory.byCategory(ui.invTab);
      const cols = 5;
      const cell = 48;
      const startY = py + 72;
      ui._invCells = [];
      for (let i = 0; i < items.length; i++) {
        const col = i % cols;
        const row = (i / cols) | 0;
        const cx = px + 16 + col * (cell + 8);
        const cy = startY + row * (cell + 8);
        drawPanel(ctx, cx, cy, cell, cell, { radius: 6, borderColor: ui.selectedSlot === i ? COLORS.gold : COLORS.panelBorder });
        const def = ITEM_DEFS[items[i].id];
        if (def) drawItemIcon(ctx, def.icon, cx + cell / 2, cy + cell / 2 - 4, 16);
        drawText(ctx, '×' + items[i].amount, cx + cell - 4, cy + cell - 14, {
          align: 'right', font: '10px sans-serif'
        });
        ui._invCells.push({ i, item: items[i], x: cx, y: cy, w: cell, h: cell });
      }

      // 详情
      if (ui.selectedSlot >= 0 && items[ui.selectedSlot]) {
        const it = items[ui.selectedSlot];
        const def = ITEM_DEFS[it.id];
        const dy = py + ph - 100;
        drawPanel(ctx, px + 12, dy, pw - 24, 88, { radius: 6 });
        if (def) {
          drawText(ctx, def.name, px + 24, dy + 10, { font: 'bold 13px sans-serif', color: COLORS.gold });
          drawText(ctx, def.desc, px + 24, dy + 30, { font: '11px sans-serif', color: COLORS.textDim });
          drawButton(ctx, px + 24, dy + 52, 80, 28, def.use || def.equip ? '使用' : '出售');
          ui._invUse = { x: px + 24, y: dy + 52, w: 80, h: 28, item: it };
          drawButton(ctx, px + 114, dy + 52, 80, 28, '出售');
          ui._invSell = { x: px + 114, y: dy + 52, w: 80, h: 28, item: it };
        }
      } else {
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

    drawText(ctx, '修炼系数 ×' + cul.cultivateMul().toFixed(2) + '（单灵根纯净加成更高）', px + 16, py + 70, {
      font: '11px sans-serif', color: COLORS.textDim
    });

    let y = py + 92;
    for (let i = 0; i < roots.length; i++) {
      const r = roots[i];
      const def = cul.getRootDef(r.typeId);
      const q = cul.getQuality(r.quality);
      drawPanel(ctx, px + 12, y, pw - 24, 56, { radius: 6, borderColor: def.color });
      ctx.fillStyle = def.color;
      ctx.beginPath();
      ctx.arc(px + 36, y + 28, 12, 0, Math.PI * 2);
      ctx.fill();
      drawText(ctx, q.name + def.name + '灵根', px + 56, y + 10, {
        font: 'bold 13px sans-serif', color: COLORS.gold
      });
      let desc = '品阶加成 ×' + q.mul.toFixed(2);
      if (r.quality === 'bianyi' && def.mutation) {
        desc = def.mutation.name + '：' + def.mutation.desc;
      }
      drawText(ctx, desc, px + 56, y + 30, { font: '11px sans-serif', color: COLORS.textDim });

      const next = cul.nextQualityId(r.quality);
      if (next) {
        const cost = cul.UPGRADE_COST[r.quality];
        const label = '进阶';
        drawButton(ctx, px + pw - 90, y + 14, 60, 28, label);
        ui._rootUpgradeBtns.push({ i, x: px + pw - 90, y: y + 14, w: 60, h: 28, cost });
      } else {
        drawText(ctx, '已满', px + pw - 60, y + 22, { font: '11px sans-serif', color: COLORS.gold });
      }
      y += 64;
    }
    while (roots.length < 3 && y < py + ph - 120) {
      drawPanel(ctx, px + 12, y, pw - 24, 40, { radius: 6 });
      drawText(ctx, '空余灵根位（需觉醒丹点亮）', px + 24, y + 12, {
        font: '12px sans-serif', color: COLORS.textDim
      });
      y += 48;
      break;
    }

    // 培养道具快捷使用
    y = Math.max(y, py + ph - 110);
    drawPanel(ctx, px + 12, y, pw - 24, 96, { radius: 6 });
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
      const bx = px + 20 + i * 72;
      const by = y + 36;
      drawButton(ctx, bx, by, 64, 44, pills[i].label);
      drawText(ctx, '×' + n, bx + 32, by + 26, { align: 'center', font: '10px sans-serif', color: COLORS.textDim });
      ui._rootItemBtns.push({ id: pills[i].id, x: bx, y: by, w: 64, h: 44, usable: n > 0 && (pills[i].id === 'xisui_pill' || pills[i].id === 'root_awaken_pill') });
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

  // —— 任务日志 ——
  function drawQuestLog(ctx, game) {
    const w = screen.designW;
    const h = screen.designH;
    ctx.fillStyle = 'rgba(0,0,0,0.45)';
    ctx.fillRect(0, 0, w, h);
    const px = 15;
    const py = 40;
    const pw = w - 30;
    const ph = h - 80;
    drawPanel(ctx, px, py, pw, ph, { gold: true, radius: 10 });
    drawText(ctx, '任务日志', px + 16, py + 12, { font: 'bold 16px serif', color: COLORS.gold });
    drawButton(ctx, px + pw - 70, py + 8, 54, 28, '关闭');
    ui._qClose = { x: px + pw - 70, y: py + 8, w: 54, h: 28 };

    let y = py + 48;
    drawText(ctx, '进行中', px + 16, y, { font: 'bold 12px sans-serif', color: '#3498db' });
    y += 20;
    ui._qTrackBtns = [];
    const activeIds = Object.keys(game.quests.state.active);
    if (!activeIds.length) {
      drawText(ctx, '暂无进行中任务', px + 16, y, { font: '11px sans-serif', color: COLORS.textDim });
      y += 24;
    }
    for (let i = 0; i < activeIds.length; i++) {
      const id = activeIds[i];
      const q = game.quests.getDef(id);
      const step = game.quests.currentStep(id);
      const tracking = game.quests.state.tracking === id;
      drawPanel(ctx, px + 12, y, pw - 24, 44, { radius: 6, borderColor: tracking ? COLORS.gold : COLORS.panelBorder });
      drawText(ctx, (q.chapter ? '主线·' : '支线·') + q.name, px + 20, y + 6, {
        font: 'bold 12px sans-serif', color: COLORS.gold
      });
      drawText(ctx, step ? step.text : '完成', px + 20, y + 24, { font: '10px sans-serif' });
      ui._qTrackBtns.push({ id, x: px + 12, y, w: pw - 24, h: 44 });
      y += 52;
      if (y > py + ph - 80) break;
    }

    y += 8;
    drawText(ctx, '已完成 ' + Object.keys(game.quests.state.completed).length + ' / 主线进度 ' + game.quests.state.mainDone, px + 16, y, {
      font: '11px sans-serif', color: COLORS.textDim
    });
  }

  // —— 商店 ——
  function drawShop(ctx, game) {
    const w = screen.designW;
    const h = screen.designH;
    ctx.fillStyle = 'rgba(0,0,0,0.45)';
    ctx.fillRect(0, 0, w, h);
    const px = 20;
    const py = 50;
    const pw = w - 40;
    const ph = h - 100;
    drawPanel(ctx, px, py, pw, ph, { gold: true, radius: 10 });
    drawText(ctx, '瓢虫杂货铺', px + 16, py + 12, { font: 'bold 16px serif', color: COLORS.gold });
    drawText(ctx, '金币 ' + game.inventory.state.gold, px + 16, py + 36, { font: '12px sans-serif' });
    drawButton(ctx, px + pw - 70, py + 8, 54, 28, '关闭');
    ui._shopClose = { x: px + pw - 70, y: py + 8, w: 54, h: 28 };

    ui._shopItems = [];
    let y = py + 60;
    for (let i = 0; i < SHOP_STOCK.length; i++) {
      const s = SHOP_STOCK[i];
      const def = ITEM_DEFS[s.id];
      drawPanel(ctx, px + 12, y, pw - 24, 40, { radius: 6 });
      if (def) drawItemIcon(ctx, def.icon, px + 32, y + 20, 14);
      drawText(ctx, def ? def.name : s.id, px + 50, y + 8, { font: '12px sans-serif' });
      drawText(ctx, s.price + ' 金', px + 50, y + 24, { font: '10px sans-serif', color: COLORS.gold });
      drawButton(ctx, px + pw - 90, y + 6, 60, 28, '购买');
      ui._shopItems.push({ id: s.id, x: px + pw - 90, y: y + 6, w: 60, h: 28 });
      y += 48;
    }
  }

  // —— 设置 ——
  function drawSettings(ctx, settings) {
    const w = screen.designW;
    const h = screen.designH;
    ctx.fillStyle = 'rgba(0,0,0,0.5)';
    ctx.fillRect(0, 0, w, h);
    drawPanel(ctx, 40, h / 2 - 100, w - 80, 200, { gold: true, radius: 10 });
    drawText(ctx, '设 置', w / 2, h / 2 - 85, { align: 'center', font: 'bold 18px serif', color: COLORS.gold });
    drawText(ctx, '震动反馈：' + (settings.vibrate ? '开' : '关'), 60, h / 2 - 40, { font: '14px sans-serif' });
    drawButton(ctx, w - 140, h / 2 - 48, 70, 32, '切换');
    ui._setVibrate = { x: w - 140, y: h / 2 - 48, w: 70, h: 32 };
    drawText(ctx, '音量（占位）：' + Math.round(settings.volume * 100) + '%', 60, h / 2, { font: '14px sans-serif' });
    drawButton(ctx, w - 140, h / 2 - 8, 70, 32, '+/-');
    ui._setVol = { x: w - 140, y: h / 2 - 8, w: 70, h: 32 };
    drawButton(ctx, (w - 100) / 2, h / 2 + 50, 100, 36, '关闭');
    ui._setClose = { x: (w - 100) / 2, y: h / 2 + 50, w: 100, h: 36 };
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
