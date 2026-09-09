/**
 * 对话系统 — 打字机 + 选项 + 立绘
 * 横屏：居中偏下，宽度约屏宽 70%，左右留白
 */
function createDialog() {
  const state = {
    open: false,
    speaker: '',
    role: '',
    color: '#c0392b',
    pages: [],
    pageIdx: 0,
    charIdx: 0,
    textSpeed: 40,
    full: false,
    choices: null,
    choiceIdx: 0,
    onClose: null,
    portraitId: null,
    anim: 0
  };

  function open(opts) {
    state.open = true;
    state.speaker = opts.speaker || '';
    state.role = opts.role || '';
    state.color = opts.color || '#c0392b';
    state.pages = opts.pages || [''];
    state.pageIdx = 0;
    state.charIdx = 0;
    state.full = false;
    state.choices = opts.choices || null;
    state.choiceIdx = 0;
    state.onClose = opts.onClose || null;
    state.portraitId = opts.portraitId || null;
    state.anim = 0;
  }

  function close() {
    state.open = false;
    const cb = state.onClose;
    state.onClose = null;
    if (cb) cb();
  }

  function currentText() {
    return state.pages[state.pageIdx] || '';
  }

  function visibleText() {
    const t = currentText();
    return t.slice(0, Math.floor(state.charIdx));
  }

  function update(dt) {
    if (!state.open) return;
    state.anim += dt;
    if (!state.full) {
      state.charIdx += state.textSpeed * dt;
      if (state.charIdx >= currentText().length) {
        state.charIdx = currentText().length;
        state.full = true;
      }
    }
  }

  function advance() {
    if (!state.open) return;
    if (!state.full) {
      state.charIdx = currentText().length;
      state.full = true;
      return;
    }
    if (state.pageIdx < state.pages.length - 1) {
      state.pageIdx++;
      state.charIdx = 0;
      state.full = false;
      return;
    }
    if (state.choices && state.choices.length) return;
    close();
  }

  function selectChoice(idx) {
    if (!state.choices || !state.choices[idx]) return;
    const c = state.choices[idx];
    state.choices = null;
    close();
    if (c.onSelect) c.onSelect();
  }

  /**
   * 横屏对话布局：宽度 ≤70% 屏宽，居中偏下
   */
  function layout(designW, designH) {
    const hasChoices = !!(state.full && state.choices && state.choices.length &&
      state.pageIdx >= state.pages.length - 1);
    const choiceN = hasChoices ? state.choices.length : 0;
    const pad = 12;
    const nameH = 32;
    const textH = 64;
    const choiceRowH = 30;
    const choiceGap = 5;
    const footerH = hasChoices
      ? choiceN * (choiceRowH + choiceGap) + 6
      : 28;
    const panelH = nameH + textH + footerH + pad;
    const slide = Math.min(1, state.anim * 4);
    const pw = Math.min(Math.floor(designW * 0.68), 560);
    const px = Math.floor((designW - pw) / 2);
    const py = designH - 12 - panelH * slide;

    const textX = px + 78;
    const textY = py + nameH;
    const textW = pw - 100;
    const footerY = py + nameH + textH;

    const choices = [];
    if (hasChoices) {
      for (let i = 0; i < choiceN; i++) {
        choices.push({
          i,
          x: px + 16,
          y: footerY + 4 + i * (choiceRowH + choiceGap),
          w: pw - 32,
          h: choiceRowH,
          label: state.choices[i].label
        });
      }
    }

    const nextBtn = !hasChoices ? {
      x: px + pw - 76,
      y: footerY + 2,
      w: 64,
      h: 26
    } : null;

    return {
      px, py, pw, panelH, nameH, textH, textX, textY, textW,
      footerY, footerH, hasChoices, choices, nextBtn, slide
    };
  }

  function handleTap(x, y, designW, designH) {
    if (!state.open) return false;
    const L = layout(designW, designH);
    if (L.hasChoices) {
      for (let i = 0; i < L.choices.length; i++) {
        const c = L.choices[i];
        if (y >= c.y && y <= c.y + c.h && x >= c.x && x <= c.x + c.w) {
          selectChoice(c.i);
          return true;
        }
      }
      return true;
    }
    advance();
    return true;
  }

  return { state, open, close, update, advance, selectChoice, handleTap, visibleText, currentText, layout };
}

module.exports = { createDialog };
