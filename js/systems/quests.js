/**
 * 任务系统 — 主线 + 支线网状关联
 */
const MAIN_QUESTS = [
  {
    id: 'm1', chapter: 1, name: '灵智初开',
    desc: '你从沉睡中醒来，发现自己竟能思考。先熟悉一下身体：四处走走，采集浆果，再和侦察蚁聊聊。',
    giver: 'scout_ant',
    steps: [
      { type: 'talk', npc: 'scout_ant', text: '和侦察蚁·疾风对话' },
      { type: 'gather', item: 'berry', amount: 3, text: '采集 3 个浆果' },
      { type: 'talk', npc: 'scout_ant', text: '把浆果拿给疾风看' }
    ],
    reward: { xp: 40, gold: 10, items: [{ id: 'hp_pill', n: 2 }], prosperity: 5 },
    unlockNext: 'm2',
    dialogAccept: [
      '喂——你怎么站着发呆？触角上的金光……你开灵智了？！',
      '太好了！快证明你还跑得动：去采三个浆果回来！'
    ],
    dialogComplete: [
      '浆果不错嘛。记住，灵智是机缘，也是责任。',
      '蚁王玄尘游历归来，就在巢穴修炼室。你该去拜师。'
    ]
  },
  {
    id: 'm2', chapter: 2, name: '拜师问道',
    desc: '进入蚁巢，找到蚁王·玄尘拜师，学习吐纳之术，突破至灵蚁。',
    giver: 'king_ant',
    require: 'm1',
    steps: [
      { type: 'talk', npc: 'king_ant', text: '拜访蚁王·玄尘' },
      { type: 'meditate', amount: 1, text: '在修炼室吐纳一次（按修炼按钮）' },
      { type: 'talk', npc: 'king_ant', text: '向玄尘汇报修炼心得' }
    ],
    reward: { xp: 80, gold: 15, items: [{ id: 'xp_pill', n: 1 }], skills: ['lingbu', 'jiaqiao'], prosperity: 8 },
    unlockNext: 'm3',
    dialogAccept: [
      '嗯……金纹在顶，灵根可塑。老夫收你为徒。',
      '先学会吐纳：静心归于丹田。去那边灵石旁试一次。'
    ],
    dialogComplete: [
      '不错，灵步与甲壳护体，你已可初窥门径。',
      '然王国将有旱象……去见蚁后，听她的国策。'
    ]
  },
  {
    id: 'm3', chapter: 3, name: '王国危机',
    desc: '旱灾将至，粮仓告急。收集粮食与露珠，协助王国度过粮荒。',
    giver: 'queen',
    require: 'm2',
    steps: [
      { type: 'talk', npc: 'queen', text: '聆听蚁后国策' },
      { type: 'gather', item: 'ant_food', amount: 4, text: '筹集 4 份蚁粮' },
      { type: 'gather', item: 'dew_drop', amount: 3, text: '采集 3 滴露珠（池塘）' },
      { type: 'deliver', npc: 'queen', items: [{ id: 'ant_food', n: 4 }, { id: 'dew_drop', n: 3 }], text: '将物资上交蚁后' }
    ],
    reward: { xp: 100, gold: 30, items: [{ id: 'spirit_herb', n: 3 }], prosperity: 25 },
    unlockNext: 'm4',
    unlockRegion: 'dew_pond',
    dialogAccept: [
      '吾之孩子，旱灾将至，粮仓见底。',
      '你已非凡蚁，去筹集蚁粮与露珠，救我子民。'
    ],
    dialogComplete: [
      '有你相助，王国暂度危机。繁荣再起！',
      '侦察蚁传来消息：蘑菇林深处有灵泉……'
    ]
  },
  {
    id: 'm4', chapter: 4, name: '洞穴深处',
    desc: '解锁并探索蘑菇森林，取得灵泉水。',
    giver: 'scout_ant',
    require: 'm3',
    steps: [
      { type: 'talk', npc: 'scout_ant', text: '听取疾风关于蘑菇林的情报' },
      { type: 'visit', region: 'mushroom_forest', text: '进入蘑菇森林' },
      { type: 'gather', item: 'spirit_water', amount: 1, text: '取得灵泉水' },
      { type: 'talk', npc: 'king_ant', text: '将灵泉告知玄尘' }
    ],
    reward: { xp: 140, gold: 40, items: [{ id: 'glow_mushroom', n: 3 }, { id: 'mp_pill', n: 2 }], prosperity: 20 },
    unlockNext: 'm5',
    unlockRegion: 'mushroom_forest',
    dialogAccept: [
      '蘑菇林常年阴暗，有暗影蝎出没。但灵泉就在那里！',
      '我已探明入口——从草原西侧进入。小心行事。'
    ],
    dialogComplete: [
      '灵泉入手，渡劫有望。但且慢——',
      '边境烽烟起，食蚁兽大军压境！速去见铁颚队长！'
    ]
  },
  {
    id: 'm5', chapter: 5, name: '兵临城下',
    desc: '天敌入侵！前往边境击退食蚁兽，守卫王国。',
    giver: 'soldier_captain',
    require: 'm4',
    steps: [
      { type: 'talk', npc: 'soldier_captain', text: '接受铁颚的守城军令' },
      { type: 'visit', region: 'borderlands', text: '前往天敌边境' },
      { type: 'kill', enemy: 'anteater', amount: 2, text: '击退 2 只食蚁兽' },
      { type: 'talk', npc: 'soldier_captain', text: '向队长复命' }
    ],
    reward: { xp: 180, gold: 60, items: [{ id: 'stone_armor', n: 1 }], prosperity: 35 },
    unlockNext: 'm6',
    unlockRegion: 'borderlands',
    dialogAccept: [
      '食蚁兽来了！兵蚁不够用——你既是灵蚁卫，就上前线！',
      '去边境击退它们，王国存亡在此一役！'
    ],
    dialogComplete: [
      '哈哈！打得漂亮！从今往后，你就是护国蚁将！',
      '蚁后与玄尘有要事找你——关乎飞升。'
    ]
  },
  {
    id: 'm6', chapter: 6, name: '渡劫飞升之路',
    desc: '收集渡劫材料，挑战心魔，准备大境界突破。',
    giver: 'king_ant',
    require: 'm5',
    steps: [
      { type: 'talk', npc: 'king_ant', text: '向玄尘请教渡劫之法' },
      { type: 'gather', item: 'tribulation_herb', amount: 1, text: '取得渡劫草' },
      { type: 'gather', item: 'spirit_water', amount: 1, text: '再取一瓶灵泉水' },
      { type: 'kill', enemy: 'heart_demon', amount: 1, text: '在修炼室引出并击败心魔' },
      { type: 'talk', npc: 'king_ant', text: '向师父复命' }
    ],
    reward: { xp: 220, gold: 80, items: [{ id: 'xp_pill', n: 3 }], prosperity: 30 },
    unlockNext: 'm7',
    dialogAccept: [
      '大境界突破必经雷劫，亦须先斩心魔。',
      '去边境寻渡劫草，取灵泉，然后在此室静心——心魔自现。'
    ],
    dialogComplete: [
      '心魔已破，材料齐备。何时渡劫，但凭你心。',
      '去见蚁后，她有最后的嘱托。'
    ]
  },
  {
    id: 'm7', chapter: 7, name: '蚁仙归乡',
    desc: '飞升在即。向蚁后复命，选择归乡守护或继续问道。',
    giver: 'queen',
    require: 'm6',
    steps: [
      { type: 'talk', npc: 'queen', text: '聆听蚁后最后嘱托' },
      { type: 'choice', text: '做出你的抉择' }
    ],
    reward: { xp: 300, gold: 100, items: [{ id: 'herb_necklace', n: 1 }], prosperity: 50 },
    unlockNext: null,
    dialogAccept: [
      '孩子，无论你飞升与否，蚁巢永远是你的家。',
      '你是留下做守界蚁仙，还是云游四方？'
    ],
    dialogComplete: [
      '好。王国因你而兴，你因王国而立。',
      '——《蚂蚁修仙》主线完。支线与修炼，仍可继续。'
    ]
  }
];

const SIDE_QUESTS = [
  {
    id: 's_nurse_1', name: '幼虫的晚餐',
    desc: '育婴蚁暖心请你帮忙采集浆果喂幼虫。',
    giver: 'nurse_ant',
    requireMain: 'm1',
    steps: [
      { type: 'talk', npc: 'nurse_ant', text: '与暖心对话' },
      { type: 'gather', item: 'berry', amount: 5, text: '采集 5 个浆果' },
      { type: 'deliver', npc: 'nurse_ant', items: [{ id: 'berry', n: 5 }], text: '交给暖心' }
    ],
    reward: { xp: 30, gold: 8, prosperity: 5 },
    dialogAccept: ['幼虫们饿得直晃……求你采五个浆果回来！'],
    dialogComplete: ['谢谢你！幼虫们吃得好香。王国繁荣+5。']
  },
  {
    id: 's_elder_1', name: '扩建粮仓',
    desc: '工蚁长老需要枯枝与灵石来加固粮仓。',
    giver: 'worker_elder',
    requireMain: 'm2',
    steps: [
      { type: 'talk', npc: 'worker_elder', text: '接受土伯的建造委托' },
      { type: 'gather', item: 'wood', amount: 3, text: '收集 3 根枯枝（打怪或采集）' },
      { type: 'gather', item: 'spirit_stone', amount: 1, text: '取得 1 块灵石碎屑' },
      { type: 'deliver', npc: 'worker_elder', items: [{ id: 'wood', n: 3 }, { id: 'spirit_stone', n: 1 }], text: '交付材料' }
    ],
    reward: { xp: 50, gold: 20, prosperity: 12 },
    dialogAccept: ['粮仓要扩建，缺枯枝和灵石。年轻人，帮把手！'],
    dialogComplete: ['好！看着粮仓立起来，老夫心里踏实。']
  },
  {
    id: 's_ladybug_1', name: '失窃的货箱',
    desc: '瓢虫商人的货被偷了。先找蚂蚱问问。',
    giver: 'ladybug_merchant',
    requireMain: 'm1',
    steps: [
      { type: 'talk', npc: 'ladybug_merchant', text: '听说斑斑丢货' },
      { type: 'talk', npc: 'grasshopper', text: '向蚂蚱·跳跳打听' },
      { type: 'kill', enemy: 'spider', amount: 2, text: '讨伐偷货的草蛛×2' },
      { type: 'gather', item: 'stolen_goods', amount: 1, text: '找回被盗货物' },
      { type: 'deliver', npc: 'ladybug_merchant', items: [{ id: 'stolen_goods', n: 1 }], text: '归还货物给斑斑' }
    ],
    reward: { xp: 60, gold: 25, items: [{ id: 'seed_pack', n: 2 }], prosperity: 8 },
    unlockSide: 's_soldier_1',
    dialogAccept: ['我的货箱不翼而飞！蚂蚱跳跳最近鬼鬼祟祟……你去问问他！'],
    dialogComplete: ['货回来了！送你两袋灵种，以后常来逛。']
  },
  {
    id: 's_grass_1', name: '旅人的见闻',
    desc: '蚂蚱跳跳愿用情报换露珠。',
    giver: 'grasshopper',
    requireMain: 'm2',
    steps: [
      { type: 'talk', npc: 'grasshopper', text: '与跳跳交谈' },
      { type: 'gather', item: 'dew_drop', amount: 2, text: '采集 2 滴露珠' },
      { type: 'deliver', npc: 'grasshopper', items: [{ id: 'dew_drop', n: 2 }], text: '把露珠给跳跳' }
    ],
    reward: { xp: 35, gold: 12, items: [{ id: 'scout_report', n: 1 }] },
    dialogAccept: ['给我两滴露珠，告诉你边境大秘密～'],
    dialogComplete: ['听好了：蜘蛛精背后是暗影蝎在使唤！拿好这份见闻录。']
  },
  {
    id: 's_soldier_1', name: '蛛巢清剿',
    desc: '由失窃案牵出：兵蚁队长下令清剿蜘蛛。',
    giver: 'soldier_captain',
    requireMain: 'm3',
    requireSide: 's_ladybug_1',
    steps: [
      { type: 'talk', npc: 'soldier_captain', text: '领取讨伐令' },
      { type: 'kill', enemy: 'spider', amount: 4, text: '击杀 4 只草蛛' },
      { type: 'talk', npc: 'soldier_captain', text: '复命' }
    ],
    reward: { xp: 70, gold: 30, prosperity: 10 },
    dialogAccept: ['瓢虫那事我听说了。蜘蛛成灾，给我清掉四只！'],
    dialogComplete: ['干得漂亮。边境还会更乱，保持警惕。']
  },
  {
    id: 's_bee_1', name: '蜂蚁通邮',
    desc: '蜜蜂信使请你把蚁后手谕送到王国入口的岗哨。',
    giver: 'bee_messenger',
    requireMain: 'm2',
    steps: [
      { type: 'talk', npc: 'bee_messenger', text: '接收嗡嗡的委托' },
      { type: 'gather', item: 'queen_letter', amount: 1, text: '取得蚁后手谕' },
      { type: 'talk', npc: 'soldier_captain', text: '将手谕交给入口队长' }
    ],
    reward: { xp: 40, gold: 15, prosperity: 6 },
    dialogAccept: ['蚁后有手谕要送岗哨——我翅膀进巢不方便，拜托你了！'],
    dialogComplete: ['信件送到！蜂巢会记住这份人情。']
  },
  {
    id: 's_firefly_1', name: '点亮微光',
    desc: '萤火虫微光邀你玩点亮解谜：按顺序点亮萤火。',
    giver: 'firefly_guide',
    requireMain: 'm3',
    steps: [
      { type: 'talk', npc: 'firefly_guide', text: '接受微光的游戏邀请' },
      { type: 'minigame', game: 'firefly_lights', text: '完成萤火点亮解谜' },
      { type: 'talk', npc: 'firefly_guide', text: '向微光炫耀成绩' }
    ],
    reward: { xp: 45, gold: 18, items: [{ id: 'mp_pill', n: 2 }] },
    dialogAccept: ['来玩呀！看我闪光的顺序，再按同样顺序点亮～'],
    dialogComplete: ['好亮！你也可以当夜晚的向导啦！']
  },
  {
    id: 's_scout_1', name: '边境探路',
    desc: '侦察蚁请你护送他到池塘边缘。',
    giver: 'scout_ant',
    requireMain: 'm3',
    steps: [
      { type: 'talk', npc: 'scout_ant', text: '答应护送疾风' },
      { type: 'escort', npc: 'scout_ant', region: 'dew_pond', text: '护送疾风抵达露珠池塘' },
      { type: 'talk', npc: 'scout_ant', text: '确认抵达' }
    ],
    reward: { xp: 55, gold: 20, prosperity: 8 },
    dialogAccept: ['我要去池塘探路，路上有毒蜂……你能护我一程吗？'],
    dialogComplete: ['安全抵达！这份情报足以让王国再进一步。']
  },
  {
    id: 's_elder_2', name: '灵种试种',
    desc: '长老想用灵种袋在王国入口试种。',
    giver: 'worker_elder',
    requireMain: 'm3',
    requireSide: 's_ladybug_1',
    steps: [
      { type: 'talk', npc: 'worker_elder', text: '听取试种计划' },
      { type: 'gather', item: 'seed_pack', amount: 1, text: '取得灵种袋' },
      { type: 'deliver', npc: 'worker_elder', items: [{ id: 'seed_pack', n: 1 }], text: '把种子交给土伯' }
    ],
    reward: { xp: 40, gold: 15, prosperity: 10 },
    dialogAccept: ['斑斑的灵种若能发芽，粮荒再无惧！帮我弄一袋来。'],
    dialogComplete: ['种下了！来年春天，这里会是一片灵田。']
  },
  {
    id: 's_queen_1', name: '母后的牵挂',
    desc: '蚁后想知道幼虫室是否安好。',
    giver: 'queen',
    requireMain: 'm2',
    steps: [
      { type: 'talk', npc: 'queen', text: '接受蚁后的叮嘱' },
      { type: 'talk', npc: 'nurse_ant', text: '去幼虫室探望暖心' },
      { type: 'talk', npc: 'queen', text: '向蚁后汇报' }
    ],
    reward: { xp: 35, gold: 10, prosperity: 5 },
    dialogAccept: ['去看看暖心和幼虫们……为母者，总是放心不下。'],
    dialogComplete: ['它们安好，便是我最大的欣慰。']
  },
  {
    id: 's_king_1', name: '吐纳精进',
    desc: '玄尘布置额外修炼功课。',
    giver: 'king_ant',
    requireMain: 'm2',
    steps: [
      { type: 'talk', npc: 'king_ant', text: '领取功课' },
      { type: 'meditate', amount: 3, text: '完成 3 次吐纳' },
      { type: 'talk', npc: 'king_ant', text: '交差' }
    ],
    reward: { xp: 60, gold: 10, items: [{ id: 'xp_pill', n: 1 }] },
    dialogAccept: ['基础不牢，地动山摇。再吐纳三次，来见我。'],
    dialogComplete: ['心静则灵聚。这颗聚气丹给你。']
  },
  {
    id: 's_soldier_2', name: '夜巡守卫',
    desc: '夜晚在王国入口附近击退毒蜂波次。',
    giver: 'soldier_captain',
    requireMain: 'm4',
    steps: [
      { type: 'talk', npc: 'soldier_captain', text: '接受夜巡任务' },
      { type: 'defend', waves: 3, enemy: 'wasp', text: '守卫战：抵御 3 波毒蜂' },
      { type: 'talk', npc: 'soldier_captain', text: '夜巡复命' }
    ],
    reward: { xp: 90, gold: 40, prosperity: 15 },
    dialogAccept: ['今晚你守入口。毒蜂会一波波来——别让它们近身！'],
    dialogComplete: ['一夜无事。你这份胆色，配得上护国之名。']
  },
  {
    id: 's_firefly_2', name: '暗夜引路',
    desc: '在蘑菇林跟随微光找到隐藏灵石。',
    giver: 'firefly_guide',
    requireMain: 'm4',
    requireSide: 's_firefly_1',
    steps: [
      { type: 'talk', npc: 'firefly_guide', text: '在蘑菇林找到微光' },
      { type: 'gather', item: 'spirit_stone', amount: 2, text: '在微光指引下采集 2 块灵石' },
      { type: 'talk', npc: 'firefly_guide', text: '道谢' }
    ],
    reward: { xp: 50, gold: 20, items: [{ id: 'spirit_stone', n: 1 }] },
    dialogAccept: ['跟着我的光走～那边还有灵石哦！'],
    dialogComplete: ['亮晶晶！分你一块，交个朋友。']
  },
  {
    id: 's_ladybug_2', name: '开张大吉',
    desc: '帮斑斑售出气氛——买任意一件商品。',
    giver: 'ladybug_merchant',
    requireSide: 's_ladybug_1',
    steps: [
      { type: 'talk', npc: 'ladybug_merchant', text: '听听斑斑的推销' },
      { type: 'shop_buy', amount: 1, text: '在商店购买任意 1 件物品' },
      { type: 'talk', npc: 'ladybug_merchant', text: '祝贺开张' }
    ],
    reward: { xp: 25, gold: 5, items: [{ id: 'hp_pill', n: 1 }] },
    dialogAccept: ['货回来就能开张啦！来买点什么吧，给你友情价～'],
    dialogComplete: ['第一单！送你回血丹，薄礼不成敬意。']
  }
];

function createQuestSystem() {
  const state = {
    active: {},      // id -> { step, flags, progress }
    completed: {},   // id -> true
    mainDone: 0,
    tracking: null,  // 当前追踪的任务 id
    // 运行时计数
    counters: {},
    // 小游戏/守卫等临时状态
    minigame: null,
    defend: null,
    escort: null,
    pendingChoice: null,
    banners: []
  };

  function allDefs() {
    return MAIN_QUESTS.concat(SIDE_QUESTS);
  }

  function getDef(id) {
    return allDefs().find((q) => q.id === id);
  }

  function isCompleted(id) { return !!state.completed[id]; }
  function isActive(id) { return !!state.active[id]; }

  function canAccept(q) {
    if (isCompleted(q.id) || isActive(q.id)) return false;
    if (q.require && !isCompleted(q.require)) return false;
    if (q.requireMain && !isCompleted(q.requireMain)) return false;
    if (q.requireSide && !isCompleted(q.requireSide)) return false;
    return true;
  }

  function accept(id, notify, game) {
    const q = getDef(id);
    if (!q || !canAccept(q)) return false;
    state.active[id] = { step: 0, progress: {}, started: Date.now() };
    if (!state.tracking) state.tracking = id;
    // 接取后若首步为 talk 且 giver 即当前，自动推进到下一步
    if (q.steps[0] && q.steps[0].type === 'talk' && q.steps[0].npc === q.giver) {
      state.active[id].step = 1;
    }
    // 蜂蚁通邮：接取后发放手谕道具
    if (id === 's_bee_1' && game && game.inventory) {
      game.inventory.add('queen_letter', 1);
    }
    // 若当前步为 gather 且背包已满足，自动推进
    if (game && game.inventory) {
      let guard = 0;
      while (guard++ < 5) {
        const step = currentStep(id);
        if (step && step.type === 'gather' && game.inventory.has(step.item, step.amount)) {
          state.active[id].step++;
          if (state.active[id].step >= q.steps.length) {
            complete(id, game, notify);
            break;
          }
        } else break;
      }
    }
    if (notify) state.banners.push({ text: '新任务：' + q.name, t: 0, life: 3 });
    return true;
  }

  function currentStep(id) {
    const a = state.active[id];
    const q = getDef(id);
    if (!a || !q) return null;
    return q.steps[a.step] || null;
  }

  function advanceStep(id, game, notify) {
    const a = state.active[id];
    const q = getDef(id);
    if (!a || !q) return;
    a.step++;
    if (a.step >= q.steps.length) {
      complete(id, game, notify);
    }
  }

  function complete(id, game, notify) {
    const q = getDef(id);
    if (!q) return;
    delete state.active[id];
    state.completed[id] = true;
    if (id.charAt(0) === 'm') state.mainDone++;

    // 奖励
    const r = q.reward || {};
    if (r.xp) game.cultivation.addXp(r.xp, game.player, game.particles);
    if (r.gold) game.inventory.state.gold += r.gold;
    if (r.items) {
      for (let i = 0; i < r.items.length; i++) {
        game.inventory.add(r.items[i].id, r.items[i].n || 1);
      }
    }
    if (r.skills) {
      for (let i = 0; i < r.skills.length; i++) game.cultivation.learnSkill(r.skills[i]);
    }
    if (r.prosperity) {
      game.kingdom.addProsperity(r.prosperity, (info) => {
        state.banners.push({ text: '王国升级：' + info.name, t: 0, life: 3.5 });
      });
    }
    game.kingdom.updateTitle(state.mainDone);

    if (q.unlockRegion) game.regions.unlock(q.unlockRegion);
    if (q.unlockNext) {
      // 不自动接，但标记可接
    }
    if (q.unlockSide) {
      // 侧线解锁仅作 requireSide 条件
    }

    // 同步区域解锁（繁荣度）
    const unlocks = game.kingdom.unlocksForRegions();
    for (let i = 0; i < unlocks.length; i++) game.regions.unlock(unlocks[i]);

    if (state.tracking === id) {
      state.tracking = Object.keys(state.active)[0] || null;
    }
    if (notify) state.banners.push({ text: '任务完成：' + q.name, t: 0, life: 3 });
  }

  /** 对话推进 talk / deliver 步骤 */
  function onTalk(npcId, game) {
    // 检查可交付
    for (const id of Object.keys(state.active)) {
      const step = currentStep(id);
      if (!step) continue;
      if (step.type === 'talk' && step.npc === npcId) {
        advanceStep(id, game, true);
        return { handled: true, mode: 'progress' };
      }
      if (step.type === 'deliver' && step.npc === npcId) {
        const items = step.items || [];
        let ok = true;
        for (let i = 0; i < items.length; i++) {
          if (!game.inventory.has(items[i].id, items[i].n)) ok = false;
        }
        if (ok) {
          for (let i = 0; i < items.length; i++) game.inventory.remove(items[i].id, items[i].n);
          advanceStep(id, game, true);
          return { handled: true, mode: 'deliver' };
        }
        return { handled: true, mode: 'need_items', items };
      }
      if (step.type === 'choice' && npcId === getDef(id).giver) {
        state.pendingChoice = id;
        return { handled: true, mode: 'choice' };
      }
      if (step.type === 'escort' && step.npc === npcId) {
        // 开始护送
        state.escort = { questId: id, npcId, region: step.region };
        return { handled: true, mode: 'escort_start' };
      }
      if (step.type === 'defend' && npcId === getDef(id).giver) {
        // 由外部启动守卫
      }
      if (step.type === 'minigame' && npcId === getDef(id).giver) {
        state.minigame = { questId: id, game: step.game, phase: 'show', seq: [], input: [], showIdx: 0, t: 0 };
        // 生成序列
        const len = 4;
        for (let i = 0; i < len; i++) state.minigame.seq.push((Math.random() * 4) | 0);
        return { handled: true, mode: 'minigame' };
      }
    }
    return { handled: false };
  }

  function onGather(itemId, amount, game) {
    // 特殊：偷货任务击杀蜘蛛后给 stolen_goods
    for (const id of Object.keys(state.active)) {
      const step = currentStep(id);
      if (!step) continue;
      if (step.type === 'gather' && step.item === itemId) {
        const a = state.active[id];
        a.progress[itemId] = (a.progress[itemId] || 0) + amount;
        // 检查背包数量是否足够（更可靠）
        if (game.inventory.has(itemId, step.amount)) {
          advanceStep(id, game, true);
        }
      }
    }
  }

  function onKill(enemyType, game) {
    // 失窃任务：击杀蜘蛛掉落 stolen_goods
    if (enemyType === 'spider' && isActive('s_ladybug_1')) {
      const step = currentStep('s_ladybug_1');
      if (step && step.type === 'gather' && step.item === 'stolen_goods') {
        if (!game.inventory.has('stolen_goods')) {
          game.inventory.add('stolen_goods', 1);
          onGather('stolen_goods', 1, game);
        }
      }
    }
    // 蜂蚁通邮：给 queen_letter
    if (isActive('s_bee_1')) {
      const step = currentStep('s_bee_1');
      if (step && step.type === 'gather' && step.item === 'queen_letter') {
        if (!game.inventory.has('queen_letter')) {
          game.inventory.add('queen_letter', 1);
          onGather('queen_letter', 1, game);
        }
      }
    }

    for (const id of Object.keys(state.active)) {
      const step = currentStep(id);
      if (!step) continue;
      if (step.type === 'kill' && step.enemy === enemyType) {
        const a = state.active[id];
        a.progress.kills = (a.progress.kills || 0) + 1;
        if (a.progress.kills >= step.amount) advanceStep(id, game, true);
      }
    }
  }

  function onVisit(regionId, game) {
    for (const id of Object.keys(state.active)) {
      const step = currentStep(id);
      if (step && step.type === 'visit' && step.region === regionId) {
        advanceStep(id, game, true);
      }
      if (step && step.type === 'escort' && state.escort && state.escort.questId === id && regionId === step.region) {
        advanceStep(id, game, true);
        state.escort = null;
      }
    }
  }

  function onMeditate(game) {
    for (const id of Object.keys(state.active)) {
      const step = currentStep(id);
      if (step && step.type === 'meditate') {
        const a = state.active[id];
        a.progress.med = (a.progress.med || 0) + 1;
        if (a.progress.med >= step.amount) advanceStep(id, game, true);
      }
    }
  }

  function onShopBuy(game) {
    for (const id of Object.keys(state.active)) {
      const step = currentStep(id);
      if (step && step.type === 'shop_buy') {
        advanceStep(id, game, true);
      }
    }
  }

  function resolveChoice(choice, game) {
    const id = state.pendingChoice;
    if (!id) return;
    state.pendingChoice = null;
    // choice: 'stay' | 'wander'
    state.banners.push({
      text: choice === 'stay' ? '你选择留守，成为守界蚁仙。' : '你选择云游，他日必归乡。',
      t: 0, life: 4
    });
    advanceStep(id, game, true);
  }

  function getQuestIcon(npcId) {
    // 可交 ?
    for (const id of Object.keys(state.active)) {
      const step = currentStep(id);
      const q = getDef(id);
      if (!step) continue;
      if ((step.type === 'talk' || step.type === 'deliver' || step.type === 'choice') && step.npc === npcId) return '?';
      if (step.type === 'deliver' && step.npc === npcId) return '?';
      if (q && q.giver === npcId && (step.type === 'minigame' || step.type === 'defend' || step.type === 'escort')) return '?';
      if (q && q.giver === npcId) return '…';
    }
    // 可接 !
    for (const q of allDefs()) {
      if (q.giver === npcId && canAccept(q)) return '!';
    }
    return null;
  }

  function trackingInfo(game) {
    if (!state.tracking || !state.active[state.tracking]) {
      const keys = Object.keys(state.active);
      if (!keys.length) return null;
      state.tracking = keys[0];
    }
    const id = state.tracking;
    const q = getDef(id);
    const step = currentStep(id);
    if (!q || !step) return null;
    return { id, name: q.name, stepText: step.text, chapter: q.chapter || null };
  }

  function updateBanners(dt) {
    for (let i = state.banners.length - 1; i >= 0; i--) {
      state.banners[i].t += dt;
      if (state.banners[i].t >= state.banners[i].life) state.banners.splice(i, 1);
    }
  }

  function serialize() {
    return {
      active: JSON.parse(JSON.stringify(state.active)),
      completed: Object.assign({}, state.completed),
      mainDone: state.mainDone,
      tracking: state.tracking
    };
  }

  function deserialize(data) {
    if (!data) return;
    state.active = data.active || {};
    state.completed = data.completed || {};
    state.mainDone = data.mainDone || 0;
    state.tracking = data.tracking || null;
  }

  // 开局自动可接 m1
  function bootstrap() {
    // m1 可被 scout 接取
  }

  return {
    state, MAIN_QUESTS, SIDE_QUESTS,
    getDef, allDefs, canAccept, accept, currentStep, advanceStep, complete,
    onTalk, onGather, onKill, onVisit, onMeditate, onShopBuy, resolveChoice,
    getQuestIcon, trackingInfo, updateBanners, serialize, deserialize, bootstrap,
    isCompleted, isActive
  };
}

module.exports = { createQuestSystem, MAIN_QUESTS, SIDE_QUESTS };
