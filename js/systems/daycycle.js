/**
 * 昼夜循环 + 色调叠加
 */
function createDayCycle() {
  const state = {
    time: 8, // 0-24 小时
    speed: 0.4, // 每现实秒推进的游戏小时（约 1 分钟 = 1 游戏时 → 稍快）
    paused: false
  };

  function update(dt) {
    if (state.paused) return;
    state.time += state.speed * dt;
    if (state.time >= 24) state.time -= 24;
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
    const h = Math.floor(state.time);
    const m = Math.floor((state.time - h) * 60);
    const ph = { dawn: '黎明', day: '白昼', dusk: '黄昏', night: '夜晚' }[phase()];
    return (h < 10 ? '0' : '') + h + ':' + (m < 10 ? '0' : '') + m + ' ' + ph;
  }

  function drawOverlay(ctx, w, h) {
    const p = phase();
    ctx.save();
    if (p === 'dawn') {
      ctx.fillStyle = 'rgba(255,180,100,0.12)';
      ctx.fillRect(0, 0, w, h);
    } else if (p === 'dusk') {
      ctx.fillStyle = 'rgba(80,40,20,0.28)';
      ctx.fillRect(0, 0, w, h);
    } else if (p === 'night') {
      ctx.fillStyle = 'rgba(10,15,40,0.48)';
      ctx.fillRect(0, 0, w, h);
    }
    ctx.restore();
  }

  function serialize() { return { time: state.time }; }
  function deserialize(d) { if (d && d.time != null) state.time = d.time; }

  return { state, update, phase, isNight, timeLabel, drawOverlay, serialize, deserialize };
}

module.exports = { createDayCycle };
