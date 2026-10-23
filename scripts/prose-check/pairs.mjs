#!/usr/bin/env node
/**
 * 검증 루프. 전문가가 고친 문장 쌍으로 check.mjs를 측정하고, 저장한 기준과 비교한다.
 *
 * pairs/style.tsv의 쌍마다 고치기 전 문장(before)과 고친 뒤 문장(after)에 check.mjs를 돌린다.
 *   - 탐지: 고치기 전 문장에 expect 열의 규칙 후보가 나왔다
 *   - 고친 뒤 후보: 고친 뒤 문장에 나온 후보. 전문가가 고친 글이라 오탐일 가능성이 높다
 * expect가 `-`인 쌍은 이 스킬이 다루지 않는 범주(맞춤법·조사·차별 표현 등)다. 탐지율에 넣지 않고, 고친 뒤 후보만 센다.
 * 높임 등급(K9)과 파일 전체 후보(1.3·1.11)는 글 전체를 보는 규칙이라 세지 않는다.
 *
 *   node scripts/prose-check/pairs.mjs              측정하고 pairs/results.json과 비교한다. 나빠지면 종료 코드 1
 *   node scripts/prose-check/pairs.mjs --save       측정값을 새 기준으로 저장한다
 *   node scripts/prose-check/pairs.mjs --show       쌍마다 후보를 보인다
 *   node scripts/prose-check/pairs.mjs --human      사람 글 기준 말뭉치(데이터 폴더의 baseline-cache)의 1,000어절당 후보 수도 측정한다
 *   node scripts/prose-check/pairs.mjs --no-morph   정규식 모드만 돌린다
 *
 * 나빠짐: 전에 탐지한 쌍을 놓치거나, 고친 뒤 문장에 새 후보가 나온다. 형태소 분석이 실패해 형태소 모드를 검증하지 못해도 실패로 끝낸다.
 * 사람 글의 후보 수가 늘어난 규칙은 실패로 보지 않고 알린다. 늘어난 후보는 precision.mjs로 판정한다.
 */
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { execFileSync } from 'node:child_process';
import { fileURLToPath } from 'node:url';
import { venvPython, dataDir } from '../../plugins/writing/skills/prose-check/scripts/lib/kiwi.mjs';

const HERE = path.dirname(fileURLToPath(import.meta.url));
const CHECK = path.resolve(HERE, '../../plugins/writing/skills/prose-check/scripts/check.mjs');
const PAIRS = path.join(HERE, 'pairs', 'style.tsv');
const RESULTS = path.join(HERE, 'pairs', 'results.json');
const CACHE = path.join(dataDir(), 'baseline-cache');

const args = process.argv.slice(2);
const SAVE = args.includes('--save');
const SHOW = args.includes('--show');
const HUMAN = args.includes('--human');
/** 사람 글에서 이만큼(1,000어절당) 넘게 늘어난 규칙만 알린다 */
const HUMAN_RISE = 0.2;

/** 후보의 꼬리표에서 규칙 번호만 뽑는다: `긴 문장 · STE 6.3` → `STE 6.3` */
const codeOf = (tag) => /(STE \d+\.\d+|K\d+)/.exec(tag)?.[1] ?? tag;

function readPairs() {
  const [head, ...rows] = fs.readFileSync(PAIRS, 'utf8').split('\n').filter(Boolean);
  const col = Object.fromEntries(head.split('\t').map((h, i) => [h, i]));
  return rows.map((r) => {
    const c = r.split('\t');
    const expect = c[col.expect] === '-' ? [] : c[col.expect].split('|').map((s) => s.trim());
    return { id: c[col.id], source: c[col.source], kind: c[col.kind], expect, before: c[col.before], after: c[col.after] };
  });
}

/** 글 묶음에 check.mjs를 한 번 돌리고 [파일 절대 경로:줄] → 후보 목록을 돌려준다 */
function candidates(files, mode) {
  const argv = [CHECK, '--json', '--all', ...(mode === 'regex' ? ['--no-morph'] : []), ...files];
  let out;
  try {
    out = execFileSync('node', argv, { encoding: 'utf8', maxBuffer: 1 << 30 });
  } catch (e) {
    out = e.stdout; // 후보가 있으면 종료 코드가 1이다
  }
  const result = JSON.parse(out);
  const byLine = new Map();
  const add = (file, line, c) => {
    const key = `${path.resolve(file)}:${line}`;
    byLine.set(key, [...(byLine.get(key) ?? []), c]);
  };
  // 높임 등급(F)은 글 전체의 주 등급과 비교하는 규칙이라 뺀다
  for (const c of result.candidates) if (c.id !== 'F') add(c.file, c.line, { code: codeOf(c.tag), word: c.word });
  for (const s of result.sentences) add(s.file, s.line, { code: codeOf(s.tag), word: s.text ?? `${s.words}어절` });
  return { byLine, morph: result.morph };
}

/** 저장소 밖 임시 폴더. `.git`을 두어 현재 폴더 저장소의 허용 목록을 빌리지 않게 한다 */
function scratch() {
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'prose-pairs-'));
  fs.mkdirSync(path.join(dir, '.git'));
  return dir;
}

function measurePairs(pairs, mode) {
  const dir = scratch();
  try {
    // 쌍 하나가 한 문단이다. i번째 쌍은 2i+1번째 줄에 있다
    const write = (name, key) => {
      const file = path.join(dir, name);
      fs.writeFileSync(file, pairs.map((p) => p[key]).join('\n\n') + '\n');
      return file;
    };
    const before = write('before.md', 'before');
    const after = write('after.md', 'after');
    const { byLine, morph } = candidates([before, after], mode);
    const at = (file, i) => byLine.get(`${path.resolve(file)}:${2 * i + 1}`) ?? [];
    const rows = pairs.map((p, i) => {
      const b = at(before, i), a = at(after, i);
      const hit = p.expect.some((e) => b.some((c) => c.code === e));
      return { ...p, b, a, hit };
    });
    return { rows, morph };
  } finally {
    fs.rmSync(dir, { recursive: true, force: true });
  }
}

/** 사람 글 기준 말뭉치에서 규칙마다 1,000어절당 후보 수 */
function measureHuman(mode) {
  if (!fs.existsSync(CACHE)) return null;
  const docs = fs.readdirSync(CACHE).filter((f) => f.endsWith('.json')).flatMap((f) => JSON.parse(fs.readFileSync(path.join(CACHE, f), 'utf8')));
  const dir = scratch();
  try {
    const files = docs.map((d, i) => {
      const file = path.join(dir, `h${String(i).padStart(4, '0')}.md`);
      fs.writeFileSync(file, d.text);
      return file;
    });
    // 어절 수는 코드 블록·태그·주소를 빼고 한글이 든 어절만 센다. 비율의 분모라 근사로 충분하다
    const words = docs.reduce((n, d) => n + d.text.replace(/```[\s\S]*?```/g, ' ').replace(/<[^>]+>/g, ' ').replace(/https?:\S+/g, ' ').split(/\s+/).filter((w) => /[가-힣]/.test(w)).length, 0);
    const counts = {};
    // 형태소 도우미의 제한 시간 안에 끝나도록 50편씩 나눠 돌린다.
    // 형태소 모드에서 도우미가 실패한 묶음은 정규식으로 돌아서 값이 달라진다. 그런 묶음 수를 기록해서 비교에서 뺀다
    let morphLost = 0;
    for (let i = 0; i < files.length; i += 50) {
      const { byLine, morph } = candidates(files.slice(i, i + 50), mode);
      if (mode === 'morph' && !morph) morphLost++;
      for (const list of byLine.values()) for (const c of list) counts[c.code] = (counts[c.code] ?? 0) + 1;
    }
    const per1k = Object.fromEntries(Object.entries(counts).sort().map(([k, v]) => [k, Number(((1000 * v) / words).toFixed(2))]));
    return { docs: docs.length, words, per1k, ...(morphLost ? { morphLost } : {}) };
  } finally {
    fs.rmSync(dir, { recursive: true, force: true });
  }
}

const pct = (a, b) => (b ? `${Math.round((100 * a) / b)}%` : '-');
const uniq = (list) => [...new Set(list)];
/** 규칙 번호 목록 → 규칙마다 나온 수 */
const countOf = (codes) => codes.reduce((m, c) => m.set(c, (m.get(c) ?? 0) + 1), new Map());

function report(mode, { rows, morph }, human) {
  const label = mode === 'regex' ? '정규식 모드' : `형태소 모드 (${morph ? `Kiwi ${morph.version} · ${morph.model}` : '분석기 없음'})`;
  const scoped = rows.filter((r) => r.expect.length);
  const hits = scoped.filter((r) => r.hit).length;
  const leftover = rows.filter((r) => r.a.length);
  console.log(`\n${label}`);
  console.log(`  탐지 ${hits}/${scoped.length}쌍 (${pct(hits, scoped.length)}) · 고친 뒤 후보가 나온 쌍 ${leftover.length}/${rows.length}`);
  // 규칙마다: 기대한 쌍, 탐지한 쌍, 고친 뒤에도 같은 규칙 후보가 나온 쌍
  const rules = uniq(scoped.flatMap((r) => r.expect)).sort();
  console.log('  규칙 | 기대 | 탐지 | 고친 뒤에도 같은 후보');
  for (const e of rules) {
    const mine = scoped.filter((r) => r.expect.includes(e));
    const got = mine.filter((r) => r.b.some((c) => c.code === e)).length;
    const stay = mine.filter((r) => r.a.some((c) => c.code === e)).length;
    console.log(`  ${e} | ${mine.length} | ${got} | ${stay}`);
  }
  const after = {};
  for (const r of rows) for (const c of r.a) (after[c.code] ??= []).push(c.word);
  if (Object.keys(after).length) {
    console.log('  고친 뒤 후보(오탐일 가능성):');
    for (const [code, ws] of Object.entries(after).sort()) console.log(`    ${code} ${ws.length} — ${uniq(ws).slice(0, 5).join(' · ')}`);
  }
  if (SHOW) {
    for (const r of rows) {
      const mark = !r.expect.length ? '·' : r.hit ? '✓' : '✗';
      const fmt = (cs) => cs.map((c) => `${c.code}(${c.word})`).join(' ') || '없음';
      console.log(`  ${mark} ${r.id} [${r.kind}] 기대 ${r.expect.join('|') || '-'}\n      전: ${fmt(r.b)}\n      후: ${fmt(r.a)}`);
    }
  }
  if (mode === 'morph' && !morph) console.log('  ! 형태소 분석이 실패해서 이 모드도 정규식으로 돌았다');
  if (human) {
    if (human.morphLost) console.log(`  ! 사람 글 ${human.morphLost}묶음에서 형태소 분석이 실패했다. 이 값은 기준과 비교하지 않는다`);
    console.log(`  사람 글 ${human.docs}편 · ${human.words.toLocaleString()}어절, 1,000어절당 후보:`);
    console.log(`    ${Object.entries(human.per1k).map(([k, v]) => `${k} ${v}`).join(' · ')}`);
  }
  return {
    morph: morph ? `${morph.version} ${morph.model}` : null,
    detected: hits,
    scoped: scoped.length,
    // 고친 뒤 후보는 같은 규칙이 여러 번 나와도 그대로 둔다. 규칙을 고쳐 같은 규칙 후보가 하나 더 생겨도 비교에서 보인다
    pairs: Object.fromEntries(rows.map((r) => [r.id, { hit: r.hit, before: uniq(r.b.map((c) => c.code)).sort(), after: r.a.map((c) => c.code).sort() }])),
    ...(human ? { human } : {}),
  };
}

/** 기준과 비교한다. 나빠진 수를 돌려준다 */
function compare(mode, now, saved) {
  const prev = saved?.[mode];
  if (!prev) {
    console.log('  기준 없음. --save로 지금 값을 기준으로 저장한다');
    return 0;
  }
  const worse = [], better = [];
  for (const [id, p] of Object.entries(now.pairs)) {
    const q = prev.pairs[id];
    if (!q) {
      better.push(`${id} 새 쌍`);
      // 새 쌍의 고친 뒤 후보는 아직 아무도 읽지 않았다. 읽고 맞으면 --save로 기준에 넣는다
      if (p.after.length) worse.push(`${id} 새 쌍의 고친 뒤 문장에 후보 ${p.after.join(', ')}`);
      continue;
    }
    if (q.hit && !p.hit) worse.push(`${id} 탐지를 잃었다`);
    if (!q.hit && p.hit) better.push(`${id} 새로 탐지`);
    // 규칙마다 후보 수를 비교한다
    const now = countOf(p.after), was = countOf(q.after);
    const added = [...now].filter(([c, n]) => n > (was.get(c) ?? 0)).map(([c, n]) => `${c} +${n - (was.get(c) ?? 0)}`);
    const gone = [...was].filter(([c, n]) => n > (now.get(c) ?? 0)).map(([c, n]) => `${c} −${n - (now.get(c) ?? 0)}`);
    if (added.length) worse.push(`${id} 고친 뒤 문장에 새 후보 ${added.join(', ')}`);
    if (gone.length) better.push(`${id} 고친 뒤 후보 사라짐 ${gone.join(', ')}`);
  }
  for (const id of Object.keys(prev.pairs)) if (!now.pairs[id]) better.push(`${id} 쌍이 없어졌다`);
  console.log(`  기준(${saved.date})과 비교: 탐지 ${prev.detected} → ${now.detected} · 나빠짐 ${worse.length} · 좋아짐 ${better.length}`);
  for (const w of worse) console.log(`    ✗ ${w}`);
  for (const b of better) console.log(`    ✓ ${b}`);
  if (now.human && prev.human && !now.human.morphLost && !prev.human.morphLost) {
    const rose = Object.entries(now.human.per1k).filter(([k, v]) => v - (prev.human.per1k[k] ?? 0) > HUMAN_RISE);
    for (const [k, v] of rose) console.log(`    ! 사람 글에서 ${k} 후보가 늘었다: ${prev.human.per1k[k] ?? 0} → ${v} (1,000어절당). precision.mjs로 판정한다`);
  }
  return worse.length;
}

const pairs = readPairs();
const saved = fs.existsSync(RESULTS) ? JSON.parse(fs.readFileSync(RESULTS, 'utf8')) : null;
const modes = args.includes('--no-morph') || !venvPython() ? ['regex'] : ['morph', 'regex'];
if (!modes.includes('morph')) console.log('형태소 분석기가 없어 정규식 모드만 돌린다. 설치: node check.mjs --setup');
if (HUMAN && !fs.existsSync(CACHE)) console.log(`사람 글 말뭉치가 없다: ${CACHE}. node scripts/prose-check/baseline.mjs --wiki로 만든다`);
console.log(`쌍 ${pairs.length}개 (다루는 범주 ${pairs.filter((p) => p.expect.length).length} · 다루지 않는 범주 ${pairs.filter((p) => !p.expect.length).length})`);

let worse = 0;
const out = { date: new Date().toISOString().slice(0, 10) };
for (const mode of modes) {
  const measured = measurePairs(pairs, mode);
  // 형태소 분석이 실패하면 check.mjs가 정규식으로 돈다. 그 값을 형태소 기준과 비교하거나 기준으로 저장하지 않는다.
  // 검증할 때는 이 모드를 확인하지 못한 것이므로 실패로 끝낸다
  if (mode === 'morph' && !measured.morph) {
    console.log(`\n형태소 모드: 형태소 분석이 실패해 정규식 결과가 나왔다. 이 모드는 비교와 저장에서 뺀다${SAVE ? '' : '. 검증하지 못했으므로 종료 코드 1'}`);
    if (saved?.morph) out.morph = saved.morph;
    if (!SAVE) worse++;
    continue;
  }
  const now = report(mode, measured, HUMAN ? measureHuman(mode) : null);
  // --human 없이 저장하면 이전 기준의 사람 글 값을 그대로 둔다
  if (!now.human && saved?.[mode]?.human) now.human = saved[mode].human;
  out[mode] = now;
  if (!SAVE) worse += compare(mode, now, saved);
}
if (SAVE) {
  fs.writeFileSync(RESULTS, JSON.stringify({ ...saved, ...out }, null, 1) + '\n');
  console.log(`\n기준을 저장했다: ${path.relative(process.cwd(), RESULTS)}`);
}
process.exitCode = worse ? 1 : 0;
