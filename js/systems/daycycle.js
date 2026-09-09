/**
 * 昼夜循环 — 现实时间驱动 + 可调倍速
 * 默认：游戏内 1 天 = 现实 12 分钟（1 现实秒 ≈ 2 游戏分钟）
 */
const REAL_MS_PER_GAME_DAY = 12 * 60 * 1000; // 720000
const SPEED_OPTIONS = [1, 2, 3, 4];

function createDayCycle() {
  const state = {
    time: 8, // 0-24 游戏小时（由真实时间推导后缓存）
    speedMul: 1,
    dayStartRealMs: Date.now() - (8 / 24) * REAL_MS_PER_GAME_DAY,
    realMsPerDay: REAL_MS_PER_GAME_DAY,
    paused: false,
    _overlayA: 0 // 平滑色调 alpha
  };

  /** 根据真实时间重算游戏时刻，保持连续 */
  function syncFromReal() {
    if (state.paused) return state.time;
    const elapsed = Math.max(0, Date.now() - state.dayStartRealMs) * state.speedMul;
    const days = elapsed / state.realMsPerDay;
    state.time = (days * 24) % 24;
    return state.time;
  }

  /** 以当前游戏时刻为锚，重锚 dayStartRealMs（改倍速 / 读档时用） */
  function reanchor(preserveTime) {
    const t = preserveTime != null ? preserveTime : state.time;
    state.time = ((t % 24) + 24) % 24;
    const frac = state.time / 24;
    state.dayStartRealMs = Date.now() - (frac * state.realMsPerDay) / Math.max(0.001, state.speedMul);
  }

  function update(dt) {
    if (state.paused) return;
    syncFromReal();
    // 色调平滑过渡目标
    const target = overlayAlpha();
    const k = Math.min(1, dt * 1.8);
    state._overlayA += (target - state._overlayA) * k;
  }

  function phase() {
    const t = state.time;
    if (t >= 5 && t < 7) return 'dawn';
    if (t >= 7 && t < 17) return 'day';
    if (t >= 17 && t < 19.5) return 'dusk';
    return 'night';
  }

  function isNight() {
    return phase() === 'night';
  }

  function timeLabel() {
    syncFromReal();
    const h = Math.floor(state.time);
    const m = Math.floor((state.time - h) * 60);
    const ph = { dawn: '黎明', day: '白昼', dusk: '黄昏', night: '夜晚' }[phase()];
    return (h < 10 ? '0' : '') + h + ':' + (m < 10 ? '0' : '') + m + ' ' + ph;
  }

  function overlayAlpha() {
    const p = phase();
    const t = state.time;
    if (p === 'dawn') {
      // 5→7 从夜暗淡出到白天
      const u = (t - 5) / 2;
      return 0.22 * (1 - u);
    }
    if (p === 'day') return 0;
    if (p === 'dusk') {
      const u = (t - 17) / 2.5;
      return 0.18 * u;
    }
    // night：压暗幅度降低，保证可读
    return 0.28;
  }

  function drawOverlay(ctx, w, h) {
    const a = state._overlayA;
    if (a < 0.01) return;
    const p = phase();
    ctx.save();
    if (p === 'dawn' || (state.time >= 5 && state.time < 8)) {
      ctx.fillStyle = `rgba(255,190,120,${Math.min(0.14, a * 0.6)})`;
    } else if (p === 'dusk') {
      ctx.fillStyle = `rgba(90,50,30,${a})`;
    } else {
      ctx.fillStyle = `rgba(15,20,45,${a})`;
    }
    ctx.fillRect(0, 0, w, h);
    ctx.restore();
  }

  function setSpeed(mul) {
    syncFromReal();
    const m = SPEED_OPTIONS.indexOf(mul) >= 0 ? mul : 1;
    state.speedMul = m;
    reanchor(state.time);
  }

  function cycleSpeed() {
    syncFromReal();
    const idx = SPEED_OPTIONS.indexOf(state.speedMul);
    const next = SPEED_OPTIONS[(idx < 0 ? 0 : idx + 1) % SPEED_OPTIONS.length];
    setSpeed(next);
    return next;
  }

  function speedLabel() {
    return state.speedMul + '×';
  }

  function serialize() {
    syncFromReal();
    return {
      time: state.time,
      speedMul: state.speedMul,
      dayStartRealMs: state.dayStartRealMs,
      realMsPerDay: state.realMsPerDay,
      // 游戏内总秒数（不依赖时区）：便于校验
      gameSeconds: state.time * 3600
    };
  }

  function deserialize(d) {
    if (!d) {
      reanchor(8);
      return;
    }
    state.speedMul = SPEED_OPTIONS.indexOf(d.speedMul) >= 0 ? d.speedMul : 1;
    if (d.realMsPerDay) state.realMsPerDay = d.realMsPerDay;

    // 新档：保留真实时间锚，离线期间继续流逝
    if (d.dayStartRealMs != null && isFinite(d.dayStartRealMs)) {
      state.dayStartRealMs = d.dayStartRealMs;
      syncFromReal();
    } else {
      // 旧档：仅有 time / gameSeconds → 以当前真实时间折算，昼夜连续
      const t = d.time != null ? d.time : (d.gameSeconds != null ? d.gameSeconds / 3600 : 8);
      state.time = ((t % 24) + 24) % 24;
      reanchor(state.time);
    }
    state._overlayA = overlayAlpha();
  }

  // 初始对齐
  reanchor(8);
  state._overlayA = overlayAlpha();

  return {
    state, update, phase, isNight, timeLabel, drawOverlay,
    setSpeed, cycleSpeed, speedLabel, syncFromReal, reanchor,
    serialize, deserialize, SPEED_OPTIONS, REAL_MS_PER_GAME_DAY
  };
}

module.exports = { createDayCycle };
