/**
 * 输入系统 — 点触行走 / WASD / UI 点击（多指）
 * 世界移动目标由 game 根据 UI 命中结果设置，此处只上报 uiTap
 */
function createInput(screen) {
  const state = {
    // 世界行走目标（世界坐标）；由 game 设置
    walkTarget: null, // {x,y} 世界像素
    // 通用触摸
    touches: {},
    justPressed: [],
    justReleased: [],
    // UI / 屏幕点击（本帧，设计坐标）
    uiTap: null, // {x,y}
    // 攻击键
    attackPressed: false,
    skillPressed: [false, false, false],
    // 键位（开发者工具键盘）
    keys: {}
  };

  function toDesign(clientX, clientY) {
    return screen.screenToDesign(clientX, clientY);
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
      state.uiTap = { x: p.x, y: p.y };
    }
  }

  function onTouchMove(e) {
    const changed = e.changedTouches || e.touches || [];
    for (let i = 0; i < changed.length; i++) {
      const t = changed[i];
      const id = t.identifier != null ? t.identifier : i;
      const p = toDesign(t.clientX != null ? t.clientX : t.x, t.clientY != null ? t.clientY : t.y);
      state.touches[id] = p;
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
    }
  }

  function bind(canvas) {
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
        if (Object.keys(state.touches).length) {
          onTouchMove({ changedTouches: [{ identifier: 0, clientX: e.clientX, clientY: e.clientY }] });
        }
      });
      canvas.addEventListener('mouseup', (e) => {
        onTouchEnd({ changedTouches: [{ identifier: 0, clientX: e.clientX, clientY: e.clientY }] });
      });
    }
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

  /** 仅 WASD / 方向键（无摇杆） */
  function getMoveVec() {
    let x = 0;
    let y = 0;
    if (state.keys['ArrowLeft'] || state.keys['a'] || state.keys['A']) x -= 1;
    if (state.keys['ArrowRight'] || state.keys['d'] || state.keys['D']) x += 1;
    if (state.keys['ArrowUp'] || state.keys['w'] || state.keys['W']) y -= 1;
    if (state.keys['ArrowDown'] || state.keys['s'] || state.keys['S']) y += 1;
    const len = Math.sqrt(x * x + y * y);
    if (len > 1) { x /= len; y /= len; }
    return { x, y, active: len > 0.05 };
  }

  return {
    state, bind, endFrame, getMoveVec,
    clearWalkTarget() { state.walkTarget = null; },
    setWalkTarget(wx, wy) { state.walkTarget = { x: wx, y: wy }; }
  };
}

module.exports = { createInput };
