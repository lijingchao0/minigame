/**
 * 像素 UI 图标集 — 16×16 预渲染
 */
const {
  blank, setPx, fillRect, fillEllipse, addOutline, getSprite, drawCached
} = require('../pixelsprite.js');

const I = {
  ink: 0, shadow: 1, shade: 2,
  woodDk: 3, woodMd: 4, woodLt: 5, woodHi: 6,
  moss: 11, leaf: 13,
  gold: 15, goldLt: 16, cream: 19, ivory: 20,
  red: 28, blue: 30, cyan: 32, yellow: 33, white: 34
};

const _icons = Object.create(null);

function paintIcon(name) {
  const g = blank(16, 16);
  switch (name) {
    case 'bag':
      fillRect(g, 3, 5, 10, 9, I.woodMd);
      fillRect(g, 3, 4, 10, 2, I.woodLt);
      fillRect(g, 6, 2, 4, 3, I.woodDk);
      setPx(g, 7, 8, I.gold);
      setPx(g, 8, 8, I.gold);
      break;
    case 'quest':
      fillRect(g, 4, 2, 8, 12, I.cream);
      fillRect(g, 4, 2, 8, 2, I.red);
      setPx(g, 6, 6, I.ink);
      setPx(g, 7, 6, I.ink);
      setPx(g, 8, 6, I.ink);
      setPx(g, 6, 9, I.ink);
      setPx(g, 7, 9, I.ink);
      break;
    case 'meditate':
      fillEllipse(g, 8, 10, 5, 3, I.woodMd);
      fillEllipse(g, 8, 6, 4, 4, I.cyan);
      setPx(g, 8, 4, I.white);
      setPx(g, 6, 6, I.gold);
      setPx(g, 10, 6, I.gold);
      break;
    case 'attack':
      // 剑
      fillRect(g, 7, 2, 2, 9, I.cream);
      setPx(g, 7, 1, I.white);
      setPx(g, 8, 1, I.white);
      fillRect(g, 5, 10, 6, 2, I.gold);
      fillRect(g, 7, 12, 2, 3, I.woodMd);
      break;
    case 'lingbu':
      fillEllipse(g, 8, 8, 5, 5, I.cyan);
      setPx(g, 5, 8, I.white);
      setPx(g, 8, 5, I.white);
      setPx(g, 11, 8, I.blue);
      break;
    case 'jiaqiao':
      fillEllipse(g, 8, 8, 5, 5, I.shade);
      fillEllipse(g, 8, 7, 3, 2, I.cream);
      setPx(g, 8, 9, I.gold);
      break;
    case 'tusi':
      setPx(g, 4, 4, I.cream);
      setPx(g, 5, 5, I.cream);
      setPx(g, 6, 6, I.cream);
      setPx(g, 7, 8, I.cream);
      setPx(g, 8, 10, I.cream);
      setPx(g, 10, 11, I.white);
      setPx(g, 12, 10, I.cream);
      break;
    case 'leifa':
      setPx(g, 8, 2, I.yellow);
      setPx(g, 7, 3, I.yellow);
      setPx(g, 8, 4, I.goldLt);
      setPx(g, 9, 5, I.yellow);
      setPx(g, 7, 6, I.yellow);
      setPx(g, 8, 7, I.goldLt);
      setPx(g, 6, 8, I.yellow);
      setPx(g, 8, 9, I.white);
      setPx(g, 9, 10, I.yellow);
      setPx(g, 7, 12, I.yellow);
      break;
    case 'gold':
      fillEllipse(g, 8, 8, 5, 5, I.gold);
      fillEllipse(g, 7, 6, 2, 2, I.goldLt);
      setPx(g, 8, 8, I.woodDk);
      break;
    case 'time':
      fillEllipse(g, 8, 8, 6, 6, I.woodLt);
      fillEllipse(g, 8, 8, 4, 4, I.cream);
      setPx(g, 8, 5, I.ink);
      setPx(g, 8, 6, I.ink);
      setPx(g, 8, 8, I.ink);
      setPx(g, 10, 8, I.ink);
      break;
    case 'map':
      fillRect(g, 2, 3, 12, 10, I.moss);
      fillRect(g, 4, 5, 4, 3, I.blue);
      setPx(g, 10, 8, I.gold);
      setPx(g, 11, 8, I.gold);
      break;
    case 'settings':
      fillEllipse(g, 8, 8, 5, 5, I.woodLt);
      fillEllipse(g, 8, 8, 2, 2, I.ink);
      for (const a of [[8, 2], [8, 13], [2, 8], [13, 8], [4, 4], [12, 4], [4, 12], [12, 12]]) {
        setPx(g, a[0], a[1], I.woodMd);
      }
      break;
    case 'hp':
      // 心形简化
      setPx(g, 5, 5, I.red); setPx(g, 6, 5, I.red); setPx(g, 9, 5, I.red); setPx(g, 10, 5, I.red);
      fillRect(g, 4, 6, 8, 4, I.red);
      setPx(g, 5, 10, I.red); setPx(g, 6, 11, I.red); setPx(g, 7, 12, I.red);
      setPx(g, 8, 11, I.red); setPx(g, 9, 10, I.red);
      setPx(g, 6, 7, I.white);
      break;
    case 'mp':
      fillEllipse(g, 8, 9, 4, 5, I.blue);
      setPx(g, 8, 5, I.cyan);
      setPx(g, 8, 6, I.cyan);
      setPx(g, 7, 8, I.white);
      break;
    case 'xp':
      fillEllipse(g, 8, 8, 5, 5, I.gold);
      setPx(g, 8, 5, I.goldLt);
      setPx(g, 8, 8, I.white);
      setPx(g, 8, 11, I.woodDk);
      break;
    case 'avatar':
      fillEllipse(g, 8, 10, 5, 4, I.woodMd);
      fillEllipse(g, 8, 6, 4, 4, I.woodLt);
      setPx(g, 6, 5, I.cyan);
      setPx(g, 9, 5, I.cyan);
      setPx(g, 5, 3, I.ink);
      setPx(g, 10, 3, I.ink);
      break;
    default:
      fillRect(g, 4, 4, 8, 8, I.gold);
  }
  addOutline(g, I.ink);
  return g;
}

function getIcon(name) {
  if (_icons[name]) return _icons[name];
  const grid = paintIcon(name);
  _icons[name] = getSprite('icon:' + name, grid, null, 2);
  return _icons[name];
}

function drawIcon(ctx, name, x, y, opts) {
  opts = opts || {};
  const c = getIcon(name);
  drawCached(ctx, c, x, y, {
    ax: 0.5, ay: 0.5,
    scale: opts.scale || 1,
    alpha: opts.alpha
  });
}

module.exports = { getIcon, drawIcon, paintIcon };
