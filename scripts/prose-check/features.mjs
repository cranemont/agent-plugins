/**
 * 글을 형태소 특징으로 바꾼다. baseline.mjs와 excess.mjs가 같은 방식으로 세야 두 빈도를 비교할 수 있다.
 *
 * 특징은 `형태/품사`다. 문장 부호·외국어·숫자는 뺀다. 축약형은 `축약:건`처럼 원래 글자로 센다.
 * Kiwi는 `건`을 `거/NNB+ᆫ/JX`로 되돌려서, 품사만 세면 축약형과 `것은`을 가리지 못한다.
 */
import { maskCode, linesOf } from '../../plugins/writing/skills/prose-check/scripts/lib/text.mjs';

const SKIP = /^(?:S[FPSEOWLHN]|W_|Z_)/;

/** 글에서 사람이 읽는 줄(본문·목록)만 꺼낸다. 코드·제목·표·인용은 뺀다 */
export function proseLines(raw) {
  return linesOf(maskCode(raw))
    .filter((l) => (l.kind === 'para' || l.kind === 'list') && /[가-힣]/.test(l.text))
    .map((l) => l.text.replace(/\*{1,3}|_{2}/g, ''));
}

/** 한 줄의 형태소 결과를 특징 목록으로 바꾼다. 이웃한 두 특징을 이은 것도 돌려준다 */
export function features(text, tokens) {
  const uni = [];
  for (const [form, tag, start, len] of tokens) {
    if (SKIP.test(tag)) continue;
    const surf = text.slice(start, start + len);
    uni.push(tag === 'NNB' && (form === '것' || form === '거') && !surf.startsWith('것') ? `축약:${surf}` : `${form}/${tag}`);
  }
  const bi = [];
  for (let i = 0; i + 1 < uni.length; i++) bi.push(`${uni[i]} ${uni[i + 1]}`);
  return { uni, bi };
}

/** 특징 빈도를 센다. docs는 특징마다 나온 문서 수다 */
export function countFeatures(docs, tokenized) {
  const uni = new Map();
  const bi = new Map();
  const docCount = new Map();
  let totalUni = 0;
  let totalBi = 0;
  docs.forEach((lines, d) => {
    const seen = new Set();
    lines.forEach((text, k) => {
      const f = features(text, tokenized[d][k]);
      totalUni += f.uni.length;
      totalBi += f.bi.length;
      for (const x of f.uni) { uni.set(x, (uni.get(x) ?? 0) + 1); seen.add(x); }
      for (const x of f.bi) { bi.set(x, (bi.get(x) ?? 0) + 1); seen.add(x); }
    });
    for (const x of seen) docCount.set(x, (docCount.get(x) ?? 0) + 1);
  });
  return { uni, bi, docCount, totalUni, totalBi };
}
