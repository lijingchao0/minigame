/**
 * 输入系统 — 虚拟摇杆 + 点哪走哪 + UI 按钮（多指）
 * 摇杆区（左下）与点击行走区分离，避免冲突
 */
const { clamp } = require('./pix.js');

function createInput(screen) {
  const state = {
    // 摇杆
    stickActive: false,
    stickId: null,
    stickOrigin: { x: 0, y: 0 },
    stickPos: { x: 0, y: 0 },
    stickVec: { x: 0, y: 0 }, // -1..1
    // 点哪走哪
    walkTarget: null, // {x,y} 设计坐标（屏幕）
    // 通用触摸
    touches: {},
    justPressed: [],
    justReleased: [],
    // UI 点击（本帧）
    uiTap: null, // {x,y} 设计坐标
    // 攻击键
    attackPressed: false,
    skillPressed: [false, false, false],
    // 键位（开发者工具键盘）
    keys: {}
  };

  const STICK_R = 52;
  const STICK_DEAD = 8;

  function toDesign(clientX, clientY) {
    return screen.screenToDesign(clientX, clientY);
  }

  function inStickZone(dx, dy) {
    // 左下角摇杆区域
    const sw = screen.designW;
    const sh = screen.designH;
    return dx < sw * 0.42 && dy > sh * 0.55;
  }

  function onTouchStart(e) {
    const touches = e.touches || (e.changedTouches ? [e.changedTouches[0]] : []);
    const changed = e.changedTouches || touches;
    for (let i = 0; i < changed.length; i++) {
      const t = changed[i];
      const id = t.identifier != null ? t.identifier : i;
      const p = toDesign(t.clientX != null ? t.clientX : t.x, t.clientY != null ? t.clientY : t.y);
      state.touches[id] = p;
      state.justPressed.push({ id, x: p.x, y: p.y });

      if (!state.stickActive && inStickZone(p.x, p.y)) {
        state.stickActive = true;
        state.stickId = id;
        state.stickOrigin = { x: p.x, y: p.y };
        state.stickPos = { x: p.x, y: p.y };
        state.stickVec = { x: 0, y: 0 };
        state.walkTarget = null;
      } else if (!state.stickActive || id !== state.stickId) {
        // UI 或行走点击
        state.uiTap = { x: p.x, y: p.y };
        // 非摇杆区且非底部按钮栏 → 点哪走哪
        if (p.y < screen.designH - 70 && p.x > 10) {
          state.walkTarget = { x: p.x, y: p.y };
        }
      }
    }
  }

  function onTouchMove(e) {
    const changed = e.changedTouches || e.touches || [];
    for (let i = 0; i < changed.length; i++) {
      const t = changed[i];
      const id = t.identifier != null ? t.identifier : i;
      const p = toDesign(t.clientX != null ? t.clientX : t.x, t.clientY != null ? t.clientY : t.y);
      state.touches[id] = p;
      if (state.stickActive && id === state.stickId) {
        state.stickPos = { x: p.x, y: p.y };
        let dx = p.x - state.stickOrigin.x;
        let dy = p.y - state.stickOrigin.y;
        const len = Math.sqrt(dx * dx + dy * dy);
        if (len > STICK_R) {
          dx = (dx / len) * STICK_R;
          dy = (dy / len) * STICK_R;
          state.stickPos = { x: state.stickOrigin.x + dx, y: state.stickOrigin.y + dy };
        }
        if (len < STICK_DEAD) {
          state.stickVec = { x: 0, y: 0 };
        } else {
          state.stickVec = { x: dx / STICK_R, y: dy / STICK_R };
        }
        state.walkTarget = null;
      }
    }
  }

  function onTouchEnd(e) {
    const changed = e.changedTouches || [];
    for (let i = 0; i < changed.length; i++) {
      const t = changed[i];
      const id = t.identifier != null ? t.identifier : i;
      const p = state.touches[id] || { x: 0, y: 0 };
      state.justReleased.push({ id, x: p.x, y: p.y });
      delete state.touches[id];
      if (id === state.stickId) {
        state.stickActive = false;
        state.stickId = null;
        state.stickVec = { x: 0, y: 0 };
      }
    }
  }

  function bind(canvas) {
    // 微信
    if (typeof wx !== 'undefined' && wx.onTouchStart) {
      wx.onTouchStart(onTouchStart);
      wx.onTouchMove(onTouchMove);
      wx.onTouchEnd(onTouchEnd);
      wx.onTouchCancel(onTouchEnd);
    } else if (canvas) {
      canvas.addEventListener('touchstart', onTouchStart, { passive: true });
      canvas.addEventListener('touchmove', onTouchMove, { passive: true });
      canvas.addEventListener('touchend', onTouchEnd, { passive: true });
      canvas.addEventListener('mousedown', (e) => {
        onTouchStart({ changedTouches: [{ identifier: 0, clientX: e.clientX, clientY: e.clientY }] });
      });
      canvas.addEventListener('mousemove', (e) => {
        if (state.stickActive || Object.keys(state.touches).length) {
          onTouchMove({ changedTouches: [{ identifier: 0, clientX: e.clientX, clientY: e.clientY }] });
        }
      });
      canvas.addEventListener('mouseup', (e) => {
        onTouchEnd({ changedTouches: [{ identifier: 0, clientX: e.clientX, clientY: e.clientY }] });
      });
    }
    // 键盘（开发者工具）
    if (typeof wx !== 'undefined' && wx.onKeyDown) {
      wx.onKeyDown((e) => {
        state.keys[e.key] = true;
        if (e.key === 'a' || e.key === 'A' || e.key === 'j' || e.key === 'J') state.attackPressed = true;
        if (e.key === '1') state.skillPressed[0] = true;
        if (e.key === '2') state.skillPressed[1] = true;
        if (e.key === '3') state.skillPressed[2] = true;
      });
      wx.onKeyUp((e) => { state.keys[e.key] = false; });
    } else if (typeof window !== 'undefined') {
      window.addEventListener('keydown', (e) => {
        state.keys[e.key] = true;
        if (e.key === 'a' || e.key === 'A' || e.key === 'j' || e.key === 'J') state.attackPressed = true;
        if (e.key === '1') state.skillPressed[0] = true;
        if (e.key === '2') state.skillPressed[1] = true;
        if (e.key === '3') state.skillPressed[2] = true;
      });
      window.addEventListener('keyup', (e) => { state.keys[e.key] = false; });
    }
  }

  function endFrame() {
    state.justPressed = [];
    state.justReleased = [];
    state.uiTap = null;
    state.attackPressed = false;
    state.skillPressed = [false, false, false];
  }

  /** 合并摇杆与 WASD */
  function getMoveVec() {
    let x = state.stickVec.x;
    let y = state.stickVec.y;
    if (state.keys['ArrowLeft'] || state.keys['a'] || state.keys['A']) x -= 1;
    if (state.keys['ArrowRight'] || state.keys['d'] || state.keys['D']) x += 1;
    if (state.keys['ArrowUp'] || state.keys['w'] || state.keys['W']) y -= 1;
    if (state.keys['ArrowDown'] || state.keys['s'] || state.keys['S']) y += 1;
    const len = Math.sqrt(x * x + y * y);
    if (len > 1) { x /= len; y /= len; }
    return { x, y, active: len > 0.05 };
  }

  function drawStick(ctx) {
    if (!state.stickActive) {
      // 半透明提示圈
      const ox = 70;
      const oy = screen.designH - 90;
      ctx.save();
      ctx.globalAlpha = 0.35;
      ctx.strokeStyle = '#f5e6c8';
      ctx.lineWidth = 2;
      ctx.beginPath();
      ctx.arc(ox, oy, STICK_R, 0, Math.PI * 2);
      ctx.stroke();
      ctx.beginPath();
      ctx.arc(ox, oy, 18, 0, Math.PI * 2);
      ctx.fillStyle = '#f5e6c8';
      ctx.fill();
      ctx.restore();
      return;
    }
    const ox = state.stickOrigin.x;
    const oy = state.stickOrigin.y;
    ctx.save();
    ctx.globalAlpha = 0.55;
    ctx.strokeStyle = '#f5e6c8';
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.arc(ox, oy, STICK_R, 0, Math.PI * 2);
    ctx.stroke();
    ctx.globalAlpha = 0.75;
    ctx.beginPath();
    ctx.arc(state.stickPos.x, state.stickPos.y, 20, 0, Math.PI * 2);
    ctx.fillStyle = '#d4a017';
    ctx.fill();
    ctx.restore();
  }

  return {
    state, bind, endFrame, getMoveVec, drawStick,
    clearWalkTarget() { state.walkTarget = null; },
    STICK_R
  };
}

module.exports = { createInput };
