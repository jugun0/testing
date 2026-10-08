/* ─────────────────────────────────────────────────────────────
 * 디자인 템플릿
 *
 * 새 디자인 추가 방법 (README.md 참고)
 *   defineDesign({
 *     id: 'my-design',           // 영문 id (css 클래스 .d-my-design 로 꾸밉니다)
 *     name: '내 디자인',          // 화면에 보이는 이름
 *     desc: '짧은 설명',
 *     bg: '#FFFFFF',             // 선택했을 때 기본 배경색
 *     fields: [                  // 디자인 전용 입력칸 (선택)
 *       { key: 'photo',  type: 'image', label: '사진' },
 *       { key: 'label',  type: 'text',  label: '상단 문구', default: 'EXCERPT' },
 *       { key: 'accent', type: 'color', label: '포인트 색', default: '#F2BFCC' },
 *     ],
 *     render: ({ body, credit, creditPos, f, esc }) => `...html...`,
 *   });
 *
 * render 에서 쓸 수 있는 값
 *   body       본문 HTML (.x-body)  — 서체 설정이 자동 적용됩니다
 *   credit     작품명 / 작가명 HTML (.x-credit) — 비어 있으면 ''
 *   creditPos  'after'(본문 바로 아래) | 'bottom'(맨 아래)
 *   f          fields 값. image 는 있으면 true, text 는 문자열
 *   esc        글자 이스케이프 함수
 * CSS 에서 쓸 수 있는 변수
 *   var(--f-<key>)  color 필드 값 / image 필드는 url(...)
 *   var(--pad-in)   안쪽 여백,  var(--gap) 본문-출처 간격,  var(--v) 세로 정렬
 *   .card[data-shape="portrait|square|landscape|auto"] 로 비율별 반응형 처리
 * ───────────────────────────────────────────────────────────── */
window.DESIGNS = [];
function defineDesign(d) { window.DESIGNS.push(d); }

const ICON = {
  home: '<svg viewBox="0 0 24 24"><path d="M3 11l9-7 9 7v9a1 1 0 0 1-1 1h-5v-6H9v6H4a1 1 0 0 1-1-1z"/></svg>',
  user: '<svg viewBox="0 0 24 24"><circle cx="12" cy="8" r="4"/><path d="M4 21c1-4 4.5-6 8-6s7 2 8 6"/></svg>',
  camera: '<svg viewBox="0 0 24 24"><path d="M4 7h3l2-3h6l2 3h3v13H4z"/><circle cx="12" cy="13" r="4"/></svg>',
  down: '<svg viewBox="0 0 24 24"><path d="M12 3v12M7 10l5 5 5-5M4 20h16"/></svg>',
  star: '<svg viewBox="0 0 24 24"><path d="M12 3l2.8 5.8 6.2.9-4.5 4.4 1 6.2L12 17.4 6.5 20.3l1-6.2L3 9.7l6.2-.9z"/></svg>',
  mark: '<svg viewBox="0 0 24 24"><path d="M6 3h12v18l-6-4-6 4z"/></svg>',
};

/* 1. 미니멀 ─ 글만 깔끔하게 */
defineDesign({
  id: 'minimal',
  name: '미니멀',
  desc: '여백과 글만',
  bg: '#FFFFFF',
  fields: [],
  render: ({ body, credit, creditPos }) => `
    <div class="d-minimal">
      <div class="m-main">${body}${creditPos === 'after' ? credit : ''}</div>
      ${creditPos === 'bottom' ? `<div class="m-foot">${credit}</div>` : ''}
    </div>`,
});

/* 2. 프로필 ─ 왼쪽 사진, 오른쪽 글 (세로 비율에선 위 사진, 아래 글) */
defineDesign({
  id: 'profile',
  name: '프로필',
  desc: '왼쪽 사진 · 오른쪽 글',
  bg: '#FFFFFF',
  fields: [
    { key: 'photo', type: 'image', label: '사진' },
    { key: 'label', type: 'text', label: '상단 문구', default: 'EXCERPT' },
    { key: 'tag', type: 'text', label: '사진 태그', default: 'MY FAVORITE' },
    { key: 'note', type: 'text', label: '하단 문구', default: 'B&G · 2026' },
    { key: 'panel', type: 'color', label: '패널 색', default: '#F5F5F7' },
    { key: 'accent', type: 'color', label: '포인트 색', default: '#F2BFCC' },
    { key: 'line', type: 'color', label: '선 색', default: '#B9B9C3' },
  ],
  render: ({ body, credit, creditPos, f, esc }) => `
    <div class="d-profile">
      <div class="pf-top">
        <div class="pf-cell pf-icons">${ICON.home}${ICON.user}${ICON.camera}</div>
        <div class="pf-cell pf-dots"><i></i><i></i><i></i></div>
        <div class="pf-cell pf-label">${esc(f.label)}</div>
        <div class="pf-cell pf-dots"><i></i><i></i><i></i></div>
        <div class="pf-cell pf-icons">${ICON.down}${ICON.star}${ICON.mark}</div>
      </div>
      <div class="pf-main">
        <div class="pf-photo-wrap">
          <div class="pf-photo ${f.photo ? 'has' : ''}">
            ${f.photo ? '' : '<span class="pf-ph">PHOTO</span>'}
            <b class="pf-c tl"></b><b class="pf-c tr"></b><b class="pf-c bl"></b><b class="pf-c br"></b>
            <span class="pf-focus"></span>
          </div>
          <span class="pf-flag"></span>
          ${f.tag ? `<span class="pf-tag">${esc(f.tag)}</span>` : ''}
        </div>
        <div class="pf-text">
          <div class="pf-sq"><i></i><i></i><i></i></div>
          ${body}
          ${creditPos === 'after' ? credit : ''}
        </div>
      </div>
      <div class="pf-bottom">
        <div class="pf-cell pf-credit">${creditPos === 'bottom' && credit ? credit : `<span class="pf-note">${esc(f.note)}</span>`}</div>
        <div class="pf-cell pf-fill"><i></i><i></i></div>
      </div>
    </div>`,
});

/* 3. 인용 ─ 큰 따옴표 */
defineDesign({
  id: 'quote',
  name: '인용',
  desc: '큰 따옴표 포인트',
  bg: '#FBF0F3',
  fields: [
    { key: 'accent', type: 'color', label: '따옴표 색', default: '#EBA6B9' },
  ],
  render: ({ body, credit, creditPos }) => `
    <div class="d-quote">
      <div class="q-main">
        <div class="q-mark">“</div>
        ${body}
        ${creditPos === 'after' && credit ? `<div class="q-rule"></div>${credit}` : ''}
      </div>
      ${creditPos === 'bottom' && credit ? `<div class="q-foot"><div class="q-rule"></div>${credit}</div>` : ''}
    </div>`,
});

/* 4. 폴라로이드 ─ 사진 + 캡션 */
defineDesign({
  id: 'polaroid',
  name: '폴라로이드',
  desc: '사진 아래 캡션',
  bg: '#EEEEF1',
  fields: [
    { key: 'photo', type: 'image', label: '사진' },
    { key: 'paper', type: 'color', label: '종이 색', default: '#FFFFFF' },
    { key: 'tape', type: 'color', label: '테이프 색', default: '#F4C9D5' },
  ],
  render: ({ body, credit, creditPos, f }) => `
    <div class="d-polaroid">
      <div class="po-card">
        <span class="po-tape"></span>
        <div class="po-photo ${f.photo ? 'has' : ''}">${f.photo ? '' : '<span>PHOTO</span>'}</div>
        <div class="po-text"><div class="po-body">${body}${creditPos === 'after' ? credit : ''}</div>${creditPos === 'bottom' ? credit : ''}</div>
      </div>
    </div>`,
});
