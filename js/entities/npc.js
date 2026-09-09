/**
 * NPC 定义与实体 — 个性化昆虫造型（共用精灵骨架）
 */
const { drawText, dist } = require('../pix.js');
const { animFrame, drawAntSprite } = require('./sprite.js');

const NPC_DEFS = {
  queen: {
    id: 'queen', name: '蚁后·瑶光', role: '蚁后',
    color: '#c0392b', accent: '#f1c40f', light: '#e74c3c', dark: '#7b241c', size: 1.65,
    lines: ['吾乃瑶光，王国之母。', '孩子，你的灵智已开，前途不可限量。'],
    questGiver: true
  },
  king_ant: {
    id: 'king_ant', name: '蚁王·玄尘', role: '师父',
    color: '#2c3e50', accent: '#3498db', light: '#5d6d7e', dark: '#1a252f', size: 1.45,
    lines: ['老夫游历归来，专为寻一位可造之材。', '吐纳之术，当以心静为先。'],
    questGiver: true
  },
  worker_elder: {
    id: 'worker_elder', name: '工蚁长老·土伯', role: '长老',
    color: '#6b4420', accent: '#d4a017', light: '#8b5a2b', dark: '#3d2814', size: 1.28,
    lines: ['巢穴扩建离不开大家出力。', '采集、建造，都是修行的一种。'],
    questGiver: true
  },
  soldier_captain: {
    id: 'soldier_captain', name: '兵蚁队长·铁颚', role: '队长',
    color: '#1a1a2e', accent: '#e74c3c', light: '#3d3d5c', dark: '#0a0a14', size: 1.4,
    lines: ['边境不安宁，时刻准备战斗！', '有胆量就来帮我巡逻。'],
    questGiver: true
  },
  nurse_ant: {
    id: 'nurse_ant', name: '育婴蚁·暖心', role: '育婴',
    color: '#e8a0bf', accent: '#fff', light: '#f5c6d6', dark: '#c4789a', size: 1.18,
    lines: ['幼虫们饿了……能帮我采些食物吗？', '每一只幼蚁，都是王国的未来。'],
    questGiver: true
  },
  scout_ant: {
    id: 'scout_ant', name: '侦察蚁·疾风', role: '侦察',
    color: '#27ae60', accent: '#a8e6cf', light: '#58d68d', dark: '#1e8449', size: 1.18,
    lines: ['外面的世界很大，我刚带回新情报。', '蘑菇林里似乎有灵泉的气息……'],
    questGiver: true
  },
  ladybug_merchant: {
    id: 'ladybug_merchant', name: '瓢虫商人·斑斑', role: '商人',
    color: '#e74c3c', accent: '#2c3e50', light: '#f1948a', dark: '#922b21', size: 1.3,
    lines: ['嘿，要不要看看我的货？种子、工具都有！', '最近货被偷了，真倒霉……'],
    shop: true, questGiver: true
  },
  grasshopper: {
    id: 'grasshopper', name: '蚂蚱旅人·跳跳', role: '旅人',
    color: '#7dcea0', accent: '#1e8449', light: '#a9dfbf', dark: '#196f3d', size: 1.35,
    lines: ['我一路跳来，听闻不少奇事。', '蜘蛛精在边境作乱，你们蚂蚁可得小心。'],
    questGiver: true
  },
  bee_messenger: {
    id: 'bee_messenger', name: '蜜蜂信使·嗡嗡', role: '信使',
    color: '#f1c40f', accent: '#2c3e50', light: '#f7dc6f', dark: '#b7950b', size: 1.25,
    lines: ['蜂巢向蚁巢致意！有信件要转交吗？', '跨区域的消息，找我就对了。'],
    questGiver: true
  },
  firefly_guide: {
    id: 'firefly_guide', name: '萤火虫·微光', role: '向导',
    color: '#f9e79f', accent: '#f1c40f', light: '#fcf3cf', dark: '#d4ac0d', size: 1.1,
    lines: ['夜晚跟紧我的光，不会迷路哦～', '想玩点亮游戏吗？按顺序跟上就好。'],
    questGiver: true, nightOnly: false
  }
};

function createNpc(defId, x, y) {
  const def = NPC_DEFS[defId];
  if (!def) throw new Error('未知NPC: ' + defId);
  const s0 = def.size || 1;
  return {
    defId,
    def,
    x, y,
    w: 18 * s0,
    h: 18 * s0,
    animT: Math.random() * 10,
    questIcon: null,
    homeX: x,
    homeY: y,
    escortTarget: null,
    blinkT: Math.random() * 3,

    getCenter() {
      return { x: this.x + this.w / 2, y: this.y + this.h / 2 };
    },

    update(dt) {
      this.animT += dt;
      this.blinkT -= dt;
      if (this.blinkT < -2) this.blinkT = 0.1;
      if (this.escortTarget) {
        const dx = this.escortTarget.x - this.x;
        const dy = this.escortTarget.y - this.y;
        const d = Math.sqrt(dx * dx + dy * dy);
        if (d > 8) {
          this.x += (dx / d) * 50 * dt;
          this.y += (dy / d) * 50 * dt;
        }
      }
    },

    draw(ctx, cam, time) {
      const c = this.getCenter();
      if (!cam.inView(c.x, c.y, 42)) return;
      const sp = cam.worldToScreen(c.x, c.y);
      const bob = Math.sin(this.animT * 2.2) * 1.3;
      const s = def.size || 1;
      const light = def.light || def.accent;
      const dark = def.dark || def.color;
      const frame = animFrame(this.animT, 5, 4);
      const blink = this.blinkT > 0 && this.blinkT < 0.1;

      ctx.save();
      ctx.translate(sp.x, sp.y);

      if (defId === 'ladybug_merchant') this._drawLadybug(ctx, s, bob, light, dark);
      else if (defId === 'grasshopper') this._drawGrasshopper(ctx, s, bob, light, dark, frame);
      else if (defId === 'bee_messenger') this._drawBee(ctx, s, bob, light, dark);
      else if (defId === 'firefly_guide') this._drawFirefly(ctx, s, bob, light, dark, time);
      else {
        // 蚂蚁族 NPC
        const colors = {
          abdomenDark: dark,
          abdomenLight: def.color,
          thoraxDark: dark,
          thoraxLight: light,
          headDark: dark,
          headLight: def.accent,
          accent: def.accent
        };
        drawAntSprite(ctx, {
          scale: 1.15 * s,
          colors,
          dir: 'down',
          pose: this.escortTarget ? 'walk' : 'idle',
          frame,
          breath: Math.sin(this.animT * 2.5),
          bob,
          blink,
          animT: this.animT,
          crown: defId === 'queen',
          jawOpen: defId === 'soldier_captain' ? 0.35 : 0,
          glowEyes: defId === 'king_ant' || defId === 'queen',
          eyeColor: defId === 'nurse_ant' ? '#fff0f5' : undefined
        });
      }

      // 名字
      drawText(ctx, def.name.split('·')[0], 0, -26 * s + bob, {
        align: 'center', font: '10px "PingFang SC",sans-serif', color: '#f5e6c8', shadow: true
      });

      // 任务图标
      if (this.questIcon) {
        const iconY = -36 * s + bob - Math.sin(time * 3) * 2.5;
        const breath = 0.55 + Math.sin(time * 3.5) * 0.25;
        ctx.beginPath();
        ctx.arc(0, iconY - 4, 10 + Math.sin(time * 3) * 1.5, 0, Math.PI * 2);
        ctx.fillStyle = this.questIcon === '!'
          ? `rgba(241,196,15,${0.25 + breath * 0.2})`
          : this.questIcon === '?'
            ? `rgba(93,173,226,${0.25 + breath * 0.2})`
            : `rgba(180,180,180,${0.15 + breath * 0.1})`;
        ctx.fill();
        ctx.font = 'bold 16px sans-serif';
        ctx.textAlign = 'center';
        ctx.textBaseline = 'middle';
        ctx.strokeStyle = 'rgba(20,12,4,0.7)';
        ctx.lineWidth = 3;
        ctx.strokeText(this.questIcon, 0, iconY);
        ctx.fillStyle = this.questIcon === '!' ? '#f1c40f' : this.questIcon === '?' ? '#5dade2' : '#ccc';
        ctx.fillText(this.questIcon, 0, iconY);
      }
      ctx.restore();
    },

    _drawLadybug(ctx, s, bob, light, dark) {
      ctx.fillStyle = 'rgba(0,0,0,0.2)';
      ctx.beginPath();
      ctx.ellipse(0, 8 * s, 9 * s, 3.2, 0, 0, Math.PI * 2);
      ctx.fill();
      // 圆背
      ctx.fillStyle = dark;
      ctx.beginPath();
      ctx.ellipse(0, 1 + bob, 10 * s, 8.5 * s, 0, 0, Math.PI * 2);
      ctx.fill();
      ctx.fillStyle = def.color;
      ctx.beginPath();
      ctx.ellipse(0, bob, 9.2 * s, 7.5 * s, 0, 0, Math.PI * 2);
      ctx.fill();
      ctx.fillStyle = light;
      ctx.beginPath();
      ctx.ellipse(-2 * s, -2.5 * s + bob, 4.5 * s, 2.8 * s, 0, 0, Math.PI * 2);
      ctx.fill();
      // 中线 + 黑点
      ctx.strokeStyle = '#2c3e50';
      ctx.lineWidth = 1.5;
      ctx.beginPath();
      ctx.moveTo(0, -6 * s + bob);
      ctx.lineTo(0, 6 * s + bob);
      ctx.stroke();
      ctx.fillStyle = '#2c3e50';
      const spots = [[-3.5, -2], [3.5, -1], [-2.5, 3], [3, 3.5], [0, 1]];
      for (let i = 0; i < spots.length; i++) {
        ctx.beginPath();
        ctx.arc(spots[i][0] * s, spots[i][1] * s + bob, 1.8 * s, 0, Math.PI * 2);
        ctx.fill();
      }
      // 头
      ctx.fillStyle = '#1a252f';
      ctx.beginPath();
      ctx.arc(0, -9 * s + bob, 5 * s, 0, Math.PI * 2);
      ctx.fill();
      ctx.fillStyle = '#5d6d7e';
      ctx.beginPath();
      ctx.arc(-1 * s, -10 * s + bob, 2.2 * s, 0, Math.PI * 2);
      ctx.fill();
      ctx.fillStyle = '#f1c40f';
      ctx.fillRect(-2.5 * s, -10 * s + bob, 1.8 * s, 1.8 * s);
      ctx.fillRect(1 * s, -10 * s + bob, 1.8 * s, 1.8 * s);
      ctx.strokeStyle = 'rgba(8,4,2,0.65)';
      ctx.lineWidth = 1.6;
      ctx.beginPath();
      ctx.ellipse(0, bob, 9.6 * s, 7.9 * s, 0, 0, Math.PI * 2);
      ctx.stroke();
    },

    _drawGrasshopper(ctx, s, bob, light, dark, frame) {
      ctx.fillStyle = 'rgba(0,0,0,0.18)';
      ctx.beginPath();
      ctx.ellipse(0, 8 * s, 8 * s, 3, 0, 0, Math.PI * 2);
      ctx.fill();
      ctx.fillStyle = dark;
      ctx.beginPath();
      ctx.ellipse(0, 1 + bob, 8 * s, 5.5 * s, 0, 0, Math.PI * 2);
      ctx.fill();
      ctx.fillStyle = def.color;
      ctx.beginPath();
      ctx.ellipse(0, bob, 7.2 * s, 4.8 * s, 0, 0, Math.PI * 2);
      ctx.fill();
      ctx.fillStyle = light;
      ctx.fillRect(-6 * s, -3 * s + bob, 12 * s, 2.2 * s);
      // 长后足
      const hop = Math.sin(this.animT * 3) * 2;
      ctx.strokeStyle = '#1e8449';
      ctx.lineWidth = 2.4;
      ctx.beginPath();
      ctx.moveTo(3 * s, bob);
      ctx.quadraticCurveTo(14 * s, -12 * s + bob + hop, 10 * s, 8 * s + bob);
      ctx.moveTo(-1 * s, 2 * s + bob);
      ctx.lineTo(-6 * s, 7 * s + bob);
      ctx.stroke();
      // 头
      ctx.fillStyle = dark;
      ctx.beginPath();
      ctx.arc(-5 * s, -5 * s + bob, 4 * s, 0, Math.PI * 2);
      ctx.fill();
      ctx.fillStyle = light;
      ctx.beginPath();
      ctx.arc(-5.5 * s, -6 * s + bob, 2 * s, 0, Math.PI * 2);
      ctx.fill();
      ctx.fillStyle = '#1a1008';
      ctx.fillRect(-7 * s, -6 * s + bob, 2 * s, 2 * s);
      // 触角
      ctx.strokeStyle = dark;
      ctx.lineWidth = 1.2;
      ctx.beginPath();
      ctx.moveTo(-6 * s, -8 * s + bob);
      ctx.lineTo(-10 * s, -14 * s + bob);
      ctx.moveTo(-4 * s, -8 * s + bob);
      ctx.lineTo(-2 * s, -14 * s + bob);
      ctx.stroke();
    },

    _drawBee(ctx, s, bob, light, dark) {
      const wing = Math.sin(this.animT * 16) * 2.5;
      ctx.fillStyle = 'rgba(0,0,0,0.15)';
      ctx.beginPath();
      ctx.ellipse(0, 8 * s, 7 * s, 2.8, 0, 0, Math.PI * 2);
      ctx.fill();
      ctx.fillStyle = 'rgba(255,255,255,0.55)';
      ctx.beginPath();
      ctx.ellipse(-8 * s, -2 * s + bob + wing, 5.5 * s, 3.2 * s, -0.35, 0, Math.PI * 2);
      ctx.ellipse(8 * s, -2 * s + bob - wing, 5.5 * s, 3.2 * s, 0.35, 0, Math.PI * 2);
      ctx.fill();
      ctx.fillStyle = dark;
      ctx.beginPath();
      ctx.ellipse(0, 1 + bob, 7 * s, 5.8 * s, 0, 0, Math.PI * 2);
      ctx.fill();
      ctx.fillStyle = '#f1c40f';
      ctx.beginPath();
      ctx.ellipse(0, bob, 6.3 * s, 5.2 * s, 0, 0, Math.PI * 2);
      ctx.fill();
      ctx.fillStyle = light;
      ctx.beginPath();
      ctx.ellipse(-1 * s, -2 * s + bob, 3.5 * s, 2.2 * s, 0, 0, Math.PI * 2);
      ctx.fill();
      // 黄黑条纹
      ctx.fillStyle = '#2c3e50';
      ctx.fillRect(-6.2 * s, -2 * s + bob, 12.4 * s, 2.2 * s);
      ctx.fillRect(-6.2 * s, 2.2 * s + bob, 12.4 * s, 2.2 * s);
      ctx.fillStyle = '#f1c40f';
      ctx.fillRect(-2 * s, -9 * s + bob, 2 * s, 2 * s);
      ctx.fillRect(1 * s, -9 * s + bob, 2 * s, 2 * s);
      ctx.strokeStyle = 'rgba(8,4,2,0.55)';
      ctx.lineWidth = 1.5;
      ctx.beginPath();
      ctx.ellipse(0, bob, 6.6 * s, 5.5 * s, 0, 0, Math.PI * 2);
      ctx.stroke();
    },

    _drawFirefly(ctx, s, bob, light, dark, time) {
      const glow = 0.4 + Math.sin(time * 4) * 0.35;
      ctx.fillStyle = `rgba(241,196,15,${glow})`;
      ctx.beginPath();
      ctx.arc(0, bob, 14 * s, 0, Math.PI * 2);
      ctx.fill();
      ctx.fillStyle = `rgba(180,255,120,${glow * 0.5})`;
      ctx.beginPath();
      ctx.arc(0, 5 * s + bob, 7 * s, 0, Math.PI * 2);
      ctx.fill();
      ctx.fillStyle = dark;
      ctx.beginPath();
      ctx.ellipse(0, bob, 5 * s, 4 * s, 0, 0, Math.PI * 2);
      ctx.fill();
      ctx.fillStyle = '#f9e79f';
      ctx.beginPath();
      ctx.ellipse(0, -0.5 * s + bob, 4.2 * s, 3.4 * s, 0, 0, Math.PI * 2);
      ctx.fill();
      // 发光尾节
      ctx.fillStyle = `rgba(255,255,150,${0.7 + glow * 0.3})`;
      ctx.beginPath();
      ctx.ellipse(0, 5.5 * s + bob, 3.5 * s, 3 * s, 0, 0, Math.PI * 2);
      ctx.fill();
      ctx.fillStyle = '#2c3e50';
      ctx.fillRect(-2 * s, -2 * s + bob, 1.6 * s, 1.6 * s);
      ctx.fillRect(0.6 * s, -2 * s + bob, 1.6 * s, 1.6 * s);
      // 翅
      ctx.fillStyle = 'rgba(255,255,255,0.35)';
      ctx.beginPath();
      ctx.ellipse(-5 * s, -1 * s + bob, 4 * s, 2 * s, -0.3, 0, Math.PI * 2);
      ctx.ellipse(5 * s, -1 * s + bob, 4 * s, 2 * s, 0.3, 0, Math.PI * 2);
      ctx.fill();
    }
  };
}

function findNearestNpc(npcs, x, y, range) {
  let best = null;
  let bestD = range || 28;
  for (let i = 0; i < npcs.length; i++) {
    const c = npcs[i].getCenter();
    const d = dist(x, y, c.x, c.y);
    if (d < bestD) { bestD = d; best = npcs[i]; }
  }
  return best;
}

module.exports = { NPC_DEFS, createNpc, findNearestNpc };
