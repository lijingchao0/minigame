/**
 * 对话系统 — 打字机 + 选项 + 立绘
 * 布局：文本区与按键/选项区分离，避免遮挡
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
    textSpeed: 40, // 字/秒
    full: false,
    choices: null, // [{label, onSelect}]
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
    // 最后一页：若有选项则等选择，否则关闭
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
   * 计算对话面板布局（绘制与点击共用）
   * 文本区在上，选项/下一页按键固定在下部，互不重叠
   */
  function layout(designW, designH) {
    const hasChoices = !!(state.full && state.choices && state.choices.length &&
      state.pageIdx >= state.pages.length - 1);
    const choiceN = hasChoices ? state.choices.length : 0;
    const pad = 12;
    const nameH = 36;
    const textH = 78;
    const choiceRowH = 32;
    const choiceGap = 6;
    const footerH = hasChoices
      ? choiceN * (choiceRowH + choiceGap) + 8
      : 30;
    const panelH = nameH + textH + footerH + pad;
    const slide = Math.min(1, state.anim * 4);
    const py = designH - panelH * slide;
    const px = 10;
    const pw = designW - 20;

    const textX = 78;
    const textY = py + nameH;
    const textW = pw - 90;
    const footerY = py + nameH + textH;

    const choices = [];
    if (hasChoices) {
      // 超过 2 个纵向排列；≤2 也纵向，避免与文字重叠
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
      // 点选项区外的面板仍可点，但不误触选项
      return true;
    }
    advance();
    return true;
  }

  return { state, open, close, update, advance, selectChoice, handleTap, visibleText, currentText, layout };
}

module.exports = { createDialog };
