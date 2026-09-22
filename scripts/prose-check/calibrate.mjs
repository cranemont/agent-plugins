#!/usr/bin/env node
/**
 * 한국어 어절 수와 영어 단어 수의 비율을 잰다. 플러그인의 `references/calibration.md` 참고.
 *
 *   node scripts/prose-check/calibrate.mjs [calibration.tsv]
 *
 * 입력은 탭으로 나눈 세 열(page, en, ko)이고 첫 줄은 머리다.
 * 영어는 STE 8.5(괄호 안 글 = 한 단어)·8.7(하이픈 낱말 = 한 단어)로 센다.
 * 한국어는 check.mjs와 같은 방식으로 센다. 코드 스팬은 한 어절, 인용 괄호는 세지 않는다.
 */
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const here = path.dirname(fileURLToPath(import.meta.url));
const file = process.argv[2] ?? path.join(here, 'calibration.tsv');

const ko = (s) => s
  .replace(/`[^`]*`/g, 'C')
  .replace(/\((?:[^()]*?(?:ADR-|#\d|\d{4}-\d{2}-\d{2}|[0-9a-f]{7}\b)[^()]*)\)/g, '')
  .split(/\s+/).filter((w) => /[0-9A-Za-z가-힣]/.test(w)).length;
const en = (s) => s.replace(/\([^()]*\)/g, ' X ').split(/\s+/).filter((w) => /[0-9A-Za-z]/.test(w)).length;

const rows = fs.readFileSync(file, 'utf8').trim().split('\n').slice(1)
  .map((l) => l.split('\t')).map(([page, e, k]) => ({ page, e, k, en: en(e), ko: ko(k) }));
const sum = (a, f) => a.reduce((s, x) => s + f(x), 0);
const ratio = (r) => sum(r, (x) => x.ko) / sum(r, (x) => x.en);
const per = rows.map((r) => r.ko / r.en).sort((a, b) => a - b);
const q = (p) => per[Math.floor(p * (per.length - 1))];

console.log(`표본 ${rows.length}문장 · 영어 ${sum(rows, (x) => x.en)}단어 · 한국어 ${sum(rows, (x) => x.ko)}어절`);
console.log(`합계 비율 ${ratio(rows).toFixed(3)} · 중앙값 ${q(0.5).toFixed(3)} · 사분위 ${q(0.25).toFixed(3)}~${q(0.75).toFixed(3)} · 범위 ${per[0].toFixed(3)}~${per.at(-1).toFixed(3)}`);
for (const [lo, hi] of [[1, 10], [11, 15], [16, 20], [21, 99]]) {
  const b = rows.filter((r) => r.en >= lo && r.en <= hi);
  if (b.length) console.log(`  영어 ${lo}~${hi === 99 ? '' : hi}단어  ${String(b.length).padStart(2)}문장  비율 ${ratio(b).toFixed(3)}`);
}
const xs = rows.map((r) => r.en), ys = rows.map((r) => r.ko);
const mx = sum(xs, (x) => x) / xs.length, my = sum(ys, (y) => y) / ys.length;
const a = xs.reduce((s, x, i) => s + (x - mx) * (ys[i] - my), 0) / xs.reduce((s, x) => s + (x - mx) ** 2, 0);
const b = my - a * mx;
console.log(`회귀 한국어 = ${a.toFixed(3)} × 영어 + ${b.toFixed(2)}`);
for (const n of [20, 25]) console.log(`  영어 ${n}단어 → 회귀 ${(a * n + b).toFixed(1)}어절 · 합계 비율 ${(ratio(rows) * n).toFixed(1)}어절`);
