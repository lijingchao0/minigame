/**
 * NPC 定义与实体
 */
const { drawShadow, drawText, dist } = require('../pix.js');

const NPC_DEFS = {
  queen: {
    id: 'queen', name: '蚁后·瑶光', role: '蚁后',
    color: '#c0392b', accent: '#f1c40f', size: 1.4,
    lines: ['吾乃瑶光，王国之母。', '孩子，你的灵智已开，前途不可限量。'],
    questGiver: true
  },
  king_ant: {
    id: 'king_ant', name: '蚁王·玄尘', role: '师父',
    color: '#2c3e50', accent: '#3498db', size: 1.2,
    lines: ['老夫游历归来，专为寻一位可造之材。', '吐纳之术，当以心静为先。'],
    questGiver: true
  },
  worker_elder: {
    id: 'worker_elder', name: '工蚁长老·土伯', role: '长老',
    color: '#6b4420', accent: '#d4a017', size: 1.1,
    lines: ['巢穴扩建离不开大家出力。', '采集、建造，都是修行的一种。'],
    questGiver: true
  },
  soldier_captain: {
    id: 'soldier_captain', name: '兵蚁队长·铁颚', role: '队长',
    color: '#1a1a2e', accent: '#e74c3c', size: 1.15,
    lines: ['边境不安宁，时刻准备战斗！', '有胆量就来帮我巡逻。'],
    questGiver: true
  },
  nurse_ant: {
    id: 'nurse_ant', name: '育婴蚁·暖心', role: '育婴',
    color: '#e8a0bf', accent: '#fff', size: 1.0,
    lines: ['幼虫们饿了……能帮我采些食物吗？', '每一只幼蚁，都是王国的未来。'],
    questGiver: true
  },
  scout_ant: {
    id: 'scout_ant', name: '侦察蚁·疾风', role: '侦察',
    color: '#27ae60', accent: '#a8e6cf', size: 0.95,
    lines: ['外面的世界很大，我刚带回新情报。', '蘑菇林里似乎有灵泉的气息……'],
    questGiver: true
  },
  ladybug_merchant: {
    id: 'ladybug_merchant', name: '瓢虫商人·斑斑', role: '商人',
    color: '#e74c3c', accent: '#2c3e50', size: 1.0,
    lines: ['嘿，要不要看看我的货？种子、工具都有！', '最近货被偷了，真倒霉……'],
    shop: true, questGiver: true
  },
  grasshopper: {
    id: 'grasshopper', name: '蚂蚱旅人·跳跳', role: '旅人',
    color: '#7dcea0', accent: '#1e8449', size: 1.1,
    lines: ['我一路跳来，听闻不少奇事。', '蜘蛛精在边境作乱，你们蚂蚁可得小心。'],
    questGiver: true
  },
  bee_messenger: {
    id: 'bee_messenger', name: '蜜蜂信使·嗡嗡', role: '信使',
    color: '#f1c40f', accent: '#2c3e50', size: 1.0,
    lines: ['蜂巢向蚁巢致意！有信件要转交吗？', '跨区域的消息，找我就对了。'],
    questGiver: true
  },
  firefly_guide: {
    id: 'firefly_guide', name: '萤火虫·微光', role: '向导',
    color: '#f9e79f', accent: '#f1c40f', size: 0.85,
    lines: ['夜晚跟紧我的光，不会迷路哦～', '想玩点亮游戏吗？按顺序跟上就好。'],
    questGiver: true, nightOnly: false
  }
};

function createNpc(defId, x, y) {
  const def = NPC_DEFS[defId];
  if (!def) throw new Error('未知NPC: ' + defId);
  return {
    defId,
    def,
    x, y,
    w: 14 * (def.size || 1),
    h: 14 * (def.size || 1),
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
      if (!cam.inView(c.x, c.y, 30)) return;
      const sp = cam.worldToScreen(c.x, c.y);
      const bob = Math.sin(this.animT * 2) * 1.2;
      const s = def.size || 1;

      ctx.save();
      drawShadow(ctx, sp.x, sp.y + 6 * s, 6 * s, 2.5);

      // 按角色画不同外形
      if (defId === 'ladybug_merchant') {
        ctx.fillStyle = def.color;
        ctx.beginPath();
        ctx.ellipse(sp.x, sp.y + bob, 8, 7, 0, 0, Math.PI * 2);
        ctx.fill();
        ctx.fillStyle = '#2c3e50';
        ctx.beginPath();
        ctx.arc(sp.x - 3, sp.y - 2 + bob, 2, 0, Math.PI * 2);
        ctx.arc(sp.x + 3, sp.y + 1 + bob, 2, 0, Math.PI * 2);
        ctx.arc(sp.x, sp.y + 3 + bob, 1.5, 0, Math.PI * 2);
        ctx.fill();
        ctx.fillStyle = '#2c3e50';
        ctx.beginPath();
        ctx.arc(sp.x, sp.y - 8 + bob, 4, 0, Math.PI * 2);
        ctx.fill();
      } else if (defId === 'grasshopper') {
        ctx.fillStyle = def.color;
        ctx.fillRect(sp.x - 6, sp.y - 4 + bob, 12, 6);
        ctx.strokeStyle = '#1e8449';
        ctx.lineWidth = 2;
        ctx.beginPath();
        ctx.moveTo(sp.x + 4, sp.y + bob);
        ctx.quadraticCurveTo(sp.x + 12, sp.y - 10 + bob, sp.x + 8, sp.y + 6 + bob);
        ctx.stroke();
        ctx.fillStyle = '#1e8449';
        ctx.beginPath();
        ctx.arc(sp.x - 4, sp.y - 6 + bob, 3, 0, Math.PI * 2);
        ctx.fill();
      } else if (defId === 'bee_messenger') {
        ctx.fillStyle = '#f1c40f';
        ctx.beginPath();
        ctx.ellipse(sp.x, sp.y + bob, 6, 5, 0, 0, Math.PI * 2);
        ctx.fill();
        ctx.fillStyle = '#2c3e50';
        ctx.fillRect(sp.x - 6, sp.y - 2 + bob, 12, 2);
        ctx.fillRect(sp.x - 6, sp.y + 2 + bob, 12, 2);
        ctx.fillStyle = 'rgba(255,255,255,0.5)';
        ctx.beginPath();
        ctx.ellipse(sp.x - 8, sp.y - 2 + bob, 5, 3, -0.3, 0, Math.PI * 2);
        ctx.ellipse(sp.x + 8, sp.y - 2 + bob, 5, 3, 0.3, 0, Math.PI * 2);
        ctx.fill();
      } else if (defId === 'firefly_guide') {
        const glow = 0.4 + Math.sin(time * 4) * 0.3;
        ctx.fillStyle = `rgba(241,196,15,${glow})`;
        ctx.beginPath();
        ctx.arc(sp.x, sp.y + bob, 10, 0, Math.PI * 2);
        ctx.fill();
        ctx.fillStyle = '#f9e79f';
        ctx.beginPath();
        ctx.arc(sp.x, sp.y + bob, 4, 0, Math.PI * 2);
        ctx.fill();
      } else {
        // 默认蚂蚁 NPC
        ctx.fillStyle = def.color;
        ctx.beginPath();
        ctx.ellipse(sp.x, sp.y + 2 * s + bob, 5 * s, 4 * s, 0, 0, Math.PI * 2);
        ctx.fill();
        ctx.beginPath();
        ctx.ellipse(sp.x, sp.y - 3 * s + bob, 4 * s, 3.5 * s, 0, 0, Math.PI * 2);
        ctx.fill();
        ctx.fillStyle = def.accent;
        ctx.beginPath();
        ctx.ellipse(sp.x, sp.y - 8 * s + bob, 4 * s, 3.5 * s, 0, 0, Math.PI * 2);
        ctx.fill();
        // 触角
        ctx.strokeStyle = def.color;
        ctx.lineWidth = 1.2;
        ctx.beginPath();
        ctx.moveTo(sp.x - 2 * s, sp.y - 10 * s + bob);
        ctx.lineTo(sp.x - 4 * s, sp.y - 16 * s + bob);
        ctx.moveTo(sp.x + 2 * s, sp.y - 10 * s + bob);
        ctx.lineTo(sp.x + 4 * s, sp.y - 16 * s + bob);
        ctx.stroke();
        if (defId === 'queen') {
          // 王冠
          ctx.fillStyle = '#f1c40f';
          ctx.fillRect(sp.x - 5, sp.y - 14 * s + bob, 10, 3);
          ctx.fillRect(sp.x - 4, sp.y - 17 * s + bob, 2, 3);
          ctx.fillRect(sp.x - 1, sp.y - 18 * s + bob, 2, 4);
          ctx.fillRect(sp.x + 2, sp.y - 17 * s + bob, 2, 3);
        }
      }

      // 名字
      drawText(ctx, def.name.split('·')[0], sp.x, sp.y - 22 * s + bob, {
        align: 'center', font: '10px "PingFang SC",sans-serif', color: '#f5e6c8', shadow: true
      });

      // 任务图标
      if (this.questIcon) {
        const iconY = sp.y - 32 * s + bob - Math.sin(time * 3) * 2;
        ctx.font = 'bold 14px sans-serif';
        ctx.textAlign = 'center';
        if (this.questIcon === '!') {
          ctx.fillStyle = '#f1c40f';
          ctx.fillText('!', sp.x, iconY);
        } else if (this.questIcon === '?') {
          ctx.fillStyle = '#3498db';
          ctx.fillText('?', sp.x, iconY);
        } else {
          ctx.fillStyle = '#aaa';
          ctx.fillText('…', sp.x, iconY);
        }
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
