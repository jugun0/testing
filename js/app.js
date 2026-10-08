(() => {
  'use strict';

  const BASE = 1080; // 카드의 짧은 변(px). 저장 이미지는 이 크기 × 배율
  // 세로·정사각형은 너비 1080, 가로형(16:9 등)은 높이 1080
  function cardSize(ratio) {
    if (ratio === 'auto') return { w: BASE, h: null };
    const [a, b] = ratio.split(':').map(Number);
    return a > b ? { w: Math.round((BASE * a) / b), h: BASE } : { w: BASE, h: Math.round((BASE * b) / a) };
  }
  const W = BASE; // 썸네일 기준
  const STORE_KEY = 'excerpt-studio-v1';

  const RATIOS = [
    { v: '1:1', l: '1:1' }, { v: '4:5', l: '4:5' }, { v: '3:4', l: '3:4' },
    { v: '9:16', l: '9:16' }, { v: '16:9', l: '16:9' }, { v: '3:2', l: '3:2' }, { v: 'auto', l: '자동' },
  ];
  const SWATCHES = ['#26262C', '#55555E', '#8C8C96', '#C9C9D1', '#FFFFFF', '#F5F5F7', '#FBF0F3', '#F6D5DE',
    '#EFA9BC', '#E07A97', '#B4566F', '#8E9BC4', '#9DB39A', '#E9C27F'];
  const TEXT_SWATCHES = ['#26262C', '#8C8C96', '#E07A97', '#B4566F', '#EFA9BC', '#7C8DC0', '#7FA07A', '#D9A24E'];
  const HL_SWATCHES = ['#FCE1E8', '#FFF1B8', '#DDF1DB', '#DCE6FA', '#ECE3F7'];
  const BRACKETS = { none: ['', ''], kr: ['『', '』'], kr2: ['「', '」'], angle: ['〈', '〉'], dangle: ['《', '》'] };

  const sampleBody = '<div>빛은 늘 조금 늦게 도착한다.</div><div>그래서 우리는 <b>지나간 것들</b>로</div><div>오늘을 밝히며 산다.</div>';

  const defaults = () => ({
    design: 'profile',
    ratio: '4:5',
    body: sampleBody,
    title: '작품명',
    author: '작가명',
    credit: { bracket: 'none', pre: '', sep: '/', order: 'title', layout: 'inline', pos: 'bottom' },
    type: {
      body: { font: 0, weight: 400, color: '#26262C', size: 40, ls: -0.01, lh: 1.75, align: 'left' },
      title: { font: 0, weight: 600, color: '#26262C', size: 22, ls: 0.02, lh: 1.5, align: 'left' },
      author: { font: 0, weight: 400, color: '#8C8C96', size: 22, ls: 0.02, lh: 1.5, align: 'left' },
    },
    layout: { padOut: 56, padIn: 44, gap: 40, v: 'center' },
    bg: { color: '#FFFFFF', image: null, fit: 'cover', ov: 0 },
    fields: {},
    scale: 2,
  });

  /* ── 상태 ─────────────────────────────── */
  let state = load() || defaults();
  let typeTarget = 'body';
  const customFonts = []; // 업로드한 서체 (새로고침하면 사라짐)

  function load() {
    try {
      const raw = localStorage.getItem(STORE_KEY);
      if (!raw) return null;
      const s = JSON.parse(raw);
      return deepMerge(defaults(), s);
    } catch (e) { return null; }
  }
  function deepMerge(base, over) {
    for (const k in over) {
      if (over[k] && typeof over[k] === 'object' && !Array.isArray(over[k]) && base[k] && typeof base[k] === 'object') deepMerge(base[k], over[k]);
      else base[k] = over[k];
    }
    return base;
  }
  let saveTimer;
  function scheduleSave() {
    clearTimeout(saveTimer);
    saveTimer = setTimeout(() => {
      try { localStorage.setItem(STORE_KEY, JSON.stringify(state)); }
      catch (e) {
        // 용량 초과 → 이미지는 빼고 저장
        try {
          const lite = JSON.parse(JSON.stringify(state));
          lite.bg.image = null;
          for (const id in lite.fields) for (const k in lite.fields[id]) if (String(lite.fields[id][k]).startsWith('data:')) lite.fields[id][k] = null;
          localStorage.setItem(STORE_KEY, JSON.stringify(lite));
        } catch (e2) { /* 저장 불가 환경 */ }
      }
    }, 350);
  }

  /* ── 유틸 ─────────────────────────────── */
  const $ = (s, r = document) => r.querySelector(s);
  const $$ = (s, r = document) => [...r.querySelectorAll(s)];
  const esc = (s) => String(s ?? '').replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
  function el(tag, attrs = {}, ...kids) {
    const n = document.createElement(tag);
    for (const k in attrs) {
      const v = attrs[k];
      if (k === 'class') n.className = v;
      else if (k === 'html') n.innerHTML = v;
      else if (k.startsWith('on')) n.addEventListener(k.slice(2), v);
      else if (v !== false && v != null) n.setAttribute(k, v === true ? '' : v);
    }
    for (const c of kids.flat()) if (c != null) n.append(c.nodeType ? c : document.createTextNode(c));
    return n;
  }
  function toast(msg) {
    const t = $('#toast');
    t.textContent = msg; t.classList.add('show');
    clearTimeout(t._t); t._t = setTimeout(() => t.classList.remove('show'), 1800);
  }
  const allFonts = () => [...window.FONTS, ...customFonts];
  const fontOf = (i) => allFonts()[i] || window.FONTS[0];
  const getDesign = (id) => window.DESIGNS.find((d) => d.id === id) || window.DESIGNS[0];
  function designFields(d) {
    const cur = state.fields[d.id] || (state.fields[d.id] = {});
    for (const f of d.fields || []) if (!(f.key in cur)) cur[f.key] = f.default ?? (f.type === 'image' ? null : '');
    return cur;
  }

  /* ── 본문 HTML 정리 (허용 태그/스타일만) ── */
  const COLOR_RE = /^(#[0-9a-f]{3,8}|rgba?\([\d\s.,%]+\)|transparent)$/i;
  function sanitize(html) {
    const tpl = document.createElement('template');
    tpl.innerHTML = html;
    const out = document.createElement('div');
    walk(tpl.content, out);
    return out.innerHTML.replace(/^(<div><br><\/div>)+$/, '');
  }
  function walk(src, dst) {
    for (const n of src.childNodes) {
      if (n.nodeType === 3) { dst.append(n.textContent); continue; }
      if (n.nodeType !== 1) continue;
      const tag = n.tagName.toLowerCase();
      let node = null;
      if (tag === 'br') { dst.append(document.createElement('br')); continue; }
      if (tag === 'div' || tag === 'p') node = document.createElement('div');
      else if (tag === 'b' || tag === 'strong') node = document.createElement('b');
      else if (tag === 'i' || tag === 'em') node = document.createElement('i');
      else if (tag === 'u') node = document.createElement('u');
      else if (tag === 's' || tag === 'strike' || tag === 'del') node = document.createElement('s');
      if (tag === 'span' || tag === 'font' || node) {
        const st = n.style || {};
        const styles = [];
        const color = st.color || (tag === 'font' && n.getAttribute('color')) || '';
        const bgc = st.backgroundColor || '';
        if (color && COLOR_RE.test(color.trim())) styles.push(`color:${color}`);
        if (bgc && COLOR_RE.test(bgc.trim()) && bgc !== 'transparent' && !/rgba\(0,\s*0,\s*0,\s*0\)/.test(bgc)) styles.push(`background-color:${bgc}`);
        if (/^(bold|[6-9]00)$/.test(st.fontWeight || '')) styles.push('font-weight:bolder');
        if (st.fontStyle === 'italic') styles.push('font-style:italic');
        const deco = st.textDecorationLine || st.textDecoration || '';
        if (/underline/.test(deco)) styles.push('text-decoration:underline');
        if (/line-through/.test(deco)) styles.push('text-decoration:line-through');
        if (!node) node = document.createElement('span');
        if (styles.length) node.setAttribute('style', styles.join(';'));
        walk(n, node);
        if (node.tagName === 'SPAN' && !styles.length) dst.append(...node.childNodes);
        else dst.append(node);
      } else {
        walk(n, dst);
      }
    }
  }

  /* ── 카드 렌더링 ─────────────────────────── */
  function shapeOf(ratio) {
    if (ratio === 'auto') return 'auto';
    const [a, b] = ratio.split(':').map(Number);
    return b / a > 1.05 ? 'portrait' : b / a < 0.95 ? 'landscape' : 'square';
  }
  function creditHTML(s) {
    const c = s.credit;
    const br = BRACKETS[c.bracket] || BRACKETS.none;
    const t = s.title.trim() ? `<span class="x-title">${esc(br[0] + s.title.trim() + br[1])}</span>` : '';
    const a = s.author.trim() ? `<span class="x-author">${esc(s.author.trim())}</span>` : '';
    if (!t && !a) return '';
    const [first, second] = c.order === 'author' ? [a, t] : [t, a];
    const sep = first && second && c.sep ? `<span class="x-sep">${esc(c.sep)}</span>` : (first && second ? ' ' : '');
    const pre = c.pre ? `<span class="x-pre">${esc(c.pre)}</span>` : '';
    return `<div class="x-credit ${c.layout === 'stacked' ? 'stacked' : ''}">${pre}${first}${c.layout === 'stacked' ? '' : sep}${second}</div>`;
  }
  function overlayCSS(v) {
    if (!v) return 'transparent';
    return v > 0 ? `rgba(255,255,255,${v / 100})` : `rgba(0,0,0,${-v / 100})`;
  }

  /** 카드 DOM 에 상태를 그립니다 (미리보기 · 썸네일 공용) */
  function paint(card, s) {
    const d = getDesign(s.design);
    const fv = (s.fields && s.fields[d.id]) || {};
    const { w, h } = cardSize(s.ratio);
    card.className = `card design-${d.id}`;
    card.dataset.ratio = s.ratio;
    card.dataset.shape = shapeOf(s.ratio);
    card.dataset.creditPos = s.credit.pos;
    card.dataset.align = s.type.body.align;
    card.style.cssText = '';
    card.style.width = w + 'px';
    card.style.height = h ? h + 'px' : 'auto';
    const set = (k, v) => card.style.setProperty(k, v);
    for (const t of ['body', 'title', 'author']) {
      const ty = s.type[t];
      set(`--${t}-font`, `${fontOf(ty.font).family}, "Pretendard Variable", sans-serif`);
      set(`--${t}-weight`, ty.weight);
      set(`--${t}-color`, ty.color);
      set(`--${t}-size`, ty.size + 'px');
      set(`--${t}-ls`, ty.ls + 'em');
      set(`--${t}-lh`, ty.lh);
      set(`--${t}-align`, ty.align);
    }
    set('--pad-out', s.layout.padOut + 'px');
    set('--pad-in', s.layout.padIn + 'px');
    set('--gap', s.layout.gap + 'px');
    set('--v', { top: 'flex-start', center: 'center', bottom: 'flex-end' }[s.layout.v]);
    set('--bg-color', s.bg.color);
    if (s.bg.image) set('--bg-image', `url("${s.bg.image}")`);
    set('--bg-fit', s.bg.fit);
    set('--bg-ov', overlayCSS(s.bg.ov));
    const f = {};
    for (const fd of d.fields || []) {
      const v = fv[fd.key] ?? fd.default ?? '';
      if (fd.type === 'image') { f[fd.key] = !!v; if (v) set(`--f-${fd.key}`, `url("${v}")`); }
      else if (fd.type === 'color') { f[fd.key] = v; set(`--f-${fd.key}`, v); }
      else f[fd.key] = v;
    }
    const body = `<div class="x-body">${s.body || ''}</div>`;
    card.innerHTML = `<div class="card-bg"></div><div class="card-ov"></div><div class="card-inner">${d.render({
      body, credit: creditHTML(s), creditPos: s.credit.pos, f, esc, shape: card.dataset.shape,
    })}</div>`;
  }

  /* ── 미리보기 ─────────────────────────── */
  const card = $('#card');
  const stage = $('#stage');
  const stageWrap = $('#stageWrap');
  const preview = $('#preview');

  function render() {
    paint(card, state);
    fit();
    scheduleSave();
  }
  function fit() {
    const cs = getComputedStyle(preview);
    const availW = preview.clientWidth - parseFloat(cs.paddingLeft) - parseFloat(cs.paddingRight);
    const availH = preview.clientHeight - parseFloat(cs.paddingTop) - parseFloat(cs.paddingBottom);
    const cw = card.offsetWidth || W;
    const ch = card.offsetHeight || W;
    const s = Math.max(0.05, Math.min(availW / cw, availH / ch));
    stage.style.transform = `scale(${s})`;
    stageWrap.style.width = cw * s + 'px';
    stageWrap.style.height = ch * s + 'px';
    $('#previewMeta').textContent = `${cw * state.scale} × ${Math.round(ch * state.scale)}px`;
  }
  new ResizeObserver(fit).observe(preview);
  new ResizeObserver(fit).observe(card);

  $('#previewToggle').addEventListener('click', () => {
    const c = document.body.classList.toggle('compact');
    $('#previewToggle').textContent = c ? '미리보기 크게' : '미리보기 작게';
  });
  // 모바일에서 입력 중엔 미리보기를 작게
  const mq = window.matchMedia('(max-width: 919px)');
  document.addEventListener('focusin', (e) => {
    if (mq.matches && e.target.closest('.panel') && e.target.matches('input[type=text], .editor, textarea')) document.body.classList.add('typing', 'compact');
  });
  document.addEventListener('focusout', () => {
    setTimeout(() => {
      if (!document.activeElement || !document.activeElement.closest('.panel input[type=text], .panel .editor')) {
        if (document.body.classList.contains('typing')) {
          document.body.classList.remove('typing');
          if ($('#previewToggle').textContent === '미리보기 작게') document.body.classList.remove('compact');
        }
      }
    }, 50);
  });

  /* ── 탭 ─────────────────────────── */
  $$('.tab').forEach((t) => t.addEventListener('click', () => {
    $$('.tab').forEach((x) => x.setAttribute('aria-selected', x === t));
    $$('.pane').forEach((p) => p.classList.toggle('on', p.dataset.pane === t.dataset.tab));
    const tabs = $('.tabs');
    const top = tabs.getBoundingClientRect().top + window.scrollY - parseFloat(getComputedStyle(tabs).top);
    if (window.scrollY > top) window.scrollTo({ top, behavior: 'smooth' });
  }));

  /* ── 컨트롤 빌더 ─────────────────────────── */
  const syncers = [];
  const syncAll = () => syncers.forEach((fn) => fn());
  // 다시 그려지는 영역(서체 탭, 디자인 설정)은 이전 sync 함수를 버리고 새로 등록
  const buckets = {};
  syncers.push(() => Object.values(buckets).forEach((b) => b.forEach((fn) => fn())));
  function scoped(name, build) {
    const before = syncers.length;
    build();
    buckets[name] = syncers.splice(before);
  }

  function field(label, control, right) {
    return el('div', { class: 'field' }, el('div', { class: 'field-label' }, el('span', {}, label), right || null), control);
  }
  function chips(options, get, set, cls = 'chips') {
    const wrap = el('div', { class: cls });
    const btns = options.map((o) => el('button', { class: 'chip', type: 'button', onclick: () => { set(o.v); sync(); render(); } }, o.l));
    wrap.append(...btns);
    const sync = () => btns.forEach((b, i) => b.classList.toggle('on', String(options[i].v) === String(get())));
    sync(); syncers.push(sync);
    return wrap;
  }
  function slider({ min, max, step, get, set, fmt }) {
    const range = el('input', { type: 'range', min, max, step });
    const num = el('input', { type: 'number', min, max, step, inputmode: 'decimal' });
    const paintP = () => range.style.setProperty('--p', ((range.value - min) / (max - min)) * 100 + '%');
    range.addEventListener('input', () => { set(+range.value); num.value = fmt ? fmt(+range.value) : range.value; paintP(); render(); });
    num.addEventListener('change', () => {
      let v = parseFloat(num.value); if (isNaN(v)) v = get();
      set(v); sync(); render();
    });
    const sync = () => { range.value = get(); num.value = fmt ? fmt(get()) : get(); paintP(); };
    sync(); syncers.push(sync);
    return el('div', { class: 'slider' }, range, el('div', { class: 'num' }, num));
  }
  function colorPicker(get, set, swatches = SWATCHES) {
    const wrap = el('div', { class: 'colors' });
    const sws = swatches.map((c) => el('button', { class: 'sw', type: 'button', style: `background:${c}`, 'aria-label': c, onclick: () => { set(c); sync(); render(); } }));
    const input = el('input', { type: 'color' });
    input.addEventListener('input', () => { set(input.value); sync(); render(); });
    const hex = el('input', { class: 'hex', type: 'text', maxlength: 7, spellcheck: 'false', autocapitalize: 'off' });
    hex.addEventListener('change', () => {
      let v = hex.value.trim(); if (!v.startsWith('#')) v = '#' + v;
      if (/^#([0-9a-f]{3}|[0-9a-f]{6})$/i.test(v)) { set(v); render(); }
      sync();
    });
    wrap.append(...sws, el('label', { class: 'sw-custom', title: '직접 고르기' }, input), hex);
    const sync = () => {
      const cur = String(get()).toLowerCase();
      sws.forEach((b, i) => b.classList.toggle('on', swatches[i].toLowerCase() === cur));
      if (/^#[0-9a-f]{6}$/i.test(cur)) input.value = cur;
      if (document.activeElement !== hex) hex.value = cur.toUpperCase();
    };
    sync(); syncers.push(sync);
    return wrap;
  }
  function textInput(get, set, placeholder = '') {
    const i = el('input', { class: 'text-input', type: 'text', placeholder });
    i.addEventListener('input', () => { set(i.value); render(); });
    const sync = () => { if (document.activeElement !== i) i.value = get(); };
    sync(); syncers.push(sync);
    return i;
  }
  function imagePicker(get, set, label = '사진 선택') {
    const thumb = el('div', { class: 'upload-thumb', html: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"><rect x="3" y="4" width="18" height="16" rx="3"/><circle cx="9" cy="10" r="2"/><path d="M21 16l-5-5-9 9"/></svg>' });
    const file = el('input', { type: 'file', accept: 'image/*' });
    file.addEventListener('change', async () => {
      const f = file.files[0]; if (!f) return;
      try { set(await readImage(f)); sync(); render(); } catch (e) { toast('이미지를 불러오지 못했어요'); }
      file.value = '';
    });
    const del = el('button', { class: 'btn-sm', type: 'button', onclick: () => { set(null); sync(); render(); } }, '삭제');
    const sync = () => {
      const v = get();
      thumb.style.backgroundImage = v ? `url("${v}")` : '';
      thumb.classList.toggle('has', !!v);
      del.hidden = !v;
    };
    sync(); syncers.push(sync);
    return el('div', { class: 'upload' }, thumb, el('div', { class: 'upload-actions' }, el('label', { class: 'btn-sm pink' }, label, file), del));
  }
  async function readImage(file, max = 2000) {
    const url = URL.createObjectURL(file);
    try {
      const img = await new Promise((res, rej) => { const i = new Image(); i.onload = () => res(i); i.onerror = rej; i.src = url; });
      const k = Math.min(1, max / Math.max(img.naturalWidth, img.naturalHeight));
      const c = document.createElement('canvas');
      c.width = Math.round(img.naturalWidth * k); c.height = Math.round(img.naturalHeight * k);
      c.getContext('2d').drawImage(img, 0, 0, c.width, c.height);
      return c.toDataURL(file.type === 'image/png' ? 'image/png' : 'image/jpeg', 0.9);
    } finally { URL.revokeObjectURL(url); }
  }

  /* ── 디자인 탭 ─────────────────────────── */
  const sampleState = () => {
    const s = defaults();
    s.ratio = '4:5';
    s.body = '<div>빛은 늘 조금 늦게 도착한다.</div><div>그래서 우리는 지나간 것들로</div><div>오늘을 밝히며 산다.</div>';
    s.type.body.size = 44;
    return s;
  };
  function buildDesignGrid() {
    const grid = $('#designGrid');
    grid.innerHTML = '';
    for (const d of window.DESIGNS) {
      const thumb = el('div', { class: 'dthumb' });
      const mini = el('div', { class: 'card' });
      const s = sampleState(); s.design = d.id; s.bg.color = d.bg || '#fff';
      thumb.append(mini);
      paint(mini, s);
      const btn = el('button', { class: 'dcard', type: 'button', onclick: () => selectDesign(d.id) },
        thumb,
        el('div', { class: 'dname' }, d.name, el('span', { class: 'dcheck', html: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="3.2" stroke-linecap="round" stroke-linejoin="round"><path d="M5 12l5 5 9-10"/></svg>' })),
        el('div', { class: 'ddesc' }, d.desc || ''));
      btn.dataset.id = d.id;
      grid.append(btn);
      requestAnimationFrame(() => { mini.style.transform = `scale(${thumb.clientWidth / W})`; });
    }
    new ResizeObserver(() => $$('.dthumb', grid).forEach((t) => { t.firstChild.style.transform = `scale(${t.clientWidth / W})`; })).observe(grid);
    syncDesignGrid();
  }
  function syncDesignGrid() { $$('.dcard').forEach((b) => b.classList.toggle('on', b.dataset.id === state.design)); }
  function selectDesign(id) {
    if (state.design === id) return;
    state.design = id;
    const d = getDesign(id);
    if (d.bg && !state.bg.image) state.bg.color = d.bg;
    syncDesignGrid();
    buildDesignFields();
    syncAll();
    render();
  }
  const buildDesignFields = () => scoped('design', buildDesignFieldsInner);
  function buildDesignFieldsInner() {
    const box = $('#designFields');
    box.innerHTML = '';
    const d = getDesign(state.design);
    const vals = designFields(d);
    if (!d.fields || !d.fields.length) return;
    box.append(el('div', { class: 'group-head' }, `${d.name} 설정`));
    for (const fd of d.fields) {
      const get = () => vals[fd.key];
      const set = (v) => { vals[fd.key] = v; };
      let ctl;
      if (fd.type === 'image') ctl = imagePicker(get, set);
      else if (fd.type === 'color') ctl = colorPicker(get, set);
      else ctl = textInput(get, set, fd.default || '');
      box.append(field(fd.label, ctl));
    }
  }

  /* ── 글 탭: 리치 텍스트 에디터 ─────────────────── */
  const editor = $('#editor');
  let savedRange = null;
  try { document.execCommand('defaultParagraphSeparator', false, 'div'); } catch (e) { /* ignore */ }

  function saveSel() {
    const sel = window.getSelection();
    if (sel.rangeCount && editor.contains(sel.anchorNode)) savedRange = sel.getRangeAt(0).cloneRange();
  }
  function restoreSel() {
    editor.focus({ preventScroll: true });
    if (savedRange) { const sel = window.getSelection(); sel.removeAllRanges(); sel.addRange(savedRange); }
  }
  document.addEventListener('selectionchange', () => { saveSel(); syncFormatState(); });

  function exec(cmd, val) {
    restoreSel();
    try { document.execCommand('styleWithCSS', false, cmd === 'foreColor' || cmd === 'hiliteColor' || cmd === 'backColor'); } catch (e) { /* ignore */ }
    if (cmd === 'hiliteColor') {
      if (!document.execCommand('hiliteColor', false, val)) document.execCommand('backColor', false, val);
    } else document.execCommand(cmd, false, val);
    saveSel();
    onEdit();
  }
  function onEdit() {
    state.body = sanitize(editor.innerHTML);
    render();
  }
  editor.addEventListener('input', onEdit);
  editor.addEventListener('paste', (e) => {
    e.preventDefault();
    const text = (e.clipboardData || window.clipboardData).getData('text/plain');
    document.execCommand('insertText', false, text);
  });

  const fmtBtns = [];
  function buildToolbar() {
    const tb = $('#rtToolbar');
    const keep = (b) => { b.addEventListener('pointerdown', (e) => e.preventDefault()); b.addEventListener('mousedown', (e) => e.preventDefault()); return b; };
    const fb = (label, cmd, style, title) => {
      const b = keep(el('button', { class: 'rt-btn', type: 'button', title, style, onclick: () => exec(cmd) }, label));
      b.dataset.cmd = cmd; fmtBtns.push(b); return b;
    };
    const row1 = el('div', { class: 'rt-row' },
      fb('B', 'bold', 'font-weight:800', '굵게'),
      fb('I', 'italic', 'font-style:italic;font-family:serif', '기울임'),
      fb('U', 'underline', 'text-decoration:underline', '밑줄'),
      fb('S', 'strikeThrough', 'text-decoration:line-through', '취소선'),
      el('span', { class: 'rt-sep' }),
      keep(el('button', { class: 'rt-btn clear', type: 'button', onclick: () => exec('removeFormat') }, '서식 지우기')));
    const colorRow = el('div', { class: 'rt-row' }, el('span', { class: 'rt-label' }, '글자색'));
    for (const c of TEXT_SWATCHES) colorRow.append(keep(el('button', { class: 'sw', type: 'button', style: `background:${c}`, 'aria-label': c, onclick: () => exec('foreColor', c) })));
    const ci = el('input', { type: 'color', value: '#E07A97' });
    ci.addEventListener('pointerdown', saveSel);
    ci.addEventListener('change', () => exec('foreColor', ci.value));
    colorRow.append(el('label', { class: 'sw-custom', title: '직접 고르기' }, ci));
    const hlRow = el('div', { class: 'rt-row' }, el('span', { class: 'rt-label' }, '형광펜'));
    for (const c of HL_SWATCHES) hlRow.append(keep(el('button', { class: 'sw hl', type: 'button', style: `background:${c}`, 'aria-label': c, onclick: () => exec('hiliteColor', c) })));
    hlRow.append(keep(el('button', { class: 'sw hl none', type: 'button', 'aria-label': '형광펜 지우기', onclick: () => exec('hiliteColor', 'transparent') })));
    const hi = el('input', { type: 'color', value: '#FCE1E8' });
    hi.addEventListener('change', () => exec('hiliteColor', hi.value));
    hlRow.append(el('label', { class: 'sw-custom', title: '직접 고르기' }, hi));
    tb.append(row1, colorRow, hlRow);
  }
  function syncFormatState() {
    if (!editor.contains(document.activeElement) && document.activeElement !== editor) return;
    for (const b of fmtBtns) {
      let on = false; try { on = document.queryCommandState(b.dataset.cmd); } catch (e) { /* ignore */ }
      b.classList.toggle('on', on);
    }
  }

  function buildCredit() {
    const g = $('#creditGroup');
    g.append(el('div', { class: 'group-head' }, '출처', el('span', { class: 'hint' }, '이미지 아래에 작게 들어가요')));
    g.append(el('div', { class: 'row2' },
      field('작품명', textInput(() => state.title, (v) => { state.title = v; }, '작품명')),
      field('작가명', textInput(() => state.author, (v) => { state.author = v; }, '작가명'))));
    const c = state.credit;
    g.append(field('작품명 괄호', chips([
      { v: 'none', l: '없음' }, { v: 'kr', l: '『 』' }, { v: 'kr2', l: '「 」' }, { v: 'angle', l: '〈 〉' }, { v: 'dangle', l: '《 》' },
    ], () => c.bracket, (v) => { c.bracket = v; })));
    g.append(field('구분 기호', chips([
      { v: '/', l: '/' }, { v: '·', l: '·' }, { v: '—', l: '—' }, { v: '|', l: '|' }, { v: ',', l: ',' }, { v: '', l: '띄어쓰기' },
    ], () => c.sep, (v) => { c.sep = v; })));
    g.append(field('앞 기호', chips([
      { v: '', l: '없음' }, { v: '—', l: '—' }, { v: '|', l: '|' }, { v: '-', l: '-' }, { v: '※', l: '※' },
    ], () => c.pre, (v) => { c.pre = v; })));
    g.append(el('div', { class: 'row2' },
      field('순서', chips([{ v: 'title', l: '작품 먼저' }, { v: 'author', l: '작가 먼저' }], () => c.order, (v) => { c.order = v; }, 'seg')),
      field('배치', chips([{ v: 'inline', l: '한 줄' }, { v: 'stacked', l: '두 줄' }], () => c.layout, (v) => { c.layout = v; }, 'seg'))));
  }

  /* ── 서체 탭 ─────────────────────────── */
  const TARGETS = [{ v: 'body', l: '본문' }, { v: 'title', l: '작품명' }, { v: 'author', l: '작가명' }];
  function buildType() {
    const g = $('#typeGroup');
    const startLen = syncers.length;
    g.innerHTML = '';
    g.append(chips(TARGETS, () => typeTarget, (v) => { typeTarget = v; queueMicrotask(rebuildType); }, 'seg target'));
    const ty = state.type[typeTarget];

    // 서체 선택 (각 서체 모양으로 미리보기)
    const sel = el('select', { class: 'select' });
    allFonts().forEach((f, i) => sel.append(el('option', { value: i, style: `font-family:${f.family}` }, f.name)));
    sel.value = ty.font;
    sel.style.fontFamily = fontOf(ty.font).family;
    sel.addEventListener('change', () => {
      ty.font = +sel.value;
      const ws = fontOf(ty.font).weights;
      if (!ws.includes(ty.weight)) ty.weight = ws.reduce((a, b) => (Math.abs(b - ty.weight) < Math.abs(a - ty.weight) ? b : a));
      rebuildType(); render();
    });
    g.append(field('서체', sel));

    const ws = fontOf(ty.font).weights;
    const wnames = { 100: '100', 200: '200', 300: '300', 400: '400', 500: '500', 600: '600', 700: '700', 800: '800', 900: '900' };
    g.append(field('굵기', chips(ws.map((w) => ({ v: w, l: wnames[w] })), () => ty.weight, (v) => { ty.weight = v; })));
    g.append(field('색상', colorPicker(() => ty.color, (v) => { ty.color = v; })));
    g.append(field('크기 (px)', slider({ min: 10, max: 140, step: 1, get: () => ty.size, set: (v) => { ty.size = v; } })));
    g.append(field('자간 (em)', slider({ min: -0.15, max: 0.5, step: 0.005, get: () => ty.ls, set: (v) => { ty.ls = Math.round(v * 1000) / 1000; } })));
    const isCreditInline = typeTarget !== 'body' && state.credit.layout === 'inline';
    if (!(typeTarget === 'author' && isCreditInline)) {
      g.append(field('행간', slider({ min: 0.8, max: 3, step: 0.05, get: () => ty.lh, set: (v) => { ty.lh = Math.round(v * 100) / 100; } })));
      const aligns = [{ v: 'left', l: '왼쪽' }, { v: 'center', l: '가운데' }, { v: 'right', l: '오른쪽' }];
      if (typeTarget === 'body') aligns.push({ v: 'justify', l: '양쪽' });
      g.append(field(typeTarget === 'title' && isCreditInline ? '출처 정렬' : '정렬', chips(aligns, () => ty.align, (v) => { ty.align = v; }, 'seg')));
    }
    if (isCreditInline) {
      g.append(el('p', { class: 'note' }, '출처가 ‘한 줄’ 배치일 때는 작품명의 정렬·행간이 출처 전체에 적용돼요. ‘글’ 탭에서 ‘두 줄’로 바꾸면 각각 따로 조정할 수 있어요.'));
    }
    g.append(el('div', { class: 'field', style: 'margin-top:14px' },
      el('button', { class: 'btn-sm', type: 'button', onclick: () => {
        const ws2 = fontOf(ty.font).weights;
        for (const k of ['body', 'title', 'author']) {
          const t = state.type[k];
          t.font = ty.font;
          if (!ws2.includes(t.weight)) t.weight = ws2.reduce((a, b) => (Math.abs(b - t.weight) < Math.abs(a - t.weight) ? b : a));
        }
        toast('모든 글자에 같은 서체를 적용했어요'); render();
      } }, '이 서체를 전체에 적용')));
  }
  const rebuildType = () => scoped('type', buildType);

  function buildFontUpload() {
    const g = $('#fontUploadGroup');
    const file = el('input', { type: 'file', accept: '.ttf,.otf,.woff,.woff2' });
    file.addEventListener('change', async () => {
      const f = file.files[0]; if (!f) return;
      try {
        const name = 'MyFont' + (customFonts.length + 1);
        const face = new FontFace(name, await f.arrayBuffer());
        await face.load();
        document.fonts.add(face);
        customFonts.push({ name: '★ ' + f.name.replace(/\.[^.]+$/, ''), family: `"${name}"`, weights: [400] , custom: true });
        state.type[typeTarget].font = allFonts().length - 1;
        state.type[typeTarget].weight = 400;
        rebuildType(); render();
        toast('서체를 추가했어요');
      } catch (e) { toast('서체 파일을 읽지 못했어요'); }
      file.value = '';
    });
    g.append(el('div', { class: 'group-head' }, '내 서체 추가', el('span', { class: 'hint' }, 'ttf · otf · woff')),
      el('label', { class: 'btn-sm pink' }, '서체 파일 올리기', file),
      el('p', { class: 'note' }, '올린 서체는 지금 화면에서만 쓸 수 있어요. 자주 쓰는 서체는 js/fonts.js 에 추가해 두면 편해요.'));
  }

  /* ── 레이아웃 탭 ─────────────────────────── */
  function buildLayout() {
    const g = $('#layoutGroup');
    const L = state.layout;
    g.append(el('div', { class: 'group-head' }, '크기와 여백'));
    g.append(field('이미지 비율', chips(RATIOS, () => state.ratio, (v) => { state.ratio = v; })));
    g.append(field('바깥 여백', slider({ min: 0, max: 200, step: 2, get: () => L.padOut, set: (v) => { L.padOut = v; } })));
    g.append(field('안쪽 여백', slider({ min: 0, max: 200, step: 2, get: () => L.padIn, set: (v) => { L.padIn = v; } })));
    g.append(field('본문 ↔ 출처 간격', slider({ min: 0, max: 200, step: 2, get: () => L.gap, set: (v) => { L.gap = v; } })));
    g.append(field('세로 위치', chips([{ v: 'top', l: '위' }, { v: 'center', l: '가운데' }, { v: 'bottom', l: '아래' }], () => L.v, (v) => { L.v = v; }, 'seg')));
    g.append(field('출처 위치', chips([{ v: 'after', l: '본문 바로 아래' }, { v: 'bottom', l: '맨 아래' }], () => state.credit.pos, (v) => { state.credit.pos = v; }, 'seg')));
    g.append(field('저장 화질', chips([{ v: 1, l: '보통 (1배)' }, { v: 2, l: '고화질 (2배)' }], () => state.scale, (v) => { state.scale = v; }, 'seg')));
  }

  /* ── 배경 탭 ─────────────────────────── */
  function buildBg() {
    const g = $('#bgGroup');
    const B = state.bg;
    g.append(el('div', { class: 'group-head' }, '배경'));
    g.append(field('배경색', colorPicker(() => B.color, (v) => { B.color = v; })));
    g.append(field('배경 이미지', imagePicker(() => B.image, (v) => { B.image = v; }, '이미지 선택')));
    g.append(field('이미지 맞춤', chips([{ v: 'cover', l: '꽉 채우기' }, { v: 'contain', l: '전체 보이기' }], () => B.fit, (v) => { B.fit = v; }, 'seg')));
    g.append(field('어둡게 ↔ 밝게', slider({ min: -80, max: 80, step: 1, get: () => B.ov, set: (v) => { B.ov = v; } })));
    g.append(el('p', { class: 'note' }, '사진 위에 글이 잘 안 보이면 ‘어둡게 ↔ 밝게’로 조절해 보세요.'));
  }

  /* ── 저장 ─────────────────────────── */
  let lastBlob = null;
  async function exportImage() {
    const modal = $('#exportModal');
    const box = $('#exportImgBox');
    box.innerHTML = '<div class="spinner"></div>';
    modal.hidden = false;
    lastBlob = null;
    try {
      if (document.fonts && document.fonts.ready) await document.fonts.ready;
      const cw = cardSize(state.ratio).w;
      const host = el('div', { style: 'position:fixed;left:-30000px;top:0;width:' + cw + 'px;pointer-events:none;' });
      const clone = el('div', { class: 'card' });
      host.append(clone);
      document.body.append(host);
      paint(clone, state);
      await Promise.all($$('img', clone).map((i) => (i.complete ? 0 : new Promise((r) => { i.onload = i.onerror = r; }))));
      const canvas = await html2canvas(clone, {
        scale: state.scale, backgroundColor: null, useCORS: true, logging: false,
        width: cw, height: clone.offsetHeight, windowWidth: cw,
      });
      host.remove();
      lastBlob = await new Promise((r) => canvas.toBlob(r, 'image/png'));
      const img = el('img', { src: URL.createObjectURL(lastBlob), alt: '발췌 이미지' });
      box.innerHTML = ''; box.append(img);
    } catch (e) {
      console.error(e);
      box.innerHTML = '<p class="note">이미지를 만들지 못했어요. 다시 시도해 주세요.</p>';
    }
  }
  function fileName() {
    const d = new Date(); const p = (n) => String(n).padStart(2, '0');
    return `excerpt-${d.getFullYear()}${p(d.getMonth() + 1)}${p(d.getDate())}-${p(d.getHours())}${p(d.getMinutes())}${p(d.getSeconds())}.png`;
  }
  $('#btnSave').addEventListener('click', exportImage);
  $('#btnCloseModal').addEventListener('click', () => { $('#exportModal').hidden = true; });
  $('#exportModal').addEventListener('click', (e) => { if (e.target.id === 'exportModal') e.currentTarget.hidden = true; });
  $('#btnDownload').addEventListener('click', async () => {
    if (!lastBlob) return;
    const file = new File([lastBlob], fileName(), { type: 'image/png' });
    const touch = window.matchMedia('(pointer: coarse)').matches;
    if (touch && navigator.canShare && navigator.canShare({ files: [file] })) {
      try { await navigator.share({ files: [file] }); return; } catch (e) { if (e.name === 'AbortError') return; }
    }
    const a = el('a', { href: URL.createObjectURL(lastBlob), download: file.name });
    document.body.append(a); a.click(); a.remove();
    toast('이미지를 저장했어요');
  });
  $('#btnCopy').addEventListener('click', async () => {
    if (!lastBlob) return;
    try {
      await navigator.clipboard.write([new ClipboardItem({ 'image/png': lastBlob })]);
      toast('클립보드에 복사했어요');
    } catch (e) { toast('이 브라우저에선 복사가 안 돼요'); }
  });

  $('#btnReset').addEventListener('click', () => {
    if (!confirm('모든 설정과 글을 처음 상태로 되돌릴까요?')) return;
    state = defaults();
    try { localStorage.removeItem(STORE_KEY); } catch (e) { /* ignore */ }
    location.reload();
  });

  /* ── 시작 ─────────────────────────── */
  editor.innerHTML = state.body;
  buildToolbar();
  buildCredit();
  rebuildType();
  buildFontUpload();
  buildLayout();
  buildBg();
  buildDesignGrid();
  buildDesignFields();
  render();
  if (document.fonts) document.fonts.ready.then(fit);
})();
