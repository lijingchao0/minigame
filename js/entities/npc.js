/**
 * NPC 定义与实体 — 像素点阵造型
 */
const { drawText, dist } = require('../pix.js');
const { P } = require('../gfx/palette.js');
const { animFrame } = require('../gfx/pixelsprite.js');
const { drawAntPixel } = require('../gfx/sprites/ants.js');
const { drawNpcCreature } = require('../gfx/sprites/creatures.js');

const NPC_DEFS = {
  queen: {
    id: 'queen', name: '蚁后·瑶光', role: '蚁后',
    color: P.red, accent: P.gold, light: P.redLt, dark: P.shade, size: 1.65,
    lines: ['吾乃瑶光，王国之母。', '孩子，你的灵智已开，前途不可限量。'],
    questGiver: true
  },
  king_ant: {
    id: 'king_ant', name: '蚁王·玄尘', role: '师父',
    color: P.shade, accent: P.blue, light: P.blueLt, dark: P.ink, size: 1.45,
    lines: ['老夫游历归来，专为寻一位可造之材。', '吐纳之术，当以心静为先。'],
    questGiver: true
  },
  worker_elder: {
    id: 'worker_elder', name: '工蚁长老·土伯', role: '长老',
    color: P.woodMd, accent: P.gold, light: P.woodLt, dark: P.woodDk, size: 1.28,
    lines: ['巢穴扩建离不开大家出力。', '采集、建造，都是修行的一种。'],
    questGiver: true
  },
  soldier_captain: {
    id: 'soldier_captain', name: '兵蚁队长·铁颚', role: '队长',
    color: P.ink, accent: P.red, light: P.shade, dark: P.black, size: 1.4,
    lines: ['边境不安宁，时刻准备战斗！', '有胆量就来帮我巡逻。'],
    questGiver: true
  },
  nurse_ant: {
    id: 'nurse_ant', name: '育婴蚁·暖心', role: '育婴',
    color: P.pink, accent: P.white, light: P.pinkLt, dark: P.shade, size: 1.18,
    lines: ['幼虫们饿了……能帮我采些食物吗？', '每一只幼蚁，都是王国的未来。'],
    questGiver: true
  },
  scout_ant: {
    id: 'scout_ant', name: '侦察蚁·疾风', role: '侦察',
    color: P.moss, accent: P.jadeLt, light: P.mossLt, dark: P.mossDk, size: 1.18,
    lines: ['外面的世界很大，我刚带回新情报。', '蘑菇林里似乎有灵泉的气息……'],
    questGiver: true
  },
  ladybug_merchant: {
    id: 'ladybug_merchant', name: '瓢虫商人·斑斑', role: '商人',
    color: P.red, accent: P.ink, light: P.redLt, dark: P.shade, size: 1.3,
    lines: ['嘿，要不要看看我的货？种子、工具都有！', '最近货被偷了，真倒霉……'],
    shop: true, questGiver: true
  },
  grasshopper: {
    id: 'grasshopper', name: '蚂蚱旅人·跳跳', role: '旅人',
    color: P.jadeLt, accent: P.mossDk, light: P.leaf, dark: P.moss, size: 1.35,
    lines: ['我一路跳来，听闻不少奇事。', '蜘蛛精在边境作乱，你们蚂蚁可得小心。'],
    questGiver: true
  },
  bee_messenger: {
    id: 'bee_messenger', name: '蜜蜂信使·嗡嗡', role: '信使',
    color: P.gold, accent: P.ink, light: P.goldLt, dark: P.goldDk, size: 1.25,
    lines: ['蜂巢向蚁巢致意！有信件要转交吗？', '跨区域的消息，找我就对了。'],
    questGiver: true
  },
  firefly_guide: {
    id: 'firefly_guide', name: '萤火虫·微光', role: '向导',
    color: P.cream, accent: P.gold, light: P.ivory, dark: P.goldDk, size: 1.1,
    lines: ['夜晚跟紧我的光，不会迷路哦～', '想玩点亮游戏吗？按顺序跟上就好。'],
    questGiver: true, nightOnly: false
  }
};

const ANT_NPCS = {
  queen: true, king_ant: true, worker_elder: true,
  soldier_captain: true, nurse_ant: true, scout_ant: true
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
      const frame = animFrame(this.animT, 5, 4);

      ctx.save();
      ctx.translate(sp.x, sp.y);
      ctx.imageSmoothingEnabled = false;

      if (ANT_NPCS[defId]) {
        drawAntPixel(ctx, 0, 0, {
          who: defId,
          dir: 'down',
          pose: this.escortTarget ? 'walk' : 'idle',
          frame,
          bob,
          drawScale: s > 1.4 ? 1.2 : (s > 1.2 ? 1.1 : 1)
        });
      } else {
        drawNpcCreature(ctx, defId, 0, 0, { frame, bob });
      }

      drawText(ctx, def.name.split('·')[0], 0, -26 * s + bob, {
        align: 'center', font: '10px "PingFang SC",sans-serif', color: P.cream, shadow: true
      });

      if (this.questIcon) {
        const iconY = -36 * s + bob - Math.sin(time * 3) * 2.5;
        const breath = 0.55 + Math.sin(time * 3.5) * 0.25;
        // 像素光圈
        ctx.fillStyle = this.questIcon === '!'
          ? `rgba(212,160,40,${0.25 + breath * 0.2})`
          : this.questIcon === '?'
            ? `rgba(74,144,200,${0.25 + breath * 0.2})`
            : `rgba(180,180,180,${0.15 + breath * 0.1})`;
        const rr = Math.round(8 + Math.sin(time * 3));
        ctx.fillRect(-rr, iconY - 4 - rr, rr * 2, rr * 2);
        ctx.font = 'bold 16px sans-serif';
        ctx.textAlign = 'center';
        ctx.textBaseline = 'middle';
        ctx.strokeStyle = 'rgba(20,12,4,0.7)';
        ctx.lineWidth = 3;
        ctx.strokeText(this.questIcon, 0, iconY);
        ctx.fillStyle = this.questIcon === '!' ? P.gold : this.questIcon === '?' ? P.blueLt : '#ccc';
        ctx.fillText(this.questIcon, 0, iconY);
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
