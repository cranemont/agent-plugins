#!/usr/bin/env node
/**
 * check.mjs 회귀 시험. fixtures/*.md·*.html의 기대 표시와 실제 후보를 줄마다 대조한다.
 *
 * 표시는 줄 끝 HTML 주석이다. check.mjs는 HTML 주석을 가려서 표시 자체는 후보가 되지 않는다.
 *   <!-- 기대: G -->          이 줄에 G 무리 후보가 있어야 한다. 쉼표로 여럿을 적는다
 *   <!-- 기대: 없음 -->       이 줄에 후보가 없어야 한다
 *   <!-- 기대(형태소): G -->  형태소 분석기가 있을 때만 대조한다
 * S2 후보도 센다(--all).
 *
 *   node scripts/prose-check/test.mjs              형태소 분석기를 사용하는 기본 모드와 정규식 모드를 둘 다 돌린다
 *   node scripts/prose-check/test.mjs --no-morph   정규식 모드만 돌린다
 */
import fs from 'node:fs';
import path from 'node:path';
import { execFileSync } from 'node:child_process';
import { fileURLToPath } from 'node:url';
import { venvPython } from '../../plugins/writing/skills/prose-check/scripts/lib/kiwi.mjs';

const HERE = path.dirname(fileURLToPath(import.meta.url));
const CHECK = path.resolve(HERE, '../../plugins/writing/skills/prose-check/scripts/check.mjs');
const DIR = path.join(HERE, 'fixtures');
const files = fs.readdirSync(DIR).filter((f) => /\.(?:md|html)$/.test(f)).map((f) => path.join(DIR, f));

/** 파일에서 줄마다 기대 표시를 읽는다 */
function expectations(file) {
  const out = [];
  fs.readFileSync(file, 'utf8').split('\n').forEach((line, i) => {
    const m = /<!--\s*기대(\(형태소\))?:\s*([^>]*?)\s*-->/.exec(line);
    if (m) out.push({ line: i + 1, morphOnly: Boolean(m[1]), ids: m[2] === '없음' ? [] : m[2].split(/\s*,\s*/) });
  });
  return out;
}

function run(mode) {
  const argv = [CHECK, '--json', '--all', ...(mode === 'regex' ? ['--no-morph'] : []), ...files];
  let out;
  try {
    out = execFileSync('node', argv, { encoding: 'utf8', maxBuffer: 1 << 28 });
  } catch (e) {
    out = e.stdout; // 후보가 있으면 종료 코드가 1이다
  }
  const result = JSON.parse(out);
  const byLine = new Map();
  for (const c of result.candidates) {
    const key = `${path.resolve(c.file)}:${c.line}`;
    byLine.set(key, [...(byLine.get(key) ?? []), c]);
  }
  let pass = 0;
  const fails = [];
  for (const file of files) {
    for (const ex of expectations(file)) {
      if (ex.morphOnly && mode === 'regex') continue;
      const got = byLine.get(`${path.resolve(file)}:${ex.line}`) ?? [];
      const ids = new Set(got.map((c) => c.id));
      const ok = ex.ids.length ? ex.ids.every((id) => ids.has(id)) : got.length === 0;
      if (ok) pass++;
      else fails.push(`${path.basename(file)}:${ex.line} 기대 ${ex.ids.join(',') || '없음'} · 실제 ${got.map((c) => `${c.id}(${c.word})`).join(' ') || '없음'}`);
    }
  }
  console.log(`${mode === 'regex' ? '정규식 모드' : `형태소 모드 (${result.morph ? `Kiwi ${result.morph.version} · ${result.morph.model}` : '분석기 없음'})`}: 통과 ${pass} · 실패 ${fails.length}`);
  for (const f of fails) console.log(`  ✗ ${f}`);
  return fails.length;
}

const modes = process.argv.includes('--no-morph') || !venvPython() ? ['regex'] : ['morph', 'regex'];
if (!modes.includes('morph')) console.log('형태소 분석기가 없어 정규식 모드만 돌린다. 설치: node check.mjs --setup');
const failed = modes.reduce((n, m) => n + run(m), 0);
process.exitCode = failed ? 1 : 0;
