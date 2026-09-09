/**
 * 新手教程 — 分步 overlay 引导（可跳过，进度存档）
 */
const { TILE, hitTest, drawPanel, drawButton, drawText, COLORS, roundRect } = require('../pix.js');

const STEPS = [
  {
    id: 'move',
    title: '走位',
    text: '点击地面空白处，角色会自动走向目标点。请走到金色光圈处。',
    highlight: 'world_marker'
  },
  {
    id: 'gather',
    title: '采集',
    text: '走近发光的采集物，点击它或靠近后点选采集。产物会进入背包。',
    highlight: 'gather'
  },
  {
    id: 'bag',
    title: '背包',
    text: '点击右侧「包」按钮，打开背包查看物品。',
    highlight: 'bag'
  },
  {
    id: 'talk',
    title: '对话',
    text: '靠近头顶有 ! / ? 的 NPC，点击与其对话并推进任务。',
    highlight: 'npc'
  },
  {
    id: 'meditate',
    title: '修炼',
    text: '点击右侧「修」进行吐纳修炼，观察修为条与境界变化。',
    highlight: 'meditate'
  },
  {
    id: 'combat',
    title: '战斗',
    text: '靠近弱怪，点击底部「攻」或技能键发起攻击。',
    highlight: 'combat'
  },
  {
    id: 'speed',
    title: '时间倍速',
    text: '点击右上角倍速按钮，可在 1×~4× 间切换现实时间流速。',
    highlight: 'speed'
  }
];

function createTutorial() {
  const state = {
    active: false,
    step: 0,
    done: false,
    marker: null, // {x,y} 世界坐标
    _bagOpened: false,
    _meditated: false,
    _attacked: false,
    _speedChanged: false,
    _talked: false,
    _gathered: false,
    _movedNear: false
  };

  function shouldStart(game) {
    if (state.done) return false;
    // 已完成第一章的老存档不再弹
    if (game.quests && game.quests.isCompleted('m1')) return false;
    if (game.quests && game.quests.state.mainDone >= 1) return false;
    return true;
  }

  function start(game) {
    if (!shouldStart(game)) return false;
    state.active = true;
    state.step = 0;
    state._bagOpened = false;
    state._meditated = false;
    state._attacked = false;
    state._speedChanged = false;
    state._talked = false;
    state._gathered = false;
    state._movedNear = false;
    // 移动目标：出生点东南方
    const region = game.regions.getCurrent();
    const spawn = region && region.spawn ? region.spawn : { x: 20 * TILE, y: 20 * TILE };
    state.marker = { x: spawn.x + 48, y: spawn.y + 32 };
    return true;
  }

  function skip() {
    state.active = false;
    state.done = true;
    state.marker = null;
  }

  function finish() {
    state.active = false;
    state.done = true;
    state.marker = null;
  }

  function current() {
    if (!state.active) return null;
    return STEPS[state.step] || null;
  }

  function advance() {
    state.step++;
    if (state.step >= STEPS.length) {
      finish();
      return true;
    }
    return false;
  }

  function notify(event, game) {
    if (!state.active) return;
    const cur = current();
    if (!cur) return;
    if (event === 'move' && cur.id === 'move') {
      if (state.marker && game.player) {
        const pc = game.player.getCenter();
        const dx = pc.x - state.marker.x;
        const dy = pc.y - state.marker.y;
        if (dx * dx + dy * dy < 22 * 22) {
          state._movedNear = true;
          advance();
        }
      }
    } else if (event === 'gather' && cur.id === 'gather') {
      state._gathered = true;
      advance();
    } else if (event === 'bag' && cur.id === 'bag') {
      state._bagOpened = true;
      advance();
    } else if (event === 'talk' && cur.id === 'talk') {
      state._talked = true;
      advance();
    } else if (event === 'meditate' && cur.id === 'meditate') {
      state._meditated = true;
      advance();
    } else if (event === 'attack' && cur.id === 'combat') {
      state._attacked = true;
      advance();
    } else if (event === 'speed' && cur.id === 'speed') {
      state._speedChanged = true;
      advance();
    }
  }

  function update(dt, game) {
    if (!state.active) return;
    const cur = current();
    if (!cur) return;
    // 移动步持续检测距离
    if (cur.id === 'move' && state.marker && game.player) {
      const pc = game.player.getCenter();
      const dx = pc.x - state.marker.x;
      const dy = pc.y - state.marker.y;
      if (dx * dx + dy * dy < 22 * 22) {
        advance();
      }
    }
  }

  /** 解析高亮矩形（设计坐标） */
  function resolveHighlight(game, screen) {
    const cur = current();
    if (!cur || !game) return null;
    const ui = game.uiApi && game.uiApi.ui;
    const w = screen.designW;
    const h = screen.designH;
    switch (cur.highlight) {
      case 'bag':
        if (ui && ui._funcBtns) {
          const b = ui._funcBtns.find((x) => x.id === 'bag');
          if (b) return { x: b.x - 4, y: b.y - 4, w: b.w + 8, h: b.h + 8 };
        }
        return { x: w - 52, y: h * 0.42, w: 44, h: 44 };
      case 'meditate':
        if (ui && ui._funcBtns) {
          const b = ui._funcBtns.find((x) => x.id === 'meditate');
          if (b) return { x: b.x - 4, y: b.y - 4, w: b.w + 8, h: b.h + 8 };
        }
        return { x: w - 52, y: h * 0.52, w: 44, h: 44 };
      case 'speed':
        if (ui && ui._speedBtn) {
          const b = ui._speedBtn;
          return { x: b.x - 4, y: b.y - 4, w: b.w + 8, h: b.h + 8 };
        }
        return { x: w - 70, y: 8, w: 56, h: 28 };
      case 'combat':
        if (ui && ui._hotbtns && ui._hotbtns.length) {
          const b = ui._hotbtns[0];
          return { x: b.x - 6, y: b.y - 6, w: b.w + 12, h: b.h + 12 };
        }
        return { x: w / 2 - 60, y: h - 52, w: 120, h: 44 };
      case 'world_marker':
      case 'gather':
      case 'npc':
        return null; // 世界高亮在 draw 里单独画
      default:
        return null;
    }
  }

  function draw(ctx, game, screen) {
    if (!state.active) return;
    const cur = current();
    if (!cur) return;
    const w = screen.designW;
    const h = screen.designH;
    const hole = resolveHighlight(game, screen);
    const time = game.time || 0;

    ctx.save();
    // 半透明遮罩（四块拼接挖洞，兼容微信小游戏 Canvas）
    ctx.fillStyle = 'rgba(8, 6, 4, 0.55)';
    if (hole) {
      const hx = hole.x;
      const hy = hole.y;
      const hw = hole.w;
      const hh = hole.h;
      ctx.fillRect(0, 0, w, Math.max(0, hy));
      ctx.fillRect(0, hy + hh, w, Math.max(0, h - hy - hh));
      ctx.fillRect(0, hy, Math.max(0, hx), hh);
      ctx.fillRect(hx + hw, hy, Math.max(0, w - hx - hw), hh);
      // 光圈
      const pulse = 2 + Math.sin(time * 4) * 1.5;
      ctx.strokeStyle = 'rgba(241,196,15,0.95)';
      ctx.lineWidth = 2.5;
      roundRect(ctx, hx - pulse, hy - pulse, hw + pulse * 2, hh + pulse * 2, 10);
      ctx.stroke();
      ctx.strokeStyle = 'rgba(241,196,15,0.35)';
      ctx.lineWidth = 6;
      roundRect(ctx, hx - pulse - 3, hy - pulse - 3, hw + pulse * 2 + 6, hh + pulse * 2 + 6, 12);
      ctx.stroke();
    } else {
      ctx.fillRect(0, 0, w, h);
      // 世界目标光圈（移动标记 / 采集 / NPC）
      if (game.camera) {
        let wx = null;
        let wy = null;
        if (cur.highlight === 'world_marker' && state.marker) {
          wx = state.marker.x; wy = state.marker.y;
        } else if (cur.highlight === 'gather' && game.gatherables) {
          const g = game.gatherables.find((x) => !x.taken);
          if (g) { wx = g.x; wy = g.y; }
        } else if (cur.highlight === 'npc' && game.npcs && game.npcs.length) {
          const n = game.npcs.find((x) => x.defId === 'scout_ant') || game.npcs[0];
          const c = n.getCenter();
          wx = c.x; wy = c.y;
        }
        if (wx != null) {
          const sp = game.camera.worldToScreen(wx, wy);
          const r = 16 + Math.sin(time * 4) * 3;
          ctx.strokeStyle = 'rgba(241,196,15,0.95)';
          ctx.lineWidth = 2.5;
          ctx.beginPath();
          ctx.arc(sp.x, sp.y, r, 0, Math.PI * 2);
          ctx.stroke();
          ctx.fillStyle = 'rgba(241,196,15,0.2)';
          ctx.beginPath();
          ctx.arc(sp.x, sp.y, r * 0.6, 0, Math.PI * 2);
          ctx.fill();
        }
      }
    }

    // 说明面板
    const pw = w - 28;
    const ph = 118;
    const px = 14;
    const py = h - ph - 8;
    drawPanel(ctx, px, py, pw, ph, { gold: true, radius: 10 });
    drawText(ctx, '教程 ' + (state.step + 1) + '/' + STEPS.length + ' · ' + cur.title, px + 14, py + 12, {
      font: 'bold 13px sans-serif', color: COLORS.gold
    });
    drawText(ctx, cur.text, px + 14, py + 36, {
      font: '12px "PingFang SC",sans-serif', color: COLORS.text
    });

    drawButton(ctx, px + 14, py + ph - 40, 90, 30, '跳过教程', { font: 'bold 11px sans-serif' });
    uiHit.skip = { x: px + 14, y: py + ph - 40, w: 90, h: 30 };
    drawButton(ctx, px + pw - 104, py + ph - 40, 90, 30, '下一步', { font: 'bold 11px sans-serif' });
    uiHit.next = { x: px + pw - 104, y: py + ph - 40, w: 90, h: 30 };
    ctx.restore();
  }

  const uiHit = { skip: null, next: null };

  function handleTap(x, y) {
    if (!state.active) return false;
    if (uiHit.skip && hitTest(x, y, uiHit.skip.x, uiHit.skip.y, uiHit.skip.w, uiHit.skip.h)) {
      skip();
      return true;
    }
    if (uiHit.next && hitTest(x, y, uiHit.next.x, uiHit.next.y, uiHit.next.w, uiHit.next.h)) {
      advance();
      return true;
    }
    // 点在教程面板上吞掉（避免误触）
    return false;
  }

  /** 绘制世界移动目标（在世界层） */
  function drawWorldMarker(ctx, game) {
    if (!state.active || !state.marker || !game.camera) return;
    const cur = current();
    if (!cur || cur.highlight !== 'world_marker') return;
    const sp = game.camera.worldToScreen(state.marker.x, state.marker.y);
    const t = game.time || 0;
    const r = 12 + Math.sin(t * 5) * 2;
    ctx.save();
    ctx.strokeStyle = 'rgba(241,196,15,0.9)';
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.arc(sp.x, sp.y, r, 0, Math.PI * 2);
    ctx.stroke();
    ctx.fillStyle = 'rgba(241,196,15,0.25)';
    ctx.beginPath();
    ctx.arc(sp.x, sp.y, r * 0.5, 0, Math.PI * 2);
    ctx.fill();
    ctx.restore();
  }

  function serialize() {
    return { tutorialDone: state.done, tutorialStep: state.active ? state.step : -1 };
  }

  function deserialize(data) {
    if (!data) return;
    if (data.tutorialDone) {
      state.done = true;
      state.active = false;
    }
  }

  return {
    state, STEPS, shouldStart, start, skip, finish, current, advance,
    notify, update, draw, drawWorldMarker, handleTap,
    serialize, deserialize
  };
}

module.exports = { createTutorial, STEPS };
