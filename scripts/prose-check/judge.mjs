#!/usr/bin/env node
/**
 * 모델 판정 측정. pairs.mjs는 check.mjs만 측정한다. 이 도구는 스킬 전체(Step 1 스크립트와 Step 2 모델 판정)가
 * 국립국어원 교정 쌍(pairs/style.tsv)에서 무엇을 찾는지 측정한다.
 *
 * 모델은 이 스크립트가 부르지 않는다. 저장소 스킬 `.claude/skills/prose-check-eval`이 작업마다 하위 에이전트를 돌린다.
 *
 *   node scripts/prose-check/judge.mjs --prepare [--runs=3] [--seed=1]   검토할 글 두 개와 작업 목록(jobs.json)을 만든다
 *   node scripts/prose-check/judge.mjs --score <폴더> [--model=<이름>]    보고서를 읽어 측정하고 pairs/judge-results.json과 비교한다
 *   node scripts/prose-check/judge.mjs --score <폴더> --show              쌍마다 모델의 발견을 보인다
 *   node scripts/prose-check/judge.mjs --score <폴더> --save              측정값을 새 기준으로 저장한다
 *
 * 쌍마다 고치기 전 문장과 고친 뒤 문장을 서로 다른 글(t1.md, t2.md)에 넣는다. 어느 글에 넣을지와 문단 순서는 seed로 정한다.
 * 에이전트 하나가 글 하나만 읽으므로, 같은 쌍의 두 문장을 비교할 수 없다. 정답(key.json)은 에이전트에게 주지 않는다.
 *   - 탐지: 고치기 전 문장에 expect 열의 규칙 발견이 있다
 *   - 지적: 고치기 전 문장에 규칙과 상관없이 발견이 있다
 *   - 고친 뒤 발견: 고친 뒤 문장의 발견. 전문가가 고친 문장이라 대개 오탐이다
 * 글 전체를 보는 규칙(K4·K9·1.3·1.11·6.5·6.6)은 세지 않는다. 문단마다 다른 문서의 문장이기 때문이다.
 *
 * 모델 결과는 실행마다 달라서, 기준과 달라도 실패로 끝내지 않는다. 회귀 판정은 pairs.mjs가 한다.
 */
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { dataDir, venvPython } from '../../plugins/writing/skills/prose-check/scripts/lib/kiwi.mjs';

const HERE = path.dirname(fileURLToPath(import.meta.url));
const SKILL = path.resolve(HERE, '../../plugins/writing/skills/prose-check');
const PAIRS = path.join(HERE, 'pairs', 'style.tsv');
const SCRIPT_RESULTS = path.join(HERE, 'pairs', 'results.json');
const RESULTS = path.join(HERE, 'pairs', 'judge-results.json');
const FILES = ['t1.md', 't2.md'];
/** 글 전체를 보는 규칙. 서로 다른 문서의 문장을 모은 글이라 세지 않는다 */
const WHOLE = new Set(['K4', 'K9', 'STE 1.3', 'STE 1.11', 'STE 6.5', 'STE 6.6']);

const args = process.argv.slice(2);
/** `--name=값`의 값. 옵션이 없으면 dflt를 돌려준다. 값 없이 주면 측정 조건을 잘못 기록하므로 끝낸다 */
function opt(name, dflt) {
  const given = args.find((a) => a === `--${name}` || a.startsWith(`--${name}=`));
  if (given === undefined) return dflt;
  const value = given.slice(name.length + 3);
  if (!value) {
    console.error(`--${name}=<값>으로 준다`);
    process.exit(2);
  }
  return value;
}
const SHOW = args.includes('--show');
const SAVE = args.includes('--save');

/** pairs.mjs의 readPairs와 같다 */
function readPairs() {
  const [head, ...rows] = fs.readFileSync(PAIRS, 'utf8').split('\n').filter(Boolean);
  const col = Object.fromEntries(head.split('\t').map((h, i) => [h, i]));
  return rows.map((r) => {
    const c = r.split('\t');
    const expect = c[col.expect] === '-' ? [] : c[col.expect].split('|').map((s) => s.trim());
    return { id: c[col.id], kind: c[col.kind], expect, before: c[col.before], after: c[col.after] };
  });
}

/** seed가 같으면 같은 수열을 내는 난수 */
function mulberry32(seed) {
  return () => {
    seed = (seed + 0x6d2b79f5) | 0;
    let t = Math.imul(seed ^ (seed >>> 15), 1 | seed);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

const intOpt = (name, dflt, min) => {
  const raw = String(opt(name, dflt));
  const n = /^\d+$/.test(raw) ? Number(raw) : NaN;
  if (!Number.isInteger(n) || n < min) {
    console.error(`--${name}는 ${min} 이상의 정수다`);
    process.exit(2);
  }
  return n;
};

/** 셸 인수로 인용한다. 공백 같은 글자가 없으면 그대로 둔다 */
const sh = (s) => (/^[\w@%+=:,./-]+$/.test(s) ? s : `'${s.replace(/'/g, `'\\''`)}'`);

function promptFor(input, report, env) {
  const base = path.basename(input);
  return [
    `\`${SKILL}/SKILL.md\`를 읽고 그 절차대로 \`${input}\` 파일을 검토한다. \`<skill-dir>\`는 \`${SKILL}\`이다. 설치된 다른 글 검토 스킬은 사용하지 않는다.`,
    '',
    '- 이 글의 문단은 서로 다른 공공 문서에서 하나씩 뽑은 문장이다. 문단마다 따로 판정한다. 글 전체를 보는 규칙(K4·6.5·6.6 문단 구성, K9 높임 등급, 1.3·1.11 한 낱말 한 뜻)은 적용하지 않는다.',
    `- Step 1 명령: \`${env}node ${sh(`${SKILL}/scripts/check.mjs`)} ${sh(input)}\``,
    '- 글은 고치지 않는다.',
    `- 보고서는 SKILL.md "Report" 형식으로 \`${report}\`에 저장한다. 발견마다 첫 줄은 \`${base}:<줄> [규칙 태그] 문제\`로 시작한다. 오탐 판단과 요약 줄은 위치로 시작하지 않는다.`,
    '- 저장한 뒤 발견 수만 한 줄로 답한다.',
  ].join('\n');
}

function prepare() {
  const runs = intOpt('runs', 3, 1);
  const seed = intOpt('seed', 1, 0);
  const rand = mulberry32(seed);
  const docs = [[], []];
  for (const p of readPairs()) {
    const k = rand() < 0.5 ? 0 : 1;
    docs[k].push({ id: p.id, side: 'before', text: p.before });
    docs[1 - k].push({ id: p.id, side: 'after', text: p.after });
  }
  for (const d of docs) {
    for (let i = d.length - 1; i > 0; i--) {
      const j = Math.floor(rand() * (i + 1));
      [d[i], d[j]] = [d[j], d[i]];
    }
  }
  const stamp = new Date().toISOString().replace(/[-:]/g, '').replace('T', '-').slice(0, 15);
  const dir = path.join(dataDir(), 'judge', stamp);
  // 입력 폴더에 `.git`을 두어 현재 폴더 저장소의 허용 목록을 빌리지 않게 한다
  fs.mkdirSync(path.join(dir, 'input', '.git'), { recursive: true });
  fs.mkdirSync(path.join(dir, 'reports'));
  // 문단 하나가 문장 하나다. i번째 문단은 2i+1번째 줄에 있다
  docs.forEach((d, k) => fs.writeFileSync(path.join(dir, 'input', FILES[k]), d.map((x) => x.text).join('\n\n') + '\n'));
  const key = { seed, runs, files: Object.fromEntries(FILES.map((f, k) => [f, docs[k].map(({ id, side }) => ({ id, side }))])) };
  fs.writeFileSync(path.join(dir, 'key.json'), JSON.stringify(key, null, 1) + '\n');
  // 에이전트가 이 명령을 돌릴 때도 같은 데이터 폴더의 Kiwi를 사용하게 한다
  const env = process.env.PROSE_CHECK_HOME ? `PROSE_CHECK_HOME=${sh(process.env.PROSE_CHECK_HOME)} ` : '';
  const jobs = [];
  for (let r = 1; r <= runs; r++) {
    for (const f of FILES) {
      const report = path.join(dir, 'reports', `r${r}-${f}`);
      jobs.push({ run: r, file: f, report, prompt: promptFor(path.join(dir, 'input', f), report, env) });
    }
  }
  fs.writeFileSync(path.join(dir, 'jobs.json'), JSON.stringify(jobs, null, 1) + '\n');
  if (!venvPython()) console.log('형태소 분석기가 없다. 에이전트는 정규식만으로 Step 1을 돈다');
  console.log(`폴더: ${dir}`);
  console.log(`작업 ${jobs.length}개 (실행 ${runs}번 × 글 ${FILES.length}개): ${path.join(dir, 'jobs.json')}`);
}

const uniq = (list) => [...new Set(list)];

/**
 * 보고서에서 발견을 읽는다. 위치(`t1.md:12`)로 시작하는 줄이 발견이다.
 * 규칙 번호는 대괄호 안에서 뽑는다: `[STE 4.2·3.7 원문]` → STE 4.2, STE 3.7
 */
function parseReport(text) {
  const out = [];
  for (const line of text.split('\n')) {
    const m = /^[\s>*`|-]*(?:\d+\.\s+)?[`*]*(?:\S*\/)?(t\d\.md):(\d+)/.exec(line);
    if (!m) continue;
    const rest = line.slice(m[0].length);
    const brackets = [...rest.matchAll(/\[([^\]]+)\]/g)].map((b) => b[1]).join(' ');
    const codes = uniq([...(brackets || rest).matchAll(/K\d{1,2}\b|\d+\.\d+/g)].map(([c]) => (c.startsWith('K') ? c : `STE ${c}`)));
    out.push({ file: m[1], line: Number(m[2]), codes, text: rest.replace(/^[`\s:-]+/, '').trim() });
  }
  return out;
}

function score(dir) {
  const key = JSON.parse(fs.readFileSync(path.join(dir, 'key.json'), 'utf8'));
  const pairs = readPairs();
  const scoped = pairs.filter((p) => p.expect.length);
  const reportDir = path.join(dir, 'reports');
  const missing = [];
  // 보고서에 다른 글의 위치가 있으면 그 글의 문장으로 채점하지 않는다
  const misplaced = [];
  // 실행마다 쌍 → { before: 발견[], after: 발견[] }
  const runs = [];
  for (let r = 1; r <= key.runs; r++) {
    const found = new Map(pairs.map((p) => [p.id, { before: [], after: [] }]));
    for (const f of FILES) {
      const file = path.join(reportDir, `r${r}-${f}`);
      if (!fs.existsSync(file)) {
        missing.push(path.basename(file));
        continue;
      }
      for (const x of parseReport(fs.readFileSync(file, 'utf8'))) {
        if (x.file !== f) {
          misplaced.push(`${path.basename(file)}의 ${x.file}:${x.line}`);
          continue;
        }
        // 문단 i는 2i+1번째 줄이다. 짝수 줄(문단 사이 빈 줄)은 앞 문단으로 본다
        const slot = key.files[x.file]?.[Math.floor((x.line - 1) / 2)];
        const codes = x.codes.filter((c) => !WHOLE.has(c));
        if (slot && codes.length) found.get(slot.id)[slot.side].push({ ...x, codes });
      }
    }
    runs.push(found);
  }
  if (missing.length) {
    console.log(`보고서가 없다: ${missing.join(', ')}. 그 작업을 다시 돌린 뒤 측정한다`);
    process.exitCode = 2;
    return;
  }

  if (misplaced.length) console.log(`! 다른 글의 위치라서 세지 않은 발견 ${misplaced.length}건: ${misplaced.join(', ')}`);

  const has = (list, codes) => list.some((x) => x.codes.some((c) => codes.includes(c)));
  const per = runs.map((found) => ({
    detected: scoped.filter((p) => has(found.get(p.id).before, p.expect)).length,
    flagged: scoped.filter((p) => found.get(p.id).before.length).length,
    after: pairs.reduce((n, p) => n + found.get(p.id).after.length, 0),
  }));
  const mean = (k) => per.reduce((n, x) => n + x[k], 0) / per.length;
  const fmt = (k) => `${per.map((x) => x[k]).join(' · ')} → 평균 ${mean(k).toFixed(1)}`;
  const half = key.runs / 2;
  // 쌍마다 몇 번의 실행에서 찾았는가
  const hitRuns = (p) => runs.filter((found) => has(found.get(p.id).before, p.expect)).length;
  const script = fs.existsSync(SCRIPT_RESULTS) ? JSON.parse(fs.readFileSync(SCRIPT_RESULTS, 'utf8')) : null;
  const scriptPairs = (script?.morph ?? script?.regex)?.pairs ?? {};
  const scriptHit = (p) => Boolean(scriptPairs[p.id]?.hit);

  const model = opt('model', '알 수 없음');
  console.log(`보고서 ${key.runs * FILES.length}개 (실행 ${key.runs}번 × 글 ${FILES.length}개) · 모델 ${model} · seed ${key.seed}`);
  console.log(`쌍 ${pairs.length}개 (다루는 범주 ${scoped.length})`);
  console.log(`  탐지 (기대한 규칙, /${scoped.length}): ${fmt('detected')}`);
  console.log(`  지적 (규칙과 상관없이, /${scoped.length}): ${fmt('flagged')}`);
  console.log(`  고친 뒤 발견 (/${pairs.length}쌍): ${fmt('after')}`);
  console.log(`  스크립트만 (pairs.mjs 기준): ${scoped.filter(scriptHit).length}/${scoped.length}`);

  const missed = scoped.filter((p) => !scriptHit(p));
  const rescued = missed.filter((p) => hitRuns(p) > half);
  console.log(`  스크립트가 놓친 ${missed.length}쌍 가운데 모델이 실행 과반에서 찾은 쌍: ${rescued.length} (${rescued.map((p) => p.id).join(' ') || '없음'})`);
  const dropped = scoped.filter((p) => scriptHit(p) && hitRuns(p) <= half);
  if (dropped.length) console.log(`  스크립트가 찾았는데 모델이 실행 과반에서 보고하지 않은 쌍: ${dropped.map((p) => p.id).join(' ')}`);

  console.log('  규칙 | 기대 | 스크립트 | 모델(실행 평균)');
  for (const e of uniq(scoped.flatMap((p) => p.expect)).sort()) {
    const mine = scoped.filter((p) => p.expect.includes(e));
    const bySkill = mine.filter((p) => scriptPairs[p.id]?.before?.includes(e)).length;
    const byModel = runs.reduce((n, found) => n + mine.filter((p) => has(found.get(p.id).before, [e])).length, 0) / key.runs;
    console.log(`  ${e} | ${mine.length} | ${bySkill} | ${byModel.toFixed(1)}`);
  }
  const afterCodes = {};
  for (const found of runs) for (const p of pairs) for (const x of found.get(p.id).after) for (const c of x.codes) afterCodes[c] = (afterCodes[c] ?? 0) + 1;
  if (Object.keys(afterCodes).length) {
    console.log(`  고친 뒤 발견의 규칙 (실행 ${key.runs}번 합계): ${Object.entries(afterCodes).sort((a, b) => b[1] - a[1]).map(([c, n]) => `${c} ${n}`).join(' · ')}`);
  }

  if (SHOW) {
    for (const p of pairs) {
      const mark = !p.expect.length ? '·' : `${hitRuns(p)}/${key.runs}`;
      console.log(`\n  ${mark} ${p.id} [${p.kind}] 기대 ${p.expect.join('|') || '-'} · 스크립트 ${scriptHit(p) ? '탐지' : '-'}`);
      console.log(`    전: ${p.before}`);
      runs.forEach((found, r) => found.get(p.id).before.forEach((x) => console.log(`      r${r + 1} ${x.text}`)));
      console.log(`    후: ${p.after}`);
      runs.forEach((found, r) => found.get(p.id).after.forEach((x) => console.log(`      r${r + 1} ${x.text}`)));
    }
  }

  const now = {
    date: new Date().toISOString().slice(0, 10),
    model,
    runs: key.runs,
    seed: key.seed,
    scoped: scoped.length,
    detected: per.map((x) => x.detected),
    flagged: per.map((x) => x.flagged),
    after: per.map((x) => x.after),
    pairs: Object.fromEntries(pairs.map((p) => [p.id, {
      hit: hitRuns(p),
      after: runs.flatMap((found) => found.get(p.id).after.flatMap((x) => x.codes)).sort(),
    }])),
  };
  const saved = fs.existsSync(RESULTS) ? JSON.parse(fs.readFileSync(RESULTS, 'utf8')) : null;
  if (saved) {
    const avg = (xs) => (xs.reduce((a, b) => a + b, 0) / xs.length).toFixed(1);
    console.log(`\n기준(${saved.date}, ${saved.model}, 실행 ${saved.runs}번)과 비교: 탐지 ${avg(saved.detected)} → ${avg(now.detected)} · 지적 ${avg(saved.flagged)} → ${avg(now.flagged)} · 고친 뒤 발견 ${avg(saved.after)} → ${avg(now.after)}`);
    if (saved.model !== model) console.log('  ! 모델이 다르다. 차이는 규칙보다 모델 때문일 수 있다');
    for (const p of scoped) {
      const was = saved.pairs[p.id]?.hit ?? 0;
      const before = was > saved.runs / 2, after = hitRuns(p) > half;
      if (before && !after) console.log(`    ✗ ${p.id} 과반 탐지를 잃었다 (${was}/${saved.runs} → ${hitRuns(p)}/${key.runs})`);
      if (!before && after) console.log(`    ✓ ${p.id} 과반 탐지 (${was}/${saved.runs} → ${hitRuns(p)}/${key.runs})`);
    }
  } else if (!SAVE) {
    console.log('\n기준 없음. 결과를 읽고 맞으면 --save로 저장한다');
  }
  if (SAVE) {
    fs.writeFileSync(RESULTS, JSON.stringify(now, null, 1) + '\n');
    console.log(`\n기준을 저장했다: ${path.relative(process.cwd(), RESULTS)}`);
  }
}

if (args.includes('--prepare')) prepare();
else if (args.includes('--score')) {
  const dir = args.find((a) => !a.startsWith('--'));
  if (!dir || !fs.existsSync(path.join(dir, 'key.json'))) {
    console.error('--score 다음에 --prepare가 만든 폴더를 준다');
    process.exit(2);
  }
  score(path.resolve(dir));
} else {
  console.error('사용법: judge.mjs --prepare [--runs=3] [--seed=1] | --score <폴더> [--model=<이름>] [--show] [--save]');
  process.exit(2);
}
