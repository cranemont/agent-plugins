#!/usr/bin/env node
/**
 * 사람 글 기준 빈도를 만든다. excess.mjs가 이 빈도와 AI 출력의 빈도를 비교한다.
 *
 * 두 표를 만든다.
 * - 핵심 표(이 폴더의 baseline.tsv): 명사(NNG·NNP)가 아닌 한 형태소만 담는다. excess.mjs 기본 실행이 읽는다. 저장소에 커밋한다
 * - 전체 표(데이터 폴더의 baseline-full.tsv): 명사와 이웃한 두 형태소까지 담는다. --nouns·--bigrams가 읽는다. 커밋하지 않는다
 * 이 폴더는 플러그인에 들어가지 않는다. 설치한 스킬에 관리용 파일이 복사되지 않게 한다.
 *
 * 2022-11-30(ChatGPT 공개) 이전에 사람이 작성한 한국어 기술 글을 내려받아 형태소 특징 빈도만 저장한다.
 * 원문은 저장소에 넣지 않는다. 내려받은 원문은 데이터 폴더의 baseline-cache에만 저장한다.
 *
 * 출처
 * - NHN Cloud Meetup 기술 블로그: 2022-11-30 이전에 게시한 한국어 글
 * - 네이버 FE 뉴스(github.com/naver/fe-news): 2020-02~2022-10 호
 * - 한국어 위키백과 기술 문서: 2022-11-01 직전 판 (--wiki를 줄 때만. 위키백과 API가 자주 429로 막아서 기본에서 뺀다)
 *
 *   node scripts/prose-check/baseline.mjs            내려받고(캐시가 있으면 캐시를 사용하고) 두 표를 저장한다
 *   node scripts/prose-check/baseline.mjs --wiki     위키백과 기술 문서도 넣는다. 지금 커밋한 핵심 표는 이 명령으로 만들었다
 *   node scripts/prose-check/baseline.mjs --refetch  캐시를 무시하고 다시 내려받는다
 */
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { tokenize, dataDir, KIWI_MODEL } from '../../plugins/writing/skills/prose-check/scripts/lib/kiwi.mjs';
import { proseLines, countFeatures } from './features.mjs';

const HERE = path.dirname(fileURLToPath(import.meta.url));
const CORE = path.join(HERE, 'baseline.tsv');
const FULL = path.join(dataDir(), 'baseline-full.tsv');
const CACHE = path.join(dataDir(), 'baseline-cache');
const CUTOFF = '2022-11-30';
const UA = 'prose-check-baseline/1.0 (https://github.com/cranemont/agent-plugins; Korean prose style research, counts only)';
const REFETCH = process.argv.includes('--refetch');
const WIKI = process.argv.includes('--wiki');

/** 위키백과 문서. 기술 글의 글말 기준으로 사용한다 */
const WIKI_TITLES = [
  '캐시', '해시 테이블', '운영 체제', '컴파일러', 'HTTP', '데이터베이스', '데이터베이스 트랜잭션', '정규 표현식',
  '가상 메모리', '스레드', '프로세스', '리눅스', '깃 (소프트웨어)', '자바스크립트', '파이썬', '객체 지향 프로그래밍',
  '함수형 프로그래밍', '재귀', '정렬 알고리즘', '퀵 정렬', '이진 검색 알고리즘', '전송 제어 프로토콜', 'IP 주소',
  '도메인 네임 시스템', '웹 브라우저', '암호화', '공개 키 암호 방식', '블록체인', '기계 학습', '인공 신경망',
  '클라우드 컴퓨팅', '가상화', 'REST', 'JSON', 'XML', 'SQL', '유닉스', '오픈 소스', '컴퓨터 프로그래밍', '알고리즘',
  '자료 구조', '연결 리스트', '스택', '큐 (자료 구조)', '이진 트리', '그래프 (자료 구조)', '커널 (컴퓨팅)', '파일 시스템',
  '컴퓨터 네트워크', '월드 와이드 웹', 'HTML', 'CSS', '자바 (프로그래밍 언어)', 'C (프로그래밍 언어)', '소프트웨어 공학',
  '버전 관리 시스템', '단위 테스트', '디버깅', '컴퓨터 보안', '방화벽 (네트워킹)', '교착 상태', '세마포어', '메모리 관리',
];

const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

/** 내려받는다. 429·5xx면 기다렸다가 다시 시도한다 */
async function get(url, { json = false, tries = 5 } = {}) {
  for (let attempt = 0; attempt < tries; attempt++) {
    const res = await fetch(url, { headers: { 'User-Agent': UA } });
    if (res.ok) return json ? res.json() : res.text();
    if (res.status === 404) return null;
    if (res.status === 429 || res.status >= 500) { await sleep(3000 * 2 ** attempt); continue; }
    throw new Error(`${res.status} ${url}`);
  }
  throw new Error(`다시 시도해도 실패: ${url}`);
}

/** 출처 하나를 내려받거나 캐시에서 읽는다. 결과는 {id, date, text} 목록이다 */
async function cached(name, fetchAll) {
  const file = path.join(CACHE, `${name}.json`);
  if (!REFETCH && fs.existsSync(file)) return JSON.parse(fs.readFileSync(file, 'utf8'));
  const docs = await fetchAll();
  fs.mkdirSync(CACHE, { recursive: true });
  fs.writeFileSync(file, JSON.stringify(docs));
  return docs;
}

async function nhn() {
  const docs = [];
  for (let id = 1; id <= 420; id++) {
    const d = await get(`https://meetup.nhncloud.com/tcblog/v1.0/posts/${id}`, { json: true }).catch(() => null);
    const bp = d?.blogPost;
    const pl = bp?.postPerLang;
    const date = (bp?.publishTime ?? '').slice(0, 10);
    if (pl?.langCd === 'KOREA' && pl.content && date && date <= CUTOFF) docs.push({ id: `nhn-${id}`, date, text: pl.content });
    await sleep(250);
  }
  return docs;
}

async function feNews() {
  const list = await get('https://api.github.com/repos/naver/fe-news/contents/issues', { json: true });
  const docs = [];
  for (const { name } of list) {
    if (name.slice(0, 7) > CUTOFF.slice(0, 7) || !name.endsWith('.md')) continue;
    const text = await get(`https://raw.githubusercontent.com/naver/fe-news/master/issues/${encodeURIComponent(name)}`);
    if (text) docs.push({ id: `fe-news-${name}`, date: name.slice(0, 7), text });
    await sleep(200);
  }
  return docs;
}

/** 위키백과 HTML에서 본문 문단과 목록만 꺼낸다 */
function wikiText(html) {
  return html
    .replace(/<(table|style|script|sup|figure|head)\b[\s\S]*?<\/\1>/gi, ' ')
    .replace(/<\/(p|li|h[1-6])>/gi, '\n\n')
    .replace(/<li\b[^>]*>/gi, '- ')
    .replace(/<[^>]+>/g, '')
    .replace(/&#?\w+;/g, ' ')
    .replace(/\[편집\]/g, '');
}

async function wikipedia() {
  const api = 'https://ko.wikipedia.org/w/api.php';
  const docs = [];
  for (const title of WIKI_TITLES) {
    try {
      await wikiPage(api, title, docs);
    } catch (e) {
      console.error(`위키백과 건너뜀: ${title} (${e.message})`);
    }
  }
  return docs;
}

async function wikiPage(api, title, docs) {
  {
    const q = new URLSearchParams({ action: 'query', prop: 'revisions', titles: title, redirects: '1', rvlimit: '1', rvdir: 'older', rvstart: '2022-11-01T00:00:00Z', rvprop: 'ids|timestamp', format: 'json', formatversion: '2' });
    const r = await get(`${api}?${q}`, { json: true, tries: 4 });
    const page = r?.query?.pages?.[0];
    const rev = page?.revisions?.[0];
    // 위키백과는 짧은 간격으로 부르면 429로 막는다. 요청 사이를 넉넉히 띄운다
    await sleep(4000);
    if (!rev) return;
    // 옛 판의 HTML은 REST 끝점으로 받는다. action=parse는 자주 429로 막혔다
    const html = await get(`https://ko.wikipedia.org/api/rest_v1/page/html/${encodeURIComponent(page.title.replace(/ /g, '_'))}/${rev.revid}`, { tries: 4 });
    await sleep(4000);
    if (html) docs.push({ id: `kowiki-${title}`, date: rev.timestamp.slice(0, 10), text: wikiText(html) });
  }
}

const sources = {
  'NHN Cloud Meetup 기술 블로그(2022-11-30 이전)': await cached('nhn', nhn),
  '네이버 FE 뉴스(2022-10 이전)': await cached('fe-news', feNews),
  ...(WIKI ? { '한국어 위키백과 기술 문서(2022-11-01 직전 판)': await cached('kowiki', wikipedia) } : {}),
};

const docs = Object.values(sources).flat().map((d) => proseLines(d.text)).filter((lines) => lines.length);
const flat = docs.flat();
const r = tokenize(flat);
if (!r) {
  console.error('형태소 분석기가 없다. 먼저 node plugins/writing/skills/prose-check/scripts/check.mjs --setup을 돌린다');
  process.exit(2);
}
let k = 0;
const tokenized = docs.map((lines) => lines.map(() => r.tokens[k++]));
const counts = countFeatures(docs, tokenized);

const title = '# prose-check 사람 글 기준 빈도. scripts/prose-check/baseline.mjs가 만든다. 형태소 특징과 빈도만 담고 원문은 담지 않는다.';
const meta = [
  `# 만든 날: ${new Date().toISOString().slice(0, 10)} · 분석기: kiwipiepy ${r.version} · 모델 ${r.model}`,
  ...Object.entries(sources).map(([name, ds]) => `# 출처: ${name} ${ds.length}편`),
  `#total_uni\t${counts.totalUni}`,
  `#total_bi\t${counts.totalBi}`,
  `#docs\t${docs.length}`,
  'feature\tcount\tdocs',
];
// 한 번만 나온 특징은 뺀다. 이은 특징은 다섯 번 이상인 것만 저장한다. 파일 크기를 줄이려는 것이다
const row = ([f, n]) => `${f}\t${n}\t${counts.docCount.get(f)}`;
const uni = [...counts.uni].sort((a, b) => b[1] - a[1]).filter(([, n]) => n >= 2).map(row);
const bi = [...counts.bi].sort((a, b) => b[1] - a[1]).filter(([, n]) => n >= 5).map(row);
const NOUN = /\/(?:NNG|NNP)$/;
const core = [
  title,
  '# 핵심 표다. 명사(NNG·NNP)가 아닌 한 형태소만 담는다. 명사와 이웃한 두 형태소는 데이터 폴더의 baseline-full.tsv(전체 표)에 있다.',
  `# 다시 만들기: node scripts/prose-check/baseline.mjs${WIKI ? ' --wiki' : ''}`,
  ...meta,
  ...uni.filter((line) => !NOUN.test(line.split('\t')[0])),
];
fs.mkdirSync(path.dirname(FULL), { recursive: true });
fs.writeFileSync(FULL, [title, ...meta, ...uni, ...bi].join('\n') + '\n');
console.log(`전체 표 ${FULL}: 문서 ${docs.length}편 · 형태소 ${counts.totalUni} · 특징 ${uni.length + bi.length}줄 (모델 ${r.model}, 기본값 ${KIWI_MODEL})`);
// 핵심 표는 커밋하는 파일이다. 날짜 줄만 다르면 다시 쓰지 않는다. 같은 말뭉치로 다시 만들 때 diff가 생기지 않게 한다
const coreText = core.join('\n') + '\n';
const undated = (t) => t.replace(/^# 만든 날: .*$/m, '');
if (fs.existsSync(CORE) && undated(fs.readFileSync(CORE, 'utf8')) === undated(coreText)) console.log(`핵심 표 ${path.relative(process.cwd(), CORE)}: 그대로다`);
else {
  fs.writeFileSync(CORE, coreText);
  console.log(`핵심 표 ${path.relative(process.cwd(), CORE)}: 특징 ${core.length - 3 - meta.length}줄`);
}
