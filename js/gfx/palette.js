/**
 * 全局统一暖色调色板 — 全部角色 / UI / 地图共用
 * 禁止散落写十六进制；一律用 P.xxx 或索引
 * 约 30 色，风格：深棕 / 木色 / 苔绿 / 土黄 / 金色 / 米白
 */

const P = {
  // 透明（索引约定）
  none: null,

  // 轮廓与暗部
  ink: '#1a1008',
  shadow: '#2a1a10',
  shade: '#3d2818',

  // 木 / 土
  woodDk: '#4a3020',
  woodMd: '#6b4428',
  woodLt: '#8b5a32',
  woodHi: '#a87848',
  soil: '#8a6a30',
  soilLt: '#b08940',
  sand: '#c2b280',

  // 苔绿 / 草
  mossDk: '#2a5a28',
  moss: '#3d7a38',
  mossLt: '#56a048',
  leaf: '#6aba52',

  // 金 / 玉 / 米白
  goldDk: '#a87820',
  gold: '#d4a028',
  goldLt: '#f0d060',
  jade: '#7a9a68',
  jadeLt: '#a8c890',
  cream: '#f5e6c8',
  ivory: '#fff6e0',

  // 角色肤色分区（蚂蚁棕）
  antDk: '#2a1810',
  antMd: '#4a3020',
  antLt: '#6a4830',
  antHi: '#8a6848',

  // 功能色（血/灵/修/危）
  hp: '#c0392b',
  hpLt: '#e74c3c',
  mp: '#2a6a98',
  mpLt: '#4a90c8',
  xp: '#2a9050',
  xpLt: '#48c070',
  danger: '#e74c3c',

  // 特殊生物点缀（仍限量）
  red: '#c0392b',
  redLt: '#e07060',
  pink: '#d080a0',
  pinkLt: '#f0b0c8',
  blue: '#3a70a8',
  blueLt: '#6aa0d0',
  purple: '#4a2870',
  purpleLt: '#7a50a0',
  cyan: '#40c0c8',
  yellow: '#e8c040',
  white: '#f8f0e0',
  black: '#0e0a06',
  water: '#3a7eae',
  waterLt: '#5a9ece',
  stone: '#6e6e6e',
  stoneLt: '#8e8e8e',
  stoneDk: '#4e4e4e'
};

/** 有序索引表：字符 '0'..'Z' 映射到颜色（供字符串点阵用） */
const INDEX = [
  P.ink,       // 0 轮廓
  P.shadow,    // 1
  P.shade,     // 2
  P.woodDk,    // 3
  P.woodMd,    // 4
  P.woodLt,    // 5
  P.woodHi,    // 6
  P.soil,      // 7
  P.soilLt,    // 8
  P.sand,      // 9
  P.mossDk,    // A
  P.moss,      // B
  P.mossLt,    // C
  P.leaf,      // D
  P.goldDk,    // E
  P.gold,      // F
  P.goldLt,    // G
  P.jade,      // H
  P.jadeLt,    // I
  P.cream,     // J
  P.ivory,     // K
  P.antDk,     // L
  P.antMd,     // M
  P.antLt,     // N
  P.antHi,     // O
  P.hp,        // P
  P.mp,        // Q
  P.xp,        // R
  P.red,       // S
  P.pink,      // T
  P.blue,      // U
  P.purple,    // V
  P.cyan,      // W
  P.yellow,    // X
  P.white,     // Y
  P.black      // Z
];

const CHAR_TO_IDX = {};
const DIGITS = '0123456789ABCDEFGHIJKLMNOPQRSTUVWXYZ';
for (let i = 0; i < DIGITS.length; i++) CHAR_TO_IDX[DIGITS[i]] = i;

/** 按角色名取颜色 */
function color(name) {
  return P[name] || P.cream;
}

/** 索引 → 颜色 */
function byIndex(i) {
  if (i < 0 || i >= INDEX.length) return null;
  return INDEX[i];
}

/** 字符 → 索引（'.' / ' ' = 透明 -1） */
function charIndex(ch) {
  if (ch === '.' || ch === ' ' || ch === undefined) return -1;
  const v = CHAR_TO_IDX[ch];
  return v == null ? -1 : v;
}

module.exports = { P, INDEX, CHAR_TO_IDX, color, byIndex, charIndex };
