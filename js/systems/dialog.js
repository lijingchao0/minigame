/**
 * 对话系统 — 打字机 + 选项 + 立绘
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

  function handleTap(x, y, designW, designH) {
    if (!state.open) return false;
    // 选项区
    if (state.full && state.choices && state.pageIdx >= state.pages.length - 1) {
      const panelY = designH - 200;
      for (let i = 0; i < state.choices.length; i++) {
        const by = panelY + 70 + i * 36;
        if (y >= by && y <= by + 30 && x >= 40 && x <= designW - 40) {
          selectChoice(i);
          return true;
        }
      }
    }
    advance();
    return true;
  }

  return { state, open, close, update, advance, selectChoice, handleTap, visibleText, currentText };
}

module.exports = { createDialog };
