/**
 * 粒子系统 — 落叶、萤火虫、打击特效、突破金光等
 */
function createParticles() {
  const list = [];

  function spawn(type, x, y, opts) {
    opts = opts || {};
    const n = opts.count || 1;
    for (let i = 0; i < n; i++) {
      const p = {
        type,
        x: x + (opts.spread ? (Math.random() - 0.5) * opts.spread : 0),
        y: y + (opts.spread ? (Math.random() - 0.5) * opts.spread : 0),
        vx: opts.vx != null ? opts.vx : (Math.random() - 0.5) * (opts.speed || 40),
        vy: opts.vy != null ? opts.vy : -Math.random() * (opts.speed || 40) - 10,
        life: opts.life || 0.8,
        maxLife: opts.life || 0.8,
        size: opts.size || 3,
        color: opts.color || '#fff',
        text: opts.text || '',
        gravity: opts.gravity != null ? opts.gravity : 60
      };
      list.push(p);
    }
  }

  function floatText(x, y, text, color) {
    spawn('text', x, y, {
      text, color: color || '#fff', life: 1.0, vy: -30, vx: (Math.random() - 0.5) * 10,
      gravity: 0, size: 12
    });
  }

  function hitSpark(x, y) {
    spawn('spark', x, y, { count: 6, spread: 20, life: 0.35, color: '#ffeaa7', size: 2 });
  }

  function leaf(x, y) {
    spawn('leaf', x, y, {
      vx: (Math.random() - 0.5) * 20,
      vy: 10 + Math.random() * 20,
      life: 3,
      gravity: 15,
      color: Math.random() > 0.5 ? '#6aaa40' : '#c4a035',
      size: 3
    });
  }

  function firefly(x, y) {
    spawn('firefly', x, y, {
      vx: (Math.random() - 0.5) * 15,
      vy: (Math.random() - 0.5) * 15,
      life: 4,
      gravity: 0,
      color: '#f1c40f',
      size: 2
    });
  }

  function breakthrough(cx, cy) {
    spawn('ring', cx, cy, { life: 1.2, gravity: 0, size: 4, color: '#f1c40f', vx: 0, vy: 0 });
    spawn('spark', cx, cy, { count: 24, speed: 80, life: 1.0, color: '#ffeaa7', size: 3, gravity: 20 });
  }

  function update(dt) {
    for (let i = list.length - 1; i >= 0; i--) {
      const p = list[i];
      p.life -= dt;
      if (p.life <= 0) { list.splice(i, 1); continue; }
      p.vy += p.gravity * dt;
      p.x += p.vx * dt;
      p.y += p.vy * dt;
      if (p.type === 'firefly') {
        p.vx += (Math.random() - 0.5) * 40 * dt;
        p.vy += (Math.random() - 0.5) * 40 * dt;
      }
      if (p.type === 'ring') {
        p.size += 60 * dt;
      }
    }
  }

  function draw(ctx, cam) {
    for (let i = 0; i < list.length; i++) {
      const p = list[i];
      if (cam && !cam.inView(p.x, p.y, 20)) continue;
      const sp = cam ? cam.worldToScreen(p.x, p.y) : { x: p.x, y: p.y };
      const a = Math.max(0, p.life / p.maxLife);
      ctx.save();
      ctx.globalAlpha = a;
      if (p.type === 'text') {
        ctx.fillStyle = p.color;
        ctx.font = 'bold ' + p.size + 'px "PingFang SC","Microsoft YaHei",sans-serif';
        ctx.textAlign = 'center';
        ctx.fillText(p.text, sp.x, sp.y);
      } else if (p.type === 'ring') {
        ctx.strokeStyle = p.color;
        ctx.lineWidth = 3;
        ctx.beginPath();
        ctx.arc(sp.x, sp.y, p.size, 0, Math.PI * 2);
        ctx.stroke();
      } else if (p.type === 'firefly') {
        ctx.fillStyle = p.color;
        ctx.shadowColor = p.color;
        ctx.shadowBlur = 8;
        ctx.beginPath();
        ctx.arc(sp.x, sp.y, p.size, 0, Math.PI * 2);
        ctx.fill();
      } else if (p.type === 'leaf') {
        ctx.fillStyle = p.color;
        ctx.fillRect(sp.x, sp.y, p.size, p.size * 0.6);
      } else {
        ctx.fillStyle = p.color;
        ctx.beginPath();
        ctx.arc(sp.x, sp.y, p.size, 0, Math.PI * 2);
        ctx.fill();
      }
      ctx.restore();
    }
  }

  // UI 层飘字（屏幕坐标）
  const uiList = [];
  function uiText(x, y, text, color) {
    uiList.push({ x, y, text, color: color || '#fff', life: 1.2, maxLife: 1.2, vy: -40 });
  }

  function updateUI(dt) {
    for (let i = uiList.length - 1; i >= 0; i--) {
      const p = uiList[i];
      p.life -= dt;
      p.y += p.vy * dt;
      if (p.life <= 0) uiList.splice(i, 1);
    }
  }

  function drawUI(ctx) {
    for (let i = 0; i < uiList.length; i++) {
      const p = uiList[i];
      ctx.save();
      ctx.globalAlpha = p.life / p.maxLife;
      ctx.fillStyle = p.color;
      ctx.font = 'bold 14px "PingFang SC","Microsoft YaHei",sans-serif';
      ctx.textAlign = 'center';
      ctx.fillText(p.text, p.x, p.y);
      ctx.restore();
    }
  }

  return {
    list, spawn, floatText, hitSpark, leaf, firefly, breakthrough,
    update, draw, uiText, updateUI, drawUI
  };
}

module.exports = { createParticles };
