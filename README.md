# 발췌 스튜디오

좋아하는 문장을 예쁜 이미지로 만드는 모바일용 발췌 사이트입니다. 설치할 것 없이 정적 파일만으로 동작해요.

## 기능

- **디자인**: 카드를 눌러서 바꿀 수 있어요. 미니멀, 프로필(왼쪽 사진 · 오른쪽 글), 인용, 폴라로이드가 들어 있어요.
- **글**: 본문 입력창에서 굵게, 기울임, 밑줄, 취소선, 글자색, 형광펜을 쓸 수 있어요. 작품명과 작가명은 아래에 작게 들어가고, 괄호 『』, 구분 기호, 순서, 한 줄/두 줄 배치를 고를 수 있어요.
- **서체**: 본문, 작품명, 작가명마다 서체, 굵기, 색, 크기, 자간, 행간, 정렬을 따로 조정할 수 있어요. 내 서체 파일(ttf/otf/woff)도 올릴 수 있어요.
- **레이아웃**: 비율(1:1, 4:5, 3:4, 9:16, 16:9, 3:2, 자동), 바깥/안쪽 여백, 본문과 출처 사이 간격, 세로 위치, 출처 위치, 저장 화질을 고를 수 있어요.
- **배경**: 배경색을 바꾸거나 배경 이미지를 넣을 수 있어요(꽉 채우기/전체 보이기, 어둡게/밝게).
- **저장**: PNG로 저장하거나 공유하거나 복사할 수 있어요. 세로형은 너비 1080px, 가로형은 높이 1080px이 기준이고, 고화질은 그 2배예요.
- 작업 내용은 브라우저에 자동 저장돼요.

## GitHub Pages로 공개하기

1. 이 저장소의 **Settings → Pages**로 들어가요.
2. **Source**를 `Deploy from a branch`로 두고, 브랜치는 `master`(또는 이 파일이 있는 브랜치), 폴더는 `/ (root)`로 고른 뒤 저장해요.
3. 1~2분 지나면 `https://<아이디>.github.io/<저장소이름>/`에서 열려요.

## 디자인 추가하기

디자인 하나는 **`js/designs.js`에 블록 하나**, **`css/designs.css`에 스타일**을 더하면 끝이에요.

```js
// js/designs.js 맨 아래에 추가
defineDesign({
  id: 'mine',                 // css 에서 .d-mine 로 꾸밉니다
  name: '내 디자인',
  desc: '짧은 설명',
  bg: '#FFFFFF',              // 선택하면 바뀌는 기본 배경색
  fields: [                   // 디자인 전용 입력칸 (없어도 됨)
    { key: 'photo',  type: 'image', label: '사진' },
    { key: 'accent', type: 'color', label: '포인트 색', default: '#F2BFCC' },
    { key: 'label',  type: 'text',  label: '상단 문구', default: 'EXCERPT' },
  ],
  render: ({ body, credit, creditPos, f, esc }) => `
    <div class="d-mine">
      <div class="mine-photo ${f.photo ? 'has' : ''}"></div>
      <div class="mine-text">
        <small>${esc(f.label)}</small>
        ${body}
        ${credit}
      </div>
    </div>`,
});
```

```css
/* css/designs.css */
.d-mine { flex: 1; display: flex; gap: var(--pad-in); padding: var(--pad-in); }
.mine-photo { flex: 0 0 45%; background: #eee center / cover; }
.mine-photo.has { background-image: var(--f-photo); }
.mine-text { flex: 1; display: flex; flex-direction: column; justify-content: var(--v); gap: var(--gap); }
/* 세로 비율일 땐 위아래로 */
.card[data-shape="portrait"] .d-mine { flex-direction: column; }
```

- `body`, `credit`을 넣으면 서체 탭 설정이 자동으로 적용돼요.
- color 필드는 `var(--f-키)`로, image 필드는 `var(--f-키)`(url)로 CSS에서 쓸 수 있어요.
- 비율에 따라 `.card[data-shape="portrait | square | landscape | auto"]`로 반응형을 만들 수 있어요.
- 디자인 카드 미리보기 썸네일은 자동으로 만들어져요.

## 서체 추가하기

`index.html`의 Google Fonts 주소에 서체를 더하고, `js/fonts.js`에 `{ name, family, weights }` 한 줄을 추가하면 돼요.

## 참고

- 이미지 저장에는 [html2canvas](https://html2canvas.hertzen.com/) 1.4.1(`vendor/`)을 써요. 이 라이브러리는 CSS `filter`, `object-fit`, `mix-blend-mode`를 그리지 못하니까, 디자인을 만들 때 사진은 `background-image`로 넣어 주세요.
