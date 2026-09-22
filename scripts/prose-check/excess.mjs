#!/usr/bin/env node
/**
 * AI 출력에서 사람 글보다 훨씬 자주 나오는 형태소를 찾는다. check.mjs의 낱말 목록을 갱신할 후보다.
 *
 * 모델이 바뀌면 버릇도 바뀐다. 그래서 목록을 손으로만 늘리지 않고, AI 출력과 사람 글의 빈도를 비교해서 후보를 뽑는다.
 * 사람 쪽은 2022-11-30 이전 한국어 기술 글의 형태소 빈도다. baseline.mjs가 만든다.
 * 기본 실행은 이 폴더의 baseline.tsv(핵심 표: 명사가 아닌 한 형태소)만 읽는다.
 * --nouns·--bigrams는 데이터 폴더의 baseline-full.tsv(전체 표)를 읽는다. 없으면 baseline.mjs로 먼저 만든다.
 * 모든 명령은 저장소 루트에서 실행한다. 이 폴더는 플러그인에 들어가지 않는다.
 * AI 쪽은 Claude Code 대화 기록의 한국어 응답이거나, 인자로 준 파일이다.
 * 원문은 화면에 짧은 예로만 보이고 어디에도 저장하지 않는다.
 *
 * 배율 = (AI 빈도 + 0.5) / AI 전체 ÷ (사람 빈도 + 0.5) / 사람 전체. G²는 두 빈도 차이의 로그 우도비다.
 * 배율이 커도 G²가 작으면 우연일 수 있다. 기본값은 배율 3 이상, G² 15.13 이상(p < 0.0001)만 보인다.
 * 주제가 다르면 주제 명사가 위로 올라온다. 그래서 일반 명사(NNG·NNP)는 --nouns를 줄 때만 보인다.
 *
 *   node scripts/prose-check/excess.mjs                               ~/.claude/projects의 대화 기록
 *   node scripts/prose-check/excess.mjs --transcripts=<폴더> ...        다른 기록 폴더. 여러 번 줄 수 있다
 *   node scripts/prose-check/excess.mjs --model=opus-5-5 --since=2026-10-01
 *   node scripts/prose-check/excess.mjs 글.md ...                      파일을 AI 쪽 글로 사용한다
 *
 *   --top=N        위에서 N개를 보인다 (기본 40)
 *   --min=N        AI 쪽에 N번 이상 나온 것만 본다 (기본 10)
 *   --ratio=R      배율 R 이상만 본다 (기본 3)
 *   --nouns        일반 명사도 보인다 (전체 표가 필요하다)
 *   --bigrams      이웃한 두 형태소도 본다 (전체 표가 필요하다)
 *   --under        반대로 사람 글에 훨씬 많은 것을 보인다. 사람 글에도 흔한 표지를 S2로 내릴 근거다
 *   --examples     항목마다 AI 글의 짧은 예를 두 개씩 보인다
 */
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { tokenize, dataDir } from '../../plugins/writing/skills/prose-check/scripts/lib/kiwi.mjs';
import { proseLines, countFeatures, features } from './features.mjs';

const HERE = path.dirname(fileURLToPath(import.meta.url));
const args = process.argv.slice(2);
const opt = (name, dflt) => args.find((a) => a.startsWith(`--${name}=`))?.slice(name.length + 3) ?? dflt;
const TOP = Number(opt('top', 40));
const MIN = Number(opt('min', 10));
const RATIO = Number(opt('ratio', 3));
const MODEL = opt('model');
const SINCE = opt('since');
const NOUNS = args.includes('--nouns');
const BIGRAMS = args.includes('--bigrams');
const UNDER = args.includes('--under');
const EXAMPLES = args.includes('--examples');
const G2_MIN = 15.13;
/** 핵심 표는 저장소에 있고, 명사와 형태소 쌍까지 담은 전체 표는 데이터 폴더에 만든다 */
const CORE = path.join(HERE, 'baseline.tsv');
const FULL = path.join(dataDir(), 'baseline-full.tsv');
const BASELINE = NOUNS || BIGRAMS ? FULL : CORE;
const hangul = (s) => (s.match(/[가-힣]/g) ?? []).length;

/** 대화 기록에서 한국어 응답을 모은다. 한 응답이 여러 줄로 나뉘어 저장되므로 응답 id로 합친다 */
function transcriptDocs() {
  const roots = args.filter((a) => a.startsWith('--transcripts=')).map((a) => a.slice('--transcripts='.length));
  if (!roots.length) roots.push(path.join(process.env.CLAUDE_CONFIG_DIR ?? path.join(os.homedir(), '.claude'), 'projects'));
  const docs = [];
  for (const root of roots) {
    if (!fs.existsSync(root)) { console.error(`기록 폴더 없음: ${root}`); continue; }
    for (const proj of fs.readdirSync(root)) {
      const dir = path.join(root, proj);
      if (!fs.statSync(dir).isDirectory()) continue;
      for (const f of fs.readdirSync(dir).filter((x) => x.endsWith('.jsonl'))) {
        const msgs = new Map();
        for (const line of fs.readFileSync(path.join(dir, f), 'utf8').split('\n')) {
          if (!line.includes('"assistant"')) continue;
          let d;
          try { d = JSON.parse(line); } catch { continue; }
          const m = d.message;
          if (d.type !== 'assistant' || d.isSidechain || !Array.isArray(m?.content)) continue;
          if (MODEL && !String(m.model ?? '').includes(MODEL)) continue;
          if (SINCE && String(d.timestamp ?? '') < SINCE) continue;
          const text = m.content.filter((c) => c.type === 'text').map((c) => c.text).join('\n\n');
          if (!text) continue;
          const key = m.id ?? d.uuid;
          msgs.set(key, (msgs.get(key) ? msgs.get(key) + '\n\n' : '') + text);
        }
        for (const text of msgs.values()) if (hangul(text) >= 300) docs.push(text);
      }
    }
  }
  return docs;
}

function readBaseline() {
  if (!fs.existsSync(BASELINE)) {
    const why = BASELINE === FULL ? '--nouns·--bigrams는 전체 표가 필요하다. ' : '';
    console.error(`기준 빈도가 없다: ${BASELINE}. ${why}node scripts/prose-check/baseline.mjs --wiki로 만든다 (원문 캐시가 없으면 글 379편을 내려받는다)`);
    process.exit(2);
  }
  const counts = new Map();
  const meta = {};
  for (const line of fs.readFileSync(BASELINE, 'utf8').split('\n')) {
    if (!line) continue;
    if (line.startsWith('#total_uni\t')) meta.totalUni = Number(line.split('\t')[1]);
    else if (line.startsWith('#total_bi\t')) meta.totalBi = Number(line.split('\t')[1]);
    else if (line.startsWith('#docs\t')) meta.docs = Number(line.split('\t')[1]);
    else if (line.startsWith('#') || line.startsWith('feature\t')) continue;
    else { const [f, n] = line.split('\t'); counts.set(f, Number(n)); }
  }
  return { counts, ...meta };
}

// 기준 표를 먼저 읽는다. 표가 없으면 오래 걸리는 형태소 분석 전에 멈춘다
const base = readBaseline();
// 전체 표를 핵심 표와 다른 말뭉치로 만들었으면 두 표의 결과를 견줄 수 없다
if (BASELINE === FULL && fs.existsSync(CORE)) {
  const coreUni = Number(fs.readFileSync(CORE, 'utf8').match(/^#total_uni\t(\d+)/m)?.[1]);
  if (coreUni && coreUni !== base.totalUni)
    console.error(`\x1b[33m전체 표(형태소 ${base.totalUni})와 핵심 표(형태소 ${coreUni})의 말뭉치가 다르다. baseline.mjs를 다시 돌린다\x1b[0m`);
}

const files = args.filter((a) => !a.startsWith('--'));
const rawDocs = files.length ? files.map((f) => fs.readFileSync(f, 'utf8')) : transcriptDocs();
const docs = rawDocs.map(proseLines).filter((lines) => lines.length);
if (!docs.length) {
  console.error('AI 쪽 글이 없다. 조건(--model·--since)이나 경로를 확인한다');
  process.exit(2);
}
const flat = docs.flat();
const r = tokenize(flat);
if (!r) {
  console.error('형태소 분석기가 없다. 먼저 node check.mjs --setup을 돌린다');
  process.exit(2);
}
let k = 0;
const tokenized = docs.map((lines) => lines.map(() => r.tokens[k++]));
const ai = countFeatures(docs, tokenized);

/** 2×2 표의 로그 우도비 G² */
function g2(a, A, h, H) {
  const e1 = (A * (a + h)) / (A + H);
  const e2 = (H * (a + h)) / (A + H);
  return 2 * ((a ? a * Math.log(a / e1) : 0) + (h ? h * Math.log(h / e2) : 0));
}

const NOUN = /\/(?:NNG|NNP)$/;
const rows = [];
const consider = (map, A, H) => {
  for (const [f, a] of map) {
    const h = base.counts.get(f) ?? 0;
    if (!NOUNS && f.split(' ').some((x) => NOUN.test(x))) continue;
    const ratio = ((a + 0.5) / A) / ((h + 0.5) / H);
    const g = g2(a, A, h, H);
    if (g < G2_MIN) continue;
    if (UNDER ? !(h >= MIN && ratio <= 1 / RATIO) : !(a >= MIN && ratio >= RATIO && (ai.docCount.get(f) ?? 0) >= 3)) continue;
    rows.push({ f, a, h, ratio, g, A, H, docs: ai.docCount.get(f) ?? 0 });
  }
};
consider(ai.uni, ai.totalUni, base.totalUni);
if (BIGRAMS) consider(ai.bi, ai.totalBi, base.totalBi);
rows.sort((x, y) => (UNDER ? x.ratio - y.ratio : y.ratio - x.ratio));

/** 특징이 나온 줄에서 짧은 예를 찾는다 */
function examplesOf(feature, n = 2) {
  const out = [];
  for (let d = 0; d < docs.length && out.length < n; d++)
    for (let i = 0; i < docs[d].length && out.length < n; i++) {
      const text = docs[d][i];
      const toks = tokenized[d][i];
      const { uni } = features(text, toks);
      const at = uni.indexOf(feature.split(' ')[0]);
      if (at === -1) continue;
      const kept = toks.filter(([, tag]) => !/^(?:S[FPSEOWLHN]|W_|Z_)/.test(tag));
      const [, , start] = kept[at];
      out.push(`…${text.slice(Math.max(0, start - 18), start + 22).trim()}…`);
    }
  return out;
}

const per10k = (n, total) => ((10000 * n) / total).toFixed(2);
console.log(`AI 쪽: 글 ${docs.length}편 · 형태소 ${ai.totalUni} (${files.length ? '파일' : `대화 기록${MODEL ? ` · 모델 ${MODEL}` : ''}${SINCE ? ` · ${SINCE} 이후` : ''}`})`);
console.log(`사람 쪽: 글 ${base.docs}편 · 형태소 ${base.totalUni} (${BASELINE === FULL ? `전체 표 ${FULL}` : '핵심 표 scripts/prose-check/baseline.tsv'})`);
console.log(`\n${UNDER ? '사람 글에 훨씬 많은 것' : 'AI 글에 훨씬 많은 것'} — 배율 ${UNDER ? `1/${RATIO} 이하` : `${RATIO} 이상`}, G² ${G2_MIN} 이상, 상위 ${TOP}개${NOUNS ? '' : ' (일반 명사 뺌)'}`);
console.log('특징 | AI 1만당 (n) | 사람 1만당 (n) | 배율 | G² | 문서');
for (const x of rows.slice(0, TOP)) {
  console.log(`${x.f} | ${per10k(x.a, x.A)} (${x.a}) | ${per10k(x.h, x.H)} (${x.h}) | ${x.ratio >= 100 ? x.ratio.toFixed(0) : x.ratio.toFixed(1)} | ${x.g.toFixed(0)} | ${x.docs}`);
  if (EXAMPLES && !UNDER) for (const e of examplesOf(x.f)) console.log(`    ${e}`);
}
console.log('\n후보일 뿐이다. 주제 차이로 올라온 말은 버리고, 같은 습관에서 나온 말을 묶어서 check.mjs 규칙과 korean-patterns.md 표에 더한다.');
