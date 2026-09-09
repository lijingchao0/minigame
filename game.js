/**
 * 《蚂蚁修仙》v2 — 游戏入口
 * 微信小游戏：优先 GameGlobal.canvas / 全局 canvas / wx.createCanvas()
 */
const { TILE, clamp, dist, hitTest } = require('./js/pix.js');
const { createInput } = require('./js/input.js');
const { createCamera } = require('./js/engine/camera.js');
const { createTransition } = require('./js/engine/transition.js');
const { createRegionManager } = require('./js/engine/region.js');
const { createPlayer } = require('./js/entities/player.js');
const { createNpc, findNearestNpc } = require('./js/entities/npc.js');
const { createEnemy } = require('./js/entities/enemy.js');
const { drawGatherable, findNearestGatherable, drawDrop, ITEM_DEFS } = require('./js/entities/item.js');
const { createParticles } = require('./js/entities/particles.js');
const { createCultivation, ROOTS } = require('./js/systems/cultivation.js');
const { createInventory } = require('./js/systems/inventory.js');
const { createEconomy } = require('./js/systems/economy.js');
const { createKingdom } = require('./js/systems/kingdom.js');
const { createDayCycle } = require('./js/systems/daycycle.js');
const { createCombat } = require('./js/systems/combat.js');
const { createDialog } = require('./js/systems/dialog.js');
const { createQuestSystem } = require('./js/systems/quests.js');
const { createSave } = require('./js/systems/save.js');
const { createUI } = require('./js/ui/ui.js');

// ========== Canvas 获取 ==========
function getCanvas() {
  if (typeof GameGlobal !== 'undefined' && GameGlobal.canvas) return GameGlobal.canvas;
  if (typeof canvas !== 'undefined' && canvas) return canvas;
  if (typeof wx !== 'undefined' && wx.createCanvas) return wx.createCanvas();
  // 浏览器调试回退
  let c = document.getElementById('game');
  if (!c) {
    c = document.createElement('canvas');
    c.id = 'game';
    document.body.appendChild(c);
  }
  return c;
}

function getWindowInfo() {
  if (typeof wx !== 'undefined' && wx.getWindowInfo) return wx.getWindowInfo();
  if (typeof wx !== 'undefined' && wx.getSystemInfoSync) return wx.getSystemInfoSync();
  return {
    windowWidth: typeof window !== 'undefined' ? window.innerWidth : 375,
    windowHeight: typeof window !== 'undefined' ? window.innerHeight : 667,
    pixelRatio: typeof window !== 'undefined' ? (window.devicePixelRatio || 2) : 2,
    safeArea: null
  };
}

function getRAF() {
  if (typeof requestAnimationFrame === 'function') return requestAnimationFrame.bind(typeof window !== 'undefined' ? window : globalThis);
  if (typeof wx !== 'undefined' && wx.requestAnimationFrame) return wx.requestAnimationFrame.bind(wx);
  return function (cb) { return setTimeout(function () { cb(Date.now()); }, 16); };
}

function vibrateShort() {
  try {
    if (typeof wx !== 'undefined' && wx.vibrateShort) wx.vibrateShort({ type: 'light' });
  } catch (e) { /* ignore */ }
}

// ========== 屏幕适配 ==========
function createScreen(cvs) {
  const info = getWindowInfo();
  const dpr = Math.min(info.pixelRatio || 2, 3);
  const sw = info.windowWidth;
  const sh = info.windowHeight;
  // 设计分辨率（竖屏）
  const designW = 375;
  const designH = 667;
  const scale = Math.min(sw / designW, sh / designH);
  const viewW = Math.floor(designW * scale);
  const viewH = Math.floor(designH * scale);
  const offsetX = Math.floor((sw - viewW) / 2);
  const offsetY = Math.floor((sh - viewH) / 2);

  cvs.width = Math.floor(sw * dpr);
  cvs.height = Math.floor(sh * dpr);
  if (cvs.style) {
    cvs.style.width = sw + 'px';
    cvs.style.height = sh + 'px';
  }

  const ctx = cvs.getContext('2d');
  ctx.setTransform(dpr, 0, 0, dpr, 0, 0);

  return {
    designW, designH, scale, offsetX, offsetY, sw, sh, dpr, cvs, ctx,
    safeTop: (info.safeArea && info.safeArea.top) || 0,
    screenToDesign(clientX, clientY) {
      return {
        x: (clientX - offsetX) / scale,
        y: (clientY - offsetY) / scale
      };
    },
    beginFrame() {
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
      ctx.fillStyle = '#0a0806';
      ctx.fillRect(0, 0, sw, sh);
      ctx.save();
      ctx.translate(offsetX, offsetY);
      ctx.scale(scale, scale);
      // 裁剪设计区
      ctx.beginPath();
      ctx.rect(0, 0, designW, designH);
      ctx.clip();
    },
    endFrame() {
      ctx.restore();
    }
  };
}

// ========== 游戏主对象 ==========
function createGame(screen) {
  const game = {
    screen,
    camera: createCamera(),
    transition: createTransition(),
    regions: createRegionManager(),
    player: null,
    npcs: [],
    enemies: [],
    drops: [],
    particles: createParticles(),
    cultivation: createCultivation(),
    inventory: createInventory(),
    economy: createEconomy(),
    kingdom: createKingdom(),
    daycycle: createDayCycle(),
    combat: createCombat(),
    dialog: createDialog(),
    quests: createQuestSystem(),
    save: createSave(),
    uiApi: createUI(screen),
    input: null,
    settings: null,
    mode: 'title', // title | root | play
    time: 0,
    leafTimer: 0,
    fireflyTimer: 0,
    gatherables: [],
    _interactHint: null,
    _portalCd: 0,
    heartDemonSpawned: false,
    loaded: false
  };

  game.settings = game.save.getSettings();
  game.input = createInput(screen);
  game.input.bind(screen.cvs);

  game.camera.setView(screen.designW, screen.designH);

  function vibe() {
    if (game.settings.vibrate) vibrateShort();
  }

  function loadRegion(id, x, y) {
    const res = game.regions.enter(id, x, y);
    const region = res.region;
    game.camera.setWorld(region.map.pixelW(), region.map.pixelH());
    if (game.player) {
      game.player.x = res.x;
      game.player.y = res.y;
    }
    // NPC
    game.npcs = [];
    for (let i = 0; i < region.npcs.length; i++) {
      const n = region.npcs[i];
      try {
        game.npcs.push(createNpc(n.defId, n.x, n.y));
      } catch (e) { console.warn(e); }
    }
    // 敌人（安全区为空）
    game.enemies = [];
    if (!region.meta.safe) {
      for (let i = 0; i < region.enemies.length; i++) {
        const e = region.enemies[i];
        game.enemies.push(createEnemy(e.type, e.x, e.y));
      }
    }
    game.gatherables = region.gatherables || [];
    game.drops = [];
    game.camera.follow(res.x, res.y, true);
    game.quests.onVisit(id, game);
    return region;
  }

  function startNewGame(root) {
    game.player = createPlayer(0, 0);
    game.cultivation.state.root = root;
    game.cultivation.applyStats(game.player);
    game.player.hp = game.player.maxHp;
    game.player.mp = game.player.maxMp;
    game.inventory.state.gold = 20;
    game.inventory.add('berry', 2);
    game.inventory.add('hp_pill', 1);
    loadRegion('grassland');
    game.mode = 'play';
    game.uiApi.ui.titlePhase = 'game';
    game.uiApi.ui.panel = null;
    // 开场对话
    setTimeout(() => {
      game.dialog.open({
        speaker: '意识',
        role: '觉醒',
        color: '#d4a017',
        pages: [
          '头痛……触角为何在发光？',
          '我……能思考了？我是一只开了灵智的工蚁。',
          '北边有同伴的气息。去找侦察蚁·疾风问问看。'
        ],
        onClose: () => {
          game.uiApi.toast('移动：左下摇杆 / WASD · 点触行走');
        }
      });
    }, 400);
  }

  function continueGame() {
    const data = game.save.load();
    if (!data) return false;
    game.player = createPlayer(data.player.x, data.player.y);
    game.cultivation.deserialize(data.cultivation, game.player);
    game.inventory.deserialize(data.inventory, game.player);
    game.kingdom.deserialize(data.kingdom);
    game.quests.deserialize(data.quests);
    game.daycycle.deserialize(data.daycycle);
    if (data.unlocked) {
      for (let i = 0; i < data.unlocked.length; i++) game.regions.unlock(data.unlocked[i]);
    }
    // 繁荣度解锁同步
    const unlocks = game.kingdom.unlocksForRegions();
    for (let i = 0; i < unlocks.length; i++) game.regions.unlock(unlocks[i]);

    game.player.hp = data.player.hp;
    game.player.mp = data.player.mp;
    loadRegion(data.player.region || 'grassland', data.player.x, data.player.y);
    game.mode = 'play';
    game.uiApi.ui.titlePhase = 'game';
    game.uiApi.toast('欢迎回来，' + game.cultivation.realmName());
    return true;
  }

  function tryPortal() {
    if (game._portalCd > 0) return;
    const region = game.regions.getCurrent();
    if (!region) return;
    const c = game.player.getCenter();
    const portal = region.map.getPortalAt(c.x, c.y);
    if (!portal) return;
    if (!game.regions.isUnlocked(portal.toRegion)) {
      game.uiApi.toast('区域尚未解锁：' + (game.regions.REGION_META[portal.toRegion] || {}).name);
      game._portalCd = 1.5;
      return;
    }
    game._portalCd = 1.2;
    const dest = portal.toRegion;
    const tx = portal.toX;
    const ty = portal.toY;
    game.transition.start(() => {
      loadRegion(dest, tx, ty);
      game.save.save(game);
    });
  }

  function interact() {
    if (game.dialog.state.open) return;
    if (game.uiApi.ui.panel) return;
    const pc = game.player.getCenter();

    // 采集
    const g = findNearestGatherable(game.gatherables, pc.x, pc.y, 24);
    if (g) {
      g.taken = true;
      g.timer = g.respawn || 60;
      game.inventory.add(g.itemId, g.amount || 1);
      const def = ITEM_DEFS[g.itemId];
      game.particles.floatText(g.x, g.y - 10, '+' + (def ? def.name : g.itemId), '#f1c40f');
      game.quests.onGather(g.itemId, g.amount || 1, game);
      vibe();
      return;
    }

    // 捡掉落
    for (let i = 0; i < game.drops.length; i++) {
      const d = game.drops[i];
      if (d.taken) continue;
      if (dist(pc.x, pc.y, d.x, d.y) < 20) {
        d.taken = true;
        game.inventory.add(d.itemId, d.amount);
        const def = ITEM_DEFS[d.itemId];
        game.particles.floatText(d.x, d.y - 8, '+' + (def ? def.name : d.itemId), '#ffeaa7');
        game.quests.onGather(d.itemId, d.amount, game);
        return;
      }
    }

    // NPC
    const npc = findNearestNpc(game.npcs, pc.x, pc.y, 30);
    if (npc) {
      openNpcDialog(npc);
      return;
    }
  }

  function openNpcDialog(npc) {
    const def = npc.def;
    const qres = game.quests.onTalk(npc.defId, game);

    // 可接任务
    const available = game.quests.allDefs().filter((q) => q.giver === npc.defId && game.quests.canAccept(q));

    if (qres.handled && qres.mode === 'need_items') {
      game.dialog.open({
        speaker: def.name, role: def.role, color: def.color, portraitId: npc.defId,
        pages: ['还缺材料呢……把东西凑齐再来找我。']
      });
      return;
    }

    if (qres.handled && qres.mode === 'choice') {
      game.dialog.open({
        speaker: def.name, role: def.role, color: def.color,
        pages: ['孩子，无论你飞升与否，蚁巢永远是你的家。你是留下做守界蚁仙，还是云游四方？'],
        choices: [
          { label: '留守守护王国', onSelect: () => game.quests.resolveChoice('stay', game) },
          { label: '云游他日归乡', onSelect: () => game.quests.resolveChoice('wander', game) }
        ]
      });
      return;
    }

    if (qres.handled && qres.mode === 'minigame') {
      game.dialog.open({
        speaker: def.name, role: def.role, color: def.color,
        pages: ['看好了哦～'],
        onClose: () => { /* minigame already set */ }
      });
      return;
    }

    if (qres.handled && qres.mode === 'escort_start') {
      game.dialog.open({
        speaker: def.name, role: def.role, color: def.color,
        pages: ['好，我跟着你走！带我去目标地点。'],
        onClose: () => {
          npc.escortTarget = null; // 跟随玩家
        }
      });
      return;
    }

    if (qres.handled && (qres.mode === 'progress' || qres.mode === 'deliver')) {
      // 找完成对话
      let pages = ['辛苦了。'];
      for (const id of Object.keys(game.quests.state.completed).concat(Object.keys(game.quests.state.active))) {
        const q = game.quests.getDef(id);
        if (q && q.giver === npc.defId && q.dialogComplete && game.quests.isCompleted(id)) {
          pages = q.dialogComplete;
        }
      }
      // 若刚推进但仍 active，用中间语
      const activeForNpc = Object.keys(game.quests.state.active).find((id) => {
        const q = game.quests.getDef(id);
        return q && q.giver === npc.defId;
      });
      if (activeForNpc) {
        const q = game.quests.getDef(activeForNpc);
        const step = game.quests.currentStep(activeForNpc);
        pages = ['很好，继续：' + (step ? step.text : '……')];
        if (q.dialogAccept && game.quests.state.active[activeForNpc].step <= 1) {
          // keep
        }
      }
      if (game.quests.isCompleted(Object.keys(game.quests.state.completed).slice(-1)[0])) {
        const last = Object.keys(game.quests.state.completed).filter((id) => {
          const q = game.quests.getDef(id);
          return q && q.giver === npc.defId;
        }).pop();
        if (last) {
          const q = game.quests.getDef(last);
          if (q.dialogComplete) pages = q.dialogComplete;
        }
      }
      game.dialog.open({
        speaker: def.name, role: def.role, color: def.color,
        pages: pages
      });
      return;
    }

    // 接新任务
    if (available.length) {
      const q = available[0];
      game.dialog.open({
        speaker: def.name, role: def.role, color: def.color,
        pages: q.dialogAccept || ['有件事想拜托你。'],
        choices: [
          {
            label: '接受：' + q.name,
            onSelect: () => {
              game.quests.accept(q.id, true, game);
              if (q.unlockRegion) game.regions.unlock(q.unlockRegion);
              vibe();
            }
          },
          { label: '日后再说', onSelect: () => {} }
        ]
      });
      return;
    }

    // 商店
    if (def.shop) {
      game.dialog.open({
        speaker: def.name, role: def.role, color: def.color,
        pages: def.lines,
        choices: [
          { label: '看看商品', onSelect: () => { game.uiApi.ui.panel = 'shop'; } },
          { label: '再见', onSelect: () => {} }
        ]
      });
      return;
    }

    // 守卫任务启动
    const defendQ = Object.keys(game.quests.state.active).find((id) => {
      const step = game.quests.currentStep(id);
      return step && step.type === 'defend' && game.quests.getDef(id).giver === npc.defId;
    });
    if (defendQ) {
      const step = game.quests.currentStep(defendQ);
      game.dialog.open({
        speaker: def.name, role: def.role, color: def.color,
        pages: ['准备好了吗？毒蜂要来了！'],
        choices: [
          {
            label: '开始守卫！',
            onSelect: () => startDefend(defendQ, step)
          },
          { label: '再等一等', onSelect: () => {} }
        ]
      });
      return;
    }

    // 心魔任务
    const demonQ = Object.keys(game.quests.state.active).find((id) => {
      const step = game.quests.currentStep(id);
      return step && step.type === 'kill' && step.enemy === 'heart_demon';
    });
    if (demonQ && npc.defId === 'king_ant') {
      game.dialog.open({
        speaker: def.name, role: def.role, color: def.color,
        pages: ['闭目——让心魔现形！'],
        onClose: () => spawnHeartDemon()
      });
      return;
    }

    // 渡劫入口
    if (npc.defId === 'king_ant' && game.cultivation.canTribulate()) {
      game.dialog.open({
        speaker: def.name, role: def.role, color: def.color,
        pages: ['你已至圆满，可试渡劫。成败在此一举。'],
        choices: [
          {
            label: '开始渡劫',
            onSelect: () => {
              game.cultivation.startTribulation();
            }
          },
          { label: '尚未准备好', onSelect: () => {} }
        ]
      });
      return;
    }

    // 默认闲聊
    game.dialog.open({
      speaker: def.name, role: def.role, color: def.color,
      pages: def.lines
    });
  }

  function spawnHeartDemon() {
    if (game.heartDemonSpawned) return;
    game.heartDemonSpawned = true;
    const p = game.player;
    game.enemies.push(createEnemy('heart_demon', p.x + 40, p.y));
    game.uiApi.toast('心魔降临！');
    vibe();
  }

  function startDefend(questId, step) {
    game.quests.state.defend = {
      questId,
      wave: 0,
      maxWaves: step.waves || 3,
      timer: 1,
      enemy: step.enemy || 'wasp',
      spawned: 0,
      alive: 0
    };
  }

  function updateDefend(dt) {
    const d = game.quests.state.defend;
    if (!d) return;
    d.timer -= dt;
    // 统计存活
    d.alive = game.enemies.filter((e) => !e.dead && e._defend).length;
    if (d.timer <= 0 && d.wave < d.maxWaves) {
      d.wave++;
      d.timer = 8;
      const region = game.regions.getCurrent();
      for (let i = 0; i < 2 + d.wave; i++) {
        const ex = game.player.x + (Math.random() - 0.5) * 120;
        const ey = game.player.y + (Math.random() - 0.5) * 120;
        const e = createEnemy(d.enemy, clamp(ex, 20, region.map.pixelW() - 20), clamp(ey, 20, region.map.pixelH() - 20));
        e._defend = true;
        game.enemies.push(e);
      }
    }
    if (d.wave >= d.maxWaves && d.alive === 0 && d.timer < 6) {
      game.quests.advanceStep(d.questId, game, true);
      game.quests.state.defend = null;
      game.uiApi.toast('守卫成功！');
    }
  }

  function updateMinigame(dt) {
    const mg = game.quests.state.minigame;
    if (!mg) return;
    mg.t += dt;
    if (mg.phase === 'show') {
      if (mg.t > 0.7) {
        mg.t = 0;
        mg.showIdx++;
        if (mg.showIdx >= mg.seq.length) {
          mg.phase = 'input';
          mg.showIdx = 0;
          mg.input = [];
        }
      }
    }
  }

  function handleFireflyTap(idx) {
    const mg = game.quests.state.minigame;
    if (!mg || mg.phase !== 'input') return;
    mg._flash = idx;
    setTimeout(() => { mg._flash = -1; }, 200);
    mg.input.push(idx);
    const i = mg.input.length - 1;
    if (mg.input[i] !== mg.seq[i]) {
      game.uiApi.toast('顺序错了，再看一次！');
      mg.phase = 'show';
      mg.showIdx = 0;
      mg.input = [];
      mg.t = 0;
      return;
    }
    if (mg.input.length >= mg.seq.length) {
      game.quests.advanceStep(mg.questId, game, true);
      game.quests.state.minigame = null;
      game.uiApi.toast('点亮成功！');
      vibe();
    }
  }

  // —— 输入处理 ——
  function handlePlayTap(x, y) {
    const ui = game.uiApi.ui;

    // 渡劫中
    if (game.cultivation.state.tribulation) return;

    // 萤火虫小游戏
    if (game.quests.state.minigame) {
      const btns = game.uiApi.ui._ffBtns || [];
      // drawFireflyGame 填充 _ffBtns，在 update 后可能为空；在 draw 后有值
      // 这里用几何计算
      const w = screen.designW;
      const h = screen.designH;
      const positions = [
        { x: w / 2 - 60, y: h / 2 - 40 },
        { x: w / 2 + 60, y: h / 2 - 40 },
        { x: w / 2 - 60, y: h / 2 + 50 },
        { x: w / 2 + 60, y: h / 2 + 50 }
      ];
      for (let i = 0; i < 4; i++) {
        const p = positions[i];
        if (dist(x, y, p.x, p.y) < 32) {
          handleFireflyTap(i);
          return;
        }
      }
      return;
    }

    if (game.dialog.state.open) {
      game.dialog.handleTap(x, y, screen.designW, screen.designH);
      return;
    }

    if (ui.panel === 'inventory') {
      handleInvTap(x, y);
      return;
    }
    if (ui.panel === 'quests') {
      if (ui._qClose && hitTest(x, y, ui._qClose.x, ui._qClose.y, ui._qClose.w, ui._qClose.h)) {
        ui.panel = null; return;
      }
      const tbs = ui._qTrackBtns || [];
      for (let i = 0; i < tbs.length; i++) {
        if (hitTest(x, y, tbs[i].x, tbs[i].y, tbs[i].w, tbs[i].h)) {
          game.quests.state.tracking = tbs[i].id;
          game.uiApi.toast('追踪：' + game.quests.getDef(tbs[i].id).name);
          return;
        }
      }
      return;
    }
    if (ui.panel === 'shop') {
      if (ui._shopClose && hitTest(x, y, ui._shopClose.x, ui._shopClose.y, ui._shopClose.w, ui._shopClose.h)) {
        ui.panel = null; return;
      }
      const items = ui._shopItems || [];
      for (let i = 0; i < items.length; i++) {
        if (hitTest(x, y, items[i].x, items[i].y, items[i].w, items[i].h)) {
          const r = game.economy.buy(game.inventory, items[i].id);
          game.uiApi.toast(r.msg);
          if (r.ok) game.quests.onShopBuy(game);
          return;
        }
      }
      return;
    }
    if (ui.panel === 'settings') {
      handleSettingsTap(x, y);
      return;
    }
    if (ui.panel === 'menu') {
      // 简单菜单
      const w = screen.designW;
      const h = screen.designH;
      const items = [
        { id: 'save', y: h / 2 - 40 },
        { id: 'settings', y: h / 2 },
        { id: 'title', y: h / 2 + 40 },
        { id: 'close', y: h / 2 + 80 }
      ];
      for (let i = 0; i < items.length; i++) {
        if (y >= items[i].y && y <= items[i].y + 36 && x >= w / 2 - 80 && x <= w / 2 + 80) {
          if (items[i].id === 'save') {
            game.save.save(game);
            game.uiApi.toast('存档成功');
            ui.panel = null;
          } else if (items[i].id === 'settings') {
            ui.panel = 'settings';
          } else if (items[i].id === 'title') {
            game.save.save(game);
            game.mode = 'title';
            ui.panel = null;
          } else {
            ui.panel = null;
          }
          return;
        }
      }
      return;
    }

    // HUD 按钮
    const hot = ui._hotbtns || [];
    for (let i = 0; i < hot.length; i++) {
      const b = hot[i];
      if (hitTest(x, y, b.x, b.y, b.w, b.h)) {
        if (b.id === 'attack') {
          game.combat.tryAttack(game.player, game.enemies, game.particles, vibe);
        } else if (b.skillId) {
          game.cultivation.useSkill(b.skillId, game.player, game.enemies, game.particles);
        }
        return;
      }
    }
    const funcs = ui._funcBtns || [];
    for (let i = 0; i < funcs.length; i++) {
      const b = funcs[i];
      if (hitTest(x, y, b.x, b.y, b.w, b.h)) {
        if (b.id === 'bag') ui.panel = 'inventory';
        else if (b.id === 'quest') ui.panel = 'quests';
        else if (b.id === 'meditate') doMeditate();
        else if (b.id === 'menu') ui.panel = 'menu';
        return;
      }
    }

    // 点哪走哪已在 input 处理；此处尝试交互（点 NPC 附近）
    const world = game.camera.screenToWorld(x, y);
    const npc = findNearestNpc(game.npcs, world.x, world.y, 24);
    if (npc && dist(game.player.getCenter().x, game.player.getCenter().y, npc.getCenter().x, npc.getCenter().y) < 40) {
      openNpcDialog(npc);
      return;
    }
    // 靠近时点空地也可交互
    interact();
  }

  function handleInvTap(x, y) {
    const ui = game.uiApi.ui;
    if (ui._invClose && hitTest(x, y, ui._invClose.x, ui._invClose.y, ui._invClose.w, ui._invClose.h)) {
      ui.panel = null; return;
    }
    const tabs = ui._invTabs || [];
    for (let i = 0; i < tabs.length; i++) {
      if (hitTest(x, y, tabs[i].x, tabs[i].y, tabs[i].w, tabs[i].h)) {
        ui.invTab = tabs[i].tab;
        ui.selectedSlot = -1;
        return;
      }
    }
    const cells = ui._invCells || [];
    for (let i = 0; i < cells.length; i++) {
      if (hitTest(x, y, cells[i].x, cells[i].y, cells[i].w, cells[i].h)) {
        ui.selectedSlot = cells[i].i;
        return;
      }
    }
    if (ui._invUse && hitTest(x, y, ui._invUse.x, ui._invUse.y, ui._invUse.w, ui._invUse.h)) {
      const it = ui._invUse.item;
      const def = ITEM_DEFS[it.id];
      if (def && (def.use || def.equip)) {
        game.inventory.useItem(it.id, game.player, game.cultivation, game.particles);
        ui.selectedSlot = -1;
      } else {
        const r = game.economy.sell(game.inventory, it.id, 1);
        game.uiApi.toast(r.msg);
        ui.selectedSlot = -1;
      }
      return;
    }
    if (ui._invSell && hitTest(x, y, ui._invSell.x, ui._invSell.y, ui._invSell.w, ui._invSell.h)) {
      const it = ui._invSell.item;
      const r = game.economy.sell(game.inventory, it.id, 1);
      game.uiApi.toast(r.msg);
      ui.selectedSlot = -1;
    }
  }

  function handleSettingsTap(x, y) {
    const ui = game.uiApi.ui;
    if (ui._setClose && hitTest(x, y, ui._setClose.x, ui._setClose.y, ui._setClose.w, ui._setClose.h)) {
      ui.panel = null;
      game.save.setSettings(game.settings);
      return;
    }
    if (ui._setVibrate && hitTest(x, y, ui._setVibrate.x, ui._setVibrate.y, ui._setVibrate.w, ui._setVibrate.h)) {
      game.settings.vibrate = !game.settings.vibrate;
      return;
    }
    if (ui._setVol && hitTest(x, y, ui._setVol.x, ui._setVol.y, ui._setVol.w, ui._setVol.h)) {
      game.settings.volume = game.settings.volume >= 0.9 ? 0.3 : game.settings.volume + 0.2;
    }
  }

  function doMeditate() {
    const region = game.regions.getCurrent();
    if (!region || region.id !== 'nest_cave') {
      game.uiApi.toast('请在蚁巢修炼室吐纳');
      return;
    }
    // 靠近水晶
    const nearCrystal = region.map.decor.some((d) =>
      d.type === 'crystal' && dist(d.x, d.y, game.player.x, game.player.y) < 50
    );
    if (!nearCrystal && game.player.x < 40 * TILE) {
      // 允许在西侧大殿附近也行，或修炼密室
    }
    const gained = 15 + game.cultivation.state.realm * 5;
    game.cultivation.addXp(gained, game.player, game.particles, (type, name) => {
      if (type === 'stage') game.uiApi.showBreakthrough(name);
      if (type === 'need_tribulation') game.uiApi.toast('圆满！找玄尘渡劫冲击' + name);
    });
    game.player.mp = Math.min(game.player.maxMp, game.player.mp + 10);
    game.quests.onMeditate(game);
    game.particles.breakthrough(game.player.x + 6, game.player.y);
    vibe();
    game.uiApi.toast('吐纳 +' + gained + ' 修为');
  }

  // —— 更新 ——
  function update(dt) {
    game.time += dt;
    game.uiApi.update(dt);
    game.transition.update(dt);
    game.quests.updateBanners(dt);

    if (game.mode === 'title' || game.mode === 'root') {
      handleTitleInput();
      game.input.endFrame();
      return;
    }

    // 渡劫
    if (game.cultivation.state.tribulation) {
      const move = game.input.getMoveVec();
      let mx = move.x;
      if (game.input.state.walkTarget) {
        // 用触摸 x 控制
        mx = (game.input.state.uiTap ? (game.input.state.uiTap.x / screen.designW - 0.5) * 2 : mx);
      }
      // 也可用 stick
      game.cultivation.updateTribulation(dt, mx);
      const tb = game.cultivation.state.tribulation;
      if (tb && tb.done) {
        game.cultivation.finishTribulation(game.player, game.particles, (ok, msg) => {
          if (ok) {
            game.uiApi.showBreakthrough(msg);
            game.uiApi.toast('渡劫成功！金身铸成！');
          } else {
            game.uiApi.toast(msg);
            // 回巢
            loadRegion('nest_cave');
          }
          vibe();
        });
      }
      game.input.endFrame();
      return;
    }

    if (game.dialog.state.open) {
      game.dialog.update(dt);
      if (game.input.state.uiTap) {
        const t = game.input.state.uiTap;
        game.dialog.handleTap(t.x, t.y, screen.designW, screen.designH);
      }
      game.input.endFrame();
      return;
    }

    updateMinigame(dt);

    // UI 面板打开时只处理点击
    if (game.uiApi.ui.panel || game.quests.state.minigame) {
      if (game.input.state.uiTap) {
        handlePlayTap(game.input.state.uiTap.x, game.input.state.uiTap.y);
      }
      if (game.quests.state.minigame) {
        // still draw world underneath optionally - skip world update lightly
      } else {
        game.input.endFrame();
        return;
      }
    }

    if (game.transition.blocking()) {
      game.input.endFrame();
      return;
    }

    // 正常游玩
    if (game.input.state.uiTap && !game.uiApi.ui.panel) {
      handlePlayTap(game.input.state.uiTap.x, game.input.state.uiTap.y);
    }

    game.daycycle.update(dt);
    game.cultivation.updateCds(dt);

    const region = game.regions.getCurrent();
    if (!region || !game.player) {
      game.input.endFrame();
      return;
    }

    // 移动
    let moveVec = game.input.getMoveVec();
    if (!moveVec.active && game.input.state.walkTarget) {
      const world = game.camera.screenToWorld(game.input.state.walkTarget.x, game.input.state.walkTarget.y);
      const pc = game.player.getCenter();
      const dx = world.x - pc.x;
      const dy = world.y - pc.y;
      const d = Math.sqrt(dx * dx + dy * dy);
      if (d < 8) {
        game.input.clearWalkTarget();
        moveVec = { x: 0, y: 0, active: false };
      } else {
        moveVec = { x: dx / d, y: dy / d, active: true };
      }
    }

    // 护送：NPC 跟随玩家
    if (game.quests.state.escort) {
      const enpc = game.npcs.find((n) => n.defId === game.quests.state.escort.npcId);
      if (enpc) {
        enpc.escortTarget = { x: game.player.x - 16, y: game.player.y };
      }
    }

    if (!game.player.dead) {
      game.player.update(dt, moveVec, region.map);
    } else {
      // 死亡复活
      if (game.player.deadT > 2) {
        game.player.dead = false;
        game.player.hp = Math.floor(game.player.maxHp * 0.5);
        game.cultivation.state.xp = Math.max(0, game.cultivation.state.xp - 10);
        loadRegion('nest_cave');
        game.uiApi.toast('意识回归蚁巢……修为略损');
      }
    }

    game.camera.follow(game.player.x + 6, game.player.y + 6);
    game.camera.update(dt);

    // 键盘攻击/技能
    if (game.input.state.attackPressed) {
      game.combat.tryAttack(game.player, game.enemies, game.particles, vibe);
    }
    for (let i = 0; i < 3; i++) {
      if (game.input.state.skillPressed[i]) {
        const sid = game.cultivation.state.learned[i];
        if (sid) game.cultivation.useSkill(sid, game.player, game.enemies, game.particles);
      }
    }

    // NPC
    for (let i = 0; i < game.npcs.length; i++) {
      game.npcs[i].questIcon = game.quests.getQuestIcon(game.npcs[i].defId);
      game.npcs[i].update(dt);
    }

    // 敌人
    const isNight = game.daycycle.isNight();
    for (let i = 0; i < game.enemies.length; i++) {
      const e = game.enemies[i];
      const wasDead = e.dead;
      const res = e.update(dt, game.player, region.map, isNight);
      if (res && res.attacked && !game.player.dead) {
        const dmg = game.player.takeDamage(res.damage);
        if (dmg > 0) {
          game.particles.floatText(game.player.x, game.player.y - 14, '-' + dmg, '#e74c3c');
          game.camera.shake(4, 0.2);
          vibe();
        }
      }
      if (e.dead && !wasDead) {
        // 刚死
        game.combat.dropLoot(e, game.drops);
        // 偶尔掉枯枝
        if (Math.random() < 0.35) {
          game.drops.push({
            itemId: 'wood', x: e.x, y: e.y, amount: 1, life: 60, bob: 0, taken: false
          });
        }
        game.quests.onKill(e.type, game);
        game.cultivation.addXp(e.def.xp, game.player, game.particles, (type, name) => {
          if (type === 'stage') game.uiApi.showBreakthrough(name);
          if (type === 'need_tribulation') game.uiApi.toast('可渡劫冲击' + name);
        });
      }
    }

    updateDefend(dt);

    // 采集点刷新
    for (let i = 0; i < game.gatherables.length; i++) {
      const g = game.gatherables[i];
      if (g.taken) {
        g.timer -= dt;
        if (g.timer <= 0) { g.taken = false; }
      }
    }

    // 掉落物寿命
    for (let i = game.drops.length - 1; i >= 0; i--) {
      game.drops[i].life -= dt;
      if (game.drops[i].life <= 0 || game.drops[i].taken) game.drops.splice(i, 1);
    }

    // 传送门
    if (game._portalCd > 0) game._portalCd -= dt;
    tryPortal();

    // 交互提示
    const pc = game.player.getCenter();
    game._interactHint = null;
    const nearG = findNearestGatherable(game.gatherables, pc.x, pc.y, 24);
    const nearN = findNearestNpc(game.npcs, pc.x, pc.y, 28);
    const portal = region.map.getPortalAt(pc.x, pc.y);
    if (nearG) game._interactHint = '点击采集 ' + (ITEM_DEFS[nearG.itemId] || {}).name;
    else if (nearN) game._interactHint = '点击对话 ' + nearN.def.name;
    else if (portal) game._interactHint = '前往 ' + (portal.label || '');

    // 粒子环境
    game.leafTimer -= dt;
    if (region.leaves && game.leafTimer <= 0) {
      game.leafTimer = 0.8;
      if (game.camera.inView(game.player.x, game.player.y, 100)) {
        game.particles.leaf(
          game.player.x + (Math.random() - 0.5) * 120,
          game.player.y - 40 - Math.random() * 30
        );
      }
    }
    game.fireflyTimer -= dt;
    if (isNight && game.fireflyTimer <= 0) {
      game.fireflyTimer = 0.5;
      game.particles.firefly(
        game.player.x + (Math.random() - 0.5) * 160,
        game.player.y + (Math.random() - 0.5) * 120
      );
    }

    game.particles.update(dt);
    game.particles.updateUI(dt);

    // 自动存档（周期性）
    if (!game._saveAcc) game._saveAcc = 0;
    game._saveAcc += dt;
    if (game._saveAcc > 30) {
      game._saveAcc = 0;
      game.save.save(game);
    }

    game.input.endFrame();
  }

  function handleTitleInput() {
    const tap = game.input.state.uiTap;
    if (!tap) return;
    if (game.mode === 'title') {
      if (game.uiApi.ui.panel === 'settings') {
        handleSettingsTap(tap.x, tap.y);
        return;
      }
      const id = game.uiApi.hitTitle(tap.x, tap.y);
      if (id === 'new') {
        // 随机灵根进入选择
        game.uiApi.ui.rootChoices = ROOTS.slice().sort(() => Math.random() - 0.5);
        game.uiApi.ui.rootPick = 0;
        game.mode = 'root';
      } else if (id === 'continue') {
        if (!continueGame()) game.uiApi.toast('没有存档');
      } else if (id === 'settings') {
        game.uiApi.ui.panel = 'settings';
      }
    } else if (game.mode === 'root') {
      const ui = game.uiApi.ui;
      const btns = ui._rootBtns || [];
      for (let i = 0; i < btns.length; i++) {
        if (hitTest(tap.x, tap.y, btns[i].x, btns[i].y, btns[i].w, btns[i].h)) {
          ui.rootPick = btns[i].i;
          return;
        }
      }
      if (ui._rootReroll && hitTest(tap.x, tap.y, ui._rootReroll.x, ui._rootReroll.y, ui._rootReroll.w, ui._rootReroll.h)) {
        ui.rootChoices = ROOTS.slice().sort(() => Math.random() - 0.5);
        return;
      }
      if (ui._rootOk && hitTest(tap.x, tap.y, ui._rootOk.x, ui._rootOk.y, ui._rootOk.w, ui._rootOk.h)) {
        const root = ui.rootChoices[ui.rootPick];
        startNewGame(root);
      }
    }
  }

  // —— 绘制 ——
  function draw() {
    const ctx = screen.ctx;
    screen.beginFrame();
    const w = screen.designW;
    const h = screen.designH;

    if (game.mode === 'title') {
      game.uiApi.drawTitle(ctx, game.save.hasSave(), game.settings);
      if (game.uiApi.ui.panel === 'settings') {
        game.uiApi.drawSettings(ctx, game.settings);
      }
      screen.endFrame();
      return;
    }

    if (game.mode === 'root') {
      game.uiApi.drawRootSelect(ctx, game.uiApi.ui.rootChoices || ROOTS);
      screen.endFrame();
      return;
    }

    // 渡劫全屏
    if (game.cultivation.state.tribulation) {
      game.uiApi.drawTribulation(ctx, game.cultivation.state.tribulation);
      screen.endFrame();
      return;
    }

    // 萤火虫小游戏覆盖
    if (game.quests.state.minigame && game.quests.state.minigame.phase) {
      // 先画一点世界暗底
      ctx.fillStyle = '#0a1020';
      ctx.fillRect(0, 0, w, h);
      game.uiApi.drawFireflyGame(ctx, game.quests.state.minigame);
      screen.endFrame();
      return;
    }

    const region = game.regions.getCurrent();
    if (region) {
      // 环境暗度
      region.map.render(ctx, game.camera, game.time);

      // 采集物
      for (let i = 0; i < game.gatherables.length; i++) {
        drawGatherable(ctx, game.gatherables[i], game.camera, game.time);
      }
      // 掉落
      for (let i = 0; i < game.drops.length; i++) {
        drawDrop(ctx, game.drops[i], game.camera, game.time);
      }
      // 实体按 y 排序
      const drawList = [];
      for (let i = 0; i < game.npcs.length; i++) drawList.push({ y: game.npcs[i].y, d: game.npcs[i], t: 'npc' });
      for (let i = 0; i < game.enemies.length; i++) {
        if (!game.enemies[i].dead || game.enemies[i].deadT < 1) {
          drawList.push({ y: game.enemies[i].y, d: game.enemies[i], t: 'enemy' });
        }
      }
      drawList.push({ y: game.player.y, d: game.player, t: 'player' });
      drawList.sort((a, b) => a.y - b.y);
      for (let i = 0; i < drawList.length; i++) {
        const it = drawList[i];
        if (it.t === 'player') it.d.draw(ctx, game.camera, game.time);
        else it.d.draw(ctx, game.camera, game.time);
      }

      game.particles.draw(ctx, game.camera);

      // 昼夜
      game.daycycle.drawOverlay(ctx, w, h);
      if (region.ambientDark) {
        ctx.fillStyle = `rgba(0,0,20,${region.ambientDark})`;
        ctx.fillRect(0, 0, w, h);
      }
    }

    // HUD
    game.uiApi.drawHUD(ctx, game);
    game.uiApi.drawDefend(ctx, game.quests.state.defend);
    game.input.drawStick(ctx);
    game.particles.drawUI(ctx);

    // 面板
    const panel = game.uiApi.ui.panel;
    if (panel === 'inventory') game.uiApi.drawInventory(ctx, game);
    else if (panel === 'quests') game.uiApi.drawQuestLog(ctx, game);
    else if (panel === 'shop') game.uiApi.drawShop(ctx, game);
    else if (panel === 'settings') game.uiApi.drawSettings(ctx, game.settings);
    else if (panel === 'menu') {
      ctx.fillStyle = 'rgba(0,0,0,0.5)';
      ctx.fillRect(0, 0, w, h);
      const { drawPanel, drawButton, drawText, COLORS } = require('./js/pix.js');
      drawPanel(ctx, w / 2 - 90, h / 2 - 60, 180, 180, { gold: true });
      drawText(ctx, '菜 单', w / 2, h / 2 - 48, { align: 'center', font: 'bold 16px serif', color: COLORS.gold });
      drawButton(ctx, w / 2 - 70, h / 2 - 20, 140, 32, '保存进度');
      drawButton(ctx, w / 2 - 70, h / 2 + 20, 140, 32, '设置');
      drawButton(ctx, w / 2 - 70, h / 2 + 60, 140, 32, '返回标题');
      drawButton(ctx, w / 2 - 70, h / 2 + 100, 140, 32, '关闭');
    }

    game.uiApi.drawDialog(ctx, game.dialog);
    game.transition.draw(ctx, w, h);

    screen.endFrame();
  }

  game.update = update;
  game.draw = draw;
  game.startNewGame = startNewGame;
  game.continueGame = continueGame;
  game.loadRegion = loadRegion;
  return game;
}

// ========== 启动 ==========
function main() {
  const cvs = getCanvas();
  const screen = createScreen(cvs);
  const game = createGame(screen);
  const raf = getRAF();
  let last = Date.now();

  function frame(now) {
    if (typeof now !== 'number') now = Date.now();
    let dt = (now - last) / 1000;
    last = now;
    if (dt > 0.05) dt = 0.05;
    if (dt < 0) dt = 0;
    try {
      game.update(dt);
      game.draw();
    } catch (e) {
      console.error(e);
    }
    raf(frame);
  }
  raf(frame);
}

main();
