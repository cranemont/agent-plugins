#!/usr/bin/env node
/**
 * 쉬운 낱말(STE 1.9) 시험. 국립국어원 「국어 기초 어휘 등급 목록」(2023, 40,000개, 1~5등급)이
 * 어려운 낱말을 가리는지 측정한다. 이 도구는 측정만 한다. 검사 스크립트의 규칙은 아니다.
 *
 * 목록은 저장소에 넣지 않는다. --build가 내려받아 데이터 폴더의 basic-vocab.tsv로 바꾼다.
 * 목록 파일은 공공누리 제1유형(출처 표시)이다.
 *
 *   node scripts/prose-check/vocab.mjs --build [목록.xlsx]   목록을 내려받거나(경로가 없을 때) 읽어서 데이터 폴더에 저장한다
 *   node scripts/prose-check/vocab.mjs                       낱말 쌍(pairs/words.tsv)과 문장 쌍(pairs/style.tsv)을 측정한다
 *   node scripts/prose-check/vocab.mjs --texts               사람 글 말뭉치와 Claude 응답에서 목록 밖 낱말의 비율도 측정한다
 *   node scripts/prose-check/vocab.mjs --grade=3             쉬운 낱말의 경계 등급 (기본 3)
 */
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { execFileSync } from 'node:child_process';
import { fileURLToPath } from 'node:url';
import { tokenize, dataDir } from '../../plugins/writing/skills/prose-check/scripts/lib/kiwi.mjs';
import { proseLines } from './features.mjs';

const HERE = path.dirname(fileURLToPath(import.meta.url));
const SOURCE = 'https://www.korean.go.kr/common/download.do?file_path=reportData&c_file_name=1d6d75b9-45cb-49d4-989f-1483c332573a.xlsx&o_file_name=basic-vocab.xlsx';
const LIST = path.join(dataDir(), 'basic-vocab.tsv');
const CACHE = path.join(dataDir(), 'baseline-cache');

const args = process.argv.slice(2);
const opt = (name, dflt) => args.find((a) => a.startsWith(`--${name}=`))?.slice(name.length + 3) ?? dflt;
const GRADE = Number(opt('grade', 3));
if (!Number.isInteger(GRADE) || GRADE < 1 || GRADE > 5) {
  console.error(`--grade는 1~5의 정수다: ${opt('grade')}`);
  process.exit(2);
}
/** 목록에 없는 낱말의 등급 */
const NONE = 6;

/** xlsx의 '전체' 시트를 [어휘, 등급, 품사, 어종] 행으로 바꾼다. xlsx는 zip이라 unzip으로 꺼낸다 */
function readXlsx(file) {
  // 공유 문자열 표(sharedStrings.xml)는 없어도 되는 부분이다. 없는 부분은 빈 글로 읽고, 셀의 인라인 문자열을 그대로 사용한다
  const entries = new Set(execFileSync('unzip', ['-Z1', file], { encoding: 'utf8', maxBuffer: 1 << 26 }).split('\n'));
  const part = (name) => (entries.has(name) ? execFileSync('unzip', ['-p', file, name], { encoding: 'utf8', maxBuffer: 1 << 30 }) : '');
  const unxml = (s) => s.replace(/&lt;/g, '<').replace(/&gt;/g, '>').replace(/&quot;/g, '"').replace(/&apos;/g, "'").replace(/&amp;/g, '&');
  const strings = [...part('xl/sharedStrings.xml').matchAll(/<si>([\s\S]*?)<\/si>/g)].map((m) => unxml([...m[1].matchAll(/<t[^>]*>([^<]*)<\/t>/g)].map((t) => t[1]).join('')));
  // 시트 이름과 파일을 workbook.xml·관계 파일로 잇는다
  const rels = Object.fromEntries([...part('xl/_rels/workbook.xml.rels').matchAll(/Id="([^"]+)"[^>]*Target="([^"]+)"/g)].map((m) => [m[1], m[2]]));
  const sheets = [...part('xl/workbook.xml').matchAll(/<sheet [^>]*name="([^"]+)"[^>]*r:id="([^"]+)"/g)].map((m) => ({ name: m[1], target: rels[m[2]] }));
  const all = sheets.find((s) => s.name.startsWith('전체'));
  if (!all) throw new Error(`'전체' 시트가 없다: ${sheets.map((s) => s.name).join(', ')}`);
  const xml = part(`xl/${all.target.replace(/^\/?xl\//, '')}`);
  const rows = [];
  for (const r of xml.matchAll(/<row[^>]*>([\s\S]*?)<\/row>/g)) {
    const cells = {};
    for (const c of r[1].matchAll(/<c r="([A-Z]+)\d+"([^>]*)>(?:<v>([^<]*)<\/v>|<is>([\s\S]*?)<\/is>)?<\/c>/g)) {
      const [, colName, attrs, v, inline] = c;
      cells[colName] = /t="s"/.test(attrs) ? strings[Number(v)] : inline ? unxml(inline.replace(/<[^>]+>/g, '')) : (v ?? '');
    }
    rows.push(cells);
  }
  // 머리 줄: 등급 · 어휘 · 표준동형어번호 · 품사 · 어종 · 원어 · 의미 · 분야
  return rows.slice(1).map((c) => [c.B, Number(String(c.A).replace(/\D/g, '')), c.D, c.E]).filter((r) => r[0] && r[1]);
}

async function build() {
  let file = args.find((a) => a.endsWith('.xlsx'));
  if (!file) {
    file = path.join(os.tmpdir(), 'basic-vocab.xlsx');
    const res = await fetch(SOURCE);
    if (!res.ok) throw new Error(`내려받기 실패: ${res.status}`);
    fs.writeFileSync(file, Buffer.from(await res.arrayBuffer()));
  }
  const rows = readXlsx(file);
  fs.mkdirSync(dataDir(), { recursive: true });
  fs.writeFileSync(LIST, ['어휘\t등급\t품사\t어종', ...rows.map((r) => r.join('\t'))].join('\n') + '\n');
  const byGrade = rows.reduce((m, r) => ({ ...m, [r[1]]: (m[r[1]] ?? 0) + 1 }), {});
  console.log(`저장했다: ${LIST} (${rows.length}행, 등급별 ${Object.entries(byGrade).map(([g, n]) => `${g}등급 ${n}`).join(' · ')})`);
}

/** 낱말 → 가장 쉬운 등급. 같은 글자의 동형어가 여럿이면 가장 낮은 등급을 사용한다 */
function readList() {
  if (!fs.existsSync(LIST)) {
    console.error(`목록이 없다: ${LIST}. node scripts/prose-check/vocab.mjs --build로 만든다`);
    process.exit(2);
  }
  const grade = new Map();
  for (const line of fs.readFileSync(LIST, 'utf8').split('\n').slice(1)) {
    const [word, g] = line.split('\t');
    if (!word) continue;
    grade.set(word, Math.min(grade.get(word) ?? NONE, Number(g)));
  }
  return grade;
}

/** 낱말이나 띄어 쓴 말의 등급. 통째로 없으면 어절마다 찾아 가장 어려운 등급을 돌려준다 */
function phraseGrade(grade, s) {
  if (grade.has(s)) return grade.get(s);
  const parts = s.split(/\s+/).filter(Boolean);
  if (parts.length < 2) return grade.get(s.replace(/하다$/, '')) ?? NONE;
  return Math.max(...parts.map((p) => grade.get(p) ?? NONE));
}

/** 내용어 형태소(일반 명사·동사·형용사·일반 부사)를 사전 표제어 꼴로 꺼낸다 */
function contentWords(tokens) {
  const out = [];
  for (const [form, tag] of tokens) {
    if (tag === 'NNG' || tag === 'MAG') out.push(form);
    else if (/^V[VA](?:-[RI])?$/.test(tag)) out.push(`${form}다`);
  }
  return out;
}

const readTsv = (file) => {
  const [head, ...rows] = fs.readFileSync(file, 'utf8').split('\n').filter(Boolean);
  const cols = head.split('\t');
  return rows.map((r) => Object.fromEntries(r.split('\t').map((v, i) => [cols[i], v])));
};
const pct = (a, b) => (b ? `${((100 * a) / b).toFixed(0)}%` : '-');
const label = (g) => (g === NONE ? '목록 밖' : `${g}등급`);

function wordPairs(grade) {
  const rows = readTsv(path.join(HERE, 'pairs', 'words.tsv'));
  const scored = rows.map((r) => ({ ...r, gb: phraseGrade(grade, r.before), ga: phraseGrade(grade, r.after) }));
  const easier = scored.filter((r) => r.ga < r.gb).length;
  const same = scored.filter((r) => r.ga === r.gb).length;
  const hard = (g) => g > GRADE;
  const flagged = scored.filter((r) => hard(r.gb)).length;
  const flaggedAfter = scored.filter((r) => hard(r.ga)).length;
  console.log(`낱말 쌍 ${rows.length}개 (pairs/words.tsv), 쉬운 낱말 경계 ${GRADE}등급`);
  console.log(`  고친 말의 등급이 더 낮음 ${easier} (${pct(easier, rows.length)}) · 같음 ${same} · 더 높음 ${rows.length - easier - same}`);
  console.log(`  ${GRADE}등급 밖으로 가리면: 고치기 전 ${flagged}/${rows.length} (${pct(flagged, rows.length)}) · 고친 뒤 ${flaggedAfter}/${rows.length} (${pct(flaggedAfter, rows.length)})`);
  for (const kind of [...new Set(rows.map((r) => r.kind))]) {
    const k = scored.filter((r) => r.kind === kind);
    console.log(`    ${kind} ${k.length}: 전 ${pct(k.filter((r) => hard(r.gb)).length, k.length)} · 후 ${pct(k.filter((r) => hard(r.ga)).length, k.length)}`);
  }
  const wrong = scored.filter((r) => r.ga >= r.gb);
  if (wrong.length) console.log(`  고친 말이 더 쉽지 않은 쌍: ${wrong.slice(0, 12).map((r) => `${r.before}(${label(r.gb)})→${r.after}(${label(r.ga)})`).join(' · ')}${wrong.length > 12 ? ' …' : ''}`);
}

/** 글 묶음에서 내용어 가운데 경계 등급 밖 낱말의 비율과 자주 나온 낱말 */
function hardShare(grade, texts) {
  const lines = texts.flatMap((t) => proseLines(t));
  const res = tokenize(lines);
  if (!res) {
    console.error('형태소 분석기가 없다. node plugins/writing/skills/prose-check/scripts/check.mjs --setup');
    process.exit(2);
  }
  let total = 0, hard = 0;
  const freq = new Map();
  for (const toks of res.tokens) for (const w of contentWords(toks)) {
    total++;
    if ((grade.get(w) ?? NONE) > GRADE) {
      hard++;
      freq.set(w, (freq.get(w) ?? 0) + 1);
    }
  }
  return { total, hard, top: [...freq].sort((a, b) => b[1] - a[1]).slice(0, 25) };
}

function stylePairs(grade) {
  const rows = readTsv(path.join(HERE, 'pairs', 'style.tsv'));
  const b = hardShare(grade, rows.map((r) => r.before));
  const a = hardShare(grade, rows.map((r) => r.after));
  console.log(`문장 쌍 ${rows.length}개 (pairs/style.tsv): 내용어 가운데 ${GRADE}등급 밖 낱말 — 고치기 전 ${pct(b.hard, b.total)} (${b.hard}/${b.total}) · 고친 뒤 ${pct(a.hard, a.total)} (${a.hard}/${a.total})`);
}

/** Claude Code 대화 기록의 한국어 응답. excess.mjs와 같은 방식으로 모은다 */
function transcripts(since) {
  const root = path.join(process.env.CLAUDE_CONFIG_DIR ?? path.join(os.homedir(), '.claude'), 'projects');
  const docs = [];
  if (!fs.existsSync(root)) return docs;
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
        if (String(d.timestamp ?? '') < since) continue;
        const text = m.content.filter((c) => c.type === 'text').map((c) => c.text).join('\n\n');
        if (text) msgs.set(m.id ?? d.uuid, (msgs.get(m.id ?? d.uuid) ? msgs.get(m.id ?? d.uuid) + '\n\n' : '') + text);
      }
      for (const t of msgs.values()) if ((t.match(/[가-힣]/g) ?? []).length >= 300) docs.push(t);
    }
  }
  return docs;
}

function texts(grade) {
  const since = opt('since', '2026-09-01');
  const sets = [['사람 글(2022 이전 기술 글)', fs.existsSync(CACHE) ? fs.readdirSync(CACHE).filter((f) => f.endsWith('.json')).flatMap((f) => JSON.parse(fs.readFileSync(path.join(CACHE, f), 'utf8')).map((d) => d.text)) : []], [`Claude 응답(${since} 이후)`, transcripts(since)]];
  for (const [name, docs] of sets) {
    if (!docs.length) { console.log(`${name}: 글이 없다`); continue; }
    const r = hardShare(grade, docs);
    console.log(`${name} ${docs.length}편: 내용어 가운데 ${GRADE}등급 밖 낱말 ${pct(r.hard, r.total)} (${r.hard}/${r.total})`);
    console.log(`  자주 나온 것: ${r.top.map(([w, n]) => `${w} ${n}`).join(' · ')}`);
  }
}

if (args.includes('--build')) {
  await build();
} else {
  const grade = readList();
  wordPairs(grade);
  stylePairs(grade);
  if (args.includes('--texts')) texts(grade);
}
