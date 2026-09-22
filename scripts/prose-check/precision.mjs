#!/usr/bin/env node
/**
 * 규칙별 정밀도를 측정한다. check.mjs --tsv=<파일>로 만든 판정 표에서 label 칸을 읽는다.
 * label은 y(맞는 지적)·n(오탐)이다. 빈 칸은 세지 않는다.
 *
 * 오탐이 10%를 넘는 규칙은 기본 검사에서 빼거나 S2로 내릴 후보다. Google의 정적 분석 도구 Tricorder가 사용하는 기준이다
 * (Sadowski 외, "Tricorder: Building a Program Analysis Ecosystem", ICSE 2015).
 *
 *   node scripts/prose-check/precision.mjs 판정.tsv [판정2.tsv ...]
 */
import fs from 'node:fs';

const files = process.argv.slice(2);
if (!files.length) {
  console.error('사용법: node scripts/prose-check/precision.mjs 판정.tsv [...]');
  process.exit(2);
}
const stats = new Map();
for (const file of files) {
  const [head, ...rows] = fs.readFileSync(file, 'utf8').split('\n').filter(Boolean);
  const col = Object.fromEntries(head.split('\t').map((h, i) => [h, i]));
  for (const row of rows) {
    const cells = row.split('\t');
    const label = (cells[col.label] ?? '').trim().toLowerCase();
    if (label !== 'y' && label !== 'n') continue;
    const key = `${cells[col.sev]} ${cells[col.id]} ${cells[col.tag]}`;
    const s = stats.get(key) ?? { y: 0, n: 0 };
    s[label]++;
    stats.set(key, s);
  }
}
if (!stats.size) {
  console.log('판정한 행이 없다. label 칸에 y 또는 n을 채운다');
  process.exit(0);
}
console.log('규칙 | 판정 | 맞음 | 정밀도');
for (const [key, s] of [...stats].sort((a, b) => a[1].y / (a[1].y + a[1].n) - b[1].y / (b[1].y + b[1].n))) {
  const p = s.y / (s.y + s.n);
  const flag = p < 0.9 ? '  ← 오탐 10% 넘음' : '';
  console.log(`${key} | ${s.y + s.n} | ${s.y} | ${(100 * p).toFixed(0)}%${flag}`);
}
