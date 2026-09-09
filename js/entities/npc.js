/**
 * NPC 定义与实体 — 立体像素 + 任务标识光晕
 */
const { drawShadow, drawText, dist } = require('../pix.js');

const NPC_DEFS = {
  queen: {
    id: 'queen', name: '蚁后·瑶光', role: '蚁后',
    color: '#c0392b', accent: '#f1c40f', light: '#e74c3c', dark: '#7b241c', size: 1.55,
    lines: ['吾乃瑶光，王国之母。', '孩子，你的灵智已开，前途不可限量。'],
    questGiver: true
  },
  king_ant: {
    id: 'king_ant', name: '蚁王·玄尘', role: '师父',
    color: '#2c3e50', accent: '#3498db', light: '#5d6d7e', dark: '#1a252f', size: 1.35,
    lines: ['老夫游历归来，专为寻一位可造之材。', '吐纳之术，当以心静为先。'],
    questGiver: true
  },
  worker_elder: {
    id: 'worker_elder', name: '工蚁长老·土伯', role: '长老',
    color: '#6b4420', accent: '#d4a017', light: '#8b5a2b', dark: '#3d2814', size: 1.2,
    lines: ['巢穴扩建离不开大家出力。', '采集、建造，都是修行的一种。'],
    questGiver: true
  },
  soldier_captain: {
    id: 'soldier_captain', name: '兵蚁队长·铁颚', role: '队长',
    color: '#1a1a2e', accent: '#e74c3c', light: '#3d3d5c', dark: '#0a0a14', size: 1.3,
    lines: ['边境不安宁，时刻准备战斗！', '有胆量就来帮我巡逻。'],
    questGiver: true
  },
  nurse_ant: {
    id: 'nurse_ant', name: '育婴蚁·暖心', role: '育婴',
    color: '#e8a0bf', accent: '#fff', light: '#f5c6d6', dark: '#c4789a', size: 1.1,
    lines: ['幼虫们饿了……能帮我采些食物吗？', '每一只幼蚁，都是王国的未来。'],
    questGiver: true
  },
  scout_ant: {
    id: 'scout_ant', name: '侦察蚁·疾风', role: '侦察',
    color: '#27ae60', accent: '#a8e6cf', light: '#58d68d', dark: '#1e8449', size: 1.1,
    lines: ['外面的世界很大，我刚带回新情报。', '蘑菇林里似乎有灵泉的气息……'],
    questGiver: true
  },
  ladybug_merchant: {
    id: 'ladybug_merchant', name: '瓢虫商人·斑斑', role: '商人',
    color: '#e74c3c', accent: '#2c3e50', light: '#f1948a', dark: '#922b21', size: 1.15,
    lines: ['嘿，要不要看看我的货？种子、工具都有！', '最近货被偷了，真倒霉……'],
    shop: true, questGiver: true
  },
  grasshopper: {
    id: 'grasshopper', name: '蚂蚱旅人·跳跳', role: '旅人',
    color: '#7dcea0', accent: '#1e8449', light: '#a9dfbf', dark: '#196f3d', size: 1.25,
    lines: ['我一路跳来，听闻不少奇事。', '蜘蛛精在边境作乱，你们蚂蚁可得小心。'],
    questGiver: true
  },
  bee_messenger: {
    id: 'bee_messenger', name: '蜜蜂信使·嗡嗡', role: '信使',
    color: '#f1c40f', accent: '#2c3e50', light: '#f7dc6f', dark: '#b7950b', size: 1.15,
    lines: ['蜂巢向蚁巢致意！有信件要转交吗？', '跨区域的消息，找我就对了。'],
    questGiver: true
  },
  firefly_guide: {
    id: 'firefly_guide', name: '萤火虫·微光', role: '向导',
    color: '#f9e79f', accent: '#f1c40f', light: '#fcf3cf', dark: '#d4ac0d', size: 1.0,
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
    w: 16 * s0,
    h: 16 * s0,
    animT: Math.random() * 10,
    questIcon: null, // '!' | '?' | '…' | null
    homeX: x,
    homeY: y,
    escortTarget: null,

    getCenter() {
      return { x: this.x + this.w / 2, y: this.y + this.h / 2 };
    },

    update(dt) {
      this.animT += dt;
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
      if (!cam.inView(c.x, c.y, 36)) return;
      const sp = cam.worldToScreen(c.x, c.y);
      const bob = Math.sin(this.animT * 2) * 1.2;
      const s = def.size || 1;
      const light = def.light || def.accent;
      const dark = def.dark || def.color;

      ctx.save();
      drawShadow(ctx, sp.x, sp.y + 7 * s, 8 * s, 3.2);

      if (defId === 'ladybug_merchant') {
        ctx.fillStyle = dark;
        ctx.beginPath();
        ctx.ellipse(sp.x, sp.y + 1 + bob, 8.5, 7.5, 0, 0, Math.PI * 2);
        ctx.fill();
        ctx.fillStyle = def.color;
        ctx.beginPath();
        ctx.ellipse(sp.x, sp.y - 1 + bob, 8, 6.5, 0, 0, Math.PI * 2);
        ctx.fill();
        ctx.fillStyle = light;
        ctx.beginPath();
        ctx.ellipse(sp.x - 2, sp.y - 3 + bob, 4, 2.5, 0, 0, Math.PI * 2);
        ctx.fill();
        ctx.fillStyle = '#2c3e50';
        ctx.beginPath();
        ctx.arc(sp.x - 3, sp.y - 2 + bob, 2, 0, Math.PI * 2);
        ctx.arc(sp.x + 3, sp.y + 1 + bob, 2, 0, Math.PI * 2);
        ctx.arc(sp.x, sp.y + 3 + bob, 1.5, 0, Math.PI * 2);
        ctx.fill();
        ctx.fillStyle = '#1a252f';
        ctx.beginPath();
        ctx.arc(sp.x, sp.y - 8 + bob, 4.5, 0, Math.PI * 2);
        ctx.fill();
        ctx.fillStyle = '#5d6d7e';
        ctx.beginPath();
        ctx.arc(sp.x - 1, sp.y - 9.5 + bob, 2, 0, Math.PI * 2);
        ctx.fill();
        ctx.strokeStyle = 'rgba(8,4,2,0.6)';
        ctx.lineWidth = 1.5;
        ctx.beginPath();
        ctx.ellipse(sp.x, sp.y + bob, 8.5, 7.5, 0, 0, Math.PI * 2);
        ctx.stroke();
      } else if (defId === 'grasshopper') {
        ctx.fillStyle = dark;
        ctx.fillRect(sp.x - 7, sp.y - 3 + bob, 14, 7);
        ctx.fillStyle = def.color;
        ctx.fillRect(sp.x - 6, sp.y - 5 + bob, 12, 5);
        ctx.fillStyle = light;
        ctx.fillRect(sp.x - 5, sp.y - 5 + bob, 10, 2);
        ctx.strokeStyle = '#1e8449';
        ctx.lineWidth = 2.2;
        ctx.beginPath();
        ctx.moveTo(sp.x + 4, sp.y + bob);
        ctx.quadraticCurveTo(sp.x + 13, sp.y - 11 + bob, sp.x + 9, sp.y + 7 + bob);
        ctx.stroke();
        ctx.fillStyle = dark;
        ctx.beginPath();
        ctx.arc(sp.x - 4, sp.y - 6 + bob, 3.5, 0, Math.PI * 2);
        ctx.fill();
        ctx.fillStyle = light;
        ctx.beginPath();
        ctx.arc(sp.x - 5, sp.y - 7 + bob, 1.8, 0, Math.PI * 2);
        ctx.fill();
      } else if (defId === 'bee_messenger') {
        ctx.fillStyle = dark;
        ctx.beginPath();
        ctx.ellipse(sp.x, sp.y + 1 + bob, 6.5, 5.5, 0, 0, Math.PI * 2);
        ctx.fill();
        ctx.fillStyle = '#f1c40f';
        ctx.beginPath();
        ctx.ellipse(sp.x, sp.y + bob, 6, 5, 0, 0, Math.PI * 2);
        ctx.fill();
        ctx.fillStyle = light;
        ctx.beginPath();
        ctx.ellipse(sp.x - 1, sp.y - 2 + bob, 3.5, 2, 0, 0, Math.PI * 2);
        ctx.fill();
        ctx.fillStyle = '#2c3e50';
        ctx.fillRect(sp.x - 6, sp.y - 2 + bob, 12, 2);
        ctx.fillRect(sp.x - 6, sp.y + 2 + bob, 12, 2);
        ctx.fillStyle = 'rgba(255,255,255,0.55)';
        ctx.beginPath();
        ctx.ellipse(sp.x - 8, sp.y - 2 + bob, 5, 3, -0.3, 0, Math.PI * 2);
        ctx.ellipse(sp.x + 8, sp.y - 2 + bob, 5, 3, 0.3, 0, Math.PI * 2);
        ctx.fill();
        ctx.strokeStyle = 'rgba(8,4,2,0.55)';
        ctx.lineWidth = 1.4;
        ctx.beginPath();
        ctx.ellipse(sp.x, sp.y + bob, 6.5, 5.5, 0, 0, Math.PI * 2);
        ctx.stroke();
      } else if (defId === 'firefly_guide') {
        const glow = 0.45 + Math.sin(time * 4) * 0.3;
        ctx.fillStyle = `rgba(241,196,15,${glow})`;
        ctx.beginPath();
        ctx.arc(sp.x, sp.y + bob, 12, 0, Math.PI * 2);
        ctx.fill();
        ctx.fillStyle = dark;
        ctx.beginPath();
        ctx.arc(sp.x, sp.y + 1 + bob, 4.5, 0, Math.PI * 2);
        ctx.fill();
        ctx.fillStyle = '#f9e79f';
        ctx.beginPath();
        ctx.arc(sp.x, sp.y + bob, 4, 0, Math.PI * 2);
        ctx.fill();
        ctx.fillStyle = light;
        ctx.beginPath();
        ctx.arc(sp.x - 1, sp.y - 1 + bob, 1.8, 0, Math.PI * 2);
        ctx.fill();
      } else {
        // 默认蚂蚁 NPC：腹/胸/头明暗分层 + 描边
        ctx.fillStyle = dark;
        ctx.beginPath();
        ctx.ellipse(sp.x, sp.y + 3 * s + bob, 5.5 * s, 4.5 * s, 0, 0, Math.PI * 2);
        ctx.fill();
        ctx.fillStyle = def.color;
        ctx.beginPath();
        ctx.ellipse(sp.x, sp.y + 1.5 * s + bob, 4.5 * s, 3 * s, 0, 0, Math.PI * 2);
        ctx.fill();

        ctx.fillStyle = dark;
        ctx.beginPath();
        ctx.ellipse(sp.x, sp.y - 2.5 * s + bob, 4.5 * s, 4 * s, 0, 0, Math.PI * 2);
        ctx.fill();
        ctx.fillStyle = light;
        ctx.beginPath();
        ctx.ellipse(sp.x - 0.5 * s, sp.y - 4 * s + bob, 3 * s, 2 * s, 0, 0, Math.PI * 2);
        ctx.fill();

        ctx.fillStyle = dark;
        ctx.beginPath();
        ctx.ellipse(sp.x, sp.y - 8 * s + bob, 4.5 * s, 4 * s, 0, 0, Math.PI * 2);
        ctx.fill();
        ctx.fillStyle = def.accent;
        ctx.beginPath();
        ctx.ellipse(sp.x, sp.y - 9 * s + bob, 3.5 * s, 2.5 * s, 0, 0, Math.PI * 2);
        ctx.fill();

        ctx.strokeStyle = 'rgba(8,4,2,0.6)';
        ctx.lineWidth = 1.5;
        ctx.beginPath();
        ctx.ellipse(sp.x, sp.y + 3 * s + bob, 5.7 * s, 4.7 * s, 0, 0, Math.PI * 2);
        ctx.stroke();
        ctx.beginPath();
        ctx.ellipse(sp.x, sp.y - 8 * s + bob, 4.7 * s, 4.2 * s, 0, 0, Math.PI * 2);
        ctx.stroke();

        ctx.strokeStyle = dark;
        ctx.lineWidth = 1.3;
        ctx.beginPath();
        ctx.moveTo(sp.x - 2 * s, sp.y - 10 * s + bob);
        ctx.lineTo(sp.x - 4.5 * s, sp.y - 17 * s + bob);
        ctx.moveTo(sp.x + 2 * s, sp.y - 10 * s + bob);
        ctx.lineTo(sp.x + 4.5 * s, sp.y - 17 * s + bob);
        ctx.stroke();
        if (defId === 'queen') {
          ctx.fillStyle = '#f1c40f';
          ctx.fillRect(sp.x - 5, sp.y - 14 * s + bob, 10, 3);
          ctx.fillRect(sp.x - 4, sp.y - 17 * s + bob, 2, 3);
          ctx.fillRect(sp.x - 1, sp.y - 18 * s + bob, 2, 4);
          ctx.fillRect(sp.x + 2, sp.y - 17 * s + bob, 2, 3);
        }
      }

      // 名字
      drawText(ctx, def.name.split('·')[0], sp.x, sp.y - 24 * s + bob, {
        align: 'center', font: '10px "PingFang SC",sans-serif', color: '#f5e6c8', shadow: true
      });

      // 任务图标：光晕 + 呼吸
      if (this.questIcon) {
        const iconY = sp.y - 34 * s + bob - Math.sin(time * 3) * 2.5;
        const breath = 0.55 + Math.sin(time * 3.5) * 0.25;
        let col = '#aaa';
        if (this.questIcon === '!') col = '#f1c40f';
        else if (this.questIcon === '?') col = '#5dade2';
        ctx.fillStyle = col.replace(')', `,${breath})`).replace('rgb', 'rgba').replace('#f1c40f', `rgba(241,196,15,${breath})`).replace('#5dade2', `rgba(93,173,226,${breath})`).replace('#aaa', `rgba(170,170,170,${breath * 0.7})`);
        // 简化光晕
        ctx.beginPath();
        ctx.arc(sp.x, iconY - 4, 10 + Math.sin(time * 3) * 1.5, 0, Math.PI * 2);
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
        ctx.strokeText(this.questIcon, sp.x, iconY);
        ctx.fillStyle = this.questIcon === '!' ? '#f1c40f' : this.questIcon === '?' ? '#5dade2' : '#ccc';
        ctx.fillText(this.questIcon, sp.x, iconY);
      }
      ctx.restore();
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
